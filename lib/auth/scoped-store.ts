import { getAuthenticatedProfile } from '@/lib/auth/session'
import { readJsonFile } from '@/lib/data/fs-store'

/** Local caches have no row-level authorization. Never merge them into ordinary users' results. */
export async function readAuthorizedJsonFile<T>(filename: string, defaultValue: T): Promise<T> {
  const actor = await getAuthenticatedProfile()
  return actor?.role === 'super_admin' ? readJsonFile(filename, defaultValue) : defaultValue
}
