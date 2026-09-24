import { z } from 'zod'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { getCurrentUserProfile, requirePermission, requireUserAdministration } from '@/lib/auth/require-permission'
import { readPermissions } from '@/lib/auth/permission-store'
import { assertManageableAccount } from '@/lib/auth/account-policy'
import { USER_ROLES } from '@/lib/permissions'
import type { Profile } from '@/types/database'

export interface ProfileWithStats extends Profile {
  title?: string | null
  active_tx_count?: number
  completed_tx_count?: number
  last_login?: string | null
}

const userSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(200),
  role: z.enum(USER_ROLES),
  email: z.string().trim().email().optional(),
  password: z.string().min(12, 'كلمة المرور يجب أن تكون 12 حرفاً على الأقل').max(128).optional(),
  dept: z.string().trim().max(200).nullish(),
  title: z.string().trim().max(200).nullish(),
  phone: z.string().trim().max(40).nullish(),
  active: z.boolean().default(true),
}).strict()
export type UserInput = z.input<typeof userSchema>

/** Directory queries use session RLS; Auth emails are limited to user administrators. */
export async function listProfiles(includeAuth = false): Promise<ProfileWithStats[]> {
  if (!await getCurrentUserProfile()) throw new Error('الحساب غير مخول')
  if (includeAuth) {
    const denied = await requireUserAdministration()
    if (denied) throw new Error(denied.error)
  }
  const client = includeAuth ? createAdminClient() : await createClient()
  const { data, error } = await client.from('profiles').select('*').order('created_at')
  if (error) throw new Error('تعذر تحميل المستخدمين')
  const profiles = (data || []) as ProfileWithStats[]
  if (!includeAuth) return profiles
  const authUsers = new Map<string, { email?: string; last_sign_in_at?: string }>()
  for (let page = 1; ; page++) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error('تعذر تحميل حسابات الدخول')
    data.users.forEach(u => authUsers.set(u.id, u))
    if (data.users.length < 1000) break
  }
  return profiles.map(p => ({ ...p, email: authUsers.get(p.id)?.email, last_login: authUsers.get(p.id)?.last_sign_in_at || null }))
}

export async function getProfile(id: string): Promise<ProfileWithStats | null> {
  const client = await createClient()
  const { data, error } = await client.from('profiles').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error('تعذر تحميل المستخدم')
  return data
}

export async function authorizeAccountMutation(action: string, targetId?: string, nextRole?: Profile['role']) {
  const denied = await requirePermission('users', action)
  if (denied) throw new Error(denied.error)
  const actor = await getCurrentUserProfile()
  if (!actor) throw new Error('الحساب غير مخول')
  const client = createAdminClient()
  let target: ProfileWithStats | null = null
  if (targetId) {
    z.string().uuid().parse(targetId)
    const { data, error } = await client.from('profiles').select('*').eq('id', targetId).single()
    if (error || !data) throw new Error('المستخدم غير موجود')
    target = data as ProfileWithStats
  }
  const matrix = actor.role === 'super_admin' ? undefined : (await readPermissions()).matrix
  assertManageableAccount(actor, target, nextRole, matrix)
  return { client, actor, target }
}

export async function saveProfile(input: UserInput): Promise<ProfileWithStats> {
  const payload = userSchema.parse(input)
  const { client, target } = await authorizeAccountMutation(payload.id ? 'edit_users' : 'create_users', payload.id, payload.role)
  const fields = { name: payload.name, role: payload.role, dept: payload.dept || null, title: payload.title || null, phone: payload.phone || null, active: payload.active }
  if (target) {
    // Identity/email/password are separate operations and cannot be mass-assigned.
    const { data, error } = await client.from('profiles').update(fields).eq('id', target.id).eq('role', target.role).select('*').single()
    if (error || !data) throw new Error('تعذر حفظ المستخدم أو تغيرت رتبته أثناء التعديل. أعد تحميل الصفحة')
    const { data: auth, error: authError } = await client.auth.admin.getUserById(target.id)
    if (authError) return data as ProfileWithStats
    return { ...data, email: auth.user.email } as ProfileWithStats
  }
  if (!payload.email || !payload.password) throw new Error('البريد الإلكتروني وكلمة المرور مطلوبان لإنشاء حساب دخول')
  // The DB signup trigger creates an inactive staff profile. No metadata grants a role.
  const { data: auth, error: authError } = await client.auth.admin.createUser({
    email: payload.email, password: payload.password, email_confirm: true,
    user_metadata: { full_name: payload.name },
  })
  if (authError || !auth.user) throw new Error('تعذر إنشاء حساب الدخول. تحقق من البريد وكلمة المرور وأن الحساب غير موجود مسبقاً')
  const { data, error } = await client.from('profiles').update(fields).eq('id', auth.user.id).select('*').single()
  if (error || !data) {
    const cleanup = await client.auth.admin.deleteUser(auth.user.id)
    if (cleanup.error) throw new Error('لم تكتمل إضافة المستخدم وتعذر إزالة حساب الدخول الجزئي. راجع حسابات Auth قبل إعادة المحاولة')
    throw new Error('لم تكتمل إضافة المستخدم وتم التراجع عن حساب الدخول')
  }
  return { ...data, email: auth.user.email } as ProfileWithStats
}

export async function toggleProfileActive(id: string): Promise<boolean> {
  const { client, target } = await authorizeAccountMutation('edit_users', id)
  const active = !target!.active
  const { data, error } = await client.from('profiles').update({ active }).eq('id', id)
    .eq('role', target!.role).eq('active', target!.active).select('id').single()
  if (error || !data) throw new Error('تعذر تغيير حالة الحساب. أعد تحميل الصفحة')
  return active
}

export async function deleteProfile(id: string): Promise<boolean> {
  const { client, target } = await authorizeAccountMutation('delete_users', id)
  const { data, error } = await client.from('profiles').update({ active: false }).eq('id', id).eq('role', target!.role).select('id').single()
  if (error || !data) throw new Error('تعذر تعطيل الحساب')
  return true
}

export async function permanentDeleteProfile(id: string): Promise<boolean> {
  const { client } = await authorizeAccountMutation('delete_users', id)
  // FK cascades remove the profile atomically; SET NULL retains historical records.
  // A DB trigger also protects super admins if their role changes concurrently.
  const { error } = await client.auth.admin.deleteUser(id)
  if (error) throw new Error('تعذر حذف حساب الدخول. لم يتم حذف ملفه مسبقاً أو إخفاؤه محلياً')
  return true
}

export async function resetProfilePassword(id: string, password: string) {
  z.string().min(12, 'كلمة المرور يجب أن تكون 12 حرفاً على الأقل').max(128).parse(password)
  const { client } = await authorizeAccountMutation('edit_users', id)
  const { error } = await client.auth.admin.updateUserById(id, { password })
  if (error) throw new Error('تعذر تحديث كلمة المرور')
}
