-- مرفقات اختيارية للسجلات (صورة الهوية، باركود/صورة التحاسب) داخل قاعدة البيانات لتدخل في النسخة الاحتياطية الليلية
create table if not exists public.record_attachments (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('company_id', 'tax_assessment')),
  entity_id uuid not null,
  file_name text not null,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 5242880),
  data_url text not null,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (entity_type, entity_id)
);
create index if not exists record_attachments_entity_idx on public.record_attachments (entity_type, entity_id);
alter table public.record_attachments enable row level security;
create policy app_active_account on public.record_attachments as restrictive for all to authenticated
  using (public.current_active_role() is not null) with check (public.current_active_role() is not null);
create or replace function public.delete_record_attachment() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from public.record_attachments where entity_type = tg_argv[0] and entity_id = old.id;
  return old;
end $$;
drop trigger if exists company_ids_delete_attachment on public.company_ids;
create trigger company_ids_delete_attachment after delete on public.company_ids
  for each row execute function public.delete_record_attachment('company_id');
drop trigger if exists tax_assessments_delete_attachment on public.tax_assessments;
create trigger tax_assessments_delete_attachment after delete on public.tax_assessments
  for each row execute function public.delete_record_attachment('tax_assessment');
revoke execute on function public.delete_record_attachment() from public, anon, authenticated;
