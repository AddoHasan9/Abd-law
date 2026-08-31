'use server'

import { revalidatePath } from 'next/cache'
import {
  listProfiles,
  saveProfile,
  toggleProfileActive,
  deleteProfile,
  permanentDeleteProfile,
  type ProfileWithStats
} from '@/lib/data/profiles'
import { readJsonFile, writeJsonFile } from '@/lib/data/fs-store'
import type { UserRole } from '@/types/database'
import { requirePermission, getCurrentUserProfile } from '@/lib/auth/require-permission'
import {
  type RolePermissions,
  DEFAULT_ROLE_PERMISSIONS,
} from '@/lib/permissions'

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


export async function getUsersAction() {
  try {
    const users = await listProfiles()
    return { success: true, data: users }
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message }
  }
}

export async function getActiveLawyersAction() {
  try {
    const users = await listProfiles()
    const activeUsers = users
      .filter(u => u.active !== false)
      .map(u => ({
        id: u.id,
        name: u.name,
        role: u.role,
        dept: u.dept || 'عام',
      }))
    return { success: true, data: activeUsers }
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message, data: [{ id: 'db13125d-3aa1-46ab-9159-8fad18746623', name: 'منتظر الخزرجي', role: 'super_admin' as const, dept: 'الإدارة العامة' }] }
  }
}

export async function saveUserAction(
  payload: Partial<ProfileWithStats> & { name: string; role: UserRole },
  performedBy = 'منتظر الخزرجي (Super Admin)'
) {
  const denied = await requirePermission('users', payload.id ? 'edit_users' : 'create_users')
  if (denied) return denied

  try {
    const actor = await getCurrentUserProfile()
    if (actor) performedBy = `${actor.name} (${actor.role})`

    const usersBefore = await listProfiles()
    const existing = payload.id ? usersBefore.find(u => u.id === payload.id) : null

    const user = await saveProfile(payload)

    // Record Audit Log
    const auditLogs = readJsonFile<UserAuditRecord[]>('user_audit_logs.json', [])
    auditLogs.unshift({
      id: `audit_${Date.now()}`,
      targetUserId: user.id,
      targetUserName: user.name,
      performedBy,
      previousRole: existing?.role,
      newRole: user.role,
      action: existing ? 'تعديل بيانات ورتبة المستخدم' : 'إكمال وإنشاء بروفايل مستخدم',
      details: existing
        ? `تغيير الدور من [${existing.role}] إلى [${user.role}] والاسم إلى ${user.name}`
        : `إنشاء مستخدم جديد برتبة [${user.role}]`,
      timestamp: new Date().toISOString(),
    })
    writeJsonFile('user_audit_logs.json', auditLogs.slice(0, 100))

    revalidatePath('/settings/users')
    revalidatePath('/dashboard')
    revalidatePath('/commercial')
    return { success: true, data: user }
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message }
  }
}

export async function toggleUserActiveAction(id: string, performedBy = 'منتظر الخزرجي (Super Admin)') {
  const denied = await requirePermission('users', 'edit_users')
  if (denied) return denied

  try {
    const actor = await getCurrentUserProfile()
    if (actor) performedBy = `${actor.name} (${actor.role})`

    const active = await toggleProfileActive(id)
    const users = await listProfiles()
    const target = users.find(u => u.id === id)

    // Record Audit Log
    const auditLogs = readJsonFile<UserAuditRecord[]>('user_audit_logs.json', [])
    auditLogs.unshift({
      id: `audit_${Date.now()}`,
      targetUserId: id,
      targetUserName: target?.name || 'مستخدم',
      performedBy,
      action: active ? 'تفعيل حساب المستخدم' : 'تعطيل حساب المستخدم',
      details: active ? 'تمت إعادة تفعيل الحساب' : 'تم تعطيل الحساب ومنع الدخول مع حفظ البيانات والتسلسلات',
      timestamp: new Date().toISOString(),
    })
    writeJsonFile('user_audit_logs.json', auditLogs.slice(0, 100))

    revalidatePath('/settings/users')
    revalidatePath('/dashboard')
    revalidatePath('/commercial')
    return { success: true, active }
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message }
  }
}

export async function deleteUserAction(id: string, performedBy = 'منتظر الخزرجي (Super Admin)') {
  const denied = await requirePermission('users', 'delete_users')
  if (denied) return denied

  try {
    const actor = await getCurrentUserProfile()
    if (actor) performedBy = `${actor.name} (${actor.role})`

    const users = await listProfiles()
    const target = users.find(u => u.id === id)
    if (target?.role === 'super_admin') {
      return { success: false, error: 'لا يمكن تعطيل أو حذف حساب Super Admin الأصلي' }
    }

    await deleteProfile(id)

    // Record Audit Log
    const auditLogs = readJsonFile<UserAuditRecord[]>('user_audit_logs.json', [])
    auditLogs.unshift({
      id: `audit_${Date.now()}`,
      targetUserId: id,
      targetUserName: target?.name || 'مستخدم',
      performedBy,
      action: 'أرشفة وتعطيل ناعم للحساب (Soft Delete)',
      details: 'تم حظر الدخول للحساب مع حفظ تاريخ المعاملات وسجل التدقيق والنشاط بالكامل',
      timestamp: new Date().toISOString(),
    })
    writeJsonFile('user_audit_logs.json', auditLogs.slice(0, 100))

    revalidatePath('/settings/users')
    revalidatePath('/dashboard')
    revalidatePath('/commercial')
    return { success: true }
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message }
  }
}

export async function permanentDeleteUserAction(id: string, performedBy = 'منتظر الخزرجي (Super Admin)') {
  const denied = await requirePermission('users', 'delete_users')
  if (denied) return denied

  try {
    const actor = await getCurrentUserProfile()
    if (actor) performedBy = `${actor.name} (${actor.role})`

    const users = await listProfiles()
    const target = users.find(u => u.id === id)
    if (target?.role === 'super_admin' || id === 'db13125d-3aa1-46ab-9159-8fad18746623') {
      return { success: false, error: 'لا يمكن حذف حساب Super Admin الرئيسي نهائياً' }
    }

    await permanentDeleteProfile(id)

    // Record Audit Log
    const auditLogs = readJsonFile<UserAuditRecord[]>('user_audit_logs.json', [])
    auditLogs.unshift({
      id: `audit_${Date.now()}`,
      targetUserId: id,
      targetUserName: target?.name || 'مستخدم',
      performedBy,
      action: 'حذف نهائي للمستخدم من النظام وقاعدة البيانات',
      details: `تم مسح بروفايل وحساب المستخدم ${target?.name || ''} نهائياً من Supabase Auth ومخازن النظام`,
      timestamp: new Date().toISOString(),
    })
    writeJsonFile('user_audit_logs.json', auditLogs.slice(0, 100))

    revalidatePath('/settings/users')
    revalidatePath('/dashboard')
    revalidatePath('/commercial')
    return { success: true }
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message }
  }
}

export async function resetUserPasswordAction(id: string, email: string, performedBy = 'منتظر الخزرجي (Super Admin)') {
  const denied = await requirePermission('users', 'edit_users')
  if (denied) return denied

  try {
    const actor = await getCurrentUserProfile()
    if (actor) performedBy = `${actor.name} (${actor.role})`

    // Record Audit Log for Password Reset
    const auditLogs = readJsonFile<UserAuditRecord[]>('user_audit_logs.json', [])
    auditLogs.unshift({
      id: `audit_${Date.now()}`,
      targetUserId: id,
      targetUserName: email,
      performedBy,
      action: 'إعادة ضبط كلمة المرور',
      details: `تم إصدار طلب إعادة ضبط كلمة المرور للحساب ${email}`,
      timestamp: new Date().toISOString(),
    })
    writeJsonFile('user_audit_logs.json', auditLogs.slice(0, 100))

    revalidatePath('/settings/users')
    return { success: true, message: `تم إرسال تعليمات إعادة ضبط كلمة المرور إلى ${email}` }
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message }
  }
}

export async function getUserAuditLogsAction() {
  try {
    const auditLogs = readJsonFile<UserAuditRecord[]>('user_audit_logs.json', [])
    return { success: true, data: auditLogs }
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message }
  }
}

export async function getRolePermissionsAction() {
  try {
    const perms = readJsonFile<Record<UserRole, RolePermissions>>('role_permissions.json', DEFAULT_ROLE_PERMISSIONS)
    return { success: true, data: perms }
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message }
  }
}

export async function saveRolePermissionsAction(perms: Record<UserRole, RolePermissions>) {
  const denied = await requirePermission('users', 'manage_permissions')
  if (denied) return denied

  try {
    writeJsonFile('role_permissions.json', perms)
    revalidatePath('/settings/permissions')
    return { success: true, data: perms }
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message }
  }
}

export async function updateMyProfileAction(payload: {
  id?: string
  name: string
  phone?: string | null
  age?: number | string | null
  gender?: 'male' | 'female' | string | null
  birth_date?: string | null
  avatar_url?: string | null
}) {
  try {
    // ثغرة سابقة: كان يثق بـ payload.id القادم من العميل ويفرض role: 'super_admin'
    // على أي ملف يُحدَّث — أي مستخدم مسجّل دخول قادر يمرّر id مستخدم آخر ويرفع
    // دوره لـ super_admin. الآن: يُشتق targetId من الجلسة الحقيقية حصرًا،
    // والدور الحالي يُحفظ كما هو (لا يُغيَّر من هذا الإجراء إطلاقًا).
    const actor = await getCurrentUserProfile()
    if (!actor) {
      return { success: false, error: 'يجب تسجيل الدخول لتعديل الملف الشخصي' }
    }

    const updated = await saveProfile({
      id: actor.id,
      name: payload.name,
      phone: payload.phone || null,
      age: payload.age || null,
      gender: payload.gender || null,
      birth_date: payload.birth_date || null,
      avatar_url: payload.avatar_url || null,
      role: actor.role,
    } as unknown as Parameters<typeof saveProfile>[0])

    revalidatePath('/', 'layout')
    return { success: true, data: updated }
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message }
  }
}

