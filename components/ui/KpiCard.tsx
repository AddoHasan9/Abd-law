import Link from 'next/link'
import { RollingNumber } from '@/components/ui/RollingNumber'

function compactMoney(n: number) {
  const f = (v: number) => (Number.isInteger(v) ? v : Number(v.toFixed(1))).toLocaleString('en-US')
  if (n >= 1e9) return f(n / 1e9)
  if (n >= 1e6) return f(n / 1e6)
  return n.toLocaleString('en-US')
}

export type KpiTone = 'emerald' | 'amber' | 'blue' | 'indigo' | 'violet' | 'rose' | 'accent'

/**
 * بطاقة مؤشر موحّدة لكل النظام (لوحة التحكم وصفحات الأقسام):
 * عنوان + أيقونة ملوّنة + رقم كبير + سطر تلميح. البطاقة كلها قابلة للضغط.
 */
export function KpiCard({
  label,
  value,
  icon,
  tone = 'accent',
  hint,
  footer,
  href,
  onClick,
  active,
  alert,
  format,
  featured,
}: {
  label: string
  value: number
  icon: string
  tone?: KpiTone
  hint?: string
  footer?: React.ReactNode
  href?: string
  onClick?: () => void
  active?: boolean
  alert?: boolean
  /** تنسيق الرقم (مثلاً المبالغ) */
  format?: 'currency' | 'number'
  /** البطاقة الرئيسية الملوّنة بلون الشعار (واحدة بكل صفحة) */
  featured?: boolean
}) {
  const cls = `kpi-card tone-${tone}${active ? ' is-active' : ''}${alert ? ' is-alert' : ''}${featured ? ' is-featured' : ''}`
  const body = (
    <>
      <span className="kpi-label">{label}</span>
      <span className="kpi-icon" aria-hidden>
        <span className="material-symbols-outlined">{icon}</span>
      </span>
      {format === 'currency'
        ? <span className="kpi-value num" title={`${value.toLocaleString('en-US')} د.ع`}>{compactMoney(value)}<small className="kpi-unit"> {value >= 1e6 ? (value >= 1e9 ? 'مليار' : 'مليون') : ''} د.ع</small></span>
        : <RollingNumber value={value} className="kpi-value" />}
      {footer ?? (hint && (
        <span className="kpi-hint">
          {hint}
          <span className="material-symbols-outlined" aria-hidden>chevron_left</span>
        </span>
      ))}
    </>
  )
  if (href) return <Link href={href} className={cls}>{body}</Link>
  if (!onClick) return <div className={`${cls} is-static`}>{body}</div>
  return (
    <button type="button" className={cls} onClick={onClick} aria-pressed={active}>
      {body}
    </button>
  )
}
