'use client'
/**
 * قسم المهام — قائمة مجمّعة زمنياً (متأخرة / اليوم / غداً / هذا الأسبوع / لاحقاً / بلا موعد)
 * بطاقات قابلة للتوسيع، حركة دخول/خروج ناعمة، وإنجاز مع «نتيجة المراجعة».
 */
import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { toast } from 'sonner'
import { Icon } from '@/components/ui/Icon'
import { AnimatedTabs } from '@/components/ui/AnimatedTabs'
import { baghdadNow } from '@/lib/push/time'
import { hhmm, remindLabel, STATUS_META, type Task, type TaskStatus } from '@/lib/tasks/model'
import { deleteTaskAction, listTasksAction, setTaskStatusAction, updateChecklistAction } from '@/app/(app)/tasks/actions'
import TaskModal from './TaskModal'

type Filter = 'active' | 'today' | 'urgent' | 'done'
type Group = { key: string; label: string; tone: string; items: Task[] }

const addDays = (iso: string, n: number) => {
  const [y, m, d] = iso.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d + n))
  return t.toISOString().slice(0, 10)
}
const fmtDay = new Intl.DateTimeFormat('ar-IQ-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
const dayLabel = (iso: string) => fmtDay.format(new Date(`${iso}T00:00:00Z`))
const time12 = (t?: string | null) => {
  const v = hhmm(t); if (!v) return ''
  const [h, m] = v.split(':').map(Number)
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'ص' : 'م'}`
}

export default function TasksClient({ initial }: { initial: Task[] }) {
  const [tasks, setTasks] = useState<Task[]>(initial)
  const [filter, setFilter] = useState<Filter>('active')
  const [q, setQ] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)
  const [modal, setModal] = useState<{ open: boolean; task: Task | null }>({ open: false, task: null })
  const [finishing, setFinishing] = useState<Task | null>(null)
  const [result, setResult] = useState('')
  const reduce = useReducedMotion()
  const today = baghdadNow().date

  const reload = async () => { const r = await listTasksAction(); if (r.success && r.data) setTasks(r.data) }

  // فتح مهمة من إشعار الهاتف: /tasks?t=<id>
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('t')
    if (!t) return
    setOpenId(t)
    setTimeout(() => {
      const el = document.querySelector<HTMLElement>(`[data-tid="${CSS.escape(t)}"]`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el?.classList.add('is-focus'); setTimeout(() => el?.classList.remove('is-focus'), 3500)
    }, 350)
  }, [])

  const counts = useMemo(() => {
    const active = tasks.filter(t => t.status !== 'done')
    return {
      active: active.length,
      today: active.filter(t => t.task_date === today || (t.task_date && t.task_date < today)).length,
      urgent: active.filter(t => t.priority === 'urgent').length,
      done: tasks.length - active.length,
      late: active.filter(t => t.task_date && t.task_date < today).length,
    }
  }, [tasks, today])

  const groups: Group[] = useMemo(() => {
    const term = q.trim()
    const match = (t: Task) => !term || [t.title, t.agency, t.company_display, t.notes, t.assignee_name].some(v => v?.includes(term))
    let list = tasks.filter(match)
    if (filter === 'done') {
      list = list.filter(t => t.status === 'done').sort((a, b) => (b.done_at || '').localeCompare(a.done_at || ''))
      return list.length ? [{ key: 'done', label: 'منجزة', tone: 'ok', items: list }] : []
    }
    list = list.filter(t => t.status !== 'done')
    if (filter === 'urgent') list = list.filter(t => t.priority === 'urgent')
    if (filter === 'today') list = list.filter(t => t.task_date && t.task_date <= today)
    const tomorrow = addDays(today, 1), week = addDays(today, 7)
    const buckets: Group[] = [
      { key: 'late', label: 'متأخرة', tone: 'bad', items: [] },
      { key: 'today', label: 'اليوم', tone: 'warn', items: [] },
      { key: 'tomorrow', label: 'غداً', tone: 'work', items: [] },
      { key: 'week', label: 'هذا الأسبوع', tone: 'neutral', items: [] },
      { key: 'later', label: 'لاحقاً', tone: 'neutral', items: [] },
      { key: 'nodate', label: 'بلا موعد', tone: 'neutral', items: [] },
    ]
    for (const t of list) {
      const d = t.task_date
      const b = !d ? 'nodate' : d < today ? 'late' : d === today ? 'today' : d === tomorrow ? 'tomorrow' : d <= week ? 'week' : 'later'
      buckets.find(x => x.key === b)!.items.push(t)
    }
    // داخل كل مجموعة: العاجلة أولاً ثم بالوقت
    buckets.forEach(g => g.items.sort((a, b) => (a.priority === b.priority ? 0 : a.priority === 'urgent' ? -1 : 1) || (a.task_date || '').localeCompare(b.task_date || '') || (a.task_time || '99').localeCompare(b.task_time || '99')))
    return buckets.filter(g => g.items.length)
  }, [tasks, filter, q, today])

  const patchLocal = (t: Task) => setTasks(list => list.map(x => (x.id === t.id ? t : x)))

  const setStatus = async (t: Task, status: TaskStatus, notes?: string) => {
    patchLocal({ ...t, status, result_notes: notes ?? t.result_notes })
    const r = await setTaskStatusAction(t.id, status, notes)
    if (!r.success) { toast.error(r.error); reload(); return }
    if (r.data) patchLocal(r.data)
    if (status === 'done') toast.success('أُنجزت المهمة ✓', { action: { label: 'تراجع', onClick: () => setStatus({ ...t, status: 'done' }, 'todo') } })
  }

  const toggleDoc = async (t: Task, i: number) => {
    const checklist = t.checklist.map((c, j) => (j === i ? { ...c, done: !c.done } : c))
    patchLocal({ ...t, checklist })
    const r = await updateChecklistAction(t.id, checklist)
    if (!r.success) { toast.error(r.error); reload() }
  }

  const remove = async (t: Task) => {
    if (!confirm(`حذف المهمة «${t.title}»؟`)) return
    setTasks(list => list.filter(x => x.id !== t.id))
    const r = await deleteTaskAction(t.id)
    if (!r.success) { toast.error(r.error); reload() } else toast.success('حُذفت المهمة')
  }

  const tabs = [
    { id: 'active' as Filter, label: 'النشطة', count: counts.active },
    { id: 'today' as Filter, label: 'اليوم', count: counts.today },
    { id: 'urgent' as Filter, label: 'العاجلة', count: counts.urgent },
    { id: 'done' as Filter, label: 'المنجزة', count: counts.done },
  ]

  return (
    <div className="tk">
      <div className="tk-toolbar">
        <AnimatedTabs tabs={tabs} activeTab={filter} onChange={setFilter} layoutId="tasks-filter" />
        <div className="tk-search">
          <Icon name="search" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="ابحث بالمهمة أو الدائرة أو الشركة" aria-label="بحث في المهام" />
        </div>
        <button type="button" className="btn btn-primary tk-new" onClick={() => setModal({ open: true, task: null })}>
          <Icon name="plus" /> مهمة جديدة
        </button>
      </div>

      {counts.late > 0 && filter !== 'done' && (
        <div className="tk-late-note" role="status">⚠️ عندك {counts.late} {counts.late === 1 ? 'مهمة متأخرة' : 'مهام متأخرة'} — راجعها أو غيّر موعدها.</div>
      )}

      {groups.length === 0 ? (
        <motion.div className="tk-empty" initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="tk-empty-ic"><Icon name="tasks" /></div>
          <b>{q ? 'لا نتائج لبحثك' : filter === 'done' ? 'لا مهام منجزة بعد' : 'لا مهام هنا'}</b>
          <span>{q ? 'جرّب كلمة أخرى.' : 'أضف مراجعة دائرة أو أي عمل تريد تذكّره.'}</span>
          {!q && filter !== 'done' && <button type="button" className="btn btn-go" onClick={() => setModal({ open: true, task: null })}>+ مهمة جديدة</button>}
        </motion.div>
      ) : (
        groups.map(g => (
          <section key={g.key} className="tk-group" aria-label={g.label}>
            <h2 className={`tk-group-h tone-${g.tone}`}><i />{g.label}<span className="num">{g.items.length}</span></h2>
            <motion.ul className="tk-list" layout={!reduce}>
              <AnimatePresence initial={false}>
                {g.items.map((t, idx) => {
                  const isOpen = openId === t.id
                  const docsDone = t.checklist.filter(c => c.done).length
                  const late = t.status !== 'done' && t.task_date && t.task_date < today
                  return (
                    <motion.li key={t.id} layout={!reduce} data-tid={t.id}
                      initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0, transition: { delay: Math.min(idx, 6) * 0.04 } }}
                      exit={reduce ? { opacity: 0 } : { opacity: 0, x: -40, transition: { duration: 0.25 } }}
                      className={`tk-card${t.priority === 'urgent' ? ' is-urgent' : ''}${t.status === 'done' ? ' is-done' : ''}${t.status === 'in_progress' ? ' is-work' : ''}`}>
                      <div className="tk-main">
                        <button type="button" className={`tk-check s-${t.status}`} aria-label={t.status === 'done' ? 'إعادة فتح المهمة' : 'إنجاز المهمة'}
                          onClick={() => (t.status === 'done' ? setStatus(t, 'todo') : (setFinishing(t), setResult(t.result_notes || '')))}>
                          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12.5l4 4 8-9" /></svg>
                        </button>
                        <button type="button" className="tk-body-btn" onClick={() => setOpenId(isOpen ? null : t.id)} aria-expanded={isOpen}>
                          <span className="tk-title">
                            {t.priority === 'urgent' && <span className="tk-urgent"><i />عاجلة</span>}
                            <span className="tk-title-t">{t.title}</span>
                          </span>
                          <span className="tk-meta">
                            {t.agency && <span className="tk-agency">🏛 {t.agency}</span>}
                            {(t.task_date || t.task_time) && (
                              <span className={`tk-when${late ? ' is-late' : t.task_date === today ? ' is-today' : ''}`}>
                                {t.task_date && t.task_date !== today ? dayLabel(t.task_date) : 'اليوم'}{t.task_time ? ` · ${time12(t.task_time)}` : ''}
                              </span>
                            )}
                            {t.company_display && <span className="tk-chipline">🏢 {t.company_display}</span>}
                            {t.assignee_name && <span className="tk-chipline">👤 {t.assignee_name}</span>}
                            {t.remind_before != null && t.task_date && t.status !== 'done' && <span className="tk-chipline">🔔 {remindLabel(t.remind_before)}</span>}
                            {t.checklist.length > 0 && <span className={`tk-chipline${docsDone === t.checklist.length ? ' is-ok' : ''}`}>📄 {docsDone}/{t.checklist.length}</span>}
                            {t.status === 'in_progress' && <span className="tag tag-work">{STATUS_META.in_progress.label}</span>}
                          </span>
                        </button>
                      </div>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div className="tk-more" initial={reduce ? false : { height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}>
                            <div className="tk-more-in">
                              {t.checklist.length > 0 && (
                                <div className="tk-docs-live">
                                  <span className="tk-label">الأوراق المطلوبة</span>
                                  {t.checklist.map((c, i) => (
                                    <label key={c.text + i} className={c.done ? 'is-done' : ''}>
                                      <input type="checkbox" checked={c.done} onChange={() => toggleDoc(t, i)} /> {c.text}
                                    </label>
                                  ))}
                                </div>
                              )}
                              {t.notes && <p className="tk-notes">📝 {t.notes}</p>}
                              {t.result_notes && <p className="tk-result">✅ النتيجة: {t.result_notes}</p>}
                              <div className="tk-actions">
                                {t.status === 'todo' && <button type="button" className="btn btn-go btn-sm" onClick={() => setStatus(t, 'in_progress')}>▶ ابدأ</button>}
                                {t.status !== 'done' && <button type="button" className="btn btn-primary btn-sm" onClick={() => { setFinishing(t); setResult(t.result_notes || '') }}>✓ إنجاز</button>}
                                {t.status === 'done' && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStatus(t, 'todo')}>↺ إعادة فتح</button>}
                                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setModal({ open: true, task: t })}>تعديل</button>
                                <button type="button" className="btn btn-ghost btn-sm tk-del" onClick={() => remove(t)}>حذف</button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.li>
                  )
                })}
              </AnimatePresence>
            </motion.ul>
          </section>
        ))
      )}

      <TaskModal open={modal.open} task={modal.task} onClose={() => setModal({ open: false, task: null })}
        onSaved={t => setTasks(list => (list.some(x => x.id === t.id) ? list.map(x => (x.id === t.id ? t : x)) : [t, ...list]))} />

      {/* إنجاز المهمة + نتيجة المراجعة (اختيارية) */}
      <AnimatePresence>
        {finishing && (
          <motion.div className="tk-finish-veil" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setFinishing(null)}>
            <motion.div className="tk-finish" role="dialog" aria-modal="true" aria-label="إنجاز المهمة"
              initial={reduce ? false : { y: 30, scale: 0.97, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
              onClick={e => e.stopPropagation()}>
              <div className="tk-finish-ic">✓</div>
              <h3>إنجاز «{finishing.title}»</h3>
              <label htmlFor="tk-res" className="tk-label">نتيجة المراجعة <span className="tk-opt">اختياري</span></label>
              <textarea id="tk-res" className="input" rows={3} value={result} onChange={e => setResult(e.target.value)} placeholder="مثلاً: تم التصديق، الاستلام يوم الأحد" autoFocus />
              <div className="tk-finish-actions">
                <button type="button" className="btn btn-primary" onClick={() => { const t = finishing; setFinishing(null); setStatus(t, 'done', result) }}>تم الإنجاز</button>
                <button type="button" className="btn btn-ghost" onClick={() => setFinishing(null)}>إلغاء</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
