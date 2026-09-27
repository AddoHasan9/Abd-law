/**
 * صفحة قيد الإنشاء — بنفس التصميم الموحد (رأس الصفحة + حالة فارغة)
 */
import { PageHeader } from './PageHeader'
import type { IconName } from './Icon'

interface Props {
  title: string
  note?: string
  icon?: IconName
}

export default function Placeholder({ title, note }: Props) {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader icon="construction" title={title} subtitle="هذا القسم قيد التطوير" />
      <div className="card">
        <div className="dash-empty">
          <span className="dash-empty-icon material-symbols-outlined" aria-hidden>construction</span>
          <p className="dash-empty-title">قريباً</p>
          <p className="dash-empty-text">{note ?? 'هذا القسم موثّق وسيُبنى في مرحلة لاحقة من المشروع.'}</p>
        </div>
      </div>
    </div>
  )
}
