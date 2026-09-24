'use client'

import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { useModalBodyLock } from '@/lib/hooks/useModalBodyLock'

/* ============================================================
   1. GlassCard & Card Primitives
   ============================================================ */
export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  variant?: 'default' | 'subtle' | 'gradient' | 'interactive' | 'outline'
}

export function GlassCard({
  children,
  className,
  variant = 'default',
  ...props
}: GlassCardProps) {
  const variantStyles = {
    default: 'glass-card rounded-2xl p-6 border border-border-glass bg-surface/95 shadow-md',
    subtle: 'glass-card rounded-xl p-4 border border-border-glass/60 bg-surface-2/60 shadow-xs',
    gradient: 'glass-card rounded-2xl p-6 border border-border-glass bg-gradient-to-br from-surface to-surface-2 shadow-lg',
    interactive: 'glass-card rounded-2xl p-6 border border-border-glass bg-surface/95 shadow-md hover:-translate-y-1 hover:shadow-lg hover:border-primary/40 transition duration-300 cursor-pointer',
    outline: 'rounded-2xl p-6 border border-border bg-transparent',
  }

  return (
    <div className={cn(variantStyles[variant], className)} {...props}>
      {children}
    </div>
  )
}

export const Card = GlassCard

/* ============================================================
   2. Input — Standardized h-10 Form Control
   ============================================================ */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: string
  hint?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, hint, className, id, ...props }, ref) => {
    const inputId = id || (label ? `input-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined)

    return (
      <div className="flex flex-col gap-1.5 w-full text-right" dir="rtl">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold text-text-2 select-none">
            {label}
          </label>
        )}
        <div className="relative w-full">
          {icon && (
            <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-text-3 text-[18px] pointer-events-none select-none">
              {icon}
            </span>
          )}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              'flex h-10 w-full rounded-xl bg-surface-2/80 border text-text placeholder:text-text-3 text-sm font-medium transition duration-150',
              'border-border hover:border-text-3/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20',
              'disabled:cursor-not-allowed disabled:opacity-50',
              icon ? 'pr-11 pl-3.5' : 'px-3.5',
              error && 'border-destructive focus:border-destructive focus:ring-destructive/20',
              className
            )}
            {...props}
          />
        </div>
        {error ? (
          <span className="text-xs font-bold text-destructive animate-fade-in">{error}</span>
        ) : hint ? (
          <span className="text-[11px] text-text-3">{hint}</span>
        ) : null}
      </div>
    )
  }
)
Input.displayName = 'Input'

/* ============================================================
   3. Textarea — Standardized Form Control
   ============================================================ */
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, id, rows = 3, ...props }, ref) => {
    const textareaId = id || (label ? `textarea-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined)

    return (
      <div className="flex flex-col gap-1.5 w-full text-right" dir="rtl">
        {label && (
          <label htmlFor={textareaId} className="text-xs font-semibold text-text-2 select-none">
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          rows={rows}
          className={cn(
            'flex w-full rounded-xl bg-surface-2/80 border p-3 text-text placeholder:text-text-3 text-sm font-medium transition-all duration-150',
            'border-border hover:border-text-3/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20',
            'disabled:cursor-not-allowed disabled:opacity-50 resize-y min-h-[80px]',
            error && 'border-destructive focus:border-destructive focus:ring-destructive/20',
            className
          )}
          {...props}
        />
        {error ? (
          <span className="text-xs font-bold text-destructive">{error}</span>
        ) : hint ? (
          <span className="text-[11px] text-text-3">{hint}</span>
        ) : null}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'

/* ============================================================
   4. Select — Standardized Dropdown Control
   ============================================================ */
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, children, className, id, ...props }, ref) => {
    const selectId = id || (label ? `select-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined)

    return (
      <div className="flex flex-col gap-1.5 w-full text-right" dir="rtl">
        {label && (
          <label htmlFor={selectId} className="text-xs font-semibold text-text-2 select-none">
            {label}
          </label>
        )}
        <div className="relative w-full">
          <select
            id={selectId}
            ref={ref}
            className={cn(
              'flex h-10 w-full appearance-none rounded-xl bg-surface-2/80 border px-3.5 py-2 pl-9 text-text text-sm font-semibold transition duration-150 cursor-pointer',
              'border-border hover:border-text-3/50 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20',
              'disabled:cursor-not-allowed disabled:opacity-50',
              error && 'border-destructive focus:border-destructive focus:ring-destructive/20',
              className
            )}
            {...props}
          >
            {children}
          </select>
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-3 text-[18px] pointer-events-none select-none">
            expand_more
          </span>
        </div>
        {error ? (
          <span className="text-xs font-bold text-destructive">{error}</span>
        ) : hint ? (
          <span className="text-[11px] text-text-3">{hint}</span>
        ) : null}
      </div>
    )
  }
)
Select.displayName = 'Select'

/* ============================================================
   5. Button — Interactive High-Performance Button
   ============================================================ */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'destructive' | 'success'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  icon?: string
  loading?: boolean
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  className,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  const variantStyles = {
    primary: 'bg-primary text-white shadow-sm hover:bg-primary/90 hover:shadow active:scale-[0.98]',
    secondary: 'bg-surface-2 text-text border border-border hover:bg-surface-3 active:scale-[0.98]',
    outline: 'bg-transparent text-text border border-border hover:bg-surface-2 active:scale-[0.98]',
    ghost: 'bg-transparent text-text-2 hover:text-text hover:bg-surface-2 active:scale-[0.98]',
    danger: 'bg-destructive text-white shadow-sm hover:bg-destructive/90 hover:shadow active:scale-[0.98]',
    destructive: 'bg-destructive text-white shadow-sm hover:bg-destructive/90 hover:shadow active:scale-[0.98]',
    success: 'bg-success text-white shadow-sm hover:bg-success/90 hover:shadow active:scale-[0.98]',
  }

  const sizeStyles = {
    sm: 'h-8 px-3 text-xs rounded-lg gap-1.5',
    md: 'h-10 px-4 text-sm rounded-xl gap-2',
    lg: 'h-12 px-6 text-base rounded-xl gap-2.5',
    icon: 'h-10 w-10 p-0 rounded-xl justify-center',
  }

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-bold whitespace-nowrap transition duration-150 select-none cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1',
        'disabled:pointer-events-none disabled:opacity-50',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin flex-shrink-0" />
      ) : icon ? (
        <span className="material-symbols-outlined text-[18px] flex-shrink-0">{icon}</span>
      ) : null}
      {children && <span>{children}</span>}
    </button>
  )
}

/* ============================================================
   6. Badge — Unified Status & Meta Badge
   ============================================================ */
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'success' | 'warning' | 'danger' | 'destructive' | 'info' | 'neutral'
  children: React.ReactNode
  icon?: string
}

export function Badge({
  variant = 'neutral',
  children,
  icon,
  className,
  ...props
}: BadgeProps) {
  const variantStyles = {
    primary: 'bg-primary-soft text-primary border border-primary/25',
    secondary: 'bg-surface-3 text-text-2 border border-line-soft',
    outline: 'bg-transparent text-text-2 border border-border',
    success: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25',
    warning: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25',
    danger: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25',
    destructive: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25',
    info: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/25',
    neutral: 'bg-surface-2 text-text-3 border border-border-soft',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-bold whitespace-nowrap transition-colors duration-150 select-none',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {icon && <span className="material-symbols-outlined text-[14px]">{icon}</span>}
      <span>{children}</span>
    </span>
  )
}

/* ============================================================
   7. Modal / Dialog Primitives
   ============================================================ */
export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  className?: string
}

export function Modal({
  isOpen,
  onClose,
  children,
  size = 'md',
  className,
}: ModalProps) {
  const [mounted, setMounted] = React.useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useModalBodyLock(isOpen)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!mounted || !isOpen) return null

  const sizeStyles = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
    xl: 'max-w-5xl',
    full: 'max-w-[95vw] h-[92vh]',
  }

  return createPortal(
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose()
      }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in text-right"
      dir="rtl"
    >
      <div
        className={cn(
          'w-full bg-surface border border-border-glass rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto transition duration-200 animate-scale-in text-text',
          sizeStyles[size],
          className
        )}
      >
        {children}
      </div>
    </div>,
    document.body
  )
}

export function ModalHeader({
  title,
  subtitle,
  icon,
  onClose,
  children,
  className,
}: {
  title?: string
  subtitle?: string
  icon?: string
  onClose?: () => void
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'px-6 py-4 border-b border-border-soft flex items-center justify-between gap-4 bg-surface-2/40 flex-none',
        className
      )}
    >
      {children || (
        <div className="flex items-center gap-3 min-w-0">
          {icon && (
            <div className="w-9 h-9 rounded-xl bg-primary-soft text-primary flex items-center justify-center flex-none">
              <span className="material-symbols-outlined text-[20px]">{icon}</span>
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-base font-bold text-text truncate">{title}</h3>
            {subtitle && <p className="text-xs text-text-3 truncate mt-0.5">{subtitle}</p>}
          </div>
        </div>
      )}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="إغلاق"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-text-3 hover:text-text hover:bg-surface-3 transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      )}
    </div>
  )
}

export function ModalBody({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('p-6 overflow-y-auto max-h-[75vh] flex-1 flex flex-col gap-4', className)}>
      {children}
    </div>
  )
}

export function ModalFooter({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'px-6 py-4 border-t border-border-soft bg-surface-2/30 flex items-center justify-end gap-3 flex-none',
        className
      )}
    >
      {children}
    </div>
  )
}

/* ============================================================
   8. Skeleton — Smooth Placeholder Loader
   ============================================================ */
export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-xl bg-surface-3/80', className)}
      {...props}
    />
  )
}

/* ============================================================
   9. Empty State Utility
   ============================================================ */
export function EmptyState({
  icon = 'inbox',
  title = 'لا توجد بيانات',
  description,
  action,
  className,
}: {
  icon?: string
  title?: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-dashed border-border bg-surface-2/30 gap-3 my-4',
        className
      )}
      dir="rtl"
    >
      <div className="w-12 h-12 rounded-2xl bg-surface-3 text-text-3 flex items-center justify-center shadow-xs">
        <span className="material-symbols-outlined text-[24px]">{icon}</span>
      </div>
      <div className="flex flex-col gap-1 max-w-sm">
        <h4 className="text-sm font-bold text-text">{title}</h4>
        {description && <p className="text-xs text-text-3 leading-relaxed">{description}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
