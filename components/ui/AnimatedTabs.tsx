'use client'

import React, { useRef } from 'react'
import { motion } from 'framer-motion'
import { useDragScroll } from '@/lib/hooks/useDragScroll'

export interface TabItem<T extends string = string> {
  id: T
  label: string
  count?: number | string
  icon?: React.ReactNode
}

interface AnimatedTabsProps<T extends string = string> {
  tabs: TabItem<T>[]
  activeTab: T
  onChange: (id: T) => void
  layoutId?: string
  className?: string
  size?: 'sm' | 'md'
  variant?: 'primary' | 'surface'
}

/**
 * AnimatedTabs
 * Luxury Apple-grade segmented control with:
 * - Framer-motion fluid spring-sliding active pill indicator
 * - Compact w-fit container that hugs contents without stretching
 * - Kinetic drag scroll & smooth auto-scroll into view
 * - High-contrast text & counter badges
 */
export function AnimatedTabs<T extends string = string>({
  tabs,
  activeTab,
  onChange,
  layoutId = 'tabs',
  className = '',
  size = 'md',
  variant = 'primary',
}: AnimatedTabsProps<T>) {
  const containerRef = useDragScroll<HTMLDivElement>({ speed: 1.3 })
  const tabsRef = useRef<Map<T, HTMLButtonElement>>(new Map())

  const isSmall = size === 'sm'

  return (
    <div
      ref={containerRef}
      style={{
        display: 'inline-flex',
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'nowrap',
        width: 'fit-content',
        maxWidth: '100%',
        gap: '4px',
        padding: '4px',
        WebkitOverflowScrolling: 'touch',
        scrollBehavior: 'smooth',
      }}
      className={`animated-tabs-track rounded-xl bg-[var(--surface-2)]/90 border border-[var(--glass-border)] overflow-x-auto scrollbar-none select-none relative shadow-2xs ${className}`}
      role="tablist"
    >
      {tabs.map(tab => {
        const isActive = activeTab === tab.id

        return (
          <button
            key={tab.id}
            ref={el => {
              if (el) tabsRef.current.set(tab.id, el)
              else tabsRef.current.delete(tab.id)
            }}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={e => {
              onChange(tab.id)
              e.currentTarget.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center',
              })
            }}
            style={{
              display: 'inline-flex',
              flexDirection: 'row',
              alignItems: 'center',
              flexShrink: 0,
              whiteSpace: 'nowrap',
              gap: '6px',
            }}
            className={`animated-tab-btn relative z-10 ${
              isSmall ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
            } font-bold rounded-lg transition-colors duration-150 whitespace-nowrap cursor-pointer shrink-0 ${
              isActive
                ? 'text-white'
                : 'text-[var(--text-3)] hover:text-[var(--text)] hover:bg-[var(--surface-3)]/40'
            }`}
          >
            {/* Sliding Fluid Indicator via Framer Motion */}
            {isActive && (
              <motion.span
                layoutId={`tab-pill-${layoutId}`}
                className={`absolute inset-0 rounded-lg shadow-xs z-[-1] ${
                  variant === 'primary'
                    ? 'bg-[var(--accent)]'
                    : 'bg-[var(--surface)] text-[var(--text)] border border-[var(--glass-border)]'
                }`}
                transition={{
                  type: 'spring',
                  stiffness: 460,
                  damping: 34,
                }}
              />
            )}

            {tab.icon && (
              <span className="flex items-center justify-center text-[15px] opacity-90">
                {tab.icon}
              </span>
            )}

            <span>{tab.label}</span>

            {tab.count !== undefined && tab.count !== null && (
              <span
                className={`num text-[10.5px] px-1.5 py-0.2 rounded-full font-bold transition-colors ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-[var(--surface-3)] text-[var(--text-3)]'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export default AnimatedTabs
