'use client'

/**
 * عدّاد ومروّج المهل والمستحقات الحي (Live Rotating Deadlines & Penalties Card)
 * -----------------------------------------------------------------------------------
 * يعرض غرامات إطلاق الوديعة، والحسابات الختامية، والهويات الحكومية المنتهية أو الوشيكة.
 * يتبدّل تلقائياً كل 10 ثوانٍ مع إمكانية التنقل اليدوي وتوقف التبديل عند الوقوف بالفأرة.
 * يظل معروضاً دائماً بالشريط الجانبي وفق المعايير التصميمية.
 */
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { formatDate, formatMoney } from '@/lib/constants'
import { Icon } from '@/components/ui/Icon'

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
    if (items.length <= 1) return
    setIsTransitioning(true)
    setTimeout(() => {
      setCurrentIndex(prev => (prev + 1) % items.length)
      setIsTransitioning(false)
    }, 180)
  }, [items.length])

  const goToPrev = useCallback(() => {
    if (items.length <= 1) return
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

  const hasLate = items.some(i => i.daysLeft <= 0)

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="w-full flex-none"
    >
      {items.length === 0 ? (
        /* Empty / All Compliant State - Matches Screenshot Exactly */
        <Link
          href="/commercial/deposits"
          className="block rounded-2xl bg-[var(--surface-2)] hover:bg-[var(--surface-3)] p-3 border border-[var(--line-soft)] hover:border-[var(--accent)]/40 transition-all group shadow-2xs"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 dark:text-emerald-400 shrink-0">
                <span className="material-symbols-outlined text-[18px]">verified</span>
              </div>
              <div className="flex flex-col text-right leading-tight">
                <span className="text-[12px] font-black text-[var(--text)]">متابعة المهل</span>
                <span className="text-[12px] font-black text-[var(--text)]">والاستحقاقات</span>
              </div>
            </div>

            <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-lg text-[9.5px] font-black flex flex-col items-center justify-center leading-tight shrink-0">
              <span>سجلات</span>
              <span>منتظمة ✓</span>
            </div>
          </div>

          <div className="text-[9.5px] text-[var(--text-3)] font-medium mt-2 pt-1.5 border-t border-[var(--line-soft)]/60 flex items-center gap-1">
            <span>✓ كافة المعاملات والمهل القانونية ضمن المدد المحددة</span>
          </div>
        </Link>
      ) : (
        /* Active Deadlines Rotating Card - Compact & Proportional */
        (() => {
          const current = items[currentIndex] || items[0]
          const { daysLeft, total = 30 } = current
          const late = daysLeft <= 0
          const warn = !late && daysLeft <= 7
          const companyDisplayName = current.companyName || current.title
          const serviceDetail = current.companyName ? current.title : current.categoryLabel
          const progressRatio = Math.max(0, Math.min(1, late ? 1 : (total - daysLeft) / total))

          return (
            <Link
              href={current.linkUrl}
              className={`block rounded-xl p-2 transition-all relative overflow-hidden group shadow-2xs ${
                late
                  ? 'bg-gradient-to-b from-rose-500/[0.08] to-rose-500/[0.02] border border-rose-500/30 hover:border-rose-500/50'
                  : warn
                  ? 'bg-gradient-to-b from-amber-500/[0.08] to-amber-500/[0.02] border border-amber-500/30 hover:border-amber-500/50'
                  : 'bg-[var(--surface-2)]/90 border border-[var(--line)] hover:border-[var(--accent)]/50'
              }`}
            >
              {/* Top Sub-Header: Category Pill + Micro Controls */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded-md ${
                    late
                      ? 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                      : warn
                      ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                      : 'bg-[var(--surface-3)] text-[var(--text-2)] border border-[var(--line-soft)]'
                  }`}
                >
                  {current.categoryLabel}
                </span>

                {/* Micro Carousel Buttons */}
                {items.length > 1 && (
                  <div
                    className="flex items-center gap-1"
                    onClick={e => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                  >
                    <button
                      type="button"
                      onClick={handlePrev}
                      className="w-4 h-4 rounded-md bg-[var(--surface)] border border-[var(--line-soft)] text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--surface-3)] flex items-center justify-center text-[10px] font-bold cursor-pointer transition-colors"
                      title="السابق"
                    >
                      ›
                    </button>
                    <span className="text-[9px] font-mono font-bold text-[var(--text-3)] px-0.5">
                      {currentIndex + 1}/{items.length}
                    </span>
                    <button
                      type="button"
                      onClick={handleNext}
                      className="w-4 h-4 rounded-md bg-[var(--surface)] border border-[var(--line-soft)] text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--surface-3)] flex items-center justify-center text-[10px] font-bold cursor-pointer transition-colors"
                      title="التالي"
                    >
                      ‹
                    </button>
                  </div>
                )}
              </div>

              {/* Dynamic Body */}
              <div
                style={{
                  opacity: isTransitioning ? 0 : 1,
                  transform: isTransitioning ? 'translateY(-2px)' : 'translateY(0)',
                  transition: 'opacity 180ms ease-in-out, transform 180ms ease-in-out',
                }}
              >
                <div
                  className="text-xs font-bold text-[var(--text)] leading-snug line-clamp-1"
                  title={companyDisplayName}
                >
                  {companyDisplayName}
                </div>

                <div className="text-[10px] text-[var(--text-3)] font-medium mt-0.2 line-clamp-1">
                  {serviceDetail}
                </div>

                {/* Timing & Penalty Status Row */}
                <div className="flex items-center justify-between gap-1 pt-1.5 mt-1 border-t border-dashed border-[var(--line-soft)]">
                  <span
                    className={`text-[10px] font-bold ${
                      late ? 'text-rose-500' : warn ? 'text-amber-500' : 'text-[var(--text-2)]'
                    }`}
                  >
                    {late
                      ? `متأخرة ${Math.abs(daysLeft)} يوم`
                      : `متبقي ${daysLeft} يوم (${formatDate(current.due)})`}
                  </span>

                  {late && current.amount && current.amount > 0 ? (
                    <span className="text-[10px] font-mono font-extrabold text-rose-500">
                      {formatMoney(current.amount)}
                    </span>
                  ) : null}
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1 rounded-full bg-[var(--surface-3)] mt-1.5 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      late ? 'bg-rose-500' : warn ? 'bg-amber-500' : 'bg-[var(--accent)]'
                    }`}
                    style={{ width: `${Math.round(progressRatio * 100)}%` }}
                  />
                </div>
              </div>
            </Link>
          )
        })()
      )}
    </div>
  )
}
