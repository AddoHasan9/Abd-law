'use client'
/**
 * نافذة إضافة/تعديل مهمة — الاختيارات أزرار (أسرع على الهاتف)، والحقول الاختيارية واضحة.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { Icon } from '@/components/ui/Icon'
import { baghdadNow } from '@/lib/push/time'
import { COMMON_AGENCIES, REMIND_OPTIONS, hhmm, type ChecklistItem, type Task, type TaskPriority } from '@/lib/tasks/model'
import { saveTaskAction, taskFormOptionsAction } from '@/app/(app)/tasks/actions'

type CompanyMode = 'none' | 'system' | 'text'
const DOC_SUGGESTIONS = ['صورة الهوية', 'الوكالة الأصلية', 'كتاب رسمي', 'ختم الشركة', 'الرسوم', 'نسخة العقد']

interface Props {
  open: boolean
  task?: Task | null
  onClose: () => void
  onSaved: (t: Task) => void
}

export default function TaskModal({ open, task, onClose, onSaved }: Props) {
  const [mounted, setMounted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [opts, setOpts] = useState<{ companies: { id: string; name: string }[]; people: { id: string; name: string }[]; agencies: string[]; me: string } | null>(null)

  const [title, setTitle] = useState('')
  const [agency, setAgency] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('normal')
  const [remind, setRemind] = useState<number | null>(60)
  const [assignee, setAssignee] = useState('')
  const [companyMode, setCompanyMode] = useState<CompanyMode>('none')
  const [companyId, setCompanyId] = useState('')
  const [companyQuery, setCompanyQuery] = useState('')
  const [companyText, setCompanyText] = useState('')
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  const [docInput, setDocInput] = useState('')
  const [notes, setNotes] = useState('')
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => setMounted(true), [])
  useEffect(() => {
    if (!open) return
    taskFormOptionsAction().then(r => { if (r.success && r.data) setOpts(r.data) })
    if (task) {
      setTitle(task.title); setAgency(task.agency || ''); setDate(task.task_date || ''); setTime(hhmm(task.task_time) || '')
      setPriority(task.priority); setRemind(task.remind_before); setAssignee(task.assignee_id || '')
      setCompanyMode(task.company_id ? 'system' : task.company_name ? 'text' : 'none')
      setCompanyId(task.company_id || ''); setCompanyQuery(task.company_id ? task.company_display || '' : ''); setCompanyText(task.company_name || '')
      setChecklist(task.checklist || []); setNotes(task.notes || '')
    } else {
      setTitle(''); setAgency(''); setDate(baghdadNow().date); setTime(''); setPriority('normal'); setRemind(60); setAssignee('')
      setCompanyMode('none'); setCompanyId(''); setCompanyQuery(''); setCompanyText(''); setChecklist([]); setNotes('')
    }
    setDocInput('')
    setTimeout(() => titleRef.current?.focus(), 80)
  }, [open, task])

  // إغلاق بـ Esc
  useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [open, onClose])

  const agencies = useMemo(() => [...new Set([...(opts?.agencies || []), ...COMMON_AGENCIES])], [opts])
  const companyMatches = useMemo(() => {
    const q = companyQuery.trim()
    if (!opts || !q || opts.companies.some(c => c.id === companyId && c.name === q)) return []
    return opts.companies.filter(c => c.name.includes(q)).slice(0, 6)
  }, [opts, companyQuery, companyId])

  const addDoc = (text: string) => {
    const t = text.trim()
    if (!t || checklist.some(c => c.text === t)) return
    setChecklist(l => [...l, { text: t, done: false }])
    setDocInput('')
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { toast.error('اكتب ما العمل المطلوب'); titleRef.current?.focus(); return }
    if (companyMode === 'system' && companyQuery.trim() && !companyId) { toast.error('اختر الشركة من القائمة، أو اختر «كتابة يدوية»'); return }
    setSaving(true)
    const res = await saveTaskAction({
      title, agency, notes, task_date: date || null, task_time: time || null, priority,
      remind_before: date ? remind : null,
      assignee_id: assignee || null,
      company_id: companyMode === 'system' ? companyId || null : null,
      company_name: companyMode === 'text' ? companyText : null,
      checklist: docInput.trim() ? [...checklist, { text: docInput.trim(), done: false }] : checklist,
    }, task?.id)
    setSaving(false)
    if (!res.success) { toast.error(res.error); return }
    toast.success(task ? 'تم حفظ التعديلات' : 'أُضيفت المهمة')
    if (res.data) onSaved(res.data)
    onClose()
  }

  if (!mounted || !open) return null
  const remindHint = date && remind != null
    ? `🔔 يصل تنبيه بصوت ${REMIND_OPTIONS.find(o => o.value === remind)?.label === 'عند الموعد' ? 'عند موعد المهمة' : (REMIND_OPTIONS.find(o => o.value === remind)?.label || '')} ${time ? `(${time})` : '(الموعد الافتراضي 9:00)'} بتوقيت بغداد.`
    : date ? 'بلا تنبيه — ستظهر المهمة في القائمة فقط.' : 'حدّد تاريخاً لتفعيل التنبيه.'

  return createPortal(
    <div id="modal-root" className="on">
      <div className="modal-veil" onClick={onClose} role="presentation" aria-hidden="true" />
      <div className="modal tk-modal" style={{ '--modal-max-w': '560px' } as React.CSSProperties} role="dialog" aria-modal="true" aria-labelledby="tk-title">
        <div className="modal-head">
          <div className="tk-head-ic"><Icon name="tasks" /></div>
          <h3 id="tk-title">{task ? 'تعديل المهمة' : 'مهمة جديدة'}</h3>
          <button type="button" onClick={onClose} className="icon-btn" aria-label="إغلاق"><Icon name="x" /></button>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="modal-body tk-body">
            <div className="field">
              <label htmlFor="tk-what">ما العمل؟ <span className="tk-req">*</span></label>
              <input id="tk-what" ref={titleRef} className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="مثلاً: تصديق الوكالة" maxLength={300} required />
            </div>

            <div className="field">
              <label htmlFor="tk-agency">الدائرة / الجهة <span className="tk-opt">اختياري</span></label>
              <input id="tk-agency" className="input" list="tk-agencies" value={agency} onChange={e => setAgency(e.target.value)} placeholder="مثلاً: وزارة الخارجية" maxLength={200} />
              <datalist id="tk-agencies">{agencies.map(a => <option key={a} value={a} />)}</datalist>
            </div>

            <div className="tk-row">
              <div className="field">
                <label htmlFor="tk-date">التاريخ</label>
                <input id="tk-date" type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="tk-time">الوقت <span className="tk-opt">اختياري</span></label>
                <input id="tk-time" type="time" className="input" value={time} onChange={e => setTime(e.target.value)} disabled={!date} />
              </div>
            </div>

            <div className="field">
              <span className="tk-label">الأولوية</span>
              <div className="tk-chips" role="radiogroup" aria-label="الأولوية">
                <button type="button" role="radio" aria-checked={priority === 'normal'} className={`tk-chip${priority === 'normal' ? ' on' : ''}`} onClick={() => setPriority('normal')}>عادية</button>
                <button type="button" role="radio" aria-checked={priority === 'urgent'} className={`tk-chip is-urgent${priority === 'urgent' ? ' on' : ''}`} onClick={() => setPriority('urgent')}><i className="tk-dot" />عاجلة</button>
              </div>
            </div>

            <div className="field">
              <span className="tk-label">التذكير</span>
              <div className="tk-chips" role="radiogroup" aria-label="التذكير">
                {REMIND_OPTIONS.map(o => (
                  <button key={String(o.value)} type="button" role="radio" aria-checked={remind === o.value} disabled={!date && o.value != null}
                    className={`tk-chip${remind === o.value ? ' on' : ''}`} onClick={() => setRemind(o.value)}>{o.label}</button>
                ))}
              </div>
              <p className="tk-hint">{remindHint}</p>
            </div>

            <div className="field">
              <label htmlFor="tk-who">المحامي المسؤول <span className="tk-opt">يصله التنبيه</span></label>
              <select id="tk-who" className="input" value={assignee} onChange={e => setAssignee(e.target.value)}>
                <option value="">أنا</option>
                {(opts?.people || []).filter(p => p.id !== opts?.me).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>

            <div className="field">
              <span className="tk-label">الشركة <span className="tk-opt">اختياري</span></span>
              <div className="tk-chips" role="radiogroup" aria-label="ارتباط بشركة">
                {([['none', 'مهمة عامة'], ['system', 'من شركات النظام'], ['text', 'كتابة يدوية']] as [CompanyMode, string][]).map(([v, l]) => (
                  <button key={v} type="button" role="radio" aria-checked={companyMode === v} className={`tk-chip${companyMode === v ? ' on' : ''}`} onClick={() => setCompanyMode(v)}>{l}</button>
                ))}
              </div>
              {companyMode === 'system' && (
                <div className="tk-combo">
                  <input className="input" value={companyQuery} placeholder="ابحث باسم الشركة…" aria-label="ابحث عن شركة"
                    onChange={e => { setCompanyQuery(e.target.value); setCompanyId('') }} />
                  {companyId && <span className="tk-picked">✓ مرتبطة</span>}
                  {companyMatches.length > 0 && (
                    <ul className="tk-combo-list" role="listbox">
                      {companyMatches.map(c => (
                        <li key={c.id}><button type="button" role="option" aria-selected={false} onClick={() => { setCompanyId(c.id); setCompanyQuery(c.name) }}>{c.name}</button></li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              {companyMode === 'text' && (
                <input className="input" value={companyText} onChange={e => setCompanyText(e.target.value)} placeholder="اسم الشركة كما تريد كتابته" maxLength={200} aria-label="اسم الشركة" />
              )}
            </div>

            <div className="field">
              <span className="tk-label">الأوراق المطلوبة <span className="tk-opt">اختياري</span></span>
              {checklist.length > 0 && (
                <ul className="tk-docs">
                  {checklist.map((c, i) => (
                    <li key={c.text + i}>
                      <span>📄 {c.text}</span>
                      <button type="button" className="icon-btn" aria-label={`حذف ${c.text}`} onClick={() => setChecklist(l => l.filter((_, j) => j !== i))}><Icon name="x" /></button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="tk-doc-add">
                <input className="input" value={docInput} onChange={e => setDocInput(e.target.value)} placeholder="أضف ورقة…" aria-label="إضافة ورقة"
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addDoc(docInput) } }} />
                <button type="button" className="btn btn-ghost" onClick={() => addDoc(docInput)} disabled={!docInput.trim()}>إضافة</button>
              </div>
              <div className="tk-sugg">
                {DOC_SUGGESTIONS.filter(s => !checklist.some(c => c.text === s)).map(s => (
                  <button key={s} type="button" className="tk-sugg-btn" onClick={() => addDoc(s)}>+ {s}</button>
                ))}
              </div>
            </div>

            <div className="field">
              <label htmlFor="tk-notes">ملاحظات <span className="tk-opt">اختياري</span></label>
              <textarea id="tk-notes" className="input" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="أي تفاصيل تفيد المسؤول عن المهمة" maxLength={2000} />
            </div>
          </div>

          <div className="modal-foot">
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'جارٍ الحفظ…' : task ? 'حفظ التعديلات' : 'إضافة المهمة'}</button>
            <button type="button" onClick={onClose} className="btn btn-ghost" disabled={saving}>إلغاء</button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
