'use client'

import { useCallback, useState } from 'react'
import { useDropzone, DropzoneOptions } from 'react-dropzone'
import { UploadCloud, FileText, CheckCircle2, X } from 'lucide-react'

interface Props extends Omit<DropzoneOptions, 'onDrop'> {
  onFilesSelected?: (files: File[]) => void
  label?: string
  description?: string
  acceptTypesLabel?: string
  className?: string
}

export function FileDropzone({
  onFilesSelected,
  label = 'اسحب الملفات وأفلتها هنا، أو انقر للاختيار',
  description = 'يدعم ملفات PDF، الصور والمستندات الرسمية',
  acceptTypesLabel = 'PNG, JPG, PDF (بحد أقصى 10MB)',
  className = '',
  maxFiles = 5,
  ...dropzoneOptions
}: Props) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setSelectedFiles(acceptedFiles)
      if (onFilesSelected) {
        onFilesSelected(acceptedFiles)
      }
    },
    [onFilesSelected]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles,
    ...dropzoneOptions,
  })

  const removeFile = (index: number) => {
    const updated = selectedFiles.filter((_, i) => i !== index)
    setSelectedFiles(updated)
    if (onFilesSelected) {
      onFilesSelected(updated)
    }
  }

  return (
    <div className={`space-y-3 ${className}`} dir="rtl">
      <div
        {...getRootProps()}
        className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 backdrop-blur-xl select-none text-center ${
          isDragActive
            ? 'border-cyan-400 bg-cyan-500/10 shadow-lg shadow-cyan-500/10 scale-[1.01]'
            : 'border-slate-300 dark:border-white/15 bg-white/40 dark:bg-slate-900/40 hover:bg-white/60 dark:hover:bg-slate-800/50 hover:border-blue-400 dark:hover:border-cyan-400'
        }`}
      >
        <input {...getInputProps()} />
        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 dark:bg-cyan-500/15 border border-blue-500/20 dark:border-cyan-500/30 flex items-center justify-center text-blue-600 dark:text-cyan-400 mb-3 shadow-xs">
          <UploadCloud className="w-6 h-6 animate-pulse" />
        </div>
        <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
          {label}
        </p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
          {description}
        </p>
        <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/10">
          {acceptTypesLabel}
        </span>
      </div>

      {/* Selected Files Preview List */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          {selectedFiles.map((file, idx) => (
            <div
              key={`${file.name}-${idx}`}
              className="flex items-center justify-between p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 backdrop-blur-md shadow-xs text-right"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-1.5 rounded-lg bg-blue-500/10 dark:bg-cyan-500/15 text-blue-600 dark:text-cyan-400 shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[220px]">
                    {file.name}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  جاهز
                </span>
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation()
                    removeFile(idx)
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                  aria-label="حذف الملف"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
