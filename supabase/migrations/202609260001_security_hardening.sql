-- ============================================================
-- تقوية الأمان (دفاع متعدد الطبقات)
-- 1) my_role() يعيد الدور للحسابات المفعّلة فقط
-- 2) سياسات القراءة المفتوحة (true) ← أعضاء مفعّلون فقط
-- 3) سجل audit_log: لا يسجّل المستخدم إلا باسمه
-- 4) إنشاء جدول user_audit_logs المفقود: قراءة للمدراء، غير قابل للتعديل أو الحذف
-- 5) منع الزائر غير المسجّل من استدعاء دوال الأدوار
-- ============================================================

-- 1) الأدوار للحسابات المفعّلة فقط + search_path فارغ ومؤهّل بالكامل
create or replace function public.my_role()
returns public.user_role
language sql stable security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = auth.uid() and p.active is true
$$;

create or replace function public.is_staff()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce((public.my_role())::text in ('super_admin', 'admin', 'manager', 'staff'), false)
$$;

create or replace function public.is_admin_or_super()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce((public.my_role())::text in ('super_admin', 'admin'), false)
$$;

revoke execute on function public.my_role() from public, anon;
revoke execute on function public.is_staff() from public, anon;
revoke execute on function public.is_admin_or_super() from public, anon;
grant execute on function public.my_role() to authenticated, service_role;
grant execute on function public.is_staff() to authenticated, service_role;
grant execute on function public.is_admin_or_super() to authenticated, service_role;

-- 2) القراءة: أعضاء المكتب المفعّلون فقط (بدل true لأي دور)
alter policy clients_read      on public.clients      to authenticated using (public.current_active_role() is not null);
alter policy comms_read        on public.comms        to authenticated using (public.current_active_role() is not null);
alter policy docs_read         on public.documents    to authenticated using (public.current_active_role() is not null);
alter policy emp_read          on public.employees    to authenticated using (public.current_active_role() is not null);
alter policy followup_read     on public.followups    to authenticated using (public.current_active_role() is not null);
alter policy leads_read        on public.leads        to authenticated using (public.current_active_role() is not null);
alter policy poas_read         on public.poas         to authenticated using (public.current_active_role() is not null);
alter policy seals_read        on public.seals        to authenticated using (public.current_active_role() is not null);
alter policy settings_read     on public.settings     to authenticated using (public.current_active_role() is not null);
alter policy shareholders_read on public.shareholders to authenticated using (public.current_active_role() is not null);
alter policy ticket_read       on public.tickets      to authenticated using (public.current_active_role() is not null);

-- 3) لا تزوير لقيود التدقيق: الإدخال باسم المستخدم نفسه فقط
alter policy audit_insert on public.audit_log to authenticated
  with check (actor_id = auth.uid() and public.current_active_role() is not null);

-- 4) جدول سجل التدقيق الذي يكتب إليه التطبيق (كان مفقوداً فتضيع السجلات)
create table if not exists public.user_audit_logs (
  id text primary key,
  user_id uuid references public.profiles(id) on delete set null,
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
create index if not exists user_audit_logs_created_idx on public.user_audit_logs (created_at desc);
create index if not exists user_audit_logs_user_idx on public.user_audit_logs (user_id);
create index if not exists user_audit_logs_category_idx on public.user_audit_logs (category);

alter table public.user_audit_logs enable row level security;
revoke all on public.user_audit_logs from anon, authenticated;
grant select on public.user_audit_logs to authenticated;

drop policy if exists user_audit_logs_read on public.user_audit_logs;
create policy user_audit_logs_read on public.user_audit_logs
  for select to authenticated using (public.is_admin_or_super());

-- السجل للإضافة فقط: لا تعديل ولا حذف حتى بمفتاح الخادم
create or replace function public.user_audit_logs_immutable()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'سجل التدقيق غير قابل للتعديل أو الحذف';
end $$;
drop trigger if exists user_audit_logs_no_change on public.user_audit_logs;
create trigger user_audit_logs_no_change
  before update or delete on public.user_audit_logs
  for each row execute function public.user_audit_logs_immutable();

-- 6) نقل امتداد pg_trgm خارج مخطط public (غير مستخدم في أي فهرس أو دالة)
alter extension pg_trgm set schema extensions;
