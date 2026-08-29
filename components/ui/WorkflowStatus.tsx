'use client'

import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import {
  WORKFLOW_STATUS_LIST,
  getWorkflowStatusConfig,
  WorkflowStatusKey,
  WorkflowStatusConfig,
} from '@/lib/workflow-status'
import { updateWorkflowStatusAction } from '@/app/(app)/commercial/workflow-actions'

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

  const toggleDropdown = () => {
    if (readOnly || isUpdating) return
    if (!isOpen) {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect()
        const spaceBelow = window.innerHeight - rect.bottom
        const openUpward = spaceBelow < 310 && rect.top > 310

        setDropdownCoords({
          top: openUpward ? undefined : rect.bottom + 6,
          bottom: openUpward ? window.innerHeight - rect.top + 6 : undefined,
          right: window.innerWidth - rect.right,
          openUpward,
        })
      }
      setIsOpen(true)
    } else {
      setIsOpen(false)
    }
  }

  const triggerToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage(null)
    }, 3500)
  }

  const performStatusUpdate = async (
    targetKey: WorkflowStatusKey,
    reasonsData?: string[] | string | null,
    notesData?: string | null
  ) => {
    setIsUpdating(true)
    const fromStatus = currentStatusKey
    const newConfig = getWorkflowStatusConfig(targetKey)

    // Optimistic local update
    setCurrentStatusKey(targetKey)
    if (onStatusChange) {
      onStatusChange(targetKey, newConfig)
    }

    if (entityId) {
      const res = await updateWorkflowStatusAction({
        entityId,
        entityType,
        companyId,
        fromStatus,
        toStatus: targetKey,
        actorName,
        reasons: reasonsData,
        notes: notesData,
      })

      if (!res.success) {
        // Rollback
        setCurrentStatusKey(fromStatus)
        triggerToast('تعذّر تحديث حالة سير العمل')
      } else {
        triggerToast('تم تحديث حالة سير العمل بنجاح')
        router.refresh()
      }
    } else {
      triggerToast('تم تحديث حالة سير العمل بنجاح')
    }

    setIsUpdating(false)
    setPendingTargetKey(null)
    resetModalFields()
  }

  const resetModalFields = () => {
    setModalNotes('')
    setModalReasonInput('')
    setSelectedMultiReasons([])
    setSelectedGovReason('')
    setModalError(null)
  }

  const handleOptionClick = (targetKey: WorkflowStatusKey) => {
    setIsOpen(false)
    if (targetKey === currentStatusKey) return

    // Check if target status requires a modal per Business Rules
    if (
      targetKey === 'completed' ||
      targetKey === 'closed' ||
      targetKey === 'cancelled' ||
      targetKey === 'waiting_client' ||
      targetKey === 'waiting_government'
    ) {
      resetModalFields()
      setPendingTargetKey(targetKey)
    } else {
      performStatusUpdate(targetKey)
    }
  }

  const handleModalSubmit = () => {
    if (!pendingTargetKey) return
    setModalError(null)

    if (pendingTargetKey === 'closed') {
      if (!modalReasonInput.trim()) {
        setModalError('يرجى إدخال سبب الإغلاق الإلزامي.')
        return
      }
      performStatusUpdate(pendingTargetKey, modalReasonInput.trim(), modalNotes.trim() || null)
    } else if (pendingTargetKey === 'cancelled') {
      if (!modalReasonInput.trim()) {
        setModalError('يرجى إدخال سبب الإلغاء الإلزامي.')
        return
      }
      performStatusUpdate(pendingTargetKey, modalReasonInput.trim(), modalNotes.trim() || null)
    } else if (pendingTargetKey === 'waiting_client') {
      const finalReasons = [...selectedMultiReasons]
      if (finalReasons.includes('أخرى') && modalReasonInput.trim()) {
        const idx = finalReasons.indexOf('أخرى')
        finalReasons[idx] = `أخرى: ${modalReasonInput.trim()}`
      }
      if (finalReasons.length === 0 && !modalReasonInput.trim()) {
        setModalError('يرجى اختيار سبب واحد على الأقل للانتظار.')
        return
      }
      performStatusUpdate(pendingTargetKey, finalReasons, modalNotes.trim() || null)
    } else if (pendingTargetKey === 'waiting_government') {
      let finalReason = selectedGovReason
      if (finalReason === 'جهة أخرى' && modalReasonInput.trim()) {
        finalReason = `جهة أخرى: ${modalReasonInput.trim()}`
      }
      if (!finalReason) {
        setModalError('يرجى تحديد الجهة أو إدخال السبب.')
        return
      }
      performStatusUpdate(pendingTargetKey, finalReason, modalNotes.trim() || null)
    } else if (pendingTargetKey === 'completed') {
      performStatusUpdate(pendingTargetKey, null, modalNotes.trim() || null)
    }
  }

  const displayConfig = getWorkflowStatusConfig(currentStatusKey)

  // Size variations
  const sizeStyles: Record<'sm' | 'md' | 'lg', React.CSSProperties> = {
    sm: { padding: '3px 10px', fontSize: '11.5px', height: '26px' },
    md: { padding: '5px 14px', fontSize: '12.5px', height: '32px' },
    lg: { padding: '7px 18px', fontSize: '13.5px', height: '38px' },
  }

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-block',
        ...style,
      }}
      className={`workflow-status-container ${className}`}
    >
      {/* Status Badge Button (NO ICONS) */}
      <button
        ref={buttonRef}
        type="button"
        disabled={readOnly || isUpdating}
        onClick={toggleDropdown}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: displayConfig.bg,
          border: `1.5px solid ${displayConfig.border}`,
          color: displayConfig.text,
          fontWeight: 600,
          borderRadius: '9999px',
          cursor: readOnly ? 'default' : 'pointer',
          outline: 'none',
          whiteSpace: 'nowrap',
          transition: 'all 150ms ease-in-out',
          opacity: isUpdating ? 0.7 : 1,
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          ...sizeStyles[size],
        }}
        className="workflow-status-badge"
      >
        <span>{displayConfig.label}</span>
      </button>

      {/* Modern Portal Dropdown Menu */}
      {isOpen && dropdownCoords && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            top: dropdownCoords.top !== undefined ? `${dropdownCoords.top}px` : 'auto',
            bottom: dropdownCoords.bottom !== undefined ? `${dropdownCoords.bottom}px` : 'auto',
            right: `${dropdownCoords.right}px`,
            zIndex: 999999,
            minWidth: '220px',
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            boxShadow: '0 12px 30px -4px rgba(0, 0, 0, 0.18), 0 4px 12px rgba(0, 0, 0, 0.08)',
            padding: '6px',
            animation: 'wfFadeScale 180ms cubic-bezier(0.16, 1, 0.3, 1) forwards',
          }}
          className="workflow-status-dropdown"
          onClick={e => e.stopPropagation()}
        >
          <div
            style={{
              padding: '6px 10px',
              fontSize: '11px',
              fontWeight: 700,
              color: '#9ca3af',
              borderBottom: '1px solid #f3f4f6',
              marginBottom: '4px',
            }}
          >
            حالة سير العمل
          </div>
          {WORKFLOW_STATUS_LIST.map(cfg => {
            const isSelected = cfg.key === currentStatusKey
            return (
              <div
                key={cfg.key}
                onClick={() => handleOptionClick(cfg.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '12.5px',
                  fontWeight: isSelected ? 700 : 500,
                  backgroundColor: isSelected ? `${cfg.bg}` : 'transparent',
                  color: isSelected ? cfg.text : '#374151',
                  border: isSelected ? `1px solid ${cfg.border}` : '1px solid transparent',
                  marginBottom: '2px',
                  transition: 'background-color 150ms ease-in-out',
                }}
                onMouseEnter={e => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = '#f9fafb'
                  }
                }}
                onMouseLeave={e => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }
                }}
              >
                <span>{cfg.label}</span>
                {isSelected && (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: cfg.text,
                      padding: '1px 6px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(255,255,255,0.7)',
                    }}
                  >
                    محددة
                  </span>
                )}
              </div>
            )
          })}
        </div>,
        document.body
      )}

      {/* Success Toast */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '24px',
            zIndex: 9999,
            backgroundColor: '#10b981',
            color: '#ffffff',
            padding: '10px 18px',
            borderRadius: '10px',
            fontWeight: 600,
            fontSize: '13px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.15)',
            animation: 'wfFadeScale 200ms ease-out forwards',
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Interactive Business Rule Modal */}
      {pendingTargetKey && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            animation: 'wfFadeScale 150ms ease-out forwards',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '460px',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#111827' }}>
                تغيير حالة سير العمل: {getWorkflowStatusConfig(pendingTargetKey).label}
              </h3>
              <button
                type="button"
                onClick={() => setPendingTargetKey(null)}
                style={{
                  border: 'none',
                  background: 'none',
                  fontSize: '18px',
                  color: '#9ca3af',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Error Alert */}
            {modalError && (
              <div
                style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fca5a5',
                  color: '#dc2626',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  marginBottom: '14px',
                }}
              >
                {modalError}
              </div>
            )}

            {/* 1. Closed: Mandatory Closing Reason */}
            {pendingTargetKey === 'closed' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                  سبب الإغلاق <span style={{ color: '#dc2626' }}>* (إلزامي)</span>
                </label>
                <textarea
                  rows={3}
                  className="input"
                  placeholder="أدخل سبب إغلاق المعاملة أو الملف..."
                  value={modalReasonInput}
                  onChange={e => setModalReasonInput(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px' }}
                />
              </div>
            )}

            {/* 2. Cancelled: Mandatory Cancellation Reason */}
            {pendingTargetKey === 'cancelled' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                  سبب الإلغاء <span style={{ color: '#dc2626' }}>* (إلزامي)</span>
                </label>
                <textarea
                  rows={3}
                  className="input"
                  placeholder="أدخل سبب إلغاء المعاملة بالتفصيل..."
                  value={modalReasonInput}
                  onChange={e => setModalReasonInput(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px' }}
                />
              </div>
            )}

            {/* 3. Waiting for Client: Multi-Select Reasons */}
            {pendingTargetKey === 'waiting_client' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                  أسباب الانتظار من العميل (اختر سبب أو أكثر):
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {WAITING_CLIENT_REASONS.map(reason => {
                    const isChecked = selectedMultiReasons.includes(reason)
                    return (
                      <label
                        key={reason}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '13px',
                          cursor: 'pointer',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          backgroundColor: isChecked ? '#f3e8ff' : '#f9fafb',
                        }}
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
                        />
                        <span>{reason}</span>
                      </label>
                    )
                  })}
                </div>
                {selectedMultiReasons.includes('أخرى') && (
                  <input
                    type="text"
                    className="input"
                    placeholder="حدد السبب الآخر..."
                    value={modalReasonInput}
                    onChange={e => setModalReasonInput(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px' }}
                  />
                )}
              </div>
            )}

            {/* 4. Waiting for Government: Select Reason */}
            {pendingTargetKey === 'waiting_government' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                  الجهة الحكومية المسببة للانتظار:
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {WAITING_GOV_REASONS.map(reason => {
                    const isSelected = selectedGovReason === reason
                    return (
                      <label
                        key={reason}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '13px',
                          cursor: 'pointer',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          backgroundColor: isSelected ? '#fdf8f6' : '#f9fafb',
                        }}
                      >
                        <input
                          type="radio"
                          name="govReason"
                          checked={isSelected}
                          onChange={() => setSelectedGovReason(reason)}
                        />
                        <span>{reason}</span>
                      </label>
                    )
                  })}
                </div>
                {selectedGovReason === 'جهة أخرى' && (
                  <input
                    type="text"
                    className="input"
                    placeholder="حدد اسم الجهة الأخرى..."
                    value={modalReasonInput}
                    onChange={e => setModalReasonInput(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px' }}
                  />
                )}
              </div>
            )}

            {/* 5. Completed: Optional Notes */}
            {pendingTargetKey === 'completed' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                  ملاحظات الإنجاز <span style={{ color: '#6b7280', fontWeight: 400 }}>(اختياري)</span>
                </label>
                <textarea
                  rows={3}
                  className="input"
                  placeholder="أدخل أي ملاحظات حول إنجاز هذا الملف..."
                  value={modalNotes}
                  onChange={e => setModalNotes(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '13px' }}
                />
              </div>
            )}

            {/* Additional Notes Field for Non-Completed where required */}
            {(pendingTargetKey === 'closed' || pendingTargetKey === 'cancelled' || pendingTargetKey === 'waiting_client' || pendingTargetKey === 'waiting_government') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280' }}>
                  ملاحظات إضافية (اختياري)
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="ملاحظة إضافية للحرص والتدقيق..."
                  value={modalNotes}
                  onChange={e => setModalNotes(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '12.5px' }}
                />
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => setPendingTargetKey(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  background: '#ffffff',
                  color: '#374151',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleModalSubmit}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#2563eb',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                تأكيد التحديث
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global CSS for Animations */}
      <style jsx global>{`
        @keyframes wfFadeScale {
          from {
            opacity: 0;
            transform: scale(0.96);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  )
}
