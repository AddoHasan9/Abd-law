/**
 * صفحة قيد الإنشاء — بديل مؤقت مرتّب بدل خطأ 404
 * ------------------------------------------------------------
 * يُستعمل للأقسام الموثّقة التي ستُبنى في مراحل لاحقة،
 * فيبقى كل رابط في القائمة يعمل ويعرض صفحة واضحة.
 */
import { Icon, type IconName } from './Icon'

interface Props {
  title: string
  note?: string
  icon?: IconName
}

export default function Placeholder({ title, note, icon = 'info' }: Props) {
  return (
    <div className="card">
      <div className="empty">
        <Icon name={icon} />
        <h3>{title}</h3>
        <p>{note ?? 'هذا القسم موثّق وسيُبنى في مرحلة لاحقة من المشروع.'}</p>
      </div>
    </div>
  )
}
