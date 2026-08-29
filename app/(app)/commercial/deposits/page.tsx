/**
 * صفحة إطلاق الوديعة
 * ------------------------------------------------------------
 * كل وديعة لها ثلاث محطات إالزامية: إرسال على النظام → كتاب المشاور → كتاب المحاسب.
 * تدعم الإكتمال، التراجع، وتعديل التواريخ مع احترام قواعد الشركاء الجدد.
 */
import { listDeposits } from '@/lib/data/deposits'
import DepositsClient from '@/components/commercial/DepositsClient'
import type { Deposit, DepositStage, Company } from '@/types/database'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata = { title: 'إطلاق الوديعة — مكتب المحامي عبد الحسن الخزرجي' }

type DepositFull = Deposit & {
  companies: Company | null
  deposit_stages: DepositStage[]
}

export default async function DepositsPage(
  { searchParams }: { searchParams: Promise<{ company?: string }> }
) {
  const { company: companyId } = await searchParams

  let deposits: DepositFull[] = []
  try {
    deposits = (await listDeposits()) as unknown as DepositFull[]
  } catch (err) {
    console.error('DepositsPage error:', err)
    deposits = []
  }

  return <DepositsClient deposits={deposits} companyId={companyId} />
}
