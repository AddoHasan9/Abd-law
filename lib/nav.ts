/**
 * شجرة التنقّل — مصدر واحد للحقيقة
 * ------------------------------------------------------------
 * تطابق البنية المعتمدة في نموذج المرحلة 1:
 *   • رأس «القسم التجاري» قابل للنقر (يعرض كل معاملات القسم)
 *   • الأنواع الثمانية عشر فروعاً مباشرة تحته
 *   • كل مجموعة قابلة للطيّ، وحالة الطيّ تُحفظ محلياً
 */
import type { IconName } from '@/components/ui/Icon'
import { TX_TYPES } from '@/lib/constants'

export interface NavLeaf {
  /** مفتاح فريد لتمييز العنصر النشط */
  key: string
  label: string
  href: string
  icon?: IconName
  /** الصلاحية المطلوبة لإظهاره؛ '*' تعني الأدمن فقط */
  cap?: string
  /** عدّاد يُحسب وقت التشغيل */
  count?: number
}

export interface NavGroup {
  key: string
  /** عنوان المجموعة؛ غيابه يعني مجموعة بلا رأس */
  label?: string
  icon?: IconName
  /** إن وُجد، صار رأس المجموعة نفسه رابطاً قابلاً للنقر */
  href?: string
  items: NavLeaf[]
  /** يُلحِق أنواع المعاملات الثمانية عشر بعد العناصر الثابتة */
  withTxTypes?: boolean
}

export const NAV: NavGroup[] = [
  {
    key: 'g-home',
    items: [
      { key: 'dashboard', label: 'لوحة التحكم', href: '/dashboard', icon: 'grid' },
      { key: 'reminders', label: 'التذكير والاشعارات', href: '/reminders', icon: 'bell' },
      { key: 'tools', label: 'الأدوات', href: '/tools', icon: 'tools' },
    ],
  },

  // القسم التجاري — يشمل الأقسام المعتمدة
  {
    key: 'g-com',
    label: 'القسم التجاري',
    icon: 'brief',
    href: '/commercial',
    items: [
      { key: 'companies-registry', label: 'الشركات', href: '/commercial/companies-registry', icon: 'build2' },
      { key: 'companies', label: 'الشركات وتأسيسها', href: '/commercial/companies', icon: 'build' },
      { key: 'deposits',  label: 'اطلاق الوديعة',    href: '/commercial/deposits',  icon: 'vault' },
      { key: 'llc',       label: 'قسم المحدودة',    href: '/commercial/llc',       icon: 'badge' },
      { key: 'company-ids', label: 'قسم الهويات',   href: '/commercial/ids',       icon: 'stamp' },
      { key: 'tax-assessment', label: 'التحاسب الضريبي', href: '/commercial/tax-assessment', icon: 'scale' },
      { key: 'financial-statements', label: 'الحسابات الختامية', href: '/commercial/financial-statements', icon: 'doc' },
    ],
  },

  // إدارة النظام والمستخدمين والإعدادات
  {
    key: 'g-sys',
    label: 'النظام',
    items: [
      { key: 'users',       label: 'المستخدمون',       href: '/settings/users',       icon: 'shield', cap: '*' },
      { key: 'permissions', label: 'الصلاحيات',        href: '/settings/permissions', icon: 'key',    cap: '*' },
      { key: 'audit',       label: 'سجل التدقيق',      href: '/settings/audit',       icon: 'log',    cap: '*' },
      { key: 'settings',    label: 'الإعدادات العامة', href: '/settings',             icon: 'gear'   },
    ],
  },
]

/** فروع أنواع المعاملات، مع عدّاد كل نوع */
export function txTypeLeaves(counts: Record<string, number> = {}): NavLeaf[] {
  return TX_TYPES.map(t => ({
    key: `tx:${t.id}`,
    label: t.label,
    href: `/commercial?type=${t.id}`,
    count: counts[t.id] ?? 0,
  }))
}

/** يشتق عنوان الصفحة الحالية من شجرة التنقّل، لعرضه في الشريط العلوي */
export function pageTitle(pathname: string, typeParam?: string | null): string {
  for (const g of NAV) {
    if (g.href && pathname === g.href && !typeParam) return g.label ?? ''

    const sortedItems = [...g.items].sort((a, b) => b.href.length - a.href.length)
    for (const leaf of sortedItems) {
      const [base, query] = leaf.href.split('?')
      if (query) {
        const want = new URLSearchParams(query).get('type')
        if (pathname === base && typeParam === want) return leaf.label
      } else if (base === '/settings' ? pathname === '/settings' : (pathname === base || (base !== '/' && pathname.startsWith(base + '/')))) {
        return leaf.label
      }
    }

    if (g.withTxTypes && typeParam) {
      const match = txTypeLeaves().find(t => t.href === `${pathname}?type=${typeParam}`)
      if (match) return match.label
    }
  }
  return 'لوحة التحكم'
}

/** كل عناصر الشجرة مسطّحة — يستعملها البحث الشامل */
export function flatNav(counts?: Record<string, number>): NavLeaf[] {
  return NAV.flatMap(g => [
    ...(g.href && g.label
      ? [{ key: g.key, label: g.label, href: g.href, icon: g.icon }]
      : []),
    ...g.items,
    ...(g.withTxTypes ? txTypeLeaves(counts) : []),
  ])
}
