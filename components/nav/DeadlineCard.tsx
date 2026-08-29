'use client'

/**
 * عدّاد ومروّج المهل والغرامات الحي المتناوب (Live Rotating Deadlines & Penalties Card)
 * -----------------------------------------------------------------------------------
 * يعرض غرامات إطلاق الوديعة، والحسابات الختامية، والهويات الحكومية المنتهية أو الوشيكة.
 * يتبدّل تلقائياً كل 10 ثوانٍ مع إمكانية التنقل اليدوي وتوقف التبديل عند الوقوف بالفأرة.
 */
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { formatDate, formatMoney } from '@/lib/constants'

export interface DeadlineItem {
  id: string
  companyId: string
  companyName?: string
  title: string
  category: 'deposit' | 'financial_statement' | 'government_id' | 'general'
  categoryLabel: string
  due: string
  daysLeft: number
  amount?: number
  total?: number
  linkUrl: string
}

interface Props {
  deadlines?: DeadlineItem[]
  item?: DeadlineItem | null
}

export default function DeadlineCard({ deadlines = [], item = null }: Props) {
  // Normalize items array
  const items: DeadlineItem[] = deadlines.length > 0
    ? deadlines
    : item
    ? [item]
    : []

  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Ensure currentIndex stays within bounds if list length changes
  useEffect(() => {
    if (currentIndex >= items.length && items.length > 0) {
      setCurrentIndex(0)
    }
  }, [items.length, currentIndex])

  const goToNext = useCallback(() => {
    setIsTransitioning(true)
    setTimeout(() => {
      setCurrentIndex(prev => (prev + 1) % items.length)
      setIsTransitioning(false)
    }, 180)
  }, [items.length])

  const goToPrev = useCallback(() => {
    setIsTransitioning(true)
    setTimeout(() => {
      setCurrentIndex(prev => (prev - 1 + items.length) % items.length)
      setIsTransitioning(false)
    }, 180)
  }, [items.length])

  // 10-second live auto-rotation interval
  useEffect(() => {
    if (items.length <= 1 || isPaused) return

    const timer = setInterval(() => {
      goToNext()
    }, 10000)

    return () => clearInterval(timer)
  }, [items.length, isPaused, goToNext])

  const handlePrev = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    goToPrev()
  }

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    goToNext()
  }

  if (items.length === 0) {
    return (
      <div
        style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--line-soft)',
          padding: '12px 14px',
          borderRadius: '12px',
          margin: '8px 12px 10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className="material-symbols-outlined text-[16px] text-emerald-500">verified</span>
            <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text)' }}>متابعة المهل والاستحقاقات</span>
          </div>
          <span
            style={{
              fontSize: '10.5px',
              padding: '2px 8px',
              fontWeight: 700,
              borderRadius: '6px',
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#10B981',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          >
            سجلات منتظمة ✓
          </span>
        </div>
        <div style={{ fontSize: '11.5px', color: 'var(--text-3)', marginTop: '6px', lineHeight: 1.4 }}>
          ✓ كافة المعاملات والمهل القانونية ضمن المدد المحددة
        </div>
      </div>
    )
  }

  const current = items[currentIndex] || items[0]
  const { daysLeft, total = 30 } = current
  const late = daysLeft <= 0
  const warn = !late && daysLeft <= 7
  const companyDisplayName = current.companyName || current.title
  const serviceDetail = current.companyName ? current.title : current.categoryLabel

  // Progress ratio (0 to 1)
  const progressRatio = Math.max(0, Math.min(1, late ? 1 : (total - daysLeft) / total))

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      style={{
        margin: '8px 12px 10px',
        position: 'relative',
      }}
    >
      <Link
        href={current.linkUrl}
        style={{
          display: 'block',
          background: late
            ? 'linear-gradient(180deg, rgba(239, 68, 68, 0.06) 0%, rgba(239, 68, 68, 0.02) 100%)'
            : warn
            ? 'linear-gradient(180deg, rgba(245, 158, 11, 0.06) 0%, rgba(245, 158, 11, 0.02) 100%)'
            : 'var(--surface-2)',
          border: late
            ? '1px solid rgba(239, 68, 68, 0.28)'
            : warn
            ? '1px solid rgba(245, 158, 11, 0.28)'
            : '1px solid var(--line)',
          borderRadius: '12px',
          padding: '12px 14px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
          textDecoration: 'none',
          position: 'relative',
          overflow: 'hidden',
          transition: 'border-color 0.2s, box-shadow 0.2s',
        }}
        className="group hover:shadow-md"
      >
        {/* Header: Category Badge + Counter & Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          {/* Category Pill Tag */}
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '6px',
              background: late
                ? 'rgba(239, 68, 68, 0.12)'
                : warn
                ? 'rgba(245, 158, 11, 0.12)'
                : 'var(--surface-3)',
              color: late ? '#dc2626' : warn ? '#d97706' : 'var(--text)',
              border: late
                ? '1px solid rgba(239, 68, 68, 0.25)'
                : warn
                ? '1px solid rgba(245, 158, 11, 0.25)'
                : '1px solid var(--line-soft)',
            }}
          >
            {current.categoryLabel}
          </span>

          {/* Carousel Counter & Navigation Micro-Controls */}
          {items.length > 1 && (
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
              onClick={e => {
                e.preventDefault()
                e.stopPropagation()
              }}
            >
              {/* Previous Button */}
              <button
                type="button"
                onClick={handlePrev}
                style={{
                  border: '1px solid var(--line-soft)',
                  background: 'var(--surface)',
                  color: 'var(--text-2)',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  width: '22px',
                  height: '22px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                  transition: 'all 0.15s ease',
                }}
                className="hover:bg-[var(--surface-3)] hover:text-[var(--text)]"
                title="السابق"
              >
                ›
              </button>

              {/* Counter Indicator */}
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--text-3)',
                  fontFamily: 'monospace',
                  padding: '0 2px',
                }}
              >
                {currentIndex + 1}/{items.length}
              </span>

              {/* Next Button */}
              <button
                type="button"
                onClick={handleNext}
                style={{
                  border: '1px solid var(--line-soft)',
                  background: 'var(--surface)',
                  color: 'var(--text-2)',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  width: '22px',
                  height: '22px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                  transition: 'all 0.15s ease',
                }}
                className="hover:bg-[var(--surface-3)] hover:text-[var(--text)]"
                title="التالي"
              >
                ‹
              </button>
            </div>
          )}
        </div>

        {/* Content Body with Smooth Fade & Slide Animation */}
        <div
          style={{
            opacity: isTransitioning ? 0 : 1,
            transform: isTransitioning ? 'translateY(-3px)' : 'translateY(0)',
            transition: 'opacity 180ms ease-in-out, transform 180ms ease-in-out',
          }}
        >
          {/* Company Name — Full and Prominent */}
          <div
            style={{
              fontSize: '13.5px',
              fontWeight: 800,
              color: 'var(--text)',
              lineHeight: '1.4',
              marginBottom: '3px',
            }}
            title={companyDisplayName}
          >
            {companyDisplayName}
          </div>

          {/* Service Detail / Subtitle */}
          <div
            style={{
              fontSize: '11.5px',
              color: 'var(--text-3)',
              fontWeight: 600,
              marginBottom: '8px',
            }}
          >
            {serviceDetail}
          </div>

          {/* Status Bar & Financial Penalty Info */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '6px',
              paddingTop: '6px',
              borderTop: '1px dashed var(--line-soft)',
            }}
          >
            {/* Status Pill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: late ? '#dc2626' : warn ? '#d97706' : 'var(--text-2)',
                }}
              >
                {late
                  ? `متأخرة ${Math.abs(daysLeft)} يوم`
                  : `متبقي ${daysLeft} يوم (${formatDate(current.due)})`}
              </span>
            </div>

            {/* Penalty Amount if accumulated */}
            {late && current.amount && current.amount > 0 ? (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  color: '#dc2626',
                  fontFamily: 'monospace',
                }}
              >
                {formatMoney(current.amount)}
              </span>
            ) : null}
          </div>

          {/* Sleek Horizontal Progress Bar */}
          <div
            style={{
              width: '100%',
              height: '3px',
              borderRadius: '999px',
              background: 'var(--surface-3)',
              marginTop: '8px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${Math.round(progressRatio * 100)}%`,
                background: late
                  ? '#dc2626'
                  : warn
                  ? '#d97706'
                  : 'var(--accent)',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>
      </Link>
    </div>
  )
}
