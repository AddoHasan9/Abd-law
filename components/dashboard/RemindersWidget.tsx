'use client'

import { useState, useEffect, useCallback } from 'react'
import { DataPanel } from '@/components/ui/DataPanel'
import { confirmAction, runAction } from '@/components/ui/ConfirmDialog'
import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'
import {
  getRemindersAction,
  toggleReminderCompleteAction,
  toggleReminderArchiveAction,
  deleteReminderAction
} from '@/app/(app)/reminders/actions'
import { createClient } from '@/lib/supabase/client'
import type { Company, ReminderItem } from '@/types/database'
import ReminderModal from '@/components/reminders/ReminderModal'

interface Props {
  companies?: Company[]
  hideIfEmpty?: boolean
}

export default function RemindersWidget({ companies = [], hideIfEmpty = false }: Props) {
  const [reminders, setReminders] = useState<ReminderItem[]>([])
  const [pendingCount, setPendingCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingReminder, setEditingReminder] = useState<ReminderItem | null>(null)
  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'archived'>('pending')
  const [companyList, setCompanyList] = useState<Company[]>(companies)

  // Auto-fetch companies list if empty
  useEffect(() => {
    if (companies && companies.length > 0) {
      setCompanyList(companies)
      return
    }
    const loadCompanies = async () => {
      try {
        const supabase = createClient()
        const { data } = await supabase.from('companies').select('id, name, kind').order('name')
        if (data && data.length > 0) {
          setCompanyList(data as unknown as Company[])
        }
      } catch (err) {
        console.warn('Failed to load companies in RemindersWidget:', err)
      }
    }
    loadCompanies()
  }, [companies])

  const fetchReminders = useCallback(async () => {
    setLoading(true)
    const res = await getRemindersAction(activeTab)
    setLoading(false)
    if (res.success) {
      setReminders(res.data)
      if (activeTab === 'pending') {
        setPendingCount(res.data.filter(r => !r.is_completed).length)
      }
    }
  }, [activeTab])

  useEffect(() => {
    fetchReminders()
  }, [fetchReminders])

  const handleToggleComplete = async (item: ReminderItem) => {
    const nextState = !item.is_completed
    setReminders(prev => prev.map(r => (r.id === item.id ? { ...r, is_completed: nextState } : r)))
    await runAction(toggleReminderCompleteAction(item.id, nextState), 'التذكيرات · تحديث الحالة')
    fetchReminders()
  }

  const handleToggleArchive = async (item: ReminderItem) => {
    const nextState = !item.is_archived
    setReminders(prev => prev.filter(r => r.id !== item.id))
    await runAction(toggleReminderArchiveAction(item.id, nextState), 'التذكيرات · تحديث الحالة')
  }

  const handleDelete = async (id: string) => {
    if (!(await confirmAction({ title: 'حذف التذكير', tone: 'danger' }))) return
    setReminders(prev => prev.filter(r => r.id !== id))
    await runAction(deleteReminderAction(id), 'التذكيرات · الحذف')
  }

  // Categorize reminders
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)

  const overdueList = reminders.filter(r => r.due_date && r.due_date < todayStr && !r.is_completed)
  const todayList = reminders.filter(r => r.due_date === todayStr && !r.is_completed)
  const upcomingList = reminders.filter(r => r.due_date && r.due_date > todayStr && !r.is_completed)
  const unscheduledList = reminders.filter(r => !r.due_date && !r.is_completed)

  if (hideIfEmpty && !loading && reminders.length === 0) {
    return null
  }

  return (
    <DataPanel
      className="h-full flex flex-col"
      icon="notifications"
      title="التذكيرات والمستحقات"
      subtitle="مواعيدك وتنبيهاتك الخاصة"
      actions={
        <button type="button" onClick={() => { setEditingReminder(null); setIsModalOpen(true) }} className="btn btn-sm btn-primary">
          <span className="material-symbols-outlined" aria-hidden>add</span>
          إضافة تذكير
        </button>
      }
    >
      <div className="p-3 sm:p-4 flex flex-col gap-2.5 flex-1">
      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          background: 'var(--surface-2)',
          padding: '2.5px',
          borderRadius: 'var(--r-md)',
          border: '1px solid var(--line-soft)',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          style={{
            flex: 1,
            padding: '4px 6px',
            border: 'none',
            borderRadius: 'var(--r-sm)',
            background: activeTab === 'pending' ? 'var(--surface)' : 'transparent',
            color: activeTab === 'pending' ? 'var(--accent)' : 'var(--text-2)',
            fontWeight: activeTab === 'pending' ? 700 : 500,
            fontSize: '11px',
            cursor: 'pointer',
          }}
        >
          المستحقة ({pendingCount !== null ? pendingCount : (activeTab === 'pending' ? reminders.filter(r => !r.is_completed).length : 0)})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('completed')}
          style={{
            flex: 1,
            padding: '4px 6px',
            border: 'none',
            borderRadius: 'var(--r-sm)',
            background: activeTab === 'completed' ? 'var(--surface)' : 'transparent',
            color: activeTab === 'completed' ? 'var(--accent)' : 'var(--text-2)',
            fontWeight: activeTab === 'completed' ? 700 : 500,
            fontSize: '11px',
            cursor: 'pointer',
          }}
        >
          المكتملة
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('archived')}
          style={{
            flex: 1,
            padding: '4px 6px',
            border: 'none',
            borderRadius: 'var(--r-sm)',
            background: activeTab === 'archived' ? 'var(--surface)' : 'transparent',
            color: activeTab === 'archived' ? 'var(--accent)' : 'var(--text-2)',
            fontWeight: activeTab === 'archived' ? 700 : 500,
            fontSize: '11px',
            cursor: 'pointer',
          }}
        >
          المؤرشفة
        </button>
      </div>

      {/* Content Groups */}
      {loading ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>
          جاري تحميل التذكيرات...
        </div>
      ) : activeTab === 'pending' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Overdue (Red) */}
          {overdueList.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--bad)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--bad)' }} />
                <span>متأخرة عن الموعد ({overdueList.length})</span>
              </div>
              {overdueList.map(item => (
                <ReminderItemCard
                  key={item.id}
                  item={item}
                  badgeColor="var(--bad-soft)"
                  borderColor="var(--bad)"
                  onToggleComplete={() => handleToggleComplete(item)}
                  onEdit={() => {
                    setEditingReminder(item)
                    setIsModalOpen(true)
                  }}
                  onDelete={() => handleDelete(item.id)}
                  onArchive={() => handleToggleArchive(item)}
                />
              ))}
            </div>
          )}

          {/* Today (Orange) */}
          {todayList.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--warn)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--warn)' }} />
                <span>مستحقة اليوم ({todayList.length})</span>
              </div>
              {todayList.map(item => (
                <ReminderItemCard
                  key={item.id}
                  item={item}
                  badgeColor="var(--warn-soft)"
                  borderColor="var(--warn)"
                  onToggleComplete={() => handleToggleComplete(item)}
                  onEdit={() => {
                    setEditingReminder(item)
                    setIsModalOpen(true)
                  }}
                  onDelete={() => handleDelete(item.id)}
                  onArchive={() => handleToggleArchive(item)}
                />
              ))}
            </div>
          )}

          {/* Upcoming (Blue) */}
          {upcomingList.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)' }} />
                <span>قادمة قريباً ({upcomingList.length})</span>
              </div>
              {upcomingList.map(item => (
                <ReminderItemCard
                  key={item.id}
                  item={item}
                  badgeColor="var(--accent-soft)"
                  borderColor="var(--accent)"
                  onToggleComplete={() => handleToggleComplete(item)}
                  onEdit={() => {
                    setEditingReminder(item)
                    setIsModalOpen(true)
                  }}
                  onDelete={() => handleDelete(item.id)}
                  onArchive={() => handleToggleArchive(item)}
                />
              ))}
            </div>
          )}

          {/* Unscheduled (Gray) */}
          {unscheduledList.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--text-3)' }} />
                <span>تذكيرات وملاحظات قائمة ({unscheduledList.length})</span>
              </div>
              {unscheduledList.map(item => (
                <ReminderItemCard
                  key={item.id}
                  item={item}
                  badgeColor="var(--surface-2)"
                  borderColor="var(--line)"
                  onToggleComplete={() => handleToggleComplete(item)}
                  onEdit={() => {
                    setEditingReminder(item)
                    setIsModalOpen(true)
                  }}
                  onDelete={() => handleDelete(item.id)}
                  onArchive={() => handleToggleArchive(item)}
                />
              ))}
            </div>
          )}

          {reminders.length === 0 && (
            <div className="dash-empty">
              <span className="dash-empty-icon material-symbols-outlined" aria-hidden>
                {activeTab === 'pending' ? 'notifications_active' : activeTab === 'completed' ? 'task_alt' : 'inventory_2'}
              </span>
              <p className="dash-empty-title">
                {activeTab === 'pending' ? 'لا توجد تذكيرات مستحقة' : activeTab === 'completed' ? 'لا توجد تذكيرات مكتملة' : 'الأرشيف فارغ'}
              </p>
              {activeTab === 'pending' && (
                <>
                  <p className="dash-empty-text">سجّل موعد جلسة أو مراجعة دائرة حتى ينبّهك النظام قبلها.</p>
                  <button type="button" className="btn btn-sm btn-soft" onClick={() => { setEditingReminder(null); setIsModalOpen(true) }}>
                    <span className="material-symbols-outlined" aria-hidden>add</span>
                    تذكير جديد
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {reminders.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>
              لا توجد عناصر في هذا القسم
            </div>
          ) : (
            reminders.map(item => (
              <ReminderItemCard
                key={item.id}
                item={item}
                badgeColor="var(--surface-2)"
                borderColor="var(--line-soft)"
                onToggleComplete={() => handleToggleComplete(item)}
                onEdit={() => {
                  setEditingReminder(item)
                  setIsModalOpen(true)
                }}
                onDelete={() => handleDelete(item.id)}
                onArchive={() => handleToggleArchive(item)}
              />
            ))
          )}
        </div>
      )}

      {/* Modal */}
      <ReminderModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          fetchReminders()
        }}
        companies={companyList}
        editingReminder={editingReminder}
      />
    </div>
    </DataPanel>
  )
}

export function ReminderItemCard({
  item,
  borderColor,
  onToggleComplete,
  onEdit,
  onDelete,
  onArchive,
}: {
  item: ReminderItem
  badgeColor?: string
  borderColor: string
  onToggleComplete: () => void
  onEdit: () => void
  onDelete: () => void
  onArchive: () => void
}) {
  // تذكير مختصر: سطر للعنوان وسطر للتفاصيل، ولون القسم خط رفيع جانبي بدل خلفية كاملة
  return (
    <div className={`rem-item${item.is_completed ? ' is-done' : ''}`} style={{ ['--rem-tone' as string]: borderColor }}>
      <input type="checkbox" className="rem-check" checked={item.is_completed} onChange={onToggleComplete} aria-label="تم" />
      <div className="rem-body">
        <div className="rem-title">
          <span className="truncate">{item.title}</span>
          {item.priority === 'high' && <span className="rem-high">عالية</span>}
        </div>
        <div className="rem-meta">
          {item.due_date && (
            <span className="num">{item.due_date}{item.due_time ? ` · ${item.due_time}` : ''}</span>
          )}
          {item.company_id ? (
            <Link href={`/commercial/companies/${item.company_id}`} className="rem-co truncate" title={item.company_name || undefined}>
              {item.company_name || 'ملف الشركة'}
            </Link>
          ) : item.company_name ? (
            <span className="truncate">{item.company_name}</span>
          ) : null}
          {item.notes && <span className="rem-notes truncate" title={item.notes}>{item.notes}</span>}
        </div>
      </div>
      <div className="rem-actions">
        <button type="button" onClick={onEdit} title="تعديل" aria-label="تعديل"><span className="material-symbols-outlined" aria-hidden>edit</span></button>
        <button type="button" onClick={onArchive} title={item.is_archived ? 'إلغاء الأرشفة' : 'أرشفة'} aria-label={item.is_archived ? 'إلغاء الأرشفة' : 'أرشفة'}><span className="material-symbols-outlined" aria-hidden>{item.is_archived ? 'unarchive' : 'archive'}</span></button>
        <button type="button" onClick={onDelete} title="حذف" aria-label="حذف" className="is-danger"><span className="material-symbols-outlined" aria-hidden>delete</span></button>
      </div>
    </div>
  )
}
