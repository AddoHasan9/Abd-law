'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
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
          <input
            type="text"
            className="input"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="ابحث بالاسم، المدير المفوض، رقم الشهادة، مسجل الشركات، أو الضريبة..."
            style={{ paddingRight: '36px', fontSize: '13px' }}
          />
          <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }}>
            <Icon name="search" />
          </span>
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
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {filteredCompanies.length === 0 ? (
          <div style={{ padding: '32px' }}>
            <Empty
              icon="build2"
              title="لا توجد شركات مطابقة في قسم الشركات"
              text="اضغط زر «إضافة شركة» لإضافة شركة متأسسة جديدة مع كافة بيانات المساهمين والمدير والشهادة والميزانيات."
            />
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--line)' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>اسم الشركة</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>النوع</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>المدير المفوض</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>رأس المال</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>مسجل الشركات</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>رقم الضرائب</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>رقم وتاريخ الشهادة</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>الميزانيات</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompanies.map(co => {
                  const activeManager = co.managers?.find(m => m.active)?.name || co.managers?.[0]?.name || co.manager || '—'
                  const shList = co.shareholders || []
                  const shCount = shList.length

                  return (
                    <tr
                      key={co.id}
                      onClick={() => openDetails(co)}
                      style={{ borderBottom: '1px solid var(--line-soft)', transition: 'background 0.15s', cursor: 'pointer' }}
                      className="hover:bg-[var(--surface-2)]"
                      title="اضغط لعرض وتعديل أو حذف تفاصيل الشركة"
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
                          <span
                            style={{
                              color: 'var(--text)',
                              fontWeight: 800,
                              fontSize: '13.5px',
                            }}
                          >
                            {co.name}
                          </span>
                        </div>
                      </td>

                      {/* Kind */}
                      <td style={{ padding: '14px 14px', textAlign: 'center' }}>
                        <span className="tag tag-gray" style={{ fontSize: '11px' }}>
                          {co.kind ?? 'محدودة'}
                        </span>
                      </td>

                      {/* Manager */}
                      <td style={{ padding: '14px 14px', textAlign: 'center', fontWeight: 600, color: 'var(--text)' }}>
                        {activeManager}
                      </td>

                      {/* Capital */}
                      <td style={{ padding: '14px 14px', textAlign: 'center', fontWeight: 700, color: 'var(--ok)' }} className="num">
                        {co.capital ? formatMoney(co.capital) : '—'}
                      </td>

                      {/* Registrar No */}
                      <td style={{ padding: '14px 14px', textAlign: 'center', fontWeight: 700 }} className="num">
                        {co.registrar_no ? (
                          <span style={{ background: 'var(--surface-3)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--line-soft)' }}>
                            {co.registrar_no}
                          </span>
                        ) : '—'}
                      </td>

                      {/* Tax No */}
                      <td style={{ padding: '14px 14px', textAlign: 'center', fontWeight: 700 }} className="num">
                        {co.tax_no ? (
                          <span style={{ background: 'var(--surface-3)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--line-soft)' }}>
                            {co.tax_no}
                          </span>
                        ) : '—'}
                      </td>

                      {/* Cert No & Date */}
                      <td style={{ padding: '14px 14px', textAlign: 'center', fontSize: '12px' }} className="num">
                        {co.cert_no ? (
                          <span>
                            {co.cert_no} <span style={{ color: 'var(--text-3)' }}>({co.cert_date ? formatDate(co.cert_date) : ''})</span>
                          </span>
                        ) : '—'}
                      </td>

                      {/* Financial Statements */}
                      <td style={{ padding: '14px 14px', textAlign: 'center' }}>
                        {co.last_completed_fs_year ? (
                          <span className="tag tag-blue" style={{ fontSize: '10.5px', fontWeight: 700 }}>
                            ميزانية {co.last_completed_fs_year}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-3)', fontSize: '11px' }}>غير مدرجة</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px', textAlign: 'left', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              openDetails(co)
                            }}
                            className="btn btn-ghost"
                            style={{ fontSize: '12px', fontWeight: 700, padding: '4px 10px', color: 'var(--text)' }}
                            title="تعديل تفاصيل الشركة أو حذفها"
                          >
                            <Icon name="gear" />
                            <span>تعديل</span>
                          </button>

                          <Link
                            href={`/commercial/companies/${co.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="btn btn-primary"
                            style={{ fontSize: '12px', fontWeight: 700, padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <span>ملف 360°</span>
                            <span className="material-symbols-outlined text-[14px]">arrow_left</span>
                          </Link>
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
          onDelete={(deletedId) => {
            setCompaniesList(prev => prev.filter(c => c.id !== deletedId))
          }}
        />
      )}
    </div>
  )
}
