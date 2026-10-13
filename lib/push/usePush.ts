'use client'
import { useCallback, useEffect, useState } from 'react'
import { VAPID_PUBLIC_KEY } from './config'
import { savePushSubscription, removePushSubscription, sendTestPush } from '@/app/(app)/notifications/push-actions'

export type PushState = 'loading' | 'unsupported' | 'ios-install' | 'denied' | 'off' | 'on'

function keyToBytes(base64: string): Uint8Array {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, c => c.charCodeAt(0))
}

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}
function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

/** كل خطوة لها مهلة — كانت الخطوات تنتظر بلا حد فيبقى الزر «جارٍ التفعيل…» */
function withTimeout<T>(p: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(message)), ms)
    p.then(v => { clearTimeout(t); resolve(v) }, e => { clearTimeout(t); reject(e) })
  })
}

async function getRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration('/')
  if (!existing) await navigator.serviceWorker.register('/sw.js', { scope: '/' })
  // الاشتراك يحتاج عاملاً «نشطاً» — ننتظر جاهزيته بمهلة
  return withTimeout(navigator.serviceWorker.ready, 15000, 'تعذر تشغيل عامل الإشعارات — حدّث الصفحة وحاول مرة أخرى')
}

async function subscribeAndSave(reg: ServiceWorkerRegistration) {
  const sub = (await reg.pushManager.getSubscription()) ||
    (await withTimeout(
      reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(VAPID_PUBLIC_KEY) as BufferSource }),
      20000,
      'خدمة الإشعارات في المتصفح لم تستجب. في Brave فعّل «Use Google services for push messaging» من الإعدادات، أو جرّب Chrome/Edge/Safari.'
    ))
  const res = await withTimeout(savePushSubscription(sub.toJSON(), navigator.userAgent), 15000, 'انقطع الاتصال أثناء الحفظ — حاول مرة أخرى')
  if (!res.success) throw new Error(res.error || 'تعذر حفظ الاشتراك')
}

/**
 * حالة تنبيهات الهاتف لهذا الجهاز + أفعال التفعيل/الإيقاف/التجربة.
 * iPhone: Apple لا تسمح بالإشعارات إلا لموقع مضاف للشاشة الرئيسية (iOS 16.4+).
 */
export function usePush() {
  const [state, setState] = useState<PushState>('loading')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
      if (!supported) { if (alive) setState(isIOS() && !isStandalone() ? 'ios-install' : 'unsupported'); return }
      if (Notification.permission === 'denied') { if (alive) setState('denied'); return }
      try {
        const reg = await getRegistration()
        const sub = await withTimeout(reg.pushManager.getSubscription(), 8000, 'timeout')
        if (Notification.permission === 'granted') {
          // نجدّد الاشتراك بصمت إن فُقد أو لم يُحفظ على الخادم
          await subscribeAndSave(reg)
          if (alive) setState('on')
        } else if (alive) setState(sub ? 'on' : 'off')
      } catch {
        if (alive) setState('off')
      }
    })()
    return () => { alive = false }
  }, [])

  const enable = useCallback(async (): Promise<string | null> => {
    setBusy(true)
    try {
      // إن كان الإذن ممنوحاً سابقاً لا نطلبه مجدداً
      const perm = Notification.permission === 'granted' ? 'granted' : await withTimeout(
        Notification.requestPermission(),
        45000,
        'لم يُردّ على طلب الإذن. اضغط أيقونة الجرس أو القفل 🔒 في شريط العنوان، واختر «السماح بالإشعارات»، ثم اضغط «تفعيل» مرة أخرى.'
      )
      if (perm !== 'granted') { setState(perm === 'denied' ? 'denied' : 'off'); return perm === 'denied' ? 'تم رفض الإذن — يمكنك السماح من إعدادات المتصفح' : 'لم يتم منح الإذن' }
      await subscribeAndSave(await getRegistration())
      setState('on')
      return null
    } catch (e) {
      return (e as Error).message || 'تعذر التفعيل'
    } finally { setBusy(false) }
  }, [])

  const disable = useCallback(async () => {
    setBusy(true)
    try {
      const reg = await navigator.serviceWorker.getRegistration('/')
      const sub = await reg?.pushManager.getSubscription()
      if (sub) { await removePushSubscription(sub.endpoint); await sub.unsubscribe() }
      setState('off')
    } finally { setBusy(false) }
  }, [])

  const test = useCallback(async (): Promise<string | null> => {
    setBusy(true)
    try {
      const res = await sendTestPush()
      return res.success ? null : (res.error || 'تعذر الإرسال')
    } finally { setBusy(false) }
  }, [])

  return { state, busy, enable, disable, test }
}
