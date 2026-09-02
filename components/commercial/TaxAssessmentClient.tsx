'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'
import { Empty } from '@/components/ui/Empty'
import { formatDate, formatMoney } from '@/lib/constants'
import { usePermissions } from '@/lib/context/UserRoleContext'
import AddTaxAssessmentModal from './AddTaxAssessmentModal'
import { deleteTaxAssessmentAction } from '@/app/(app)/commercial/tax-assessment/actions'
import type { TaxAssessment, Company } from '@/types/database'

interface Props {
  assessments: TaxAssessment[]
  companies: Company[]
  lawyers?: Array<{ id: string; name: string }>
}

export default function TaxAssessmentClient({ assessments = [], companies = [], lawyers = [] }: Props) {
  const router = useRouter()
  const { can, isSuperAdmin, isAdmin } = usePermissions()
  const canManage = can('companies', 'create') || isSuperAdmin || isAdmin
  const canDelete = can('companies', 'delete') || isSuperAdmin || isAdmin

  const [items, setItems] = useState<TaxAssessment[]>(assessments)
  const [searchTerm, setSearchTerm] = useState('')
  const [yearFilter, setYearFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_progress' | 'tax_cleared'>('all')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<TaxAssessment | null>(null)
  const [toastMsg, setToastMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    setItems(assessments)
  }, [assessments])

  const triggerToast = (text: string, type: 'ok' | 'err' = 'ok') => {
    setToastMsg({ type, text })
    setTimeout(() => setToastMsg(null), 4000)
  }

  const currentYear = new Date().getFullYear()
  const availableYears = [currentYear - 1, currentYear - 2, currentYear - 3, currentYear - 4, currentYear - 5]

  // KPI Calculations
  const stats = {
    total: items.length,
    inProgress: items.filter(a => a.status === 'in_progress' || a.status === 'auditing' || a.status === 'assessed').length,
    cleared: items.filter(a => a.status === 'tax_cleared').length,
    totalTaxAmount: items.reduce((sum, a) => sum + (a.tax_amount_assessed || 0), 0),
  }

  const filteredItems = items.filter(item => {
    const coName = item.company_name || companies.find(c => c.id === item.company_id)?.name || ''
    const lawyer = item.assigned_lawyer_name || ''
    const branch = item.tax_branch || ''
    const fileNo = item.tax_file_number || ''
    const contracts = item.contracts_info || ''
    const imports = item.imports_info || ''

    const q = searchTerm.trim().toLowerCase()
    const matchesSearch =
      coName.toLowerCase().includes(q) ||
      lawyer.toLowerCase().includes(q) ||
      branch.toLowerCase().includes(q) ||
      fileNo.toLowerCase().includes(q) ||
      contracts.toLowerCase().includes(q) ||
      imports.toLowerCase().includes(q)

    if (!matchesSearch) return false

    if (yearFilter !== 'all' && item.year.toString() !== yearFilter) return false

    if (statusFilter === 'in_progress') {
      if (item.status === 'tax_cleared') return false
    } else if (statusFilter === 'tax_cleared') {
      if (item.status !== 'tax_cleared') return false
    }

    return true
  })

  const openAddModal = () => {
    setEditingItem(null)
    setIsModalOpen(true)
  }

  const openEditModal = (item: TaxAssessment) => {
    setEditingItem(item)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string, coName: string) => {
    if (!confirm(`هل أنت متأكد من حذف سجل التحاسب الضريبي لشركة (${coName})؟`)) return
    setItems(prev => prev.filter(i => i.id !== id))
    const res = await deleteTaxAssessmentAction(id)
    if (res.success) {
      triggerToast('تم حذف ملف التحاسب الضريبي بنجاح')
      router.refresh()
    } else {
      triggerToast(res.error || 'فشل حذف السجل', 'err')
    }
  }

  const handleExportExcel = () => {
    if (!filteredItems.length) return
    const headers = ['اسم الشركة', 'سنة التحاسب', 'المحامي المكلف', 'الفرع الضريبي', 'رقم الإضبارة', 'العقود', 'الاستيرادات', 'الضريبة المقدرة', 'الحالة', 'براءة الذمة']
    const csvRows = [
      headers.join(','),
      ...filteredItems.map(a => [
        `"${(a.company_name || '').replace(/"/g, '""')}"`,
        `"${a.year}"`,
        `"${(a.assigned_lawyer_name || 'غير معين').replace(/"/g, '""')}"`,
        `"${(a.tax_branch || '').replace(/"/g, '""')}"`,
        `"${(a.tax_file_number || '').replace(/"/g, '""')}"`,
        `"${(a.contracts_info || '').replace(/"/g, '""')}"`,
        `"${(a.imports_info || '').replace(/"/g, '""')}"`,
        `"${a.tax_amount_assessed || 0}"`,
        `"${a.status === 'tax_cleared' ? 'براءة ذمة صادرة' : 'قيد الإجراء'}"`,
        `"${(a.clearance_letter_no || '').replace(/"/g, '""')}"`,
      ].join(','))
    ]
    const blob = new Blob(['\ufeff' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tax_assessments_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-6 w-full text-right" dir="rtl">
      
      {/* Toast Alert */}
      {toastMsg && (
        <div
          className={`fixed bottom-6 left-6 z-50 px-5 py-3 rounded-2xl font-bold text-xs shadow-2xl flex items-center gap-2.5 animate-scale-in text-white ${
            toastMsg.type === 'ok' ? 'bg-emerald-600 border border-emerald-400/40 shadow-emerald-600/30' : 'bg-red-600 border border-red-400/40 shadow-red-600/30'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {toastMsg.type === 'ok' ? 'check_circle' : 'error'}
          </span>
          <span>{toastMsg.text}</span>
        </div>
      )}

      {/* Commercial 7 Sub-Departments Navigation Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        <Link
          href="/commercial/companies-registry"
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-[var(--surface)] border border-[var(--border)] text-[var(--text-2)] hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--surface-2)] transition-all shadow-2xs flex-none"
        >
          <Icon name="build2" />
          <span>الشركات</span>
        </Link>
        <Link
          href="/commercial/companies"
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-[var(--surface)] border border-[var(--border)] text-[var(--text-2)] hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--surface-2)] transition-all shadow-2xs flex-none"
        >
          <Icon name="build" />
          <span>الشركات وتأسيسها</span>
        </Link>
        <Link
          href="/commercial/deposits"
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-[var(--surface)] border border-[var(--border)] text-[var(--text-2)] hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--surface-2)] transition-all shadow-2xs flex-none"
        >
          <Icon name="vault" />
          <span>إطلاق الوديعة</span>
        </Link>
        <Link
          href="/commercial/llc"
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-[var(--surface)] border border-[var(--border)] text-[var(--text-2)] hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--surface-2)] transition-all shadow-2xs flex-none"
        >
          <Icon name="badge" />
          <span>قسم المحدودة</span>
        </Link>
        <Link
          href="/commercial/ids"
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-[var(--surface)] border border-[var(--border)] text-[var(--text-2)] hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--surface-2)] transition-all shadow-2xs flex-none"
        >
          <Icon name="stamp" />
          <span>قسم الهويات</span>
        </Link>
        <Link
          href="/commercial/tax-assessment"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black bg-[var(--accent)] text-white border border-[var(--accent)] shadow-xs flex-none"
        >
          <Icon name="scale" />
          <span>التحاسب الضريبي</span>
        </Link>
        <Link
          href="/commercial/financial-statements"
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-[var(--surface)] border border-[var(--border)] text-[var(--text-2)] hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--surface-2)] transition-all shadow-2xs flex-none"
        >
          <Icon name="doc" />
          <span>الحسابات الختامية</span>
        </Link>
      </div>

      {/* Page Header Banner */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-2 border-b border-[var(--line-soft)]">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-[var(--accent-soft)] border border-[var(--accent)]/20 flex items-center justify-center text-[var(--accent)] shadow-xs flex-none">
            <span className="material-symbols-outlined text-[24px]">receipt_long</span>
          </div>
          <div>
            <h1 className="text-xl font-black text-[var(--text)] tracking-tight">قسم التحاسب الضريبي</h1>
            <p className="text-xs text-[var(--text-3)] font-medium mt-0.5">
              متابعة التحاسب السنوي عن العقود والاستيرادات في الهيئة العامة للضرائب وإصدار براءات الذمة
            </p>
          </div>
        </div>

        {canManage && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={openAddModal}
              className="btn btn-primary shadow-xs flex items-center gap-2"
            >
              <Icon name="plus" />
              <span>إضافة تحاسب ضريبي</span>
            </button>
          </div>
        )}
      </div>

      {/* Quick KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 w-full">
        <div
          onClick={() => setStatusFilter('all')}
          className={`p-4 rounded-2xl cursor-pointer transition-all duration-200 block border ${statusFilter === 'all' ? 'border-[var(--accent)] shadow-xs bg-[var(--surface-2)] ring-2 ring-[var(--accent)]/15' : 'border-[var(--border)] bg-[var(--surface)] hover:-translate-y-0.5 shadow-2xs'}`}
        >
          <div className="text-[11.5px] font-bold text-[var(--text-3)] mb-1">إجمالي ملفات التحاسب</div>
          <div className="text-2xl sm:text-3xl font-black text-[var(--text)] num">{stats.total}</div>
        </div>

        <div
          onClick={() => setStatusFilter('in_progress')}
          className={`p-4 rounded-2xl cursor-pointer transition-all duration-200 block border ${statusFilter === 'in_progress' ? 'border-amber-500 shadow-xs bg-amber-500/10 ring-2 ring-amber-500/15' : 'border-[var(--border)] bg-[var(--surface)] hover:-translate-y-0.5 shadow-2xs'}`}
        >
          <div className="text-[11.5px] font-bold text-amber-600 dark:text-amber-400 mb-1 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 border-2 border-amber-500/40 border-t-amber-500 rounded-full animate-spin inline-block" />
            <span>قيد المراجعة والإجراء</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 num">{stats.inProgress}</div>
        </div>

        <div
          onClick={() => setStatusFilter('tax_cleared')}
          className={`p-4 rounded-2xl cursor-pointer transition-all duration-200 block border ${statusFilter === 'tax_cleared' ? 'border-emerald-500 shadow-xs bg-emerald-500/10 ring-2 ring-emerald-500/15' : 'border-[var(--border)] bg-[var(--surface)] hover:-translate-y-0.5 shadow-2xs'}`}
        >
          <div className="text-[11.5px] font-bold text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-1">
            <Icon name="check" style={{ width: '14px', height: '14px' }} />
            <span>براءة ذمة صادرة</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 num">{stats.cleared}</div>
        </div>

        <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xs">
          <div className="text-[11.5px] font-bold text-[var(--accent)] mb-1">إجمالي الضرائب المقدرة</div>
          <div className="text-xl sm:text-2xl font-black text-[var(--accent)] num">{formatMoney(stats.totalTaxAmount)}</div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="p-3.5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        
        {/* Search Input */}
        <div className="relative flex-1 min-w-[280px]">
          <input
            type="text"
            className="input pr-10"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="ابحث بالاسم، المحامي، الفرع الضريبي، رقم الإضبارة، العقود، أو الاستيرادات..."
          />
          <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-3)]">
            search
          </span>
        </div>

        {/* Year Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          <button
            type="button"
            onClick={() => setYearFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              yearFilter === 'all'
                ? 'bg-[#38BDF8] text-slate-950 font-black shadow-sm'
                : 'bg-[var(--surface-2)] text-[var(--text-3)] hover:text-[var(--text)]'
            }`}
          >
            كل السنوات
          </button>
          {availableYears.map(yr => (
            <button
              key={yr}
              type="button"
              onClick={() => setYearFilter(yr.toString())}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer num ${
                yearFilter === yr.toString()
                  ? 'bg-[#38BDF8] text-slate-950 font-black shadow-sm'
                  : 'bg-[var(--surface-2)] text-[var(--text-3)] hover:text-[var(--text)]'
              }`}
            >
              {yr}
            </button>
          ))}
        </div>

        {/* Excel Export Button */}
        <button
          type="button"
          onClick={handleExportExcel}
          className="btn btn-excel flex items-center gap-2 flex-none cursor-pointer"
          title="تصدير جدول التحاسب الضريبي إلى ملف بيانات إكسل"
        >
          <span className="material-symbols-outlined text-[18px]">download</span>
          <span>تصدير ملف إكسل</span>
        </button>
      </div>

      {/* Main Table Card */}
      <div className="w-full glass-card !p-0 rounded-[22px] border-0 shadow-sm overflow-hidden bg-[var(--surface-glass)] relative">
        {filteredItems.length === 0 ? (
          <div className="p-12">
            <Empty
              icon="scale"
              title="لا توجد سجلات تحاسب ضريبي مطابقة"
              text="اضغط زر «إضافة تحاسب ضريبي» للبدء بمتابعة المعاملة الضريبية للشركات المدرجة بالنظام."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-[var(--surface-2)] border-b border-[var(--line)] text-[var(--text-3)] font-black text-xs">
                  <th className="p-4 text-right">اسم الشركة</th>
                  <th className="p-4 text-center">سنة التحاسب</th>
                  <th className="p-4 text-center">العقود والاستيرادات</th>
                  <th className="p-4 text-center">المحامي المكلف</th>
                  <th className="p-4 text-center">بدء المهمة</th>
                  <th className="p-4 text-center">الفرع الضريبي والإضبارة</th>
                  <th className="p-4 text-center">الحالة</th>
                  <th className="p-4 text-center">براءة الذمة والوصل</th>
                  <th className="p-4 text-left">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(item => {
                  const targetCo = companies.find(c => c.id === item.company_id)
                  const coName = item.company_name || targetCo?.name || '—'
                  const isCleared = item.status === 'tax_cleared'

                  return (
                    <tr
                      key={item.id}
                      className="border-b border-[var(--line-soft)] hover:bg-[var(--surface-2)]/60 transition-colors"
                    >
                      {/* Company Name (Opens Tax Assessment Details directly) */}
                      <td className="p-3.5 font-bold">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          className="flex items-center gap-2.5 text-[var(--text)] hover:text-amber-500 transition-colors text-right cursor-pointer group"
                          title="عرض وتعديل تفاصيل التحاسب الضريبي"
                        >
                          <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center flex-none group-hover:scale-105 transition-transform">
                            <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                          </div>
                          <span className="font-black text-[13px] group-hover:underline">{coName}</span>
                        </button>
                      </td>

                      {/* Assessment Year */}
                      <td className="p-3.5 text-center font-black num">
                        <span className="px-3 py-1 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {item.year}
                        </span>
                      </td>

                      {/* Contracts & Imports Details */}
                      <td className="p-3.5 text-center">
                        <div className="flex flex-col gap-1 items-center">
                          {item.contracts_info && (
                            <span className="text-[11px] text-amber-400" title={item.contracts_info}>
                              عقود: {item.contracts_amount ? `${formatMoney(item.contracts_amount)}` : 'مثبتة'}
                            </span>
                          )}
                          {item.imports_info && (
                            <span className="text-[11px] text-cyan-400" title={item.imports_info}>
                              استيرادات: {item.imports_amount ? `${formatMoney(item.imports_amount)}` : 'مثبتة'}
                            </span>
                          )}
                          {!item.contracts_info && !item.imports_info && (
                            <span className="text-[var(--text-3)]">—</span>
                          )}
                        </div>
                      </td>

                      {/* Lawyer */}
                      <td className="p-3.5 text-center font-bold text-[var(--text-2)]">
                        {item.assigned_lawyer_name || 'غير معين'}
                      </td>

                      {/* Start Date */}
                      <td className="p-3.5 text-center text-[var(--text-3)] num">
                        {item.tx_start_date ? formatDate(item.tx_start_date) : '—'}
                      </td>

                      {/* Tax Branch & File Number */}
                      <td className="p-3.5 text-center">
                        <div className="flex flex-col gap-0.5 items-center">
                          <span className="font-bold text-[var(--text-2)]">{item.tax_branch || 'الفرع المختص'}</span>
                          {item.tax_file_number && (
                            <span className="text-[10px] text-[var(--text-3)] num">إضبارة: {item.tax_file_number}</span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="p-3.5 text-center">
                        {isCleared ? (
                          <span className="badge-completed">
                            ✓ براءة ذمة صادرة
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.15)]">
                            <span className="w-3.5 h-3.5 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin flex-none" />
                            <span>
                              {item.status === 'auditing' ? 'قيد التدقيق والتخمين' : item.status === 'assessed' ? 'تم التخمين' : 'قيد الإجراء والمراجعة'}
                            </span>
                          </span>
                        )}
                      </td>

                      {/* Clearance & Receipt Info */}
                      <td className="p-3.5 text-center">
                        {isCleared ? (
                          <div className="flex flex-col gap-0.5 items-center text-[11px]">
                            {item.clearance_letter_no && <span>كتاب: <strong className="num text-emerald-400">{item.clearance_letter_no}</strong></span>}
                            {item.clearance_date && <span className="text-[var(--text-3)] num">{formatDate(item.clearance_date)}</span>}
                          </div>
                        ) : item.tax_amount_assessed ? (
                          <span className="text-amber-400 font-bold num">{formatMoney(item.tax_amount_assessed)}</span>
                        ) : (
                          <span className="text-[var(--text-3)]">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-left whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {item.company_id && (
                            <Link
                              href={`/commercial/companies/${item.company_id}`}
                              className="btn btn-primary !py-1 !px-2.5 !text-xs !font-bold !rounded-xl flex items-center gap-1 text-white shadow-xs"
                              title="الانتقال إلى الملف الشامل للشركة"
                            >
                              <span>الملف الشامل</span>
                              <span className="material-symbols-outlined text-[13px]">arrow_left</span>
                            </Link>
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

      {/* Modal for Add / Edit */}
      {isModalOpen && (
        <AddTaxAssessmentModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          companies={companies}
          lawyers={lawyers}
          editingAssessment={editingItem}
          onSuccess={() => {
            triggerToast(editingItem ? 'تم تحديث ملف التحاسب بنجاح' : 'تمت إضافة ملف التحاسب الضريبي بنجاح')
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
