-- ============================================================
-- SQL Migration Script: Financial Statements, Reminders & Notifications
-- ============================================================
-- انسخ هذا الملف ونفّذه في Supabase SQL Editor لإنشاء الجدول وسياسات RLS.

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

alter table notifications enable row level security;
alter table reminders enable row level security;
alter table financial_statements enable row level security;

drop policy if exists notifications_all on notifications;
create policy notifications_all on notifications for all to authenticated using (true);

drop policy if exists reminders_all on reminders;
create policy reminders_all on reminders for all to authenticated using (true);

drop policy if exists financial_statements_all on financial_statements;
create policy financial_statements_all on financial_statements for all to authenticated using (true);
