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
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Avatar with deep blue/cyan circular styling matching screenshot */}
          <div className="relative shrink-0">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={name}
                className="w-8 h-8 rounded-full object-cover border border-white/20 shadow-xs"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#12365a] to-[#0c233c] text-[#38bdf8] font-black text-[13px] flex items-center justify-center border border-[#38bdf8]/20 shadow-xs">
                {initial}
              </div>
            )}
          </div>

          {/* User Meta Details */}
          <div className="flex flex-col min-w-0 flex-1 text-right">
            <span className="font-black text-[13px] text-[var(--text)] truncate leading-tight group-hover:text-[var(--accent)] transition-colors">
              {name}
            </span>
            {email && (
              <span className="text-[10.5px] text-[var(--text-3)] truncate font-mono mt-0.5" dir="ltr">
                {email}
              </span>
            )}
          </div>
        </div>

        {/* Dedicated Signout Action Button */}
        <button
          type="button"
          onClick={signout}
          disabled={busy}
          className="w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-[var(--text-3)] hover:text-rose-500 hover:bg-rose-500/10 transition-all duration-150 cursor-pointer"
          title="تسجيل الخروج"
          aria-label="تسجيل الخروج"
        >
          <Icon name="out" className="w-4 h-4" />
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
