-- تكرار التذكيرات: مرة واحدة / يومياً / أيام الدوام (الأحد–الخميس) / أسبوعياً / شهرياً / سنوياً
alter table public.reminders add column if not exists repeat text not null default 'none';
alter table public.reminders drop constraint if exists reminders_repeat_check;
alter table public.reminders add constraint reminders_repeat_check
  check (repeat in ('none', 'daily', 'weekdays', 'weekly', 'monthly', 'yearly'));
-- آخر مرة أُرسل فيها تنبيه (للمتكرر: الموعد ينتقل للتالي، وهذا يحفظ آخر إرسال)
alter table public.reminders add column if not exists last_alert_at timestamptz;
