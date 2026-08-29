import { listCompanies } from '@/lib/data/companies'
import IDsClient from '@/components/commercial/IDsClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata = {
  title: 'وحدة الهويات والرقيمات — القسم التجاري',
  description: 'إصدار ومتابعة هويات المستورد والضريبة والتخطيط والغرفة التجارية للشركات',
}

export default async function CommercialIDsPage() {
  const companies = await listCompanies()
  return <IDsClient companies={companies} />
}
