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
      <div className="w-24 h-9 rounded-full hz-theme-pill animate-pulse" />
    )
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="hz-theme-pill"
      title={dark ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي'}
      aria-label={dark ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي'}
    >
      {dark ? (
        <>
          <Sun className="h-3.5 w-3.5" aria-hidden />
          <span>نهاري</span>
        </>
      ) : (
        <>
          <Moon className="h-3.5 w-3.5" aria-hidden />
          <span>ليلي</span>
        </>
      )}
    </button>
  )
}
