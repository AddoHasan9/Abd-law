import Link from 'next/link'
import { RollingNumber } from '@/components/ui/RollingNumber'

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
}) {
  const cls = `kpi-card tone-${tone}${active ? ' is-active' : ''}${alert ? ' is-alert' : ''}`
  const body = (
    <>
      <span className="kpi-label">{label}</span>
      <span className="kpi-icon" aria-hidden>
        <span className="material-symbols-outlined">{icon}</span>
      </span>
      <RollingNumber value={value} className="kpi-value" />
      {footer ?? (hint && (
        <span className="kpi-hint">
          {hint}
          <span className="material-symbols-outlined" aria-hidden>chevron_left</span>
        </span>
      ))}
    </>
  )
  if (href) return <Link href={href} className={cls}>{body}</Link>
  return (
    <button type="button" className={cls} onClick={onClick} aria-pressed={active}>
      {body}
    </button>
  )
}
