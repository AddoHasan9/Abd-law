'use client'
/** بطاقة «تنبيهات الهاتف» — تطلب الإذن بضغطة من المستخدم وتشرح كل حالة بوضوح */
import { useState } from 'react'
import { toast } from 'sonner'
import { Icon } from '@/components/ui/Icon'
import { usePush } from '@/lib/push/usePush'

export default function PushCard() {
  const { state, busy, enable, disable, test } = usePush()
  const [error, setError] = useState<string | null>(null)

  const onEnable = async () => {
    setError(null)
    const err = await enable()
    if (err) setError(err)
    else toast.success('تم تفعيل التنبيهات على هذا الجهاز')
  }
  const onTest = async () => {
    setError(null)
    const err = await test()
    if (err) setError(err)
    else toast.success('أُرسل تنبيه تجريبي — سيظهر خلال ثوانٍ')
  }

  return (
    <section className="pc-card bx-card" aria-labelledby="pc-h">
      <div className="pc-head">
        <span className={`pc-icon${state === 'on' ? ' is-on' : ''}`} aria-hidden><Icon name="bell" className="icon" /></span>
        <div className="min-w-0">
          <h2 id="pc-h">تنبيهات الهاتف</h2>
          <p className="pc-status">
            {state === 'loading' && 'جارٍ التحقق…'}
            {state === 'on' && <><span className="pc-dot" aria-hidden />مفعّلة على هذا الجهاز</>}
            {state === 'off' && 'غير مفعّلة على هذا الجهاز'}
            {state === 'denied' && 'الإذن مرفوض من المتصفح'}
            {state === 'ios-install' && 'تحتاج خطوة على iPhone'}
            {state === 'unsupported' && 'هذا المتصفح لا يدعم التنبيهات'}
          </p>
        </div>
      </div>

      {state === 'off' && (
        <>
          <p className="pc-text">تصلك التذكيرات والمهل في موعدها بالضبط، حتى والموقع مغلق.</p>
          <button type="button" className="btn btn-primary pc-btn" onClick={onEnable} disabled={busy}>
            {busy ? 'جارٍ التفعيل…' : 'تفعيل التنبيهات'}
          </button>
        </>
      )}
      {state === 'on' && (
        <div className="pc-actions">
          <button type="button" className="btn btn-primary pc-btn" onClick={onTest} disabled={busy}>{busy ? '…' : 'تنبيه تجريبي'}</button>
          <button type="button" className="btn btn-ghost pc-btn" onClick={disable} disabled={busy}>إيقاف</button>
        </div>
      )}
      {error && <p className="pc-error" role="alert">{error}</p>}
      {state === 'denied' && (
        <p className="pc-text">افتح إعدادات المتصفح ← الإشعارات ← اسمح لهذا الموقع، ثم حدّث الصفحة.</p>
      )}
      {state === 'ios-install' && (
        <ol className="pc-steps">
          <li>اضغط زر <b>المشاركة</b> في Safari.</li>
          <li>اختر <b>«إضافة إلى الشاشة الرئيسية»</b>.</li>
          <li>افتح الموقع من أيقونته الجديدة وفعّل التنبيهات من هنا.</li>
        </ol>
      )}
      {state === 'unsupported' && (
        <p className="pc-text">جرّب Chrome أو Edge على الحاسبة/أندرويد، أو Safari على iPhone بعد إضافته للشاشة الرئيسية.</p>
      )}
    </section>
  )
}
