import type { Profile, UserRole } from '@/types/database'
import { hasPermission, type PermissionsMatrix, type RolePermissions } from '@/lib/permissions'

// Existing owner ID, not a mechanism for granting or recovering a role.
export const PRIMARY_ADMIN_ID = 'db13125d-3aa1-46ab-9159-8fad18746623'
export function isProtectedAccount(profile: Pick<Profile, 'id' | 'role'>): boolean {
  return profile.id === PRIMARY_ADMIN_ID || profile.role === 'super_admin'
}

/** Account administration never modifies an existing super-admin account. */
export function assertManageableAccount(
  actor: Pick<Profile, 'id' | 'role'>,
  target: Pick<Profile, 'id' | 'role'> | null,
  nextRole?: UserRole,
  matrix?: PermissionsMatrix,
): void {
  if (target && (isProtectedAccount(target) || target.id === actor.id)) {
    throw new Error('هذا الحساب محمي: لا يمكن تغيير رتبته أو تعطيله أو حذفه من إدارة المستخدمين')
  }
  if (actor.role === 'super_admin') return
  const rank: Record<UserRole, number> = { staff: 0, lawyer: 1, manager: 2, admin: 3, super_admin: 4 }
  if ((target && rank[target.role] >= rank[actor.role]) || (nextRole && rank[nextRole] >= rank[actor.role])) {
    throw new Error('لا يمكنك إدارة حساب أو منح رتبة مساوية أو أعلى من رتبتك')
  }
  // A delegated administrator cannot grant permissions they do not possess.
  for (const role of [target?.role, nextRole]) {
    if (!role) continue
    if (!matrix) throw new Error('تعذر التحقق من الصلاحيات')
    for (const category of Object.keys(matrix[role]) as Array<keyof RolePermissions>) {
      for (const action of Object.keys(matrix[role][category])) {
        if (hasPermission(role, category, action, matrix) && !hasPermission(actor.role, category, action, matrix)) {
          throw new Error('لا يمكنك منح أو إدارة صلاحيات لا تملكها')
        }
      }
    }
  }
}
