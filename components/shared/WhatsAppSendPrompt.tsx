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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', background: 'var(--ok-soft)', border: '1px solid var(--ok)', borderRadius: 'var(--r-md)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Icon name="check" style={{ color: 'var(--ok)' }} />
        <span style={{ fontWeight: 700, color: 'var(--ok)', fontSize: '13.5px' }}>تم الحفظ بنجاح</span>
      </div>

      <p style={{ fontSize: '12.5px', color: 'var(--text-2)', margin: 0 }}>
        هل تريد إشعار العميل عبر واتساب بهذا الإجراء؟
      </p>

      {error && <div className="login-err" style={{ marginBottom: 0 }}>{error}</div>}

      {showAttachInput && (
        <div className="field" style={{ marginBottom: 0 }}>
          <label style={{ fontSize: '11.5px' }}>رابط أو مرجع المستند المرفق</label>
          <input
            type="text"
            className="input"
            value={attachmentUrl}
            onChange={e => setAttachmentUrl(e.target.value)}
            placeholder="رابط المستند أو اسمه..."
          />
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button type="button" className="btn btn-ghost" disabled={loading !== null} onClick={onDone}>
          {loading === 'save' ? '...' : 'حفظ فقط'}
        </button>
        <button type="button" className="btn btn-primary" disabled={loading !== null} onClick={() => handleSend(false)}>
          {loading === 'send' ? 'جاري الإرسال...' : 'حفظ + إرسال واتساب'}
        </button>
        {showAttachInput ? (
          <button type="button" className="btn btn-go" disabled={loading !== null} onClick={() => handleSend(true)}>
            {loading === 'attach' ? 'جاري الإرسال...' : 'إرسال مع المرفق'}
          </button>
        ) : (
          <button type="button" className="btn btn-go" disabled={loading !== null} onClick={() => setShowAttachInput(true)}>
            حفظ + إرسال + إرفاق مستند
          </button>
        )}
      </div>
    </div>
  )
}
