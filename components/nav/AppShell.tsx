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
import { createClient } from '@/lib/supabase/client'
import { buildFallbackProfile } from '@/lib/profile-fallback'
import { UserRoleProvider } from '@/lib/context/UserRoleContext'
import QuickHelpGuide from '@/components/ui/QuickHelpGuide'
import { NavigationProgressBar } from '@/components/ui/NavigationProgressBar'
import type { DeadlineItem } from './DeadlineCard'
import type { Profile } from '@/types/database'

interface Props {
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
  profile, officeName, txCounts, badges, deadline, deadlines = [],
  notifCount, title, subtitle, children,
}: Props) {
  const [open, setOpen] = useState(false)
  const [clientProfile, setClientProfile] = useState<Profile | null>(profile)

  // إن لم يمرّ الملف الشخصي من الخادم، نحاول جلبه من جهة العميل
  useEffect(() => {
    if (profile) {
      setClientProfile(profile)
      return
    }
    const supabase = createClient()
    const loadProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (data) {
          setClientProfile({ ...(data as Profile), email: user.email })
        } else {
          setClientProfile(buildFallbackProfile(user))
        }
      } catch {
        // تجاهل الأخطاء واعتمد على الملف الافتراضي
      }
    }
    loadProfile()
  }, [profile])

  // منع تمرير الخلفية عند فتح القائمة على الجوال
  useEffect(() => {
    document.body.classList.toggle('side-open', open)
    return () => document.body.classList.remove('side-open')
  }, [open])

  return (
    <UserRoleProvider profile={clientProfile}>
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
          <main id="view-root" tabIndex={-1} className="transition-all duration-300">
            <div className="view animate-fade-in-up">{children}</div>
          </main>
        </div>

        {/* Dynamic Page Help & Guidance Guide */}
        <QuickHelpGuide />
      </div>
    </UserRoleProvider>
  )
}
