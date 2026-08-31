'use client'

import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

/**
 * Top Navigation Progress Bar & Network Activity Indicator
 * Inspired by Linear and Vercel: Provides instant visual feedback on route changes
 * and link clicks so the interface never feels frozen or static.
 */
export function NavigationProgressBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  // Reset/complete progress when pathname or searchParams change
  useEffect(() => {
    if (loading) {
      setProgress(100)
      const timer = setTimeout(() => {
        setLoading(false)
        setProgress(0)
      }, 250)
      return () => clearTimeout(timer)
    }
  }, [pathname, searchParams])

  // Global click listener for internal link navigation
  useEffect(() => {
    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a')
      if (!target) return

      const href = target.getAttribute('href')
      if (!href) return

      // Skip external links, hashes, new tabs, or mailto/tel
      if (
        href.startsWith('http://') ||
        href.startsWith('https://') ||
        href.startsWith('#') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        target.getAttribute('target') === '_blank' ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey
      ) {
        return
      }

      // Check if navigating to a different URL
      const currentUrl = window.location.pathname + window.location.search
      if (href !== currentUrl) {
        setLoading(true)
        setProgress(25)
        setTimeout(() => setProgress(65), 150)
        setTimeout(() => setProgress(88), 400)
      }
    }

    document.addEventListener('click', handleAnchorClick, true)
    return () => document.removeEventListener('click', handleAnchorClick, true)
  }, [])

  if (!loading && progress === 0) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[999999] pointer-events-none h-[2.5px] bg-transparent">
      <div
        className="h-full bg-gradient-to-r from-sky-400 via-primary to-emerald-400 shadow-[0_0_10px_rgba(56,189,248,0.7)] transition-all duration-200 ease-out"
        style={{
          width: `${progress}%`,
          opacity: progress === 100 ? 0 : 1,
        }}
      />
    </div>
  )
}
