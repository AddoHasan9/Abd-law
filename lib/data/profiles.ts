/**
 * استعلامات وخدمات إدارة فريق العمل والمستخدمين
 * ------------------------------------------------------------
 * مصدر الحقيقة هو جدول profiles في Supabase مع التزامن مع profiles.json.
 * يدعم التعديل الكامل، التعطيل والتفعيل، والحذف الدائم من النظام والسحابة.
 */
import { createAdminClient } from '@/lib/supabase/server'
import type { Profile, UserRole, DepartmentTask, TransactionFull } from '@/types/database'
import { readJsonFile, writeJsonFile } from '@/lib/data/fs-store'
import { listTransactions } from '@/lib/data/transactions'

export interface ProfileWithStats extends Profile {
  title?: string | null
  active_tx_count?: number
  completed_tx_count?: number
  last_login?: string | null
}

const PRIMARY_ADMIN_ID = 'db13125d-3aa1-46ab-9159-8fad18746623'

export async function listProfiles(): Promise<ProfileWithStats[]> {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true })

    const map = new Map<string, ProfileWithStats>()

    const diskProfiles = readJsonFile<ProfileWithStats[]>('profiles.json', [])
    diskProfiles.forEach(p => {
      if (p.id) {
        map.set(p.id, p)
      }
    })

    if (!error && data && data.length > 0) {
      data.forEach((p: Profile) => {
        const diskP = map.get(p.id)
        map.set(p.id, {
          ...p,
          title: p.dept || diskP?.title || 'عضو فريق',
          email: p.email || diskP?.email || `${p.id}@khazraji-law.com`,
          last_login: diskP?.last_login || null,
        })
      })
    }

    if (map.size === 0) {
      map.set(PRIMARY_ADMIN_ID, {
        id: PRIMARY_ADMIN_ID,
        name: 'منتظر الخزرجي',
        role: 'super_admin',
        dept: 'الإدارة العامة',
        title: 'مدير النظام الأعلى (Super Admin)',
        phone: '07801606600',
        email: 'addo_97@outlook.com',
        active: true,
        created_at: '2026-08-05T11:58:53.324741+00:00',
        last_login: new Date().toISOString(),
        active_tx_count: 0,
      })
    }

    const allProfiles = Array.from(map.values())

    // 1. جلب المعاملات النشطة غير المكتملة لحساب عبء العمل المباشر لكل محامي
    let activeTransactions: TransactionFull[] = []
    try {
      const txs = await listTransactions()
      activeTransactions = txs.filter(
        t => t.status !== 'completed' && t.status !== 'closed' && t.status !== 'cancelled' && t.status !== 'done'
      )
    } catch (txErr) {
      console.warn('Could not fetch active transactions for workload:', txErr)
    }

    // 2. جلب المهام الفردية غير المنتهية
    let pendingTasks: DepartmentTask[] = []
    try {
      pendingTasks = readJsonFile<DepartmentTask[]>('department_tasks.json', []).filter(
        t => t.status !== 'completed' && t.status !== 'cancelled'
      )
    } catch {}

    // 3. احتساب إجمالي عبء العمل لكل محامي ديناميكياً
    return allProfiles.map(p => {
      const pNameLower = p.name.trim().toLowerCase()
      const pFirstName = pNameLower.split(' ')[0]

      const txCount = activeTransactions.filter(t => {
        if (t.lawyer_id === p.id) return true
        if (t.profiles?.id === p.id) return true
        const assignedName = ((t as unknown as { assigned_lawyer_name?: string }).assigned_lawyer_name || t.profiles?.name || '').trim().toLowerCase()
        if (assignedName && (assignedName.includes(pFirstName) || pNameLower.includes(assignedName))) return true
        return false
      }).length

      const taskCount = pendingTasks.filter(t => {
        if (t.assigned_to === p.id) return true
        const assignedName = (t.assigned_to || '').trim().toLowerCase()
        if (assignedName && (assignedName.includes(pFirstName) || pNameLower.includes(assignedName))) return true
        return false
      }).length

      return {
        ...p,
        active_tx_count: txCount + taskCount,
      }
    })
  } catch {
    return []
  }
}

export async function getProfile(id: string): Promise<ProfileWithStats | null> {
  const profiles = await listProfiles()
  return profiles.find(p => p.id === id) || null
}

export async function saveProfile(profile: Partial<ProfileWithStats> & { name: string; role: UserRole }): Promise<ProfileWithStats> {
  const profiles = await listProfiles()
  const now = new Date().toISOString()

  let updatedProfile: ProfileWithStats

  if (profile.id) {
    const idx = profiles.findIndex(p => p.id === profile.id)
    if (idx !== -1) {
      updatedProfile = {
        ...profiles[idx],
        ...profile,
        name: profile.name.trim(),
        role: profile.role,
        dept: profile.dept ?? profiles[idx].dept ?? null,
        title: profile.title ?? profiles[idx].title ?? 'عضو فريق',
        phone: profile.phone ?? profiles[idx].phone ?? null,
        email: profile.email ?? profiles[idx].email ?? undefined,
        active: profile.active ?? profiles[idx].active ?? true,
      }
      profiles[idx] = updatedProfile
    } else {
      updatedProfile = {
        id: profile.id,
        name: profile.name.trim(),
        role: profile.role,
        dept: profile.dept || null,
        title: profile.title || 'عضو فريق',
        phone: profile.phone || null,
        email: profile.email || `${profile.name.toLowerCase()}@khazraji-law.com`,
        active: profile.active ?? true,
        created_at: now,
        last_login: now,
      }
      profiles.push(updatedProfile)
    }
  } else {
    updatedProfile = {
      id: `prof_${Date.now()}`,
      name: profile.name.trim(),
      role: profile.role,
      dept: profile.dept || null,
      title: profile.title || 'عضو فريق',
      phone: profile.phone || null,
      email: profile.email || `${profile.name.toLowerCase()}@khazraji-law.com`,
      active: profile.active ?? true,
      created_at: now,
      last_login: now,
    }
    profiles.push(updatedProfile)
  }

  writeJsonFile('profiles.json', profiles)

  // Try updating Supabase as well
  try {
    const supabase = createAdminClient()
    await supabase.from('profiles').upsert({
      id: updatedProfile.id.startsWith('prof_') ? undefined : updatedProfile.id,
      name: updatedProfile.name,
      role: updatedProfile.role,
      dept: updatedProfile.dept,
      phone: updatedProfile.phone,
      active: updatedProfile.active,
    })
  } catch (err) {
    console.warn('Supabase saveProfile notice:', err)
  }

  return updatedProfile
}

export async function toggleProfileActive(id: string): Promise<boolean> {
  const profiles = await listProfiles()
  const target = profiles.find(p => p.id === id)
  if (!target) return false

  target.active = !target.active
  writeJsonFile('profiles.json', profiles)

  try {
    const supabase = createAdminClient()
    await supabase.from('profiles').update({ active: target.active }).eq('id', id)
  } catch {}

  return target.active
}

/** Soft Delete: Deactivates user account */
export async function deleteProfile(id: string): Promise<boolean> {
  const profiles = await listProfiles()
  const target = profiles.find(p => p.id === id)
  if (!target) return false

  target.active = false
  writeJsonFile('profiles.json', profiles)

  try {
    const supabase = createAdminClient()
    await supabase.from('profiles').update({ active: false }).eq('id', id)
  } catch {}

  return true
}

/** Permanent Delete: Removes user permanently from Supabase Auth, Profiles table, and disk storage */
export async function permanentDeleteProfile(id: string): Promise<boolean> {
  if (id === PRIMARY_ADMIN_ID) {
    throw new Error('لا يمكن حذف حساب مدير النظام الرئيسي (Super Admin)')
  }

  // 1. Remove from local profiles.json
  const profiles = readJsonFile<ProfileWithStats[]>('profiles.json', [])
  const filtered = profiles.filter(p => p.id !== id)
  writeJsonFile('profiles.json', filtered)

  // 2. Unassign from active transactions to preserve relational integrity
  try {
    const diskTxs = readJsonFile<Array<Record<string, unknown>>>('transactions.json', [])
    let changed = false
    diskTxs.forEach(t => {
      if (t.lawyer_id === id) {
        t.lawyer_id = null
        changed = true
      }
    })
    if (changed) {
      writeJsonFile('transactions.json', diskTxs)
    }
  } catch {}

  // 3. Delete from Supabase profiles and Supabase Auth
  try {
    const supabase = createAdminClient()
    
    // Set lawyer_id to null on transactions
    try {
      await supabase.from('transactions').update({ lawyer_id: null }).eq('lawyer_id', id)
    } catch {}

    // Delete from profiles table
    try {
      await supabase.from('profiles').delete().eq('id', id)
    } catch (e) {
      console.warn('Supabase delete profile notice:', e)
    }

    // Delete user from Supabase Auth
    try {
      if (!id.startsWith('prof_')) {
        await supabase.auth.admin.deleteUser(id)
      }
    } catch (authErr) {
      console.warn('Supabase auth delete user notice:', authErr)
    }
  } catch (err) {
    console.warn('permanentDeleteProfile exception:', err)
  }

  return true
}
