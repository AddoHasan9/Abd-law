-- Run once as the database owner BEFORE deploying the matching application.
-- No existing profile, password, email, role, or active flag is changed.
begin;

-- Abort instead of silently promoting/reconstructing the protected owner account.
do $$ begin
  if not exists (select 1 from public.profiles where id = 'db13125d-3aa1-46ab-9159-8fad18746623' and role::text = 'super_admin' and active is true) then
    raise exception 'Owner preflight failed: verify the existing protected super admin. No changes applied.';
  end if;
end $$;

alter table public.profiles add column if not exists title text;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists age text;
alter table public.profiles add column if not exists gender text;
alter table public.profiles add column if not exists birth_date date;

create table if not exists public.role_permissions (
  id integer primary key check (id = 1),
  matrix jsonb not null,
  version bigint not null default 1,
  updated_by uuid,
  updated_at timestamptz not null default now()
);
insert into public.role_permissions(id, matrix) values (1, '{"super_admin":{"companies":{"view":true,"create":true,"edit":true,"delete":true},"transactions":{"view":true,"create":true,"edit":true,"delete":true,"close":true},"government_ids":{"view":true,"create":true,"renew":true,"delete":true},"financial_statements":{"view":true,"create":true,"submit":true,"delete":true},"deposits":{"view":true,"create":true,"release":true},"reports":{"view":true,"export":true},"notifications":{"view":true,"dismiss":true},"users":{"create_users":true,"edit_users":true,"delete_users":true,"manage_permissions":true}},"admin":{"companies":{"view":true,"create":true,"edit":true,"delete":true},"transactions":{"view":true,"create":true,"edit":true,"delete":true,"close":true},"government_ids":{"view":true,"create":true,"renew":true,"delete":true},"financial_statements":{"view":true,"create":true,"submit":true,"delete":true},"deposits":{"view":true,"create":true,"release":true},"reports":{"view":true,"export":true},"notifications":{"view":true,"dismiss":true},"users":{"create_users":false,"edit_users":false,"delete_users":false,"manage_permissions":false}},"manager":{"companies":{"view":true,"create":true,"edit":true,"delete":false},"transactions":{"view":true,"create":true,"edit":true,"delete":false,"close":true},"government_ids":{"view":true,"create":true,"renew":true,"delete":false},"financial_statements":{"view":true,"create":true,"submit":true,"delete":false},"deposits":{"view":true,"create":true,"release":true},"reports":{"view":true,"export":true},"notifications":{"view":true,"dismiss":true},"users":{"create_users":false,"edit_users":false,"delete_users":false,"manage_permissions":false}},"lawyer":{"companies":{"view":true,"create":true,"edit":true,"delete":false},"transactions":{"view":true,"create":true,"edit":true,"delete":false,"close":true},"government_ids":{"view":true,"create":true,"renew":true,"delete":false},"financial_statements":{"view":true,"create":true,"submit":false,"delete":false},"deposits":{"view":true,"create":false,"release":false},"reports":{"view":true,"export":false},"notifications":{"view":true,"dismiss":true},"users":{"create_users":false,"edit_users":false,"delete_users":false,"manage_permissions":false}},"staff":{"companies":{"view":true,"create":false,"edit":false,"delete":false},"transactions":{"view":true,"create":false,"edit":false,"delete":false,"close":false},"government_ids":{"view":true,"create":false,"renew":false,"delete":false},"financial_statements":{"view":true,"create":false,"submit":false,"delete":false},"deposits":{"view":true,"create":false,"release":false},"reports":{"view":true,"export":false},"notifications":{"view":true,"dismiss":true},"users":{"create_users":false,"edit_users":false,"delete_users":false,"manage_permissions":false}}}'::jsonb) on conflict (id) do nothing;

create table if not exists public.user_management_audit (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_name text not null,
  target_user_id uuid not null,
  action text not null,
  created_at timestamptz not null default now()
);

create or replace function public.current_active_role()
returns text language sql stable security definer set search_path = '' as $$
  select p.role::text from public.profiles p where p.id = auth.uid() and p.active is true;
$$;
create or replace function public.app_has_permission(category text, permission text)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(
    public.current_active_role() = 'super_admin'
    or (select (p.matrix -> public.current_active_role() -> category -> permission) = 'true'::jsonb
        from public.role_permissions p where p.id = 1), false);
$$;
revoke all on function public.current_active_role(), public.app_has_permission(text,text) from public, anon;
grant execute on function public.current_active_role(), public.app_has_permission(text,text) to authenticated, service_role;

-- Preserve all existing super admins and the fixed owner ID even for service-role calls.
create or replace function public.protect_super_admin_account()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.id = 'db13125d-3aa1-46ab-9159-8fad18746623' or old.role::text = 'super_admin' then
    if tg_op = 'DELETE' then raise exception 'Super admin account is protected'; end if;
    if new.id is distinct from old.id or new.role is distinct from old.role or new.active is distinct from old.active then
      raise exception 'Super admin identity, role and active status are protected';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;
drop trigger if exists protect_super_admin_account on public.profiles;
create trigger protect_super_admin_account before update or delete on public.profiles
  for each row execute function public.protect_super_admin_account();

-- Public signups never choose their rank or become active without an administrator.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, name, role, active)
  values (new.id, coalesce(nullif(new.raw_user_meta_data->>'full_name',''), split_part(new.email,'@',1), 'مستخدم'), 'staff', false)
  on conflict (id) do nothing;
  return new;
end $$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Clear all old permissive/self-update policies for security-related tables.
do $$ declare p record; begin
  for p in select tablename, policyname from pg_policies where schemaname = 'public'
    and tablename in ('profiles','role_permissions','user_management_audit') loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;
alter table public.profiles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_management_audit enable row level security;
revoke all on public.profiles, public.role_permissions, public.user_management_audit from anon, authenticated;
grant select on public.profiles, public.role_permissions, public.user_management_audit to authenticated;
grant all on public.profiles, public.role_permissions, public.user_management_audit to service_role;
create policy profiles_directory on public.profiles for select to authenticated
  using (id = auth.uid() or public.current_active_role() is not null);
create policy permissions_read on public.role_permissions for select to authenticated
  using (public.current_active_role() is not null);
create policy management_audit_read on public.user_management_audit for select to authenticated
  using (public.app_has_permission('users','manage_permissions'));

-- Disabled accounts cannot use existing JWTs to access any public application table.
-- Restrictive policies are AND-ed with existing policies, including older allow-all rules.
do $$ declare t record; begin
  for t in select tablename from pg_tables where schemaname = 'public'
    and tablename not in ('profiles','role_permissions','user_management_audit') loop
    execute format('alter table public.%I enable row level security',t.tablename);
    execute format('drop policy if exists app_active_account on public.%I',t.tablename);
    execute format('create policy app_active_account on public.%I as restrictive for all to authenticated using (public.current_active_role() is not null) with check (public.current_active_role() is not null)',t.tablename);
    execute format('revoke all on public.%I from anon', t.tablename);
    execute format('drop policy if exists app_super_admin on public.%I', t.tablename);
    execute format('create policy app_super_admin on public.%I for all to authenticated using (public.current_active_role() = ''super_admin'') with check (public.current_active_role() = ''super_admin'')', t.tablename);
  end loop;
end $$;

-- Dynamic role permissions also constrain direct authenticated REST calls.
do $$ declare m record; begin
  for m in select * from (values
    ('companies','companies','create','edit','delete'),
    ('company_managers','companies','edit','edit','edit'),
    ('company_shareholders','companies','edit','edit','edit'),
    ('company_timeline','companies','edit','edit','delete'),
    ('documents','companies','edit','edit','delete'),
    ('trademarks','companies','edit','edit','delete'),
    ('workflow_steps','companies','create','edit','delete'),
    ('transactions','transactions','create','edit','delete'),
    ('transaction_steps','transactions','edit','edit','delete'),
    ('company_ids','government_ids','create','renew','delete'),
    ('financial_statements','financial_statements','create','submit','delete'),
    ('tax_assessments','companies','create','edit','delete'),
    ('deposits','deposits','create','release','release'),
    ('deposit_stages','deposits','create','release','release'),
    ('notifications','notifications','dismiss','dismiss','dismiss')
  ) as mapping(tbl, category, ins, upd, del) loop
    if to_regclass('public.' || m.tbl) is null then continue; end if;
    execute format('drop policy if exists app_permission_select on public.%I',m.tbl);
    execute format('drop policy if exists app_permission_insert on public.%I',m.tbl);
    execute format('drop policy if exists app_permission_update on public.%I',m.tbl);
    execute format('drop policy if exists app_permission_delete on public.%I',m.tbl);
    execute format('create policy app_permission_select on public.%I as restrictive for select to authenticated using (public.app_has_permission(%L,''view''))',m.tbl,m.category);
    execute format('create policy app_permission_insert on public.%I as restrictive for insert to authenticated with check (public.app_has_permission(%L,%L))',m.tbl,m.category,m.ins);
    execute format('create policy app_permission_update on public.%I as restrictive for update to authenticated using (public.app_has_permission(%L,%L)) with check (public.app_has_permission(%L,%L))',m.tbl,m.category,m.upd,m.category,m.upd);
    execute format('create policy app_permission_delete on public.%I as restrictive for delete to authenticated using (public.app_has_permission(%L,%L))',m.tbl,m.category,m.del);
  end loop;
end $$;

-- Access to private objects also ends immediately when a profile is disabled.
drop policy if exists app_storage_active on storage.objects;
create policy app_storage_active on storage.objects as restrictive for all to authenticated
  using (public.current_active_role() is not null) with check (public.current_active_role() is not null);

commit;
