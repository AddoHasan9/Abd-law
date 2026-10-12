-- إشعارات الهاتف الحقيقية (Web Push)

-- 1) أجهزة المستخدمين المشتركة بالإشعارات (كل متصفح/جهاز = اشتراك)
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_ok_at timestamptz
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);
alter table public.push_subscriptions enable row level security;
-- المستخدم يرى ويدير اشتراكاته فقط (الإرسال يتم بمفتاح الخادم)
create policy push_own_select on public.push_subscriptions for select to authenticated using (user_id = auth.uid());
create policy push_own_insert on public.push_subscriptions for insert to authenticated with check (user_id = auth.uid());
create policy push_own_update on public.push_subscriptions for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy push_own_delete on public.push_subscriptions for delete to authenticated using (user_id = auth.uid());
create policy app_active_account on public.push_subscriptions as restrictive for all to authenticated
  using (public.current_active_role() is not null) with check (public.current_active_role() is not null);

-- 2) متى أُرسل إشعار التطبيق كتنبيه للهاتف (null = لم يُرسل)
alter table public.notifications add column if not exists pushed_at timestamptz;
-- الإشعارات القديمة لا تُرسل دفعة واحدة عند التفعيل
update public.notifications set pushed_at = now() where pushed_at is null;

-- 3) أسرار الخادم (مفتاح VAPID الخاص وسر الجدولة) — بلا أي سياسة ⇒ لا يقرؤها إلا مفتاح الخادم
create table if not exists public.app_secrets (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table public.app_secrets enable row level security;
revoke all on public.app_secrets from anon, authenticated;
-- القيم تُدرج خارج ملف الترحيل (لا تُحفظ الأسرار في المستودع)
