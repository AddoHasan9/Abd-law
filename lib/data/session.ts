/**
 * جلسة المستخدم وصلاحياته — للمكوّنات الخادمية
 */
import { createClient } from '@/lib/supabase/server'
import { buildFallbackProfile } from '@/lib/profile-fallback'
import type { Profile } from '@/types/database'

/** الملف الشخصي للمستخدم الحالي، أو null إن لم يسجّل دخوله */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (data) {
    return {
      ...(data as Profile),
      email: user.email,
    }
  }

  return buildFallbackProfile(user)
}

/** الإعدادات العامة (صف واحد) */
export async function getSettings() {
  const supabase = await createClient()
  const { data } = await supabase.from('settings').select('*').eq('id', 1).single()
  return data
}
