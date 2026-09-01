'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import confetti from 'canvas-confetti'
import { Check, ArrowLeft, Lock, Play, Sparkles } from 'lucide-react'

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

    // Trigger soft executive confetti if completing the final step (Step 8)
    if (stepOrder >= totalSteps) {
      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#10B981', '#34D399', '#D4AF37', '#3B82F6', '#6366F1'],
          ticks: 200,
          gravity: 1.1,
          scalar: 0.9,
        })
      } catch {}
    }

    await onCompleteStep(stepId, stepOrder)
    setAnimatingStepId(null)
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* 1. Header Metrics & Animated Progress Bar */}
      <div className="p-4 rounded-2xl bg-[var(--surface-2)]/80 border border-[var(--line-soft)] backdrop-blur-md shadow-xs flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="text-xs font-bold text-[var(--text-3)]">مسار تأسيس الشركة</div>
              <h3 className="text-sm font-black text-[var(--text)] m-0">
                مخطط المراحل الإجرائية المتتابعة
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-[var(--surface)] px-3 py-1 rounded-full border border-[var(--line-soft)] shadow-xs">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 num">
              {pct}% مكتمل
            </span>
            <span className="text-[11px] text-[var(--text-3)] font-semibold num">
              ({doneCount} من {totalSteps})
            </span>
          </div>
        </div>

        {/* Animated Progress Track */}
        <div className="w-full h-2.5 rounded-full bg-[var(--surface-3)] overflow-hidden p-0.5 border border-[var(--line-soft)]/60">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 shadow-sm"
            initial={{ width: '0%' }}
            animate={{ width: `${Math.max(pct, 4)}%` }}
            transition={{ type: 'spring', stiffness: 120, damping: 18 }}
          />
        </div>
      </div>

      {/* 2. Timeline Step Track with Staggered Motion */}
      <div className="relative flex flex-col gap-1 pr-1 pl-1 py-1">
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
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.04 }}
              className="relative flex items-start gap-4 group"
            >
              {/* Left Column: Interactive Circle Node + Animated Laser Connector */}
              <div className="relative flex flex-col items-center flex-none">
                {/* Circle Node */}
                <div className="relative z-10">
                  <AnimatePresence mode="wait">
                    {isDone ? (
                      <motion.div
                        key="done-node"
                        initial={{ scale: 0.5, rotate: -20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0.5 }}
                        transition={{ type: 'spring', stiffness: 450, damping: 20 }}
                        className="relative w-10 h-10 flex items-center justify-center cursor-default"
                      >
                        <div className="absolute inset-0 rounded-full bg-emerald-500/25 blur-[6px] animate-pulse" />
                        <div className="relative w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 text-white flex items-center justify-center shadow-lg shadow-emerald-500/35 ring-2 ring-emerald-400/40">
                          <Check className="w-5 h-5 stroke-[3] drop-shadow-xs" />
                        </div>
                      </motion.div>
                    ) : isDoing ? (
                      <motion.div
                        key="doing-node"
                        initial={{ scale: 0.8 }}
                        animate={{ scale: [1, 1.06, 1] }}
                        transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                        className="relative w-10 h-10 flex items-center justify-center"
                      >
                        <div className="absolute inset-0 rounded-full bg-amber-400/35 blur-[8px] animate-ping" />
                        <div className="relative w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-300 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/40 ring-4 ring-amber-400/30">
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="wait-node"
                        className="relative w-10 h-10 flex items-center justify-center opacity-65 group-hover:opacity-100 transition-opacity"
                      >
                        <div className="w-8 h-8 rounded-full bg-[var(--surface-3)] border-2 border-[var(--line-soft)] text-[var(--text-3)] flex items-center justify-center font-black text-xs num shadow-xs">
                          {step.step_order}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Connecting Laser Beam Line */}
                {!isLast && (
                  <div className="relative w-full flex justify-center my-1">
                    <div
                      className={`transition-all duration-500 ${
                        isDone && nextStep?.state === 'doing'
                          ? 'w-1 rounded-full bg-gradient-to-b from-emerald-500 via-teal-400 to-amber-500 shadow-sm shadow-emerald-500/30'
                          : isDone && nextStep?.state === 'done'
                          ? 'w-0.5 bg-emerald-500/70'
                          : isDoing
                          ? 'w-0.5 bg-gradient-to-b from-amber-500/80 to-[var(--line-soft)]'
                          : 'w-0.5 bg-[var(--line-soft)]/60'
                      }`}
                      style={{ height: '42px' }}
                    >
                      {/* Active Traveling Light Droplet */}
                      {isDone && nextStep?.state === 'doing' && (
                        <motion.div
                          className="w-2.5 h-3 rounded-full bg-amber-300 shadow-[0_0_10px_#F59E0B] mx-auto -translate-x-[2.5px]"
                          animate={{ y: [0, 36, 0], opacity: [0.3, 1, 0.3] }}
                          transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Step Card Box */}
              <motion.div
                layout
                className={`flex items-center justify-between gap-3 min-w-0 flex-1 p-3.5 rounded-2xl transition-all duration-300 ${
                  isDoing
                    ? 'bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border-2 border-amber-500/50 shadow-md ring-2 ring-amber-500/20'
                    : isDone
                    ? 'bg-[var(--surface-2)]/70 hover:bg-emerald-500/[0.04] border border-emerald-500/25 hover:border-emerald-500/40 shadow-xs'
                    : 'bg-[var(--surface-2)]/30 border border-[var(--line-soft)]/50 opacity-60 hover:opacity-80'
                }`}
              >
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-extrabold text-[var(--text-3)] num">
                      المرحلة {step.step_order}
                    </span>
                    <h4
                      className={`font-black text-sm leading-snug transition-colors ${
                        isDoing
                          ? 'text-amber-600 dark:text-amber-400 text-[14.5px]'
                          : isDone
                          ? 'text-[var(--text)] font-extrabold'
                          : 'text-[var(--text-2)]'
                      }`}
                    >
                      {step.label}
                    </h4>
                  </div>

                  {/* Subtext & Timestamps */}
                  {isDone ? (
                    <div className="inline-flex items-center gap-1.5 mt-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      <span className="material-symbols-outlined text-[14px]">check_circle</span>
                      <span>{formatArabicDate(step.done_at) || 'مكتملة بنجاح ✓'}</span>
                    </div>
                  ) : isDoing ? (
                    <div className="inline-flex items-center gap-1.5 mt-1 text-[11px] font-extrabold text-amber-600 dark:text-amber-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                      <span>الخطوة الجارية حالياً — بانتظار الإنجاز</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1 mt-1 text-[11px] font-medium text-[var(--text-3)]">
                      <Lock className="w-3 h-3 text-[var(--text-3)]" />
                      <span>في الانتظار (تُفتح تلقائياً بعد إكمال السابقة)</span>
                    </div>
                  )}
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center gap-2 flex-none">
                  {isDoing ? (
                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.04 }}
                      whileTap={{ scale: 0.94 }}
                      onClick={() => handleComplete(step.id, step.step_order)}
                      disabled={animatingStepId === step.id}
                      className="px-4 py-2 rounded-xl font-black text-xs bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:scale-95 text-white shadow-md shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <span>إكمال الخطوة</span>
                      <Check className="w-4 h-4 stroke-[3]" />
                    </motion.button>
                  ) : isDone ? (
                    <button
                      type="button"
                      onClick={() => onRevertStep(step.id, step.step_order)}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold text-[var(--text-3)] hover:text-rose-500 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all cursor-pointer flex items-center gap-1"
                      title="إعادة هذه الخطوة للتنفيذ وتجميد الخطوات اللاحقة"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>تراجع</span>
                    </button>
                  ) : (
                    <span className="text-[11px] font-bold text-[var(--text-3)] opacity-60 bg-[var(--surface-3)] px-2.5 py-1 rounded-lg flex items-center gap-1">
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

      {/* 3. Bottom Milestone Completion Card */}
      {isAllDone && !isEstablished && onTransferToDeposit && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="pt-2"
        >
          <button
            type="button"
            onClick={onTransferToDeposit}
            className="w-full py-3.5 px-6 rounded-2xl font-black text-sm bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-700 active:scale-98 text-white shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>اكتمل التأسيس — إدخال الشهادة والتحويل لإطلاق الوديعة ←</span>
          </button>
        </motion.div>
      )}
    </div>
  )
}
