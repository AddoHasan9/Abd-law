'use client'

/**
 * بطاقة المستخدم في أسفل الشريط الجانبي — مع تسجيل الخروج
 */
import { useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import type { Profile } from '@/types/database'

const ROLE_AR: Record<string, string> = {
  admin: 'أدمن', manager: 'مدير', lawyer: 'محامي',
}

export default function UserChip({ profile }: { profile: Profile | null }) {
  const [busy, setBusy] = useState(false)

  async function signout() {
    setBusy(true)
    // POST إلى مسار الخروج ثم إعادة التحميل
    try {
      const res = await fetch('/auth/signout', { method: 'POST' })
      window.location.href = res.redirected ? res.url : '/login'
    } catch {
      // فشل الطلب (مثلاً انقطاع الشبكة) — التحويل يدوياً بدل تعليق الزر
      window.location.href = '/login'
    }
  }

  const name = profile?.name || profile?.email || 'غير مسجّل'
  const initial = name.trim().charAt(0).toUpperCase() || '؟'
  const subText = busy
    ? 'جارٍ الخروج…'
    : profile?.email && profile?.name && profile.name !== profile.email
    ? profile.email
    : (ROLE_AR[profile?.role ?? ''] ?? 'مستخدم')

  return (
    <button className="user-chip" onClick={signout} disabled={busy} title="اضغط لتسجيل الخروج">
      <div className="avatar">{initial}</div>
      <div className="user-meta" style={{ overflow: 'hidden' }}>
        <div className="user-name" title={name} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {name}
        </div>
        <div className="user-role" title={subText} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {subText}
        </div>
      </div>
      <Icon name="out" className="icon" style={{ width: 18, height: 18, color: 'var(--text-3)', flexShrink: 0 }} />
    </button>
  )
}
