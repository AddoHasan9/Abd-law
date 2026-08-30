'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Icon } from '@/components/ui/Icon'
import { Empty } from '@/components/ui/Empty'
import {
  getCompanyIDsAction,
  deleteCompanyIDAction,
  CompanyIDRecord,
} from '@/app/(app)/commercial/ids/actions'
import type { Company } from '@/types/database'
import AddIDModal from '@/components/commercial/AddIDModal'
import { usePermissions } from '@/lib/context/UserRoleContext'

interface Props {
  companies: Company[]
  initialCompanyId?: string
}

const ID_TYPE_CONFIG: Record<string, { label: string; icon: string; tagClass: string; color: string }> = {
  chamber_id: { label: 'هوية الغرفة التجارية', icon: 'badge', tagClass: 'tag-orange', color: '#F97316' },
  tax_id: { label: 'هوية ضريبية', icon: 'doc', tagClass: 'tag-ok', color: '#10B981' },
  importer_id: { label: 'هوية مستورد', icon: 'globe', tagClass: 'tag-blue', color: '#0284C7' },
  planning_id: { label: 'هوية التخطيط', icon: 'build', tagClass: 'tag-warn', color: '#F59E0B' },
}

export default function IDsClient({ companies = [], initialCompanyId }: Props) {
  const { can, isSuperAdmin, isAdmin } = usePermissions()
  const canCreateID = can('government_ids', 'create') || isSuperAdmin || isAdmin
  const canDeleteID = can('government_ids', 'delete') || isSuperAdmin || isAdmin
  const [records, setRecords] = useState<CompanyIDRecord[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'done' | 'expiring'>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [focusedCompanyId, setFocusedCompanyId] = useState<string | null>(initialCompanyId || null)

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalIdType, setModalIdType] = useState<'importer_id' | 'tax_id' | 'planning_id' | 'chamber_id'>('chamber_id')
  const [selectedCompanyForModal, setSelectedCompanyForModal] = useState<Company | null>(null)
  const [editingRecord, setEditingRecord] = useState<CompanyIDRecord | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    const res = await getCompanyIDsAction()
    setLoading(false)
    if (res.success) {
      setRecords(res.data)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Helper to calculate days remaining
  const calculateDaysRemaining = (expiryDateStr?: string | null) => {
    if (!expiryDateStr) return null
    const exp = new Date(expiryDateStr).getTime()
    const now = Date.now()
    return Math.ceil((exp - now) / (1000 * 60 * 60 * 24))
  }

  const handleDelete = async (id: string, name?: string | null) => {
    if (!confirm(`هل أنت متأكد من حذف معاملة/سجل الهوية لشركة «${name || 'المحددة'}»؟`)) return
    await deleteCompanyIDAction(id)
    loadData()
  }

  const openAddModal = (
    type: 'importer_id' | 'tax_id' | 'planning_id' | 'chamber_id',
    targetCompany?: Company | null
  ) => {
    setEditingRecord(null)
    setModalIdType(type)
    setSelectedCompanyForModal(targetCompany || (focusedCompanyId ? companies.find(c => c.id === focusedCompanyId) || null : null))
    setIsModalOpen(true)
  }

  const openEditModal = (record: CompanyIDRecord) => {
    setEditingRecord(record)
    setModalIdType(record.id_type)
    setSelectedCompanyForModal(companies.find(c => c.id === record.company_id) || null)
    setIsModalOpen(true)
  }

  // KPI Statistics
  const stats = useMemo(() => {
    const total = records.length
    let inProgress = 0
    let done = 0
    let expiring = 0

    records.forEach(r => {
      const isComplete = r.status === 'done' || Boolean(r.id_number || r.issue_date)
      if (!isComplete || r.status === 'in_progress') {
        inProgress++
      } else {
        done++
        const days = calculateDaysRemaining(r.expiry_date)
        if (days !== null && days <= 60) {
          expiring++
        }
      }
    })

    return { total, inProgress, done, expiring }
  }, [records])

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const isComplete = r.status === 'done' || Boolean(r.id_number || r.issue_date)
      const days = calculateDaysRemaining(r.expiry_date)

      // Status filter
      if (statusFilter === 'in_progress' && (isComplete && r.status !== 'in_progress')) return false
      if (statusFilter === 'done' && (!isComplete || r.status === 'in_progress')) return false
      if (statusFilter === 'expiring' && (!isComplete || days === null || days > 60)) return false

      // Type filter
      if (typeFilter !== 'all' && r.id_type !== typeFilter) return false

      // Focused Company
      if (focusedCompanyId && r.company_id !== focusedCompanyId) return false

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase()
        const coName = (r.company_name || '').toLowerCase()
        const idNum = (r.id_number || '').toLowerCase()
        const mgr = (r.manager_name || '').toLowerCase()
        return coName.includes(q) || idNum.includes(q) || mgr.includes(q)
      }

      return true
    })
  }, [records, statusFilter, typeFilter, focusedCompanyId, searchQuery])

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in-up">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between w-full gap-4 pb-3 border-b border-[var(--line-soft)]">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[var(--surface-2)] border border-[var(--glass-border)] text-amber-500 flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[22px]">badge</span>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[var(--text)]">وحدة الهويات والتراخيص</h1>
              <p className="text-xs md:text-sm text-[var(--text-3)]">
                متابعة دورة حياة إصدار وتجديد هويات الغرفة التجارية، الهوية الضريبية، هوية المستورد، والتخطيط للشركات
              </p>
            </div>
          </div>
        </div>

        {/* 4 Dedicated ID Action Buttons */}
        {canCreateID && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => openAddModal('chamber_id')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all active:scale-95"
            >
              <Icon name="plus" />
              <span>هوية غرفة التجارة</span>
            </button>

            <button
              type="button"
              onClick={() => openAddModal('tax_id')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[var(--accent)] hover:opacity-90 text-white shadow-xs transition-all active:scale-95"
            >
              <Icon name="plus" />
              <span>هوية ضريبية</span>
            </button>

            <button
              type="button"
              onClick={() => openAddModal('importer_id')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text)] border border-[var(--line-soft)] transition-all active:scale-95"
            >
              <Icon name="plus" />
              <span>هوية مستورد</span>
            </button>

            <button
              type="button"
              onClick={() => openAddModal('planning_id')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text)] border border-[var(--line-soft)] transition-all active:scale-95"
            >
              <Icon name="plus" />
              <span>هوية تخطيط</span>
            </button>
          </div>
        )}
      </div>

      {/* Focused Company Banner if routed from company */}
      {focusedCompanyId && (
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--accent-soft)] border border-[var(--accent)] text-[var(--accent)] text-xs font-bold shadow-xs">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">filter_alt</span>
            <span>عرض هويات شركة: <strong>{companies.find(c => c.id === focusedCompanyId)?.name || 'الشركة المحددة'}</strong></span>
          </div>
          <button
            type="button"
            onClick={() => setFocusedCompanyId(null)}
            className="px-3 py-1 rounded-lg bg-[var(--surface)] text-[var(--accent)] text-xs font-bold border border-[var(--accent)]/30 hover:bg-[var(--surface-2)] transition-all"
          >
            إلغاء التحديد وعرض كافة الشركات
          </button>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 w-full">
        <div
          onClick={() => setStatusFilter('all')}
          className={`glass-card p-4 rounded-[20px] cursor-pointer transition-all duration-200 block border ${statusFilter === 'all' ? 'border-[var(--accent)] shadow-md bg-[var(--surface-2)]' : 'border-[var(--glass-border)] bg-[var(--surface)] hover:-translate-y-0.5'}`}
        >
          <div className="text-[11.5px] font-bold text-[var(--text-3)] mb-1">إجمالي الهويات المسجلة</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[var(--text)] num">{stats.total}</div>
        </div>

        <div
          onClick={() => setStatusFilter('in_progress')}
          className={`glass-card p-4 rounded-[20px] cursor-pointer transition-all duration-200 block border ${statusFilter === 'in_progress' ? 'border-amber-500 shadow-md bg-amber-500/10' : 'border-[var(--glass-border)] bg-[var(--surface)] hover:-translate-y-0.5'}`}
        >
          <div className="text-[11.5px] font-bold text-amber-600 dark:text-amber-400 mb-1 flex items-center gap-1.5">
            <span className="w-3 h-3 border-2 border-amber-500/40 border-t-amber-400 rounded-full animate-spin inline-block" />
            <span>قيد الإصدار</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400 num">{stats.inProgress}</div>
        </div>

        <div
          onClick={() => setStatusFilter('done')}
          className={`glass-card p-4 rounded-[20px] cursor-pointer transition-all duration-200 block border ${statusFilter === 'done' ? 'border-emerald-500 shadow-md bg-emerald-500/10' : 'border-[var(--glass-border)] bg-[var(--surface)] hover:-translate-y-0.5'}`}
        >
          <div className="text-[11.5px] font-bold text-emerald-600 dark:text-emerald-400 mb-1">المكتملة والسارية ✓</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 num">{stats.done}</div>
        </div>

        <div
          onClick={() => setStatusFilter('expiring')}
          className={`glass-card p-4 rounded-[20px] cursor-pointer transition-all duration-200 block border ${statusFilter === 'expiring' ? 'border-rose-500 shadow-md bg-rose-500/10' : 'border-[var(--glass-border)] bg-[var(--surface)] hover:-translate-y-0.5'}`}
        >
          <div className="text-[11.5px] font-bold text-rose-600 dark:text-rose-400 mb-1">تتطلب تجديداً ⚠️</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400 num">{stats.expiring}</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--glass-border)] shadow-xs">
        
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 bg-[var(--surface-2)] p-1 rounded-xl border border-[var(--line-soft)] flex-wrap">
          {[
            { id: 'all', label: 'الكل', count: stats.total },
            { id: 'in_progress', label: 'قيد الإصدار', count: stats.inProgress, isProgress: true },
            { id: 'done', label: 'المكتملة ✓', count: stats.done },
            { id: 'expiring', label: 'تتطلب تجديداً ⚠️', count: stats.expiring },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id as typeof statusFilter)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${statusFilter === tab.id ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs border border-[var(--glass-border)]' : 'text-[var(--text-3)] hover:text-[var(--text)]'}`}
            >
              {tab.isProgress && <span className="w-2.5 h-2.5 border-1.5 border-amber-500/40 border-t-amber-400 rounded-full animate-spin inline-block" />}
              <span>{tab.label}</span>
              <span className="mr-1 num text-[11px] opacity-75">({tab.count})</span>
            </button>
          ))}
        </div>

        {/* Type & Search */}
        <div className="flex items-center gap-2.5 flex-wrap w-full sm:w-auto">
          <select
            className="input text-xs"
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            style={{ minWidth: '150px' }}
          >
            <option value="all">كافة أنواع الهويات</option>
            <option value="chamber_id">هوية الغرفة التجارية</option>
            <option value="tax_id">هوية ضريبية</option>
            <option value="importer_id">هوية مستورد</option>
            <option value="planning_id">هوية التخطيط</option>
          </select>

          <input
            type="text"
            className="input text-xs"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="بحث باسم الشركة، الرقم، أو المدير..."
            style={{ width: '220px' }}
          />
        </div>
      </div>

      {/* Table Records */}
      <div className="glass-card p-0 rounded-[24px] overflow-hidden border border-[var(--glass-border)] bg-[var(--surface)] shadow-xs">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-3)' }}>
            <div className="skeleton" style={{ width: '120px', height: '16px', margin: '0 auto 12px' }} />
            جاري جلب سجلات وتحديثات الهويات...
          </div>
        ) : filteredRecords.length === 0 ? (
          <div style={{ padding: '50px 20px' }}>
            <Empty
              icon="badge"
              title="لا توجد هويات في هذا القسم"
              text={searchQuery ? 'لا توجد نتائج تطابق بحثك الحالي.' : 'يمكنك بدء معاملة إصدار هوية جديدة من الأزرار بالأعلى.'}
            />
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--line)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>الشركة</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>نوع الهوية</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>المدير المفوض</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>الدرجة</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>بدء المعاملة</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>رقم الهوية</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>الإصدار والانتهاء</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>الحالة</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map(r => {
                  const typeMeta = ID_TYPE_CONFIG[r.id_type] || { label: r.id_type, tagClass: 'tag-gray', color: '#64748B' }
                  const isDone = r.status === 'done' || Boolean(r.id_number || r.issue_date)
                  const daysRemaining = calculateDaysRemaining(r.expiry_date)
                  const isExpiringSoon = daysRemaining !== null && daysRemaining <= 60 && daysRemaining > 0
                  const isExpired = daysRemaining !== null && daysRemaining <= 0

                  return (
                    <tr
                      key={r.id}
                      style={{
                        borderBottom: '1px solid var(--line-soft)',
                        background: !isDone ? 'rgba(245, 158, 11, 0.02)' : 'transparent',
                        transition: 'background 0.15s',
                      }}
                      className="hover:bg-[var(--surface-2)]"
                    >
                      {/* Company Name */}
                      <td style={{ padding: '14px 16px', fontWeight: 700 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              background: 'var(--accent-soft)',
                              color: 'var(--accent)',
                              display: 'grid',
                              placeItems: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <span className="material-symbols-outlined text-[18px]">domain</span>
                          </div>
                          <span style={{ color: 'var(--text)', fontWeight: 800, fontSize: '13.5px' }}>
                            {r.company_name || 'شركة غير معرفة'}
                          </span>
                        </div>
                      </td>

                      {/* ID Type */}
                      <td style={{ padding: '14px', textAlign: 'center' }}>
                        <span className="badge-type">
                          {typeMeta.label}
                        </span>
                      </td>

                      {/* Manager */}
                      <td style={{ padding: '14px', textAlign: 'center', color: 'var(--text-2)', fontWeight: 600 }}>
                        {r.manager_name || '—'}
                      </td>

                      {/* Chamber Grade */}
                      <td style={{ padding: '14px', textAlign: 'center' }}>
                        {r.id_type === 'chamber_id' && r.grade ? (
                          <span style={{ fontWeight: 800, color: 'var(--accent)', fontSize: '12px' }}>درجة {r.grade}</span>
                        ) : (
                          <span style={{ color: 'var(--text-3)' }}>—</span>
                        )}
                      </td>

                      {/* Start Date */}
                      <td style={{ padding: '14px', textAlign: 'center', color: 'var(--text-3)', fontSize: '12px' }}>
                        {r.tx_start_date || r.created_at.slice(0, 10)}
                      </td>

                      {/* ID Number */}
                      <td style={{ padding: '14px', textAlign: 'center' }}>
                        {r.id_number ? (
                          <span className="num" style={{ fontWeight: 800, color: 'var(--text-1)', background: 'var(--surface-2)', padding: '2px 8px', borderRadius: '4px' }}>
                            {r.id_number}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-3)', fontSize: '11.5px' }}>قيد الإجراء</span>
                        )}
                      </td>

                      {/* Issue & Expiry Dates */}
                      <td style={{ padding: '14px', textAlign: 'center', fontSize: '12px' }}>
                        {r.issue_date || r.expiry_date ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}>
                            {r.issue_date && <span>إصدار: <strong className="num">{r.issue_date}</strong></span>}
                            {r.expiry_date && (
                              <span style={{ color: isExpired ? 'var(--bad)' : isExpiringSoon ? 'var(--warn)' : 'var(--text-2)' }}>
                                انتهاء: <strong className="num">{r.expiry_date}</strong>
                              </span>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-3)', fontSize: '11.5px' }}>قيد الإجراء</span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td style={{ padding: '14px', textAlign: 'center' }}>
                        {r.status === 'lacks' ? (
                          <span className="badge-late">
                            ⚠️ بها نواقص
                          </span>
                        ) : r.status === 'paused' ? (
                          <span className="badge-waiting">
                            ⏸️ متوقفة مؤقتاً
                          </span>
                        ) : !isDone || r.status === 'in_progress' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.15)]">
                            <span className="w-3.5 h-3.5 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin flex-none" />
                            <span>قيد الإصدار</span>
                          </span>
                        ) : isExpired ? (
                          <span className="badge-late">
                            ✕ منتهية الصلاحية
                          </span>
                        ) : isExpiringSoon ? (
                          <span className="badge-waiting">
                            ⚠️ قريبة الانتهاء ({daysRemaining} يوم)
                          </span>
                        ) : (
                          <span className="badge-completed">
                            ✓ مكتملة وسارية
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px', textAlign: 'left', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {!isDone && (
                            <button
                              type="button"
                              onClick={() => openEditModal(r)}
                              className="btn btn-go"
                              style={{ padding: '4px 10px', fontSize: '12px', fontWeight: 700 }}
                              title="إكمال بيانات الهوية وتاريخ الإصدار والانتهاء"
                            >
                              <span>إكمال الهوية ✓</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openEditModal(r)}
                            className="btn btn-ghost"
                            style={{ padding: '4px 8px', fontSize: '12px', fontWeight: 700 }}
                            title="تعديل بيانات الهوية"
                          >
                            ✎ تعديل
                          </button>
                          {canDeleteID && (
                            <button
                              type="button"
                              onClick={() => handleDelete(r.id, r.company_name)}
                              className="btn btn-ghost"
                              style={{ padding: '4px 8px', fontSize: '12px', color: 'var(--bad)', fontWeight: 700 }}
                              title="حذف الهوية"
                            >
                              ✕
                            </button>
                          )}
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

      {/* Add / Edit ID Modal */}
      {isModalOpen && (
        <AddIDModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setEditingRecord(null)
            loadData()
          }}
          companies={companies}
          initialIdType={modalIdType}
          initialCompany={selectedCompanyForModal}
          record={editingRecord}
          onSaved={() => loadData()}
        />
      )}
    </div>
  )
}
