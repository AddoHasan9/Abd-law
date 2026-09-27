import type { KpiTone } from './KpiCard'

/** رأس صفحة موحّد لكل الأقسام: أيقونة ملوّنة + عنوان + وصف + أزرار الإجراءات */
export function PageHeader({
  icon,
  title,
  subtitle,
  tone = 'accent',
  actions,
}: {
  icon: string
  title: string
  subtitle?: React.ReactNode
  tone?: KpiTone
  actions?: React.ReactNode
}) {
  return (
    <header className={`page-head tone-${tone}`}>
      <div className="page-head-main">
        <span className="page-head-icon" aria-hidden>
          <span className="material-symbols-outlined">{icon}</span>
        </span>
        <div className="min-w-0">
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="page-head-actions">{actions}</div>}
    </header>
  )
}
