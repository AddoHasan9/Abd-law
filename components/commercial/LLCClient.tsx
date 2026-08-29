'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'
import { Empty } from '@/components/ui/Empty'
import { WorkflowStatus } from '@/components/ui/WorkflowStatus'
import type { TransactionFull, Company } from '@/types/database'
import AddLLCTransactionModal, { LLC_TX_TYPES } from './AddLLCTransactionModal'
import LLCTransactionDetailsModal from './LLCTransactionDetailsModal'
import { formatDate, formatMoney } from '@/lib/constants'
import { deleteTransactionAction } from '@/app/(app)/commercial/actions'

interface Props {
  transactions: TransactionFull[]
  companies: Company[]
  lawyers?: Array<{ id: string; name: string }>
}

const LLC_TYPE_KEYS = new Set([
  'capital-up',
  'share-sale',
  'certify',
  'mgr-renew',
  'activity',
  'relocation',
  'final-acc',
])

const LLC_TYPE_BADGES: Record<string, { label: string; bg: string; color: string; border: string }> = {
  'capital-up': { label: 'زيادة رأس المال', bg: 'rgba(99, 102, 241, 0.08)', color: '#4f46e5', border: '1px solid rgba(99, 102, 241, 0.25)' },
  'share-sale': { label: 'بيع أسهم', bg: 'rgba(249, 115, 22, 0.08)', color: '#ea580c', border: '1px solid rgba(249, 115, 22, 0.25)' },
  'certify': { label: 'تصديق الأوراق', bg: 'rgba(16, 185, 129, 0.08)', color: '#059669', border: '1px solid rgba(16, 185, 129, 0.25)' },
  'mgr-renew': { label: 'استمرار تعيين', bg: 'rgba(168, 85, 247, 0.08)', color: '#9333ea', border: '1px solid rgba(168, 85, 247, 0.25)' },
  'activity': { label: 'إضافة وحذف نشاط', bg: 'rgba(6, 182, 212, 0.08)', color: '#0891b2', border: '1px solid rgba(6, 182, 212, 0.25)' },
  'relocation': { label: 'نقل مقر', bg: 'rgba(245, 158, 11, 0.08)', color: '#d97706', border: '1px solid rgba(245, 158, 11, 0.25)' },
  'final-acc': { label: 'حسابات ختامية', bg: 'rgba(20, 184, 166, 0.08)', color: '#0d9488', border: '1px solid rgba(20, 184, 166, 0.25)' },
}

export default function LLCClient({ transactions = [], companies = [], lawyers = [] }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedInitialType, setSelectedInitialType] = useState('capital-up')

  // Edit / Details Modal State
  const [selectedTxForEdit, setSelectedTxForEdit] = useState<TransactionFull | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  // Filter transactions belonging to LLC
  const llcTransactions = transactions.filter(t => LLC_TYPE_KEYS.has(t.type))

  const filteredTransactions = llcTransactions.filter(t => {
    if (activeTab !== 'all' && t.type !== activeTab) return false

    const coName = t.companies?.name || ''
    const desc = t.description || ''
    const lacks = t.lacks || ''
    const match =
      coName.toLowerCase().includes(searchTerm.trim().toLowerCase()) ||
      desc.toLowerCase().includes(searchTerm.trim().toLowerCase()) ||
      lacks.toLowerCase().includes(searchTerm.trim().toLowerCase())

    return match
  })

  const handleDelete = async (txId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه المعاملة؟')) return
    await deleteTransactionAction(txId)
    router.refresh()
  }

  const openAddModal = (typeKey?: string) => {
    setSelectedInitialType(typeKey || 'capital-up')
    setIsAddModalOpen(true)
  }

  const openEditModal = (tx: TransactionFull) => {
    setSelectedTxForEdit(tx)
    setIsEditModalOpen(true)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px' }}>
      
      {/* Header & Main Action */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="material-symbols-outlined text-[26px] text-[var(--accent)]">corporate_fare</span>
            <span>قسم المحدودة (معاملات الشركات المحدودة)</span>
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '4px 0 0 0' }}>
            إدارة ومتابعة كافة معاملات المحدودة: زيادة رأس المال، بيع الأسهم، تصديق الأوراق، استمرار التعيين، النشاط، نقل المقر، والحسابات الختامية
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => openAddModal()}
            style={{ padding: '8px 16px', fontSize: '13.5px', fontWeight: 700 }}
          >
            <Icon name="plus" />
            <span>معاملة جديدة</span>
          </button>
        </div>
      </div>

      {/* 7 Quick Action Buttons for LLC Transactions */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {LLC_TX_TYPES.map(t => {
          const count = llcTransactions.filter(x => x.type === t.id).length
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => openAddModal(t.id)}
              className="btn btn-ghost"
              style={{ fontSize: '12px', padding: '6px 12px', background: 'var(--surface-2)', border: '1px solid var(--line-soft)' }}
              title={`إضافة معاملة ${t.label} جديدة`}
            >
              <Icon name="plus" />
              <span>{t.label}</span>
              <span className="nav-num" style={{ marginRight: '6px', fontSize: '11px' }}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* Filter Tabs & Search */}
      <div className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ position: 'relative', minWidth: '280px', flex: 1, maxWidth: '400px' }}>
          <input
            type="text"
            className="input"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="ابحث باسم الشركة، الوصف، أو النواقص..."
            style={{ paddingRight: '36px', fontSize: '13px' }}
          />
          <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }}>
            <Icon name="search" />
          </span>
        </div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`btn ${activeTab === 'all' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            الكل ({llcTransactions.length})
          </button>
          {LLC_TX_TYPES.map(t => {
            const count = llcTransactions.filter(x => x.type === t.id).length
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className={`btn ${activeTab === t.id ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '12px', padding: '6px 12px' }}
              >
                {t.label} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {/* Table of Transactions */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filteredTransactions.length === 0 ? (
          <div style={{ padding: '32px' }}>
            <Empty
              icon="badge"
              title="لا توجد معاملات مسجلة في هذا التصنيف"
              text="اضغط زر «معاملة جديدة» لإدراج معاملة جديدة في قسم المحدودة واختيار شركة مسجلة أو إدخال يدوي."
            />
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--line)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>الشركة (اضغط للتفاصيل)</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>نوع المعاملة</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>المدير المفوض</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>تاريخ البدء بالتكليف</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>تفاصيل / النواقص</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>الحالة</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>الأتعاب</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map(tx => {
                  const typeMeta = LLC_TYPE_BADGES[tx.type] || { label: tx.type, tagClass: 'tag-gray' }

                  // Custom detail subtitle for capital-up or share-sale
                  let customDetail = ''
                  if (tx.type === 'capital-up' && (tx.capital_before || tx.capital_after)) {
                    customDetail = `من: ${tx.capital_before ? formatMoney(tx.capital_before) : '—'} ← إلى: ${tx.capital_after ? formatMoney(tx.capital_after) : '—'}`
                  } else if (tx.type === 'share-sale' && (tx.seller_name || tx.buyer_name)) {
                    customDetail = `البائع: ${tx.seller_name || '—'} ➔ المشتري: ${tx.buyer_name || '—'}`
                  }

                  return (
                    <tr
                      key={tx.id}
                      style={{ borderBottom: '1px solid var(--line-soft)', transition: 'background 0.15s' }}
                      className="hover:bg-[var(--surface-2)]"
                    >
                      {/* Company Name (Clickable to open Details Modal) */}
                      <td style={{ padding: '14px 16px', fontWeight: 700 }}>
                        <button
                          type="button"
                          onClick={() => openEditModal(tx)}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: 0,
                            cursor: 'pointer',
                            textAlign: 'right',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                          className="group"
                          title="اضغط لعرض وتعديل تفاصيل المعاملة"
                        >
                          <span style={{ color: 'var(--text)', fontSize: '13.5px', fontWeight: 800 }} className="group-hover:text-[var(--accent)] transition-colors">
                            {tx.companies?.name || 'شركة محدودة'}
                          </span>
                        </button>
                      </td>

                      {/* Tx Type */}
                      <td style={{ padding: '14px 14px', textAlign: 'center', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '3px 10px',
                            borderRadius: '6px',
                            background: typeMeta.bg || 'var(--surface-2)',
                            border: typeMeta.border || '1px solid var(--line-soft)',
                            color: typeMeta.color || 'var(--text)',
                            fontSize: '12px',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {typeMeta.label}
                        </span>
                      </td>

                      {/* Manager Name */}
                      <td style={{ padding: '14px 14px', textAlign: 'center', color: 'var(--text-2)', fontWeight: 600 }}>
                        {tx.companies?.manager || '—'}
                      </td>

                      {/* Start Date */}
                      <td style={{ padding: '14px 14px', textAlign: 'center', fontSize: '12px' }} className="num">
                        {tx.tx_date ? formatDate(tx.tx_date) : '—'}
                      </td>

                      {/* Details & Lacks */}
                      <td style={{ padding: '14px 14px', textAlign: 'right', maxWidth: '260px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {customDetail && (
                            <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text)' }}>
                              {customDetail}
                            </span>
                          )}
                          {tx.lacks ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--bad)', fontSize: '12px', fontWeight: 600 }}>
                              <span className="material-symbols-outlined text-[15px] flex-none">warning</span>
                              <span className="line-clamp-1" title={tx.lacks}>{tx.lacks}</span>
                            </div>
                          ) : !customDetail ? (
                            <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>لا توجد نواقص</span>
                          ) : null}
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 14px', textAlign: 'center' }}>
                        <WorkflowStatus
                          status={tx.status}
                          entityId={tx.id}
                          entityType="transaction"
                          size="sm"
                        />
                      </td>

                      {/* Fee */}
                      <td style={{ padding: '14px 14px', textAlign: 'center', fontWeight: 700 }} className="num">
                        {tx.fee ? formatMoney(tx.fee) : '—'}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px', textAlign: 'left', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {tx.company_id && (
                            <Link
                              href={`/commercial/companies/${tx.company_id}`}
                              className="btn btn-primary"
                              style={{ fontSize: '12px', fontWeight: 700, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              title="فتح ملف الشركة الشامل"
                            >
                              <span>ملف 360°</span>
                              <span className="material-symbols-outlined text-[14px]">arrow_left</span>
                            </Link>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDelete(tx.id)}
                            className="btn btn-ghost"
                            style={{ color: 'var(--bad)', fontSize: '12px', padding: '4px 8px' }}
                            title="حذف المعاملة"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <AddLLCTransactionModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          companies={companies}
          initialType={selectedInitialType}
          lawyers={lawyers}
          onSuccess={() => {
            router.refresh()
          }}
        />
      )}

      {/* Edit / Details Modal */}
      {isEditModalOpen && selectedTxForEdit && (
        <LLCTransactionDetailsModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false)
            setSelectedTxForEdit(null)
          }}
          transaction={selectedTxForEdit}
          companies={companies}
          lawyers={lawyers}
          onUpdated={() => {
            router.refresh()
          }}
          onDeleted={() => {
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
