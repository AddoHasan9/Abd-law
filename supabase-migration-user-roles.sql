-- ============================================================
-- supabase-migration-user-roles.sql
-- الهجرة التفصيلية لإضافة دور super_admin و staff لقاعدة بيانات Supabase
-- آمنة وقابلة للتكرار (Idempotent & Production Safe)
-- ============================================================

-- 1. إضافة الأنماط المعدودة مأمونة الاستدعاء (Idempotent Enum Altering)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
        WHERE pg_type.typname = 'user_role' AND pg_enum.enumlabel = 'super_admin'
    ) THEN
        ALTER TYPE user_role ADD VALUE 'super_admin';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
        WHERE pg_type.typname = 'user_role' AND pg_enum.enumlabel = 'staff'
    ) THEN
        ALTER TYPE user_role ADD VALUE 'staff';
    END IF;
END $$;

-- 2. ترقية حساب (منتظر الخزرجي) إلى دور super_admin
UPDATE profiles 
SET role = 'super_admin' 
WHERE name ILIKE '%منتظر%' OR email ILIKE '%muntadhar%';

-- 3. ضمان تحديث السجل الافتراضي بحالة عدم وجوده
INSERT INTO profiles (id, name, role, dept, phone, active, created_at)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'منتظر الخزرجي',
    'super_admin',
    'إدارة النظام والعمليات',
    '07700000001',
    true,
    now()
)
ON CONFLICT (id) DO UPDATE 
SET role = 'super_admin', name = 'منتظر الخزرجي';
