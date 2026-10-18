'use client'

import { useEffect, useRef, useState } from 'react'
import {
  deleteAttachmentAction,
  getAttachmentAction,
  uploadAttachmentAction,
  type AttachmentEntity,
} from '@/app/(app)/commercial/attachments/actions'
import { confirmAction, runAction, showError } from '@/components/ui/ConfirmDialog'

const MAX_FILE = 4 * 1024 * 1024
const ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf'

/** تصغير الصورة قبل الرفع (أطول ضلع 1800px، JPEG) — صورة الهاتف تصبح بضع مئات من الكيلوبايت */
async function imageToBlob(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image()
      i.onload = () => res(i)
      i.onerror = () => rej(new Error('تعذّر قراءة الصورة'))
      i.src = url
    })
    const scale = Math.min(1, 1800 / Math.max(img.naturalWidth, img.naturalHeight))
    const c = document.createElement('canvas')
    c.width = Math.round(img.naturalWidth * scale)
    c.height = Math.round(img.naturalHeight * scale)
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, c.width, c.height)
    ctx.drawImage(img, 0, 0, c.width, c.height)
    return await new Promise<Blob>((res, rej) =>
      c.toBlob(b => (b ? res(b) : rej(new Error('تعذّر تجهيز الصورة'))), 'image/jpeg', 0.82),
    )
  } finally {
    URL.revokeObjectURL(url)
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(String(r.result))
    r.onerror = () => rej(new Error('تعذّر قراءة الملف'))
    r.readAsDataURL(blob)
  })
}

/** يحوّل data: إلى Blob حتى يُرسل للخادم كملف لا كنص طويل */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [head, b64] = dataUrl.split(',')
  const mime = /data:([^;]+)/.exec(head)?.[1] || 'application/octet-stream'
  const bytes = Uint8Array.from(atob(b64), ch => ch.charCodeAt(0))
  return new Blob([bytes], { type: mime })
}

/** يفتح المرفق في تبويب جديد (رابط blob مؤقت) */
export function openDataUrl(dataUrl: string) {
  const [head, b64] = dataUrl.split(',')
  const mime = /data:([^;]+)/.exec(head)?.[1] || 'application/octet-stream'
  const bytes = Uint8Array.from(atob(b64), ch => ch.charCodeAt(0))
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }))
  window.open(url, '_blank', 'noopener')
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

type Loaded = { file_name: string; mime_type: string; size_bytes: number; data_url: string } | null

export function AttachmentField({
  entity,
  entityId,
  label,
  hint,
}: {
  entity: AttachmentEntity
  /** بدون معرّف (سجل جديد لم يُحفظ بعد) يظهر تنبيه بالإرفاق بعد الحفظ */
  entityId?: string | null
  label: string
  hint?: string
}) {
  const [file, setFile] = useState<Loaded>(null)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  /** اسم الملف أثناء الرفع، وومضة النجاح بعد اكتماله */
  const [uploading, setUploading] = useState<string | null>(null)
  const [justDone, setJustDone] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!justDone) return
    const t = setTimeout(() => setJustDone(false), 1800)
    return () => clearTimeout(t)
  }, [justDone])

  useEffect(() => {
    if (!entityId) return
    let alive = true
    setLoading(true)
    getAttachmentAction(entity, entityId)
      .then(d => { if (alive) setFile(d as Loaded) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [entity, entityId])

  const pick = async (f: File | undefined) => {
    if (!f || !entityId) return
    if (!ACCEPT.split(',').includes(f.type)) {
      showError('نوع الملف غير مدعوم: يُقبل JPG أو PNG أو WebP أو PDF', 'المرفقات')
      return
    }
    const isPdf = f.type === 'application/pdf'
    if (isPdf && f.size > MAX_FILE) {
      showError('حجم ملف PDF كبير (الحد الأقصى 4 ميغابايت)', 'المرفقات')
      return
    }
    const name = isPdf ? f.name : f.name.replace(/\.[^.]+$/, '') + '.jpg'
    setBusy(true)
    setUploading(name)
    try {
      const blob = isPdf ? f : await imageToBlob(f)
      if (blob.size > MAX_FILE) {
        showError('حجم الملف كبير (الحد الأقصى 4 ميغابايت)', 'المرفقات')
        return
      }
      const res = await runAction(uploadAttachmentAction(entity, entityId, name, blob), 'المرفقات · الرفع')
      if (res?.success) {
        const dataUrl = await blobToDataUrl(blob)
        setFile({ file_name: name, mime_type: blob.type || 'image/jpeg', size_bytes: blob.size, data_url: dataUrl })
        setJustDone(true)
      }
    } catch (e) {
      showError(e instanceof Error ? e.message : 'تعذّر تجهيز الملف', 'المرفقات')
    } finally {
      setBusy(false)
      setUploading(null)
      if (input.current) input.current.value = ''
    }
  }

  const remove = async () => {
    if (!entityId || !file) return
    if (!(await confirmAction({ title: 'حذف المرفق', message: `سيُحذف «${file.file_name}».`, tone: 'danger' }))) return
    setBusy(true)
    const res = await runAction(deleteAttachmentAction(entity, entityId), 'المرفقات · الحذف')
    setBusy(false)
    if (res?.success) setFile(null)
  }

  const isImage = file?.mime_type.startsWith('image/')
  const kb = file ? Math.max(1, Math.round(file.size_bytes / 1024)) : 0

  return (
    <div className="att-field">
      <div className="att-label">
        {label} <span className="att-optional">اختياري</span>
      </div>
      {!entityId ? (
        <div className="att-note">احفظ السجل أولاً، ثم افتحه لإرفاق الملف.</div>
      ) : loading ? (
        <div className="att-note">جارٍ التحميل…</div>
      ) : uploading ? (
        <div className="att-uploading" role="status" aria-live="polite">
          <span className="att-up-icon material-symbols-outlined" aria-hidden>upload</span>
          <div className="att-meta">
            <div className="att-name" title={uploading}>{uploading}</div>
            <div className="att-bar"><span /></div>
            <div className="att-size">جارٍ الرفع…</div>
          </div>
        </div>
      ) : file ? (
        <div className={`att-file${justDone ? ' att-file--done' : ''}`}>
          {justDone && (
            <span className="att-done-badge" role="status" aria-live="polite">
              <span className="material-symbols-outlined" aria-hidden>check</span>
              تم الرفع
            </span>
          )}
          <button type="button" className="att-thumb" onClick={() => openDataUrl(file.data_url)} title="فتح">
            {isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={file.data_url} alt="" />
            ) : (
              <span className="material-symbols-outlined" aria-hidden>picture_as_pdf</span>
            )}
          </button>
          <div className="att-meta">
            <div className="att-name" title={file.file_name}>{file.file_name}</div>
            <div className="att-size num">{kb >= 1024 ? `${(kb / 1024).toFixed(1)} م.ب` : `${kb} ك.ب`}</div>
          </div>
          <div className="att-actions">
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => openDataUrl(file.data_url)} disabled={busy}>عرض</button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => input.current?.click()} disabled={busy}>استبدال</button>
            <button type="button" className="btn btn-sm btn-ghost att-del" onClick={remove} disabled={busy}>حذف</button>
          </div>
        </div>
      ) : (
        <button type="button" className="att-drop" onClick={() => input.current?.click()} disabled={busy}>
          <span className="material-symbols-outlined" aria-hidden>attach_file</span>
          <span>إرفاق صورة أو PDF</span>
          {hint && <small>{hint}</small>}
        </button>
      )}
      <input ref={input} type="file" accept={ACCEPT} hidden onChange={e => pick(e.target.files?.[0])} />
    </div>
  )
}

/** زر صغير في الجداول لفتح مرفق السجل */
export function AttachmentChip({ entity, entityId, name }: { entity: AttachmentEntity; entityId: string; name?: string }) {
  const [busy, setBusy] = useState(false)
  return (
    <button
      type="button"
      className="att-chip"
      title={name ? `فتح المرفق: ${name}` : 'فتح المرفق'}
      aria-label="فتح المرفق"
      disabled={busy}
      onClick={async e => {
        e.stopPropagation()
        setBusy(true)
        const d = await getAttachmentAction(entity, entityId)
        setBusy(false)
        if (d?.data_url) openDataUrl(d.data_url)
        else showError('تعذّر فتح المرفق', 'المرفقات')
      }}
    >
      <span className="material-symbols-outlined" aria-hidden>attach_file</span>
    </button>
  )
}
