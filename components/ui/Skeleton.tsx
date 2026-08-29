'use client'

import React from 'react'

export interface SkeletonProps {
  width?: string
  height?: string
  borderRadius?: string
  className?: string
  style?: React.CSSProperties
}

/** مكون الهيكل العظمي الأساسي (Base Skeleton Shimmer) */
export function Skeleton({
  width = '100%',
  height = '20px',
  borderRadius = '8px',
  className = '',
  style = {},
}: SkeletonProps) {
  return (
    <div
      className={`skeleton-shimmer ${className}`}
      style={{
        width,
        height,
        borderRadius,
        background: 'var(--surface-2)',
        ...style,
      }}
    />
  )
}

/** هيكل الكرت الزجاجي (Skeleton Glass Card) */
export function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <div className="glass-card rounded-[24px] p-6 flex flex-col gap-4 border border-[var(--glass-border)] w-full">
      <div className="flex items-center justify-between">
        <Skeleton width="40%" height="24px" borderRadius="10px" />
        <Skeleton width="60px" height="20px" borderRadius="999px" />
      </div>
      <div className="flex flex-col gap-2.5 my-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} width={i % 2 === 0 ? '90%' : '75%'} height="16px" borderRadius="6px" />
        ))}
      </div>
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--glass-border)]">
        <Skeleton width="80px" height="32px" borderRadius="999px" />
      </div>
    </div>
  )
}

/** هيكل جدول البيانات (Skeleton Table) */
export function SkeletonTable({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="glass-card rounded-[28px] overflow-hidden shadow-xl w-full border border-[var(--glass-border)]">
      <div className="p-4 bg-[var(--surface-2)] border-b border-[var(--glass-border)] flex items-center justify-between">
        <Skeleton width="200px" height="20px" borderRadius="8px" />
        <Skeleton width="100px" height="32px" borderRadius="999px" />
      </div>
      <div className="p-4 flex flex-col gap-4">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={rIdx} className="flex items-center justify-between gap-4 py-2 border-b border-[var(--glass-border)]/40">
            {Array.from({ length: cols }).map((_, cIdx) => (
              <Skeleton key={cIdx} width={`${Math.floor(100 / cols) - 2}%`} height="18px" borderRadius="6px" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
