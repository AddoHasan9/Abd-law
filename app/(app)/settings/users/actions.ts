'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { listProfiles, saveProfile, toggleProfileActive, deleteProfile, permanentDeleteProfile, resetProfilePassword, type UserInput } from '@/lib/data/profiles'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { getCurrentUserProfile, requireUserAdministration, requirePermission } from '@/lib/auth/require-permission'
import { readPermissions } from '@/lib/auth/permission-store'
import { parsePermissionsMatrix, type PermissionsMatrix, type RolePermissions } from '@/lib/permissions'
import { assertManageableAccount } from '@/lib/auth/account-policy'
export type { RolePermissions }

export interface UserAuditRecord {
  id: string
  targetUserId: string
  targetUserName: string
  performedBy: string
  previousRole?: string
  newRole?: string
  action: string
  details: string
  timestamp: string
}

function failure(error: unknown) {
  return { success: false as const, error: error instanceof z.ZodError ? error.issues[0].message : error instanceof Error ? error.message : 'تعذر تنفيذ العملية' }
}
function refresh() { revalidatePath('/', 'layout') }
async function audit(targetUserId: string, action: string) {
  const actor = await getCurrentUserProfile()
  if (!actor) return
  const { error } = await createAdminClient().from('user_management_audit').insert({
    actor_id: actor.id, actor_name: actor.name, target_user_id: targetUserId, action,
  })
  if (error) console.error('User management audit write failed:', error.code)
}

export async function getUsersAction() {
  try { return { success: true as const, data: await listProfiles(true) } } catch (err) { return failure(err) }
}
export async function getActiveLawyersAction() {
  try {
    if (!await getCurrentUserProfile()) throw new Error('الحساب غير مخول')
    const client = await createClient()
    const { data, error } = await client.from('profiles').select('id, name, role, dept').eq('active', true)
    if (error) throw new Error('تعذر تحميل فريق العمل')
    return { success: true as const, data: data || [] }
  } catch (err) { return { ...failure(err), data: [] } }
}
export async function saveUserAction(payload: UserInput) {
  try {
    const user = await saveProfile(payload)
    await audit(user.id, payload.id ? 'تعديل المستخدم' : 'إنشاء حساب دخول')
    refresh()
    return { success: true as const, data: user }
  } catch (err) { return failure(err) }
}
export async function toggleUserActiveAction(id: string) {
  try {
    const active = await toggleProfileActive(id)
    await audit(id, active ? 'تفعيل الحساب' : 'تعطيل الحساب')
    refresh()
    return { success: true as const, active }
  } catch (err) { return failure(err) }
}
export async function deleteUserAction(id: string) {
  try {
    await deleteProfile(id)
    await audit(id, 'أرشفة وتعطيل الحساب')
    refresh()
    return { success: true as const }
  } catch (err) { return failure(err) }
}
export async function permanentDeleteUserAction(id: string) {
  try {
    await permanentDeleteProfile(id)
    await audit(id, 'حذف حساب الدخول')
    refresh()
    return { success: true as const }
  } catch (err) { return failure(err) }
}
export async function resetUserPasswordAction(id: string, password: string) {
  try {
    await resetProfilePassword(id, password)
    await audit(id, 'تحديث كلمة المرور')
    return { success: true as const, message: 'تم تحديث كلمة المرور بنجاح' }
  } catch (err) { return failure(err) }
}
export async function getUserAuditLogsAction() {
  const denied = await requireUserAdministration()
  if (denied) return denied
  try {
    const { data, error } = await createAdminClient().from('user_management_audit').select('*').order('created_at', { ascending: false }).limit(100)
    if (error) throw new Error('تعذر تحميل سجل إدارة المستخدمين')
    const logs: UserAuditRecord[] = (data || []).map(row => ({
      id: row.id, targetUserId: row.target_user_id, targetUserName: row.target_user_id,
      performedBy: row.actor_name, action: row.action, details: row.action, timestamp: row.created_at,
    }))
    return { success: true as const, data: logs }
  } catch (err) { return failure(err) }
}
export async function getRolePermissionsAction() {
  const denied = await requirePermission('users', 'manage_permissions')
  if (denied) return denied
  try {
    const snapshot = await readPermissions()
    return { success: true as const, data: snapshot.matrix, version: snapshot.version }
  } catch (err) { return failure(err) }
}
export async function saveRolePermissionsAction(input: PermissionsMatrix, version: number) {
  const denied = await requirePermission('users', 'manage_permissions')
  if (denied) return denied
  try {
    const actor = await getCurrentUserProfile()
    if (!actor) throw new Error('الحساب غير مخول')
    const matrix = parsePermissionsMatrix(input)
    const current = await readPermissions()
    if (!Number.isSafeInteger(version) || current.version !== version) throw new Error('الصلاحيات تغيرت بواسطة مستخدم آخر. أعد تحميل الصفحة قبل الحفظ')
    if (actor.role !== 'super_admin') {
      for (const role of Object.keys(matrix) as Array<keyof PermissionsMatrix>) {
        if (JSON.stringify(matrix[role]) === JSON.stringify(current.matrix[role])) continue
        assertManageableAccount(actor, { id: 'role-template', role }, role, matrix)
        // Compare proposed grants to the actor's CURRENT permissions, not submitted values.
        assertManageableAccount(actor, null, role, { ...matrix, [actor.role]: current.matrix[actor.role] })
      }
    }
    const { data, error } = await createAdminClient().from('role_permissions')
      .update({ matrix, version: version + 1, updated_by: actor.id, updated_at: new Date().toISOString() })
      .eq('id', 1).eq('version', version).select('version').single()
    if (error || !data) throw new Error('لم تحفظ الصلاحيات. أعد تحميل الصفحة وحاول مجدداً')
    await audit(actor.id, 'تعديل مصفوفة الصلاحيات')
    refresh()
    return { success: true as const, data: matrix, version: Number(data.version) }
  } catch (err) { return failure(err) }
}

export async function updateMyProfileAction(payload: {
  id?: string; name: string; phone?: string | null; age?: number | string | null;
  gender?: string | null; birth_date?: string | null; avatar_url?: string | null;
}) {
  try {
    const actor = await getCurrentUserProfile()
    if (!actor) throw new Error('الحساب غير مخول')
    const fields = z.object({
      name: z.string().trim().min(1).max(200), phone: z.string().max(40).nullable().optional(),
      age: z.union([z.number(), z.string()]).nullable().optional(), gender: z.enum(['male', 'female', '']).nullable().optional(),
      birth_date: z.string().nullable().optional(), avatar_url: z.string().max(2000000).nullable().optional(),
    }).parse(payload)
    // Explicit non-security fields only. Role, ID and active status never come from the browser.
    const { data, error } = await createAdminClient().from('profiles').update(fields).eq('id', actor.id).select('*').single()
    if (error || !data) throw new Error('تعذر حفظ الملف الشخصي')
    refresh()
    return { success: true as const, data }
  } catch (err) { return failure(err) }
}
