import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedProfile } from '@/lib/auth/session'
import type { PermissionDenied } from '@/lib/auth/require-permission'

/** Verify existing row access before service-role mutations; RLS supplies the row scope. */
export async function requireRecordAccess(table: string, id: string): Promise<PermissionDenied | null> {
  const denied: PermissionDenied = { success: false, error: 'السجل غير موجود أو لا تملك صلاحية الوصول إليه' }
  try {
    const actor = await getAuthenticatedProfile()
    if (!actor) return denied
    // Owner can still repair records created by the legacy local store.
    if (actor.role === 'super_admin') return null
    const client = await createClient()
    const { data, error } = await client.from(table).select('id').eq('id', id).maybeSingle()
    return !error && data ? null : denied
  } catch { return denied }
}
