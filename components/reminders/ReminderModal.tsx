'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '@/components/ui/Icon'
import { createReminderAction, updateReminderAction } from '@/app/(app)/reminders/actions'
import type { Company, ReminderItem, ReminderPriority } from '@/types/database'
import { useModalBodyLock } from '@/lib/hooks/useModalBodyLock'

interface Props {
  isOpen: boolean
  onClose: () => void
  companies?: Company[]
  editingReminder?: ReminderItem | null
  initialCompanyId?: string
}

export default function ReminderModal({ isOpen, onClose, companies = [], editingReminder, initialCompanyId }: Props) {
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [companyId, setCompanyId] = useState(initialCompanyId || '')
  const [priority, setPriority] = useState<ReminderPriority>('medium')
  const [dueDate, setDueDate] = useState('')
  const [dueTime, setDueTime] = useState('')

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (editingReminder) {
      setTitle(editingReminder.title || '')
      setNotes(editingReminder.notes || '')
      setCompanyId(editingReminder.company_id || '')
      setPriority((editingReminder.priority as ReminderPriority) || 'medium')
      setDueDate(editingReminder.due_date || '')
      setDueTime(editingReminder.due_time || '')
    } else {
      setTitle('')
      setNotes('')
      setCompanyId('')
      setPriority('medium')
      setDueDate('')
      setDueTime('')
    }
  }, [editingReminder, isOpen])

  useModalBodyLock(isOpen)

  if (!mounted || !isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('عنوان التذكير مطلوب')
      return
    }

    setLoading(true)
    setError(null)

    let res
    if (editingReminder) {
      res = await updateReminderAction(editingReminder.id, {
        title: title.trim(),
        notes: notes.trim(),
        company_id: companyId,
        priority,
        due_date: dueDate,
        due_time: dueTime,
      })
    } else {
      res = await createReminderAction({
        title: title.trim(),
        notes: notes.trim(),
        company_id: companyId,
        priority,
        due_date: dueDate,
        due_time: dueTime,
      })
    }

    setLoading(false)

    if (res.success) {
      onClose()
    } else {
      setError(res.error || 'فصل حفظ التذكير الشخصي')
    }
  }

  return createPortal(
    <div id="modal-root" className="on">
      <div className="modal-veil" onClick={onClose} role="presentation" aria-hidden="true" />
      <div className="modal" style={{ '--modal-max-w': 'var(--modal-sm, 480px)' } as React.CSSProperties}>
        {/* Head */}
        <div className="modal-head">
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'var(--accent-soft)',
              color: 'var(--accent)',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Icon name="bell" />
          </div>
          <h3>{editingReminder ? 'تعديل التذكير الشخصي' : 'إضافة تذكير شخصي جديد'}</h3>
          <button type="button" onClick={onClose} className="icon-btn" aria-label="إغلاق">
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {error && (
              <div className="login-err" style={{ marginBottom: 0 }}>
                {error}
              </div>
            )}

            <div className="field">
              <label htmlFor="rem-title">عنوان التذكير *</label>
              <input
                id="rem-title"
                type="text"
                className="input"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="مثال: مراجعة مستندات الشركة، دفع أتعاب الميزانية..."
                required
              />
            </div>

            <div className="field">
              <label htmlFor="rem-notes">ملاحظات / وصف إضافي (اختياري)</label>
              <textarea
                id="rem-notes"
                rows={2}
                className="input"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="تفاصيل التذكير أو المهام الفرعية..."
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="field">
                <label htmlFor="rem-priority">الأولوية</label>
                <select
                  id="rem-priority"
                  className="input"
                  value={priority}
                  onChange={e => setPriority(e.target.value as ReminderPriority)}
                >
                  <option value="low">منخفضة</option>
                  <option value="medium">متوسطة</option>
                  <option value="high">عالية 🔥</option>
                </select>
              </div>

              <div className="field">
                <label htmlFor="rem-company">شركة مرتبطة (اختياري)</label>
                <select
                  id="rem-company"
                  className="input"
                  value={companyId}
                  onChange={e => setCompanyId(e.target.value)}
                >
                  <option value="">— غير مرتبطة بشركة —</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="field">
                <label htmlFor="rem-date">تاريخ الاستحقاق (اختياري)</label>
                <input
                  id="rem-date"
                  type="date"
                  className="input"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                />
              </div>

              <div className="field">
                <label htmlFor="rem-time">وقت التنبيه (اختياري)</label>
                <input
                  id="rem-time"
                  type="time"
                  className="input"
                  value={dueTime}
                  onChange={e => setDueTime(e.target.value)}
                />
              </div>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
              ملاحظة: إذا تركت التاريخ والوقت فارغين، سيتم حفظ التذكير كملاحظة شخصية قائمة.
            </span>
          </div>

          {/* Foot */}
          <div className="modal-foot">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'جاري الحفظ...' : editingReminder ? 'حفظ التعديلات' : 'حفظ التذكير'}
            </button>
            <button type="button" onClick={onClose} className="btn btn-ghost" disabled={loading}>
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
