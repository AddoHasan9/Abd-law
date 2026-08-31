'use client'

import { Suspense, useEffect, useState, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'
import { pageTitle } from '@/lib/nav'
import { createClient } from '@/lib/supabase/client'
import { buildFallbackProfile } from '@/lib/profile-fallback'
import type { Profile } from '@/types/database'
import NotificationCenter from './NotificationCenter'
import ReminderCenter from './ReminderCenter'
import UserProfileModal from './UserProfileModal'

interface Props {
  profile?: Profile | null
  title: string
  subtitle?: string
  notifCount?: number
  onMenu: () => void
  onSearch: () => void
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'مدير النظام الأعلى',
  admin: 'مدير النظام',
  manager: 'مدير',
  lawyer: 'محامي',
  staff: 'موظف',
}

function getInitials(name?: string | null): string {
  if (!name || !name.trim()) return '؟'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '؟'
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase()
}

function PageTitle() {
  const pathname = usePathname()
  const params = useSearchParams()
  return <div id="page-title">{pageTitle(pathname, params.get('type'))}</div>
}

export default function Topbar({ profile, title, subtitle, notifCount = 0, onMenu, onSearch }: Props) {
  const [dark, setDark] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [userProfile, setUserProfile] = useState<Profile | null>(profile ?? null)
  const [imgError, setImgError] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const menuRef = useRef<HTMLDivElement>(null)

  // مزامنة الملف الشخصي الممرَّر من الغلاف
  useEffect(() => {
    if (profile) {
      setUserProfile(profile)
    }
  }, [profile])

  // إن لم يتوفر الملف الشخصي عبر المكونات، نجذبه من Supabase مباشرة
  useEffect(() => {
    if (profile) return
    const supabase = createClient()
    const loadProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (data) {
          setUserProfile({ ...(data as Profile), email: user.email })
        } else {
          setUserProfile(buildFallbackProfile(user))
        }
      } catch {
        // تجاهل الأخطاء والاعتماد على الحالة الافتراضية
      }
    }
    loadProfile()
  }, [profile])

  // قراءة تفضيل المظهر
  useEffect(() => {
    setDark(document.documentElement.dataset.theme === 'dark')
  }, [])

  // إغلاق قائمة المستخدم عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleTheme = () => {
    const next = dark ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    try { localStorage.setItem('theme', next) } catch { /* تجاهل */ }
    setDark(!dark)
  }

  async function handleSignout() {
    setLoggingOut(true)
    try {
      const res = await fetch('/auth/signout', { method: 'POST' })
      window.location.href = res.redirected ? res.url : '/login'
    } catch {
      window.location.href = '/login'
    }
  }

  // التجهيز الديناميكي للبيانات
  const displayName = userProfile?.name?.trim() || userProfile?.email?.split('@')[0] || 'مستخدم'
  const roleLabel = userProfile?.role ? (ROLE_LABELS[userProfile.role] || userProfile.role) : 'مستخدم'
  const initials = getInitials(displayName)
  const avatarUrl = userProfile?.avatar_url || null

  return (
    <header id="topbar">
      <button className="icon-btn" id="menu-btn" onClick={onMenu} aria-label="القائمة">
        <Icon name="menu" />
      </button>

      <div style={{ minWidth: 0 }}>
        <Suspense fallback={<div id="page-title">{title}</div>}>
          <PageTitle />
        </Suspense>
        {subtitle && <div id="page-sub">{subtitle}</div>}
      </div>

      <div className="top-spacer" />

      {/* Rounded Glass Search Trigger */}
      <button className="search-trigger group hover:border-[var(--accent)]/40 hover:shadow-md transition-all duration-200" onClick={onSearch}>
        <span className="material-symbols-outlined text-[18px] text-[var(--text-3)] group-hover:text-[var(--accent)] transition-colors">search</span>
        <span className="group-hover:text-[var(--text)] transition-colors">البحث في النظام…</span>
        <span className="kbd border border-[var(--glass-border)] bg-[var(--surface-3)]/80 text-[10.5px]">Ctrl K</span>
      </button>

      <ReminderCenter />
      <NotificationCenter initialCount={notifCount} />

      {/* Theme Switcher Button */}
      <button className="icon-btn hover:scale-105 active:scale-95 transition-transform" onClick={toggleTheme} aria-label="تبديل المظهر">
        <Icon name={dark ? 'sun' : 'moon'} />
      </button>

      {/* User Profile Section with Dropdown Menu */}
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setIsUserMenuOpen(prev => !prev)}
          className="flex items-center gap-3 pr-2 pl-2 py-1 border-r border-[var(--glass-border)] hover:bg-[var(--surface-2)]/80 rounded-xl transition-all duration-200 cursor-pointer select-none text-right outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          aria-expanded={isUserMenuOpen}
          aria-haspopup="true"
          title="قائمة المستخدم"
        >
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-bold text-[var(--text)] max-w-[150px] truncate" title={displayName}>
              {displayName}
            </span>
            <span className="text-xs text-[var(--text-3)] font-medium" title={roleLabel}>
              {roleLabel}
            </span>
          </div>

          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[var(--accent)] to-emerald-500 flex items-center justify-center p-0.5 shadow-md shadow-blue-500/10 flex-shrink-0 relative hover:scale-105 transition-transform duration-200">
            {avatarUrl && !imgError ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-full h-full rounded-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-full h-full bg-[var(--surface-2)] rounded-full flex items-center justify-center text-[var(--accent)] font-extrabold text-sm">
                {initials}
              </div>
            )}
          </div>

          <Icon
            name="chev"
            className={`w-3.5 h-3.5 text-[var(--text-3)] transition-transform duration-300 ${
              isUserMenuOpen ? 'rotate-180 text-[var(--accent)]' : ''
            }`}
          />
        </button>

        {/* User Menu Dropdown */}
        {isUserMenuOpen && (
          <div
            className="absolute top-[calc(100%+10px)] left-0 w-64 bg-[var(--glass-bg)] backdrop-blur-[20px] border border-[var(--glass-border)] rounded-2xl shadow-[var(--shadow-3)] z-[99999] overflow-hidden py-2 text-right animate-scale-in"
            style={{
              WebkitBackdropFilter: 'var(--glass-backdrop)',
            }}
          >
            {/* User Header Summary */}
            <div className="px-4 py-3 border-b border-[var(--line-soft)] bg-[var(--surface-2)]/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[var(--accent)] to-emerald-500 flex items-center justify-center p-0.5 shadow-sm flex-shrink-0">
                  {avatarUrl && !imgError ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-[var(--surface-2)] rounded-full flex items-center justify-center text-[var(--accent)] font-extrabold text-xs">
                      {initials}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-[var(--text)] truncate" title={displayName}>
                    {displayName}
                  </div>
                  {userProfile?.email && (
                    <div className="text-xs text-[var(--text-3)] truncate" title={userProfile.email}>
                      {userProfile.email}
                    </div>
                  )}
                  <span className="inline-block mt-1 px-2 py-0.5 text-[10.5px] font-bold rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                    {roleLabel}
                  </span>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-1">
              <button
                type="button"
                onClick={() => {
                  setIsUserMenuOpen(false)
                  setIsProfileModalOpen(true)
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-medium text-[var(--text)] hover:bg-[var(--surface-2)] transition-all duration-150 hover:-translate-x-0.5 text-right cursor-pointer"
              >
                <Icon name="user" className="w-4 h-4 text-[var(--accent)]" />
                <span>الملف الشخصي</span>
              </button>

              {(userProfile?.role === 'super_admin' || userProfile?.role === 'admin') && (
                <Link
                  href="/settings/users"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-xs font-medium text-[var(--text)] hover:bg-[var(--surface-2)] transition-all duration-150 hover:-translate-x-0.5"
                >
                  <Icon name="shield" className="w-4 h-4 text-emerald-500" />
                  <span>إدارة المستخدمين</span>
                </Link>
              )}

              <Link
                href="/settings"
                onClick={() => setIsUserMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-xs font-medium text-[var(--text)] hover:bg-[var(--surface-2)] transition-all duration-150 hover:-translate-x-0.5"
              >
                <Icon name="gear" className="w-4 h-4 text-[var(--text-3)]" />
                <span>إعدادات الحساب</span>
              </Link>

              <Link
                href="/reminders"
                onClick={() => setIsUserMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-2.5 text-xs font-medium text-[var(--text)] hover:bg-[var(--surface-2)] transition-all duration-150 hover:-translate-x-0.5"
              >
                <Icon name="bell" className="w-4 h-4 text-[var(--text-3)]" />
                <span>الإشعارات</span>
              </Link>

              <button
                type="button"
                onClick={() => {
                  toggleTheme()
                  setIsUserMenuOpen(false)
                }}
                className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium text-[var(--text)] hover:bg-[var(--surface-2)] transition-all duration-150 hover:-translate-x-0.5 text-right"
              >
                <div className="flex items-center gap-3">
                  <Icon name={dark ? 'sun' : 'moon'} className="w-4 h-4 text-[var(--text-3)]" />
                  <span>تبديل المظهر</span>
                </div>
                <span className="text-[11px] text-[var(--text-3)] font-normal">
                  {dark ? 'الوضع الفاتح' : 'الوضع الداكن'}
                </span>
              </button>
            </div>

            <div className="border-t border-[var(--line-soft)] pt-1 mt-1">
              <button
                type="button"
                disabled={loggingOut}
                onClick={handleSignout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-[var(--bad)] hover:bg-[var(--bad-soft)]/20 transition-all duration-150 hover:-translate-x-0.5 disabled:opacity-50 text-right"
              >
                <Icon name="out" className="w-4 h-4 text-[var(--bad)]" />
                <span>{loggingOut ? 'جارٍ الخروج…' : 'تسجيل الخروج'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Dedicated Personal Profile Modal */}
        <UserProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          profile={userProfile}
        />
      </div>
    </header>
  )
}
