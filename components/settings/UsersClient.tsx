'use client'

import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'
import { formatDate } from '@/lib/constants'
import { useModalBodyLock } from '@/lib/hooks/useModalBodyLock'
import { usePermissions } from '@/lib/context/UserRoleContext'
import type { ProfileWithStats } from '@/lib/data/profiles'
import type { UserRole } from '@/types/database'
import {
  saveUserAction,
  toggleUserActiveAction,
  deleteUserAction,
  permanentDeleteUserAction,
  resetUserPasswordAction,
  getUserAuditLogsAction,
  type UserAuditRecord,
} from '@/app/(app)/settings/users/actions'

interface Props {
  initialProfiles: ProfileWithStats[]
  currentUserRole?: UserRole
}

const ROLE_BADGES: Record<UserRole, { label: string; badgeClass: string; desc: string }> = {
  super_admin: {
    label: 'مدير النظام الأعلى',
    badgeClass: 'bg-red-500/15 text-red-500 border border-red-500/30',
    desc: 'تحكم مطلق بإدارة المستخدمين ومنح الأدوار والصلاحيات واستعادة الأرشيف',
  },
  admin: {
    label: 'مدير النظام',
    badgeClass: 'bg-indigo-500/15 text-indigo-500 border border-indigo-500/30',
    desc: 'إشراف شامل على كافة الأقسام والمستخدمين والعمليات',
  },
  manager: {
    label: 'مدير العمليات',
    badgeClass: 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30',
    desc: 'إدارة وتوجيه المعاملات وسير العمل وفرق المحامين والموظفين',
  },
  lawyer: {
    label: 'محامي ومستشار',
    badgeClass: 'bg-amber-500/15 text-amber-500 border border-amber-500/30',
    desc: 'تولّي وتنفيذ المعاملات والمهام الموكلة إليه حصراً',
  },
  staff: {
    label: 'موظف إداري',
    badgeClass: 'bg-[var(--surface-3)] text-[var(--text-3)] border border-[var(--line-soft)]',
    desc: 'صلاحيات استعراض وإدخال بيانات بيئية مخصصة',
  },
}

export default function UsersClient({ initialProfiles }: Props) {
  const { isSuperAdmin, can } = usePermissions()
  const canManageUsers = can('users', 'create_users') || isSuperAdmin
  const canManagePermissions = can('users', 'manage_permissions') || isSuperAdmin
  const [profiles, setProfiles] = useState<ProfileWithStats[]>(initialProfiles)
  const [auditLogs, setAuditLogs] = useState<UserAuditRecord[]>([])

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [deptFilter, setDeptFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Modals & Floating Menu State
  const [activeMenuUser, setActiveMenuUser] = useState<ProfileWithStats | null>(null)
  const [menuCoords, setMenuCoords] = useState<{ top?: number; bottom?: number; right: number } | null>(null)
  const [viewingUser, setViewingUser] = useState<ProfileWithStats | null>(null)
  const [editingUser, setEditingUser] = useState<ProfileWithStats | null>(null)
  const [resetPassUser, setResetPassUser] = useState<ProfileWithStats | null>(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  useModalBodyLock(Boolean(viewingUser || editingUser || resetPassUser || isAddModalOpen))

  useEffect(() => {
    function handleScrollOrResize() {
      if (activeMenuUser) {
        setActiveMenuUser(null)
        setMenuCoords(null)
      }
    }
    if (activeMenuUser) {
      window.addEventListener('scroll', handleScrollOrResize, true)
      window.addEventListener('resize', handleScrollOrResize)
    }
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
    }
  }, [activeMenuUser])

  // Form Fields
  const [formId, setFormId] = useState<string>('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<UserRole>('lawyer')
  const [dept, setDept] = useState('')
  const [title, setTitle] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [active, setActive] = useState(true)
  const [newPassword, setNewPassword] = useState('')

  const hasOpenModal = !!(viewingUser || isAddModalOpen || resetPassUser)

  useModalBodyLock(hasOpenModal, () => {
    setViewingUser(null)
    setIsAddModalOpen(false)
    setResetPassUser(null)
    setActiveMenuUser(null)
  })

  useEffect(() => {
    async function loadAudit() {
      const res = await getUserAuditLogsAction()
      if (res.success && res.data) {
        setAuditLogs(res.data)
      }
    }
    loadAudit()
  }, [])

  // Auto-close action menu on scroll or resize to prevent jumping
  useEffect(() => {
    if (!activeMenuUser) return
    const handleScrollOrResize = () => {
      setActiveMenuUser(null)
      setMenuCoords(null)
    }
    window.addEventListener('scroll', handleScrollOrResize, true)
    window.addEventListener('resize', handleScrollOrResize)
    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
    }
  }, [activeMenuUser])

  // Unique departments list
  const departments = useMemo(() => {
    const set = new Set<string>()
    profiles.forEach(p => {
      if (p.dept) set.add(p.dept)
    })
    return Array.from(set)
  }, [profiles])

  // Filtered users list
  const filteredProfiles = useMemo(() => {
    return profiles.filter(p => {
      const q = searchQuery.trim().toLowerCase()
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.email && p.email.toLowerCase().includes(q)) ||
        (p.phone && p.phone.includes(q)) ||
        (p.dept && p.dept.toLowerCase().includes(q))

      const matchesRole = roleFilter === 'all' || p.role === roleFilter
      const matchesDept = deptFilter === 'all' || p.dept === deptFilter
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && p.active) ||
        (statusFilter === 'inactive' && !p.active)

      return matchesSearch && matchesRole && matchesDept && matchesStatus
    })
  }, [profiles, searchQuery, roleFilter, deptFilter, statusFilter])

  const openAddModal = () => {
    setEditingUser(null)
    setFormId('')
    setName('')
    setRole('lawyer')
    setDept('')
    setTitle('')
    setPhone('')
    setEmail('')
    setActive(true)
    setIsAddModalOpen(true)
  }

  const openEditModal = (user: ProfileWithStats) => {
    if (!isSuperAdmin && user.role === 'super_admin') {
      alert('عذراً، يقتصر تعديل حسابات Super Admin على المدير الأعلى فقط')
      return
    }
    setEditingUser(user)
    setFormId(user.id)
    setName(user.name)
    setRole(user.role)
    setDept(user.dept || '')
    setTitle(user.title || '')
    setPhone(user.phone || '')
    setEmail(user.email || `${user.name.toLowerCase()}@khazraji-law.com`)
    setActive(user.active)
    setIsAddModalOpen(true)
  }

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    setMessage(null)

    const res = await saveUserAction({
      id: formId || undefined,
      name,
      role,
      dept,
      title,
      phone,
      email,
      active,
    })
    setLoading(false)

    if (res.success && res.data) {
      if (editingUser) {
        setProfiles(prev => prev.map(p => (p.id === res.data!.id ? res.data! : p)))
        setMessage({ type: 'ok', text: 'تم تحديث بيانات ورتبة المستخدم بنجاح' })
      } else {
        setProfiles(prev => [...prev, res.data!])
        setMessage({ type: 'ok', text: 'تم إكمال وتفعيل بروفايل المستخدم بنجاح' })
      }
      setIsAddModalOpen(false)
      const auditRes = await getUserAuditLogsAction()
      if (auditRes.success && auditRes.data) setAuditLogs(auditRes.data)
    } else {
      setMessage({ type: 'err', text: res.error || 'حدث خطأ أثناء الحفظ' })
    }
  }

  const handleToggleActive = async (user: ProfileWithStats) => {
    if (!isSuperAdmin && user.role === 'super_admin') {
      alert('لا يمكن تعطيل حساب Super Admin')
      return
    }
    const res = await toggleUserActiveAction(user.id)
    if (res.success) {
      setProfiles(prev => prev.map(p => (p.id === user.id ? { ...p, active: res.active! } : p)))
      const auditRes = await getUserAuditLogsAction()
      if (auditRes.success && auditRes.data) setAuditLogs(auditRes.data)
    }
  }

  const handleSoftDeleteUser = async (user: ProfileWithStats) => {
    if (!isSuperAdmin) {
      alert('عذراً، يقتصر تعطيل وأرشفة الحسابات على Super Admin فقط')
      return
    }
    if (user.role === 'super_admin') {
      alert('لا يمكن حذف أو أرشفة حساب Super Admin الرئيسي')
      return
    }
    if (!confirm(`هل أنت تأكد من تعطيل وأرشفة حساب "${user.name}"؟ (سيتم حفظ جميع المعاملات وسجل التدقيق ولن يتم مسح أي بيانات دائمية)`)) {
      return
    }
    const res = await deleteUserAction(user.id)
    if (res.success) {
      setProfiles(prev => prev.map(p => (p.id === user.id ? { ...p, active: false } : p)))
      setMessage({ type: 'ok', text: `تم تعطيل وأرشفة حساب ${user.name} مع حفظ كافة السجلات` })
      const auditRes = await getUserAuditLogsAction()
      if (auditRes.success && auditRes.data) setAuditLogs(auditRes.data)
    }
  }

  const handlePermanentDeleteUser = async (user: ProfileWithStats) => {
    if (!isSuperAdmin) {
      alert('عذراً، يقتصر حذف الحسابات نهائياً على Super Admin فقط')
      return
    }
    if (user.role === 'super_admin' || user.id === 'db13125d-3aa1-46ab-9159-8fad18746623') {
      alert('لا يمكن حذف حساب Super Admin الرئيسي نهائياً')
      return
    }
    if (!confirm(`تحذير نهائي: هل تريد حذف المستخدم "${user.name}" نهائياً من النظام وقاعدة بيانات Supabase Auth؟\nلا يمكن التراجع عن هذا الإجراء.`)) {
      return
    }

    setLoading(true)
    const res = await permanentDeleteUserAction(user.id)
    setLoading(false)

    if (res.success) {
      setProfiles(prev => prev.filter(p => p.id !== user.id))
      setMessage({ type: 'ok', text: `تم حذف المستخدم ${user.name} نهائياً من النظام وقاعدة البيانات` })
      const auditRes = await getUserAuditLogsAction()
      if (auditRes.success && auditRes.data) setAuditLogs(auditRes.data)
    } else {
      setMessage({ type: 'err', text: res.error || 'فشل حذف المستخدم' })
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetPassUser) return
    setLoading(true)
    const res = await resetUserPasswordAction(resetPassUser.id, resetPassUser.email || `${resetPassUser.name}@khazraji-law.com`)
    setLoading(false)
    if (res.success) {
      setMessage({ type: 'ok', text: res.message || 'تم إرسال تعليمات إعادة ضبط كلمة المرور' })
      setResetPassUser(null)
      const auditRes = await getUserAuditLogsAction()
      if (auditRes.success && auditRes.data) setAuditLogs(auditRes.data)
    } else {
      setMessage({ type: 'err', text: res.error || 'فشلت العملية' })
    }
  }

  return (
    <div className="flex flex-col w-full gap-6 relative z-10">
      
      {/* 1. Page Header & Actions Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between w-full gap-4 mb-1">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text)]">إدارة المستخدمين والأذونات</h1>
          <p className="text-base text-[var(--text-3)]">مكتب المحامي عبدالحسن الخزرجي — التحكم بالأدوار الخماسية وتفعيل البروفايلات</p>
        </div>

        <div className="flex items-center gap-3">
          {canManagePermissions && (
            <Link
              href="/settings/permissions"
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold border border-[var(--glass-border)] bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--surface-3)] transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">key</span>
              <span>مصفوفة الصلاحيات</span>
            </Link>
          )}

          {canManageUsers && (
            <button
              type="button"
              onClick={openAddModal}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold bg-[var(--accent)] text-white shadow-lg hover:opacity-95 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              <span>إضافة مستخدم جديد</span>
            </button>
          )}
        </div>
      </div>

      {/* Alert Banner */}
      {message && (
        <div
          className={`p-4 rounded-2xl text-sm font-bold flex items-center justify-between backdrop-blur-md shadow-md border ${
            message.type === 'ok'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
              : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
          }`}
        >
          <span>{message.text}</span>
          <button type="button" onClick={() => setMessage(null)} className="opacity-70 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* 2. Compact Search & Filter Toolbar */}
      <div className="glass-card rounded-[24px] p-5 flex flex-col lg:flex-row items-center justify-between gap-4 w-full">
        {/* Search Input */}
        <div className="relative flex-1 w-full">
          <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-3)] text-[20px] pointer-events-none">
            search
          </span>
          <input
            type="text"
            className="w-full pr-12 pl-4 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--glass-border)] text-[var(--text)] placeholder:text-[var(--text-3)] text-sm font-medium focus:outline-none focus:border-[var(--accent)] transition-all"
            placeholder="بحث باسم المستخدم، البريد الإلكتروني، الهاتف، القسم..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="flex items-center gap-3 w-full lg:w-auto flex-wrap">
          {/* Role Filter */}
          <select
            className="px-4 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--glass-border)] text-[var(--text)] text-xs font-semibold focus:outline-none transition-all cursor-pointer"
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
          >
            <option value="all">كل الأدوار (All Roles)</option>
            <option value="super_admin">Super Admin</option>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="lawyer">Lawyer</option>
            <option value="staff">Staff</option>
          </select>

          {/* Department Filter */}
          <select
            className="px-4 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--glass-border)] text-[var(--text)] text-xs font-semibold focus:outline-none transition-all cursor-pointer"
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
          >
            <option value="all">كل الأقسام (All Depts)</option>
            {departments.map(d => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            className="px-4 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[var(--glass-border)] text-[var(--text)] text-xs font-semibold focus:outline-none transition-all cursor-pointer"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="all">كل الحالات (All Statuses)</option>
            <option value="active">نشط (Active)</option>
            <option value="inactive">معطّل (Inactive)</option>
          </select>

          {/* Counter Badge */}
          <div className="px-3.5 py-2 rounded-xl bg-[var(--accent-soft)] border border-[var(--accent)]/20 text-[var(--accent)] text-xs font-bold whitespace-nowrap">
            {filteredProfiles.length} مستخدم
          </div>
        </div>
      </div>

      {/* 3. Modern Glassmorphism Users Table */}
      <div className="glass-card rounded-[28px] shadow-xl w-full border border-[var(--glass-border)]">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm border-collapse">
            <thead>
              <tr className="bg-[var(--surface-2)] text-[var(--text-3)] text-xs font-bold uppercase tracking-wider border-b border-[var(--glass-border)]">
                <th className="py-4 px-6">الاسم الكامل (Full Name)</th>
                <th className="py-4 px-6">البريد الإلكتروني (Email)</th>
                <th className="py-4 px-6">الدور الوظيفي (Role)</th>
                <th className="py-4 px-6">القسم (Department)</th>
                <th className="py-4 px-6">الهاتف (Phone)</th>
                <th className="py-4 px-6 text-center">الحالة (Status)</th>
                <th className="py-4 px-6">آخر دخول (Last Login)</th>
                <th className="py-4 px-6">تاريخ الإنشاء</th>
                <th className="py-4 px-6 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--glass-border)]/50">
              {filteredProfiles.map((u, idx) => {
                const roleBadge = ROLE_BADGES[u.role] || ROLE_BADGES.lawyer
                const userEmail = u.email || `${u.name.toLowerCase()}@khazraji-law.com`
                const isBottomRow = idx >= Math.max(0, filteredProfiles.length - 2)

                return (
                  <tr
                    key={u.id}
                    className={`hover:bg-[var(--surface-3)] transition-colors ${
                      u.active ? 'opacity-100' : 'opacity-60 bg-[var(--surface-2)]/40'
                    }`}
                  >
                    {/* Full Name & Avatar */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-base flex-none ${
                            u.role === 'super_admin'
                              ? 'bg-red-500/20 text-red-500 border border-red-500/30'
                              : u.active
                              ? 'bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/30'
                              : 'bg-[var(--surface-3)] text-[var(--text-3)]'
                          }`}
                        >
                          {u.name.slice(0, 1)}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-[var(--text)] truncate">{u.name}</span>
                          <span className="text-xs text-[var(--text-3)] truncate">{u.title || 'عضو فريق'}</span>
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="py-4 px-6 text-xs text-[var(--text-2)] font-mono ltr text-right">
                      {userEmail}
                    </td>

                    {/* Role Badge */}
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-xs font-extrabold shadow-sm ${roleBadge.badgeClass}`}>
                        {roleBadge.label}
                      </span>
                    </td>

                    {/* Department */}
                    <td className="py-4 px-6 text-xs font-medium text-[var(--text-2)]">
                      {u.dept || 'عام'}
                    </td>

                    {/* Phone */}
                    <td className="py-4 px-6 text-xs font-semibold text-[var(--text-2)] num">
                      {u.phone || '—'}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-6 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 ${
                          u.active
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-500/15 text-slate-400 border border-slate-500/30'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${u.active ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-slate-400'}`} />
                        <span>{u.active ? 'نشط' : 'معطّل'}</span>
                      </span>
                    </td>

                    {/* Last Login */}
                    <td className="py-4 px-6 text-xs text-[var(--text-3)]">
                      {u.last_login ? formatDate(u.last_login, true) : 'لم يسجّل بعد'}
                    </td>

                    {/* Created Date */}
                    <td className="py-4 px-6 text-xs text-[var(--text-3)]">
                      {formatDate(u.created_at)}
                    </td>

                    {/* Actions Menu */}
                    <td className="py-4 px-6 text-center">
                      <button
                        type="button"
                        className="w-8 h-8 rounded-xl bg-[var(--surface-2)] border border-[var(--glass-border)] text-[var(--text)] hover:bg-[var(--surface-3)] transition-all flex items-center justify-center mx-auto cursor-pointer"
                        onClick={e => {
                          e.stopPropagation()
                          if (activeMenuUser?.id === u.id) {
                            setActiveMenuUser(null)
                            setMenuCoords(null)
                            return
                          }
                          const rect = e.currentTarget.getBoundingClientRect()
                          const menuHeight = 240
                          const menuWidth = 205
                          let top = rect.bottom + 4
                          if (top + menuHeight > window.innerHeight - 10) {
                            top = Math.max(10, rect.top - menuHeight - 4)
                          }
                          const right = Math.max(12, Math.min(window.innerWidth - menuWidth - 12, window.innerWidth - rect.right))
                          setMenuCoords({ top, right })
                          setActiveMenuUser(u)
                        }}
                        aria-label="خيارات المستخدم"
                      >
                        <span className="material-symbols-outlined text-[18px]">more_vert</span>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Actions Menu Portal */}
      {activeMenuUser && menuCoords && typeof document !== 'undefined' && createPortal(
        <>
          <div
            className="fixed inset-0 z-[999998] bg-black/10 sm:bg-transparent"
            onClick={() => {
              setActiveMenuUser(null)
              setMenuCoords(null)
            }}
          />
          <div
            className="fixed z-[999999] min-w-[200px] max-w-[90vw] bg-[var(--surface)] border border-[var(--glass-border)] rounded-2xl shadow-2xl p-1.5 text-right flex flex-col gap-1 backdrop-blur-2xl animate-scale-in"
            style={{
              top: `${menuCoords.top}px`,
              right: `${menuCoords.right}px`,
            }}
            onClick={e => e.stopPropagation()}
            dir="rtl"
          >
            {/* View */}
            <button
              type="button"
              onClick={() => {
                const cur = activeMenuUser
                setActiveMenuUser(null)
                setMenuCoords(null)
                setViewingUser(cur)
              }}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-semibold text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer text-right"
            >
              <span className="material-symbols-outlined text-[16px] text-blue-400">visibility</span>
              <span>عرض البيانات الكاملة</span>
            </button>

            {/* Edit */}
            <button
              type="button"
              onClick={() => {
                const cur = activeMenuUser
                setActiveMenuUser(null)
                setMenuCoords(null)
                openEditModal(cur)
              }}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-semibold text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer text-right"
            >
              <span className="material-symbols-outlined text-[16px] text-amber-400">edit</span>
              <span>تعديل البروفايل والدور</span>
            </button>

            {/* Activate / Deactivate */}
            <button
              type="button"
              onClick={() => {
                const cur = activeMenuUser
                setActiveMenuUser(null)
                setMenuCoords(null)
                handleToggleActive(cur)
              }}
              className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-semibold hover:bg-[var(--surface-2)] transition-colors cursor-pointer text-right ${
                activeMenuUser.active ? 'text-amber-500' : 'text-emerald-500'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">
                {activeMenuUser.active ? 'block' : 'check_circle'}
              </span>
              <span>{activeMenuUser.active ? 'تعطيل الحساب' : 'تفعيل الحساب'}</span>
            </button>

            {/* Reset Password */}
            <button
              type="button"
              onClick={() => {
                const cur = activeMenuUser
                setActiveMenuUser(null)
                setMenuCoords(null)
                setResetPassUser(cur)
              }}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-semibold text-[var(--text-2)] hover:bg-[var(--surface-2)] transition-colors cursor-pointer text-right"
            >
              <span className="material-symbols-outlined text-[16px] text-purple-400">lock_reset</span>
              <span>إعادة ضبط كلمة المرور</span>
            </button>

            {/* Soft Delete / Archive */}
            {isSuperAdmin && activeMenuUser.role !== 'super_admin' && (
              <button
                type="button"
                onClick={() => {
                  const cur = activeMenuUser
                  setActiveMenuUser(null)
                  setMenuCoords(null)
                  handleSoftDeleteUser(cur)
                }}
                className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-semibold text-amber-500 hover:bg-amber-500/10 transition-colors cursor-pointer text-right"
              >
                <span className="material-symbols-outlined text-[16px]">archive</span>
                <span>أرشفة وتعطيل الحساب</span>
              </button>
            )}

            {/* Permanent Delete */}
            {isSuperAdmin && activeMenuUser.role !== 'super_admin' && activeMenuUser.id !== 'db13125d-3aa1-46ab-9159-8fad18746623' && (
              <button
                type="button"
                onClick={() => {
                  const cur = activeMenuUser
                  setActiveMenuUser(null)
                  setMenuCoords(null)
                  handlePermanentDeleteUser(cur)
                }}
                className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer text-right"
              >
                <span className="material-symbols-outlined text-[16px]">delete_forever</span>
                <span>حذف المستخدم نهائياً</span>
              </button>
            )}
          </div>
        </>,
        document.body
      )}

      {/* MODAL 1: View User Details */}
      {viewingUser && (
        <div id="modal-root" className="on">
          <div className="modal-veil" onClick={() => setViewingUser(null)} role="presentation" aria-hidden="true" />
          <div className="modal" style={{ '--modal-max-w': 'var(--modal-md, 560px)' } as React.CSSProperties}>
            <div className="modal-head">
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  background: 'var(--accent-soft)',
                  color: 'var(--accent)',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon name="badge" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>بيانات المستخدم: {viewingUser.name}</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>عرض بطاقة العضو وسجل التدقيق والنشاط</span>
              </div>
              <button type="button" onClick={() => setViewingUser(null)} className="icon-btn" aria-label="إغلاق">
                <Icon name="x" />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
              <div className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--line-soft)] flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-3)] font-semibold">اسم البروفايل:</span>
                  <span className="text-sm font-bold text-[var(--text)]">{viewingUser.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-3)] font-semibold">البريد الإلكتروني:</span>
                  <span className="text-sm font-bold text-[var(--accent)] font-mono">{viewingUser.email || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-3)] font-semibold">الدور الوظيفي:</span>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
                    {viewingUser.role}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-3)] font-semibold">القسم والمسمى:</span>
                  <span className="text-sm font-medium text-[var(--text-2)]">{viewingUser.dept || 'عام'} • {viewingUser.title || 'عضو فريق'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-3)] font-semibold">رقم الهاتف:</span>
                  <span className="text-sm font-semibold text-[var(--text)] num">{viewingUser.phone || '—'}</span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold tracking-tight text-[var(--text-2)] mb-2.5 flex items-center gap-1.5">
                  <Icon name="log" style={{ width: '15px', height: '15px' }} />
                  <span>سجل تدقيق النشاط والتعديلات (Audit Log):</span>
                </h4>
                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                  {auditLogs
                    .filter(a => a.targetUserId === viewingUser.id)
                    .map(a => (
                      <div key={a.id} className="p-3 rounded-xl bg-[var(--surface-2)] border border-[var(--line-soft)] text-xs flex flex-col gap-1">
                        <span className="font-bold text-[var(--accent)]">{a.action}</span>
                        <span className="text-[var(--text-2)]">{a.details}</span>
                        <span className="text-[10px] text-[var(--text-3)] mt-1">
                          بواسطة: {a.performedBy} • {formatDate(a.timestamp, true)}
                        </span>
                      </div>
                    ))}
                  {auditLogs.filter(a => a.targetUserId === viewingUser.id).length === 0 && (
                    <div className="text-xs text-[var(--text-3)] p-3 rounded-xl bg-[var(--surface-2)] text-center">
                      لا توجد سجلات تدقيق سابقة لهذا الحساب.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-foot">
              <button
                type="button"
                onClick={() => setViewingUser(null)}
                className="btn btn-ghost"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Add / Edit User Profile Modal */}
      {isAddModalOpen && (
        <div id="modal-root" className="on">
          <div className="modal-veil" onClick={() => setIsAddModalOpen(false)} role="presentation" aria-hidden="true" />
          <div className="modal" style={{ '--modal-max-w': 'var(--modal-md, 580px)' } as React.CSSProperties}>
            <div className="modal-head">
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  background: 'var(--accent-soft)',
                  color: 'var(--accent)',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon name="user" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>
                  {editingUser ? 'تعديل بيانات وصلاحيات المستخدم' : 'إضافة مستخدم جديد وتحديد الصلاحيات'}
                </h3>
                <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>
                  إدارة حسابات فريق العمل ورتب الأمان بالنظام
                </span>
              </div>
              <button type="button" onClick={() => setIsAddModalOpen(false)} className="icon-btn" aria-label="إغلاق">
                <Icon name="x" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '20px' }}>
                {/* User ID (Read-only if editing) */}
                {editingUser && (
                  <div className="field">
                    <label>معرف المستخدم (User ID - قراءة فقط)</label>
                    <input
                      type="text"
                      disabled
                      value={editingUser.id}
                      className="input num font-mono opacity-70"
                    />
                  </div>
                )}

                {/* Email (Read-only if editing) */}
                <div className="field">
                  <label>البريد الإلكتروني (Email - حساب الدخول) *</label>
                  <input
                    type="email"
                    required
                    disabled={!!editingUser}
                    placeholder="name@khazraji-law.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="input font-medium"
                    dir="ltr"
                  />
                </div>

                {/* Full Name */}
                <div className="field">
                  <label>الاسم الكامل *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: أحمد الخزرجي"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="input font-bold"
                  />
                </div>

                {/* Role & Dept Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="field">
                    <label>الدور الوظيفي والرتبة *</label>
                    <select
                      value={role}
                      onChange={e => setRole(e.target.value as UserRole)}
                      disabled={!isSuperAdmin && editingUser?.role === 'super_admin'}
                      className="input font-bold"
                    >
                      {isSuperAdmin && <option value="super_admin">Super Admin (مدير النظام الأعلى)</option>}
                      <option value="admin">Admin (مدير النظام)</option>
                      <option value="manager">Manager (مدير)</option>
                      <option value="lawyer">Lawyer (محامي)</option>
                      <option value="staff">Staff (موظف)</option>
                    </select>
                  </div>

                  <div className="field">
                    <label>القسم</label>
                    <input
                      type="text"
                      placeholder="مثال: قسم تأسيس الشركات"
                      value={dept}
                      onChange={e => setDept(e.target.value)}
                      className="input"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div className="field">
                  <label>رقم الهاتف</label>
                  <input
                    type="text"
                    placeholder="07700000000"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="input num"
                  />
                </div>

                {/* Active Toggle */}
                <div className="p-3.5 rounded-xl bg-[var(--surface-2)] border border-[var(--line-soft)] flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text)]">حالة الحساب (Active / Inactive)</span>
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={e => setActive(e.target.checked)}
                    className="w-5 h-5 cursor-pointer accent-[var(--accent)]"
                  />
                </div>
              </div>

              <div className="modal-foot">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="btn btn-ghost"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                >
                  {loading ? 'جاري الحفظ...' : editingUser ? 'تحديث البروفايل' : 'إكمال وتفعيل الحساب'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Reset Password Modal */}
      {resetPassUser && (
        <div id="modal-root" className="on">
          <div className="modal-veil" onClick={() => setResetPassUser(null)} role="presentation" aria-hidden="true" />
          <div className="modal" style={{ '--modal-max-w': 'var(--modal-sm, 480px)' } as React.CSSProperties}>
            <div className="modal-head">
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  background: 'var(--purple-soft)',
                  color: 'var(--purple)',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon name="key" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>إعادة ضبط كلمة المرور</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>تحديث كلمة المرور لحساب {resetPassUser.name}</span>
              </div>
              <button type="button" onClick={() => setResetPassUser(null)} className="icon-btn" aria-label="إغلاق">
                <Icon name="x" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '20px' }}>
                <p className="text-xs text-[var(--text-2)] leading-relaxed m-0">
                  أنت تقوم بإعادة ضبط كلمة المرور للحساب: <strong className="text-[var(--text)]">{resetPassUser.name}</strong> ({resetPassUser.email})
                </p>

                <div className="field">
                  <label>كلمة المرور الجديدة</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="input num"
                  />
                </div>
              </div>

              <div className="modal-foot">
                <button
                  type="button"
                  onClick={() => setResetPassUser(null)}
                  className="btn btn-ghost"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                >
                  {loading ? 'جاري الضبط...' : 'تحديث كلمة المرور'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
