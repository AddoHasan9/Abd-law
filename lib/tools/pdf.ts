/**
 * أدوات معالجة PDF والصور — تعمل بالكامل داخل المتصفح.
 * لا يُرفع أي ملف إلى الخادم: مهم لسرية مستندات المكتب.
 */
import { PDFDocument, degrees } from 'pdf-lib'

type PdfjsLib = typeof import('pdfjs-dist')
let pdfjsPromise: Promise<PdfjsLib> | null = null

/** تحميل pdf.js عند الحاجة فقط (لا يدخل في حزمة باقي الصفحات) */
export function getPdfjs(): Promise<PdfjsLib> {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist/legacy/build/pdf.mjs').then(mod => {
      const lib = mod as unknown as PdfjsLib
      lib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).toString()
      return lib
    })
  }
  return pdfjsPromise
}

export type PdfjsDoc = Awaited<ReturnType<PdfjsLib['getDocument']>['promise']>

export async function openPdfjs(data: ArrayBuffer): Promise<PdfjsDoc> {
  const lib = await getPdfjs()
  // نسخة من البيانات لأن pdf.js ينقل ملكية الـ buffer إلى الـ worker
  return lib.getDocument({ data: new Uint8Array(data.slice(0)) }).promise
}

/** رسم صفحة إلى canvas بدقة (نقطة لكل بوصة) محددة */
export async function renderPage(doc: PdfjsDoc, pageNo: number, opts: { dpi?: number; maxWidth?: number; rotation?: number } = {}) {
  const page = await doc.getPage(pageNo)
  const base = page.getViewport({ scale: 1, rotation: ((page.rotate + (opts.rotation ?? 0)) % 360 + 360) % 360 })
  let scale = (opts.dpi ?? 72) / 72
  if (opts.maxWidth) scale = Math.min(scale, opts.maxWidth / base.width)
  const viewport = page.getViewport({ scale, rotation: base.rotation })
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.floor(viewport.width))
  canvas.height = Math.max(1, Math.floor(viewport.height))
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  await page.render({ canvasContext: ctx, viewport }).promise
  page.cleanup()
  return canvas
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: 'image/jpeg' | 'image/png' | 'image/webp', quality?: number) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('تعذّر إنشاء الصورة'))), type, quality),
  )
}

export async function loadImage(file: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
    return img
  } finally {
    // نؤخر التحرير قليلاً حتى ينتهي الرسم
    setTimeout(() => URL.revokeObjectURL(url), 30_000)
  }
}

/** إعادة رسم صورة بحجم أقصى وجودة محددة */
export async function compressImage(file: Blob, opts: { maxSide: number; quality: number; type: 'image/jpeg' | 'image/webp' }) {
  const img = await loadImage(file)
  const ratio = Math.min(1, opts.maxSide / Math.max(img.naturalWidth, img.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.naturalWidth * ratio)
  canvas.height = Math.round(img.naturalHeight * ratio)
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvasToBlob(canvas, opts.type, opts.quality)
}

/** تحويل أي صورة يدعمها المتصفح إلى JPEG/PNG يقبلها pdf-lib */
async function imageForPdf(file: Blob): Promise<{ bytes: ArrayBuffer; kind: 'jpg' | 'png'; w: number; h: number }> {
  if (file.type === 'image/jpeg' || file.type === 'image/png') {
    const img = await loadImage(file)
    return { bytes: await file.arrayBuffer(), kind: file.type === 'image/png' ? 'png' : 'jpg', w: img.naturalWidth, h: img.naturalHeight }
  }
  const img = await loadImage(file)
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0)
  const blob = await canvasToBlob(canvas, 'image/jpeg', 0.92)
  return { bytes: await blob.arrayBuffer(), kind: 'jpg', w: img.naturalWidth, h: img.naturalHeight }
}

export const A4 = { w: 595.28, h: 841.89 }

/** صور ← PDF */
export async function imagesToPdf(
  files: Blob[],
  opts: { pageSize: 'a4' | 'fit'; margin: number },
  onProgress?: (done: number, total: number) => void,
) {
  const pdf = await PDFDocument.create()
  for (let i = 0; i < files.length; i++) {
    const im = await imageForPdf(files[i])
    const embedded = im.kind === 'png' ? await pdf.embedPng(im.bytes) : await pdf.embedJpg(im.bytes)
    if (opts.pageSize === 'fit') {
      const page = pdf.addPage([im.w * 0.75, im.h * 0.75])
      page.drawImage(embedded, { x: 0, y: 0, width: im.w * 0.75, height: im.h * 0.75 })
    } else {
      const landscape = im.w > im.h
      const pw = landscape ? A4.h : A4.w
      const ph = landscape ? A4.w : A4.h
      const page = pdf.addPage([pw, ph])
      const m = opts.margin
      const s = Math.min((pw - 2 * m) / im.w, (ph - 2 * m) / im.h)
      const w = im.w * s, h = im.h * s
      page.drawImage(embedded, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h })
    }
    onProgress?.(i + 1, files.length)
  }
  return pdf.save()
}

/** ضغط PDF بإعادة رسم كل صفحة كصورة JPEG بدقة أقل (يفقد إمكانية تحديد النص) */
export async function compressPdf(
  data: ArrayBuffer,
  opts: { dpi: number; quality: number },
  onProgress?: (done: number, total: number) => void,
) {
  const src = await openPdfjs(data)
  const out = await PDFDocument.create()
  for (let i = 1; i <= src.numPages; i++) {
    const page = await src.getPage(i)
    const vp = page.getViewport({ scale: 1, rotation: page.rotate })
    const canvas = await renderPage(src, i, { dpi: opts.dpi })
    const blob = await canvasToBlob(canvas, 'image/jpeg', opts.quality)
    const img = await out.embedJpg(await blob.arrayBuffer())
    const p = out.addPage([vp.width, vp.height])
    p.drawImage(img, { x: 0, y: 0, width: vp.width, height: vp.height })
    canvas.width = canvas.height = 0
    onProgress?.(i, src.numPages)
  }
  await src.destroy()
  return out.save()
}

/** وصف صفحة في المحرر: من أي ملف مصدر، أي رقم، وكم تدويراً إضافياً */
export interface PageRef { src: number; index: number; rotation: number }

/** تجميع صفحات من عدة ملفات مصدر في PDF واحد */
export async function assemblePdf(sources: ArrayBuffer[], pages: PageRef[]) {
  const out = await PDFDocument.create()
  const loaded = new Map<number, PDFDocument>()
  for (const ref of pages) {
    let doc = loaded.get(ref.src)
    if (!doc) {
      doc = await PDFDocument.load(sources[ref.src], { ignoreEncryption: true })
      loaded.set(ref.src, doc)
    }
    const [copied] = await out.copyPages(doc, [ref.index])
    if (ref.rotation) copied.setRotation(degrees((copied.getRotation().angle + ref.rotation) % 360))
    out.addPage(copied)
  }
  return out.save()
}

/** «1-3, 5, 8-» ← قائمة أرقام صفحات (تبدأ من 1) */
export function parseRanges(input: string, total: number): number[] | null {
  const out: number[] = []
  const clean = input.replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/،/g, ',').replace(/\s+/g, '')
  if (!clean) return null
  for (const part of clean.split(',')) {
    if (!part) continue
    const m = part.match(/^(\d+)?(?:-(\d+)?)?$/)
    if (!m) return null
    const a = m[1] ? parseInt(m[1], 10) : 1
    const b = part.includes('-') ? (m[2] ? parseInt(m[2], 10) : total) : a
    if (a < 1 || b > total || a > b) return null
    for (let i = a; i <= b; i++) out.push(i)
  }
  return out.length ? out : null
}

/** نص (عربي أو غيره) ← صورة PNG شفافة. المتصفح يتكفّل بتشكيل الحروف العربية، وهو ما لا يفعله pdf-lib */
export async function textToPng(text: string, opts: { fontSize: number; color: string; weight?: number }) {
  const font = `${opts.weight ?? 700} ${opts.fontSize}px ${getComputedStyle(document.body).fontFamily || 'sans-serif'}`
  const measure = document.createElement('canvas').getContext('2d')!
  measure.font = font
  const m = measure.measureText(text)
  const pad = Math.ceil(opts.fontSize * 0.3)
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(m.width + pad * 2)
  canvas.height = Math.ceil(opts.fontSize * 1.5 + pad)
  const ctx = canvas.getContext('2d')!
  ctx.font = font
  ctx.fillStyle = opts.color
  ctx.textBaseline = 'middle'
  ctx.direction = 'rtl'
  ctx.textAlign = 'center'
  ctx.fillText(text, canvas.width / 2, canvas.height / 2)
  const blob = await canvasToBlob(canvas, 'image/png')
  return { bytes: await blob.arrayBuffer(), w: canvas.width, h: canvas.height }
}

export type Corner = 'bottom-center' | 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right'

/** علامة مائية + ترقيم + ختم/توقيع */
export async function stampPdf(
  data: ArrayBuffer,
  opts: {
    watermark?: { text: string; opacity: number; size: number }
    numbering?: { format: 'n' | 'n-of-total' | 'page-n'; position: Corner; start: number }
    seal?: { file: Blob; position: Corner; widthPt: number; pages: 'all' | 'last' | 'first' }
  },
) {
  const doc = await PDFDocument.load(data, { ignoreEncryption: true })
  const pages = doc.getPages()
  const total = pages.length

  let wm: { img: Awaited<ReturnType<PDFDocument['embedPng']>>; w: number; h: number } | null = null
  if (opts.watermark?.text.trim()) {
    const png = await textToPng(opts.watermark.text.trim(), { fontSize: 96, color: '#64748b' })
    wm = { img: await doc.embedPng(png.bytes), w: png.w, h: png.h }
  }
  let seal: { img: Awaited<ReturnType<PDFDocument['embedPng']>>; ratio: number } | null = null
  if (opts.seal) {
    const im = await imageForPdf(opts.seal.file)
    const img = im.kind === 'png' ? await doc.embedPng(im.bytes) : await doc.embedJpg(im.bytes)
    seal = { img, ratio: im.h / im.w }
  }

  const place = (pw: number, ph: number, w: number, h: number, pos: Corner, margin = 28) => {
    const x = pos.endsWith('left') ? margin : pos.endsWith('right') ? pw - w - margin : (pw - w) / 2
    const y = pos.startsWith('top') ? ph - h - margin : margin
    return { x, y }
  }

  for (let i = 0; i < total; i++) {
    const page = pages[i]
    const { width: pw, height: ph } = page.getSize()

    if (wm && opts.watermark) {
      const targetW = Math.min(pw, ph) * (opts.watermark.size / 100)
      const s = targetW / wm.w
      const w = wm.w * s, h = wm.h * s
      // دوران 45° حول المركز
      const rad = Math.PI / 4
      const cx = pw / 2, cy = ph / 2
      const x = cx - (w / 2) * Math.cos(rad) + (h / 2) * Math.sin(rad)
      const y = cy - (w / 2) * Math.sin(rad) - (h / 2) * Math.cos(rad)
      page.drawImage(wm.img, { x, y, width: w, height: h, rotate: degrees(45), opacity: opts.watermark.opacity })
    }

    if (opts.numbering) {
      const n = i + opts.numbering.start
      const last = total - 1 + opts.numbering.start
      const label = opts.numbering.format === 'n' ? `${n}` : opts.numbering.format === 'n-of-total' ? `${n} / ${last}` : `صفحة ${n} من ${last}`
      const png = await textToPng(label, { fontSize: 40, color: '#334155', weight: 600 })
      const img = await doc.embedPng(png.bytes)
      const h = 11, w = (png.w / png.h) * h * 1.2
      const { x, y } = place(pw, ph, w, h * 1.2, opts.numbering.position, 20)
      page.drawImage(img, { x, y, width: w, height: h * 1.2 })
    }

    if (seal && opts.seal) {
      const on = opts.seal.pages === 'all' || (opts.seal.pages === 'last' && i === total - 1) || (opts.seal.pages === 'first' && i === 0)
      if (on) {
        const w = opts.seal.widthPt, h = w * seal.ratio
        const { x, y } = place(pw, ph, w, h, opts.seal.position, 36)
        page.drawImage(seal.img, { x, y, width: w, height: h })
      }
    }
  }
  return doc.save()
}

export async function pdfPageCount(data: ArrayBuffer) {
  const doc = await PDFDocument.load(data, { ignoreEncryption: true })
  return doc.getPageCount()
}

/** صفحات محددة ← PDF جديد */
export async function extractPages(data: ArrayBuffer, pageNumbers: number[]) {
  return assemblePdf([data], pageNumbers.map(n => ({ src: 0, index: n - 1, rotation: 0 })))
}
