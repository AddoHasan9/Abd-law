'use client'
/**
 * حركة هادئة عند التمرير (مستوحاة من Diwan Cloud): البطاقات تصعد وتظهر عند دخولها الشاشة.
 * - لا تُخفي أي شيء ظاهر عند فتح الصفحة (فقط ما هو أسفل الشاشة) ⇒ لا وميض ولا فراغ.
 * - تراقب منطقة التمرير #view-root، وتعيد الفحص عند تغيّر الصفحة أو إضافة محتوى.
 * - تتوقف كلياً مع «تقليل الحركة».
 */
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

const SELECTOR = [
  '.kpi-card', '.bx-card', '.card', '.data-panel', '.co-card', '.rem-item', '.kb-card', '.stat-card',
].map(s => `#view-root ${s}`).join(', ')

export default function RevealOnScroll() {
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const root = document.getElementById('view-root')
    if (!root) return

    const io = new IntersectionObserver(entries => {
      let i = 0
      for (const e of entries) {
        if (!e.isIntersecting) continue
        const el = e.target as HTMLElement
        el.style.setProperty('--rv-delay', `${Math.min(i++, 5) * 60}ms`)
        el.classList.add('rv-in')
        io.unobserve(el)
      }
    }, { root, rootMargin: '0px 0px -6% 0px', threshold: 0.08 })

    const scan = () => {
      const fold = root.getBoundingClientRect().bottom
      root.querySelectorAll<HTMLElement>(SELECTOR).forEach(el => {
        if (el.dataset.rv) return
        el.dataset.rv = '1'
        // متداخلة داخل عنصر متحرك آخر؟ نتركها تتحرك مع الأب
        if (el.parentElement?.closest('.rv')) return
        if (el.getBoundingClientRect().top < fold) return // ظاهر الآن ⇒ لا نخفيه
        el.classList.add('rv')
        io.observe(el)
      })
    }

    scan()
    let t: ReturnType<typeof setTimeout> | undefined
    const mo = new MutationObserver(() => { clearTimeout(t); t = setTimeout(scan, 120) })
    mo.observe(root, { childList: true, subtree: true })
    return () => { io.disconnect(); mo.disconnect(); clearTimeout(t) }
  }, [pathname])

  return null
}
