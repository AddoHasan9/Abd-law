import { listCompanies } from '@/lib/data/companies'
import CompaniesRegistryClient from '@/components/commercial/CompaniesRegistryClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata = {
  title: 'قسم الشركات — دليل وسجل الشركات المتأسسة',
  description: 'إدارة وإضافة بيانات الشركات المتأسسة والمسجلة بكافة تفاصيلها الرسمية والمساهمين والمديرين',
}

export default async function CompaniesRegistryPage() {
  const allCompanies = await listCompanies()

  // قسم الشركات يضم فقط الشركات المتأسسة والمنجزة بالكامل (التي تم إطلاق وديعتها أو تم إدراجها كشركة متأسسة مباشرة)
  // الشركات قيد التأسيس لا تظهر هنا إطلاقاً حتى يتم إطلاق وديعتها
  const establishedCompanies = allCompanies.filter(c => {
    return (
      c.status === 'established' ||
      c.status === 'done' ||
      c.deposit_released === true ||
      c.deposit_status === 'released' ||
      c.external === true
    )
  })

  return <CompaniesRegistryClient companies={establishedCompanies} />
}
