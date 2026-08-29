'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Icon } from '@/components/ui/Icon'
import {
  getRemindersAction,
  toggleReminderCompleteAction,
  deleteReminderAction
} from '@/app/(app)/reminders/actions'
import type { ReminderItem } from '@/types/database'
import ReminderModal from '@/components/reminders/ReminderModal'

export default function ReminderCenter() {
  const [isOpen, setIsOpen] = useState(false)
  const [reminders, setReminders] = useState<ReminderItem[]>([])
  const [loading, setLoading] = useState(false)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingReminder, setEditingReminder] = useState<ReminderItem | null>(null)

  const dropdownRef = useRef<HTMLDivElement>(null)

  const fetchReminders = useCallback(async () => {
    setLoading(true)
    const res = await getRemindersAction('pending')
    setLoading(false)
    if (res.success) {
      setReminders(res.data)
    }
  }, [])

  useEffect(() => {
    fetchReminders()
    const timer = setInterval(fetchReminders, 45000)
    return () => clearInterval(timer)
  }, [fetchReminders])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleToggleComplete = async (item: ReminderItem, e: React.MouseEvent) => {
    e.stopPropagation()
    const nextState = !item.is_completed
    setReminders(prev => prev.filter(r => r.id !== item.id))
    await toggleReminderCompleteAction(item.id, nextState)
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('هل أنت متأكد من حذف هذا التذكير؟')) return
    setReminders(prev => prev.filter(r => r.id !== id))
    await deleteReminderAction(id)
  }

  const activeReminders = reminders.filter(r => !r.is_completed && !r.is_archived)

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Reminder Clock Button in Topbar */}
      <button
        type="button"
        className="icon-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="التذكيرات الشخصية"
        style={{ position: 'relative' }}
        title="التذكيرات والملاحظات"
      >
        <Icon name="clock" />
        {activeReminders.length > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              minWidth: '18px',
              height: '18px',
              padding: '0 4px',
              borderRadius: '999px',
              background: 'var(--accent)',
              color: '#ffffff',
              fontSize: '10.5px',
              fontWeight: 700,
              display: 'grid',
              placeItems: 'center',
              boxShadow: '0 0 0 2px var(--surface)',
            }}
          >
            {activeReminders.length > 99 ? '99+' : activeReminders.length}
          </span>
        )}
      </button>

      {/* Flyout Panel */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            left: 0,
            width: 'min(380px, 90vw)',
            maxHeight: '480px',
            background: 'var(--surface)',
            color: 'var(--text)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--r-lg)',
            boxShadow: 'var(--shadow-3)',
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--line-soft)',
              background: 'var(--surface-2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon name="clock" style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: '14px', fontWeight: 700 }}>التذكيرات الشخصية</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingReminder(null)
                setIsModalOpen(true)
              }}
              style={{
                border: 'none',
                background: 'var(--accent)',
                color: '#fff',
                padding: '4px 10px',
                borderRadius: 'var(--r-sm)',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              + إضافة تذكير
            </button>
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
            {loading && activeReminders.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>
                جاري جلب التذكيرات...
              </div>
            ) : activeReminders.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-3)', fontSize: '12.5px' }}>
                لا توجد تذكيرات قائمة حالياً 🎉
              </div>
            ) : (
              activeReminders.map(item => (
                <div
                  key={item.id}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--line-soft)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'background 0.15s ease',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={item.is_completed}
                    onChange={e => handleToggleComplete(item, e as unknown as React.MouseEvent)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--ok)' }}
                  />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
                      {item.title}
                    </div>

                    {item.notes && (
                      <div style={{ fontSize: '11.5px', color: 'var(--text-2)', lineHeight: 1.4 }}>
                        {item.notes}
                      </div>
                    )}

                    <div style={{ fontSize: '10.5px', color: 'var(--text-3)', marginTop: '2px', display: 'flex', gap: '8px' }}>
                      {item.due_date && (
                        <span>📅 {item.due_date} {item.due_time ? `⏰ ${item.due_time}` : ''}</span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingReminder(item)
                        setIsModalOpen(true)
                      }}
                      style={{ border: 'none', background: 'none', color: 'var(--text-2)', cursor: 'pointer', padding: '4px' }}
                      title="تعديل"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={e => handleDelete(item.id, e)}
                      style={{ border: 'none', background: 'none', color: 'var(--bad)', cursor: 'pointer', padding: '4px' }}
                      title="حذف"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Reminder Add/Edit Modal */}
      <ReminderModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          fetchReminders()
        }}
        editingReminder={editingReminder}
      />
    </div>
  )
}
