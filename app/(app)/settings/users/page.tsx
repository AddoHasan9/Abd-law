import { redirect } from 'next/navigation'
import { requireUserAdministration } from '@/lib/auth/require-permission'
import UsersClient from '@/components/settings/UsersClient'
import { listProfiles } from '@/lib/data/profiles'

export const metadata = { title: 'المستخدمون وفريق العمل — مكتب المحامي عبد الحسن الخزرجي' }
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function SettingsUsersPage() {
  // فحص على الخادم حسب مصفوفة الصلاحيات — كتابة الرابط يدوياً لا تكفي للدخول
  const denied = await requireUserAdministration()
  if (denied) redirect('/dashboard')
  const profiles = await listProfiles(true)

  return <UsersClient initialProfiles={profiles} />
}
