import type { Company } from '@/types/database'

/**
 * التعريف الموحّد لـ«شركة مؤسسة/قائمة»: أُضيفت من قسم الشركات (خارجية)،
 * أو اكتمل تأسيسها وأُطلقت وديعتها، أو صدرت شهادتها.
 * يُستخدم حيث لا معنى للشركة قيد التأسيس: المحدودة، التحاسب الضريبي، الحسابات الختامية، سجل الشركات.
 */
export function isEstablishedCompany(c: Pick<Company, 'status' | 'external' | 'deposit_released' | 'cert_no'> & { deposit_status?: string | null }): boolean {
  return (
    c.external === true ||
    ['established', 'done', 'active', 'registered'].includes(String(c.status)) ||
    Boolean(c.deposit_released) ||
    c.deposit_status === 'released' ||
    Boolean(c.cert_no)
  )
}
