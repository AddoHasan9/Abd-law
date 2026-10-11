'use client'
/**
 * شريط سفلي عائم للهاتف — أكثر 4 أقسام استخداماً + زر «القائمة» للشريط الكامل.
 * يظهر على الشاشات الصغيرة فقط (≤ 768px) عبر CSS. الصفحات تفرض صلاحياتها بنفسها.
 */
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'

const TABS = [
  { href: '/dashboard', label: 'الرئيسية', icon: 'grid', match: (p: string) => p === '/dashboard' },
  { href: '/commercial', label: 'المعاملات', icon: 'brief', match: (p: string) => p === '/commercial' },
  { href: '/commercial/companies-registry', label: 'الشركات', icon: 'build2', match: (p: string) => p.startsWith('/commercial/companies') },
  { href: '/commercial/ids', label: 'الهويات', icon: 'stamp', match: (p: string) => p.startsWith('/commercial/ids') },
] as const

export default function MobileTabBar({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname() || ''
  return (
    <nav className="tabbar" aria-label="التنقل السريع">
      {TABS.map(t => {
        const on = t.match(pathname)
        return (
          <Link key={t.href} href={t.href} className={`tabbar-item${on ? ' is-on' : ''}`} aria-current={on ? 'page' : undefined}>
            <Icon name={t.icon} className="icon" />
            <span>{t.label}</span>
          </Link>
        )
      })}
      <button type="button" className="tabbar-item" onClick={onMenu} aria-label="فتح القائمة الكاملة">
        <Icon name="menu" className="icon" />
        <span>القائمة</span>
      </button>
    </nav>
  )
}
