-- ============================================================
-- supabase-storage.sql — دلو المستندات
-- ============================================================
-- نفّذ بعد supabase-schema.sql

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  10485760, -- 10 MB
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
) on conflict (id) do nothing;

-- قراءة: الموظفون فقط
create policy storage_documents_select on storage.objects for select to authenticated
  using (
    bucket_id = 'documents'
    and exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'manager'))
  );

-- رفع: الموظفون فقط
create policy storage_documents_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'documents'
    and exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'manager'))
  );

-- حذف: الأدمن فقط
create policy storage_documents_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'documents'
    and exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );
