/**
 * نظام تحقق إنفاذ الصلاحيات والأذونات الخماسي (5-Level Role & Permissions Enforcement)
 * ------------------------------------------------------------
 * يغطي الأدوار الـ 5: Super Admin, Admin, Manager, Lawyer, Staff
 * يقرأ مصفوفة الصلاحيات المخصصة في role_permissions.json
 */
import type { UserRole } from '@/types/database'
import type { RolePermissions } from '@/app/(app)/settings/users/actions'

const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  super_admin: {
    companies: { view: true, create: true, edit: true, delete: true },
    transactions: { view: true, create: true, edit: true, delete: true, close: true },
    government_ids: { view: true, create: true, renew: true, delete: true },
    financial_statements: { view: true, create: true, submit: true, delete: true },
    deposits: { view: true, create: true, release: true },
    reports: { view: true, export: true },
    notifications: { view: true, dismiss: true },
    users: { create_users: true, edit_users: true, delete_users: true, manage_permissions: true },
  },
  admin: {
    companies: { view: true, create: true, edit: true, delete: true },
    transactions: { view: true, create: true, edit: true, delete: true, close: true },
    government_ids: { view: true, create: true, renew: true, delete: true },
    financial_statements: { view: true, create: true, submit: true, delete: true },
    deposits: { view: true, create: true, release: true },
    reports: { view: true, export: true },
    notifications: { view: true, dismiss: true },
    users: { create_users: false, edit_users: false, delete_users: false, manage_permissions: false },
  },
  manager: {
    companies: { view: true, create: true, edit: true, delete: false },
    transactions: { view: true, create: true, edit: true, delete: false, close: true },
    government_ids: { view: true, create: true, renew: true, delete: false },
    financial_statements: { view: true, create: true, submit: true, delete: false },
    deposits: { view: true, create: true, release: true },
    reports: { view: true, export: true },
    notifications: { view: true, dismiss: true },
    users: { create_users: false, edit_users: false, delete_users: false, manage_permissions: false },
  },
  lawyer: {
    companies: { view: true, create: true, edit: true, delete: false },
    transactions: { view: true, create: true, edit: true, delete: false, close: true },
    government_ids: { view: true, create: true, renew: true, delete: false },
    financial_statements: { view: true, create: true, submit: false, delete: false },
    deposits: { view: true, create: false, release: false },
    reports: { view: true, export: false },
    notifications: { view: true, dismiss: true },
    users: { create_users: false, edit_users: false, delete_users: false, manage_permissions: false },
  },
  staff: {
    companies: { view: true, create: false, edit: false, delete: false },
    transactions: { view: true, create: false, edit: false, delete: false, close: false },
    government_ids: { view: true, create: false, renew: false, delete: false },
    financial_statements: { view: true, create: false, submit: false, delete: false },
    deposits: { view: true, create: false, release: false },
    reports: { view: true, export: false },
    notifications: { view: true, dismiss: true },
    users: { create_users: false, edit_users: false, delete_users: false, manage_permissions: false },
  },
}

export function getRolePermissionsMatrix(): Record<UserRole, RolePermissions> {
  return DEFAULT_ROLE_PERMISSIONS
}

export function hasPermission(
  role: UserRole | undefined | null,
  category: keyof RolePermissions,
  action: string
): boolean {
  if (!role) return false
  if (role === 'super_admin') return true

  const matrix = getRolePermissionsMatrix()
  const rolePerms = matrix[role] || DEFAULT_ROLE_PERMISSIONS[role]
  if (!rolePerms) return false

  const catObj = rolePerms[category] as Record<string, boolean> | undefined
  if (!catObj) return false

  return Boolean(catObj[action])
}
