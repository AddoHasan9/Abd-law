'use client'

import { useRef, useEffect } from 'react'
import gsap from 'gsap'
import { cn } from '@/lib/utils'

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  stagger?: number
  duration?: number
  yOffset?: number
}

export function FadeInStagger({
  children,
  className,
  stagger = 0.06,
  duration = 0.45,
  yOffset = 16,
  ...props
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    const elements = containerRef.current.children
    if (elements.length === 0) return

    gsap.fromTo(
      elements,
      {
        opacity: 0,
        y: yOffset,
      },
      {
        opacity: 1,
        y: 0,
        duration: duration,
        stagger: stagger,
        ease: 'power2.out',
        clearProps: 'all',
      }
    )
  }, [stagger, duration, yOffset])

  return (
    <div ref={containerRef} className={cn(className)} {...props}>
      {children}
    </div>
  )
}
