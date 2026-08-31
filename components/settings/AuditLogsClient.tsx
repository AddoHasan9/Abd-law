'use client'

import { useState } from 'react'
import type { UserAuditLogEntry } from '@/lib/data/audit'
import { Badge, Input, Select, GlassCard } from '@/components/ui/Kit'
import { cn } from '@/lib/utils'

interface Props {
  initialLogs: UserAuditLogEntry[]
}

const ACTION_LABELS: Record<string, { label: string; variant: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral' }> = {
  login: { label: 'تسجيل دخول', variant: 'success' },
  logout: { label: 'تسجيل خروج', variant: 'neutral' },
  create: { label: 'إضافة جديدة', variant: 'primary' },
  update: { label: 'تعديل بيانات', variant: 'warning' },
  delete: { label: 'حذف', variant: 'danger' },
  view: { label: 'عرض', variant: 'info' },
  export: { label: 'تصدير', variant: 'info' },
}

const CATEGORY_LABELS: Record<string, string> = {
  auth: 'الأمان والدخول',
  companies: 'الشركات',
  transactions: 'المعاملات',
  deposits: 'الودائع',
  ids: 'الهويات الحكومية',
  financial: 'الحسابات الختامية',
  users: 'المستخدمين',
  settings: 'الإعدادات',
}

export default function AuditLogsClient({ initialLogs }: Props) {
  const [logs] = useState<UserAuditLogEntry[]>(initialLogs)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const filteredLogs = logs.filter(log => {
    if (actionFilter !== 'all' && log.action !== actionFilter) return false
    if (categoryFilter !== 'all' && log.category !== categoryFilter) return false
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      const matchDetails = log.details.toLowerCase().includes(q)
      const matchUser = (log.user_name || log.user_email || '').toLowerCase().includes(q)
      const matchEntity = (log.entity_name || log.entity_type || '').toLowerCase().includes(q)
      return matchDetails || matchUser || matchEntity
    }
    return true
  })

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 text-right" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl sm:text-2xl font-black text-text tracking-tight">
            سجل تدقيق العمليات والمستخدمين
          </h1>
          <p className="text-xs text-text-3">
            سجل غير قابل للتعديل يوثق كافة حركات الدخول والخروج والإنشاء والتعديل والحذف في النظام
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="primary" className="text-xs px-3 py-1">
            إجمالي السجلات: {logs.length}
          </Badge>
        </div>
      </div>

      {/* Filters Card */}
      <GlassCard className="p-4 flex flex-col sm:flex-row items-center gap-3">
        <div className="flex-1 w-full">
          <Input
            placeholder="ابحث في تفاصيل العملية أو اسم المستخدم..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            icon="search"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-full sm:w-44">
            <Select value={actionFilter} onChange={e => setActionFilter(e.target.value)}>
              <option value="all">كافة أنواع الإجراءات</option>
              <option value="login">تسجيل دخول</option>
              <option value="logout">تسجيل خروج</option>
              <option value="create">إضافة</option>
              <option value="update">تعديل</option>
              <option value="delete">حذف</option>
            </Select>
          </div>

          <div className="w-full sm:w-44">
            <Select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
              <option value="all">كافة الأقسام</option>
              <option value="auth">الأمان والدخول</option>
              <option value="companies">الشركات</option>
              <option value="transactions">المعاملات</option>
              <option value="deposits">الودائع</option>
              <option value="ids">الهويات</option>
              <option value="financial">الحسابات الختامية</option>
              <option value="users">المستخدمين</option>
            </Select>
          </div>
        </div>
      </GlassCard>

      {/* Logs Table */}
      <div className="rounded-2xl border border-border-glass bg-surface shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-surface-2/60 border-b border-border-soft text-text-3 font-bold">
              <tr>
                <th className="px-4 py-3">الوقت والتاريخ</th>
                <th className="px-4 py-3">نوع الإجراء</th>
                <th className="px-4 py-3">القسم</th>
                <th className="px-4 py-3">المستخدم المسؤول</th>
                <th className="px-4 py-3">تفاصيل العملية</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-soft font-medium">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-text-3">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[32px] text-text-3/60">history</span>
                      <span>لا توجد سجلات تطابق البحث</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => {
                  const actionMeta = ACTION_LABELS[log.action] || { label: log.action, variant: 'neutral' }
                  const dateObj = new Date(log.created_at)
                  const formattedDate = dateObj.toLocaleDateString('ar-IQ', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })
                  const formattedTime = dateObj.toLocaleTimeString('ar-IQ', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })

                  return (
                    <tr key={log.id} className="hover:bg-surface-2/40 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-text-3 font-mono text-[11px]">
                        <div>{formattedDate}</div>
                        <div className="text-[10px] text-text-3/70">{formattedTime}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant={actionMeta.variant}>
                          {actionMeta.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-surface-2 text-text-2 text-[11px] font-semibold border border-border-soft">
                          {CATEGORY_LABELS[log.category] || log.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-bold text-text">{log.user_name || log.user_email || 'مستخدم النظام'}</div>
                        {log.user_role && (
                          <div className="text-[10px] text-text-3">{log.user_role}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-text leading-relaxed">
                        <div>{log.details}</div>
                        {log.entity_name && (
                          <div className="text-[11px] text-primary font-bold mt-0.5">
                            الهدف: {log.entity_name}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
