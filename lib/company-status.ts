import type { Company } from '@/types/database'

/**
 * التعريف الموحّد لـ«شركة مؤسسة/قائمة»: أُضيفت من قسم الشركات (خارجية)،
 * أو اكتمل تأسيسها وأُطلقت وديعتها.
 * صدور الشهادة وحده لا يكفي: الشركة تبقى «قيد التأسيس» (مرحلة الوديعة) حتى إطلاق الوديعة.
 * يُستخدم حيث لا معنى للشركة قيد التأسيس: المحدودة، التحاسب الضريبي، الحسابات الختامية، سجل الشركات.
 */
export function isEstablishedCompany(c: Pick<Company, 'status' | 'external' | 'deposit_released'> & { deposit_status?: string | null }): boolean {
  return (
    c.external === true ||
    ['established', 'done', 'active', 'registered'].includes(String(c.status)) ||
    Boolean(c.deposit_released) ||
    c.deposit_status === 'released'
  )
}
