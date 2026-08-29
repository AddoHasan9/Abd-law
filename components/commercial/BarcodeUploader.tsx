'use client'

import React, { useState, useRef, useEffect, DragEvent, ChangeEvent } from 'react'
import { createPortal } from 'react-dom'
import { useModalBodyLock } from '@/lib/hooks/useModalBodyLock'

interface Props {
  stageId: string
  companyId: string
  initialBarcodeUrl?: string | null
  onUpload: (stageId: string, companyId: string, file: File) => Promise<void>
  disabled?: boolean
}

export default function BarcodeUploader({
  stageId,
  companyId,
  initialBarcodeUrl,
  onUpload,
  disabled = false,
}: Props) {
  const [fileUrl, setFileUrl] = useState<string | null>(initialBarcodeUrl || null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useModalBodyLock(lightboxOpen, () => setLightboxOpen(false))

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (initialBarcodeUrl) {
      setFileUrl(initialBarcodeUrl)
    }
  }, [initialBarcodeUrl])

  const isPdf = Boolean(
    fileUrl && (fileUrl.startsWith('data:application/pdf') || fileUrl.toLowerCase().endsWith('.pdf') || fileUrl.includes('application/pdf'))
  )

  const processFile = async (file: File) => {
    const isImage = file.type.startsWith('image/')
    const isPdfFile = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')

    if (!isImage && !isPdfFile) {
      alert('يرجى اختيار ملف صورة أو مستند PDF صالح (PNG, JPG, WebP, PDF)')
      return
    }

    setIsUploading(true)
    setUploadProgress(20)

    const timer1 = setTimeout(() => setUploadProgress(55), 200)
    const timer2 = setTimeout(() => setUploadProgress(85), 450)

    try {
      await onUpload(stageId, companyId, file)
      setUploadProgress(100)

      const reader = new FileReader()
      reader.onload = e => {
        setFileUrl(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    } catch (e) {
      console.error('Barcode/Document upload failed:', e)
    } finally {
      clearTimeout(timer1)
      clearTimeout(timer2)
      setTimeout(() => {
        setIsUploading(false)
        setUploadProgress(0)
      }, 500)
    }
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled && !isUploading) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (disabled || isUploading) return

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      processFile(files[0])
    }
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      processFile(files[0])
    }
  }

  const handleDownloadFile = () => {
    if (!fileUrl) return
    const a = document.createElement('a')
    a.href = fileUrl
    a.download = isPdf ? `deposit_document_${companyId}.pdf` : `company_barcode_${companyId}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handleOpenInNewTab = () => {
    if (!fileUrl) return
    if (fileUrl.startsWith('data:')) {
      const win = window.open()
      if (win) {
        if (isPdf) {
          win.document.write(`
            <html>
              <head><title>معاينة مستند الوديعة PDF</title></head>
              <body style="margin:0;padding:0;background:#1e293b;">
                <iframe src="${fileUrl}" frameborder="0" style="border:0; width:100%; height:100vh;" allowfullscreen></iframe>
              </body>
            </html>
          `)
        } else {
          win.document.write(`
            <html>
              <head><title>معاينة باركود الشركة</title></head>
              <body style="margin:0;padding:40px;background:#0f172a;display:flex;align-items:center;justify-content:center;min-height:100vh;">
                <img src="${fileUrl}" style="max-width:90%;max-height:90vh;border-radius:12px;box-shadow:0 20px 50px rgba(0,0,0,0.5);" />
              </body>
            </html>
          `)
        }
      }
    } else {
      window.open(fileUrl, '_blank')
    }
  }

  return (
    <div className="w-full">
      {/* Hidden File Input (Accepts Images and PDF) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        style={{ display: 'none' }}
        disabled={disabled || isUploading}
        onChange={handleFileChange}
      />

      {/* STATE 1: Uploading Animation */}
      {isUploading ? (
        <div
          style={{
            position: 'relative',
            padding: '14px 12px',
            background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.08) 0%, rgba(16, 185, 129, 0.08) 100%)',
            border: '1.5px dashed rgba(56, 189, 248, 0.5)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            overflow: 'hidden',
          }}
        >
          {/* Laser Scan Beam */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '2px',
              background: 'linear-gradient(90deg, transparent, #38BDF8, #10B981, transparent)',
              boxShadow: '0 0 8px #38BDF8',
              animation: 'laserScanCompact 1.2s ease-in-out infinite alternate',
            }}
          />

          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'var(--accent-soft)',
              color: 'var(--accent)',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            <span className="material-symbols-outlined text-[20px] animate-spin">sync</span>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text)' }}>
                جاري معالجة وثيقة / باركود الوديعة...
              </span>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent)' }} className="num">
                {uploadProgress}%
              </span>
            </div>

            <div
              style={{
                width: '100%',
                height: '4px',
                background: 'var(--surface-3)',
                borderRadius: '999px',
                overflow: 'hidden',
                marginTop: '6px',
              }}
            >
              <div
                style={{
                  width: `${uploadProgress}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #38BDF8, #10B981)',
                  transition: 'width 0.25s ease',
                  borderRadius: '999px',
                }}
              />
            </div>
          </div>
        </div>
      ) : fileUrl ? (
        /* STATE 2: Completed / Uploaded Preview */
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, var(--surface) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '10px',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* Thumbnail or PDF Badge */}
            {isPdf ? (
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#ef4444',
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
                title="اضغط لمعاينة وتنزيل ملف PDF"
              >
                <span className="material-symbols-outlined text-[20px]">picture_as_pdf</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                style={{
                  position: 'relative',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  background: '#fff',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '40px',
                  height: '34px',
                  flexShrink: 0,
                }}
                className="hover:scale-105 group transition-transform"
                title="اضغط لتكبير ومعاينة الباركود"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={fileUrl}
                  alt="Barcode"
                  style={{
                    maxHeight: '30px',
                    maxWidth: '36px',
                    objectFit: 'contain',
                    display: 'block',
                  }}
                />
              </button>
            )}

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span className="material-symbols-outlined text-emerald-500 text-[16px]">verified</span>
                <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--ok)' }}>
                  {isPdf ? 'مستند PDF الوديعة معتمد ✓' : 'باركود / QR الشركة معتمد ✓'}
                </span>
              </div>
              <span style={{ fontSize: '10.5px', color: 'var(--text-3)' }}>
                {isPdf ? 'ملف PDF إلكتروني رسمي' : 'أُغلقت المحطة الرابعة'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              className="btn btn-ghost"
              style={{ fontSize: '11px', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--text)' }}
              title="معاينة وتكبير المستند"
            >
              <span className="material-symbols-outlined text-[14px]">
                {isPdf ? 'visibility' : 'fullscreen'}
              </span>
              <span>معاينة</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadFile}
              className="btn btn-ghost"
              style={{ fontSize: '11px', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--ok)' }}
              title="تحميل الملف إلى جهازك"
            >
              <span className="material-symbols-outlined text-[14px]">download</span>
              <span>تحميل</span>
            </button>

            {!disabled && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-ghost"
                style={{ fontSize: '11px', padding: '3px 8px', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '3px' }}
                title="تحديث أو استبدال الملف"
              >
                <span className="material-symbols-outlined text-[14px]">sync</span>
                <span>تغيير</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* STATE 3: Compact Drag & Drop Ready */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => {
            if (!disabled && !isUploading) {
              fileInputRef.current?.click()
            }
          }}
          style={{
            cursor: disabled ? 'not-allowed' : 'pointer',
            padding: '10px 14px',
            borderRadius: '10px',
            background: isDragging
              ? 'rgba(56, 189, 248, 0.12)'
              : 'var(--surface)',
            border: isDragging
              ? '1.5px dashed var(--accent)'
              : '1.5px dashed var(--line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            transition: 'all 0.2s ease',
          }}
          className="hover:border-[var(--accent)] transition-all group"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: isDragging ? 'var(--accent)' : 'var(--accent-soft)',
                color: isDragging ? '#fff' : 'var(--accent)',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>
                {isDragging ? 'أفلت الملف هنا' : 'رفع الباركود أو مستند الوديعة (صورة أو PDF)'}
              </div>
              <div style={{ fontSize: '10.5px', color: 'var(--text-3)' }}>
                المحطة 4 · يدعم PDF, PNG, JPG
              </div>
            </div>
          </div>

          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: 'var(--accent)',
              background: 'var(--surface-2)',
              padding: '4px 10px',
              borderRadius: '6px',
              border: '1px solid var(--line-soft)',
              whiteSpace: 'nowrap',
            }}
          >
            اختر ملفاً
          </span>
        </div>
      )}

      {/* Lightbox Modal for Zoom Image / PDF View with createPortal */}
      {lightboxOpen && fileUrl && mounted && createPortal(
        <div
          id="modal-root"
          className="on"
          style={{ position: 'fixed', inset: 0, zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div
            className="modal-veil"
            onClick={() => setLightboxOpen(false)}
            role="presentation"
            aria-hidden="true"
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(6px)' }}
          />
          <div
            style={{
              position: 'relative',
              zIndex: 10,
              background: 'var(--surface)',
              padding: '20px',
              borderRadius: '18px',
              maxWidth: isPdf ? '880px' : '620px',
              width: '92vw',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
              border: '1px solid var(--line)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--line-soft)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined text-emerald-500 text-[22px]">
                  {isPdf ? 'picture_as_pdf' : 'qr_code_2'}
                </span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--text)' }}>
                    {isPdf ? 'معاينة مستند PDF الوديعة' : 'معاينة باركود / QR الشركة الرسمي'}
                  </h3>
                  <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                    المحطة الرابعة لإطلاق الوديعة المصرفية
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLightboxOpen(false)}
                className="icon-btn"
                aria-label="إغلاق"
              >
                ✕
              </button>
            </div>

            <div
              style={{
                background: isPdf ? 'var(--surface-2)' : '#ffffff',
                padding: isPdf ? 0 : '16px',
                borderRadius: '12px',
                display: 'grid',
                placeItems: 'center',
                overflow: 'auto',
                maxHeight: '62vh',
                border: '1px solid var(--line-soft)',
              }}
            >
              {isPdf ? (
                <iframe
                  src={fileUrl}
                  style={{ width: '100%', height: '520px', borderRadius: '8px', border: 'none' }}
                  title="PDF Viewer"
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={fileUrl}
                  alt="Barcode Large"
                  style={{ maxHeight: '420px', maxWidth: '100%', objectFit: 'contain', display: 'block' }}
                />
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', paddingTop: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  onClick={handleDownloadFile}
                  className="btn btn-primary"
                  style={{ fontSize: '12px', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  <span className="material-symbols-outlined text-[16px]">download</span>
                  <span>تحميل الملف</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenInNewTab}
                  className="btn btn-ghost"
                  style={{ fontSize: '12px', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                  <span>فتح في نافذة جديدة</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setLightboxOpen(false)}
                className="btn btn-ghost"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Keyframe animation */}
      <style jsx global>{`
        @keyframes laserScanCompact {
          0% {
            top: 0%;
            opacity: 0.8;
          }
          100% {
            top: 100%;
            opacity: 0.8;
          }
        }
      `}</style>
    </div>
  )
}
