import { getAuthenticatedProfile } from '@/lib/auth/session'
import { readPermissions } from '@/lib/auth/permission-store'
import { hasPermission, type RolePermissions } from '@/lib/permissions'

export const getCurrentUserProfile = getAuthenticatedProfile
export async function getCurrentUserRole() {
  return (await getAuthenticatedProfile())?.role ?? null
}
export interface PermissionDenied { success: false; error: string }

export async function requirePermission(category: keyof RolePermissions, action: string): Promise<PermissionDenied | null> {
  try {
    const profile = await getAuthenticatedProfile()
    if (!profile) return { success: false, error: 'الحساب غير مخول أو معطل. يرجى مراجعة مدير النظام' }
    // Existing super admins stay fully authorized even if the permissions table is unavailable.
    const matrix = profile.role === 'super_admin' ? undefined : (await readPermissions()).matrix
    if (!hasPermission(profile.role, category, action, matrix)) {
      return { success: false, error: 'لا تملك صلاحية تنفيذ هذه العملية' }
    }
    return null
  } catch {
    return { success: false, error: 'تعذر التحقق من الصلاحيات. لم تنفذ العملية' }
  }
}

export async function requireUserAdministration(): Promise<PermissionDenied | null> {
  for (const action of ['create_users', 'edit_users', 'delete_users', 'manage_permissions']) {
    if (!(await requirePermission('users', action))) return null
  }
  return { success: false, error: 'لا تملك صلاحية إدارة المستخدمين' }
}
