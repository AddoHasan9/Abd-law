'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'
import { formatMoney } from '@/lib/constants'
import { getFinancialStatementsAction } from '@/app/(app)/commercial/financial-statements/actions'
import { calculateRequiredFSForCompanies } from '@/lib/financial-statements/erp'
import type { Company, FinancialStatement } from '@/types/database'

interface Props {
  companies?: Company[]
}

export default function FinancialStatementsWidget({ companies = [] }: Props) {
  const [statements, setStatements] = useState<FinancialStatement[]>([])
  const [loading, setLoading] = useState(true)

  const fetchStatements = useCallback(async () => {
    setLoading(true)
    const res = await getFinancialStatementsAction()
    setLoading(false)
    if (res.success) {
      setStatements(res.data)
    }
  }, [])

  useEffect(() => {
    fetchStatements()
  }, [fetchStatements])

  // Calculate ERP metrics
  const requiredItems = calculateRequiredFSForCompanies(companies, statements)
  const totalRequired = requiredItems.length
  const nearDeadlineItems = requiredItems.filter(x => x.status === 'due_soon')
  const penaltyRunningItems = requiredItems.filter(x => x.status === 'penalty_running' || x.status === 'penalty_max')
  const totalPenaltyAmount = penaltyRunningItems.reduce((acc, curr) => acc + curr.penaltyAmount, 0)

  return (
    <div className="card card-pad" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'var(--accent-soft)',
              color: 'var(--accent)',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Icon name="doc" />
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
              ملخص الحسابات الختامية (ERP Overview)
            </h3>
            <span style={{ fontSize: '11.5px', color: 'var(--text-3)' }}>
              المهلة القانونية: 7 تشرين الأول (07/10) لكل سنة مالية
            </span>
          </div>
        </div>

        <Link
          href="/commercial/financial-statements"
          className="btn btn-ghost"
          style={{ padding: '6px 12px', fontSize: '12.5px', color: 'var(--accent)', fontWeight: 700 }}
        >
          <span>عرض وحدة الحسابات الختامية ←</span>
        </Link>
      </div>

      {/* 4 Clean Summary Cards (Clicking opens /commercial/financial-statements) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
        <Link
          href="/commercial/financial-statements"
          style={{ textDecoration: 'none' }}
        >
          <div
            style={{
              padding: '14px',
              background: 'var(--surface-2)',
              border: '1px solid var(--line-soft)',
              borderRadius: 'var(--r-md)',
              transition: 'transform 0.15s ease',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontSize: '11.5px', color: 'var(--text-3)', fontWeight: 600 }}>الميزانيات المستحقة للعام</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--accent)', marginTop: '4px' }}>
              {totalRequired} ميزانية
            </div>
            <span style={{ fontSize: '11px', color: 'var(--accent)', marginTop: '4px', display: 'block' }}>
              تأكيد وتتبع المطلوبة ←
            </span>
          </div>
        </Link>

        <Link
          href="/commercial/financial-statements"
          style={{ textDecoration: 'none' }}
        >
          <div
            style={{
              padding: '14px',
              background: 'var(--warn-soft)',
              border: '1px solid var(--warn)',
              borderRadius: 'var(--r-md)',
              transition: 'transform 0.15s ease',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontSize: '11.5px', color: 'var(--warn)', fontWeight: 600 }}>تقترب من المهلة (07/10)</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--warn)', marginTop: '4px' }}>
              {nearDeadlineItems.length} شركة
            </div>
            <span style={{ fontSize: '11px', color: 'var(--warn)', marginTop: '4px', display: 'block' }}>
              متابعة التواصل ←
            </span>
          </div>
        </Link>

        <Link
          href="/commercial/financial-statements"
          style={{ textDecoration: 'none' }}
        >
          <div
            style={{
              padding: '14px',
              background: 'var(--bad-soft)',
              border: '1px solid var(--bad)',
              borderRadius: 'var(--r-md)',
              transition: 'transform 0.15s ease',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontSize: '11.5px', color: 'var(--bad)', fontWeight: 600 }}>الشركات الخاضعة للغرامة</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--bad)', marginTop: '4px' }}>
              {penaltyRunningItems.length} شركة
            </div>
            <span style={{ fontSize: '11px', color: 'var(--bad)', marginTop: '4px', display: 'block' }}>
              تراكم الغرامات اليومية ←
            </span>
          </div>
        </Link>

        <Link
          href="/commercial/financial-statements"
          style={{ textDecoration: 'none' }}
        >
          <div
            style={{
              padding: '14px',
              background: 'var(--surface-2)',
              border: '1px solid var(--line-soft)',
              borderRadius: 'var(--r-md)',
              transition: 'transform 0.15s ease',
              cursor: 'pointer',
            }}
          >
            <div style={{ fontSize: '11.5px', color: 'var(--text-3)', fontWeight: 600 }}>إجمالي الغرامات المحسوبة</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--bad)', marginTop: '4px' }}>
              {loading ? '...' : formatMoney(totalPenaltyAmount)}
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '4px', display: 'block' }}>
              تتبع السجل الكامل ←
            </span>
          </div>
        </Link>
      </div>
    </div>
  )
}
