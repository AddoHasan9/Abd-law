-- ============================================================
-- SQL Migration: Company Profile ERP (business-logic fix batch)
-- ============================================================
-- نفّذ هذا الملف في Supabase SQL Editor. يضيف الأعمدة والجداول
-- التي يعتمد عليها الكود فعلياً (تكليف الحسابات الختامية، الهويات
-- الحكومية برقم الهوية، المساهمون، العلامات التجارية، والسجل الزمني)
-- ولم تكن موجودة سابقاً في المخطط — وهو السبب الجذري لبقاء زر
-- "تكليف المكتب بالحسابات الختامية" بلا أثر حقيقي.

-- 1. أعمدة ناقصة على جدول الشركات (يكتب لها الكود فعلياً بلا عمود مطابق)
alter table companies
  add column if not exists financial_statements_enabled boolean not null default false,
  add column if not exists establishment_date date,
  add column if not exists last_completed_fs_year integer,
  add column if not exists fs_first_method text
    check (fs_first_method in ('standard', 'merge_next_year') or fs_first_method is null),
  add column if not exists accounting_notes jsonb;

-- 2. رقم الهوية الفعلي على وثائق الهوية الحكومية (مطلوب لعرض "رقم الهوية")
alter table company_ids
  add column if not exists id_number text;

-- 3. المدير المفوض — سجل مستقل بالتاريخ (كان معرّفاً فقط في fix_supabase_rls.sql)
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
create index if not exists company_managers_company_id_idx on company_managers (company_id);

-- 4. المساهمون — لم يكن له أي جدول من قبل رغم استعماله في الكود
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
create index if not exists company_shareholders_company_id_idx on company_shareholders (company_id);

-- 5. العلامات التجارية — جدول أدنى لإزالة القسم الوهمي في ملف الشركة
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
create index if not exists trademarks_company_id_idx on trademarks (company_id);

-- 6ب. ربط سجل التواصل (comms) بالشركة مباشرة — كان مرتبطاً بالعميل فقط،
-- وأغلب الشركات لا تملك client_id فعلياً، فتعذّر ربط رسائل واتساب بها
alter table comms
  add column if not exists company_id uuid references companies(id) on delete cascade;
create index if not exists comms_company_id_idx on comms (company_id);

-- 6. السجل الزمني الدائم للشركة — يحل محل السجل الوهمي بالذاكرة
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
create index if not exists company_timeline_company_id_idx on company_timeline (company_id);
create index if not exists company_timeline_created_at_idx on company_timeline (created_at desc);

-- ------------------------------------------------------------
-- ملاحظة أمان: fix_supabase_rls.sql عطّل RLS بالكامل على الجداول
-- الأساسية ومنح صلاحية كاملة لدور anon — هذا خارج نطاق هذا الملف
-- عمداً (يحتاج قراراً منفصلاً)، لكن الجداول الجديدة هنا تتبع نفس
-- النمط المتساهل الحالي حتى لا تكسر شيئاً يعمل اليوم.
-- ------------------------------------------------------------
alter table company_managers disable row level security;
alter table company_shareholders disable row level security;
alter table trademarks disable row level security;
alter table company_timeline disable row level security;

grant all on company_managers, company_shareholders, trademarks, company_timeline
  to anon, authenticated, service_role;
