'use client'

import Link from 'next/link'
import { createContext, useContext, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { ToolDef } from '@/lib/tools/registry'
import { canShareFiles, downloadBlob, formatBytes, shareFiles } from '@/lib/tools/files'

/* ---------- إطار الأداة: بطاقة داخل صفحة الأدوات ---------- */
export const ToolCardContext = createContext(false)

export function ToolShell({ tool, children }: { tool: ToolDef; children: React.ReactNode }) {
  const asCard = useContext(ToolCardContext)
  if (asCard) {
    return (
      <article className={`tool-card tone-${tool.group}${tool.wide ? ' is-wide' : ''}`} id={tool.slug} aria-labelledby={`t-${tool.slug}`}>
        <header className="tool-card-head">
          <span className="tool-card-icon" aria-hidden>
            <span className="material-symbols-outlined">{tool.icon}</span>
          </span>
          <div className="min-w-0">
            <h2 id={`t-${tool.slug}`}>{tool.title}</h2>
            <p>{tool.desc}</p>
          </div>
        </header>
        {children}
      </article>
    )
  }
  return (
    <div className="tool-page">
      <Link href="/tools" className="tool-back">
        <span className="material-symbols-outlined" aria-hidden>arrow_forward</span>
        كل الأدوات
      </Link>
      <header className="tool-head">
        <span className="tool-head-icon" aria-hidden>
          <span className="material-symbols-outlined">{tool.icon}</span>
        </span>
        <div className="min-w-0">
          <h1>{tool.title}</h1>
          <p>{tool.desc}</p>
        </div>
      </header>
      {children}
    </div>
  )
}

/* ---------- منطقة إسقاط الملفات ---------- */
export function FileDrop({
  accept,
  multiple,
  onFiles,
  title,
  hint,
  compact,
}: {
  accept: string
  multiple?: boolean
  onFiles: (files: File[]) => void
  title: string
  hint: string
  compact?: boolean
}) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const types = accept.split(',').map(s => s.trim())
  const matches = (f: File) =>
    types.some(t => (t.endsWith('/*') ? f.type.startsWith(t.slice(0, -1)) : t.startsWith('.') ? f.name.toLowerCase().endsWith(t) : f.type === t))

  const take = (list: FileList | null) => {
    if (!list?.length) return
    const all = Array.from(list)
    const ok = all.filter(matches)
    if (ok.length < all.length) toast.error(`تم تجاهل ${all.length - ok.length} ملف بصيغة غير مدعومة`)
    if (ok.length) onFiles(multiple ? ok : ok.slice(0, 1))
  }

  return (
    <div
      className={`tool-drop ${over ? 'is-over' : ''} ${compact ? 'is-compact' : ''}`}
      role="button"
      tabIndex={0}
      aria-label={title}
      onClick={() => input.current?.click()}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.current?.click() } }}
      onDragOver={e => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); take(e.dataTransfer.files) }}
    >
      <span className="tool-drop-icon material-symbols-outlined" aria-hidden>{compact ? 'add' : 'upload_file'}</span>
      <div className="min-w-0">
        <p className="tool-drop-title">{title}</p>
        {!compact && <p className="tool-drop-hint">{hint}</p>}
      </div>
      <button type="button" className="btn btn-primary" tabIndex={-1} onClick={e => { e.stopPropagation(); input.current?.click() }}>
        اختيار {multiple ? 'ملفات' : 'ملف'}
      </button>
      <input
        ref={input}
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        onClick={e => e.stopPropagation()}
        onChange={e => { take(e.target.files); e.target.value = '' }}
      />
    </div>
  )
}

/* ---------- شريط التقدّم ---------- */
export function Progress({ done, total, label }: { done: number; total: number; label: string }) {
  const pct = total ? Math.round((done / total) * 100) : 0
  return (
    <div className="tool-progress" role="status" aria-live="polite">
      <div className="flex items-center justify-between text-[12.5px] font-bold">
        <span>{label}</span>
        <span className="num text-[var(--text-3)]">{done} / {total}</span>
      </div>
      <div className="tool-progress-bar"><span style={{ width: `${pct}%` }} /></div>
    </div>
  )
}

/* ---------- النتيجة: تنزيل ومشاركة ---------- */
export interface Output { name: string; blob: Blob }

export function ResultPanel({
  outputs,
  originalSize,
  onReset,
  zipName,
}: {
  outputs: Output[]
  originalSize?: number
  onReset: () => void
  zipName?: string
}) {
  const [zipping, setZipping] = useState(false)
  const total = outputs.reduce((s, o) => s + o.blob.size, 0)
  const files = outputs.map(o => new File([o.blob], o.name, { type: o.blob.type }))
  const shareable = canShareFiles(files)
  const saved = originalSize ? Math.round((1 - total / originalSize) * 100) : null

  const downloadAll = async () => {
    if (outputs.length === 1) return downloadBlob(outputs[0].blob, outputs[0].name)
    setZipping(true)
    try {
      const { zipFiles } = await import('@/lib/tools/files')
      downloadBlob(await zipFiles(outputs), zipName ?? 'ملفات.zip')
    } finally {
      setZipping(false)
    }
  }

  return (
    <section className="tool-result">
      <div className="tool-result-head">
        <span className="tool-result-check material-symbols-outlined" aria-hidden>task_alt</span>
        <div className="min-w-0">
          <h2>{outputs.length === 1 ? 'الملف جاهز' : `${outputs.length} ملفات جاهزة`}</h2>
          <p className="num">
            {formatBytes(total)}
            {originalSize && saved !== null && (
              saved > 0
                ? <> — أصغر بـ <b className="text-emerald-600 dark:text-emerald-400">{saved}%</b> من {formatBytes(originalSize)}</>
                : <> — لم يصغر الحجم (الأصل {formatBytes(originalSize)})</>
            )}
          </p>
        </div>
      </div>

      {outputs.length > 1 && (
        <ul className="tool-result-list">
          {outputs.map(o => (
            <li key={o.name}>
              <span className="truncate">{o.name}</span>
              <span className="num text-[var(--text-3)] shrink-0">{formatBytes(o.blob.size)}</span>
              <button type="button" className="icon-btn" aria-label={`تنزيل ${o.name}`} onClick={() => downloadBlob(o.blob, o.name)}>
                <span className="material-symbols-outlined text-[18px]" aria-hidden>download</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="tool-result-actions">
        <button type="button" className="btn btn-primary" onClick={downloadAll} disabled={zipping}>
          <span className="material-symbols-outlined" aria-hidden>download</span>
          {outputs.length === 1 ? 'تنزيل' : zipping ? 'جارٍ التجهيز…' : 'تنزيل الكل (ZIP)'}
        </button>
        {shareable && (
          <button type="button" className="btn btn-ghost" onClick={() => shareFiles(files, outputs[0].name)}>
            <span className="material-symbols-outlined" aria-hidden>ios_share</span>
            مشاركة
          </button>
        )}
        <button type="button" className="btn btn-ghost" onClick={onReset}>
          <span className="material-symbols-outlined" aria-hidden>restart_alt</span>
          ملف آخر
        </button>
      </div>
    </section>
  )
}

/* ---------- مجموعة خيارات (أزرار اختيار) ---------- */
export function Choice<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string; hint?: string }[]
  onChange: (v: T) => void
}) {
  return (
    <fieldset className="tool-choice">
      <legend>{label}</legend>
      <div className="tool-choice-row">
        {options.map(o => (
          <button
            key={String(o.value)}
            type="button"
            aria-pressed={o.value === value}
            className={o.value === value ? 'is-on' : ''}
            onClick={() => onChange(o.value)}
          >
            <span>{o.label}</span>
            {o.hint && <small>{o.hint}</small>}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

export function FileChip({ name, size, onRemove }: { name: string; size: number; onRemove?: () => void }) {
  return (
    <div className="tool-file">
      <span className="material-symbols-outlined text-[20px] text-[var(--accent)]" aria-hidden>description</span>
      <span className="truncate font-bold text-[13px]">{name}</span>
      <span className="num text-[12px] text-[var(--text-3)] shrink-0">{formatBytes(size)}</span>
      {onRemove && (
        <button type="button" className="icon-btn" aria-label="إزالة الملف" onClick={onRemove}>
          <span className="material-symbols-outlined text-[18px]" aria-hidden>close</span>
        </button>
      )}
    </div>
  )
}

export const errMsg = (e: unknown) =>
  e instanceof Error && /password|encrypt/i.test(e.message)
    ? 'الملف محمي بكلمة مرور. افتح الحماية أولاً ثم أعد المحاولة.'
    : 'تعذّرت معالجة الملف. تأكد أنه ملف سليم وغير تالف.'
