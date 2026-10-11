'use client'

/**
 * غلاف التطبيق — يجمع الشريط الجانبي والعلوي والمحتوى
 * ------------------------------------------------------------
 * مكوّن عميل لأنه يدير حالة فتح القائمة على الشاشات الصغيرة،
 * لكن البيانات كلها تأتي جاهزة من التخطيط الخادمي.
 */
import { useState, useEffect, Suspense } from 'react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import type { PermissionsMatrix } from '@/lib/permissions'
import { UserRoleProvider } from '@/lib/context/UserRoleContext'
import QuickHelpGuide from '@/components/ui/QuickHelpGuide'
import { NavigationProgressBar } from '@/components/ui/NavigationProgressBar'
import type { DeadlineItem } from './DeadlineCard'
import { FSAlertBanner } from './FSAlertBanner'
import MobileTabBar from './MobileTabBar'
import type { Profile } from '@/types/database'

interface Props {
  permissions: PermissionsMatrix
  profile: Profile | null
  officeName: string
  txCounts: Record<string, number>
  badges: Record<string, number>
  deadline?: DeadlineItem | null
  deadlines?: DeadlineItem[]
  notifCount: number
  title: string
  subtitle?: string
  children: React.ReactNode
}

export default function AppShell({
  profile, permissions, officeName, txCounts, badges, deadline, deadlines = [],
  notifCount, title, subtitle, children,
}: Props) {
  const [open, setOpen] = useState(false)
  // الحاسبة: طي الشريط الجانبي إلى أيقونات (يُحفظ في المتصفح)
  // null = لم يُقرأ الاختيار بعد ⇒ لا نلمس الصنف (يضعه سكربت الرأس قبل الرسم، فلا وميض)
  const [collapsedPref, setCollapsed] = useState<boolean | null>(null)
  const collapsed = collapsedPref === true
  useEffect(() => {
    try { setCollapsed(localStorage.getItem('side-collapsed') === '1') } catch { setCollapsed(false) }
  }, [])
  useEffect(() => {
    if (collapsedPref === null) return
    document.documentElement.classList.toggle('side-collapsed', collapsedPref)
  }, [collapsedPref])
  const toggleCollapsed = () => setCollapsed(v => {
    const next = !v
    try { localStorage.setItem('side-collapsed', next ? '1' : '0') } catch { /* تخزين غير متاح */ }
    return next
  })
  const clientProfile = profile

  // منع تمرير الخلفية عند فتح القائمة على الجوال
  useEffect(() => {
    document.body.classList.toggle('side-open', open)
    return () => document.body.classList.remove('side-open')
  }, [open])

  // قفل تمرير نافذة المتصفح الرئيسية (Window Scroll Lock) لمنع اختفاء الشريط العلوي أو انزياحه
  useEffect(() => {
    const lockWindowScroll = () => {
      if (window.scrollY !== 0 || window.scrollX !== 0) {
        window.scrollTo(0, 0)
      }
    }
    window.addEventListener('scroll', lockWindowScroll, { passive: true })
    lockWindowScroll()
    return () => window.removeEventListener('scroll', lockWindowScroll)
  }, [])

  return (
    <UserRoleProvider profile={clientProfile} permissions={permissions}>
      <NavigationProgressBar />
      <div id="app">
        <div id="side-veil" onClick={() => setOpen(false)} />

        <Suspense fallback={<aside id="sidebar" />}>
          <Sidebar
            profile={clientProfile}
            officeName={officeName}
            txCounts={txCounts}
            badges={badges}
            deadline={deadline}
            deadlines={deadlines}
            onNavigate={() => setOpen(false)}
            collapsed={collapsed}
            onToggleCollapse={toggleCollapsed}
          />
        </Suspense>

        <div id="main">
          <Topbar
            profile={clientProfile}
            title={title}
            subtitle={subtitle}
            notifCount={notifCount}
            onMenu={() => setOpen(v => !v)}
            onSearch={() => { /* البحث الشامل — يُبنى في مرحلة لاحقة */ }}
          />
          <main id="view-root">
            <FSAlertBanner deadlines={deadlines} />
            <div className="view">{children}</div>
          </main>
        </div>

        <MobileTabBar onMenu={() => setOpen(v => !v)} />
        {/* Dynamic Page Help & Guidance Guide */}
        <QuickHelpGuide />
      </div>
    </UserRoleProvider>
  )
}
