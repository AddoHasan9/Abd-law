'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { toolBySlug } from '@/lib/tools/registry'
import {
  assemblePdf, canvasToBlob, compressImage, compressPdf, extractPages, imagesToPdf,
  openPdfjs, parseRanges, pdfPageCount, renderPage, stampPdf, type Corner,
} from '@/lib/tools/pdf'
import { baseName, formatBytes, toBlob } from '@/lib/tools/files'
import { Choice, FileChip, FileDrop, Progress, ResultPanel, ToolShell, errMsg, type Output } from './ToolKit'

type Prog = { done: number; total: number; label: string } | null
const PDF_ACCEPT = 'application/pdf,.pdf'
const isPdf = (f: File) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')

/* ======================= PDF إلى صور ======================= */
export function PdfToImages() {
  const tool = toolBySlug('pdf-to-images')!
  const [file, setFile] = useState<File | null>(null)
  const [format, setFormat] = useState<'image/jpeg' | 'image/png'>('image/jpeg')
  const [dpi, setDpi] = useState(150)
  const [prog, setProg] = useState<Prog>(null)
  const [out, setOut] = useState<Output[] | null>(null)

  const run = async () => {
    if (!file) return
    try {
      const doc = await openPdfjs(await file.arrayBuffer())
      const outs: Output[] = []
      const ext = format === 'image/png' ? 'png' : 'jpg'
      for (let i = 1; i <= doc.numPages; i++) {
        setProg({ done: i - 1, total: doc.numPages, label: 'تحويل الصفحات' })
        const canvas = await renderPage(doc, i, { dpi })
        outs.push({ name: `${baseName(file.name)} - ${String(i).padStart(2, '0')}.${ext}`, blob: await canvasToBlob(canvas, format, 0.9) })
        canvas.width = canvas.height = 0
      }
      await doc.destroy()
      setProg(null)
      setOut(outs)
    } catch (e) {
      setProg(null)
      toast.error(errMsg(e))
    }
  }

  return (
    <ToolShell tool={tool}>
      {out ? <ResultPanel outputs={out} onReset={() => { setOut(null); setFile(null) }} zipName={`${baseName(file?.name ?? 'صور')} - صور.zip`} />
        : !file ? <FileDrop accept={PDF_ACCEPT} onFiles={f => setFile(f[0])} title="اختر ملف PDF" hint="ستتحول كل صفحة إلى صورة مستقلة" />
        : (
          <div className="tool-panel">
            <FileChip name={file.name} size={file.size} onRemove={() => setFile(null)} />
            <Choice label="صيغة الصور" value={format} onChange={setFormat} options={[
              { value: 'image/jpeg', label: 'JPG', hint: 'حجم أصغر — مناسب للإرسال' },
              { value: 'image/png', label: 'PNG', hint: 'أوضح للنصوص — حجم أكبر' },
            ]} />
            <Choice label="الدقة" value={dpi} onChange={setDpi} options={[
              { value: 100, label: 'عادية', hint: 'للمعاينة والواتساب' },
              { value: 150, label: 'عالية', hint: 'مناسبة لأغلب الاستخدامات' },
              { value: 300, label: 'للطباعة', hint: 'أعلى وضوح وأكبر حجم' },
            ]} />
            {prog ? <Progress {...prog} /> : (
              <div className="tool-footer"><button className="btn btn-primary" onClick={run}>
                <span className="material-symbols-outlined" aria-hidden>imagesmode</span>تحويل إلى صور
              </button></div>
            )}
          </div>
        )}
    </ToolShell>
  )
}

/* ======================= صور إلى PDF ======================= */
export function ImagesToPdf() {
  const tool = toolBySlug('images-to-pdf')!
  const [files, setFiles] = useState<{ id: number; file: File; url: string }[]>([])
  const [size, setSize] = useState<'a4' | 'fit'>('a4')
  const [margin, setMargin] = useState(24)
  const [prog, setProg] = useState<Prog>(null)
  const [out, setOut] = useState<Output[] | null>(null)

  const add = (list: File[]) => setFiles(prev => [...prev, ...list.map((file, i) => ({ id: Date.now() + i, file, url: URL.createObjectURL(file) }))])
  const move = (i: number, d: -1 | 1) => setFiles(prev => {
    const j = i + d
    if (j < 0 || j >= prev.length) return prev
    const n = [...prev]; [n[i], n[j]] = [n[j], n[i]]; return n
  })

  const run = async () => {
    try {
      const bytes = await imagesToPdf(files.map(f => f.file), { pageSize: size, margin: size === 'a4' ? margin : 0 },
        (done, total) => setProg({ done, total, label: 'إضافة الصور' }))
      setProg(null)
      setOut([{ name: `${baseName(files[0].file.name)}.pdf`, blob: toBlob(bytes, 'application/pdf') }])
    } catch (e) {
      setProg(null)
      toast.error('تعذّر قراءة إحدى الصور. صيغ HEIC غير مدعومة؛ صوّرها بصيغة JPG.')
    }
  }

  return (
    <ToolShell tool={tool}>
      {out ? <ResultPanel outputs={out} onReset={() => { setOut(null); setFiles([]) }} />
        : !files.length ? <FileDrop accept="image/*" multiple onFiles={add} title="اختر الصور" hint="JPG أو PNG أو WEBP — يمكنك اختيار عدة صور مرة واحدة" />
        : (
          <div className="tool-panel">
            <ol className="tool-thumbs">
              {files.map((f, i) => (
                <li key={f.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.url} alt="" />
                  <span className="tool-thumb-n num">{i + 1}</span>
                  <div className="tool-thumb-actions">
                    <button type="button" className="tool-mini" aria-label="تقديم" onClick={() => move(i, -1)} disabled={i === 0}><span className="material-symbols-outlined">chevron_right</span></button>
                    <button type="button" className="tool-mini" aria-label="تأخير" onClick={() => move(i, 1)} disabled={i === files.length - 1}><span className="material-symbols-outlined">chevron_left</span></button>
                    <button type="button" className="tool-mini is-danger" aria-label="إزالة" onClick={() => setFiles(prev => prev.filter(x => x.id !== f.id))}><span className="material-symbols-outlined">close</span></button>
                  </div>
                </li>
              ))}
            </ol>
            <FileDrop accept="image/*" multiple compact onFiles={add} title="إضافة صور أخرى" hint="" />
            <Choice label="حجم الصفحة" value={size} onChange={setSize} options={[
              { value: 'a4', label: 'A4', hint: 'مناسب للطباعة والتقديم الرسمي' },
              { value: 'fit', label: 'بحجم الصورة', hint: 'بدون هوامش' },
            ]} />
            {size === 'a4' && <Choice label="الهامش" value={margin} onChange={setMargin} options={[
              { value: 0, label: 'بدون' }, { value: 24, label: 'صغير' }, { value: 48, label: 'كبير' },
            ]} />}
            {prog ? <Progress {...prog} /> : (
              <div className="tool-footer"><button className="btn btn-primary" onClick={run}>
                <span className="material-symbols-outlined" aria-hidden>picture_as_pdf</span>إنشاء PDF ({files.length} صفحة)
              </button></div>
            )}
          </div>
        )}
    </ToolShell>
  )
}

/* ======================= دمج ======================= */
export function MergePdf() {
  const tool = toolBySlug('merge')!
  const [files, setFiles] = useState<{ id: number; file: File; pages: number }[]>([])
  const [busy, setBusy] = useState(false)
  const [out, setOut] = useState<Output[] | null>(null)

  const add = async (list: File[]) => {
    for (const [i, file] of list.entries()) {
      try {
        const pages = await pdfPageCount(await file.arrayBuffer())
        setFiles(prev => [...prev, { id: Date.now() + i, file, pages }])
      } catch (e) { toast.error(`${file.name}: ${errMsg(e)}`) }
    }
  }
  const move = (i: number, d: -1 | 1) => setFiles(prev => {
    const j = i + d
    if (j < 0 || j >= prev.length) return prev
    const n = [...prev]; [n[i], n[j]] = [n[j], n[i]]; return n
  })

  const run = async () => {
    setBusy(true)
    try {
      const bufs = await Promise.all(files.map(f => f.file.arrayBuffer()))
      const refs = files.flatMap((f, s) => Array.from({ length: f.pages }, (_, index) => ({ src: s, index, rotation: 0 })))
      const bytes = await assemblePdf(bufs, refs)
      setOut([{ name: `${baseName(files[0].file.name)} - مدمج.pdf`, blob: toBlob(bytes, 'application/pdf') }])
    } catch (e) { toast.error(errMsg(e)) }
    setBusy(false)
  }

  const totalPages = files.reduce((s, f) => s + f.pages, 0)
  return (
    <ToolShell tool={tool}>
      {out ? <ResultPanel outputs={out} onReset={() => { setOut(null); setFiles([]) }} />
        : !files.length ? <FileDrop accept={PDF_ACCEPT} multiple onFiles={add} title="اختر ملفات PDF للدمج" hint="اختر ملفين أو أكثر، ثم رتّبها" />
        : (
          <div className="tool-panel">
            <ol className="tool-list">
              {files.map((f, i) => (
                <li key={f.id}>
                  <span className="tool-list-n num">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-[13px]">{f.file.name}</p>
                    <p className="text-[12px] text-[var(--text-3)] num">{f.pages} صفحة — {formatBytes(f.file.size)}</p>
                  </div>
                  <button type="button" className="tool-mini" aria-label="تقديم" onClick={() => move(i, -1)} disabled={i === 0}><span className="material-symbols-outlined">keyboard_arrow_up</span></button>
                  <button type="button" className="tool-mini" aria-label="تأخير" onClick={() => move(i, 1)} disabled={i === files.length - 1}><span className="material-symbols-outlined">keyboard_arrow_down</span></button>
                  <button type="button" className="tool-mini is-danger" aria-label="إزالة" onClick={() => setFiles(prev => prev.filter(x => x.id !== f.id))}><span className="material-symbols-outlined">close</span></button>
                </li>
              ))}
            </ol>
            <FileDrop accept={PDF_ACCEPT} multiple compact onFiles={add} title="إضافة ملفات أخرى" hint="" />
            <div className="tool-footer">
              <button className="btn btn-primary" onClick={run} disabled={busy || files.length < 2}>
                <span className="material-symbols-outlined" aria-hidden>library_add</span>
                {busy ? 'جارٍ الدمج…' : files.length < 2 ? 'أضف ملفاً آخر للدمج' : `دمج ${files.length} ملفات (${totalPages} صفحة)`}
              </button>
            </div>
          </div>
        )}
    </ToolShell>
  )
}

/* ======================= تقسيم واستخراج ======================= */
export function SplitPdf() {
  const tool = toolBySlug('split')!
  const [file, setFile] = useState<{ file: File; pages: number } | null>(null)
  const [mode, setMode] = useState<'range' | 'each'>('range')
  const [range, setRange] = useState('')
  const [prog, setProg] = useState<Prog>(null)
  const [out, setOut] = useState<Output[] | null>(null)

  const open = async (f: File[]) => {
    try { setFile({ file: f[0], pages: await pdfPageCount(await f[0].arrayBuffer()) }) }
    catch (e) { toast.error(errMsg(e)) }
  }
  const parsed = file ? parseRanges(range, file.pages) : null

  const run = async () => {
    if (!file) return
    try {
      const buf = await file.file.arrayBuffer()
      const b = baseName(file.file.name)
      if (mode === 'range') {
        if (!parsed) return toast.error('اكتب الصفحات بشكل صحيح، مثل: 1-3, 5')
        const bytes = await extractPages(buf, parsed)
        setOut([{ name: `${b} - صفحات ${range.replace(/\s+/g, '')}.pdf`, blob: toBlob(bytes, 'application/pdf') }])
      } else {
        const outs: Output[] = []
        for (let i = 1; i <= file.pages; i++) {
          setProg({ done: i - 1, total: file.pages, label: 'فصل الصفحات' })
          outs.push({ name: `${b} - ${String(i).padStart(2, '0')}.pdf`, blob: toBlob(await extractPages(buf, [i]), 'application/pdf') })
        }
        setProg(null)
        setOut(outs)
      }
    } catch (e) { setProg(null); toast.error(errMsg(e)) }
  }

  return (
    <ToolShell tool={tool}>
      {out ? <ResultPanel outputs={out} onReset={() => { setOut(null); setFile(null); setRange('') }} zipName={`${baseName(file?.file.name ?? 'ملف')} - صفحات.zip`} />
        : !file ? <FileDrop accept={PDF_ACCEPT} onFiles={open} title="اختر ملف PDF" hint="لاستخراج صفحات منه أو فصل صفحاته" />
        : (
          <div className="tool-panel">
            <FileChip name={`${file.file.name} (${file.pages} صفحة)`} size={file.file.size} onRemove={() => setFile(null)} />
            <Choice label="طريقة التقسيم" value={mode} onChange={setMode} options={[
              { value: 'range', label: 'استخراج صفحات محددة', hint: 'في ملف واحد' },
              { value: 'each', label: 'كل صفحة بملف', hint: `${file.pages} ملفات` },
            ]} />
            {mode === 'range' && (
              <label className="tool-field">
                <span>أرقام الصفحات</span>
                <input dir="ltr" inputMode="numeric" value={range} onChange={e => setRange(e.target.value)} placeholder={`مثال: 1-3, 5, 8-${file.pages}`} />
                <small className={range && !parsed ? 'text-rose-600' : ''}>
                  {range && !parsed ? `صيغة غير صحيحة أو رقم أكبر من ${file.pages}` : parsed ? `سيتم استخراج ${parsed.length} صفحة` : 'افصل بفاصلة، واستخدم - للمدى'}
                </small>
              </label>
            )}
            {prog ? <Progress {...prog} /> : (
              <div className="tool-footer"><button className="btn btn-primary" onClick={run} disabled={mode === 'range' && !parsed}>
                <span className="material-symbols-outlined" aria-hidden>call_split</span>{mode === 'range' ? 'استخراج الصفحات' : 'فصل الصفحات'}
              </button></div>
            )}
          </div>
        )}
    </ToolShell>
  )
}

/* ======================= ضغط PDF ======================= */
const PDF_LEVELS = {
  light: { dpi: 150, quality: 0.8 },
  balanced: { dpi: 120, quality: 0.65 },
  strong: { dpi: 90, quality: 0.5 },
} as const

export function CompressPdf() {
  const tool = toolBySlug('compress-pdf')!
  const [file, setFile] = useState<File | null>(null)
  const [level, setLevel] = useState<keyof typeof PDF_LEVELS>('balanced')
  const [prog, setProg] = useState<Prog>(null)
  const [out, setOut] = useState<Output[] | null>(null)

  const run = async () => {
    if (!file) return
    try {
      const bytes = await compressPdf(await file.arrayBuffer(), PDF_LEVELS[level], (done, total) => setProg({ done, total, label: 'ضغط الصفحات' }))
      setProg(null)
      const blob = toBlob(bytes, 'application/pdf')
      if (blob.size >= file.size) toast.message('الملف مضغوط أصلاً؛ النسخة الجديدة ليست أصغر. احتفظ بالأصل.')
      setOut([{ name: `${baseName(file.name)} - مضغوط.pdf`, blob }])
    } catch (e) { setProg(null); toast.error(errMsg(e)) }
  }

  return (
    <ToolShell tool={tool}>
      {out ? <ResultPanel outputs={out} originalSize={file?.size} onReset={() => { setOut(null); setFile(null) }} />
        : !file ? <FileDrop accept={PDF_ACCEPT} onFiles={f => setFile(f[0])} title="اختر ملف PDF لضغطه" hint="الأنسب للملفات الممسوحة ضوئياً (سكانر) والصور" />
        : (
          <div className="tool-panel">
            <FileChip name={file.name} size={file.size} onRemove={() => setFile(null)} />
            <Choice label="مستوى الضغط" value={level} onChange={setLevel} options={[
              { value: 'light', label: 'خفيف', hint: 'أفضل وضوح' },
              { value: 'balanced', label: 'متوازن', hint: 'موصى به' },
              { value: 'strong', label: 'قوي', hint: 'أصغر حجم' },
            ]} />
            <p className="tool-note">
              <span className="material-symbols-outlined" aria-hidden>info</span>
              تتحول الصفحات إلى صور مضغوطة، فلن يعود النص قابلاً للتحديد والنسخ. المحتوى المرئي يبقى كما هو.
            </p>
            {prog ? <Progress {...prog} /> : (
              <div className="tool-footer"><button className="btn btn-primary" onClick={run}>
                <span className="material-symbols-outlined" aria-hidden>compress</span>ضغط الملف
              </button></div>
            )}
          </div>
        )}
    </ToolShell>
  )
}

/* ======================= ضغط الصور ======================= */
export function CompressImages() {
  const tool = toolBySlug('compress-images')!
  const [files, setFiles] = useState<File[]>([])
  const [maxSide, setMaxSide] = useState(2000)
  const [quality, setQuality] = useState(0.75)
  const [type, setType] = useState<'image/jpeg' | 'image/webp'>('image/jpeg')
  const [prog, setProg] = useState<Prog>(null)
  const [out, setOut] = useState<Output[] | null>(null)

  const run = async () => {
    try {
      const outs: Output[] = []
      for (const [i, f] of files.entries()) {
        setProg({ done: i, total: files.length, label: 'ضغط الصور' })
        const blob = await compressImage(f, { maxSide, quality, type })
        const smaller = blob.size < f.size ? blob : f
        outs.push({ name: `${baseName(f.name)}.${smaller === f ? f.name.split('.').pop() : type === 'image/webp' ? 'webp' : 'jpg'}`, blob: smaller })
      }
      setProg(null)
      setOut(outs)
    } catch { setProg(null); toast.error('تعذّر قراءة إحدى الصور. صيغ HEIC غير مدعومة.') }
  }

  const original = files.reduce((s, f) => s + f.size, 0)
  return (
    <ToolShell tool={tool}>
      {out ? <ResultPanel outputs={out} originalSize={original} onReset={() => { setOut(null); setFiles([]) }} zipName="صور مضغوطة.zip" />
        : !files.length ? <FileDrop accept="image/*" multiple onFiles={setFiles} title="اختر الصور لضغطها" hint="يمكن اختيار عدة صور — مفيد لصور الهويات والمستندات قبل رفعها" />
        : (
          <div className="tool-panel">
            <div className="tool-list-plain">
              {files.map((f, i) => <FileChip key={i} name={f.name} size={f.size} onRemove={() => setFiles(prev => prev.filter((_, j) => j !== i))} />)}
            </div>
            <Choice label="أقصى أبعاد" value={maxSide} onChange={setMaxSide} options={[
              { value: 1280, label: '1280px', hint: 'واتساب والبريد' },
              { value: 2000, label: '2000px', hint: 'متوازن' },
              { value: 3200, label: '3200px', hint: 'للطباعة' },
            ]} />
            <Choice label="الجودة" value={quality} onChange={setQuality} options={[
              { value: 0.85, label: 'عالية' }, { value: 0.75, label: 'متوسطة' }, { value: 0.6, label: 'منخفضة' },
            ]} />
            <Choice label="الصيغة" value={type} onChange={setType} options={[
              { value: 'image/jpeg', label: 'JPG', hint: 'تفتح في كل مكان' },
              { value: 'image/webp', label: 'WEBP', hint: 'أصغر، قد لا تقبلها بعض البوابات' },
            ]} />
            {prog ? <Progress {...prog} /> : (
              <div className="tool-footer"><button className="btn btn-primary" onClick={run}>
                <span className="material-symbols-outlined" aria-hidden>photo_size_select_large</span>ضغط {files.length} صورة ({formatBytes(original)})
              </button></div>
            )}
          </div>
        )}
    </ToolShell>
  )
}

/* ======================= ختم وترقيم وعلامة مائية ======================= */
function Toggle({ on, set, title, hint }: { on: boolean; set: (v: boolean) => void; title: string; hint: string }) {
  return (
    <button type="button" className={`tool-toggle ${on ? 'is-on' : ''}`} aria-pressed={on} onClick={() => set(!on)}>
      <span className="tool-switch" aria-hidden><span /></span>
      <span className="min-w-0 text-start"><b>{title}</b><small>{hint}</small></span>
    </button>
  )
}


export function StampPdf() {
  const tool = toolBySlug('stamp')!
  const [file, setFile] = useState<File | null>(null)
  const [wmOn, setWmOn] = useState(false)
  const [wmText, setWmText] = useState('نسخة')
  const [wmOpacity, setWmOpacity] = useState(0.15)
  const [numOn, setNumOn] = useState(true)
  const [numFormat, setNumFormat] = useState<'n' | 'n-of-total' | 'page-n'>('page-n')
  const [numPos, setNumPos] = useState<Corner>('bottom-center')
  const [sealOn, setSealOn] = useState(false)
  const [seal, setSeal] = useState<File | null>(null)
  const [sealPos, setSealPos] = useState<Corner>('bottom-left')
  const [sealPages, setSealPages] = useState<'all' | 'last' | 'first'>('last')
  const [sealSize, setSealSize] = useState(110)
  const [busy, setBusy] = useState(false)
  const [out, setOut] = useState<Output[] | null>(null)

  const nothing = !wmOn && !numOn && !(sealOn && seal)
  const run = async () => {
    if (!file) return
    setBusy(true)
    try {
      const bytes = await stampPdf(await file.arrayBuffer(), {
        watermark: wmOn ? { text: wmText, opacity: wmOpacity, size: 70 } : undefined,
        numbering: numOn ? { format: numFormat, position: numPos, start: 1 } : undefined,
        seal: sealOn && seal ? { file: seal, position: sealPos, widthPt: sealSize, pages: sealPages } : undefined,
      })
      setOut([{ name: `${baseName(file.name)} - مختوم.pdf`, blob: toBlob(bytes, 'application/pdf') }])
    } catch (e) { toast.error(errMsg(e)) }
    setBusy(false)
  }

  const corners: { value: Corner; label: string }[] = [
    { value: 'bottom-right', label: 'أسفل يمين' }, { value: 'bottom-center', label: 'أسفل وسط' }, { value: 'bottom-left', label: 'أسفل يسار' },
    { value: 'top-right', label: 'أعلى يمين' }, { value: 'top-left', label: 'أعلى يسار' },
  ]

  return (
    <ToolShell tool={tool}>
      {out ? <ResultPanel outputs={out} onReset={() => { setOut(null); setFile(null) }} />
        : !file ? <FileDrop accept={PDF_ACCEPT} onFiles={f => setFile(f[0])} title="اختر ملف PDF" hint="لإضافة ختم المكتب أو التوقيع وترقيم الصفحات" />
        : (
          <div className="tool-panel">
            <FileChip name={file.name} size={file.size} onRemove={() => setFile(null)} />

            <div className="tool-section">
              <Toggle on={sealOn} set={setSealOn} title="ختم أو توقيع" hint="صورة PNG بخلفية شفافة تعطي أفضل نتيجة" />
              {sealOn && (
                <div className="tool-section-body">
                  {seal ? <FileChip name={seal.name} size={seal.size} onRemove={() => setSeal(null)} />
                    : <FileDrop accept="image/png,image/jpeg,image/webp" compact onFiles={f => setSeal(f[0])} title="اختر صورة الختم أو التوقيع" hint="" />}
                  <Choice label="الموضع" value={sealPos} onChange={setSealPos} options={corners} />
                  <Choice label="الصفحات" value={sealPages} onChange={setSealPages} options={[
                    { value: 'last', label: 'الأخيرة' }, { value: 'first', label: 'الأولى' }, { value: 'all', label: 'كل الصفحات' },
                  ]} />
                  <Choice label="الحجم" value={sealSize} onChange={setSealSize} options={[
                    { value: 80, label: 'صغير' }, { value: 110, label: 'متوسط' }, { value: 150, label: 'كبير' },
                  ]} />
                </div>
              )}
            </div>

            <div className="tool-section">
              <Toggle on={numOn} set={setNumOn} title="ترقيم الصفحات" hint="مفيد لملفات الدعاوى والمستندات المقدمة" />
              {numOn && (
                <div className="tool-section-body">
                  <Choice label="الشكل" value={numFormat} onChange={setNumFormat} options={[
                    { value: 'page-n', label: 'صفحة 1 من 5' }, { value: 'n-of-total', label: '1 / 5' }, { value: 'n', label: '1' },
                  ]} />
                  <Choice label="الموضع" value={numPos} onChange={setNumPos} options={corners} />
                </div>
              )}
            </div>

            <div className="tool-section">
              <Toggle on={wmOn} set={setWmOn} title="علامة مائية" hint="نص قطري شفاف في منتصف كل صفحة" />
              {wmOn && (
                <div className="tool-section-body">
                  <label className="tool-field">
                    <span>النص</span>
                    <input value={wmText} onChange={e => setWmText(e.target.value)} placeholder="نسخة / مسودة / سري" maxLength={40} />
                  </label>
                  <Choice label="الشفافية" value={wmOpacity} onChange={setWmOpacity} options={[
                    { value: 0.1, label: 'خفيفة' }, { value: 0.15, label: 'متوسطة' }, { value: 0.25, label: 'واضحة' },
                  ]} />
                </div>
              )}
            </div>

            <div className="tool-footer">
              <button className="btn btn-primary" onClick={run} disabled={busy || nothing || (sealOn && !seal)}>
                <span className="material-symbols-outlined" aria-hidden>approval</span>
                {busy ? 'جارٍ التطبيق…' : nothing ? 'اختر إضافة واحدة على الأقل' : sealOn && !seal ? 'اختر صورة الختم' : 'تطبيق على الملف'}
              </button>
            </div>
          </div>
        )}
    </ToolShell>
  )
}

export { isPdf }
