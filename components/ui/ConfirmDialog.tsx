'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

/**
 * نافذة تأكيد موحّدة بتصميم النظام — بديل confirm() الخاص بالمتصفح.
 *
 * الاستخدام (داخل دالة async):
 *   if (!(await confirmAction({ title: 'حذف المعاملة', message: '...', tone: 'danger' }))) return
 */
export type ConfirmTone = 'danger' | 'primary' | 'warn'

export interface ConfirmOptions {
  title: string
  message?: string
  confirmText?: string
  cancelText?: string
  tone?: ConfirmTone
  /** 'alert' = زر واحد فقط (نافذة خطأ/تنبيه) */
  mode?: 'confirm' | 'alert'
  /** أين حدث الخطأ — يظهر في النافذة ويُنسخ مع التفاصيل */
  where?: string
}

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void }

let current: Pending | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach(l => l())

/**
 * نافذة خطأ موحّدة: تظهر لكل عملية حفظ/حذف تفشل، مع مكان الخطأ وزر نسخ التفاصيل.
 */
export function showError(message: string, where?: string, title = 'تعذّر إتمام العملية'): Promise<boolean> {
  return confirmAction({ title, message, where, tone: 'danger', mode: 'alert', confirmText: 'حسناً' })
}

type ActionResult = { success?: boolean; error?: string | null } | null | undefined

/**
 * يشغّل إجراء خادم ويتحقق من نتيجته: أي فشل (نتيجة غير ناجحة أو انقطاع) يفتح نافذة الخطأ.
 * يعيد النتيجة، أو null إذا فشل الاتصال نفسه.
 */
export async function runAction<T extends ActionResult>(promise: Promise<T>, where: string): Promise<T | null> {
  try {
    const res = await promise
    if (res && res.success === false) {
      void showError(res.error || 'لم تُحفظ العملية. حاول مجدداً.', where)
    }
    return res
  } catch (e) {
    console.error(where, e)
    void showError('لم تكتمل العملية: حدث خطأ أثناء الحفظ أو انقطع الاتصال بالخادم. تحقق من الإنترنت وحاول مجدداً، وإذا تكرر انسخ التفاصيل وأرسلها للدعم.', where)
    return null
  }
}

export function confirmAction(opts: ConfirmOptions): Promise<boolean> {
  // طلب جديد أثناء وجود طلب مفتوح: نرفض القديم
  current?.resolve(false)
  return new Promise(resolve => {
    current = { ...opts, resolve }
    emit()
  })
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => { listeners.delete(l) }
}

const TONE: Record<ConfirmTone, { icon: string; ring: string; btn: string }> = {
  danger: { icon: 'delete', ring: 'bg-rose-500/12 text-rose-600 dark:text-rose-400', btn: 'bg-rose-600 hover:bg-rose-700 text-white' },
  warn: { icon: 'warning', ring: 'bg-amber-500/15 text-amber-600 dark:text-amber-400', btn: 'bg-amber-500 hover:bg-amber-600 text-white' },
  primary: { icon: 'help', ring: 'bg-[var(--accent-soft)] text-[var(--accent)]', btn: 'bg-[var(--accent)] hover:brightness-110 text-white' },
}

export function ConfirmHost() {
  const pending = useSyncExternalStore(subscribe, () => current, () => null)

  // شبكة أمان أخيرة: أي فشل غير معالَج (مثلاً انقطاع الاتصال أثناء الحفظ) يظهر في نافذة
  useEffect(() => {
    let last = 0
    const onRejection = (e: PromiseRejectionEvent) => {
      const msg = String((e.reason as Error)?.message ?? e.reason ?? '')
      if (/NEXT_REDIRECT|NEXT_NOT_FOUND|AbortError|aborted|ResizeObserver|Load failed.*chunk|ChunkLoadError/i.test(msg)) return
      const now = Date.now()
      if (now - last < 5000) return
      last = now
      void showError('حدث خطأ غير متوقع ولم تكتمل العملية. حدّث الصفحة وحاول مجدداً، وإذا تكرر انسخ التفاصيل وأرسلها للدعم.', location.pathname)
    }
    window.addEventListener('unhandledrejection', onRejection)
    return () => window.removeEventListener('unhandledrejection', onRejection)
  }, [])
  const [closing, setClosing] = useState(false)
  const confirmBtn = useRef<HTMLButtonElement>(null)
  const cancelBtn = useRef<HTMLButtonElement>(null)

  const close = (ok: boolean) => {
    if (!current) return
    const p = current
    setClosing(true)
    window.setTimeout(() => {
      if (current === p) current = null
      setClosing(false)
      p.resolve(ok)
      emit()
    }, 140)
  }

  useEffect(() => {
    if (!pending) return
    const prev = document.activeElement as HTMLElement | null
    // للحذف نركّز على «إلغاء» حتى لا يحذف Enter بالخطأ
    ;(pending.tone === 'danger' && pending.mode !== 'alert' ? cancelBtn : confirmBtn).current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); close(false) }
      if (e.key === 'Tab') {
        const a = cancelBtn.current, b = confirmBtn.current
        if (!a || !b) return
        e.preventDefault()
        ;(document.activeElement === a ? b : a).focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey); prev?.focus?.() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending])

  if (!pending) return null
  const tone = TONE[pending.tone ?? 'primary']
  const icon = pending.mode === 'alert' ? 'error' : tone.icon

  return (
    <div
      className={`confirm-veil ${closing ? 'is-closing' : ''}`}
      onMouseDown={e => { if (e.target === e.currentTarget) close(false) }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby={pending.message ? 'confirm-msg' : undefined}
        className="confirm-card"
        dir="rtl"
      >
        <div className="flex items-start gap-3">
          <span className={`w-11 h-11 rounded-2xl grid place-items-center shrink-0 ${tone.ring}`} aria-hidden>
            <span className="material-symbols-outlined text-[22px]">{icon}</span>
          </span>
          <div className="min-w-0 pt-0.5">
            <h2 id="confirm-title" className="text-[15.5px] font-extrabold text-[var(--text)] leading-snug">{pending.title}</h2>
            {pending.message && (
              <p id="confirm-msg" className="mt-1.5 text-[13px] leading-relaxed text-[var(--text-2)] whitespace-pre-line">{pending.message}</p>
            )}
            {pending.where && (
              <p className="mt-2 inline-flex items-center gap-1 text-[11.5px] font-bold text-[var(--text-3)] bg-[var(--surface-2)] rounded-lg px-2 py-1">
                <span className="material-symbols-outlined text-[14px]" aria-hidden>location_on</span>
                {pending.where}
              </p>
            )}
          </div>
        </div>
        <div className="mt-5 flex flex-col sm:flex-row sm:justify-start gap-2">
          <button ref={confirmBtn} type="button" onClick={() => close(true)} className={`h-11 sm:h-10 px-5 rounded-xl text-[13.5px] font-bold transition ${tone.btn}`}>
            {pending.confirmText ?? (pending.tone === 'danger' ? 'حذف' : 'تأكيد')}
          </button>
          {pending.mode === 'alert' ? (
            <button
              ref={cancelBtn}
              type="button"
              onClick={() => {
                const text = `${pending.title}\n${pending.message ?? ''}\nالمكان: ${pending.where ?? '—'}\nالصفحة: ${location.pathname}\nالوقت: ${new Date().toLocaleString('ar-IQ')}`
                void navigator.clipboard?.writeText(text)
                close(true)
              }}
              className="h-11 sm:h-10 px-5 rounded-xl text-[13.5px] font-bold border border-[var(--line)] text-[var(--text-2)] hover:bg-[var(--surface-2)] transition inline-flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden>content_copy</span>
              نسخ التفاصيل
            </button>
          ) : (
            <button ref={cancelBtn} type="button" onClick={() => close(false)} className="h-11 sm:h-10 px-5 rounded-xl text-[13.5px] font-bold border border-[var(--line)] text-[var(--text-2)] hover:bg-[var(--surface-2)] transition">
              {pending.cancelText ?? 'إلغاء'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
