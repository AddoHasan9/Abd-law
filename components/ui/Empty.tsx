/**
 * حالة فارغة موحّدة — تُستعمل في كل قسم قبل وجود بيانات
 */
import { Icon, type IconName } from './Icon'

interface Props {
  icon?: IconName
  title: string
  text?: string
  action?: React.ReactNode
}

export function Empty({ icon = 'info', title, text, action }: Props) {
  return (
    <div className="empty">
      <Icon name={icon} />
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  )
}
