'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '@/components/ui/Icon'
import { formatMoney } from '@/lib/constants'
import { calculateFSState } from '@/lib/financial-statements/calc'
import type { Company, FinancialStatement, RequiredFSItem } from '@/types/database'
import { useModalBodyLock } from '@/lib/hooks/useModalBodyLock'

interface Props {
  company: Company | null
  statements: FinancialStatement[]
  requiredItems: RequiredFSItem[]
  isOpen: boolean
  onClose: () => void
  onAddYear: () => void
  onEditYear: (statement: FinancialStatement) => void
  onDeleteYear: (statementId: string) => void
  onMarkSubmitted: (statementId: string) => void
  canSubmit?: boolean
  canDelete?: boolean
}

export default function CompanyFSDetailsModal({
  company,
  statements = [],
  requiredItems = [],
  isOpen,
  onClose,
  onAddYear,
  onEditYear,
  onDeleteYear,
  onMarkSubmitted,
  canSubmit = true,
  canDelete = true,
}: Props) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useModalBodyLock(isOpen)

  if (!mounted || !isOpen || !company) return null

  // Calculate Company History Stats
  const completedStatements = statements.filter(s => s.date_submitted)
  const completedYearsCount = completedStatements.length
  const totalRequiredCount = requiredItems.length + completedYearsCount
  const pendingCount = requiredItems.length

  const calculatedSubmitted = statements.map(s => ({
    statement: s,
    state: calculateFSState(s),
  }))

  const penaltyFromSubmitted = calculatedSubmitted.reduce((acc, curr) => acc + curr.state.penaltyAmount, 0)
  const penaltyFromPending = requiredItems.reduce((acc, curr) => acc + curr.penaltyAmount, 0)
  const totalPenaltyAmount = penaltyFromSubmitted + penaltyFromPending

  const latestSubmittedYear = statements.length > 0 ? Math.max(...statements.map(s => s.year)) : (company.last_completed_fs_year || 'لا يوجد')

  // Chronological History List (Merging completed and pending required years)
  const allYearsMap = new Map<number, {
    year: number
    dateReceived?: string | null
    dateSubmitted?: string | null
    statusLabel: string
    tagClass: string
    penaltyAmount: number
    notes?: string | null
    statementObj?: FinancialStatement
  }>()

  // 1. Add completed statements
  statements.forEach(s => {
    const calc = calculateFSState(s)
    allYearsMap.set(s.year, {
      year: s.year,
      dateReceived: s.date_received,
      dateSubmitted: s.date_submitted,
      statusLabel: calc.statusLabel,
      tagClass: calc.tagClass,
      penaltyAmount: calc.penaltyAmount,
      notes: s.notes,
      statementObj: s,
    })
  })

  // 2. Add pending required years
  requiredItems.forEach(r => {
    if (!allYearsMap.has(r.requiredYear)) {
      allYearsMap.set(r.requiredYear, {
        year: r.requiredYear,
        dateReceived: null,
        dateSubmitted: null,
        statusLabel: r.statusLabel,
        tagClass: r.tagClass,
        penaltyAmount: r.penaltyAmount,
        notes: r.isMergedYear ? 'سنة التأسيس مدمجة وفق نظام Q4' : 'ميزانية مستحقة لم تُقدّم بعد',
      })
    }
  })

  const historyList = Array.from(allYearsMap.values()).sort((a, b) => b.year - a.year)

  return createPortal(
    <div id="modal-root" className="on">
      <div className="modal-veil" onClick={onClose} role="presentation" aria-hidden="true" />
      <div className="modal" style={{ '--modal-max-w': 'var(--modal-xl, 880px)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' } as React.CSSProperties}>
        
        {/* Modal Header */}
        <div className="modal-head" style={{ flex: 'none' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'var(--accent-soft)',
              color: 'var(--accent)',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Icon name="doc" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ margin: 0 }}>تفاصيل الحسابات الختامية: {company.name}</h3>
            <span style={{ fontSize: '11.5px', color: 'var(--text-3)' }}>
              سجل الميزانيات السنوية والغرامات لشركة {company.name}
            </span>
          </div>
          <button type="button" onClick={onClose} className="icon-btn" aria-label="إغلاق">
            ✕
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px' }}>
          
          {/* Top Summary Statistics Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px' }}>
            <div style={{ padding: '12px 14px', background: 'var(--surface-2)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-md)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600 }}>إجمالي السنوات المنجزة</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ok)', marginTop: '2px' }}>
                {completedYearsCount} سنة
              </div>
            </div>

            <div style={{ padding: '12px 14px', background: 'var(--surface-2)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-md)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600 }}>إجمالي السنوات المطلوبة</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent)', marginTop: '2px' }}>
                {totalRequiredCount} سنة
              </div>
            </div>

            <div style={{ padding: '12px 14px', background: pendingCount > 0 ? 'var(--warn-soft)' : 'var(--surface-2)', border: pendingCount > 0 ? '1px solid var(--warn)' : '1px solid var(--line-soft)', borderRadius: 'var(--r-md)' }}>
              <div style={{ fontSize: '11px', color: pendingCount > 0 ? 'var(--warn)' : 'var(--text-3)', fontWeight: 600 }}>السنوات المتأخرة / المستحقة</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: pendingCount > 0 ? 'var(--warn)' : 'var(--text)', marginTop: '2px' }}>
                {pendingCount} سنة
              </div>
            </div>

            <div style={{ padding: '12px 14px', background: totalPenaltyAmount > 0 ? 'var(--bad-soft)' : 'var(--surface-2)', border: totalPenaltyAmount > 0 ? '1px solid var(--bad)' : '1px solid var(--line-soft)', borderRadius: 'var(--r-md)' }}>
              <div style={{ fontSize: '11px', color: totalPenaltyAmount > 0 ? 'var(--bad)' : 'var(--text-3)', fontWeight: 600 }}>إجمالي الغرامات المحسوبة</div>
              <div style={{ fontSize: '17px', fontWeight: 800, color: totalPenaltyAmount > 0 ? 'var(--bad)' : 'var(--text-3)', marginTop: '2px' }}>
                {formatMoney(totalPenaltyAmount)}
              </div>
            </div>
          </div>

          {/* General Information Card */}
          <div style={{ padding: '14px 16px', background: 'var(--surface-2)', border: '1px solid var(--line-soft)', borderRadius: 'var(--r-md)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent)', borderBottom: '1px solid var(--line-soft)', paddingBottom: '6px' }}>
              معلومات الشركة العامة
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '12.5px' }}>
              <div>
                <span style={{ color: 'var(--text-3)' }}>اسم الشركة: </span>
                <strong style={{ color: 'var(--text)' }}>{company.name}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-3)' }}>تاريخ التأسيس: </span>
                <strong style={{ color: 'var(--text)' }}>{company.establishment_date || company.cert_date || '—'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-3)' }}>رقم وتاريخ الشهادة: </span>
                <strong style={{ color: 'var(--text)' }}>{company.cert_no ? `${company.cert_no} (${company.cert_date || ''})` : '—'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-3)' }}>آخر سنة ماليّة مكتملة: </span>
                <strong style={{ color: 'var(--ok)' }}>{latestSubmittedYear}</strong>
              </div>
            </div>
          </div>

          {/* Financial Statement History Timeline / Table */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text)' }}>
                سجل الحسابات الختامية حسب السنوات ({historyList.length})
              </div>
              <button
                type="button"
                onClick={onAddYear}
                className="btn btn-primary"
                style={{ padding: '4px 12px', fontSize: '12px' }}
              >
                <Icon name="plus" />
                <span>إضافة سنة جديدة</span>
              </button>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--line)' }}>
                      <th style={{ padding: '10px 14px', textAlign: 'center' }}>السنة</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center' }}>تاريخ الاستلام</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center' }}>تاريخ التقديم</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center' }}>الحالة</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center' }}>الغرامة</th>
                      <th style={{ padding: '10px 14px', textAlign: 'center' }}>الملاحظات</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left' }}>إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyList.map(item => (
                      <tr key={item.year} style={{ borderBottom: '1px solid var(--line-soft)' }}>
                        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 800 }}>
                          <div>السنة المالية {item.year}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 400, marginTop: '2px' }}>
                            الموعد: 07/10/{item.year + 1}
                          </div>
                        </td>

                        <td style={{ padding: '12px 14px', textAlign: 'center', color: 'var(--text-2)' }}>
                          {item.dateReceived || '—'}
                        </td>

                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          {item.dateSubmitted ? (
                            <span className="tag tag-ok">{item.dateSubmitted}</span>
                          ) : (
                            <span style={{ color: 'var(--text-3)' }}>لم تُقدَّم بعد</span>
                          )}
                        </td>

                        <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                          <span className={`tag ${item.tagClass}`}>
                            {item.statusLabel}
                          </span>
                        </td>

                        <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: item.penaltyAmount > 0 ? 700 : 400, color: item.penaltyAmount > 0 ? 'var(--bad)' : 'var(--text-3)' }}>
                          {item.penaltyAmount > 0 ? formatMoney(item.penaltyAmount) : 'لا يوجد'}
                        </td>

                        <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: '11.5px', color: 'var(--text-3)' }}>
                          {item.notes || '—'}
                        </td>

                        <td style={{ padding: '12px 14px', textAlign: 'left' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            {item.statementObj ? (
                              <>
                                {!item.dateSubmitted && canSubmit && (
                                  <button
                                    type="button"
                                    onClick={() => onMarkSubmitted(item.statementObj!.id)}
                                    className="btn btn-go"
                                    style={{ padding: '2px 8px', fontSize: '11px' }}
                                  >
                                    تسجيل التقديم
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => onEditYear(item.statementObj!)}
                                  className="btn btn-ghost"
                                  style={{ padding: '2px 6px', fontSize: '11px' }}
                                >
                                  ✏️ تعديل
                                </button>
                                {canDelete && (
                                  <button
                                    type="button"
                                    onClick={() => onDeleteYear(item.statementObj!.id)}
                                    style={{ border: 'none', background: 'none', color: 'var(--bad)', cursor: 'pointer', fontSize: '11px' }}
                                  >
                                    🗑 حذف
                                  </button>
                                )}
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={onAddYear}
                                className="btn btn-go"
                                style={{ padding: '2px 8px', fontSize: '11px' }}
                              >
                                ➕ إثبات الميزانية
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Sticky Footer */}
        <div className="modal-foot" style={{ flex: 'none', borderTop: '1px solid var(--line-soft)', padding: '14px 20px', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            type="button"
            onClick={onAddYear}
            className="btn btn-primary"
            style={{ padding: '6px 16px', fontSize: '12.5px' }}
          >
            <Icon name="plus" />
            <span>إضافة سنة جديدة لهذه الشركة</span>
          </button>

          <button type="button" onClick={onClose} className="btn btn-ghost">
            إغلاق
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
