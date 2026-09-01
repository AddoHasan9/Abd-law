'use client'

import React, { useState } from 'react'
import { WORKFLOW } from '@/lib/constants'
import type { WorkflowStep, WfState } from '@/types/database'
import { advanceCompanyStepAction } from '@/app/(app)/commercial/companies/actions'
import { useDragScroll } from '@/lib/hooks/useDragScroll'

export interface StepItem {
  id: string
  stepNumber: number
  title: string
  owner: string
  status: 'completed' | 'current' | 'waiting' | 'late'
  subLabel?: string
  daysLate?: number
  icon?: string
  emoji?: string
  doneAt?: string | null
}

interface Props {
  taskTitle?: string
  taskCode?: string
  taskCategory?: string
  companyId?: string
  isEstablished?: boolean
  rawSteps?: WorkflowStep[]
  canEdit?: boolean
  onStepStateChanged?: () => void
  onStepClick?: (step: StepItem) => void
}

const STEP_METAS: Record<string, { icon: string; emoji: string }> = {
  pay_fee: { icon: 'payments', emoji: '💳' },
  bank_letter: { icon: 'account_balance', emoji: '📑' },
  officer_review: { icon: 'badge', emoji: '🏛️' },
  dept_head: { icon: 'verified_user', emoji: '⚖️' },
  gm_sign: { icon: 'draw', emoji: '✍️' },
  issue_cert: { icon: 'qr_code', emoji: '📜' },
  online_submission: { icon: 'rocket_launch', emoji: '🚀' },
  chamber_approval: { icon: 'balance', emoji: '⚖️' },
  union_approval: { icon: 'description', emoji: '📋' },
  company_file: { icon: 'folder_shared', emoji: '📁' },
  specialist_officer: { icon: 'badge', emoji: '🏛️' },
  sign_decision: { icon: 'draw', emoji: '✍️' },
}

export default function WorkflowStepperDiagram({
  taskTitle = 'تأسيس شركة تجارية',
  taskCode = 'TJ-0007',
  taskCategory = 'مهام تجارية - تسجيل شركات',
  companyId,
  isEstablished = false,
  rawSteps = [],
  canEdit = true,
  onStepStateChanged,
  onStepClick,
}: Props) {
  const [updatingStepId, setUpdatingStepId] = useState<string | null>(null)
  const [isPaused, setIsPaused] = useState<boolean>(false)
  const trackScrollRef = useDragScroll<HTMLDivElement>({ speed: 1.3 })

  // Map system workflow steps
  const steps: StepItem[] = WORKFLOW.map((w, idx) => {
    const dbStep = rawSteps.find(s => s.step_key === w.id || s.step_order === idx + 1)
    const isDone = isEstablished || dbStep?.state === 'done'
    const isDoing = !isEstablished && (dbStep?.state === 'doing' || (!dbStep && idx === 0 && !isEstablished))

    let status: StepItem['status'] = 'waiting'
    let subLabel = 'في الانتظار'

    if (isDone) {
      status = 'completed'
      subLabel = 'مكتملة ✓'
    } else if (isDoing) {
      status = 'current'
      subLabel = 'قيد التنفيذ'
    }

    const meta = STEP_METAS[w.id] || { icon: 'task_alt', emoji: '📋' }

    return {
      id: dbStep?.id || w.id,
      stepNumber: idx + 1,
      title: w.label,
      owner: w.owner,
      status,
      subLabel,
      icon: meta.icon,
      emoji: meta.emoji,
      doneAt: dbStep?.done_at,
    }
  })

  const completedCount = isEstablished ? steps.length : steps.filter(s => s.status === 'completed').length
  const totalCount = steps.length
  const progressPercent = isEstablished ? 100 : Math.round((completedCount / totalCount) * 100)
  const isFullyDone = isEstablished || progressPercent === 100

  // Interactive toggle handler
  const handleToggle = async (step: StepItem) => {
    if (!canEdit || updatingStepId) return

    onStepClick?.(step)
    const currentState: WfState = step.status === 'completed' ? 'done' : step.status === 'current' ? 'doing' : 'wait'
    setUpdatingStepId(step.id)

    try {
      await advanceCompanyStepAction(step.id, currentState)
      onStepStateChanged?.()
    } catch (e) {
      console.error('Failed to toggle workflow step:', e)
    } finally {
      setUpdatingStepId(null)
    }
  }

  return (
    <div className="flex flex-col gap-6 w-full bg-[var(--surface)] border border-[var(--line-soft)] rounded-[28px] p-6 sm:p-8 shadow-sm relative overflow-hidden text-right transition-colors" dir="rtl">
      
      {/* Background Blueprint Subtle Grid */}
      <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.04] bg-[radial-gradient(var(--text)_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

      {/* Top Workflow Header */}
      <div className="flex flex-col-reverse md:flex-row items-start md:items-center justify-between gap-4 pb-5 border-b border-[var(--line-soft)] relative z-10">
        
        {/* Left Action & Progress Summary */}
        <div className="flex items-center gap-4">
          {/* Status Capsule Button */}
          {isFullyDone ? (
            <div className="px-5 py-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-black text-sm shadow-md shadow-emerald-500/20 border border-emerald-400/30 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">verified</span>
              <span>مكتملة ومؤسسة ✓</span>
            </div>
          ) : isPaused ? (
            <div className="px-5 py-2 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 text-slate-950 font-black text-sm shadow-md shadow-amber-500/20 border border-amber-400/30 flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">pause_circle</span>
              <span>متوقفة مؤقتاً</span>
            </div>
          ) : (
            <div className="px-5 py-2 rounded-2xl bg-gradient-to-r from-blue-600 to-[#38BDF8] text-white font-black text-sm shadow-md shadow-blue-500/20 border border-white/20 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
              <span>قيد التنفيذ</span>
            </div>
          )}

          {/* Progress Circular Widget */}
          <div className="flex items-center gap-2.5 pr-2">
            <div className="text-right">
              <div className="text-xs font-bold text-[var(--text-3)]">التقدم</div>
              <div className="text-xs font-black text-[var(--text)] num">{completedCount}/{totalCount}</div>
            </div>

            <div className="relative w-12 h-12 rounded-full bg-[var(--surface-2)] border border-[var(--line-soft)] flex items-center justify-center shadow-inner flex-none">
              <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-[var(--line-soft)] stroke-current"
                  strokeWidth="3.5"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={`stroke-current transition-all duration-1000 ease-out ${
                    isFullyDone ? 'text-emerald-500' : 'text-[#38BDF8]'
                  }`}
                  strokeDasharray={`${progressPercent}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className={`absolute text-[11px] font-black num ${
                isFullyDone ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#0284c7] dark:text-[#38BDF8]'
              }`}>
                {progressPercent}%
              </span>
            </div>
          </div>
        </div>

        {/* Right Title and Code Pill */}
        <div className="flex items-center gap-3.5">
          <div className="flex flex-col items-start md:items-end">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-[#38BDF8]/15 text-[#0284c7] dark:text-[#38BDF8] border border-[#38BDF8]/30 num tracking-wider">
                {taskCode}
              </span>
              <h2 className="text-lg sm:text-xl font-black text-[var(--text)] tracking-tight">
                {taskTitle || 'مخطط سير العمل'}
              </h2>
            </div>
            <p className="text-xs text-[var(--text-3)] font-medium mt-0.5">{taskCategory}</p>
          </div>

          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 flex-none">
            <span className="material-symbols-outlined text-[26px]">assignment</span>
          </div>
        </div>
      </div>

      {/* Middle Pause / Notice Banner */}
      <div
        onClick={() => canEdit && setIsPaused(prev => !prev)}
        className={`flex items-center justify-between p-3.5 sm:p-4 rounded-2xl border transition-all duration-300 relative z-10 select-none ${
          canEdit ? 'cursor-pointer hover:brightness-105' : ''
        } ${
          isPaused
            ? 'bg-amber-500/15 border-amber-500/50 shadow-sm text-amber-700 dark:text-amber-300'
            : 'bg-[var(--surface-2)] border-[var(--line-soft)] hover:border-amber-500/40 text-[var(--text-2)]'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-none font-bold">
            <span className="material-symbols-outlined text-[20px]">
              {isPaused ? 'play_arrow' : 'pause'}
            </span>
          </div>
          <div>
            <div className="text-sm font-black text-amber-600 dark:text-amber-400 flex items-center gap-2">
              <span>{isPaused ? 'المهمة متوقفة مؤقتاً' : 'إيقاف المهمة مؤقتاً'}</span>
              <span className="text-[10.5px] px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/30 text-amber-700 dark:text-amber-300 font-bold">
                {isPaused ? 'مفعلة' : 'اختياري'}
              </span>
            </div>
            <p className="text-xs text-[var(--text-3)] mt-0.5">
              في حال تأخر العميل بإرسال أوليات أو مستندات رسمية، يمكنك تجميد مسار العمل مؤقتاً.
            </p>
          </div>
        </div>

        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-none transition-colors ${
          isPaused ? 'bg-amber-500 text-slate-950 shadow-md' : 'bg-[var(--surface-3)] border border-[var(--line-soft)] text-[var(--text-3)]'
        }`}>
          <span className="material-symbols-outlined text-[18px]">
            {isPaused ? 'pause' : 'tune'}
          </span>
        </div>
      </div>

      {/* Stage Group Header */}
      <div className="flex items-center justify-between pt-1 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[var(--surface-2)] border border-[var(--line-soft)] flex items-center justify-center text-[var(--text-2)]">
            <span className="material-symbols-outlined text-[18px]">person</span>
          </div>
          <span className="text-sm font-black text-[var(--text)]">المدير المختص</span>
        </div>
        <span className="text-xs font-bold px-3 py-1 rounded-full bg-[var(--surface-2)] border border-[var(--line-soft)] text-[var(--text-3)] num">
          {steps.length} خطوات
        </span>
      </div>

      {/* Step Cards Horizontal Track (Drag Scrollable) */}
      <div ref={trackScrollRef} className="flex items-center gap-4 overflow-x-auto pb-4 pt-2 scrollbar-none select-none relative z-10">
        {steps.map((step, idx) => {
          const isCompleted = step.status === 'completed'
          const isCurrent = step.status === 'current'
          const isUpdating = updatingStepId === step.id

          return (
            <React.Fragment key={step.id}>
              {/* Step Card */}
              <div
                onClick={() => handleToggle(step)}
                className={`flex flex-col justify-between p-4 rounded-2xl min-w-[160px] max-w-[175px] min-h-[160px] transition-all duration-300 cursor-pointer relative select-none flex-none group ${
                  isUpdating
                    ? 'opacity-60 scale-95'
                    : isCompleted
                    ? 'bg-emerald-500/10 border-2 border-emerald-500/60 dark:border-emerald-500 shadow-sm hover:-translate-y-1 hover:border-emerald-500'
                    : isCurrent
                    ? 'bg-blue-500/10 border-2 border-[#38BDF8] shadow-sm -translate-y-1'
                    : 'bg-[var(--surface-2)] border border-[var(--line-soft)] hover:border-[var(--line)] opacity-85 hover:opacity-100 hover:-translate-y-0.5'
                }`}
                title={canEdit ? 'انقر لتحديث حالة الخطوة' : undefined}
              >
                {/* Top Header inside Card: Emoji/Icon */}
                <div className="flex items-center justify-end w-full">
                  <span className="text-lg filter drop-shadow">{step.emoji}</span>
                </div>

                {/* Center Circle Badge */}
                <div className="flex items-center justify-center my-1">
                  {isCompleted ? (
                    <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-500/30 group-hover:scale-105 transition-transform">
                      <span className="material-symbols-outlined text-[24px] font-black">check</span>
                    </div>
                  ) : (
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center font-black text-sm transition-transform ${
                      isCurrent
                        ? 'bg-[#38BDF8] text-slate-950 font-black scale-105 shadow-md shadow-blue-500/30'
                        : 'bg-[var(--surface-3)] border border-[var(--line-soft)] text-[var(--text-3)]'
                    }`}>
                      <span className="num">{step.stepNumber}</span>
                    </div>
                  )}
                </div>

                {/* Step Title & Step Order */}
                <div className="text-center my-1">
                  <div className={`text-xs font-black line-clamp-2 leading-snug transition-colors ${
                    isCompleted ? 'text-[var(--text)] font-extrabold' : 'text-[var(--text)]'
                  }`}>
                    {step.title}
                  </div>
                  <div className="text-[10px] text-[var(--text-3)] font-bold mt-1 num">
                    الخطوة {step.stepNumber}
                  </div>
                </div>

                {/* Bottom Status Pill */}
                <div className="mt-auto pt-2 flex items-center justify-center">
                  {isCompleted ? (
                    <span className="w-full text-center text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 py-1 rounded-lg border border-emerald-500/30 flex items-center justify-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>مكتملة ✓</span>
                    </span>
                  ) : isCurrent ? (
                    <span className="w-full text-center text-[10px] font-extrabold text-sky-600 dark:text-[#38BDF8] bg-blue-500/15 py-1 rounded-lg border border-blue-500/30 flex items-center justify-center gap-1 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8]" />
                      <span>قيد التنفيذ</span>
                    </span>
                  ) : (
                    <span className="w-full text-center text-[10px] font-bold text-[var(--text-3)] bg-[var(--surface-3)] py-1 rounded-lg border border-[var(--line-soft)] flex items-center justify-center gap-1">
                      <span className="material-symbols-outlined text-[11px]">schedule</span>
                      <span>في الانتظار</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Connecting Line */}
              {idx < steps.length - 1 && (
                <div
                  className={`w-8 h-1 flex-none rounded-full transition-all duration-500 ${
                    isCompleted
                      ? 'bg-emerald-500'
                      : 'bg-[var(--line-soft)]'
                  }`}
                />
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}
