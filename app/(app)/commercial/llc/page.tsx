import { listTransactions } from '@/lib/data/transactions'
import { listCompanies } from '@/lib/data/companies'
import LLCClient from '@/components/commercial/LLCClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata = {
  title: 'قسم المحدودة — معاملات الشركات المحدودة',
  description: 'إدارة ومتابعة كافة معاملات الشركات المحدودة: زيادة رأس المال، بيع الأسهم، تصديق الأوراق، استمرار التعيين، النشاط، نقل المقر، والحسابات الختامية',
}

export default async function LLCPage() {
  const [transactions, companies] = await Promise.all([
    listTransactions(),
    listCompanies(),
  ])

  return <LLCClient transactions={transactions} companies={companies} />
}
