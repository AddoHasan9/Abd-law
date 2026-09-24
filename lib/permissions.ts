/**
 * نظام تحقق إنفاذ الصلاحيات والأذونات الخماسي (5-Level Role & Permissions Enforcement)
 * ------------------------------------------------------------
 * يغطي الأدوار الـ 5: Super Admin, Admin, Manager, Lawyer, Staff
 * يقيّم مصفوفة الصلاحيات الموثوقة القادمة من الخادم
 */
import type { UserRole } from '@/types/database'

export interface RolePermissions {
  companies: { view: boolean; create: boolean; edit: boolean; delete: boolean }
  transactions: { view: boolean; create: boolean; edit: boolean; delete: boolean; close: boolean }
  government_ids: { view: boolean; create: boolean; renew: boolean; delete: boolean }
  financial_statements: { view: boolean; create: boolean; submit: boolean; delete: boolean }
  deposits: { view: boolean; create: boolean; release: boolean }
  reports: { view: boolean; export: boolean }
  notifications: { view: boolean; dismiss: boolean }
  users: { create_users: boolean; edit_users: boolean; delete_users: boolean; manage_permissions: boolean }
}

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
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

export type PermissionsMatrix = Record<UserRole, RolePermissions>
export const USER_ROLES = ['super_admin', 'admin', 'manager', 'lawyer', 'staff'] as const

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && USER_ROLES.some(role => role === value)
}

/** Unknown roles/actions fail closed; super admin retains every known permission. */
export function hasPermission(
  role: UserRole | undefined | null,
  category: keyof RolePermissions,
  action: string,
  matrix: PermissionsMatrix = DEFAULT_ROLE_PERMISSIONS,
): boolean {
  if (!isUserRole(role)) return false
  const actions = DEFAULT_ROLE_PERMISSIONS.super_admin[category]
  if (!actions || !Object.hasOwn(actions, action)) return false
  if (role === 'super_admin') return true
  const permissions = matrix[role]?.[category] as Record<string, boolean> | undefined
  return permissions?.[action] === true
}

/** Validate every field; never merge missing fields with permissive defaults. */
export function parsePermissionsMatrix(input: unknown): PermissionsMatrix {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('مصفوفة الصلاحيات غير صالحة')
  const source = input as Record<string, unknown>
  const result = structuredClone(DEFAULT_ROLE_PERMISSIONS)
  for (const role of USER_ROLES) {
    const roleData = source[role] as Record<string, unknown> | undefined
    if (!roleData || typeof roleData !== 'object') throw new Error('دور مفقود في مصفوفة الصلاحيات')
    for (const category of Object.keys(result[role]) as Array<keyof RolePermissions>) {
      const fields = roleData[category] as Record<string, unknown> | undefined
      if (!fields || typeof fields !== 'object') throw new Error('قسم مفقود في مصفوفة الصلاحيات')
      for (const action of Object.keys(result[role][category])) {
        if (typeof fields[action] !== 'boolean') throw new Error('قيمة الصلاحية يجب أن تكون نعم أو لا')
        // Super-admin privileges cannot be revoked through the editor or a forged request.
        ;(result[role][category] as Record<string, boolean>)[action] = role === 'super_admin' || fields[action] === true
      }
    }
  }
  return result
}

export function emptyPermissionsMatrix(): PermissionsMatrix {
  const result = structuredClone(DEFAULT_ROLE_PERMISSIONS)
  for (const role of USER_ROLES) for (const actions of Object.values(result[role])) {
    for (const key of Object.keys(actions)) (actions as Record<string, boolean>)[key] = role === 'super_admin'
  }
  return result
}
