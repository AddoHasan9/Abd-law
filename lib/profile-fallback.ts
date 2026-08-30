/**
 * ملف شخصي احتياطي — عند غياب صف profiles
 * ------------------------------------------------------------
 * الدور الافتراضي «محامي» (أقل صلاحية) وليس «أدمن».
 */
import type { Profile, UserRole } from '@/types/database'

const VALID_ROLES: UserRole[] = ['super_admin', 'admin', 'manager', 'lawyer', 'staff']

type AuthUserLike = {
  id: string
  email?: string | null
  phone?: string | null
  created_at?: string
  user_metadata?: Record<string, unknown>
}

function resolveRole(meta?: Record<string, unknown>): UserRole {
  const raw = meta?.role
  if (typeof raw === 'string' && VALID_ROLES.includes(raw as UserRole)) {
    return raw as UserRole
  }
  return 'staff'
}

/** يبني Profile من بيانات auth.users عند غياب صف profiles */
export function buildFallbackProfile(user: AuthUserLike): Profile {
  const fallbackName =
    (user.user_metadata?.full_name as string | undefined) ||
    (user.user_metadata?.name as string | undefined) ||
    (user.email ? user.email.split('@')[0] : 'مستخدم')

  const avatarUrl =
    (user.user_metadata?.avatar_url as string | undefined) ||
    (user.user_metadata?.avatar as string | undefined) ||
    null

  return {
    id: user.id,
    name: fallbackName,
    role: resolveRole(user.user_metadata),
    dept: null,
    phone: user.phone ?? null,
    active: true,
    created_at: user.created_at || new Date().toISOString(),
    email: user.email ?? undefined,
    avatar_url: avatarUrl,
  }
}
