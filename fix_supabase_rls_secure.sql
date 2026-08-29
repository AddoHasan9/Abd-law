-- ============================================================
-- fix_supabase_rls_secure.sql — إصلاح آمن يحلّ محل fix_supabase_rls.sql
-- ============================================================
-- نفّذ هذا الملف في Supabase Dashboard -> SQL Editor (كمستخدم postgres).
--
-- المشكلة الأصلية:
-- 1. خطأ "permission denied for table companies" كان بسبب غياب
--    GRANT على مستوى الجدول لدور authenticated — وليس بسبب سياسات RLS.
--    lib/data/companies.ts يقرأ عبر عميل الجلسة (createClient) الخاضع
--    للصلاحيات، وليس عبر عميل الأدمن.
-- 2. جدول company_timeline لم يكن موجوداً أصلاً (تم إنشاؤه لاحقاً في
--    supabase-migration-company-profile-erp.sql).
--
-- fix_supabase_rls.sql عالج الاثنين بحل جذري: تعطيل RLS بالكامل ومنح
-- anon/authenticated/service_role صلاحية كاملة على كل شيء. هذا يجعل
-- أي حامل لمفتاح anon العام (مكشوف في كل صفحة) قادراً على قراءة/تعديل/
-- حذف كل بيانات المكتب مباشرة عبر REST API لسوبابيس، متجاوزاً التطبيق
-- والـ middleware كليّاً.
--
-- هذا الملف يعيد تفعيل RLS بسياسات محددة (staff فقط للكتابة، كما في
-- supabase-schema.sql الأصلي)، ويمنح صلاحيات الجدول لـ authenticated
-- فقط (لا داعي لـ anon، فكل الصفحات محمية بـ middleware.ts قبل أي
-- استعلام)، ويصلح سبب غياب الصلاحيات جذرياً حتى لا يتكرر مع أي جدول
-- جديد.

-- ------------------------------------------------------------
-- 0. التأكد من وجود كل الجداول (بما يطابق الهجرات السابقة)
-- ------------------------------------------------------------
create table if not exists financial_statements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  year int not null,
  date_received date,
  date_submitted date,
  notes text,
  created_at timestamptz not null default now(),
  unique(company_id, year)
);

create table if not exists company_ids (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  id_type text not null,
  id_number text,
  manager_name text,
  issue_date date,
  expiry_date date,
  tx_start_date date,
  grade text,
  notes text,
  created_at timestamptz not null default now()
);

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

create table if not exists company_shareholders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  share_percentage numeric,
  share_amount numeric,
  nationality text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists trademarks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  registration_no text,
  status text not null default 'pending' check (status in ('pending', 'registered', 'rejected', 'expired')),
  registered_date date,
  expiry_date date,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists company_timeline (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  event_type text not null,
  title text not null,
  description text,
  actor_id uuid references profiles(id) on delete set null,
  actor_name text,
  related_link text,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 1. السبب الجذري: منح صلاحيات الجدول لـ authenticated فقط
-- ------------------------------------------------------------
-- anon لا يحتاج أي صلاحية مباشرة على هذه الجداول — كل الصفحات محمية
-- بـ middleware.ts قبل أي استعلام، وتسجيل الدخول يمر عبر Supabase Auth
-- API (auth.users) وليس عبر هذه الجداول.
revoke all on all tables in schema public from anon;

grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete on
  companies, workflow_steps, transactions, transaction_steps,
  deposits, deposit_stages, financial_statements, company_ids,
  company_managers, company_shareholders, trademarks, company_timeline,
  clients, leads, employees, payments, documents, poas, seals,
  tickets, comms, followups, settings, profiles, notifications, reminders
  to authenticated;

grant select on audit_log to authenticated;

grant usage, select on all sequences in schema public to authenticated;

-- يصلح غياب الصلاحيات الافتراضية جذرياً — أي جدول جديد يُنشأ لاحقاً
-- بواسطة postgres (SQL Editor) سيرث صلاحيات authenticated/service_role
-- تلقائياً، فلا يتكرر خطأ "permission denied" مع كل هجرة جديدة.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant usage, select on sequences to authenticated;

-- service_role (المستخدَم في lib/supabase/server.ts::createAdminClient
-- ضمن Server Actions فقط) يتجاوز RLS والصلاحيات افتراضياً في سوبابيس،
-- لكن نمنحه صراحةً لوضوح النية.
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- ------------------------------------------------------------
-- 2. إعادة تفعيل RLS على كل ما عطّله fix_supabase_rls.sql وهجرة الـ ERP
-- ------------------------------------------------------------
alter table companies              enable row level security;
alter table workflow_steps         enable row level security;
alter table deposits                enable row level security;
alter table deposit_stages          enable row level security;
alter table transactions            enable row level security;
alter table financial_statements    enable row level security;
alter table company_ids             enable row level security;
alter table company_managers        enable row level security;
alter table company_shareholders    enable row level security;
alter table trademarks              enable row level security;
alter table company_timeline        enable row level security;

-- ------------------------------------------------------------
-- 3. الجداول الأساسية: سياساتها الأصلية في supabase-schema.sql سليمة
--    (staff يرون/يكتبون الكل، المحامي يرى شركاته المرتبطة فقط عبر
--    transactions.lawyer_id). تعطيلها كان هو الخلل — إعادة التفعيل
--    في الخطوة 2 كافية، السياسات ذاتها لم تُحذف بـ disable.
--    نعيد إنشاءها هنا للأمان في حال لم تكن موجودة على هذا المشروع.
-- ------------------------------------------------------------
drop policy if exists companies_select on companies;
create policy companies_select on companies for select to authenticated
  using (
    is_staff()
    or id in (select company_id from transactions where lawyer_id = auth.uid() and company_id is not null)
  );
drop policy if exists companies_write on companies;
create policy companies_write on companies for all to authenticated using (is_staff()) with check (is_staff());

drop policy if exists wf_select on workflow_steps;
create policy wf_select on workflow_steps for select to authenticated
  using (
    is_staff()
    or company_id in (select company_id from transactions where lawyer_id = auth.uid() and company_id is not null)
  );
drop policy if exists wf_write on workflow_steps;
create policy wf_write on workflow_steps for all to authenticated using (is_staff()) with check (is_staff());

drop policy if exists deposits_select on deposits;
create policy deposits_select on deposits for select to authenticated
  using (
    is_staff()
    or company_id in (select company_id from transactions where lawyer_id = auth.uid() and company_id is not null)
  );
drop policy if exists deposits_write on deposits;
create policy deposits_write on deposits for all to authenticated using (is_staff()) with check (is_staff());

drop policy if exists dep_stages_select on deposit_stages;
create policy dep_stages_select on deposit_stages for select to authenticated
  using (
    is_staff()
    or deposit_id in (
      select d.id from deposits d
      join transactions t on t.company_id = d.company_id
      where t.lawyer_id = auth.uid()
    )
  );
drop policy if exists dep_stages_write on deposit_stages;
create policy dep_stages_write on deposit_stages for all to authenticated using (is_staff()) with check (is_staff());

drop policy if exists tx_select on transactions;
create policy tx_select on transactions for select to authenticated
  using (is_staff() or lawyer_id = auth.uid());
drop policy if exists tx_insert on transactions;
create policy tx_insert on transactions for insert to authenticated with check (is_staff());
drop policy if exists tx_update on transactions;
create policy tx_update on transactions for update to authenticated
  using (is_staff() or lawyer_id = auth.uid());
drop policy if exists tx_delete on transactions;
create policy tx_delete on transactions for delete to authenticated using (is_staff());

-- ------------------------------------------------------------
-- 4. الجداول الأحدث: كانت مفتوحة بالكامل (using(true)) لكل مستخدم
--    مسجّل دخول. تُقيَّد الآن بنفس منطق lib/rbac.ts — القراءة لكل
--    الموظفين المرتبطين بالشركة، الكتابة لـ admin/manager فقط
--    (canEditCompanyData / canManageGovernmentIDs / canAssignFinancialStatements).
-- ------------------------------------------------------------
drop policy if exists financial_statements_all on financial_statements;
drop policy if exists fs_select on financial_statements;
create policy fs_select on financial_statements for select to authenticated
  using (
    is_staff()
    or company_id in (select company_id from transactions where lawyer_id = auth.uid() and company_id is not null)
  );
drop policy if exists fs_write on financial_statements;
create policy fs_write on financial_statements for insert to authenticated with check (is_staff());
drop policy if exists fs_update on financial_statements;
create policy fs_update on financial_statements for update to authenticated using (is_staff()) with check (is_staff());
drop policy if exists fs_delete on financial_statements;
create policy fs_delete on financial_statements for delete to authenticated using (is_staff());

drop policy if exists company_ids_all on company_ids;
drop policy if exists company_ids_select on company_ids;
create policy company_ids_select on company_ids for select to authenticated
  using (
    is_staff()
    or company_id in (select company_id from transactions where lawyer_id = auth.uid() and company_id is not null)
  );
drop policy if exists company_ids_write on company_ids;
create policy company_ids_write on company_ids for insert to authenticated with check (is_staff());
drop policy if exists company_ids_update on company_ids;
create policy company_ids_update on company_ids for update to authenticated using (is_staff()) with check (is_staff());
drop policy if exists company_ids_delete on company_ids;
create policy company_ids_delete on company_ids for delete to authenticated using (is_staff());

drop policy if exists company_managers_all on company_managers;
drop policy if exists company_managers_select on company_managers;
create policy company_managers_select on company_managers for select to authenticated
  using (
    is_staff()
    or company_id in (select company_id from transactions where lawyer_id = auth.uid() and company_id is not null)
  );
drop policy if exists company_managers_write on company_managers;
create policy company_managers_write on company_managers for insert to authenticated with check (is_staff());
drop policy if exists company_managers_update on company_managers;
create policy company_managers_update on company_managers for update to authenticated using (is_staff()) with check (is_staff());
drop policy if exists company_managers_delete on company_managers;
create policy company_managers_delete on company_managers for delete to authenticated using (is_staff());

drop policy if exists company_shareholders_all on company_shareholders;
drop policy if exists company_shareholders_select on company_shareholders;
create policy company_shareholders_select on company_shareholders for select to authenticated
  using (
    is_staff()
    or company_id in (select company_id from transactions where lawyer_id = auth.uid() and company_id is not null)
  );
drop policy if exists company_shareholders_write on company_shareholders;
create policy company_shareholders_write on company_shareholders for insert to authenticated with check (is_staff());
drop policy if exists company_shareholders_update on company_shareholders;
create policy company_shareholders_update on company_shareholders for update to authenticated using (is_staff()) with check (is_staff());
drop policy if exists company_shareholders_delete on company_shareholders;
create policy company_shareholders_delete on company_shareholders for delete to authenticated using (is_staff());

drop policy if exists trademarks_all on trademarks;
drop policy if exists trademarks_select on trademarks;
create policy trademarks_select on trademarks for select to authenticated
  using (
    is_staff()
    or company_id in (select company_id from transactions where lawyer_id = auth.uid() and company_id is not null)
  );
drop policy if exists trademarks_write on trademarks;
create policy trademarks_write on trademarks for insert to authenticated with check (is_staff());
drop policy if exists trademarks_update on trademarks;
create policy trademarks_update on trademarks for update to authenticated using (is_staff()) with check (is_staff());
drop policy if exists trademarks_delete on trademarks;
create policy trademarks_delete on trademarks for delete to authenticated using (is_staff());

-- company_timeline: كل الكتابة تمرّ عبر lib/data/timeline.ts::logTimelineEvent
-- الذي يستعمل createAdminClient (service_role) حصراً — لا حاجة لسياسة
-- INSERT/UPDATE/DELETE لدور authenticated. القراءة فقط، بنفس نطاق الشركة.
drop policy if exists timeline_allow_all on company_timeline;
drop policy if exists timeline_select on company_timeline;
create policy timeline_select on company_timeline for select to authenticated
  using (
    is_staff()
    or company_id in (select company_id from transactions where lawyer_id = auth.uid() and company_id is not null)
  );

-- ------------------------------------------------------------
-- 5. تحقّق سريع بعد التنفيذ (اختياري) — يجب أن تكون النتيجة فارغة
-- ------------------------------------------------------------
-- select grantee, privilege_type from information_schema.role_table_grants
--   where table_schema = 'public' and grantee = 'anon';
