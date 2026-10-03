'use client'

import { useEffect, useState } from 'react'
import { applyTheme, currentTheme, onThemeChange } from '@/lib/theme'
import { Sun, Moon } from 'lucide-react'

export function ThemeToggle() {
  const [dark, setDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setDark(currentTheme() === 'dark')
    return onThemeChange(t => setDark(t === 'dark'))
  }, [])

  const toggle = () => applyTheme(dark ? 'light' : 'dark')

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
