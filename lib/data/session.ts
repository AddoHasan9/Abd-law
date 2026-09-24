import { createClient } from '@/lib/supabase/server'
export { getAuthenticatedProfile as getProfile } from '@/lib/auth/session'
export async function getSettings() {
  const supabase = await createClient()
  const { data } = await supabase.from('settings').select('*').eq('id', 1).single()
  return data
}
