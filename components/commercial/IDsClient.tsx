'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Mi } from '@/components/ui/Mi'
import { confirmAction } from '@/components/ui/ConfirmDialog'
import { DataPanel } from '@/components/ui/DataPanel'
import CompanyFileLink from '@/components/commercial/CompanyFileLink'
import { Icon } from '@/components/ui/Icon'
import { Empty } from '@/components/ui/Empty'
import {
  getCompanyIDsAction,
  deleteCompanyIDAction,
  CompanyIDRecord,
} from '@/app/(app)/commercial/ids/actions'
import AddIDModal from '@/components/commercial/AddIDModal'
import { usePermissions } from '@/lib/context/UserRoleContext'
import { AnimatedTabs } from '@/components/ui/AnimatedTabs'
import type { Company } from '@/types/database'

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
  const { can } = usePermissions()
  const canCreateID = can('government_ids', 'create')
  const canDeleteID = can('government_ids', 'delete')
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
    if (!(await confirmAction({ title: 'حذف سجل الهوية', message: `سيُحذف سجل الهوية لشركة «${name || 'المحددة'}».`, tone: 'danger' }))) return
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
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition active:scale-95"
            >
              <Icon name="plus" />
              <span>هوية غرفة التجارة</span>
            </button>

            <button
              type="button"
              onClick={() => openAddModal('tax_id')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[var(--accent)] hover:opacity-90 text-white shadow-xs transition active:scale-95"
            >
              <Icon name="plus" />
              <span>هوية ضريبية</span>
            </button>

            <button
              type="button"
              onClick={() => openAddModal('importer_id')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text)] border border-[var(--line-soft)] transition active:scale-95"
            >
              <Icon name="plus" />
              <span>هوية مستورد</span>
            </button>

            <button
              type="button"
              onClick={() => openAddModal('planning_id')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[var(--surface-2)] hover:bg-[var(--surface-3)] text-[var(--text)] border border-[var(--line-soft)] transition active:scale-95"
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
            className="px-3 py-1 rounded-lg bg-[var(--surface)] text-[var(--accent)] text-xs font-bold border border-[color:color-mix(in_srgb,var(--accent)_30%,transparent)] hover:bg-[var(--surface-2)] transition"
          >
            إلغاء التحديد وعرض كافة الشركات
          </button>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 w-full">
        <div
          onClick={() => setStatusFilter('all')}
          className={`glass-card p-4 rounded-[20px] cursor-pointer transition duration-200 block border ${statusFilter === 'all' ? 'border-[var(--accent)] shadow-md bg-[var(--surface-2)]' : 'border-[var(--glass-border)] bg-[var(--surface)] hover:-translate-y-0.5'}`}
        >
          <div className="text-[11.5px] font-bold text-[var(--text-3)] mb-1">إجمالي الهويات المسجلة</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[var(--text)] num">{stats.total}</div>
        </div>

        <div
          onClick={() => setStatusFilter('in_progress')}
          className={`glass-card p-4 rounded-[20px] cursor-pointer transition duration-200 block border ${statusFilter === 'in_progress' ? 'border-amber-500 shadow-md bg-amber-500/10' : 'border-[var(--glass-border)] bg-[var(--surface)] hover:-translate-y-0.5'}`}
        >
          <div className="text-[11.5px] font-bold text-amber-600 dark:text-amber-400 mb-1 flex items-center gap-1.5">
            <span className="w-3 h-3 border-2 border-amber-500/40 border-t-amber-400 rounded-full animate-spin inline-block" />
            <span>قيد الإصدار</span>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-600 dark:text-amber-400 num">{stats.inProgress}</div>
        </div>

        <div
          onClick={() => setStatusFilter('done')}
          className={`glass-card p-4 rounded-[20px] cursor-pointer transition duration-200 block border ${statusFilter === 'done' ? 'border-emerald-500 shadow-md bg-emerald-500/10' : 'border-[var(--glass-border)] bg-[var(--surface)] hover:-translate-y-0.5'}`}
        >
          <div className="text-[11.5px] font-bold text-emerald-600 dark:text-emerald-400 mb-1">المكتملة والسارية ✓</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 num">{stats.done}</div>
        </div>

        <div
          onClick={() => setStatusFilter('expiring')}
          className={`glass-card p-4 rounded-[20px] cursor-pointer transition duration-200 block border ${statusFilter === 'expiring' ? 'border-rose-500 shadow-md bg-rose-500/10' : 'border-[var(--glass-border)] bg-[var(--surface)] hover:-translate-y-0.5'}`}
        >
          <div className="text-[11.5px] font-bold text-rose-600 dark:text-rose-400 mb-1"><Mi n="warning" />تتطلب تجديداً</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-rose-600 dark:text-rose-400 num">{stats.expiring}</div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--glass-border)] shadow-xs">
        
        {/* Status Tabs with Fluid Motion */}
        <AnimatedTabs<'all' | 'in_progress' | 'done' | 'expiring'>
          layoutId="ids-status-tabs"
          size="sm"
          activeTab={statusFilter}
          onChange={setStatusFilter}
          tabs={[
            { id: 'all', label: 'الكل', count: stats.total },
            { id: 'in_progress', label: 'قيد الإصدار', count: stats.inProgress },
            { id: 'done', label: 'المكتملة ✓', count: stats.done },
            { id: 'expiring', label: 'تتطلب تجديداً', count: stats.expiring },
          ]}
        />

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
      <DataPanel icon="badge" title="سجل الهويات" subtitle="هويات الضريبة والغرفة التجارية والمستورد والتخطيط" count={filteredRecords.length} total={records.length} unit="هوية">
        {loading ? (
          <div className="p-10 text-center text-[var(--text-3)]">
            <div className="skeleton w-28 h-4 mx-auto mb-3" />
            جاري جلب سجلات وتحديثات الهويات...
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-12 px-6">
            <Empty
              icon="badge"
              title="لا توجد هويات في هذا القسم"
              text={searchQuery ? 'لا توجد نتائج تطابق بحثك الحالي.' : 'يمكنك بدء معاملة إصدار هوية جديدة من الأزرار بالأعلى.'}
            />
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full border-collapse text-right text-xs table-auto">
              <thead>
                <tr className="border-b border-[var(--border-soft)] bg-[color:color-mix(in_srgb,var(--surface-2)_80%,transparent)] text-xs text-[var(--text-2)] font-bold">
                  <th className="py-3 px-3 text-right">الشركة</th>
                  <th className="py-3 px-2 text-center">نوع الهوية</th>
                  <th className="py-3 px-2 text-center">المدير المفوض</th>
                  <th className="py-3 px-2 text-center">الدرجة</th>
                  <th className="py-3 px-2 text-center">بدء المعاملة</th>
                  <th className="py-3 px-2 text-center">رقم الهوية</th>
                  <th className="py-3 px-2 text-center">الإصدار والانتهاء</th>
                  <th className="py-3 px-2 text-center">الحالة</th>
                  <th className="py-3 px-3 text-left whitespace-nowrap">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {filteredRecords.map(r => {
                  const typeMeta = ID_TYPE_CONFIG[r.id_type] || { label: r.id_type, tagClass: 'tag-gray', color: '#64748B' }
                  const isDone = r.status === 'done' || Boolean(r.id_number || r.issue_date)
                  const daysRemaining = calculateDaysRemaining(r.expiry_date)
                  const isExpiringSoon = daysRemaining !== null && daysRemaining <= 60 && daysRemaining > 0
                  const isExpired = daysRemaining !== null && daysRemaining <= 0

                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-blue-500/[0.04] dark:hover:bg-blue-500/[0.08] transition-colors duration-200"
                    >
                      {/* Company Name */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--accent-soft)] to-blue-500/10 border border-[color:color-mix(in_srgb,var(--accent)_20%,transparent)] text-[var(--accent)] flex items-center justify-center shrink-0 shadow-xs">
                            <span className="material-symbols-outlined text-[19px]">domain</span>
                          </div>
                          <span className="font-bold text-[13.5px] text-[var(--text)] leading-snug">
                            {r.company_name || 'شركة غير معرفة'}
                          </span>
                        </div>
                      </td>

                      {/* ID Type */}
                      <td className="py-3.5 px-3 text-center align-middle">
                        <span className="inline-flex items-center whitespace-nowrap px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                          {typeMeta.label}
                        </span>
                      </td>

                      {/* Manager */}
                      <td className="py-3.5 px-3 text-center align-middle text-xs font-bold text-[var(--text-2)]">
                        {r.manager_name || '—'}
                      </td>

                      {/* Chamber Grade */}
                      <td className="py-3.5 px-3 text-center align-middle">
                        {r.id_type === 'chamber_id' && r.grade ? (
                          <span className="inline-flex items-center whitespace-nowrap px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">درجة {r.grade}</span>
                        ) : (
                          <span className="text-[var(--text-3)]">—</span>
                        )}
                      </td>

                      {/* Start Date */}
                      <td className="py-3.5 px-3 text-center align-middle text-xs font-semibold text-[var(--text-2)] num whitespace-nowrap">
                        {r.tx_start_date || r.created_at.slice(0, 10)}
                      </td>

                      {/* ID Number */}
                      <td className="py-3.5 px-3 text-center align-middle">
                        {r.id_number ? (
                          <span className="num font-bold text-xs bg-[var(--surface-2)] text-[var(--text)] px-2.5 py-1 rounded-md border border-[var(--border)]">
                            {r.id_number}
                          </span>
                        ) : (
                          <span className="text-[var(--text-3)] text-xs font-medium whitespace-nowrap">قيد الإجراء</span>
                        )}
                      </td>

                      {/* Issue & Expiry Dates */}
                      <td className="py-3.5 px-3 text-center align-middle text-xs">
                        {r.issue_date || r.expiry_date ? (
                          <div className="flex flex-col gap-0.5 items-center">
                            {r.issue_date && <span>إصدار: <strong className="num text-[var(--text)]">{r.issue_date}</strong></span>}
                            {r.expiry_date && (
                              <span className={isExpired ? 'text-rose-600 font-bold' : isExpiringSoon ? 'text-amber-600 font-bold' : 'text-[var(--text-2)]'}>
                                انتهاء: <strong className="num">{r.expiry_date}</strong>
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[var(--text-3)] text-xs font-medium whitespace-nowrap">قيد الإجراء</span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-3 text-center align-middle">
                        {r.status === 'lacks' ? (
                          <span className="inline-flex items-center whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                            <Mi n="warning" />بها نواقص
                          </span>
                        ) : r.status === 'paused' ? (
                          <span className="inline-flex items-center whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 border border-amber-500/20">
                            <Mi n="pause_circle" />متوقفة مؤقتاً
                          </span>
                        ) : !isDone || r.status === 'in_progress' ? (
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                            <span className="w-2.5 h-2.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin flex-none" />
                            <span>قيد الإصدار</span>
                          </span>
                        ) : isExpired ? (
                          <span className="inline-flex items-center whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-600 border border-rose-500/30">
                            منتهية الصلاحية
                          </span>
                        ) : isExpiringSoon ? (
                          <span className="inline-flex items-center whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                            توشك على الانتهاء
                          </span>
                        ) : (
                          <span className="inline-flex items-center whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                            سارية المفعول
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-left align-middle whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {!isDone && (
                            <button
                              type="button"
                              onClick={() => openEditModal(r)}
                              className="btn btn-primary !py-1 !px-2.5 !text-xs !font-bold"
                              title="إكمال بيانات الهوية وتاريخ الإصدار والانتهاء"
                            >
                              <span>إكمال الهوية ✓</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openEditModal(r)}
                            className="btn btn-ghost !py-1 !px-2.5 !text-xs !font-bold"
                            title="تعديل تفاصيل الهوية"
                          >
                            <span className="material-symbols-outlined text-[14px]">edit</span>
                            <span>تعديل</span>
                          </button>

                          {r.company_id && (
                            <CompanyFileLink companyId={r.company_id} />
                          )}

                          {canDeleteID && (
                            <button
                              type="button"
                              onClick={() => handleDelete(r.id, r.company_name)}
                              className="btn btn-ghost !py-1 !px-2 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
                              title="حذف الهوية"
                            >
                              <span className="material-symbols-outlined text-[15px]">delete</span>
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
      </DataPanel>

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
