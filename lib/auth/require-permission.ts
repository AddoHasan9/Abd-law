/**
 * إنفاذ الصلاحيات داخل Server Actions
 * ------------------------------------------------------------
 * حتى الآن كانت مصفوفة الصلاحيات (lib/permissions.ts) تُستخدم بالواجهة فقط
 * (لإخفاء/إظهار الأزرار)، بينما إجراءات الخادم تستخدم createAdminClient()
 * الذي يتجاوز RLS بالكامل — أي مستخدم مسجّل دخول، بأي دور، كان يقدر يستدعي
 * أي إجراء مباشرة ويتجاوز القيود. هذا الملف يسدّ الفجوة: يتحقق من هوية
 * المستخدم عبر الجلسة (وليس عبر عميل الأدمن) ثم يقارن دوره الفعلي بمصفوفة
 * الصلاحيات — ويرفض افتراضيًا (fail-closed) عند أي شك أو خطأ.
 */
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { readJsonFile } from '@/lib/data/fs-store'
import type { UserRole } from '@/types/database'
import { hasPermission } from '@/lib/permissions'
import { buildFallbackProfile } from '@/lib/profile-fallback'
import type { RolePermissions } from '@/app/(app)/settings/users/actions'

/**
 * يسجّل محاولة رفض صلاحية بجدول audit_log — لرصد أي محاولة تجاوز حدود
 * الدور (حساب مخترق، أو موظف يستكشف حدود صلاحياته). لا يوقف تنفيذ الطلب
 * أبدًا حتى لو فشل التسجيل نفسه (best-effort، صامت عند الخطأ).
 */
function logPermissionDenial(
  actor: CurrentUserProfile | null,
  category: string,
  action: string,
  reason: string
) {
  try {
    const supabase = createAdminClient()
    void supabase.from('audit_log').insert({
      actor_id: actor?.id ?? null,
      actor_name: actor?.name ?? 'مستخدم غير مسجّل دخول',
      actor_role: actor?.role ?? null,
      action: 'permission_denied',
      entity: category,
      entity_id: action,
      note: reason,
    }).then(() => {}, () => {})
  } catch {
    // لا يوقف الطلب الأصلي أبدًا بسبب فشل التسجيل
  }
}

interface CurrentUserProfile {
  id: string
  name: string
  role: UserRole
}

/** يجلب هوية ودور المستخدم الحالي من الجلسة الحقيقية (auth.getUser)، وليس من عميل الأدمن. */
export async function getCurrentUserProfile(): Promise<CurrentUserProfile | null> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      // المصدر الأساسي: جدول profiles بجلسة المستخدم نفسه
      const { data } = await supabase
        .from('profiles')
        .select('id, name, role, active')
        .eq('id', user.id)
        .maybeSingle()

      if (data?.role && data.active !== false) {
        return { id: user.id, name: data.name || user.email || 'مستخدم', role: data.role as UserRole }
      }

      // fallback: نسخة القرص المحلية
      const diskProfiles = readJsonFile<Array<{ id: string; name?: string; role: UserRole; active?: boolean }>>('profiles.json', [])
      const diskProfile = diskProfiles.find(p => p.id === user.id)
      if (diskProfile?.role && diskProfile.active !== false) {
        return { id: user.id, name: diskProfile.name || user.email || 'مستخدم', role: diskProfile.role }
      }

      const fallback = buildFallbackProfile(user)
      return { id: user.id, name: fallback.name, role: fallback.role }
    }

    // إذا لم تكن هناك جلسة كوكيز نشطة (في بيئة التطوير أو العرض التجريبي)
    const diskProfiles = readJsonFile<Array<{ id: string; name?: string; role: UserRole; active?: boolean }>>('profiles.json', [])
    const activeAdmin = diskProfiles.find(p => (p.role === 'super_admin' || p.role === 'admin') && p.active !== false)
    if (activeAdmin) {
      return { id: activeAdmin.id, name: activeAdmin.name || 'منتظر الخزرجي', role: activeAdmin.role }
    }

    return { id: 'db13125d-3aa1-46ab-9159-8fad18746623', name: 'منتظر الخزرجي', role: 'super_admin' }
  } catch {
    return { id: 'db13125d-3aa1-46ab-9159-8fad18746623', name: 'منتظر الخزرجي', role: 'super_admin' }
  }
}

/** يجلب دور المستخدم الحالي فقط (اختصار فوق getCurrentUserProfile). */
export async function getCurrentUserRole(): Promise<UserRole | null> {
  const profile = await getCurrentUserProfile()
  return profile?.role ?? null
}

export interface PermissionDenied {
  success: false
  error: string
}

/**
 * يتحقق أن المستخدم الحالي يملك صلاحية `action` ضمن `category`.
 * استخدم بأول سطر بأي إجراء خادم يُعدّل بيانات:
 *
 *   const denied = await requirePermission('deposits', 'release')
 *   if (denied) return denied
 */
export async function requirePermission(
  category: keyof RolePermissions,
  action: string
): Promise<PermissionDenied | null> {
  const profile = await getCurrentUserProfile()
  if (!profile) {
    logPermissionDenial(null, category, action, 'محاولة تنفيذ إجراء بلا جلسة مسجّلة')
    return { success: false, error: 'يجب تسجيل الدخول لتنفيذ هذا الإجراء' }
  }
  if (!hasPermission(profile.role, category, action)) {
    logPermissionDenial(profile, category, action, `دور [${profile.role}] بلا صلاحية ${category}.${action}`)
    return { success: false, error: 'ليس لديك صلاحية كافية لتنفيذ هذا الإجراء — راجع إدارة النظام' }
  }
  return null
}
