const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { PGlite } = require('@electric-sql/pglite')
const { root } = require('./load.cjs')
const migration = fs.readFileSync(path.join(root, 'supabase/migrations/202609230001_account_permissions.sql'), 'utf8')
const owner = 'db13125d-3aa1-46ab-9159-8fad18746623'
const staff = '11111111-1111-4111-8111-111111111111'
const lawyer = '22222222-2222-4222-8222-222222222222'
async function setup() {
  const db = new PGlite()
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema storage;
    grant usage on schema public, auth, storage to authenticated, anon, service_role;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
    create table auth.users(id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
    create table public.profiles(id uuid primary key references auth.users(id) on delete cascade, name text not null, role text not null, active boolean not null, dept text, phone text, created_at timestamptz default now());
    create table public.companies(id uuid primary key default gen_random_uuid(), name text);
    create table public.transactions(id uuid primary key default gen_random_uuid(), company_id uuid, lawyer_id uuid, status text);
    create table storage.objects(id uuid primary key default gen_random_uuid());
    alter table companies enable row level security;
    create policy legacy_allow_all on companies for all to authenticated using(true) with check(true);
    alter table transactions enable row level security;
    create policy legacy_allow_all on transactions for all to authenticated using(true) with check(true);
    grant all on companies, transactions, storage.objects to authenticated;
    insert into auth.users(id,email) values ('${owner}','owner@example.invalid'),('${staff}','staff@example.invalid'),('${lawyer}','lawyer@example.invalid');
    insert into profiles(id,name,role,active) values ('${owner}','Owner','super_admin',true),('${staff}','Staff','staff',true),('${lawyer}','Lawyer','lawyer',true);
    insert into companies(name) values ('Existing company');
  `)
  return db
}
async function asUser(db,id,sql) {
  await db.exec(`set role authenticated; set request.jwt.claim.sub = '${id}'`)
  try { return await db.query(sql) } finally { await db.exec('reset role') }
}
test('database protection, role changes and owner invariants', async t => {
  const db = await setup()
  try {
    const before = (await db.query(`select * from profiles where id='${owner}'`)).rows[0]
    await db.exec(migration)
    await t.test('migration preserves the entire existing owner row', async () => {
      const after = (await db.query(`select * from profiles where id='${owner}'`)).rows[0]
      for (const key of Object.keys(before)) assert.deepEqual(after[key], before[key])
    })
    await t.test('owner cannot be demoted, disabled, or deleted through Auth cascade', async () => {
      await assert.rejects(db.exec(`update profiles set role='staff' where id='${owner}'`), /protected/)
      await assert.rejects(db.exec(`update profiles set active=false where id='${owner}'`), /protected/)
      await assert.rejects(db.exec(`delete from auth.users where id='${owner}'`), /protected/)
      assert.equal((await db.query(`select count(*)::int as n from auth.users where id='${owner}'`)).rows[0].n,1)
    })
    await t.test('direct profile privilege escalation is forbidden', async () => {
      await assert.rejects(asUser(db, staff, `update profiles set role='super_admin' where id='${staff}'`), /permission denied/)
      await assert.rejects(asUser(db, staff, `update role_permissions set matrix='{}'`), /permission denied/)
    })
    await t.test('staff cannot exploit an old allow-all policy to write companies', async () => {
      await assert.rejects(asUser(db,staff,`insert into companies(name) values ('forbidden')`), /row-level security/)
    })
    await t.test('permission grant and revocation affect direct access immediately', async () => {
      await db.exec(`update role_permissions set matrix=jsonb_set(matrix,'{staff,companies,create}','true')`)
      await asUser(db,staff,`insert into companies(name) values ('authorized')`)
      await db.exec(`update role_permissions set matrix=jsonb_set(matrix,'{staff,companies,view}','false')`)
      assert.equal((await asUser(db,staff,'select * from companies')).rows.length,0)
      assert.ok((await asUser(db,owner,'select * from companies')).rows.length>0)
    })
    await t.test('disabling a profile revokes access even with a still-valid user ID', async () => {
      await db.exec(`update profiles set active=false where id='${lawyer}'`)
      assert.equal((await asUser(db,lawyer,'select * from companies')).rows.length,0)
      assert.equal((await asUser(db,lawyer,'select * from role_permissions')).rows.length,0)
      assert.equal((await asUser(db,lawyer,'select * from profiles')).rows.length,1)
    })
    await t.test('signup metadata cannot grant an active super-admin account', async () => {
      const id='33333333-3333-4333-8333-333333333333'
      await db.exec(`insert into auth.users(id,email,raw_user_meta_data) values ('${id}','new@example.invalid','{"role":"super_admin"}')`)
      const row=(await db.query(`select role,active from profiles where id='${id}'`)).rows[0]
      assert.deepEqual(row,{role:'staff',active:false})
    })
    await t.test('reapplying setup preserves edited permissions and owner', async () => {
      await db.exec(migration)
      assert.equal((await db.query(`select matrix #>> '{staff,companies,view}' as value from role_permissions`)).rows[0].value,'false')
      assert.equal((await db.query(`select role from profiles where id='${owner}'`)).rows[0].role,'super_admin')
    })
  } finally { await db.close() }
})
test('owner preflight aborts the entire migration without silently changing accounts', async () => {
  const db=await setup()
  try {
    await db.exec(`update profiles set role='admin' where id='${owner}'`)
    await assert.rejects(db.exec(migration),/Owner preflight failed/)
    await db.exec('rollback')
    assert.equal((await db.query(`select role from profiles where id='${owner}'`)).rows[0].role,'admin')
    assert.equal((await db.query(`select to_regclass('public.role_permissions') as tab`)).rows[0].tab,null)
  } finally { await db.close() }
})
