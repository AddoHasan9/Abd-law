'use client'

import React, { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import {
  WORKFLOW_STATUS_LIST,
  getWorkflowStatusConfig,
  type WorkflowStatusKey,
  type WorkflowStatusConfig,
} from '@/lib/workflow-status'
import { updateWorkflowStatusAction } from '@/app/(app)/commercial/workflow-actions'
import { cn } from '@/lib/utils'

export interface WorkflowStatusProps {
  status: string | null | undefined
  entityId?: string
  entityType?: 'company' | 'transaction'
  companyId?: string | null
  readOnly?: boolean
  actorName?: string
  size?: 'sm' | 'md' | 'lg'
  onStatusChange?: (newStatus: WorkflowStatusKey, statusConfig: WorkflowStatusConfig) => void
  style?: React.CSSProperties
  className?: string
}

const WAITING_CLIENT_REASONS = [
  'وثائق ناقصة',
  'مطلوب توقيع',
  'بانتظار الدفع',
  'موافقة العميل',
  'أخرى',
]

const WAITING_GOV_REASONS = [
  'مراجعة الوزارة',
  'الهيئة العامة للضرائب',
  'غرفة التجارة',
  'الأمانة / البلدية',
  'البنك',
  'جهة أخرى',
]

export function WorkflowStatus({
  status,
  entityId,
  entityType = 'transaction',
  companyId,
  readOnly = false,
  actorName = 'محمد أحمد',
  size = 'md',
  onStatusChange,
  style,
  className = '',
}: WorkflowStatusProps) {
  const router = useRouter()
  const currentConfig = getWorkflowStatusConfig(status)
  const [currentStatusKey, setCurrentStatusKey] = useState<WorkflowStatusKey>(currentConfig.key)
  const [isOpen, setIsOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [dropdownCoords, setDropdownCoords] = useState<{
    top?: number
    bottom?: number
    right: number
    openUpward: boolean
  } | null>(null)

  // Modal State for Business Rules
  const [pendingTargetKey, setPendingTargetKey] = useState<WorkflowStatusKey | null>(null)
  const [modalNotes, setModalNotes] = useState('')
  const [modalReasonInput, setModalReasonInput] = useState('')
  const [selectedMultiReasons, setSelectedMultiReasons] = useState<string[]>([])
  const [selectedGovReason, setSelectedGovReason] = useState<string>('')
  const [modalError, setModalError] = useState<string | null>(null)

  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setCurrentStatusKey(getWorkflowStatusConfig(status).key)
  }, [status])

  // Close dropdown on click outside or scroll
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false)
      }
    }

    function handleScrollOrResize() {
      if (isOpen) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      window.addEventListener('scroll', handleScrollOrResize, true)
      window.addEventListener('resize', handleScrollOrResize)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
    }
  }, [isOpen])

  // Toast Auto-Dismiss
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3500)
      return () => clearTimeout(timer)
    }
  }, [toastMessage])

  function calculateDropdownPosition() {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    const viewportHeight = window.innerHeight
    const viewportWidth = window.innerWidth
    const estimatedMenuHeight = 340

    const spaceBelow = viewportHeight - rect.bottom
    const openUpward = spaceBelow < estimatedMenuHeight && rect.top > estimatedMenuHeight

    const rightFromViewport = viewportWidth - rect.right

    if (openUpward) {
      setDropdownCoords({
        bottom: viewportHeight - rect.top + 6,
        right: Math.max(12, rightFromViewport),
        openUpward: true,
      })
    } else {
      setDropdownCoords({
        top: rect.bottom + 6,
        right: Math.max(12, rightFromViewport),
        openUpward: false,
      })
    }
  }

  function toggleDropdown(e: React.MouseEvent) {
    e.stopPropagation()
    if (readOnly || isUpdating) return
    if (!isOpen) {
      calculateDropdownPosition()
      setIsOpen(true)
    } else {
      setIsOpen(false)
    }
  }

  async function performStatusUpdate(
    targetKey: WorkflowStatusKey,
    reasonOrReasons?: string[] | string | null,
    notes?: string | null
  ) {
    setIsUpdating(true)
    const oldKey = currentStatusKey
    const targetConfig = getWorkflowStatusConfig(targetKey)

    // Optimistic UI update
    setCurrentStatusKey(targetKey)
    setIsOpen(false)
    setPendingTargetKey(null)

    if (onStatusChange) {
      onStatusChange(targetKey, targetConfig)
    }

    if (!entityId) {
      setIsUpdating(false)
      setToastMessage(`تم تغيير الحالة إلى: ${targetConfig.label}`)
      return
    }

    try {
      const result = await updateWorkflowStatusAction({
        entityId,
        entityType,
        companyId,
        fromStatus: oldKey,
        toStatus: targetKey,
        actorName,
        notes: notes || null,
        reasons: reasonOrReasons || null,
      })

      if (result.success) {
        setToastMessage(`تم التحديث بنجاح إلى: ${targetConfig.label}`)
        router.refresh()
      } else {
        // Rollback on failure
        setCurrentStatusKey(oldKey)
        toast.error(result.error || 'فشل تحديث الحالة في الخادم')
      }
    } catch {
      setCurrentStatusKey(oldKey)
      toast.error('حدث خطأ أثناء الاتصال بالخادم')
    } finally {
      setIsUpdating(false)
    }
  }

  function handleOptionClick(targetKey: WorkflowStatusKey) {
    if (targetKey === currentStatusKey) {
      setIsOpen(false)
      return
    }

    // Modal requirement check
    if (
      targetKey === 'closed' ||
      targetKey === 'cancelled' ||
      targetKey === 'waiting_client' ||
      targetKey === 'waiting_government' ||
      targetKey === 'completed'
    ) {
      setIsOpen(false)
      setModalNotes('')
      setModalReasonInput('')
      setSelectedMultiReasons([])
      setSelectedGovReason('')
      setModalError(null)
      setPendingTargetKey(targetKey)
      return
    }

    // Direct transition for others (new, in_progress, under_review)
    performStatusUpdate(targetKey)
  }

  function handleModalSubmit() {
    if (!pendingTargetKey) return
    setModalError(null)

    if (pendingTargetKey === 'closed') {
      if (!modalReasonInput.trim()) {
        setModalError('يرجى كتابة سبب إغلاق المعاملة.')
        return
      }
      performStatusUpdate(pendingTargetKey, modalReasonInput.trim(), modalNotes.trim() || null)
    } else if (pendingTargetKey === 'cancelled') {
      if (!modalReasonInput.trim()) {
        setModalError('يرجى كتابة سبب الإلغاء.')
        return
      }
      performStatusUpdate(pendingTargetKey, modalReasonInput.trim(), modalNotes.trim() || null)
    } else if (pendingTargetKey === 'waiting_client') {
      if (selectedMultiReasons.length === 0) {
        setModalError('يرجى تحديد سبب واحد على الأقل من أسباب الانتظار.')
        return
      }
      const finalReasons = [...selectedMultiReasons]
      if (selectedMultiReasons.includes('أخرى') && modalReasonInput.trim()) {
        finalReasons.push(`أخرى: ${modalReasonInput.trim()}`)
      }
      performStatusUpdate(pendingTargetKey, finalReasons, modalNotes.trim() || null)
    } else if (pendingTargetKey === 'waiting_government') {
      if (!selectedGovReason) {
        setModalError('يرجى تحديد الجهة الحكومية.')
        return
      }
      let finalReason = selectedGovReason
      if (selectedGovReason === 'جهة أخرى') {
        if (!modalReasonInput.trim()) {
          setModalError('يرجى تحديد اسم الجهة الأخرى.')
          return
        }
        finalReason = `جهة أخرى: ${modalReasonInput.trim()}`
      }
      performStatusUpdate(pendingTargetKey, finalReason, modalNotes.trim() || null)
    } else if (pendingTargetKey === 'completed') {
      performStatusUpdate(pendingTargetKey, null, modalNotes.trim() || null)
    }
  }

  const displayConfig = getWorkflowStatusConfig(currentStatusKey)

  const sizeClasses = {
    sm: 'h-6 px-2.5 text-[11.5px]',
    md: 'h-8 px-3.5 text-xs',
    lg: 'h-9 px-4 text-[13.5px]',
  }

  return (
    <div className={cn('relative inline-block text-right', className)} style={style} dir="rtl">
      {/* Status Badge Trigger */}
      <button
        ref={buttonRef}
        type="button"
        disabled={readOnly || isUpdating}
        onClick={toggleDropdown}
        className={cn(
          'inline-flex items-center justify-center font-bold rounded-full whitespace-nowrap transition duration-150 select-none shadow-xs border',
          sizeClasses[size],
          readOnly ? 'cursor-default' : 'cursor-pointer hover:opacity-90 active:scale-[0.98]',
          isUpdating && 'opacity-60 pointer-events-none'
        )}
        style={{
          backgroundColor: displayConfig.bg,
          borderColor: displayConfig.border,
          color: displayConfig.text,
        }}
      >
        <span>{displayConfig.label}</span>
      </button>

      {/* Modern Portal Dropdown Menu */}
      {isOpen && dropdownCoords && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[999999] min-w-[220px] bg-surface border border-border-glass rounded-xl shadow-2xl p-1.5 animate-scale-in text-right divide-y divide-border-soft"
          style={{
            top: dropdownCoords.top !== undefined ? `${dropdownCoords.top}px` : 'auto',
            bottom: dropdownCoords.bottom !== undefined ? `${dropdownCoords.bottom}px` : 'auto',
            right: `${dropdownCoords.right}px`,
          }}
          onClick={e => e.stopPropagation()}
          dir="rtl"
        >
          <div className="px-2.5 py-1 text-[11px] font-bold text-text-3 select-none">
            حالة سير العمل
          </div>
          <div className="pt-1 flex flex-col gap-0.5">
            {WORKFLOW_STATUS_LIST.map(cfg => {
              const isSelected = cfg.key === currentStatusKey
              return (
                <button
                  key={cfg.key}
                  type="button"
                  onClick={() => handleOptionClick(cfg.key)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer text-right',
                    isSelected
                      ? 'shadow-xs border'
                      : 'hover:bg-surface-2 text-text-2 border border-transparent'
                  )}
                  style={
                    isSelected
                      ? {
                          backgroundColor: cfg.bg,
                          color: cfg.text,
                          borderColor: cfg.border,
                        }
                      : undefined
                  }
                >
                  <span>{cfg.label}</span>
                  {isSelected && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface/80 text-text font-bold">
                      محددة
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>,
        document.body
      )}

      {/* Success Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-[99999] bg-success text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg animate-fade-in flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Interactive Business Rule Modal */}
      {pendingTargetKey && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[99999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in text-right"
          dir="rtl"
        >
          <div className="bg-surface border border-border-glass rounded-2xl w-full max-w-md p-6 shadow-2xl flex flex-col gap-4 animate-scale-in text-text">
            <div className="flex items-center justify-between border-b border-border-soft pb-3">
              <h3 className="text-sm font-bold text-text">
                تغيير حالة سير العمل: {getWorkflowStatusConfig(pendingTargetKey).label}
              </h3>
              <button
                type="button"
                onClick={() => setPendingTargetKey(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-text-3 hover:text-text hover:bg-surface-2 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Error Alert */}
            {modalError && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs font-bold animate-shake">
                {modalError}
              </div>
            )}

            {/* 1. Closed: Mandatory Closing Reason */}
            {pendingTargetKey === 'closed' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-2">
                  سبب الإغلاق <span className="text-destructive">* (إلزامي)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="أدخل سبب إغلاق المعاملة أو الملف..."
                  value={modalReasonInput}
                  onChange={e => setModalReasonInput(e.target.value)}
                  className="flex w-full rounded-xl bg-surface-2 border border-border p-3 text-text placeholder:text-text-3 text-xs font-medium focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            )}

            {/* 2. Cancelled: Mandatory Cancellation Reason */}
            {pendingTargetKey === 'cancelled' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-2">
                  سبب الإلغاء <span className="text-destructive">* (إلزامي)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="أدخل سبب إلغاء المعاملة بالتفصيل..."
                  value={modalReasonInput}
                  onChange={e => setModalReasonInput(e.target.value)}
                  className="flex w-full rounded-xl bg-surface-2 border border-border p-3 text-text placeholder:text-text-3 text-xs font-medium focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            )}

            {/* 3. Waiting for Client: Multi-Select Reasons */}
            {pendingTargetKey === 'waiting_client' && (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-text-2">
                  أسباب الانتظار من العميل (اختر سبب أو أكثر):
                </label>
                <div className="flex flex-col gap-1.5">
                  {WAITING_CLIENT_REASONS.map(reason => {
                    const isChecked = selectedMultiReasons.includes(reason)
                    return (
                      <label
                        key={reason}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer border transition-colors',
                          isChecked
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300 font-bold'
                            : 'bg-surface-2 border-border-soft text-text-2 hover:bg-surface-3'
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedMultiReasons([...selectedMultiReasons, reason])
                            } else {
                              setSelectedMultiReasons(selectedMultiReasons.filter(r => r !== reason))
                            }
                          }}
                          className="accent-primary"
                        />
                        <span>{reason}</span>
                      </label>
                    )
                  })}
                </div>
                {selectedMultiReasons.includes('أخرى') && (
                  <input
                    type="text"
                    placeholder="حدد السبب الآخر..."
                    value={modalReasonInput}
                    onChange={e => setModalReasonInput(e.target.value)}
                    className="flex h-9 w-full rounded-xl bg-surface-2 border border-border px-3 text-xs font-medium text-text placeholder:text-text-3 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 mt-1"
                  />
                )}
              </div>
            )}

            {/* 4. Waiting for Government: Select Reason */}
            {pendingTargetKey === 'waiting_government' && (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-text-2">
                  الجهة الحكومية المسببة للانتظار:
                </label>
                <div className="flex flex-col gap-1.5">
                  {WAITING_GOV_REASONS.map(reason => {
                    const isSelected = selectedGovReason === reason
                    return (
                      <label
                        key={reason}
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer border transition-colors',
                          isSelected
                            ? 'bg-orange-500/10 border-orange-500/30 text-orange-700 dark:text-orange-300 font-bold'
                            : 'bg-surface-2 border-border-soft text-text-2 hover:bg-surface-3'
                        )}
                      >
                        <input
                          type="radio"
                          name="govReason"
                          checked={isSelected}
                          onChange={() => setSelectedGovReason(reason)}
                          className="accent-primary"
                        />
                        <span>{reason}</span>
                      </label>
                    )
                  })}
                </div>
                {selectedGovReason === 'جهة أخرى' && (
                  <input
                    type="text"
                    placeholder="حدد اسم الجهة الأخرى..."
                    value={modalReasonInput}
                    onChange={e => setModalReasonInput(e.target.value)}
                    className="flex h-9 w-full rounded-xl bg-surface-2 border border-border px-3 text-xs font-medium text-text placeholder:text-text-3 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 mt-1"
                  />
                )}
              </div>
            )}

            {/* 5. Completed: Optional Notes */}
            {pendingTargetKey === 'completed' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-2">
                  ملاحظات الإنجاز <span className="text-text-3 font-normal">(اختياري)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="أدخل أي ملاحظات حول إنجاز هذا الملف..."
                  value={modalNotes}
                  onChange={e => setModalNotes(e.target.value)}
                  className="flex w-full rounded-xl bg-surface-2 border border-border p-3 text-text placeholder:text-text-3 text-xs font-medium focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            )}

            {/* Additional Notes for non-completed */}
            {(pendingTargetKey === 'closed' ||
              pendingTargetKey === 'cancelled' ||
              pendingTargetKey === 'waiting_client' ||
              pendingTargetKey === 'waiting_government') && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-3">ملاحظات إضافية (اختياري)</label>
                <input
                  type="text"
                  placeholder="ملاحظة إضافية للحرص والتدقيق..."
                  value={modalNotes}
                  onChange={e => setModalNotes(e.target.value)}
                  className="flex h-9 w-full rounded-xl bg-surface-2 border border-border px-3 text-xs font-medium text-text placeholder:text-text-3 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-soft">
              <button
                type="button"
                onClick={() => setPendingTargetKey(null)}
                className="h-9 px-4 rounded-xl text-xs font-bold text-text-2 hover:bg-surface-2 transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleModalSubmit}
                className="h-9 px-5 rounded-xl bg-primary text-white text-xs font-bold shadow-sm hover:bg-primary/90 transition cursor-pointer"
              >
                تأكيد التحديث
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
