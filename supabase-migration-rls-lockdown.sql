-- ============================================================
-- supabase-migration-rls-lockdown.sql
-- إغلاق ثغرة انكشاف قاعدة البيانات (2026-08-30)
-- ------------------------------------------------------------
-- نفّذه في Supabase Dashboard -> SQL Editor كمستخدم postgres،
-- بعد ضبط SUPABASE_SERVICE_ROLE_KEY على Vercel وإعادة النشر.
--
-- الوضع قبل التنفيذ (مؤكّد عبر MCP):
--   • RLS مطفّي على 17 جدول أساسي
--   • دور anon يملك كامل صلاحيات DML على 31 جدول
--   • أي حامل لمفتاح anon (مكشوف في كل صفحة) يقرأ/يكتب/يحذف
--     كل بيانات المكتب مباشرة عبر REST، متجاوزًا التطبيق والـ middleware
--
-- بعد التنفيذ:
--   • anon: لا وصول إطلاقًا إلى schema public
--   • authenticated: وصول عبر سياسات RLS فقط (staff يرى الكل،
--     المحامي يرى شركاته/معاملاته)
--   • service_role (إجراءات الخادم): يتجاوز RLS كالمعتاد
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. سحب كل وصول anon
-- ------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on all functions in schema public from anon;
revoke all on all procedures in schema public from anon;
revoke usage on schema public from anon;

revoke execute on function public.is_staff() from public, anon;
revoke execute on function public.my_role() from public, anon;
revoke execute on function public.is_admin_or_super() from public, anon;
revoke execute on function public.handle_new_user() from public, anon;
grant execute on function public.is_staff(), public.my_role(), public.is_admin_or_super()
  to authenticated, service_role;

alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke all on functions from anon;

-- ------------------------------------------------------------
-- 2. صلاحيات الجدول لـ authenticated + service_role
-- ------------------------------------------------------------
grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant usage, select on sequences to authenticated;
alter default privileges in schema public
  grant all on tables to service_role;
alter default privileges in schema public
  grant all on sequences to service_role;

-- ------------------------------------------------------------
-- 3. حذف السياسات المكررة القديمة بدور {public}
-- ------------------------------------------------------------
drop policy if exists companies_read       on companies;
drop policy if exists dep_read             on deposits;
drop policy if exists dep_write            on deposits;
drop policy if exists depstage_read        on deposit_stages;
drop policy if exists depstage_write       on deposit_stages;
drop policy if exists tx_read              on transactions;
drop policy if exists wf_read              on workflow_steps;

-- ------------------------------------------------------------
-- 4. جداول بلا سياسات {authenticated} — إعادة إنشائها
-- ------------------------------------------------------------

-- transaction_steps: نفس منطق txstep القديم لكن بدور authenticated
drop policy if exists txstep_read  on transaction_steps;
drop policy if exists txstep_write on transaction_steps;
create policy txstep_select on transaction_steps for select to authenticated
  using (exists (select 1 from transactions t
                 where t.id = transaction_steps.tx_id
                   and (is_staff() or t.lawyer_id = auth.uid())));
create policy txstep_write on transaction_steps for all to authenticated
  using (exists (select 1 from transactions t
                 where t.id = transaction_steps.tx_id
                   and (is_staff() or t.lawyer_id = auth.uid())))
  with check (exists (select 1 from transactions t
                 where t.id = transaction_steps.tx_id
                   and (is_staff() or t.lawyer_id = auth.uid())));

-- profiles: كل مستخدم يقرأ صفّه، الموظفون يقرأون الكل، الأدمن/السوبر يكتب
drop policy if exists prof_read  on profiles;
drop policy if exists prof_write on profiles;
create policy profiles_select on profiles for select to authenticated
  using (id = auth.uid() or is_staff());
create policy profiles_write on profiles for all to authenticated
  using (is_admin_or_super()) with check (is_admin_or_super());

-- reminders
drop policy if exists reminders_read  on reminders;
drop policy if exists reminders_write on reminders;
create policy reminders_select on reminders for select to authenticated
  using (is_staff() or owner_id = auth.uid());
create policy reminders_write on reminders for all to authenticated
  using (is_staff() or owner_id = auth.uid())
  with check (is_staff() or owner_id = auth.uid());

-- financial_statement_assignments
drop policy if exists fsa_read  on financial_statement_assignments;
drop policy if exists fsa_write on financial_statement_assignments;
create policy fsa_select on financial_statement_assignments for select to authenticated
  using (is_staff() or company_id in
         (select company_id from transactions
          where lawyer_id = auth.uid() and company_id is not null));
create policy fsa_write on financial_statement_assignments for all to authenticated
  using (is_staff()) with check (is_staff());

-- financial_statement_obligations
drop policy if exists fso_read  on financial_statement_obligations;
drop policy if exists fso_write on financial_statement_obligations;
create policy fso_select on financial_statement_obligations for select to authenticated
  using (is_staff() or company_id in
         (select company_id from transactions
          where lawyer_id = auth.uid() and company_id is not null));
create policy fso_write on financial_statement_obligations for all to authenticated
  using (is_staff()) with check (is_staff());

-- tax_assessments: لا سياسات إطلاقًا حاليًا
drop policy if exists tax_select on tax_assessments;
drop policy if exists tax_write  on tax_assessments;
create policy tax_select on tax_assessments for select to authenticated
  using (is_staff()
         or lawyer_id = auth.uid()
         or company_id in (select company_id from transactions
                           where lawyer_id = auth.uid() and company_id is not null));
create policy tax_write on tax_assessments for all to authenticated
  using (is_staff()) with check (is_staff());

-- ------------------------------------------------------------
-- 5. تفعيل RLS على الـ 17 جدول
-- ------------------------------------------------------------
alter table companies                        enable row level security;
alter table company_ids                      enable row level security;
alter table company_managers                 enable row level security;
alter table company_shareholders             enable row level security;
alter table company_timeline                 enable row level security;
alter table deposit_stages                   enable row level security;
alter table deposits                         enable row level security;
alter table financial_statement_assignments  enable row level security;
alter table financial_statement_obligations  enable row level security;
alter table financial_statements             enable row level security;
alter table notifications                    enable row level security;
alter table profiles                         enable row level security;
alter table reminders                        enable row level security;
alter table tax_assessments                  enable row level security;
alter table trademarks                       enable row level security;
alter table transaction_steps                enable row level security;
alter table transactions                     enable row level security;

commit;

-- ------------------------------------------------------------
-- 6. تحقّق بعد التنفيذ (يجب أن تكون النتيجة صفر صفوف)
-- ------------------------------------------------------------
-- select grantee, table_name from information_schema.role_table_grants
--   where table_schema='public' and grantee='anon';
-- select tablename from pg_tables where schemaname='public' and rowsecurity=false;
