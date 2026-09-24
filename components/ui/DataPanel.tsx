/**
 * حاوية الجداول الموحّدة لكل الأقسام.
 * رأس القائمة (العنوان + العداد) بخلفية ملوّنة خفيفة وأيقونة ممتلئة،
 * حتى يتميّز بوضوح عن صفوف الشركات تحته (أيقونات فاتحة على خلفية بيضاء).
 */
export function DataPanel({
  icon,
  title,
  subtitle,
  count,
  total,
  unit,
  actions,
  children,
  className = '',
}: {
  icon: string
  title: string
  subtitle?: string
  count?: number
  total?: number
  unit?: string
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  const showCount = typeof count === 'number'
  return (
    <section className={`data-panel ${className}`}>
      <header className="data-panel-head">
        <div className="data-panel-title">
          <span className="data-panel-icon" aria-hidden>
            <span className="material-symbols-outlined">{icon}</span>
          </span>
          <div className="min-w-0">
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
        </div>
        {(showCount || actions) && (
          <div className={`flex items-center gap-2 shrink-0 ${actions ? 'data-panel-actions' : ''}`}>
            {actions}
            {showCount && (
              <span className="data-panel-count num">
                {typeof total === 'number' && total !== count ? `${count} من ${total}` : count}
                {unit ? ` ${unit}` : ''}
              </span>
            )}
          </div>
        )}
      </header>
      {children}
    </section>
  )
}
