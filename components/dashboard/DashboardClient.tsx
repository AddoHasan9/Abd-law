'use client'

/**
 * لوحة التحكم — أسلوب Bento
 * الترتيب حسب الأهمية: المؤشرات ← نشاط الأسبوع + المهل + التأسيس ← أحدث المعاملات + التذكيرات ← الفريق + الإجراءات السريعة.
 * البطاقة الأولى ملوّنة بلون الشعار؛ الباقي هادئ. الحركات تنطفئ مع «تقليل الحركة».
 */
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { KpiCard } from '@/components/ui/KpiCard'
import { FadeInStagger } from '@/components/ui/FadeInStagger'
import { formatDate, formatFullDate } from '@/lib/constants'
import { getWorkflowStatusConfig } from '@/lib/workflow-status'
import type { DashboardStats } from '@/lib/data/dashboard'
import type { ProfileWithStats } from '@/lib/data/profiles'
import type { Company } from '@/types/database'
import RemindersWidget from './RemindersWidget'

interface Props {
  stats: DashboardStats
  profiles?: ProfileWithStats[]
  companies?: Company[]
}

type TxFilter = 'all' | 'progress' | 'new' | 'done'
const RING = 339.3 // محيط دائرة نصف قطرها 54

const isProgress = (s: string) => s === 'progress' || s === 'doing'
const isNew = (s: string) => s === 'new' || s === 'wait'
const isDone = (s: string) => s === 'done' || s === 'completed'

export default function DashboardClient({ stats, profiles = [], companies = [] }: Props) {
  const [txFilter, setTxFilter] = useState<TxFilter>('all')

  // ── المؤشرات (البطاقة كلها رابط) ─────────────────────────────
  const urgentFS = stats.urgentDeadlines?.length || 0
  const kpis = [
    { label: 'الشركات المؤسسة', value: stats.establishedCompaniesCount ?? stats.totalCompaniesCount ?? 0, hint: 'دليل الشركات', icon: 'verified', href: '/commercial/companies-registry', tone: 'emerald' as const, featured: true },
    { label: 'قيد التأسيس', value: stats.formingCompaniesCount ?? 0, hint: 'مسار التأسيس', icon: 'pending_actions', href: '/commercial/companies', tone: 'amber' as const },
    { label: 'إطلاق الوديعة', value: stats.activeDepositsCount ?? 0, hint: 'مسار الودائع', icon: 'account_balance', href: '/commercial/deposits', tone: 'blue' as const },
    { label: 'قسم المحدودة', value: stats.llcTransactionsCount ?? 0, hint: 'المعاملات النشطة', icon: 'history_edu', href: '/commercial/llc', tone: 'indigo' as const },
    { label: 'الهويات', value: stats.totalIDsCount ?? 0, hint: 'مستورد وضريبة وغرفة', icon: 'badge', href: '/commercial/ids', tone: 'violet' as const },
    { label: 'الحسابات الختامية', value: urgentFS, hint: urgentFS ? 'مهل قريبة تحتاج متابعة' : 'مهلة 7/10 السنوية', icon: 'receipt_long', href: '/commercial/financial-statements', tone: 'rose' as const, alert: urgentFS > 0 },
  ]

  // ── نشاط الأسبوع ─────────────────────────────────────────────
  const week = stats.weeklyActivity || []
  const weekMax = Math.max(1, ...week.map(d => d.count))
  const weekTotal = week.reduce((a, d) => a + d.count, 0)

  // ── المهل القريبة: مصدر واحد (الوديعة + الهويات + الحسابات الختامية)، الأكثر إلحاحاً أولاً ─
  //    (كانت الهويات تُضاف مرتين: مرة ضمن urgentDeadlines ومرة من expiryAlerts)
  const deadlines = useMemo(() => {
    const idKeys = new Set((stats.expiryAlerts || []).map(a => `${a.companyId}|${a.title}`))
    return (stats.urgentDeadlines || []).map(d => {
      const late = d.level === 'late'
      const isId = idKeys.has(`${d.companyId}|${d.title}`)
      const isDeposit = d.title === 'إطلاق الوديعة المصرفية'
      const days = late ? d.daysLate : d.daysLeft
      const chip = isId
        ? (late ? `منتهية منذ ${days} يوم` : d.daysLeft === 0 ? 'تنتهي اليوم' : d.daysLeft === 1 ? 'تنتهي غداً' : `تنتهي بعد ${days} يوم`)
        : (late ? `متأخرة ${days} يوم` : d.daysLeft <= 0 ? 'اليوم' : d.daysLeft === 1 ? 'غداً' : `باقي ${days} يوم`)
      const href = isId ? '/commercial/ids' : isDeposit ? '/commercial/deposits' : `/commercial/financial-statements?companyId=${d.companyId}`
      return { key: `${d.companyId}|${d.title}|${d.due}`, company: d.companyName, what: d.title, chip, late, rank: d.daysLeft, href }
    })
      .filter((d, i, all) => all.findIndex(x => x.key === d.key) === i)
      .sort((x, y) => Number(y.late) - Number(x.late) || x.rank - y.rank)
      .slice(0, 4)
  }, [stats.urgentDeadlines, stats.expiryAlerts])

  // ── مسار التأسيس ─────────────────────────────────────────────
  const forming = stats.formingList || []
  const formDone = forming.reduce((a, c) => a + c.done, 0)
  const formTotal = forming.reduce((a, c) => a + c.total, 0)
  const formRatio = formTotal ? formDone / formTotal : 0

  // ── أحدث المعاملات ───────────────────────────────────────────
  const recentTxs = stats.recentTransactions || []
  const counts = {
    all: recentTxs.length,
    progress: recentTxs.filter(t => isProgress(t.status)).length,
    new: recentTxs.filter(t => isNew(t.status)).length,
    done: recentTxs.filter(t => isDone(t.status)).length,
  }
  const filteredTxs = recentTxs.filter(t =>
    txFilter === 'all' ? true : txFilter === 'progress' ? isProgress(t.status) : txFilter === 'new' ? isNew(t.status) : isDone(t.status)
  ).slice(0, 6)
  const txHref = (tx: (typeof recentTxs)[number]) =>
    tx.companyId
      ? (tx.type === 'formation' || tx.typeLabel?.includes('تأسيس') ? `/commercial/companies?id=${tx.companyId}` : `/commercial/companies/${tx.companyId}`)
      : (tx.type === 'llc' ? `/commercial/llc?id=${tx.id}` : '/commercial')

  // ── الفريق ───────────────────────────────────────────────────
  const team = profiles.filter(p => p.active !== false && !p.id.startsWith('prof_'))
  const maxWorkload = Math.max(1, ...team.map(l => l.active_tx_count ?? 0))
  const roleOf = (p: ProfileWithStats) => p.title || (p.role === 'super_admin' ? 'مدير النظام' : p.role === 'manager' ? 'مدير' : p.dept || 'محامي')

  const actions = [
    { label: 'تأسيس شركة', icon: 'domain_add', href: '/commercial/companies?new=1' },
    { label: 'إضافة هوية', icon: 'badge', href: '/commercial/ids?new=1' },
    { label: 'تحاسب ضريبي', icon: 'request_quote', href: '/commercial/tax-assessment?new=1' },
    { label: 'حسابات ختامية', icon: 'receipt_long', href: '/commercial/financial-statements?new=1' },
  ]

  return (
    <div className="bx relative z-10">
      <header className="bx-head">
        <div>
          <h1>لوحة التحكم</h1>
          <p>{formatFullDate()} — كل ما يحتاج تصرفك اليوم بمكان واحد</p>
        </div>
      </header>

      {/* 1. المؤشرات — الأولى ملوّنة بلون الشعار */}
      <FadeInStagger className="kpi-grid">
        {kpis.map(k => (
          <KpiCard key={k.href} label={k.label} value={k.value} icon={k.icon} tone={k.tone} hint={k.hint} href={k.href} alert={k.alert} featured={k.featured} />
        ))}
      </FadeInStagger>

      <div className="bx-grid">
        {/* 2. نشاط الأسبوع */}
        <section className="bx-card bx-s6" style={{ animationDelay: '.08s' }} aria-labelledby="bx-week-h">
          <div className="bx-card-head">
            <div>
              <h2 id="bx-week-h">نشاط هذا الأسبوع</h2>
              <small>المعاملات المسجّلة كل يوم · المجموع <span className="num">{weekTotal}</span></small>
            </div>
            <Link href="/commercial" className="bx-link">كل المعاملات ←</Link>
          </div>
          <div className="bx-week" role="img" aria-label={`المعاملات المسجّلة هذا الأسبوع: ${week.map(d => `${d.label} ${d.isFuture ? '—' : d.count}`).join('، ')}`}>
            {week.map((d, i) => {
              const h = d.isFuture ? 42 : Math.max(6, (d.count / weekMax) * 100)
              return (
                <div className="bx-day" key={d.date}>
                  {d.isToday && <span className="bx-tip">اليوم · <span className="num">{d.count}</span></span>}
                  <div
                    className={`bx-bar${d.isToday ? ' is-today' : ''}${d.isFuture ? ' is-future' : ''}`}
                    style={{ height: `${h}%`, animationDelay: `${0.15 + i * 0.05}s` }}
                    title={d.isFuture ? d.label : `${d.label}: ${d.count}`}
                  />
                  <span className={`bx-day-label${d.isToday ? ' is-today' : ''}`}>{d.label}</span>
                </div>
              )
            })}
          </div>
        </section>

        {/* 3. المهل القريبة */}
        <section className="bx-card bx-s3" style={{ animationDelay: '.14s' }} aria-labelledby="bx-dl-h">
          <div className="bx-card-head">
            <h2 id="bx-dl-h">المهل القريبة</h2>
          </div>
          {deadlines.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {deadlines.map(d => (
                <Link key={d.key} href={d.href} className={`bx-deadline ${d.late ? 'is-late' : 'is-soon'}`}>
                  <b>{d.company}</b>
                  <span>{d.what}</span>
                  <em>{d.chip}</em>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bx-empty">لا توجد مهل قريبة</div>
          )}
        </section>

        {/* 4. مسار التأسيس */}
        <section className="bx-card bx-s3" style={{ animationDelay: '.2s' }} aria-labelledby="bx-form-h">
          <div className="bx-card-head">
            <h2 id="bx-form-h">مسار التأسيس</h2>
            <Link href="/commercial/companies" className="bx-link">فتح ←</Link>
          </div>
          <div className="bx-ring">
            <svg width="132" height="132" viewBox="0 0 132 132" aria-hidden="true">
              <circle cx="66" cy="66" r="54" fill="none" stroke="var(--surface-2)" strokeWidth="14" />
              <circle className="bx-ring-fg" cx="66" cy="66" r="54" fill="none" stroke="var(--brand)" strokeWidth="14" strokeLinecap="round"
                strokeDasharray={RING} strokeDashoffset={RING * (1 - formRatio)} transform="rotate(-90 66 66)" />
            </svg>
            <div className="bx-ring-center">
              <b className="num">{forming.length}</b>
              <span>قيد التأسيس</span>
            </div>
          </div>
          {forming.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {forming.slice(0, 3).map(c => (
                <Link key={c.id} href={`/commercial/companies?id=${c.id}`} className="bx-prog">
                  <span className="bx-prog-top"><b>{c.name}</b><span className="num">{c.done}/{c.total}</span></span>
                  <span className="bx-track"><span className="bx-fill" style={{ width: `${(c.done / Math.max(1, c.total)) * 100}%` }} /></span>
                  {c.current && <span style={{ fontSize: 12, color: 'var(--text-3)' }}>الآن: {c.current}</span>}
                </Link>
              ))}
            </div>
          ) : (
            <div className="bx-empty">لا توجد شركات قيد التأسيس</div>
          )}
        </section>

        {/* 5. أحدث المعاملات */}
        <section className="bx-card bx-s8" style={{ animationDelay: '.26s' }} aria-labelledby="bx-tx-h">
          <div className="bx-card-head">
            <h2 id="bx-tx-h">أحدث المعاملات</h2>
            <div className="bx-pills" role="group" aria-label="تصفية المعاملات">
              {([['all', 'الكل'], ['progress', 'قيد التنفيذ'], ['new', 'جديدة'], ['done', 'مكتملة']] as const).map(([id, label]) => (
                <button key={id} type="button" className={`bx-pill${txFilter === id ? ' is-on' : ''}`} aria-pressed={txFilter === id} onClick={() => setTxFilter(id)}>
                  {label} <i className="num">{counts[id]}</i>
                </button>
              ))}
            </div>
          </div>
          {filteredTxs.length ? (
            <div className="bx-rows">
              {filteredTxs.map(tx => {
                const st = getWorkflowStatusConfig(tx.status)
                return (
                  <Link key={tx.id} href={txHref(tx)} className="bx-row">
                    <span className="bx-row-main">
                      <span className="bx-dot" style={{ background: st.text }} aria-hidden />
                      <span className="bx-row-text">
                        <b>{tx.companyName || tx.clientName || 'بدون شركة'}</b>
                        <span>{tx.typeLabel}{tx.lawyerName ? ` · ${tx.lawyerName}` : ''}</span>
                      </span>
                    </span>
                    <span className="bx-chip" style={{ background: st.bg, color: st.text, border: `1px solid ${st.border}` }}>{st.label}</span>
                    <span className="bx-row-date num">{tx.txDate ? formatDate(tx.txDate) : '—'}</span>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="bx-empty">لا توجد معاملات بهذا التصنيف</div>
          )}
          <Link href="/commercial" className="bx-link" style={{ alignSelf: 'flex-start' }}>كل المعاملات ({recentTxs.length}) ←</Link>
        </section>

        {/* 6. التذكيرات */}
        <div className="bx-s4" style={{ minWidth: 0 }}>
          <RemindersWidget companies={companies} />
        </div>

        {/* 7. الفريق */}
        <section className="bx-card bx-s6" style={{ animationDelay: '.32s' }} aria-labelledby="bx-team-h">
          <div className="bx-card-head">
            <h2 id="bx-team-h">الفريق</h2>
            <span className="bx-chip" style={{ background: 'var(--surface-2)', color: 'var(--text-2)' }}><span className="num">{team.length}</span> أعضاء</span>
          </div>
          {team.map(m => {
            const count = m.active_tx_count ?? 0
            return (
              <div className="bx-member" key={m.id}>
                <span className="bx-avatar" aria-hidden>{m.name.trim().slice(0, 1) || '؟'}</span>
                <span className="bx-member-text">
                  <b>{m.name} <small>· {roleOf(m)}</small></b>
                  <span className="bx-track"><span className="bx-fill" style={{ width: `${Math.max(3, (count / maxWorkload) * 100)}%`, opacity: count ? 1 : .35 }} /></span>
                </span>
                <span className="bx-member-count"><span className="num">{count}</span> معاملة</span>
              </div>
            )
          })}
        </section>

        {/* 8. الإجراءات السريعة — تفتح نافذة الإضافة مباشرة */}
        <section className="bx-card bx-s6" style={{ animationDelay: '.38s' }} aria-labelledby="bx-act-h">
          <div className="bx-card-head">
            <h2 id="bx-act-h">إجراءات سريعة</h2>
          </div>
          <div className="bx-actions">
            {actions.map(a => (
              <Link key={a.href} href={a.href} className="bx-action">
                <span className="material-symbols-outlined" aria-hidden>{a.icon}</span>
                {a.label}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
