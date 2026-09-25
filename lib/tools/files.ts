/** تنزيل/مشاركة الملفات الناتجة وأسماؤها وأحجامها */
export function formatBytes(n: number) {
  if (n < 1024) return `${n} بايت`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} ك.ب`
  return `${(n / 1024 / 1024).toFixed(n < 10 * 1024 * 1024 ? 2 : 1)} م.ب`
}

export function baseName(name: string) {
  return name.replace(/\.[^.]+$/, '')
}

export function toBlob(data: Uint8Array | ArrayBuffer | Blob, type: string) {
  if (data instanceof Blob) return data
  return new Blob([data instanceof Uint8Array ? data.slice().buffer : data], { type })
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/** مشاركة مباشرة (واتساب، البريد…) على الموبايل عند توفرها */
export function canShareFiles(files: File[]) {
  return typeof navigator !== 'undefined' && !!navigator.canShare && navigator.canShare({ files })
}

export async function shareFiles(files: File[], title: string) {
  try {
    await navigator.share({ files, title })
    return true
  } catch {
    return false
  }
}

export async function zipFiles(files: { name: string; blob: Blob }[]) {
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  for (const f of files) zip.file(f.name, f.blob)
  return zip.generateAsync({ type: 'blob' })
}
