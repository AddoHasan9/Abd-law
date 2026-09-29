import { listCompanies } from '@/lib/data/companies'
import { isEstablishedCompany } from '@/lib/company-status'
import FinancialStatementsClient from '@/components/financial-statements/FinancialStatementsClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata = {
  title: 'وحدة الحسابات الختامية (ERP System) — القسم التجاري',
  description: 'المتابعة التلقائية للميزانيات السنوية المطلوبة للشركات والغرامات وتتبع التواصل',
}

export default async function FinancialStatementsPage() {
  const allCompanies = await listCompanies()
  // تصفية الشركات لعرض الشركات المؤسسة فقط، واستبعاد الشركات قيد التأسيس من الحسابات الختامية تماماً
  const companies = allCompanies.filter(isEstablishedCompany)
  return <FinancialStatementsClient companies={companies} />
}
