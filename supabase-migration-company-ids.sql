-- ============================================================
-- SQL Migration Script: Company IDs (Identity Documents Module)
-- ============================================================
-- انسخ هذا الملف ونفّذه في Supabase SQL Editor لإنشاء جدول
-- هويات الشركات (مستورد / ضريبية / تخطيط / غرفة تجارية) وسياسات RLS.
-- بدونه تعمل وحدة الهويات على مخزن مؤقت بالذاكرة يُفرَّغ عند إعادة التشغيل.

create table if not exists company_ids (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  id_type text not null check (id_type in ('importer_id', 'tax_id', 'planning_id', 'chamber_id')),
  manager_name text,
  issue_date date,
  expiry_date date,
  tx_start_date date,
  grade text,
  created_at timestamptz not null default now()
);

create index if not exists company_ids_company_id_idx on company_ids (company_id);
create index if not exists company_ids_id_type_idx on company_ids (id_type);

alter table company_ids enable row level security;

drop policy if exists company_ids_all on company_ids;
create policy company_ids_all on company_ids for all to authenticated using (true);
