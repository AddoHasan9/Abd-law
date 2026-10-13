-- المحامي المسؤول عن التذكير: التنبيه يصل لأجهزته فقط (التذكير نفسه ظاهر للجميع)
alter table public.reminders add column if not exists assignee_id uuid references public.profiles(id) on delete set null;
create index if not exists reminders_assignee_idx on public.reminders(assignee_id);
