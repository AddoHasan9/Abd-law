/**
 * صفحة تأسيس الشركات
 * ------------------------------------------------------------
 * تعرض كل الشركات مع مخطط سير العمل ورقم المهمة وحالة التقدّم.
 * الغرامة لا تظهر هنا — التأسيس مرحلة سابقة للمهلة.
 */
import { listCompanies } from '@/lib/data/companies'
import CompaniesClient from '@/components/commercial/CompaniesClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata = { title: 'تأسيس الشركات — مكتب المحامي عبد الحسن الخزرجي' }

export default async function CompaniesPage() {
  let companies: Awaited<ReturnType<typeof listCompanies>> = []
  try {
    companies = await listCompanies()
  } catch (err) {
    console.error('CompaniesPage error:', err)
    companies = []
  }

  // «تأسيس الشركات» للشركات التي يؤسسها المكتب فقط.
  // الشركات القائمة المضافة من قسم الشركات (external) مكانها قسم الشركات وحده.
  return <CompaniesClient initialCompanies={companies.filter(c => !c.external)} />
}
