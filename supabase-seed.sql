-- ============================================================
-- supabase-seed.sql — بيانات تجريبية (اختياري)
-- ============================================================
-- نفّذ بعد supabase-schema.sql وإنشاء مستخدم واحد على الأقل.

-- عميل تجريبي
insert into clients (id, name, type, phones, business)
values (
  'a0000000-0000-4000-8000-000000000001',
  'شركة النور للتجارة',
  'company',
  array['07701234567'],
  'استيراد وتصدير'
) on conflict (id) do nothing;

-- شركة مع مخطط سير العمل (8 خطوات)
insert into companies (
  id, task_no, client_id, name, kind, capital, manager,
  cert_no, cert_date, activity, phone
) values (
  'b0000000-0000-4000-8000-000000000001',
  'T-2026-001',
  'a0000000-0000-4000-8000-000000000001',
  'شركة النور للتجارة العامة',
  'ذات مسؤولية محدودة',
  5000000,
  'أحمد محمود',
  '12345',
  current_date - interval '20 days',
  'تجارة عامة',
  '07701234567'
) on conflict (id) do nothing;

insert into workflow_steps (company_id, step_key, step_order, label, owner_kind, state)
select
  'b0000000-0000-4000-8000-000000000001',
  v.step_key, v.step_order, v.label, v.owner_kind, v.state
from (values
  ('online_submission', 1, 'الإرسال على النظام',     'الموظف المختص', 'done'::wf_state),
  ('chamber_approval',  2, 'موافقة غرفة التجارة',    'غرفة التجارة',  'done'::wf_state),
  ('union_approval',    3, 'موافقة اتحاد الغرف',     'اتحاد الغرف',   'doing'::wf_state),
  ('bank_letter',       4, 'إصدار كتاب مصرف',        'المصرف التجاري', 'wait'::wf_state),
  ('company_file',      5, 'عمل إضبارة الشركة',      'مسجل الشركات',  'wait'::wf_state),
  ('specialist_officer',6, 'الموظف المختص',          'الموظف المختص', 'wait'::wf_state),
  ('sign_decision',     7, 'رفع القرار للتوقيع',     'مسجل الشركات',  'wait'::wf_state),
  ('issue_cert',        8, 'إصدار شهادة التأسيس',    'مسجل الشركات',  'wait'::wf_state)
) as v(step_key, step_order, label, owner_kind, state)
on conflict (company_id, step_key) do nothing;

-- معاملة تأسيس
insert into transactions (
  id, type, client_id, company_id, priority, status, tx_date, description, services, fee
) values (
  'c0000000-0000-4000-8000-000000000001',
  'formation',
  'a0000000-0000-4000-8000-000000000001',
  'b0000000-0000-4000-8000-000000000001',
  'high',
  'progress',
  current_date - 5,
  'تأسيس شركة ذات مسؤولية محدودة',
  array['formation', 'tax-id', 'chamber-id'],
  2500000
) on conflict (id) do nothing;

-- وديعة + محطاتها الثلاث
insert into deposits (id, company_id, tx_id, started_at)
values (
  'd0000000-0000-4000-8000-000000000001',
  'b0000000-0000-4000-8000-000000000001',
  'c0000000-0000-4000-8000-000000000001',
  current_date - 10
) on conflict (id) do nothing;

insert into deposit_stages (deposit_id, stage_key, stage_order, label, critical, state)
select
  'd0000000-0000-4000-8000-000000000001',
  v.stage_key, v.stage_order, v.label, v.critical, v.state
from (values
  ('submit',     1, 'إرسال على النظام', true,  'idle'::stage_state),
  ('advisor',    2, 'مشاور',            false, 'idle'::stage_state),
  ('accountant', 3, 'محاسب',            false, 'idle'::stage_state)
) as v(stage_key, stage_order, label, critical, state)
on conflict (deposit_id, stage_key) do nothing;

-- معاملات إضافية لأنواع مختلفة
insert into transactions (type, client_id, priority, status, tx_date, description)
select v.type, 'a0000000-0000-4000-8000-000000000001', 'medium', 'new', current_date, v.desc
from (values
  ('share-sale',   'بيع أسهم'),
  ('relocation',   'نقل مقر'),
  ('tax-id-new',   'إصدار هوية ضريبية')
) as v(type, desc)
where not exists (select 1 from transactions where type = v.type and description = v.desc);
