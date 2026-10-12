-- مرفقات على مستوى الشركة: شهادة التأسيس، كتاب إطلاق الوديعة، عقد التأسيس
-- (مرفق واحد لكل نوع لكل شركة — نفس قيد التفرّد الحالي entity_type + entity_id)
alter table public.record_attachments drop constraint if exists record_attachments_entity_type_check;
alter table public.record_attachments add constraint record_attachments_entity_type_check
  check (entity_type in ('company_id', 'tax_assessment', 'company_certificate', 'deposit_letter', 'company_contract'));

-- حذف مرفقات الشركة مع حذف الشركة
drop trigger if exists companies_delete_certificate_attachment on public.companies;
create trigger companies_delete_certificate_attachment after delete on public.companies
  for each row execute function public.delete_record_attachment('company_certificate');
drop trigger if exists companies_delete_deposit_letter_attachment on public.companies;
create trigger companies_delete_deposit_letter_attachment after delete on public.companies
  for each row execute function public.delete_record_attachment('deposit_letter');
drop trigger if exists companies_delete_contract_attachment on public.companies;
create trigger companies_delete_contract_attachment after delete on public.companies
  for each row execute function public.delete_record_attachment('company_contract');
