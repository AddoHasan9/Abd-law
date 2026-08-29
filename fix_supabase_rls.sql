-- ============================================================
-- ⚠️ متروك — لا تنفّذ هذا الملف. استعمل fix_supabase_rls_secure.sql بدلاً منه.
-- ============================================================
-- هذا الملف يعطّل RLS بالكامل ويمنح anon صلاحية كاملة على كل الجداول،
-- ما يجعل أي حامل لمفتاح anon العام (مكشوف في كل صفحة متصفح) قادراً
-- على قراءة/تعديل/حذف كل بيانات المكتب مباشرة عبر REST API لسوبابيس،
-- متجاوزاً middleware.ts والتطبيق كليّاً.
--
-- السبب الحقيقي لخطأ "permission denied for table companies" لم يكن
-- RLS بل غياب GRANT على مستوى الجدول لدور authenticated. الحل الآمن
-- في fix_supabase_rls_secure.sql يمنح authenticated فقط (بلا anon)
-- ويعيد تفعيل RLS بسياسات staff/lawyer المطابقة لـ lib/rbac.ts.
-- ============================================================

-- ============================================================
-- fix_supabase_rls.sql — إصلاح صلاحيات جداول الشركات والودائع والتايم لاين
-- ============================================================
-- نفّذ هذا الملف في Supabase Dashboard -> SQL Editor
-- لفتح الصلاحيات ومنع خطأ permission denied for table companies / missing company_timeline

-- 1. التأكد من إنشاء كافة الجداول المطلوبة إن لم تكن موجودة
create table if not exists financial_statements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  year int not null,
  date_received date,
  date_submitted date,
  notes text,
  created_at timestamptz not null default now(),
  unique(company_id, year)
);

create table if not exists company_ids (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  id_type text not null,
  manager_name text,
  issue_date date,
  expiry_date date,
  grade text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists company_managers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  name text not null,
  phone text,
  id_number text,
  start_date date,
  end_date date,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists company_timeline (
  id text primary key default gen_random_uuid()::text,
  company_id uuid references companies(id) on delete cascade,
  event_type text not null,
  title text not null,
  description text,
  actor_id text,
  actor_name text,
  related_link text,
  created_at timestamptz not null default now()
);

-- 2. إعطاء كافة الصلاحيات للأدوار في Supabase
grant all on all tables in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all functions in schema public to anon, authenticated, service_role;

-- 3. تفعيل سياسة السماح الشاملة للشركات وسير العمل والودائع
drop policy if exists companies_allow_all on companies;
create policy companies_allow_all on companies for all using (true) with check (true);

drop policy if exists wf_allow_all on workflow_steps;
create policy wf_allow_all on workflow_steps for all using (true) with check (true);

drop policy if exists deposits_allow_all on deposits;
create policy deposits_allow_all on deposits for all using (true) with check (true);

drop policy if exists dep_stages_allow_all on deposit_stages;
create policy dep_stages_allow_all on deposit_stages for all using (true) with check (true);

drop policy if exists fs_allow_all on financial_statements;
create policy fs_allow_all on financial_statements for all using (true) with check (true);

drop policy if exists ids_allow_all on company_ids;
create policy ids_allow_all on company_ids for all using (true) with check (true);

drop policy if exists tx_allow_all on transactions;
create policy tx_allow_all on transactions for all using (true) with check (true);

drop policy if exists timeline_allow_all on company_timeline;
create policy timeline_allow_all on company_timeline for all using (true) with check (true);

-- 4. إيقاف الـ RLS المقيد الذي يمنع الحفظ في حالة غياب الجلسة
alter table companies disable row level security;
alter table workflow_steps disable row level security;
alter table deposits disable row level security;
alter table deposit_stages disable row level security;
alter table financial_statements disable row level security;
alter table company_ids disable row level security;
alter table transactions disable row level security;
alter table company_timeline disable row level security;
