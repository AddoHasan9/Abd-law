import { cache } from 'react'
import { createAdminClient } from '@/lib/supabase/server'
import { parsePermissionsMatrix } from '@/lib/permissions'

/** Request-local memoization only: revocations apply on the next request. */
export const readPermissions = cache(async () => {
  const { data, error } = await createAdminClient().from('role_permissions')
    .select('matrix, version').eq('id', 1).single()
  if (error || !data) throw new Error('تعذر تحميل الصلاحيات. تحقق من تطبيق إعداد قاعدة بيانات الصلاحيات')
  return { matrix: parsePermissionsMatrix(data.matrix), version: Number(data.version) }
})
