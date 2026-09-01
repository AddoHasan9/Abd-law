'use client'

import React from 'react'
import { useDragScroll } from '@/lib/hooks/useDragScroll'

interface Props extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
  speed?: number
  enableWheel?: boolean
}

export function DragScroll({
  children,
  className = '',
  speed = 1.3,
  enableWheel = true,
  ...props
}: Props) {
  const scrollRef = useDragScroll<HTMLDivElement>({ speed, enableWheel })

  return (
    <div
      ref={scrollRef}
      className={`overflow-x-auto select-none scrollbar-none active:cursor-grabbing ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export default DragScroll
