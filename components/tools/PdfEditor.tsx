'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { toolBySlug } from '@/lib/tools/registry'
import { assemblePdf, imagesToPdf, openPdfjs, renderPage, type PageRef } from '@/lib/tools/pdf'
import { baseName, toBlob } from '@/lib/tools/files'
import { FileDrop, Progress, ResultPanel, ToolShell, errMsg, type Output } from './ToolKit'

interface EdPage extends PageRef { id: string; thumb: string | null; w: number; h: number }
let uid = 0

/**
 * محرر صفحات PDF: مصغّرات للصفحات، حذف، تدوير، تكرار، سحب لإعادة الترتيب
 * (وأزرار تحريك على اللمس)، وإضافة صفحات من PDF آخر أو من صور في أي موضع.
 */
export default function PdfEditor() {
  const tool = toolBySlug('editor')!
  const sources = useRef<ArrayBuffer[]>([])
  const [name, setName] = useState('')
  const [pages, setPages] = useState<EdPage[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState<{ done: number; total: number; label: string } | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [output, setOutput] = useState<Output[] | null>(null)
  const insertAt = useRef<number | null>(null)
  const addInput = useRef<HTMLInputElement>(null)

  const loadSource = useCallback(async (buf: ArrayBuffer, label: string) => {
    const srcIndex = sources.current.push(buf) - 1
    const doc = await openPdfjs(buf)
    const created: EdPage[] = []
    setLoading({ done: 0, total: doc.numPages, label })
    for (let i = 1; i <= doc.numPages; i++) {
      const canvas = await renderPage(doc, i, { maxWidth: 220, dpi: 96 })
      const thumb = canvas.toDataURL('image/jpeg', 0.72)
      created.push({ id: `p${++uid}`, src: srcIndex, index: i - 1, rotation: 0, thumb, w: canvas.width, h: canvas.height })
      canvas.width = canvas.height = 0
      setLoading({ done: i, total: doc.numPages, label })
    }
    await doc.destroy()
    setLoading(null)
    return created
  }, [])

  const openFirst = async (files: File[]) => {
    try {
      setName(files[0].name)
      const created = await loadSource(await files[0].arrayBuffer(), 'قراءة الصفحات')
      setPages(created)
    } catch (e) {
      setLoading(null)
      toast.error(errMsg(e))
    }
  }

  const addFiles = async (files: File[]) => {
    try {
      let created: EdPage[] = []
      const pdfs = files.filter(f => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'))
      const images = files.filter(f => f.type.startsWith('image/'))
      for (const f of pdfs) created = created.concat(await loadSource(await f.arrayBuffer(), `إضافة ${f.name}`))
      if (images.length) {
        const bytes = await imagesToPdf(images, { pageSize: 'a4', margin: 24 })
        created = created.concat(await loadSource(bytes.slice().buffer, 'إضافة الصور'))
      }
      const at = insertAt.current
      setPages(prev => (at === null ? [...prev, ...created] : [...prev.slice(0, at), ...created, ...prev.slice(at)]))
      toast.success(`أُضيفت ${created.length} صفحة`)
    } catch (e) {
      setLoading(null)
      toast.error(errMsg(e))
    } finally {
      insertAt.current = null
    }
  }

  const askAdd = (at: number | null) => {
    insertAt.current = at
    addInput.current?.click()
  }

  const toggle = (id: string) =>
    setSelected(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const rotate = (ids: string[], by: number) =>
    setPages(prev => prev.map(p => (ids.includes(p.id) ? { ...p, rotation: (p.rotation + by + 360) % 360 } : p)))

  const remove = (ids: string[]) => {
    setPages(prev => prev.filter(p => !ids.includes(p.id)))
    setSelected(new Set())
  }

  const duplicate = (id: string) =>
    setPages(prev => {
      const i = prev.findIndex(p => p.id === id)
      return [...prev.slice(0, i + 1), { ...prev[i], id: `p${++uid}` }, ...prev.slice(i + 1)]
    })

  const move = (id: string, dir: -1 | 1) =>
    setPages(prev => {
      const i = prev.findIndex(p => p.id === id)
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const n = [...prev]
      ;[n[i], n[j]] = [n[j], n[i]]
      return n
    })

  const dropOn = (targetId: string) => {
    if (!dragId || dragId === targetId) return
    setPages(prev => {
      const from = prev.findIndex(p => p.id === dragId)
      const to = prev.findIndex(p => p.id === targetId)
      const n = [...prev]
      const [item] = n.splice(from, 1)
      n.splice(to, 0, item)
      return n
    })
  }

  const save = async (onlySelected: boolean) => {
    const list = onlySelected ? pages.filter(p => selected.has(p.id)) : pages
    if (!list.length) return toast.error('لا توجد صفحات للحفظ')
    try {
      setLoading({ done: 0, total: 1, label: 'إنشاء الملف' })
      const bytes = await assemblePdf(sources.current, list)
      setLoading(null)
      const suffix = onlySelected ? 'مستخرج' : 'معدل'
      setOutput([{ name: `${baseName(name)} - ${suffix}.pdf`, blob: toBlob(bytes, 'application/pdf') }])
    } catch (e) {
      setLoading(null)
      toast.error(errMsg(e))
    }
  }

  const reset = () => {
    sources.current = []
    setPages([])
    setSelected(new Set())
    setOutput(null)
    setName('')
  }

  // تحرير ذاكرة المصغرات عند المغادرة
  useEffect(() => () => { sources.current = [] }, [])

  const sel = [...selected]

  return (
    <ToolShell tool={tool}>
      {output ? (
        <ResultPanel outputs={output} onReset={reset} />
      ) : !pages.length ? (
        loading ? <Progress {...loading} /> : (
          <FileDrop accept="application/pdf,.pdf" onFiles={openFirst} title="افتح ملف PDF للتعديل" hint="اسحب الملف إلى هنا أو اختره من جهازك" />
        )
      ) : (
        <>
          <div className="tool-bar">
            <div className="min-w-0">
              <p className="font-extrabold text-[13.5px] truncate">{name}</p>
              <p className="text-[12px] text-[var(--text-3)] num">{pages.length} صفحة{sel.length ? ` — محدد ${sel.length}` : ''}</p>
            </div>
            <div className="tool-bar-actions">
              {sel.length > 0 ? (
                <>
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => rotate(sel, 90)}>
                    <span className="material-symbols-outlined" aria-hidden>rotate_right</span>تدوير
                  </button>
                  <button type="button" className="btn btn-sm btn-ghost text-rose-600" onClick={() => remove(sel)}>
                    <span className="material-symbols-outlined" aria-hidden>delete</span>حذف
                  </button>
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => save(true)}>
                    <span className="material-symbols-outlined" aria-hidden>file_export</span>استخراج المحدد
                  </button>
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => setSelected(new Set())}>إلغاء التحديد</button>
                </>
              ) : (
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => setSelected(new Set(pages.map(p => p.id)))}>تحديد الكل</button>
              )}
            </div>
          </div>

          {loading && <Progress {...loading} />}

          <ol className="tool-pages" aria-label="صفحات الملف">
            {pages.map((p, i) => {
              const isSel = selected.has(p.id)
              return (
                <li
                  key={p.id}
                  className={`tool-page-card ${isSel ? 'is-selected' : ''} ${overId === p.id ? 'is-over' : ''} ${dragId === p.id ? 'is-dragging' : ''}`}
                  draggable
                  onDragStart={() => setDragId(p.id)}
                  onDragEnd={() => { setDragId(null); setOverId(null) }}
                  onDragOver={e => { e.preventDefault(); setOverId(p.id) }}
                  onDrop={e => { e.preventDefault(); dropOn(p.id); setOverId(null) }}
                >
                  <button type="button" className="tool-page-thumb" onClick={() => toggle(p.id)} aria-pressed={isSel} aria-label={`صفحة ${i + 1}`}>
                    {p.thumb && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.thumb} alt="" style={{ transform: `rotate(${p.rotation}deg) scale(${p.rotation % 180 ? Math.min(p.w, p.h) / Math.max(p.w, p.h) : 1})` }} draggable={false} />
                    )}
                    <span className="tool-page-check material-symbols-outlined" aria-hidden>{isSel ? 'check_circle' : 'radio_button_unchecked'}</span>
                  </button>
                  <div className="tool-page-foot">
                    <span className="num font-bold">{i + 1}</span>
                    <div className="flex items-center">
                      <button type="button" className="tool-mini" aria-label="تحريك للأمام" onClick={() => move(p.id, -1)} disabled={i === 0}>
                        <span className="material-symbols-outlined" aria-hidden>chevron_right</span>
                      </button>
                      <button type="button" className="tool-mini" aria-label="تحريك للخلف" onClick={() => move(p.id, 1)} disabled={i === pages.length - 1}>
                        <span className="material-symbols-outlined" aria-hidden>chevron_left</span>
                      </button>
                      <button type="button" className="tool-mini" aria-label="تدوير" onClick={() => rotate([p.id], 90)}>
                        <span className="material-symbols-outlined" aria-hidden>rotate_right</span>
                      </button>
                      <button type="button" className="tool-mini" aria-label="تكرار الصفحة" onClick={() => duplicate(p.id)}>
                        <span className="material-symbols-outlined" aria-hidden>content_copy</span>
                      </button>
                      <button type="button" className="tool-mini is-danger" aria-label="حذف الصفحة" onClick={() => remove([p.id])}>
                        <span className="material-symbols-outlined" aria-hidden>delete</span>
                      </button>
                    </div>
                  </div>
                  <button type="button" className="tool-insert" aria-label={`إضافة صفحات بعد الصفحة ${i + 1}`} onClick={() => askAdd(i + 1)}>
                    <span className="material-symbols-outlined" aria-hidden>add</span>
                  </button>
                </li>
              )
            })}
            <li className="tool-page-add">
              <button type="button" onClick={() => askAdd(null)}>
                <span className="material-symbols-outlined" aria-hidden>note_add</span>
                إضافة صفحات
                <small>من PDF أو صور</small>
              </button>
            </li>
          </ol>

          <input
            ref={addInput}
            type="file"
            accept="application/pdf,.pdf,image/*"
            multiple
            hidden
            onChange={e => { const f = Array.from(e.target.files ?? []); e.target.value = ''; if (f.length) addFiles(f) }}
          />

          <div className="tool-footer">
            <button type="button" className="btn btn-ghost" onClick={reset}>إلغاء</button>
            <button type="button" className="btn btn-primary" onClick={() => save(false)} disabled={!!loading || !pages.length}>
              <span className="material-symbols-outlined" aria-hidden>save</span>
              حفظ الملف ({pages.length} صفحة)
            </button>
          </div>
        </>
      )}
    </ToolShell>
  )
}
