'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const [dark, setDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) {
      setDark(savedTheme === 'dark')
    } else {
      // Default to light mode as requested by user
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
      <div className="w-10 h-10 rounded-xl bg-card border border-border/80" />
    )
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={toggle}
      className="rounded-xl border-border/80 bg-card/80 backdrop-blur-md hover:bg-secondary text-foreground shadow-sm transition-all duration-200 cursor-pointer"
      title={dark ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي'}
      aria-label={dark ? 'التبديل إلى الوضع النهاري' : 'التبديل إلى الوضع الليلي'}
    >
      {dark ? (
        <Sun className="h-4 w-4 text-amber-400 animate-in spin-in-180 duration-300" />
      ) : (
        <Moon className="h-4 w-4 text-blue-600 animate-in spin-in-180 duration-300" />
      )}
    </Button>
  )
}
