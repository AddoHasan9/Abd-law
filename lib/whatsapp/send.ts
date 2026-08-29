/**
 * نقطة إرسال واتساب — بلا مزوّد خدمة حقيقي بعد
 * ------------------------------------------------------------
 * لا يوجد أي حساب WhatsApp Business API متصل بالمشروع حالياً.
 * هذه الدالة نقطة تجهيز واحدة: عند توفر مزوّد حقيقي (Meta Cloud API
 * أو Twilio)، يُستبدل الجسم هنا فقط بالنداء الفعلي — بلا أي تغيير
 * على بقية النظام (القوالب، سجل التواصل، واجهة الخيارات الثلاثة).
 */
export interface WhatsAppSendResult {
  success: boolean
  simulated: boolean
  error?: string
}

export async function sendWhatsAppMessage(phone: string, message: string, attachmentUrl?: string): Promise<WhatsAppSendResult> {
  if (!phone?.trim()) {
    return { success: false, simulated: true, error: 'رقم الهاتف غير متوفر' }
  }

  // TODO: استبدال هذا الجزء بنداء API حقيقي (Meta Cloud API / Twilio) عند توفر بيانات الاعتماد
  console.info('[WhatsApp:simulated-send]', { phone, message, attachmentUrl })

  return { success: true, simulated: true }
}
