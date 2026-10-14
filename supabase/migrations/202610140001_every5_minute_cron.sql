-- تكرار «كل 5 دقائق حتى يُوقَف» + فحص التذكيرات كل دقيقة (دقة الموعد)
alter table public.reminders drop constraint if exists reminders_repeat_check;
alter table public.reminders add constraint reminders_repeat_check
  check (repeat in ('none', 'every5', 'daily', 'weekdays', 'weekly', 'monthly', 'yearly'));
select cron.alter_job((select jobid from cron.job where jobname = 'push-dispatch'), schedule := '* * * * *');
