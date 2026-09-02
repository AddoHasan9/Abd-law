'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import { Check, CheckCheck, ArrowLeft, Lock, Sparkles, CheckCircle2, ShieldCheck, User } from 'lucide-react'

export interface WorkflowStepItem {
  id: string
  step_order: number
  label: string
  state: 'done' | 'doing' | 'wait'
  owner_kind?: string | null
  step_key?: string
  done_at?: string | null
}

interface Props {
  steps: WorkflowStepItem[]
  onCompleteStep: (stepId: string, stepOrder: number) => Promise<void>
  onRevertStep: (stepId: string, stepOrder: number) => Promise<void>
  onTransferToDeposit?: () => void
  isEstablished?: boolean
}

export default function WorkflowTimelineMotion({
  steps,
  onCompleteStep,
  onRevertStep,
  onTransferToDeposit,
  isEstablished = false,
}: Props) {
  const [animatingStepId, setAnimatingStepId] = useState<string | null>(null)

  const doneCount = steps.filter(s => s.state === 'done').length
  const totalSteps = steps.length || 8
  const pct = Math.round((doneCount / totalSteps) * 100)
  const isAllDone = steps.length > 0 && steps.every(s => s.state === 'done')

  const formatArabicDate = (dateStr?: string | null) => {
    if (!dateStr) return ''
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return ''
      return new Intl.DateTimeFormat('ar-IQ', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d)
    } catch {
      return ''
    }
  }

  const handleComplete = async (stepId: string, stepOrder: number) => {
    setAnimatingStepId(stepId)

    // Trigger luxury executive confetti if completing the final step
    if (stepOrder >= totalSteps) {
      try {
        confetti({
          particleCount: 85,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10B981', '#F59E0B', '#3B82F6', '#6366F1', '#34D399'],
          ticks: 250,
          gravity: 1.1,
          scalar: 0.95,
        })
      } catch {}
    }

    await onCompleteStep(stepId, stepOrder)
    setAnimatingStepId(null)
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* 1. Header with Dynamic Progress Track (Light & Dark Adaptive) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[var(--surface)] border border-[var(--line-soft)] shadow-sm flex flex-col gap-3 relative overflow-hidden">
        
        {/* Header Title & Live Counter Capsule */}
        <div className="flex items-center justify-between flex-wrap gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black shrink-0 shadow-xs">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="text-xs font-bold text-[var(--text-3)]">مسار تأسيس الشركة المعتمد</div>
              <h3 className="text-base sm:text-lg font-black text-[var(--text)] font-display m-0 leading-tight">
                مخطط المراحل الإجرائية المتتابعة
              </h3>
            </div>
          </div>

          {/* Progress Capsule */}
          <div className="flex items-center gap-2.5 bg-[var(--surface-2)] px-3.5 py-1.5 rounded-full border border-[var(--line-soft)] shadow-xs">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 num">
              {pct}% مكتمل
            </span>
            <span className="text-xs text-[var(--text-3)] font-semibold num border-s border-[var(--line-soft)] ps-2">
              ({doneCount} من {totalSteps} مراحل)
            </span>
          </div>
        </div>

        {/* Animated Progress Bar */}
        <div className="w-full h-2.5 rounded-full bg-[var(--surface-2)] overflow-hidden p-0.5 border border-[var(--line-soft)] relative">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-emerald-400 shadow-sm relative overflow-hidden"
            initial={{ width: '0%' }}
            animate={{ width: `${Math.max(pct, 3)}%` }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              animate={{ x: ['-100%', '200%'] }}
              transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
            />
          </motion.div>
        </div>
      </div>

      {/* 2. Step Cards List (Strict RTL: Right Side Info, Left Side Action) */}
      <div className="flex flex-col gap-3 py-1">
        {steps.map((step, idx) => {
          const isDone = step.state === 'done'
          const isDoing = step.state === 'doing'
          const isWait = step.state === 'wait'

          return (
            <motion.div
              key={step.id}
              id={`wf-step-${step.step_order}`}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: idx * 0.03 }}
              className={`rounded-2xl transition-all duration-300 flex items-center justify-between flex-wrap sm:flex-nowrap gap-4 p-4 sm:p-5 relative ${
                isDoing
                  ? 'bg-amber-500/[0.05] dark:bg-amber-950/20 border-2 border-amber-500 shadow-[0_0_22px_rgba(245,158,11,0.22)] ring-2 ring-amber-500/20'
                  : isDone
                  ? 'bg-[var(--surface)] border border-emerald-500/40 shadow-xs hover:border-emerald-500/60'
                  : 'bg-[var(--surface-2)]/60 border border-[var(--line-soft)] opacity-70 hover:opacity-90'
              }`}
            >
              {/* 1. RIGHT SIDE (اليمين): Step Number / Spinner + Title + Badges + Subtitle */}
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                {/* Circular Number / Spinner Medallion */}
                <div className="relative w-11 h-11 flex items-center justify-center shrink-0">
                  {isDoing ? (
                    <>
                      {/* Rotating Amber Arc Spinner */}
                      <svg
                        className="absolute inset-0 w-full h-full animate-spin [animation-duration:2.8s]"
                        viewBox="0 0 44 44"
                      >
                        <circle
                          cx="22"
                          cy="22"
                          r="18"
                          fill="none"
                          stroke="rgba(245, 158, 11, 0.25)"
                          strokeWidth="3"
                        />
                        <circle
                          cx="22"
                          cy="22"
                          r="18"
                          fill="none"
                          stroke="#F59E0B"
                          strokeWidth="3"
                          strokeDasharray="56 56"
                          strokeLinecap="round"
                        />
                      </svg>
                      {/* Center Static Upright Number */}
                      <span className="relative z-10 font-black text-sm text-amber-600 dark:text-amber-400 num">
                        {step.step_order}
                      </span>
                    </>
                  ) : isDone ? (
                    <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/40 ring-2 ring-emerald-500/30">
                      <Check className="w-5 h-5 stroke-[3]" />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-[var(--surface-2)] border border-[var(--line-soft)] text-[var(--text-3)] flex items-center justify-center font-black text-xs num shadow-xs">
                      {step.step_order}
                    </div>
                  )}
                </div>

                {/* Details (Title, Status Badge, Owner) */}
                <div className="flex flex-col items-start text-right min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap mb-1">
                    {/* Step Title */}
                    <h4
                      className={`font-black text-base sm:text-lg leading-tight ${
                        isDoing
                          ? 'text-amber-600 dark:text-amber-400 font-display'
                          : isDone
                          ? 'text-[var(--text)] font-extrabold'
                          : 'text-[var(--text-2)] font-bold'
                      }`}
                    >
                      {step.label}
                    </h4>

                    {/* Status Pill Badge */}
                    {isDoing && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-black bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/35 shadow-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                        <span>جاري التنفيذ</span>
                      </span>
                    )}

                    {isDone && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>مكتملة بنجاح</span>
                      </span>
                    )}
                  </div>

                  {/* Subtitle / Owner & Timestamp */}
                  <div className="flex items-center gap-2 text-xs text-[var(--text-3)] font-medium">
                    <span className="flex items-center gap-1 text-[11.5px]">
                      <User className="w-3.5 h-3.5 text-[var(--text-3)]" />
                      <span>المسؤول: {step.owner_kind || 'المدير المختص'}</span>
                    </span>
                    {isDone && step.done_at && (
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold num border-s border-[var(--line-soft)] ps-2">
                        {formatArabicDate(step.done_at)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. LEFT SIDE (اليسار): Action Control (Emerald Double Checkmark / Revert / Lock) */}
              <div className="flex items-center gap-2 shrink-0">
                {isDoing ? (
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => handleComplete(step.id, step.step_order)}
                    disabled={animatingStepId === step.id}
                    className="px-5 py-2.5 rounded-full font-black text-xs sm:text-sm bg-[#10B981] hover:bg-[#059669] active:bg-[#047857] text-white shadow-[0_0_18px_rgba(16,185,129,0.45)] hover:shadow-[0_0_26px_rgba(16,185,129,0.65)] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <span>إكمال الخطوة</span>
                    <CheckCheck className="w-5 h-5 stroke-[2.5]" />
                  </motion.button>
                ) : isDone ? (
                  <button
                    type="button"
                    onClick={() => onRevertStep(step.id, step.step_order)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 border border-slate-300 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-500/30 transition-all cursor-pointer flex items-center gap-1.5"
                    title="إعادة هذه الخطوة للتنفيذ"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>تراجع</span>
                  </button>
                ) : (
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl flex items-center gap-1.5 border border-slate-200 dark:border-slate-700/60">
                    <Lock className="w-3.5 h-3.5" />
                    <span>مغلقة</span>
                  </span>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* 3. Milestone Completion Banner */}
      {isAllDone && !isEstablished && onTransferToDeposit && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 240, damping: 20 }}
          className="pt-2"
        >
          <button
            type="button"
            onClick={onTransferToDeposit}
            className="w-full py-4 px-6 rounded-2xl font-black text-sm bg-gradient-to-r from-emerald-500 via-amber-500 to-emerald-600 hover:brightness-105 active:scale-98 text-white shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2.5 transition-all cursor-pointer border border-white/20"
          >
            <ShieldCheck className="w-5 h-5" />
            <span>اكتمل التأسيس — إدخال بيانات الشهادة والتحويل لمسار إطلاق الوديعة ←</span>
          </button>
        </motion.div>
      )}
    </div>
  )
}


