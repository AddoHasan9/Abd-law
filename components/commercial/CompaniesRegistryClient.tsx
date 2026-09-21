'use client'

import { useState, useEffect } from 'react'
import CompanyFileLink from '@/components/commercial/CompanyFileLink'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'
import { Empty } from '@/components/ui/Empty'
import type { CompanyWithWorkflow } from '@/types/database'
import AddEstablishedCompanyModal from './AddEstablishedCompanyModal'
import CompanyDetailsModal from './CompanyDetailsModal'
import { formatDate, formatMoney } from '@/lib/constants'

interface Props {
  companies: CompanyWithWorkflow[]
}

export default function CompaniesRegistryClient({ companies = [] }: Props) {
  const router = useRouter()
  const [companiesList, setCompaniesList] = useState<CompanyWithWorkflow[]>(companies)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterKind, setFilterKind] = useState<string>('all')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  useEffect(() => {
    setCompaniesList(companies)
  }, [companies])

  // Details & Edit Modal State
  const [selectedCompanyForDetails, setSelectedCompanyForDetails] = useState<CompanyWithWorkflow | null>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)

  const openDetails = (company: CompanyWithWorkflow) => {
    setSelectedCompanyForDetails(company)
    setIsDetailsModalOpen(true)
  }

  const filteredCompanies = companiesList.filter(c => {
    const activeMgr = c.managers?.find(m => m.active)?.name || c.managers?.[0]?.name || c.manager || ''
    const matchSearch =
      c.name.toLowerCase().includes(searchTerm.trim().toLowerCase()) ||
      activeMgr.toLowerCase().includes(searchTerm.trim().toLowerCase()) ||
      (c.cert_no && c.cert_no.includes(searchTerm.trim())) ||
      (c.registrar_no && c.registrar_no.includes(searchTerm.trim())) ||
      (c.tax_no && c.tax_no.includes(searchTerm.trim()))

    if (!matchSearch) return false

    if (filterKind === 'all') return true
    if (filterKind === 'limited') return c.kind === 'محدودة'
    if (filterKind === 'sole') return c.kind === 'فردية'
    if (filterKind === 'has_fs') return c.financial_statements_enabled || Boolean(c.last_completed_fs_year)
    return true
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '24px' }}>
      
      {/* Top Banner & Main Action */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="material-symbols-outlined text-[26px] text-[var(--accent)]">corporate_fare</span>
            <span>دليل وسجل الشركات (قسم الشركات)</span>
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-3)', margin: '4px 0 0 0' }}>
            المرجع الموحد للشركات المتأسسة والمسجلة بنظام المكتب — اضغط على أي شركة لفتح وتعديل أو حذف تفاصيلها
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsAddModalOpen(true)}
            style={{ padding: '8px 18px', fontSize: '13.5px', fontWeight: 700 }}
          >
            <Icon name="plus" />
            <span>إضافة شركة</span>
          </button>
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center' }}>
            <Icon name="build2" />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600 }}>إجمالي الشركات المسجلة</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)' }} className="num">{companiesList.length}</div>
          </div>
        </div>

        <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--ok-soft)', color: 'var(--ok)', display: 'grid', placeItems: 'center' }}>
            <Icon name="doc" />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600 }}>مدرجة بالحسابات الختامية</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--ok)' }} className="num">
              {companiesList.filter(c => c.financial_statements_enabled || c.last_completed_fs_year).length}
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'grid', placeItems: 'center' }}>
            <Icon name="stamp" />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', fontWeight: 600 }}>شركات محدودة المسؤولية</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#3b82f6' }} className="num">
              {companiesList.filter(c => c.kind !== 'فردية').length}
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ position: 'relative', minWidth: '280px', flex: 1, maxWidth: '450px' }}>
          <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
            <Icon name="search" />
          </span>
          <input
            type="text"
            className="input search-input"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="ابحث بالاسم، المدير المفوض، رقم الشهادة، مسجل الشركات، أو الضريبة..."
            style={{ paddingRight: '44px', paddingLeft: '14px', fontSize: '13px' }}
          />
        </div>

        {/* Filter Chips */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setFilterKind('all')}
            className={`btn ${filterKind === 'all' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            الكل ({companiesList.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterKind('limited')}
            className={`btn ${filterKind === 'limited' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            شركات محدودة
          </button>
          <button
            type="button"
            onClick={() => setFilterKind('sole')}
            className={`btn ${filterKind === 'sole' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            مشاريع فردية
          </button>
          <button
            type="button"
            onClick={() => setFilterKind('has_fs')}
            className={`btn ${filterKind === 'has_fs' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            لديها ميزانيات
          </button>
        </div>
      </div>

      {/* Companies Standard Strip Table */}
      <div className="glass-card !p-0 rounded-[22px] border-0 shadow-sm overflow-hidden bg-[var(--surface-glass)]">
        {filteredCompanies.length === 0 ? (
          <div className="p-8">
            <Empty
              icon="build2"
              title="لا توجد شركات مطابقة في قسم الشركات"
              text="اضغط زر «إضافة شركة» لإضافة شركة متأسسة جديدة مع كافة بيانات المساهمين والمدير والشهادة والميزانيات."
            />
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse text-right text-xs table-auto">
              <thead>
                <tr className="border-b border-[var(--border-soft)] bg-[var(--surface-2)]/90 text-xs text-[var(--text-2)] font-bold">
                  <th className="py-3 px-3 text-right">اسم الشركة</th>
                  <th className="py-3 px-2 text-center">النوع</th>
                  <th className="py-3 px-2 text-center">المدير المفوض</th>
                  <th className="py-3 px-2 text-center">رأس المال</th>
                  <th className="py-3 px-2 text-center">مسجل الشركات</th>
                  <th className="py-3 px-2 text-center">رقم الضرائب</th>
                  <th className="py-3 px-2 text-center">الشهادة</th>
                  <th className="py-3 px-2 text-center">الميزانيات</th>
                  <th className="py-3 px-3 text-left whitespace-nowrap">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-soft)]">
                {filteredCompanies.map(co => {
                  const activeManager = co.managers?.find(m => m.active)?.name || co.managers?.[0]?.name || '—'

                  return (
                    <tr
                      key={co.id}
                      onClick={() => openDetails(co)}
                      className="hover:bg-blue-500/[0.04] dark:hover:bg-blue-500/[0.08] transition-colors duration-150 cursor-pointer"
                      title="اضغط لعرض وتعديل أو حذف تفاصيل الشركة"
                    >
                      {/* Company Name */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent-soft)] to-blue-500/10 border border-[var(--accent)]/20 text-[var(--accent)] flex items-center justify-center shrink-0 shadow-xs">
                            <span className="material-symbols-outlined text-[17px]">domain</span>
                          </div>
                          <span className="font-bold text-[13.5px] text-[var(--text)] leading-snug break-words whitespace-normal" title={co.name}>
                            {co.name}
                          </span>
                        </div>
                      </td>

                      {/* Kind */}
                      <td className="py-2.5 px-2 text-center align-middle whitespace-nowrap">
                        <span className="text-[10px] font-bold text-[var(--text-2)] bg-[var(--surface-2)] px-2 py-0.5 rounded-full border border-[var(--border-soft)]">
                          {co.kind ?? 'محدودة'}
                        </span>
                      </td>

                      {/* Manager */}
                      <td className="py-2.5 px-2 text-center align-middle font-bold text-[12px] text-[var(--text)] break-words whitespace-normal" title={activeManager}>
                        {activeManager}
                      </td>

                      {/* Capital */}
                      <td className="py-2.5 px-2 text-center align-middle font-black text-emerald-600 dark:text-emerald-400 num whitespace-nowrap text-xs">
                        {co.capital ? formatMoney(co.capital) : '—'}
                      </td>

                      {/* Registrar No */}
                      <td className="py-2.5 px-2 text-center align-middle font-bold num whitespace-nowrap text-xs">
                        {co.registrar_no ? (
                          <span className="bg-[var(--surface-2)] text-[var(--text-2)] px-1.5 py-0.5 rounded border border-[var(--border-soft)] text-[11px]">
                            {co.registrar_no}
                          </span>
                        ) : '—'}
                      </td>

                      {/* Tax No */}
                      <td className="py-2.5 px-2 text-center align-middle font-bold num whitespace-nowrap text-xs">
                        {co.tax_no ? (
                          <span className="bg-[var(--surface-2)] text-[var(--text-2)] px-1.5 py-0.5 rounded border border-[var(--border-soft)] text-[11px]">
                            {co.tax_no}
                          </span>
                        ) : '—'}
                      </td>

                      {/* Cert No & Date */}
                      <td className="py-2.5 px-2 text-center align-middle text-xs font-semibold num whitespace-nowrap">
                        {co.cert_no ? (
                          <span>
                            {co.cert_no} <span className="text-[var(--text-3)] text-[10px]">({co.cert_date ? formatDate(co.cert_date) : ''})</span>
                          </span>
                        ) : '—'}
                      </td>

                      {/* Financial Statements */}
                      <td className="py-2.5 px-2 text-center align-middle whitespace-nowrap">
                        {co.last_completed_fs_year ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                            ميزانية {co.last_completed_fs_year}
                          </span>
                        ) : (
                          <span className="text-[var(--text-3)] text-[11px]">غير مدرجة</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-left align-middle whitespace-nowrap">
                        <div className="flex items-center gap-1.5 justify-end">
                          <CompanyFileLink companyId={co.id} stopPropagation />
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

      {/* Add Established Company Modal */}
      {isAddModalOpen && (
        <AddEstablishedCompanyModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={(newCompany) => {
            if (newCompany && newCompany.id) {
              setCompaniesList(prev => [newCompany, ...prev.filter(c => c.id !== newCompany.id)])
            }
            router.refresh()
          }}
        />
      )}

      {/* Company Details & Edit Modal */}
      {selectedCompanyForDetails && isDetailsModalOpen && (
        <CompanyDetailsModal
          company={selectedCompanyForDetails}
          isOpen={isDetailsModalOpen}
          onClose={() => {
            setIsDetailsModalOpen(false)
            setSelectedCompanyForDetails(null)
            router.refresh()
          }}
          onDelete={(deletedId: string) => {
            setCompaniesList(prev => prev.filter(c => c.id !== deletedId))
          }}
        />
      )}
    </div>
  )
}
