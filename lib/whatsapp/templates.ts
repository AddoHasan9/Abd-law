/**
 * قوالب رسائل واتساب الجاهزة — تحضيراً لأتمتة واتساب لاحقاً
 * ------------------------------------------------------------
 * دوال خالصة بلا أي اعتماد شبكي، يسهل اختبارها واستدعاؤها من أي
 * إجراء خادم عند اكتمال خطوة عمل.
 */
export type WhatsAppEventType =
  | 'company_registered'
  | 'cert_issued'
  | 'tax_id_issued'
  | 'chamber_id_issued'
  | 'importer_id_issued'
  | 'planning_id_issued'
  | 'deposit_released'
  | 'fs_submitted'

const TEMPLATES: Record<WhatsAppEventType, (companyName: string) => string> = {
  company_registered: name => `عزيزنا العميل، تم إطلاق مسار تأسيس شركة "${name}" بنجاح وبدء سير العمل الرسمي. سنوافيكم بكل مستجدة أولاً بأول.`,
  cert_issued: name => `عزيزنا العميل، تم إصدار شهادة تأسيس شركة "${name}" رسمياً. يمكنكم مراجعة المكتب لاستلام نسختكم.`,
  tax_id_issued: name => `عزيزنا العميل، تم إصدار الهوية الضريبية لشركة "${name}" بنجاح.`,
  chamber_id_issued: name => `عزيزنا العميل، تم إصدار هوية الغرفة التجارية لشركة "${name}" بنجاح.`,
  importer_id_issued: name => `عزيزنا العميل، تم إصدار هوية المستورد لشركة "${name}" بنجاح.`,
  planning_id_issued: name => `عزيزنا العميل، تم إصدار هوية التخطيط لشركة "${name}" بنجاح.`,
  deposit_released: name => `عزيزنا العميل، تم إطلاق الوديعة الرسمية لشركة "${name}" بنجاح واستكمال جميع المحطات المطلوبة.`,
  fs_submitted: name => `عزيزنا العميل، تم تقديم الحسابات الختامية لشركة "${name}" رسمياً للجهات الحكومية.`,
}

export const WHATSAPP_EVENT_LABELS: Record<WhatsAppEventType, string> = {
  company_registered: 'تسجيل الشركة',
  cert_issued: 'إصدار الشهادة',
  tax_id_issued: 'إصدار الهوية الضريبية',
  chamber_id_issued: 'إصدار هوية الغرفة التجارية',
  importer_id_issued: 'إصدار هوية المستورد',
  planning_id_issued: 'إصدار هوية التخطيط',
  deposit_released: 'إطلاق الوديعة',
  fs_submitted: 'تقديم الحسابات الختامية',
}

export function buildWhatsAppMessage(eventType: WhatsAppEventType, companyName: string): string {
  return TEMPLATES[eventType](companyName)
}
