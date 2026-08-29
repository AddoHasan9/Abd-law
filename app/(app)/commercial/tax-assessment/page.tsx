import { listCompanies } from '@/lib/data/companies'
import { listProfiles } from '@/lib/data/profiles'
import { getTaxAssessmentsAction } from './actions'
import TaxAssessmentClient from '@/components/commercial/TaxAssessmentClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata = {
  title: 'قسم التحاسب الضريبي — مكتب المحامي عبد الحسن الخزرجي',
  description: 'متابعة التحاسب السنوي عن العقود والاستيرادات في الهيئة العامة للضرائب وإصدار براءات الذمة للشركات',
}

export default async function TaxAssessmentPage() {
  const [companies, profiles, assessmentsRes] = await Promise.all([
    listCompanies(),
    listProfiles(),
    getTaxAssessmentsAction(),
  ])

  const lawyers = profiles.map(p => ({ id: p.id, name: p.name }))

  return (
    <TaxAssessmentClient
      assessments={assessmentsRes.data || []}
      companies={companies}
      lawyers={lawyers}
    />
  )
}
