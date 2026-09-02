'use client'

/**
 * بطاقة المستخدم الفاخرة في أسفل الشريط الجانبي — تظهر الملف التعريفي وتسجيل الخروج
 */
import React, { useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import type { Profile } from '@/types/database'
import UserProfileModal from './UserProfileModal'

const ROLE_AR: Record<string, string> = {
  super_admin: 'مدير النظام الأعلى',
  admin: 'مدير النظام',
  manager: 'مدير العمليات',
  lawyer: 'محامي ومستشار',
  staff: 'موظف إداري',
}

export default function UserChip({ profile }: { profile: Profile | null }) {
  const [busy, setBusy] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)

  async function signout(e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('هل تريد تسجيل الخروج من النظام؟')) return
    setBusy(true)
    try {
      const res = await fetch('/auth/signout', { method: 'POST' })
      window.location.href = res.redirected ? res.url : '/login'
    } catch {
      window.location.href = '/login'
    }
  }

  const name = profile?.name || profile?.email || 'غير مسجّل'
  const initial = name.trim().charAt(0).toUpperCase() || '؟'
  const roleLabel = ROLE_AR[profile?.role ?? ''] ?? 'مستخدم'
  const email = profile?.email || ''

  return (
    <>
      <div
        onClick={() => setIsProfileModalOpen(true)}
        className="user-chip-card group cursor-pointer"
        title="اضغط لعرض وتعديل الملف الشخصي"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Avatar with luxury gradient & live online status */}
          <div className="relative shrink-0">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={name}
                className="w-7 h-7 rounded-full object-cover border border-white/20 shadow-xs"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-[11px] flex items-center justify-center border border-white/20 shadow-xs">
                {initial}
              </div>
            )}
            <span
              className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-[var(--surface-2)] shadow-xs"
              title="متصل الآن"
            />
          </div>

          {/* User Meta Details */}
          <div className="flex flex-col min-w-0 flex-1 text-right">
            <div className="flex items-center gap-1 leading-tight">
              <span className="font-extrabold text-[12px] text-[var(--text)] truncate group-hover:text-[var(--accent)] transition-colors">
                {name}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-[var(--accent-soft)] text-[var(--accent)] shrink-0 border border-[var(--accent)]/15">
                {roleLabel}
              </span>
              {email && profile?.name && profile.name !== profile.email && (
                <span className="text-[9.5px] text-[var(--text-3)] truncate font-mono opacity-80" dir="ltr">
                  {email}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Dedicated Signout Action Button */}
        <button
          type="button"
          onClick={signout}
          disabled={busy}
          className="w-6 h-6 shrink-0 rounded-md flex items-center justify-center text-[var(--text-3)] hover:text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all duration-150 cursor-pointer"
          title="تسجيل الخروج"
          aria-label="تسجيل الخروج"
        >
          <Icon name="out" className="w-3.5 h-3.5" />
        </button>
      </div>

      {isProfileModalOpen && (
        <UserProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          profile={profile}
        />
      )}
    </>
  )
}
