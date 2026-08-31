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
    try {
      localStorage.setItem('theme', themeStr)
    } catch {}
  }

  useEffect(() => {
    setMounted(true)
    const savedTheme = localStorage.getItem('theme')
    const currentAttr = document.documentElement.dataset.theme
    const isDark = savedTheme ? savedTheme === 'dark' : currentAttr === 'dark'
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
      <div className="w-28 h-10 rounded-2xl bg-white/10 dark:bg-slate-900/60 border border-slate-300 dark:border-white/10 animate-pulse" />
    )
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/80 dark:bg-slate-900/70 hover:bg-white dark:hover:bg-slate-800 border border-slate-300/80 dark:border-white/15 backdrop-blur-xl shadow-md dark:shadow-black/30 text-slate-800 dark:text-slate-100 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer text-xs font-bold"
      title={dark ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي'}
      aria-label={dark ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي'}
    >
      {dark ? (
        <>
          <Sun className="h-4 w-4 text-amber-500 animate-in spin-in-180 duration-300" />
          <span className="text-amber-500 font-extrabold">الوضع النهاري</span>
        </>
      ) : (
        <>
          <Moon className="h-4 w-4 text-blue-600 animate-in spin-in-180 duration-300" />
          <span className="text-blue-700 font-extrabold">الوضع الليلي</span>
        </>
      )}
    </button>
  )
}
