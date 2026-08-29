/**
 * صفحة مهام القسم التجاري — جدول المعاملات
 * ------------------------------------------------------------
 * تعرض كل معاملات القسم، وتُفلتر حسب النوع عبر ?type=xxx
 * القادم من فروع أنواع المعاملات في القائمة الجانبية.
 * RLS يتكفّل بأن المحامي يرى معاملاته فقط.
 */
import { listTransactions } from '@/lib/data/transactions'
import { listCompanies } from '@/lib/data/companies'
import { txType } from '@/lib/constants'
import CommercialClient from '@/components/commercial/CommercialClient'
import type { TransactionFull, Company } from '@/types/database'

export const metadata = { title: 'مهام القسم التجاري — مكتب المحامي عبد الحسن الخزرجي' }

export default async function CommercialPage(
  { searchParams }: { searchParams: Promise<{ type?: string }> }
) {
  const { type } = await searchParams

  let rows: TransactionFull[] = []
  let companies: Company[] = []
  try {
    const [txList, coList] = await Promise.all([
      listTransactions(type ? { type } : undefined),
      listCompanies(),
    ])
    rows = txList
    companies = coList
  } catch (err) {
    console.error('CommercialPage error:', err)
    rows = []
    companies = []
  }

  const heading = type ? txType(type).label : 'كل معاملات القسم التجاري'

  return <CommercialClient heading={heading} rows={rows} companies={companies} />
}
