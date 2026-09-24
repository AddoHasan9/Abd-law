'use client'

/**
 * سياق هوية وصلاحيات المستخدم بالواجهة الأمامية
 * ------------------------------------------------------------
 * يتيح لكافة مكونات الواجهة التحقق الفوري من صلاحيات المستخدم الحالي
 * وإخفاء أو تعطيل الأزرار والإجراءات غير المصرح بها بسلاسة.
 */
import React, { createContext, useContext } from 'react'
import type { Profile, UserRole } from '@/types/database'
import { hasPermission, emptyPermissionsMatrix, type PermissionsMatrix } from '@/lib/permissions'
import type { RolePermissions } from '@/app/(app)/settings/users/actions'

export interface UserRoleContextValue {
  profile: Profile | null
  role: UserRole
  can: (category: keyof RolePermissions, action: string) => boolean
  isSuperAdmin: boolean
  isAdmin: boolean
  isManager: boolean
  isLawyer: boolean
  isStaff: boolean
}

const UserRoleContext = createContext<UserRoleContextValue>({
  profile: null,
  role: 'staff',
  can: () => false,
  isSuperAdmin: false,
  isAdmin: false,
  isManager: false,
  isLawyer: false,
  isStaff: true,
})

export function UserRoleProvider({
  profile,
  children,
  permissions,
}: {
  profile: Profile | null
  permissions: PermissionsMatrix
  children: React.ReactNode
}) {
  const role: UserRole = (profile?.role as UserRole) || 'staff'

  const can = (category: keyof RolePermissions, action: string) => {
    return profile?.active === true && hasPermission(role, category, action, permissions || emptyPermissionsMatrix())
  }

  const value: UserRoleContextValue = {
    profile,
    role,
    can,
    isSuperAdmin: role === 'super_admin',
    isAdmin: role === 'admin' || role === 'super_admin',
    isManager: role === 'manager',
    isLawyer: role === 'lawyer',
    isStaff: role === 'staff',
  }

  return <UserRoleContext.Provider value={value}>{children}</UserRoleContext.Provider>
}

export function usePermissions(): UserRoleContextValue {
  return useContext(UserRoleContext)
}
