-- قوالب مسارات سير العمل (كانت في ملف مؤقت على الخادم)
alter table public.settings add column if not exists workflow_templates jsonb;

-- حالة «متابعة التواصل» للحسابات الختامية (كانت في ذاكرة الخادم فقط)
create table if not exists public.fs_contact_statuses (
  company_id uuid not null references public.companies(id) on delete cascade,
  year integer not null,
  status text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,
  primary key (company_id, year)
);
alter table public.fs_contact_statuses enable row level security;
revoke all on public.fs_contact_statuses from anon, authenticated;
grant select on public.fs_contact_statuses to authenticated;
drop policy if exists fs_contact_read on public.fs_contact_statuses;
create policy fs_contact_read on public.fs_contact_statuses
  for select to authenticated using (public.current_active_role() is not null);
