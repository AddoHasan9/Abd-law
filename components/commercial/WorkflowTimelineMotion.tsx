'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { Check, ArrowLeft, Lock, Play, Sparkles, CheckCircle2, Clock, ShieldCheck } from 'lucide-react'

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
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10B981', '#3B82F6', '#6366F1', '#F59E0B', '#34D399'],
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
    <div className="flex flex-col gap-5 w-full">
      {/* 1. Executive Frosted Header with Dynamic Progress Track */}
      <div className="glass-card p-5 sm:p-6 rounded-[26px] bg-[var(--surface-glass)] backdrop-blur-[36px] border border-[var(--border)] shadow-xs flex flex-col gap-4 relative overflow-hidden">
        
        {/* Header Title & Live Counter Capsule */}
        <div className="flex items-center justify-between flex-wrap gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[var(--accent-soft)] border border-[var(--accent)]/20 text-[var(--accent)] flex items-center justify-center font-black shrink-0 shadow-xs">
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
          <div className="flex items-center gap-2.5 bg-[var(--surface-2)] px-4 py-1.5 rounded-full border border-[var(--line-soft)] shadow-xs">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 num">
              {pct}% مكتمل
            </span>
            <span className="text-xs text-[var(--text-3)] font-semibold num border-r border-[var(--line-soft)] pr-2">
              ({doneCount} من {totalSteps} مراحل)
            </span>
          </div>
        </div>

        {/* Shimmering Animated Progress Bar */}
        <div className="w-full h-3 rounded-full bg-[var(--surface-3)] overflow-hidden p-0.5 border border-[var(--line-soft)] relative">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-[#3B82F6] to-emerald-400 shadow-sm relative overflow-hidden"
            initial={{ width: '0%' }}
            animate={{ width: `${Math.max(pct, 3)}%` }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          >
            {/* Shimmer Light Reflection */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              animate={{ x: ['-100%', '200%'] }}
              transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
            />
          </motion.div>
        </div>
      </div>

      {/* 2. Connected Liquid Glass Pipeline Timeline */}
      <div className="relative flex flex-col gap-3 py-1">
        {steps.map((step, idx) => {
          const isDone = step.state === 'done'
          const isDoing = step.state === 'doing'
          const isWait = step.state === 'wait'
          const isLast = idx === totalSteps - 1
          const nextStep = steps[idx + 1]

          return (
            <motion.div
              key={step.id}
              id={`wf-step-${step.step_order}`}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: idx * 0.03 }}
              className="relative flex items-stretch gap-3.5 group"
            >
              {/* Vertical Conduit Spine Node (Right Side) */}
              <div className="relative flex flex-col items-center flex-none w-11">
                {/* Node Symbol */}
                <div className="relative z-10 my-auto">
                  <AnimatePresence mode="wait">
                    {isDone ? (
                      <motion.div
                        key="done-node"
                        initial={{ scale: 0.6 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0.6 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                        className="relative w-10 h-10 flex items-center justify-center"
                      >
                        <div className="w-9 h-9 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/30 ring-2 ring-emerald-500/20">
                          <Check className="w-5 h-5 stroke-[3]" />
                        </div>
                      </motion.div>
                    ) : isDoing ? (
                      <motion.div
                        key="doing-node"
                        initial={{ scale: 0.7 }}
                        animate={{ scale: 1 }}
                        className="relative w-10 h-10 flex items-center justify-center"
                      >
                        <div className="absolute inset-0 rounded-2xl bg-blue-500/30 blur-[8px] animate-pulse" />
                        <div className="relative w-9 h-9 rounded-2xl bg-[#3B82F6] text-white flex items-center justify-center shadow-lg shadow-blue-500/40 ring-4 ring-blue-500/20">
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        </div>
                      </motion.div>
                    ) : (
                      <div className="w-9 h-9 rounded-2xl bg-[var(--surface-2)] border border-[var(--line-soft)] text-[var(--text-3)] flex items-center justify-center font-black text-xs num shadow-xs">
                        {step.step_order}
                      </div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Connecting Vertical Track Pipe */}
                {!isLast && (
                  <div
                    className={`w-0.5 grow transition-colors duration-500 my-1 ${
                      isDone && nextStep?.state === 'done'
                        ? 'bg-emerald-500/70'
                        : isDone && nextStep?.state === 'doing'
                        ? 'bg-gradient-to-b from-emerald-500 to-[#3B82F6]'
                        : 'bg-[var(--line-soft)]/70'
                    }`}
                  />
                )}
              </div>

              {/* Integrated Step Glass Card (Left Content Area) */}
              <motion.div
                layout
                className={`flex-1 p-4 sm:p-4.5 rounded-[22px] transition-all duration-300 flex items-center justify-between flex-wrap sm:flex-nowrap gap-3 ${
                  isDoing
                    ? 'glass-card bg-white/90 dark:bg-[#161D2B]/90 border-2 border-[#3B82F6] dark:border-[#3B82F6]/90 shadow-[0_10px_30px_rgba(59,130,246,0.12)] ring-4 ring-blue-500/10'
                    : isDone
                    ? 'glass-card bg-[var(--surface-glass)]/90 border border-emerald-500/25 hover:border-emerald-500/40 shadow-xs'
                    : 'bg-[var(--surface-2)]/40 border border-[var(--line-soft)] opacity-70 hover:opacity-90'
                }`}
              >
                {/* Step Info */}
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span
                      className={`text-[11px] font-black px-2 py-0.5 rounded-md num ${
                        isDoing
                          ? 'bg-blue-500/15 text-[#3B82F6]'
                          : isDone
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : 'bg-[var(--surface-3)] text-[var(--text-3)]'
                      }`}
                    >
                      المرحلة {step.step_order}
                    </span>
                    <h4
                      className={`font-black text-sm sm:text-base leading-snug ${
                        isDoing
                          ? 'text-[var(--text)] font-display text-[15px]'
                          : isDone
                          ? 'text-[var(--text)] font-extrabold'
                          : 'text-[var(--text-2)] font-bold'
                      }`}
                    >
                      {step.label}
                    </h4>
                  </div>

                  {/* Status Indicator / Timestamps */}
                  {isDone ? (
                    <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{formatArabicDate(step.done_at) || 'مكتملة بنجاح'}</span>
                    </div>
                  ) : isDoing ? (
                    <div className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-[#3B82F6] mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                      <span>الخطوة الجارية حالياً — بانتظار الإنجاز</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--text-3)] mt-0.5">
                      <Lock className="w-3 h-3" />
                      <span>في الانتظار (تُفتح تلقائياً بعد إكمال السابقة)</span>
                    </div>
                  )}
                </div>

                {/* Action Controls */}
                <div className="flex items-center gap-2 shrink-0">
                  {isDoing ? (
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => handleComplete(step.id, step.step_order)}
                      disabled={animatingStepId === step.id}
                      className="px-5 py-2.5 rounded-xl font-black text-xs bg-[#10B981] hover:bg-emerald-600 active:bg-emerald-700 text-white shadow-md shadow-emerald-500/25 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <span>إكمال الخطوة</span>
                      <Check className="w-4 h-4 stroke-[3]" />
                    </motion.button>
                  ) : isDone ? (
                    <button
                      type="button"
                      onClick={() => onRevertStep(step.id, step.step_order)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-[var(--text-3)] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 border border-[var(--line-soft)] hover:border-rose-500/20 transition-all cursor-pointer flex items-center gap-1.5"
                      title="إعادة هذه الخطوة للتنفيذ"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>تراجع</span>
                    </button>
                  ) : (
                    <span className="text-[11px] font-bold text-[var(--text-3)] bg-[var(--surface-3)] px-3 py-1.5 rounded-xl flex items-center gap-1 border border-[var(--line-soft)]">
                      <Lock className="w-3 h-3" />
                      <span>مغلقة</span>
                    </span>
                  )}
                </div>
              </motion.div>
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
            className="w-full py-4 px-6 rounded-2xl font-black text-sm bg-gradient-to-r from-emerald-500 via-[#3B82F6] to-emerald-600 hover:brightness-105 active:scale-98 text-white shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2.5 transition-all cursor-pointer border border-white/20"
          >
            <ShieldCheck className="w-5 h-5" />
            <span>اكتمل التأسيس — إدخال بيانات الشهادة والتحويل لمسار إطلاق الوديعة ←</span>
          </button>
        </motion.div>
      )}
    </div>
  )
}

