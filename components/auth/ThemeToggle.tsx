'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

export function ThemeToggle() {
  const [dark, setDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) {
      setDark(savedTheme === 'dark')
    } else {
      setDark(false)
      document.documentElement.dataset.theme = 'light'
    }
  }, [])

  const toggle = () => {
    const next = !dark
    setDark(next)
    const themeStr = next ? 'dark' : 'light'
    document.documentElement.dataset.theme = themeStr
    try {
      localStorage.setItem('theme', themeStr)
    } catch {}
  }

  if (!mounted) {
    return (
      <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10" />
    )
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/[0.08] dark:bg-slate-900/60 hover:bg-white/[0.14] dark:hover:bg-slate-800/80 border border-white/15 dark:border-white/10 backdrop-blur-xl shadow-lg shadow-black/20 text-slate-100 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer text-xs font-bold"
      title={dark ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي'}
      aria-label={dark ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي'}
    >
      {dark ? (
        <>
          <Sun className="h-4 w-4 text-amber-400 animate-in spin-in-180 duration-300" />
          <span className="text-amber-200">الوضع النهاري</span>
        </>
      ) : (
        <>
          <Moon className="h-4 w-4 text-cyan-400 animate-in spin-in-180 duration-300" />
          <span className="text-cyan-200">الوضع الليلي</span>
        </>
      )}
    </button>
  )
}
