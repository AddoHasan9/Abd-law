-- ============================================================
-- SQL Migration: Companies Registry & LLC Enhancements
-- ============================================================
-- نفّذ هذا السكربت في Supabase SQL Editor لإضافة أعمدة
-- رقم مسجل الشركات ورقم الهيئة العامة للضرائب على جدول الشركات.

alter table companies
  add column if not exists registrar_no text,
  add column if not exists tax_no text;

create index if not exists companies_registrar_no_idx on companies (registrar_no);
create index if not exists companies_tax_no_idx on companies (tax_no);
