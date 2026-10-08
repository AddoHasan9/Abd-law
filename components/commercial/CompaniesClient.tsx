'use client'

import { useState, useEffect } from 'react'
import { useOpenOnNewParam } from '@/lib/hooks/useOpenOnNewParam'
import dynamic from 'next/dynamic'
import { PageHeader } from '@/components/ui/PageHeader'
import { runAction } from '@/components/ui/ConfirmDialog'
import { toast } from 'sonner'
import { KpiCard } from '@/components/ui/KpiCard'
import { useRouter, useSearchParams } from 'next/navigation'
import { wfProgress, formatMoney, formatDate, penaltyState } from '@/lib/constants'
import { calculateFSState } from '@/lib/financial-statements/calc'
import { calculateCompanyStatus } from '@/lib/status-engine'
import { WorkflowStatus } from '@/components/ui/WorkflowStatus'
import { Icon } from '@/components/ui/Icon'
import { Empty } from '@/components/ui/Empty'
import { usePermissions } from '@/lib/context/UserRoleContext'
import type { CompanyWithWorkflow } from '@/types/database'
import { updateCompanyFSSettingsAction, createFinancialStatementAction } from '@/app/(app)/commercial/financial-statements/actions'
import { useDragScroll } from '@/lib/hooks/useDragScroll'
import { AnimatedTabs } from '@/components/ui/AnimatedTabs'
// نافذة كبيرة: تُحمَّل عند الحاجة فقط (لا تثقل تحميل الصفحة)
const NewCompanyModal = dynamic(() => import('./NewCompanyModal'), { ssr: false })
// نافذة كبيرة: تُحمَّل عند الحاجة فقط (لا تثقل تحميل الصفحة)
const CompanyDetailsModal = dynamic(() => import('./CompanyDetailsModal'), { ssr: false })

interface Props {
  initialCompanies: CompanyWithWorkflow[]
}

/** رأس المال بصيغة مختصرة تتسع في البطاقة: 1 مليار د.ع / 250 مليون د.ع */
function compactIQD(n: number) {
  const fmt = (v: number) => (Number.isInteger(v) ? v : Number(v.toFixed(2))).toLocaleString('en-US')
  if (n >= 1e9) return `${fmt(n / 1e9)} مليار د.ع`
  if (n >= 1e6) return `${fmt(n / 1e6)} مليون د.ع`
  return `${n.toLocaleString('en-US')} د.ع`
}

export default function CompaniesClient({ initialCompanies }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const targetId = searchParams.get('id') || searchParams.get('companyId')
  const { can } = usePermissions()
  const canCreateCompany = can('companies', 'create')
  const [companiesList, setCompaniesList] = useState<CompanyWithWorkflow[]>(initialCompanies)
  const [selectedCompany, setSelectedCompany] = useState<CompanyWithWorkflow | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isNewCompanyOpen, setIsNewCompanyOpen] = useState(false)
  // فتح نافذة التأسيس من رابط ‎?new=1 (الإجراءات السريعة في لوحة التحكم)
  useOpenOnNewParam(() => setIsNewCompanyOpen(true))
  const [notification, setNotification] = useState<string | null>(null)
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const tabsScrollRef = useDragScroll<HTMLDivElement>({ speed: 1.4 })

  useEffect(() => {
    setCompaniesList(initialCompanies)
  }, [initialCompanies])

  // Automatically open company details modal if URL query param is present
  useEffect(() => {
    if (targetId && companiesList.length > 0) {
      const match = companiesList.find(c => c.id === targetId)
      if (match) {
        setSelectedCompany(match)
        setIsDetailsOpen(true)
      }
    }
  }, [targetId, companiesList])

  const handleCardClick = (company: CompanyWithWorkflow) => {
    setSelectedCompany(company)
    setIsDetailsOpen(true)
  }

  const handleAssignFS = async (e: React.MouseEvent, companyId: string, companyName: string) => {
    e.stopPropagation()
    setAssigningId(companyId)

    const res = await updateCompanyFSSettingsAction(companyId, { financial_statements_enabled: true })

    if (!res.success) {
      setAssigningId(null)
      setNotification(`تعذّر تكليف المكتب بالحسابات الختامية: ${res.error || 'خطأ غير معروف'}`)
      setTimeout(() => setNotification(null), 6000)
      return
    }
    toast.success('تم تحديث إعدادات الحسابات الختامية')

    const currentYear = new Date().getFullYear()
    await runAction(createFinancialStatementAction({ company_id: companyId, year: currentYear }), 'تأسيس الشركات · الإضافة')

    // Confirmed by the server — safe to reflect immediately, button disappears without a page reload
    setCompaniesList(prev =>
      prev.map(c => (c.id === companyId ? { ...c, financial_statements_enabled: true } : c))
    )

    setAssigningId(null)
    setNotification(`تم تكليف المكتب بالحسابات الختامية لشركة (${companyName}) بنجاح!`)
    setTimeout(() => setNotification(null), 5000)
    router.refresh()
  }

  const [activeTab, setActiveTab] = useState<'all' | 'forming' | 'deposit' | 'established'>('all')
  const [timeFilter, setTimeFilter] = useState<'all' | 'week' | 'month' | 'year'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - 7)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfYear = new Date(now.getFullYear(), 0, 1)

  // شركات مسار التأسيس (الشركات التي تم إنشاؤها عبر قسم التأسيس)
  // تبقى جميعها في قسم التأسيس وتحدد كـ "مكتملة التأسيس" بعد إطلاق الوديعة
  const formationList = companiesList.filter(c => !c.external)

  // Categorize companies
  const establishedCompanies = formationList.filter(c => c.status === 'established' || Boolean(c.deposit_released) || c.deposit_status === 'released')
  const formingCompanies = formationList.filter(c => c.status !== 'established' && !c.deposit_released && c.deposit_status !== 'released' && !c.cert_date)
  const depositPhaseCompanies = formationList.filter(c => c.status !== 'established' && !c.deposit_released && c.deposit_status !== 'released' && Boolean(c.cert_date))

  // Timeframe stats for established companies
  const thisWeekEstablished = establishedCompanies.filter(c => {
    const d = c.deposit_released_at || c.cert_date || c.establishment_date || c.created_at
    return d && new Date(d) >= startOfWeek
  }).length

  const thisMonthEstablished = establishedCompanies.filter(c => {
    const d = c.deposit_released_at || c.cert_date || c.establishment_date || c.created_at
    return d && new Date(d) >= startOfMonth
  }).length

  const thisYearEstablished = establishedCompanies.filter(c => {
    const d = c.deposit_released_at || c.cert_date || c.establishment_date || c.created_at
    return d && new Date(d) >= startOfYear
  }).length

  // Filtered companies based on tabs, search, and time filter
  const filteredCompanies = formationList.filter(co => {
    const activeMgr = co.managers?.find(m => m.active)?.name || co.managers?.[0]?.name || co.manager || ''
    const matchSearch =
      co.name.toLowerCase().includes(searchTerm.trim().toLowerCase()) ||
      activeMgr.toLowerCase().includes(searchTerm.trim().toLowerCase()) ||
      (co.cert_no && co.cert_no.includes(searchTerm.trim())) ||
      (co.task_no && String(co.task_no).includes(searchTerm.trim()))

    if (!matchSearch) return false

    const isDone = co.status === 'established' || Boolean(co.deposit_released) || co.deposit_status === 'released'

    if (activeTab === 'forming') {
      return !isDone && !co.cert_date
    }
    if (activeTab === 'deposit') {
      return !isDone && Boolean(co.cert_date)
    }
    if (activeTab === 'established') {
      if (!isDone) return false

      if (timeFilter === 'week') {
        const d = co.deposit_released_at || co.cert_date || co.establishment_date || co.created_at
        return d && new Date(d) >= startOfWeek
      }
      if (timeFilter === 'month') {
        const d = co.deposit_released_at || co.cert_date || co.establishment_date || co.created_at
        return d && new Date(d) >= startOfMonth
      }
      if (timeFilter === 'year') {
        const d = co.deposit_released_at || co.cert_date || co.establishment_date || co.created_at
        return d && new Date(d) >= startOfYear
      }
      return true
    }

    return true
  })

  return (
    <div className="flex flex-col gap-6 w-full animate-fade-in-up">
      
      {/* Notification Toast */}
      {notification && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--r-md)',
            background: 'var(--ok-soft)',
            border: '1px solid var(--ok)',
            color: 'var(--ok)',
            fontWeight: 700,
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>✓ {notification}</span>
          <button type="button" onClick={() => setNotification(null)} style={{ border: 'none', background: 'none', color: 'var(--ok)', cursor: 'pointer', fontWeight: 800 }}>
            ✕
          </button>
        </div>
      )}

      <PageHeader
        icon="corporate_fare"
        tone="amber"
        title="تأسيس الشركات"
        subtitle="متابعة شاملة لكافة مراحل تأسيس الشركات وسير العمل والودائع المصرفية"
        actions={
          <>
{canCreateCompany && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsNewCompanyOpen(true)}
            style={{ padding: '8px 18px', fontSize: '13.5px', fontWeight: 700 }}
          >
            <Icon name="plus" />
            <span>تأسيس شركة جديدة</span>
          </button>
        )}
          </>
        }
      />

      {/* المؤشرات — نفس بطاقة لوحة التحكم */}
      <div className="kpi-grid cols-4">
        <KpiCard featured
          label="الشركات المؤسسة"
          value={establishedCompanies.length}
          icon="verified"
          tone="emerald"
          active={activeTab === 'established'}
          onClick={() => { setActiveTab('established'); setTimeFilter('all') }}
          footer={
            <span className="kpi-chips">
              {([['week', 'الأسبوع', thisWeekEstablished], ['month', 'الشهر', thisMonthEstablished], ['year', 'السنة', thisYearEstablished]] as const).map(([id, label, n]) => (
                <span
                  key={id}
                  role="button"
                  tabIndex={0}
                  className={activeTab === 'established' && timeFilter === id ? 'is-on' : ''}
                  onClick={e => { e.stopPropagation(); setActiveTab('established'); setTimeFilter(id) }}
                  onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); setActiveTab('established'); setTimeFilter(id) } }}
                >
                  {label} <b className="num">{n}</b>
                </span>
              ))}
            </span>
          }
        />
        <KpiCard label="قيد التأسيس" value={formingCompanies.length} icon="pending_actions" tone="amber" hint="مسار التأسيس (8 خطوات)" active={activeTab === 'forming'} onClick={() => setActiveTab('forming')} />
        <KpiCard label="إطلاق الوديعة" value={depositPhaseCompanies.length} icon="account_balance" tone="blue" hint="ودائع قيد الإطلاق" active={activeTab === 'deposit'} onClick={() => setActiveTab('deposit')} />
        <KpiCard label="إجمالي الشركات" value={formationList.length} icon="corporate_fare" tone="indigo" hint="عرض كل الشركات" active={activeTab === 'all'} onClick={() => setActiveTab('all')} />
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        {/* Search */}
        <div style={{ position: 'relative', minWidth: '260px', flex: 1, maxWidth: '380px' }}>
          <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
            <Icon name="search" />
          </span>
          <input
            type="text"
            className="input search-input"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="ابحث باسم الشركة، المدير، رقم الشهادة، أو المهمة..."
            style={{ paddingRight: '44px', paddingLeft: '14px', fontSize: '13px' }}
          />
        </div>

        {/* Filter Tabs with Fluid Motion & Drag Scroll */}
        <AnimatedTabs<'all' | 'forming' | 'deposit' | 'established'>
          layoutId="companies-main-tabs"
          size="sm"
          activeTab={activeTab}
          onChange={(tab) => {
            setActiveTab(tab)
            if (tab === 'all' || tab === 'established') setTimeFilter('all')
          }}
          tabs={[
            { id: 'all', label: 'الكل', count: formationList.length },
            { id: 'forming', label: 'قيد التأسيس', count: formingCompanies.length },
            { id: 'deposit', label: 'إطلاق الوديعة', count: depositPhaseCompanies.length },
            { id: 'established', label: 'المؤسسة', count: establishedCompanies.length },
          ]}
        />
      </div>

      {!filteredCompanies.length ? (
        <div className="card">
          <Empty
            icon="build"
            title="لا توجد شركات مطابقة لهذا الفلتر"
            text="يمكنك إضافة شركة جديدة أو تعديل معايير البحث والتصفية لعرض الشركات."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" style={{ alignItems: 'stretch' }}>
          {filteredCompanies.map(co => {
            const pg = wfProgress(co.workflow_steps)
            const pen = penaltyState(co, false)

            const isEstablished = co.status === 'established' || co.deposit_released

            return (
              <article
                key={co.id}
                className={`co-card ${isEstablished ? 'is-est' : co.lacks ? 'is-lack' : 'is-forming'}`}
                role="button"
                tabIndex={0}
                aria-label={`فتح تفاصيل ${co.name}`}
                onClick={() => handleCardClick(co)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCardClick(co) } }}
              >
                <header className="co-card-head">
                  <div className="min-w-0">
                    <h3 title={co.name}>{co.name}</h3>
                    <p className="co-card-meta">
                      <span className="num">#{co.task_no ?? '—'}</span>
                      <span aria-hidden>·</span>
                      <span>{co.kind ?? 'شركة'}</span>
                    </p>
                  </div>
                  <span className={`co-pill co-card-status ${isEstablished ? 'is-ok' : co.cert_date ? 'is-info' : 'is-warn'}`}>
                    {isEstablished ? 'مؤسسة' : co.cert_date ? 'إطلاق الوديعة' : 'قيد التأسيس'}
                  </span>
                </header>

                <dl className="co-card-facts">
                  <div>
                    <dt>رقم الشهادة</dt>
                    <dd className="num">{co.cert_no || '—'}</dd>
                  </div>
                  <div>
                    <dt>تاريخ الشهادة</dt>
                    <dd className="num">{co.cert_date ? formatDate(co.cert_date) : '—'}</dd>
                  </div>
                  <div>
                    <dt>رأس المال</dt>
                    <dd className="num co-card-money" title={co.capital ? formatMoney(co.capital) : undefined}>{co.capital ? compactIQD(co.capital) : '—'}</dd>
                  </div>
                </dl>

                <footer className="co-card-foot">
                  {isEstablished ? (
                    <span className="co-pill is-ok"><span className="material-symbols-outlined" aria-hidden>check_circle</span>الوديعة أُطلقت</span>
                  ) : pen ? (
                    <span className={`co-pill ${pen.level === 'late' ? 'is-bad' : pen.level === 'soon' ? 'is-warn' : 'is-info'}`}>
                      <span className="material-symbols-outlined" aria-hidden>account_balance</span>
                      الوديعة: متابعة <span className="num">({pen.daysLeft} يوم)</span>
                    </span>
                  ) : (
                    <span className="co-progress" title={pg.current ? `المحطة الحالية: ${pg.current.label}` : undefined}>
                      <span className="co-progress-bar"><span style={{ width: `${pg.pct}%` }} /></span>
                      <span className="num">{pg.done}/{pg.total}</span>
                    </span>
                  )}
                  {isEstablished && !co.financial_statements_enabled && (
                    <button
                      type="button"
                      className="co-pill is-info co-assign"
                      disabled={assigningId === co.id}
                      onClick={e => handleAssignFS(e, co.id, co.name)}
                      onKeyDown={e => e.stopPropagation()}
                      title="تكليف المكتب بالحسابات الختامية لهذه الشركة"
                    >
                      <span className="material-symbols-outlined" aria-hidden>add_circle</span>
                      {assigningId === co.id ? 'جارٍ التكليف…' : 'تكليف بالحسابات الختامية'}
                    </button>
                  )}
                  {co.lacks && <span className="co-pill is-bad" title={co.lacks}><span className="material-symbols-outlined" aria-hidden>warning</span>نواقص</span>}
                </footer>
              </article>
            )
          })}
        </div>
      )}

      {/* Editable Company Details Modal */}
      <CompanyDetailsModal
        company={selectedCompany}
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false)
          setSelectedCompany(null)
        }}
        onDelete={(deletedId: string) => {
          setCompaniesList(prev => prev.filter(c => c.id !== deletedId))
        }}
      />

      {/* New Company Formation Modal */}
      <NewCompanyModal
        isOpen={isNewCompanyOpen}
        onClose={() => setIsNewCompanyOpen(false)}
      />
    </div>
  )
}
