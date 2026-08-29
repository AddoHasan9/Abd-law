-- ============================================================
-- Supabase Migration: 20260807233600_add_super_admin_and_staff_roles.sql
-- Update user_role Enum & Promote منتظر الخزرجي to super_admin
-- ============================================================

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

-- Promote منتظر الخزرجي to super_admin
UPDATE profiles 
SET role = 'super_admin' 
WHERE name ILIKE '%منتظر%' OR email ILIKE '%muntadhar%';
