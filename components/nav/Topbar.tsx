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
import CommandPalette from './CommandPalette'

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
  const [isCommandOpen, setIsCommandOpen] = useState(false)
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

  // قراءة تفضيل المظهر وتطبيق كلاس dark وتحديث لون شريط متصفح الهاتف (iOS Theme-Color)
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    const currentAttr = document.documentElement.dataset.theme
    const isDark = savedTheme ? savedTheme === 'dark' : currentAttr === 'dark' || document.documentElement.classList.contains('dark')
    setDark(isDark)
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light'
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    const color = isDark ? '#0F131A' : '#FFFFFF'
    const meta = document.getElementById('theme-color-meta') || document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', color)
    document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.setAttribute('content', color))
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
    if (next === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    const color = next === 'dark' ? '#0F131A' : '#FFFFFF'
    const meta = document.getElementById('theme-color-meta') || document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', color)
    document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.setAttribute('content', color))
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

      <div className="flex flex-col justify-center min-w-0 flex-shrink-0">
        <Suspense fallback={<div id="page-title">{title}</div>}>
          <PageTitle />
        </Suspense>
        {subtitle && <div id="page-sub">{subtitle}</div>}
      </div>

      <div className="top-spacer" />

      {/* Rounded Glass Search Trigger */}
      <button
        className="search-trigger group hover:border-[color:color-mix(in_srgb,var(--accent)_40%,transparent)] hover:shadow-md transition duration-200"
        onClick={() => {
          setIsCommandOpen(true)
          if (onSearch) onSearch()
        }}
      >
        <span className="material-symbols-outlined text-[18px] text-[var(--text-3)] group-hover:text-[var(--accent)] transition-colors">search</span>
        <span className="group-hover:text-[var(--text)] transition-colors">البحث في النظام…</span>
        <span className="kbd border border-[var(--glass-border)] bg-[color:color-mix(in_srgb,var(--surface-3)_80%,transparent)] text-[10.5px]">Ctrl K</span>
      </button>

      <ReminderCenter />
      <NotificationCenter initialCount={notifCount} />

      {/* Theme Switcher Button */}
      <button className="icon-btn help-top" onClick={() => window.dispatchEvent(new Event('open-help'))} aria-label="دليل الاستخدام" title="دليل الاستخدام">
        <span className="material-symbols-outlined text-[20px]" aria-hidden>help</span>
      </button>
      <button className="icon-btn hover:scale-105 active:scale-95 transition-transform" onClick={toggleTheme} aria-label="تبديل المظهر">
        <Icon name={dark ? 'sun' : 'moon'} />
      </button>

      {/* User Profile Section with Dropdown Menu */}
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setIsUserMenuOpen(prev => !prev)}
          className="flex items-center gap-2 px-2.5 py-1 border-s border-[var(--border-soft)] hover:bg-[color:color-mix(in_srgb,var(--surface-2)_80%,transparent)] rounded-xl transition duration-200 cursor-pointer select-none text-right outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          aria-expanded={isUserMenuOpen}
          aria-haspopup="true"
          title="قائمة المستخدم"
        >
          <div className="hidden sm:flex flex-col items-start leading-tight">
            <span className="text-xs font-bold text-[var(--text)] max-w-[130px] truncate" title={displayName}>
              {displayName}
            </span>
            <span className="text-[10px] text-[var(--text-3)] font-medium mt-0.5" title={roleLabel}>
              {roleLabel}
            </span>
          </div>

          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[var(--accent)] to-emerald-500 flex items-center justify-center p-0.5 shadow-xs flex-shrink-0 relative hover:scale-105 transition-transform duration-200">
            {avatarUrl && !imgError ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-full h-full rounded-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-full h-full bg-[var(--surface-2)] rounded-full flex items-center justify-center text-[var(--accent)] font-extrabold text-xs">
                {initials}
              </div>
            )}
          </div>

          <Icon
            name="chev"
            className={`w-3 h-3 text-[var(--text-3)] transition-transform duration-300 ${
              isUserMenuOpen ? 'rotate-180 text-[var(--accent)]' : ''
            }`}
          />
        </button>

        {/* User Menu Dropdown (Apple / Atheros Luxury Design - Solid 100% Opaque) */}
        {isUserMenuOpen && (
          <div
            className="absolute top-[calc(100%+8px)] left-0 w-[290px] bg-white dark:bg-[#0F172A] border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.18),0_0_1px_1px_rgba(0,0,0,0.06)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.6),0_0_1px_1px_rgba(255,255,255,0.08)] z-[99999] overflow-hidden text-right animate-scale-in"
          >
            {/* 1. User Header Profile Card */}
            <div className="p-3.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/60">
              <div className="flex items-center gap-3">
                {/* Avatar with Green Online Status Dot */}
                <div className="relative shrink-0">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[var(--accent)] to-emerald-500 flex items-center justify-center p-0.5 shadow-sm">
                    {avatarUrl && !imgError ? (
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-[var(--surface-2)] rounded-full flex items-center justify-center text-[var(--accent)] font-extrabold text-sm">
                        {initials}
                      </div>
                    )}
                  </div>
                  {/* Online Green Badge */}
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 shadow-xs" title="متصل الآن" />
                </div>

                {/* Name, Email, & Role Badge */}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-extrabold text-slate-900 dark:text-white truncate" title={displayName}>
                    {displayName}
                  </div>
                  {userProfile?.email && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5" title={userProfile.email}>
                      {userProfile.email}
                    </div>
                  )}
                  <span className="inline-flex items-center mt-1 px-2 py-0.5 text-[10.5px] font-bold rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/50">
                    {roleLabel}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Primary Navigation Actions */}
            <div className="p-1.5 space-y-0.5">
              {/* My Profile */}
              <button
                type="button"
                onClick={() => {
                  setIsUserMenuOpen(false)
                  setIsProfileModalOpen(true)
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-xl transition-colors cursor-pointer group text-right"
              >
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[18px] text-slate-500 group-hover:text-[var(--accent)] transition-colors">account_circle</span>
                  <span>الملف الشخصي</span>
                </div>
                <span className="text-[10.5px] font-mono text-slate-400 dark:text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  ⌘ P
                </span>
              </button>

              {/* Users Management (Super Admin & Admin Only) */}
              {(userProfile?.role === 'super_admin' || userProfile?.role === 'admin') && (
                <Link
                  href="/settings/users"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-xl transition-colors group text-right"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-[18px] text-emerald-500 group-hover:scale-105 transition-transform">verified_user</span>
                    <span>إدارة المستخدمين</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800/50 px-1.5 py-0.5 rounded-full">
                    مسؤول
                  </span>
                </Link>
              )}

              {/* Account Settings */}
              <Link
                href="/settings"
                onClick={() => setIsUserMenuOpen(false)}
                className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-xl transition-colors group text-right"
              >
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[18px] text-slate-500 group-hover:text-[var(--accent)] transition-colors">settings</span>
                  <span>إعدادات الحساب</span>
                </div>
                <span className="text-[10.5px] font-mono text-slate-400 dark:text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  ⌘ ,
                </span>
              </Link>

              {/* Reminders & Notifications */}
              <Link
                href="/reminders"
                onClick={() => setIsUserMenuOpen(false)}
                className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-xl transition-colors group text-right"
              >
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[18px] text-slate-500 group-hover:text-amber-500 transition-colors">notifications</span>
                  <span>مركز الإشعارات والتذكيرات</span>
                </div>
                {notifCount > 0 && (
                  <span className="text-[10px] font-bold text-white bg-rose-500 px-1.5 py-0.5 rounded-full num">
                    {notifCount}
                  </span>
                )}
              </Link>
            </div>

            {/* 3. Dark Mode Row with Apple iOS Toggle Switch */}
            <div className="p-1.5 border-t border-slate-100 dark:border-slate-800">
              <div
                onClick={() => toggleTheme()}
                className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-xl transition-colors cursor-pointer select-none"
              >
                <div className="flex items-center gap-2.5">
                  <span className="material-symbols-outlined text-[18px] text-slate-500">
                    {dark ? 'dark_mode' : 'light_mode'}
                  </span>
                  <span>الوضع الداكن</span>
                </div>

                {/* Apple Style Interactive Toggle Switch */}
                <div
                  className={`w-10 h-5.5 rounded-full p-0.5 transition-colors duration-300 ease-in-out flex items-center ${
                    dark ? 'bg-[var(--accent)] justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'
                  }`}
                >
                  <div className="w-4.5 h-4.5 bg-white rounded-full shadow-sm transition-transform" />
                </div>
              </div>
            </div>

            {/* 4. Sign Out Row */}
            <div className="p-1.5 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={loggingOut}
                onClick={handleSignout}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors disabled:opacity-50 text-right cursor-pointer group"
              >
                <span className="material-symbols-outlined text-[18px] text-rose-500 group-hover:-translate-x-0.5 transition-transform">logout</span>
                <span>{loggingOut ? 'جارٍ تسجيل الخروج…' : 'تسجيل الخروج'}</span>
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

      {/* Global Quick Command Palette (Ctrl+K) */}
      <CommandPalette
        open={isCommandOpen}
        onOpenChange={setIsCommandOpen}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onToggleTheme={toggleTheme}
      />
    </header>
  )
}
