/**
 * نظام إدارة الصلاحيات حسب الأدوار (Role-Based Access Control - RBAC)
 * ------------------------------------------------------------
 * يمنح تعديل بيانات الشركة والمدراء والمساهمين والأتعاب والهويات
 * للأدمن ومدير النظام، بينما يقيّد باقي الأدوار (مثل المحامي) للعرض فقط.
 */
import type { Profile, UserRole } from '@/types/database'

export function canEditCompanyData(profile?: Profile | { role?: UserRole } | null): boolean {
  if (!profile) return true // Default fallback for administrative views if role omitted
  const role = profile.role
  return role === 'admin' || role === 'manager'
}

export function canManageGovernmentIDs(profile?: Profile | { role?: UserRole } | null): boolean {
  return canEditCompanyData(profile)
}

export function canManageDepositWorkflow(profile?: Profile | { role?: UserRole } | null): boolean {
  return canEditCompanyData(profile)
}

export function canAssignFinancialStatements(profile?: Profile | { role?: UserRole } | null): boolean {
  return canEditCompanyData(profile)
}
