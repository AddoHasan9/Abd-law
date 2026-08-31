-- ============================================================
-- supabase-storage.sql — دلاء التخزين وسياسات الأمان المتكاملة
-- ============================================================
-- ينشئ دلاء التخزين (documents, barcodes, avatars)
-- مع سياسات الأمان RLS المتوافقة مع مصفوفة الصلاحيات الخماسية
-- (super_admin, admin, manager, lawyer, staff)

-- 1. دلو المستندات والملفات الرسمية
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  20971520, -- 20 MB
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
) on conflict (id) do update set
  public = false,
  file_size_limit = 20971520,
  allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];

-- 2. دلو الباركود المصرفي
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'barcodes',
  'barcodes',
  true,
  10485760, -- 10 MB
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
) on conflict (id) do update set
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

-- 3. دلو الصور الشخصية والشعارات
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
) on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- ---------- سياسات الأمان لدلو المستندات (documents) ----------

drop policy if exists storage_documents_select on storage.objects;
create policy storage_documents_select on storage.objects for select to authenticated
  using (
    bucket_id = 'documents'
    and exists (
      select 1 from profiles 
      where id = auth.uid() 
      and role in ('super_admin', 'admin', 'manager', 'lawyer', 'staff')
    )
  );

drop policy if exists storage_documents_insert on storage.objects;
create policy storage_documents_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'documents'
    and exists (
      select 1 from profiles 
      where id = auth.uid() 
      and role in ('super_admin', 'admin', 'manager', 'lawyer')
    )
  );

drop policy if exists storage_documents_update on storage.objects;
create policy storage_documents_update on storage.objects for update to authenticated
  using (
    bucket_id = 'documents'
    and exists (
      select 1 from profiles 
      where id = auth.uid() 
      and role in ('super_admin', 'admin', 'manager', 'lawyer')
    )
  );

drop policy if exists storage_documents_delete on storage.objects;
create policy storage_documents_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'documents'
    and exists (
      select 1 from profiles 
      where id = auth.uid() 
      and role in ('super_admin', 'admin')
    )
  );

-- ---------- سياسات الأمان لدلو الباركود المصرفي (barcodes) ----------

drop policy if exists storage_barcodes_select on storage.objects;
create policy storage_barcodes_select on storage.objects for select to authenticated
  using (bucket_id = 'barcodes');

drop policy if exists storage_barcodes_insert on storage.objects;
create policy storage_barcodes_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'barcodes'
    and exists (
      select 1 from profiles 
      where id = auth.uid() 
      and role in ('super_admin', 'admin', 'manager', 'lawyer')
    )
  );

drop policy if exists storage_barcodes_delete on storage.objects;
create policy storage_barcodes_delete on storage.objects for delete to authenticated
  using (
    bucket_id = 'barcodes'
    and exists (
      select 1 from profiles 
      where id = auth.uid() 
      and role in ('super_admin', 'admin')
    )
  );

-- ---------- سياسات الأمان لدلو الصور الشخصية (avatars) ----------

drop policy if exists storage_avatars_select on storage.objects;
create policy storage_avatars_select on storage.objects for select to public
  using (bucket_id = 'avatars');

drop policy if exists storage_avatars_insert on storage.objects;
create policy storage_avatars_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars');

drop policy if exists storage_avatars_update on storage.objects;
create policy storage_avatars_update on storage.objects for update to authenticated
  using (bucket_id = 'avatars');

drop policy if exists storage_avatars_delete on storage.objects;
create policy storage_avatars_delete on storage.objects for delete to authenticated
  using (bucket_id = 'avatars');
