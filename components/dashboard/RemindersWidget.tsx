'use client'

import { useState, useEffect, useCallback } from 'react'
import { Mi } from '@/components/ui/Mi'
import { confirmAction } from '@/components/ui/ConfirmDialog'
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
    await toggleReminderCompleteAction(item.id, nextState)
    fetchReminders()
  }

  const handleToggleArchive = async (item: ReminderItem) => {
    const nextState = !item.is_archived
    setReminders(prev => prev.filter(r => r.id !== item.id))
    await toggleReminderArchiveAction(item.id, nextState)
  }

  const handleDelete = async (id: string) => {
    if (!(await confirmAction({ title: 'حذف التذكير', tone: 'danger' }))) return
    setReminders(prev => prev.filter(r => r.id !== id))
    await deleteReminderAction(id)
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
    <div className="glass-card rounded-2xl p-3 sm:p-3.5 flex flex-col gap-2.5 h-full border border-[var(--glass-border)]">
      {/* Widget Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '7px',
              background: 'var(--accent-soft)',
              color: 'var(--accent)',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Icon name="bell" />
          </div>
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
              التذكيرات الشخصية والمستحقات
            </h3>
            <span style={{ fontSize: '10.5px', color: 'var(--text-3)' }}>
              إدارة المواعيد والتنبيهات المخصصة
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setEditingReminder(null)
            setIsModalOpen(true)
          }}
          className="btn btn-primary"
          style={{ padding: '4px 10px', fontSize: '11.5px', borderRadius: '8px' }}
        >
          <Icon name="plus" />
          <span>إضافة تذكير</span>
        </button>
      </div>

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
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>
              لا توجد تذكيرات قائمة حالياً. اضغط «+ إضافة تذكير» لإنشاء أول تذكير.
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
  )
}

function ReminderItemCard({
  item,
  badgeColor,
  borderColor,
  onToggleComplete,
  onEdit,
  onDelete,
  onArchive,
}: {
  item: ReminderItem
  badgeColor: string
  borderColor: string
  onToggleComplete: () => void
  onEdit: () => void
  onDelete: () => void
  onArchive: () => void
}) {
  return (
    <div
      style={{
        padding: '10px 14px',
        background: badgeColor,
        border: `1px solid ${borderColor}`,
        borderRadius: 'var(--r-md)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        transition: 'all 0.15s ease',
      }}
    >
      <input
        type="checkbox"
        checked={item.is_completed}
        onChange={onToggleComplete}
        style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--ok)' }}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: 'var(--text)',
              textDecoration: item.is_completed ? 'line-through' : 'none',
              opacity: item.is_completed ? 0.7 : 1,
            }}
          >
            {item.title}
          </span>
          {item.priority === 'high' && (
            <span style={{ fontSize: '10.5px', background: 'var(--bad)', color: '#fff', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
              عالية
            </span>
          )}
        </div>

        {item.notes && (
          <div style={{ fontSize: '11.5px', color: 'var(--text-2)', marginTop: '2px' }}>
            {item.notes}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginTop: '4px', fontSize: '10.5px', color: 'var(--text-3)' }}>
          {item.due_date && (
            <span><Mi n="event" />{item.due_date}{item.due_time && <><Mi n="schedule" className="ms-2" />{item.due_time}</>}</span>
          )}
          {item.company_id ? (
            <Link
              href={`/commercial/companies/${item.company_id}`}
              className="inline-flex items-center gap-1 font-bold text-[var(--accent)] hover:underline bg-[color:color-mix(in_srgb,var(--accent-soft)_60%,transparent)] px-1.5 py-0.5 rounded text-[10.5px] transition-colors"
            >
              <span><Mi n="domain" /></span>
              <span>{item.company_name || 'ملف الشركة'}</span>
              <span>←</span>
            </Link>
          ) : item.company_name ? (
            <span><Mi n="domain" />{item.company_name}</span>
          ) : null}
        </div>
      </div>

      {/* Item Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <button
          type="button"
          onClick={onEdit}
          style={{ border: 'none', background: 'none', color: 'var(--text-2)', cursor: 'pointer', padding: '4px' }}
          title="تعديل"
        >
          <Mi n="edit" />
        </button>
        <button
          type="button"
          onClick={onArchive}
          style={{ border: 'none', background: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: '4px' }}
          title={item.is_archived ? 'إلغاء الأرشفة' : 'أرشفة'}
        >
          <Mi n="archive" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          style={{ border: 'none', background: 'none', color: 'var(--bad)', cursor: 'pointer', padding: '4px' }}
          title="حذف"
        >
          <Mi n="delete" />
        </button>
      </div>
    </div>
  )
}
