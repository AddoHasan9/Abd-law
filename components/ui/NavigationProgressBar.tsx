'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

/**
 * شريط تقدّم رفيع أعلى الشاشة أثناء التنقّل بين الصفحات.
 *
 * كان يعلق مرئياً عند 88% لأنه يبدأ مع أي نقرة رابط ولا ينتهي إلا إذا تغيّر
 * المسار. أي رابط لا يغيّر العنوان فعلياً (نفس الصفحة بترميز مختلف للعربي،
 * رابط يُلغى تنقّله، رابط يفتح نافذة…) كان يتركه ظاهراً للأبد.
 * الآن: مقارنة عناوين مطبّعة، تجاهل النقرات التي لا تنقل، ومهلة أمان تنهيه دائماً.
 */
const SAFETY_MS = 8000

export function NavigationProgressBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)
  const timers = useRef<number[]>([])
  const active = useRef(false)

  const clearTimers = () => {
    timers.current.forEach(t => window.clearTimeout(t))
    timers.current = []
  }

  const finish = () => {
    if (!active.current) return
    active.current = false
    clearTimers()
    setProgress(100)
    timers.current.push(window.setTimeout(() => {
      setVisible(false)
      setProgress(0)
    }, 220))
  }

  // انتهاء التنقّل = تغيّر المسار أو المعاملات
  useEffect(() => {
    finish()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return
      const a = (e.target as HTMLElement | null)?.closest('a')
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return
      const raw = a.getAttribute('href')
      if (!raw || raw.startsWith('#') || /^(mailto|tel):/i.test(raw)) return

      let next: URL
      try { next = new URL(raw, window.location.href) } catch { return }
      if (next.origin !== window.location.origin) return
      // مقارنة بعد التطبيع — يمنع البدء عند الضغط على رابط الصفحة الحالية
      if (next.pathname === window.location.pathname && next.search === window.location.search) return

      // ننتظر لحظة: إذا أُلغي التنقّل (preventDefault بدون تنقّل) لا نُظهر شيئاً
      window.setTimeout(() => {
        if (window.location.pathname === next.pathname && window.location.search === next.search) return
        clearTimers()
        active.current = true
        setVisible(true)
        setProgress(30)
        timers.current.push(window.setTimeout(() => setProgress(65), 180))
        timers.current.push(window.setTimeout(() => setProgress(85), 600))
        timers.current.push(window.setTimeout(finish, SAFETY_MS))
      }, 60)
    }

    const onPop = () => finish()
    document.addEventListener('click', onClick, true)
    window.addEventListener('popstate', onPop)
    return () => {
      document.removeEventListener('click', onClick, true)
      window.removeEventListener('popstate', onPop)
      clearTimers()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!visible) return null

  return (
    <div
      aria-hidden
      className="fixed inset-x-0 z-[999999] pointer-events-none h-[2.5px]"
      style={{ top: 'env(safe-area-inset-top, 0px)' }}
    >
      <div
        className="h-full bg-gradient-to-l from-sky-400 via-blue-500 to-emerald-400 shadow-[0_0_8px_rgba(56,189,248,0.6)]"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
          transition: 'width 200ms ease-out, opacity 200ms ease-out',
        }}
      />
    </div>
  )
}
