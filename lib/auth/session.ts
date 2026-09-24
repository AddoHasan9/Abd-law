import { cache } from 'react'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { isUserRole } from '@/lib/permissions'
import type { Profile } from '@/types/database'

/** Only a verified Auth identity and its current database row can grant access. */
export const getAuthenticatedProfile = cache(async (): Promise<Profile | null> => {
  try {
    const client = await createClient()
    const { data: { user }, error: authError } = await client.auth.getUser()
    if (authError || !user) return null
    // This lookup only reads the verified user's ID. It avoids recursive profile RLS.
    const { data, error } = await createAdminClient().from('profiles').select('*').eq('id', user.id).maybeSingle()
    if (error || !data || data.active !== true || !isUserRole(data.role)) return null
    return { ...data, email: user.email } as Profile
  } catch {
    return null
  }
})
