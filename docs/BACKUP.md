# النسخ الاحتياطي لقاعدة البيانات

## كيف يعمل
- كل ليلة الساعة 2:00 بتوقيت بغداد، يأخذ GitHub نسخة كاملة من قاعدة البيانات (مخطط `public`)،
  يتحقق أنها سليمة، يشفّرها بـ AES-256، ويحتفظ بها 30 يوماً.
- المكان: GitHub ← المستودع ← **Actions** ← **Nightly database backup** ← أي تشغيل ← **Artifacts**.
- للتشغيل يدوياً في أي وقت: نفس الصفحة ← **Run workflow**.

## الإعداد (مرة واحدة)
في GitHub: **Settings ← Secrets and variables ← Actions ← New repository secret**
1. `SUPABASE_DB_URL`: من Supabase ← زر **Connect** ← **Session pooler** (ليس Direct) — انسخ الرابط وضع كلمة سر قاعدة البيانات مكان `[YOUR-PASSWORD]`.
2. `BACKUP_PASSPHRASE`: كلمة سر طويلة من اختيارك. **احفظها خارج GitHub** — بدونها لا يمكن فتح أي نسخة.

## الاستعادة
```bash
# 1) فك التشفير
gpg --decrypt backup-2026-09-27.dump.gpg > db.dump
# 2) الاستعادة إلى قاعدة بيانات (مشروع Supabase جديد أو نفس المشروع)
pg_restore --no-owner --no-privileges --clean --if-exists -d "<رابط قاعدة البيانات>" db.dump
```
للاستعادة الجزئية (جدول واحد): `pg_restore --data-only -t companies -d "<الرابط>" db.dump`

## ملاحظات
- حسابات تسجيل الدخول (مخطط `auth`) لا تُنسخ؛ عددها قليل ويُعاد إنشاؤها من إدارة المستخدمين.
- ملفات مخزن الوثائق (Storage) غير مشمولة في هذه النسخة.
- فائدة جانبية: التشغيل اليومي يُبقي مشروع Supabase المجاني نشطاً، فلا يتوقف تلقائياً بسبب عدم الاستخدام.
