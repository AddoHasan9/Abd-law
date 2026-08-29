'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createPortal } from 'react-dom'
import { useModalBodyLock } from '@/lib/hooks/useModalBodyLock'
import type { ExpiryAlertItem } from '@/lib/notification-engine'
import { formatDate } from '@/lib/constants'

interface Props {
  alerts: ExpiryAlertItem[]
}

export default function ExpiryAlertBanner({ alerts = [] }: Props) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())
  const [inProgressIds, setInProgressIds] = useState<Set<string>>(new Set())
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isBannerDismissed, setIsBannerDismissed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useModalBodyLock(isModalOpen, () => setIsModalOpen(false))

  useEffect(() => {
    setMounted(true)
  }, [])

  const visibleAlerts = alerts.filter(a => !dismissedIds.has(a.id))

  if (!visibleAlerts.length || isBannerDismissed) {
    return null
  }

  const expiredCount = visibleAlerts.filter(a => a.daysLeft < 0).length
  const criticalCount = visibleAlerts.filter(a => a.daysLeft >= 0 && a.daysLeft <= 14).length

  const handleDismissAlert = (id: string) => {
    setDismissedIds(prev => new Set(prev).add(id))
  }

  const handleToggleInProgress = (id: string) => {
    setInProgressIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const bannerTheme =
    expiredCount > 0
      ? {
          bg: 'rgba(239, 68, 68, 0.08)',
          border: 'rgba(239, 68, 68, 0.25)',
          badgeBg: '#ef4444',
          badgeText: '#ffffff',
          textColor: 'var(--text)',
          iconColor: '#ef4444',
        }
      : criticalCount > 0
        ? {
            bg: 'rgba(249, 115, 22, 0.08)',
            border: 'rgba(249, 115, 22, 0.25)',
            badgeBg: '#f97316',
            badgeText: '#ffffff',
            textColor: 'var(--text)',
            iconColor: '#f97316',
          }
        : {
            bg: 'rgba(245, 158, 11, 0.08)',
            border: 'rgba(245, 158, 11, 0.25)',
            badgeBg: '#f59e0b',
            badgeText: '#ffffff',
            textColor: 'var(--text)',
            iconColor: '#f59e0b',
          }

  return (
    <>
      {/* 1. Compact Slim Banner Strip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          borderRadius: '12px',
          background: bannerTheme.bg,
          border: `1px solid ${bannerTheme.border}`,
          padding: '10px 16px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
          transition: 'all 0.2s ease',
        }}
        className="w-full"
      >
        {/* Right Info: Icon & Short Summary */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '260px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: bannerTheme.badgeBg,
              color: '#ffffff',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            <span className="material-symbols-outlined text-[18px]">warning</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 800, fontSize: '13.5px', color: bannerTheme.textColor }}>
              تنبيهات الهويات والمهل القانونية:
            </span>
            <span
              style={{
                fontSize: '11.5px',
                fontWeight: 800,
                padding: '2px 8px',
                borderRadius: '6px',
                background: bannerTheme.badgeBg,
                color: bannerTheme.badgeText,
              }}
            >
              {visibleAlerts.length} {visibleAlerts.length === 1 ? 'تنبيه بحاجة للمتابعة' : 'تنبيهات بحاجة للمتابعة'}
            </span>
            {expiredCount > 0 && (
              <span style={{ fontSize: '12px', color: 'var(--bad)', fontWeight: 700 }}>
                ({expiredCount} منتهية الصلاحية)
              </span>
            )}
          </div>
        </div>

        {/* Left Actions: Open Modal Button + Jump to Section + Dismiss */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="btn btn-ghost"
            style={{
              fontSize: '12px',
              fontWeight: 700,
              padding: '6px 12px',
              background: 'var(--surface, #ffffff)',
              border: '1px solid var(--line-soft)',
              borderRadius: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span className="material-symbols-outlined text-[16px]">visibility</span>
            <span>عرض التنبيهات ({visibleAlerts.length})</span>
          </button>

          <Link
            href="/commercial/ids"
            className="btn btn-primary"
            style={{
              fontSize: '12px',
              fontWeight: 700,
              padding: '6px 14px',
              borderRadius: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              textDecoration: 'none',
            }}
          >
            <span>قسم الهويات والتراخيص</span>
            <span className="material-symbols-outlined text-[14px]">arrow_left</span>
          </Link>

          <button
            type="button"
            onClick={() => setIsBannerDismissed(true)}
            className="btn btn-ghost"
            style={{ padding: '6px 8px', fontSize: '12px', color: 'var(--text-3)' }}
            title="إخفاء الشريط مؤقتاً"
          >
            ✕
          </button>
        </div>
      </div>

      {/* 2. Interactive Details Modal */}
      {isModalOpen && mounted && createPortal(
        <div id="modal-root" className="on">
          <div className="modal-veil" onClick={() => setIsModalOpen(false)} role="presentation" aria-hidden="true" />
          <div
            className="modal"
            style={{
              '--modal-max-w': 'var(--modal-lg, 780px)',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '85vh',
            } as React.CSSProperties}
          >
            {/* Modal Header */}
            <div className="modal-head" style={{ borderBottom: '1px solid var(--line-soft)', paddingBottom: '14px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: bannerTheme.badgeBg,
                  color: '#ffffff',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <span className="material-symbols-outlined text-[20px]">notification_important</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>
                  تنبيهات انتهاء الهويات والمهل
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                  قائمة الهويات والوثائق المنتهية أو القريبة من الانتهاء والتي تتطلب التجديد الفوري
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="icon-btn"
                aria-label="إغلاق"
              >
                ✕
              </button>
            </div>

            {/* Modal Body: Alert Items */}
            <div
              className="modal-body"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                overflowY: 'auto',
                padding: '20px',
              }}
            >
              {visibleAlerts.map(item => {
                const isInProgress = inProgressIds.has(item.id)

                return (
                  <div
                    key={item.id}
                    style={{
                      background: item.colorTheme.bg,
                      border: `1.5px solid ${item.colorTheme.border}`,
                      borderRadius: '10px',
                      padding: '14px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      opacity: isInProgress ? 0.85 : 1,
                    }}
                  >
                    {/* Top Row: Company Name & Days Remaining */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '18px', lineHeight: 1 }}>
                          {item.priority === 'expired' ? '⚫' : item.priority === 'critical' ? '🔴' : item.priority === 'high' ? '🟠' : '🟡'}
                        </span>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 800, fontSize: '14.5px', color: 'var(--text)' }}>
                              {item.companyName}
                            </span>
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '6px',
                                background: item.colorTheme.badgeBg,
                                color: item.colorTheme.badgeText,
                              }}
                            >
                              {item.title}
                            </span>
                            {isInProgress && (
                              <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', background: '#3b82f6', color: '#ffffff' }}>
                                ✓ قيد المتابعة
                              </span>
                            )}
                          </div>

                          <div style={{ fontSize: '12px', color: item.colorTheme.text, marginTop: '2px', fontWeight: 600 }}>
                            {item.priorityLabel} · تاريخ الانتهاء: <span className="num" style={{ fontWeight: 700 }}>{formatDate(item.expiryDate)}</span>
                            {item.idNumber && <span> · رقم الهوية: <span className="num">{item.idNumber}</span></span>}
                          </div>
                        </div>
                      </div>

                      {/* Days Counter */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: 'var(--surface, #ffffff)',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          border: `1px solid ${item.colorTheme.border}`,
                        }}
                      >
                        <span className="material-symbols-outlined text-[15px]" style={{ color: item.colorTheme.text }}>schedule</span>
                        <span className="num" style={{ fontWeight: 800, fontSize: '12.5px', color: item.colorTheme.text }}>
                          {item.daysLeft < 0 ? `متأخرة ${Math.abs(item.daysLeft)} يوماً` : `متبقي ${item.daysLeft} يوماً`}
                        </span>
                      </div>
                    </div>

                    {/* Action Links */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        flexWrap: 'wrap',
                        paddingTop: '8px',
                        borderTop: '1px dashed rgba(0, 0, 0, 0.08)',
                      }}
                    >
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <Link
                          href="/commercial/ids"
                          onClick={() => setIsModalOpen(false)}
                          className="btn btn-primary"
                          style={{ fontSize: '11.5px', padding: '4px 12px', fontWeight: 700, textDecoration: 'none' }}
                        >
                          تجديد في قسم الهويات ←
                        </Link>

                        {item.companyId && (
                          <Link
                            href={item.profileUrl}
                            onClick={() => setIsModalOpen(false)}
                            className="btn btn-secondary"
                            style={{ fontSize: '11.5px', padding: '4px 10px', fontWeight: 700, textDecoration: 'none' }}
                          >
                            ملف الشركة 360°
                          </Link>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => handleToggleInProgress(item.id)}
                          className="btn btn-ghost"
                          style={{ fontSize: '11.5px', padding: '4px 8px', color: isInProgress ? 'var(--accent)' : 'var(--text-2)' }}
                        >
                          {isInProgress ? '✓ قيد المتابعة' : 'تحديد كقيد المتابعة'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDismissAlert(item.id)}
                          className="btn btn-ghost"
                          style={{ fontSize: '11.5px', padding: '4px 8px', color: 'var(--text-3)' }}
                          title="إخفاء من القائمة"
                        >
                          إخفاء مؤقت ✕
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Modal Footer */}
            <div className="modal-foot" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Link
                href="/commercial/ids"
                onClick={() => setIsModalOpen(false)}
                className="btn btn-primary"
                style={{ fontSize: '13px', padding: '8px 18px', fontWeight: 700, textDecoration: 'none' }}
              >
                الانتقال لجدول الهويات الكامل ←
              </Link>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="btn btn-ghost"
                style={{ fontSize: '13px' }}
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
