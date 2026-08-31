-- ============================================================
-- supabase-schema.sql — مخطط مكتب المحامي عبد الحسن الخزرجي
-- ============================================================
-- نفّذ في Supabase SQL Editor قبل seed و storage.
-- يطابق types/database.ts و lib/constants.ts

create extension if not exists "pgcrypto";

-- ---------- الأنواع المعدودة ----------
create type user_role    as enum ('super_admin', 'admin', 'manager', 'lawyer', 'staff');
create type client_type  as enum ('individual', 'company');
create type tx_status    as enum ('new', 'progress', 'done', 'rejected', 'hold');
create type tx_priority  as enum ('low', 'medium', 'high', 'urgent');
create type wf_state     as enum ('wait', 'doing', 'done');
create type stage_state  as enum ('idle', 'progress', 'done');
create type lead_stage   as enum ('new', 'followup', 'qualified', 'converted');
create type comm_channel as enum ('phone', 'whatsapp', 'email', 'visit');

-- ---------- الجداول ----------
create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text not null,
  role       user_role not null default 'lawyer',
  dept       text,
  phone      text,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

create table employees (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  title      text,
  phone      text,
  created_at timestamptz not null default now()
);

create table clients (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  type       client_type not null default 'individual',
  phones     text[] not null default '{}',
  business   text,
  notes      text,
  created_at timestamptz not null default now()
);

create table leads (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  contact    text,
  source     text,
  stage      lead_stage not null default 'new',
  note       text,
  created_at timestamptz not null default now()
);

create table companies (
  id         uuid primary key default gen_random_uuid(),
  task_no    text,
  client_id  uuid references clients(id) on delete set null,
  name       text not null,
  name_en    text,
  kind       text,
  capital    numeric not null default 0,
  manager    text,
  cert_no    text,
  cert_date  date,
  activity   text,
  address    text,
  phone      text,
  lacks      text,
  external   boolean not null default false,
  status     text,
  created_at timestamptz not null default now()
);

create table workflow_steps (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  step_key   text not null,
  step_order int not null,
  label      text not null,
  owner_kind text,
  state      wf_state not null default 'wait',
  done_by    uuid references profiles(id) on delete set null,
  done_at    timestamptz,
  unique (company_id, step_key)
);

create table transactions (
  id          uuid primary key default gen_random_uuid(),
  type        text not null,
  client_id   uuid references clients(id) on delete set null,
  company_id  uuid references companies(id) on delete set null,
  lawyer_id   uuid references profiles(id) on delete set null,
  priority    tx_priority not null default 'medium',
  status      tx_status not null default 'new',
  tx_date     date not null default current_date,
  due_date    date,
  description text,
  services    text[] not null default '{}',
  lacks       text,
  fee         numeric,
  phone       text,
  created_at  timestamptz not null default now()
);

create table transaction_steps (
  id         uuid primary key default gen_random_uuid(),
  tx_id      uuid not null references transactions(id) on delete cascade,
  text       text not null,
  by_id      uuid references profiles(id) on delete set null,
  at_date    date not null default current_date,
  created_at timestamptz not null default now()
);

create table deposits (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  tx_id      uuid references transactions(id) on delete set null,
  started_at date not null default current_date,
  created_at timestamptz not null default now()
);

create table deposit_stages (
  id          uuid primary key default gen_random_uuid(),
  deposit_id  uuid not null references deposits(id) on delete cascade,
  stage_key   text not null,
  stage_order int not null,
  label       text not null,
  critical    boolean not null default false,
  state       stage_state not null default 'idle',
  owner_id    uuid references profiles(id) on delete set null,
  at_date     date,
  unique (deposit_id, stage_key)
);

create table payments (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid references clients(id) on delete set null,
  tx_id        uuid references transactions(id) on delete set null,
  amount       numeric not null default 0,
  currency     text not null default 'IQD',
  description  text,
  pay_date     date not null default current_date,
  receiver_id  uuid references profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

create table documents (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  kind         text,
  client_id    uuid references clients(id) on delete set null,
  company_id   uuid references companies(id) on delete set null,
  storage_path text,
  doc_date     date,
  created_at   timestamptz not null default now()
);

create table poas (
  id         uuid primary key default gen_random_uuid(),
  principal  text not null,
  agent      text,
  kind       text,
  poa_no     text,
  poa_date   date,
  status     text,
  created_at timestamptz not null default now()
);

create table seals (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  authority  text,
  status     text,
  notes      text,
  created_at timestamptz not null default now()
);

create table tickets (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid references clients(id) on delete set null,
  subject     text not null,
  priority    tx_priority not null default 'medium',
  status      tx_status not null default 'new',
  owner_id    uuid references profiles(id) on delete set null,
  ticket_date date not null default current_date,
  created_at  timestamptz not null default now()
);

create table comms (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid references clients(id) on delete set null,
  channel    comm_channel not null,
  summary    text,
  comm_date  date not null default current_date,
  by_id      uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table followups (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid references clients(id) on delete set null,
  tx_id      uuid references transactions(id) on delete set null,
  due_date   date not null,
  note       text,
  status     text not null default 'open',
  created_at timestamptz not null default now()
);

create table settings (
  id            int primary key default 1 check (id = 1),
  office_name   text not null default 'مكتب المحامي عبد الحسن الخزرجي',
  penalty_days  int not null default 37,
  penalty_warn  int not null default 7,
  penalty_daily numeric not null default 50000,
  penalty_max   numeric not null default 5154000,
  currency      text not null default 'IQD',
  updated_at    timestamptz not null default now()
);

create table audit_log (
  id          bigserial primary key,
  actor_id    uuid references profiles(id) on delete set null,
  actor_name  text,
  actor_role  user_role,
  action      text not null,
  entity      text,
  entity_id   text,
  note        text,
  at          timestamptz not null default now()
);

-- ---------- فهارس ----------
create index idx_transactions_lawyer   on transactions(lawyer_id);
create index idx_transactions_type     on transactions(type);
create index idx_transactions_status   on transactions(status);
create index idx_companies_created     on companies(created_at desc);
create index idx_deposits_company      on deposits(company_id);
create index idx_deposit_stages_key    on deposit_stages(stage_key, state);
create index idx_workflow_company      on workflow_steps(company_id, step_order);

-- ---------- الإعدادات الافتراضية ----------
insert into settings (id) values (1) on conflict (id) do nothing;

-- ---------- دوال مساعدة ----------
create or replace function is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('admin', 'manager')
  );
$$;

create or replace function company_submitted(cid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from deposit_stages ds
    join deposits d on d.id = ds.deposit_id
    where d.company_id = cid
      and ds.stage_key = 'submit'
      and ds.state = 'done'
  );
$$;

create or replace function search_all(q text)
returns table (kind text, id uuid, title text)
language sql stable security definer set search_path = public
as $$
  select 'company'::text, c.id, c.name
  from companies c
  where is_staff() and c.name ilike '%' || q || '%'
  union all
  select 'client', cl.id, cl.name
  from clients cl
  where is_staff() and cl.name ilike '%' || q || '%'
  union all
  select 'transaction', t.id, coalesce(t.description, t.type)
  from transactions t
  where (is_staff() or t.lawyer_id = auth.uid())
    and (t.description ilike '%' || q || '%' or t.type ilike '%' || q || '%')
  union all
  select 'document', d.id, d.title
  from documents d
  where is_staff() and d.title ilike '%' || q || '%'
  limit 50;
$$;

-- ---------- محفّز: إنشاء profile عند التسجيل ----------
create or replace function handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_role user_role;
  v_name text;
begin
  v_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1),
    'مستخدم'
  );
  begin
    v_role := coalesce(new.raw_user_meta_data->>'role', 'lawyer')::user_role;
  exception when others then
    v_role := 'lawyer';
  end;
  insert into profiles (id, name, role)
  values (new.id, v_name, v_role)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------- RLS ----------
alter table profiles         enable row level security;
alter table employees        enable row level security;
alter table clients          enable row level security;
alter table leads            enable row level security;
alter table companies        enable row level security;
alter table workflow_steps   enable row level security;
alter table transactions     enable row level security;
alter table transaction_steps enable row level security;
alter table deposits         enable row level security;
alter table deposit_stages   enable row level security;
alter table payments         enable row level security;
alter table documents        enable row level security;
alter table poas             enable row level security;
alter table seals            enable row level security;
alter table tickets          enable row level security;
alter table comms            enable row level security;
alter table followups        enable row level security;
alter table settings         enable row level security;
alter table audit_log        enable row level security;

-- profiles
create policy profiles_select on profiles for select to authenticated
  using (id = auth.uid() or is_staff());
create policy profiles_update_self on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_admin on profiles for all to authenticated
  using ((select role from profiles where id = auth.uid()) = 'admin');

-- settings — قراءة للجميع، تعديل للأدمن
create policy settings_select on settings for select to authenticated using (true);
create policy settings_update on settings for update to authenticated
  using ((select role from profiles where id = auth.uid()) = 'admin');

-- transactions
create policy tx_select on transactions for select to authenticated
  using (is_staff() or lawyer_id = auth.uid());
create policy tx_insert on transactions for insert to authenticated with check (is_staff());
create policy tx_update on transactions for update to authenticated
  using (is_staff() or lawyer_id = auth.uid());
create policy tx_delete on transactions for delete to authenticated using (is_staff());

-- companies + workflow + deposits — الموظفون يرون الكل
create policy companies_select on companies for select to authenticated
  using (
    is_staff()
    or id in (select company_id from transactions where lawyer_id = auth.uid() and company_id is not null)
  );
create policy companies_write on companies for all to authenticated using (is_staff());

create policy wf_select on workflow_steps for select to authenticated
  using (
    is_staff()
    or company_id in (select company_id from transactions where lawyer_id = auth.uid() and company_id is not null)
  );
create policy wf_write on workflow_steps for all to authenticated using (is_staff());

create policy deposits_select on deposits for select to authenticated
  using (
    is_staff()
    or company_id in (select company_id from transactions where lawyer_id = auth.uid() and company_id is not null)
  );
create policy deposits_write on deposits for all to authenticated using (is_staff());

create policy dep_stages_select on deposit_stages for select to authenticated
  using (
    is_staff()
    or deposit_id in (
      select d.id from deposits d
      join transactions t on t.company_id = d.company_id
      where t.lawyer_id = auth.uid()
    )
  );
create policy dep_stages_write on deposit_stages for all to authenticated using (is_staff());

-- clients — قراءة للجميع، كتابة للموظفين
create policy clients_select on clients for select to authenticated using (true);
create policy clients_write on clients for insert to authenticated with check (is_staff());
create policy clients_update on clients for update to authenticated using (is_staff());
create policy clients_delete on clients for delete to authenticated using (is_staff());

create policy employees_all on employees for all to authenticated using (is_staff());

create policy leads_select on leads for select to authenticated using (true);
create policy leads_write on leads for all to authenticated using (is_staff());

create policy tickets_select on tickets for select to authenticated
  using (is_staff() or owner_id = auth.uid());
create policy tickets_write on tickets for all to authenticated using (is_staff() or owner_id = auth.uid());

create policy comms_select on comms for select to authenticated
  using (is_staff() or by_id = auth.uid());
create policy comms_write on comms for all to authenticated using (is_staff() or by_id = auth.uid());

create policy followups_select on followups for select to authenticated using (true);
create policy followups_write on followups for all to authenticated using (is_staff());

-- admin tables
create policy payments_all on payments for all to authenticated using (is_staff());
create policy documents_all on documents for all to authenticated using (is_staff());
create policy poas_all on poas for all to authenticated using (is_staff());
create policy seals_all on seals for all to authenticated using (is_staff());
create policy tx_steps_all on transaction_steps for all to authenticated
  using (
    is_staff()
    or tx_id in (select id from transactions where lawyer_id = auth.uid())
  );
create policy audit_select on audit_log for select to authenticated using (is_staff());

-- Grant execute on functions
grant execute on function is_staff() to authenticated;
grant execute on function company_submitted(uuid) to authenticated;
grant execute on function search_all(text) to authenticated;

-- ---------- الإشعارات والتذكيرات (Notifications & Reminders) ----------

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  title text not null,
  description text,
  type text not null default 'general',
  related_company_id uuid references companies(id) on delete set null,
  link_url text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  title text not null,
  notes text,
  company_id uuid references companies(id) on delete set null,
  priority text not null default 'medium',
  due_date date,
  due_time time,
  is_completed boolean not null default false,
  is_archived boolean not null default false,
  is_read boolean not null default false,
  alert_sent boolean not null default false,
  created_at timestamptz not null default now()
);

alter table notifications enable row level security;
alter table reminders enable row level security;

create policy notifications_all on notifications for all to authenticated using (true);
create policy reminders_all on reminders for all to authenticated using (true);

create table if not exists financial_statements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  year integer not null,
  date_received date,
  date_submitted date,
  notes text,
  created_at timestamptz not null default now(),
  constraint unique_company_fs_year unique (company_id, year)
);

alter table financial_statements enable row level security;
create policy financial_statements_all on financial_statements for all to authenticated using (true);

create table if not exists company_timeline (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  event_type text not null,
  title text not null,
  actor_name text,
  details text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table company_timeline enable row level security;
create policy company_timeline_all on company_timeline for all to authenticated using (true);

-- ---------- جداول السجل والمدراء والشركاء والهويات والضرائب وتدقيق المستخدمين ----------

create table if not exists company_managers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  phone text,
  id_number text,
  start_date date,
  end_date date,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);
alter table company_managers enable row level security;
create policy company_managers_all on company_managers for all to authenticated using (true);

create table if not exists company_shareholders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  share_percentage numeric,
  share_amount numeric,
  nationality text default 'عراقي',
  notes text,
  created_at timestamptz not null default now()
);
alter table company_shareholders enable row level security;
create policy company_shareholders_all on company_shareholders for all to authenticated using (true);

create table if not exists company_ids (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  id_type text not null check (id_type in ('importer_id', 'tax_id', 'planning_id', 'chamber_id')),
  id_number text,
  manager_name text,
  issue_date date,
  expiry_date date,
  tx_start_date date,
  grade text,
  status text not null default 'in_progress',
  notes text,
  created_at timestamptz not null default now()
);
alter table company_ids enable row level security;
create policy company_ids_all on company_ids for all to authenticated using (true);

create table if not exists tax_assessments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  year integer not null,
  amount numeric not null default 0,
  paid_amount numeric not null default 0,
  receipt_no text,
  receipt_date date,
  status text not null default 'in_progress',
  notes text,
  created_at timestamptz not null default now(),
  constraint unique_company_tax_year unique (company_id, year)
);
alter table tax_assessments enable row level security;
create policy tax_assessments_all on tax_assessments for all to authenticated using (true);

create table if not exists user_audit_logs (
  id text primary key,
  user_id uuid references profiles(id) on delete set null,
  user_name text,
  user_email text,
  user_role text,
  action text not null,
  category text not null,
  entity_type text,
  entity_id text,
  entity_name text,
  details text not null,
  ip_address text,
  created_at timestamptz not null default now()
);
alter table user_audit_logs enable row level security;
create policy user_audit_logs_all on user_audit_logs for all to authenticated using (true);

