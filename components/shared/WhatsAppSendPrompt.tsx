'use client'

import { useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { sendCompanyWhatsAppAction } from '@/app/(app)/commercial/comms/actions'
import type { WhatsAppEventType } from '@/lib/whatsapp/templates'

interface Props {
  companyId: string
  companyName: string
  phone?: string | null
  eventType: WhatsAppEventType
  /** يُستدعى بعد أي خيار من الخيارات الثلاثة (حفظ فقط أو حفظ+إرسال) */
  onDone: () => void
}

/**
 * لوحة الخيارات الثلاثة بعد اكتمال أي خطوة عمل: حفظ فقط، حفظ + إرسال
 * واتساب، أو حفظ + إرسال + إرفاق مستند. تُستعمل بعد نجاح أي إجراء
 * (إصدار هوية، إكمال خطوة سير عمل، إطلاق وديعة...) بنفس النمط في كل مكان.
 */
export default function WhatsAppSendPrompt({ companyId, companyName, phone, eventType, onDone }: Props) {
  const [loading, setLoading] = useState<'save' | 'send' | 'attach' | null>(null)
  const [showAttachInput, setShowAttachInput] = useState(false)
  const [attachmentUrl, setAttachmentUrl] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSend = async (withAttachment: boolean) => {
    setLoading(withAttachment ? 'attach' : 'send')
    setError(null)
    const res = await sendCompanyWhatsAppAction({
      company_id: companyId,
      company_name: companyName,
      phone,
      event_type: eventType,
      attachment_url: withAttachment ? attachmentUrl.trim() || undefined : undefined,
    })
    setLoading(null)
    if (res.success) {
      onDone()
    } else {
      setError(res.error || 'تعذر إرسال رسالة واتساب')
    }
  }

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl bg-success-soft/30 border border-success/30 text-right animate-fade-in" dir="rtl">
      <div className="flex items-center gap-2 text-success font-bold text-sm">
        <Icon name="check" className="w-4 h-4 text-success" />
        <span>تم الحفظ بنجاح</span>
      </div>

      <p className="text-xs text-text-2 leading-relaxed">
        هل تريد إشعار العميل عبر واتساب بهذا الإجراء؟
      </p>

      {error && (
        <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/25 text-destructive text-xs font-bold">
          {error}
        </div>
      )}

      {showAttachInput && (
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-text-3">رابط أو مرجع المستند المرفق</label>
          <input
            type="text"
            className="flex h-9 w-full rounded-lg bg-surface border border-border px-3 text-xs font-medium text-text placeholder:text-text-3 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            value={attachmentUrl}
            onChange={e => setAttachmentUrl(e.target.value)}
            placeholder="رابط المستند أو اسمه..."
          />
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap pt-1">
        <button
          type="button"
          className="h-8 px-3 rounded-lg text-xs font-bold text-text-2 bg-surface-2 hover:bg-surface-3 transition-colors cursor-pointer disabled:opacity-50"
          disabled={loading !== null}
          onClick={onDone}
        >
          {loading === 'save' ? '...' : 'حفظ فقط'}
        </button>
        <button
          type="button"
          className="h-8 px-3.5 rounded-lg text-xs font-bold text-white bg-primary hover:bg-primary/90 shadow-xs transition-all cursor-pointer disabled:opacity-50"
          disabled={loading !== null}
          onClick={() => handleSend(false)}
        >
          {loading === 'send' ? 'جارٍ الإرسال…' : 'حفظ + إرسال واتساب'}
        </button>
        {showAttachInput ? (
          <button
            type="button"
            className="h-8 px-3.5 rounded-lg text-xs font-bold text-white bg-success hover:bg-success/90 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            disabled={loading !== null}
            onClick={() => handleSend(true)}
          >
            {loading === 'attach' ? 'جارٍ الإرسال…' : 'إرسال مع المرفق'}
          </button>
        ) : (
          <button
            type="button"
            className="h-8 px-3.5 rounded-lg text-xs font-bold text-white bg-success hover:bg-success/90 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            disabled={loading !== null}
            onClick={() => setShowAttachInput(true)}
          >
            حفظ + إرسال + إرفاق مستند
          </button>
        )}
      </div>
    </div>
  )
}
