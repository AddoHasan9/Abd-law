# Supabase — إعداد قاعدة البيانات

## المتطلبات

1. مشروع [Supabase](https://supabase.com) جديد أو موجود
2. نسخ `.env.local.example` إلى `.env.local` وملء المفاتيح من:
   **Project Settings → API**

| المتغير | المصدر |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / public key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key (سرّي — لا يُعرض في المتصفح) |

## تنفيذ SQL (بالترتيب)

في **Supabase Dashboard → SQL Editor**، نفّذ الملفات بالترتيب:

### 1. `supabase-schema.sql`

ينشئ الجداول، الدوال، المحفّزات، وسياسات RLS.

### 2. `supabase-seed.sql` *(اختياري)*

بيانات تجريبية للاختبار المحلي.

### 3. `supabase-storage.sql`

دلو التخزين للمستندات وسياسات الوصول.

## إنشاء أول مستخدم (أدمن)

1. **Authentication → Users → Add user** — أدخل البريد وكلمة المرور
2. في **SQL Editor**، حدّث دوره:

```sql
update profiles
set role = 'admin', name = 'مدير النظام'
where id = (select id from auth.users where email = 'your@email.com');
```

> المحفّز `on_auth_user_created` ينشئ صف `profiles` تلقائياً بدور `lawyer`.
> غيّر الدور يدوياً للأدمن الأول فقط.

## توليد أنواع TypeScript

بعد أي تعديل على المخطط:

```bash
# ثبّت CLI مرة واحدة
npm install -g supabase

# سجّل الدخول واربط المشروع
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# ولّد الأنواع
npm run types
```

أو مباشرة:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/database.ts
```

## التحقق

```bash
npm install
npm run dev
```

- `/login` — تسجيل الدخول
- `/dashboard` — لوحة التحكم
- `/commercial/companies` — الشركات (يتطلب بيانات)
- `/commercial/deposits?company=UUID` — وديعة شركة محددة

## استكشاف الأخطاء

| المشكلة | الحل |
|---|---|
| `Invalid API key` | راجع `.env.local` وأعد تشغيل `npm run dev` |
| جداول فارغة | نفّذ `supabase-seed.sql` |
| المحامي لا يرى معاملاته | تأكد أن `lawyer_id` في `transactions` = `auth.uid()` |
| `company_submitted` غير موجود | أعد تنفيذ `supabase-schema.sql` |

## الأمان

- **RLS مفعّل** على كل الجداول — لا تعطّله
- **service_role** للـ Route Handlers فقط (`lib/supabase/admin.ts`)
- الدور الافتراضي للمستخدم الجديد: `lawyer` (أقل صلاحية)
