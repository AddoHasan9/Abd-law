'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Mi } from '@/components/ui/Mi'
import { createPortal } from 'react-dom'
import { Icon } from '@/components/ui/Icon'
import { createReminderAction, updateReminderAction, listReminderAssigneesAction } from '@/app/(app)/reminders/actions'
import { REPEAT_OPTIONS, baghdadNow, type ReminderRepeat } from '@/lib/push/time'
import { createClient } from '@/lib/supabase/client'
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
  useModalBodyLock(isOpen)
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [companyList, setCompanyList] = useState<Company[]>(companies)

  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [companyId, setCompanyId] = useState<string>(initialCompanyId || '')
  const [priority, setPriority] = useState<ReminderPriority>('medium')
  const [dueDate, setDueDate] = useState('')
  const [dueTime, setDueTime] = useState('')
  const [repeat, setRepeat] = useState<ReminderRepeat>('none')
  // المحامي المسؤول: '' = أنا (منشئ التذكير)
  const [assigneeId, setAssigneeId] = useState('')
  const [assignees, setAssignees] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isOpen) return
    listReminderAssigneesAction().then(setAssignees).catch(() => setAssignees([]))
  }, [isOpen])

  useEffect(() => {
    if (editingReminder) {
      setTitle(editingReminder.title)
      setNotes(editingReminder.notes || '')
      setCompanyId(editingReminder.company_id || '')
      setPriority((editingReminder.priority as ReminderPriority) || 'medium')
      setDueDate(editingReminder.due_date ? editingReminder.due_date.slice(0, 10) : '')
      setDueTime(editingReminder.due_time || '')
      setRepeat((editingReminder.repeat as ReminderRepeat) || 'none')
      setAssigneeId(editingReminder.assignee_id || '')
    } else {
      setTitle('')
      setNotes('')
      setCompanyId(initialCompanyId || '')
      setPriority('medium')
      setDueDate(baghdadNow().date) // تاريخ اليوم ببغداد (كان UTC ⇒ يوم أمس بين 12 و3 فجراً)
      setDueTime('')
      setRepeat('none')
      setAssigneeId('')
    }
    setError(null)
  }, [editingReminder, initialCompanyId, isOpen])

  // Fetch companies if list is empty
  useEffect(() => {
    if (companyList.length > 0) return
    const supabase = createClient()
    supabase.from('companies').select('id, name, kind, status').order('name').then(({ data }) => {
      if (data) setCompanyList(data as Company[])
    })
  }, [companyList.length])

  if (!isOpen || !mounted) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('يرجى كتابة عنوان التذكير')
      return
    }

    setLoading(true)
    setError(null)

    let res
    if (editingReminder) {
      res = await updateReminderAction(editingReminder.id, {
        title: title.trim(),
        notes: notes.trim(),
        company_id: companyId || undefined,
        priority,
        due_date: dueDate,
        due_time: dueTime,
        repeat: dueDate ? repeat : 'none',
        assignee_id: assigneeId || undefined,
      })
    } else {
      res = await createReminderAction({
        title: title.trim(),
        notes: notes.trim(),
        company_id: companyId || undefined,
        priority,
        due_date: dueDate,
        due_time: dueTime,
        repeat: dueDate ? repeat : 'none',
        assignee_id: assigneeId || undefined,
      })
    }

    setLoading(false)

    if (res.success) {
      toast.success('تم حفظ التذكير')
      onClose()
    } else {
      setError(res.error || 'فشل حفظ التذكير الشخصي')
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
            <Icon name="x" />
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
                  <option value="high">عالية</option>
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
                  {companyList.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.kind ? `(${c.kind})` : ''}
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
            <div className="field">
              <label htmlFor="rem-assignee">المحامي المسؤول (يصله التنبيه)</label>
              <select id="rem-assignee" className="input" value={assigneeId} onChange={e => setAssigneeId(e.target.value)}>
                <option value="">أنا</option>
                {assignees.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>

            <div className="field">
              <label htmlFor="rem-repeat">التكرار</label>
              <select
                id="rem-repeat"
                className="input"
                value={dueDate ? repeat : 'none'}
                onChange={e => setRepeat(e.target.value as ReminderRepeat)}
                disabled={!dueDate}
              >
                {REPEAT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <span style={{ fontSize: '11.5px', color: 'var(--text-3)', lineHeight: 1.8 }}>
              {dueDate
                ? `🔔 ${assigneeId ? `يصل تنبيه بصوت لأجهزة ${assignees.find(a => a.id === assigneeId)?.name || 'المحامي المختار'}` : 'يصلك تنبيه بصوت على أجهزتك المفعّلة'} ${dueTime ? `الساعة ${dueTime}` : 'الساعة 9:00 صباحاً'} بتوقيت بغداد${repeat !== 'none' ? '، ويتكرر تلقائياً' : ''}. التذكير نفسه ظاهر للجميع.`
                : 'بدون تاريخ يُحفظ التذكير كملاحظة بلا تنبيه. اختر تاريخاً (ووقتاً) لتصلك التنبيهات والتكرار.'}
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
