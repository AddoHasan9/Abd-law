'use client'

import { useEffect, useRef, useState } from 'react'
import {
  deleteAttachmentAction,
  getAttachmentAction,
  uploadAttachmentAction,
  type AttachmentEntity,
} from '@/app/(app)/commercial/attachments/actions'
import { confirmAction, runAction, showError } from '@/components/ui/ConfirmDialog'

const MAX_PDF = 5 * 1024 * 1024
const ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf'

/** تصغير الصورة قبل الرفع (أطول ضلع 1800px، JPEG) — صورة الهاتف تصبح بضع مئات من الكيلوبايت */
async function imageToDataUrl(file: File): Promise<string> {
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
    return c.toDataURL('image/jpeg', 0.82)
  } finally {
    URL.revokeObjectURL(url)
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(String(r.result))
    r.onerror = () => rej(new Error('تعذّر قراءة الملف'))
    r.readAsDataURL(file)
  })
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
  const input = useRef<HTMLInputElement>(null)

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
    if (f.type === 'application/pdf' && f.size > MAX_PDF) {
      showError('حجم ملف PDF كبير (الحد الأقصى 5 ميغابايت)', 'المرفقات')
      return
    }
    setBusy(true)
    try {
      const dataUrl = f.type === 'application/pdf' ? await fileToDataUrl(f) : await imageToDataUrl(f)
      const name = f.type === 'application/pdf' ? f.name : f.name.replace(/\.[^.]+$/, '') + '.jpg'
      const res = await runAction(uploadAttachmentAction(entity, entityId, name, dataUrl), 'المرفقات · الرفع')
      if (res?.success) {
        const mime = /data:([^;]+)/.exec(dataUrl)?.[1] || 'image/jpeg'
        setFile({ file_name: name, mime_type: mime, size_bytes: Math.floor((dataUrl.length * 3) / 4), data_url: dataUrl })
      }
    } catch (e) {
      showError(e instanceof Error ? e.message : 'تعذّر تجهيز الملف', 'المرفقات')
    } finally {
      setBusy(false)
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
      ) : file ? (
        <div className="att-file">
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
          <span>{busy ? 'جارٍ الرفع…' : 'إرفاق صورة أو PDF'}</span>
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
