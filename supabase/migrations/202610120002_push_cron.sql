-- جدولة تنبيهات الهاتف: كل 5 دقائق تستدعي /api/push/dispatch على الموقع المنشور.
-- السرّ يُقرأ من app_secrets (لا يُحفظ في المستودع).
create extension if not exists pg_net;
create extension if not exists pg_cron;

select cron.unschedule('push-dispatch') where exists (select 1 from cron.job where jobname = 'push-dispatch');
select cron.schedule(
  'push-dispatch',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://lawyer-office-lexl.vercel.app/api/push/dispatch',
    headers := jsonb_build_object('content-type', 'application/json',
      'x-push-secret', (select value from public.app_secrets where key = 'push_cron_secret')),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $$
);
