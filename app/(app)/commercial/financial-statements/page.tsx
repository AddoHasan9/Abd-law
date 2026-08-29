import { listCompanies } from '@/lib/data/companies'
import FinancialStatementsClient from '@/components/financial-statements/FinancialStatementsClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata = {
  title: 'وحدة الحسابات الختامية (ERP System) — القسم التجاري',
  description: 'المتابعة التلقائية للميزانيات السنوية المطلوبة للشركات والغرامات وتتبع التواصل',
}

export default async function FinancialStatementsPage() {
  const companies = await listCompanies()
  return <FinancialStatementsClient companies={companies} />
}
