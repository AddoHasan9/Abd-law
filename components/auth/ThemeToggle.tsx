'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

export function ThemeToggle() {
  const [dark, setDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  const applyTheme = (isDark: boolean) => {
    const themeStr = isDark ? 'dark' : 'light'
    document.documentElement.dataset.theme = themeStr
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    const color = isDark ? '#0B0E14' : '#EEF2F6' // نفس خلفية صفحة الدخول
    const meta = document.getElementById('theme-color-meta') || document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', color)
    document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.setAttribute('content', color))
    try {
      localStorage.setItem('theme', themeStr)
    } catch {}
  }

  useEffect(() => {
    setMounted(true)
    const savedTheme = localStorage.getItem('theme')
    const currentAttr = document.documentElement.dataset.theme
    const isDark = savedTheme ? savedTheme === 'dark' : currentAttr === 'dark' || document.documentElement.classList.contains('dark')
    setDark(isDark)
    applyTheme(isDark)
  }, [])

  const toggle = () => {
    const next = !dark
    setDark(next)
    applyTheme(next)
  }

  if (!mounted) {
    return (
      <div className="w-24 h-9 rounded-full bg-white/20 dark:bg-white/5 border border-slate-200 dark:border-white/10 animate-pulse" />
    )
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/85 dark:bg-[#151A24]/85 hover:bg-white dark:hover:bg-[#1D2433] border border-slate-200/90 dark:border-white/15 backdrop-blur-xl shadow-md text-slate-800 dark:text-slate-100 transition duration-300 hover:scale-105 active:scale-95 cursor-pointer text-xs font-bold select-none"
      title={dark ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي'}
      aria-label={dark ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي'}
    >
      {dark ? (
        <>
          <Sun className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-[11px] font-bold text-amber-400">نهاري</span>
        </>
      ) : (
        <>
          <Moon className="h-3.5 w-3.5 text-blue-600" />
          <span className="text-[11px] font-bold text-slate-700">ليلي</span>
        </>
      )}
    </button>
  )
}
