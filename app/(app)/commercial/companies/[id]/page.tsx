import { notFound } from 'next/navigation'
import { getCompany360DataAction } from '@/app/(app)/commercial/companies/actions'
import { getProfile } from '@/lib/data/session'
import Company360Client from '@/components/commercial/Company360Client'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'ملف الشركة الشامل 360 — القسم التجاري',
  description: 'إدارة ملف الشركة الشامل وسير العمل والهويات والحسابات الختامية والأرشيف',
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function Company360Page({ params }: Props) {
  const { id } = await params
  const [res, profile] = await Promise.all([
    getCompany360DataAction(id),
    getProfile(),
  ])

  if (!res.success || !res.data?.company) {
    notFound()
  }

  const { company, ids, financialStatements, taxAssessments, deposit, documents, trademarks, timeline } = res.data

  return (
    <Company360Client
      company={company}
      ids={ids}
      financialStatements={financialStatements}
      taxAssessments={taxAssessments || []}
      deposit={deposit}
      documents={documents}
      trademarks={trademarks}
      timeline={timeline}
      currentUserRole={profile?.role || 'admin'}
    />
  )
}
