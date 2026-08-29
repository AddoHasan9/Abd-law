'use client'

import { useState, useEffect, useRef } from 'react'
import { Icon } from '@/components/ui/Icon'
import {
  getNotificationsAction,
  markNotificationReadAction,
  markAllNotificationsReadAction
} from '@/app/(app)/notifications/actions'
import type { NotificationItem } from '@/types/database'

interface Props {
  initialCount?: number
}

export default function NotificationCenter({ initialCount = 0 }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(initialCount)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [loading, setLoading] = useState(false)

  const dropdownRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = async () => {
    setLoading(true)
    const res = await getNotificationsAction()
    setLoading(false)
    if (res.success) {
      setNotifications(res.data)
      setUnreadCount(res.unreadCount)
    }
  }

  useEffect(() => {
    fetchNotifications()
    // Periodic poll check every 45s for fresh notifications
    const timer = setInterval(fetchNotifications, 45000)
    return () => clearInterval(timer)
  }, [])

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])



  const handleMarkAllRead = async () => {
    await markAllNotificationsReadAction()
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }

  const filteredNotifications = notifications.filter(n =>
    filter === 'unread' ? !n.is_read : true
  )

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'company_created':
        return <Icon name="build" style={{ color: 'var(--accent)' }} />
      case 'step_completed':
        return <Icon name="steps" style={{ color: 'var(--ok)' }} />
      case 'deposit_stage':
        return <Icon name="vault" style={{ color: 'var(--warn)' }} />
      case 'reminder_alert':
        return <Icon name="bell" style={{ color: 'var(--bad)' }} />
      default:
        return <Icon name="bell" style={{ color: 'var(--text-2)' }} />
    }
  }

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        className="icon-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="الإشعارات"
        style={{ position: 'relative' }}
      >
        <Icon name="bell" />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              minWidth: '18px',
              height: '18px',
              padding: '0 4px',
              borderRadius: '999px',
              background: 'var(--bad)',
              color: '#ffffff',
              fontSize: '10.5px',
              fontWeight: 700,
              display: 'grid',
              placeItems: 'center',
              boxShadow: '0 0 0 2px var(--surface)',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
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
            width: 'min(390px, 90vw)',
            maxHeight: '500px',
            background: 'var(--glass-bg)',
            backdropFilter: 'var(--glass-backdrop)',
            WebkitBackdropFilter: 'var(--glass-backdrop)',
            color: 'var(--text)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--r-xl, 18px)',
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
              padding: '14px 18px',
              borderBottom: '1px solid var(--line-soft)',
              background: 'var(--surface-2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon name="bell" style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: '14.5px', fontWeight: 700 }}>مركز الإشعارات والتنبيهات</span>
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                style={{
                  border: 'none',
                  background: 'none',
                  color: 'var(--accent)',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                تحديد الكل كـ مقروء
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div
            style={{
              display: 'flex',
              padding: '6px 12px',
              background: 'var(--surface-2)',
              borderBottom: '1px solid var(--line-soft)',
              gap: '6px',
            }}
          >
            <button
              type="button"
              onClick={() => setFilter('all')}
              style={{
                flex: 1,
                padding: '6px',
                border: 'none',
                borderRadius: '8px',
                background: filter === 'all' ? 'var(--surface)' : 'transparent',
                color: filter === 'all' ? 'var(--accent)' : 'var(--text-3)',
                fontSize: '11.5px',
                fontWeight: filter === 'all' ? 700 : 500,
                cursor: 'pointer',
              }}
            >
              الكل ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              style={{
                flex: 1,
                padding: '6px',
                border: 'none',
                borderRadius: '8px',
                background: filter === 'unread' ? 'var(--surface)' : 'transparent',
                color: filter === 'unread' ? 'var(--accent)' : 'var(--text-3)',
                fontSize: '11.5px',
                fontWeight: filter === 'unread' ? 700 : 500,
                cursor: 'pointer',
              }}
            >
              غير مقروء ({unreadCount})
            </button>
          </div>

          {/* Notification List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
            {loading && notifications.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>
                جاري جلب الإشعارات...
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-3)', fontSize: '12.5px' }}>
                {filter === 'unread' ? 'لا توجد إشعارات غير مقروءة حالياً 🎉' : 'لا توجد إشعارات مسجلة'}
              </div>
            ) : (
              filteredNotifications.map(item => {
                // Determine severity colors
                const isUrgent = item.type === 'reminder_alert' || item.title.includes('غرامة') || item.title.includes('متأخرة')
                const isWarn = item.type === 'deposit_stage' || item.title.includes('ينتهي') || item.title.includes('قريباً')
                const isDone = item.type === 'step_completed' || item.title.includes('مكتملة')

                const borderLeftColor = isUrgent ? '#ef4444' : isWarn ? '#f59e0b' : isDone ? '#10b981' : '#3b82f6'

                return (
                  <div
                    key={item.id}
                    onClick={async () => {
                      if (!item.is_read) {
                        await markNotificationReadAction(item.id)
                        setNotifications(prev =>
                          prev.map(n => (n.id === item.id ? { ...n, is_read: true } : n))
                        )
                        setUnreadCount(prev => Math.max(0, prev - 1))
                      }
                    }}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid var(--line-soft)',
                      borderRight: `4px solid ${borderLeftColor}`,
                      background: item.is_read ? 'transparent' : 'var(--accent-soft)',
                      cursor: 'pointer',
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'flex-start',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: 'var(--surface-2)',
                        display: 'grid',
                        placeItems: 'center',
                        flex: 'none',
                      }}
                    >
                      {getTypeIcon(item.type || '')}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <span style={{ fontSize: '13px', fontWeight: item.is_read ? 600 : 700, color: 'var(--text)' }}>
                          {item.title}
                        </span>
                        {!item.is_read && (
                          <span
                            style={{
                              width: '7px',
                              height: '7px',
                              borderRadius: '50%',
                              background: 'var(--accent)',
                              flex: 'none',
                            }}
                          />
                        )}
                      </div>
                      {item.description && (
                        <div style={{ fontSize: '11.5px', color: 'var(--text-2)', lineHeight: 1.4, marginBottom: '4px' }}>
                          {item.description}
                        </div>
                      )}
                      <div style={{ fontSize: '10.5px', color: 'var(--text-3)', display: 'flex', gap: '8px' }}>
                        <span>{new Date(item.created_at).toLocaleDateString('ar-IQ')}</span>
                        <span>•</span>
                        <span>{new Date(item.created_at).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
