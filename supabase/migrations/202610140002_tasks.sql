-- قسم المهام: مراجعات الدوائر والأعمال الميدانية والمهام العامة
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 300),
  agency text,                                   -- الدائرة / الجهة (مثلاً وزارة الخارجية)
  notes text,
  task_date date,
  task_time time,
  priority text not null default 'normal' check (priority in ('normal', 'urgent')),
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  company_id uuid references public.companies(id) on delete set null,  -- شركة من النظام (اختياري)
  company_name text,                             -- أو اسم شركة مكتوب يدوياً (اختياري)
  assignee_id uuid references public.profiles(id) on delete set null,
  owner_id uuid references public.profiles(id) on delete set null,
  checklist jsonb not null default '[]'::jsonb,  -- [{ "text": "...", "done": false }]
  remind_before integer check (remind_before is null or remind_before between 0 and 10080), -- دقائق قبل الموعد
  result_notes text,                             -- نتيجة المراجعة بعد الإنجاز
  done_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tasks_date_idx on public.tasks(task_date);
create index if not exists tasks_status_idx on public.tasks(status);
create index if not exists tasks_assignee_idx on public.tasks(assignee_id);

alter table public.tasks enable row level security;
drop policy if exists tasks_staff_select on public.tasks;
create policy tasks_staff_select on public.tasks for select to authenticated using (public.is_staff());

-- تذكير المهمة يمرّ عبر نظام التذكيرات (إرسال بالدقيقة، صوت، تم/إيقاف)
alter table public.reminders add column if not exists task_id uuid references public.tasks(id) on delete cascade;
create unique index if not exists reminders_task_uidx on public.reminders(task_id) where task_id is not null;
