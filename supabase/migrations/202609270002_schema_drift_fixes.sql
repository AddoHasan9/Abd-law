-- أعمدة يكتبها التطبيق لكنها لم تكن موجودة (كانت عمليات الحفظ تفشل بصمت)
alter table public.reminders add column if not exists notes text;
alter table public.reminders add column if not exists priority text not null default 'medium';
alter table public.reminders add column if not exists due_time text;
alter table public.reminders add column if not exists is_completed boolean not null default false;
alter table public.reminders add column if not exists is_archived boolean not null default false;
alter table public.reminders add column if not exists alert_sent boolean not null default false;
alter table public.financial_statements add column if not exists date_submitted_tax date;
alter table public.financial_statements add column if not exists date_submitted_registrar date;
alter table public.deposits add column if not exists status text not null default 'active';
alter table public.deposit_stages add column if not exists notes text;
alter table public.companies add column if not exists barcode_url text;
alter table public.transactions add column if not exists buyer_name text;
alter table public.transactions add column if not exists seller_name text;
alter table public.transactions add column if not exists capital_before bigint;
alter table public.transactions add column if not exists capital_after bigint;

-- المشغّل القديم لمراحل الوديعة كان يتعارض مع المراحل الأربع التي يضيفها التطبيق
create or replace function public.after_deposit_insert()
returns trigger language plpgsql set search_path = '' as $$
begin
  return new;
end $$;
