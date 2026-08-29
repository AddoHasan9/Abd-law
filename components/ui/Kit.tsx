'use client'

import React from 'react'

/* ============================================================
   1. GlassCard — كرت زجاجي حديث موحد
   ============================================================ */
export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  variant?: 'default' | 'subtle' | 'gradient'
}

export function GlassCard({
  children,
  className = '',
  variant = 'default',
  style = {},
  ...props
}: GlassCardProps) {
  const baseClass =
    variant === 'gradient'
      ? 'glass-card rounded-[24px] p-6 border border-[var(--glass-border)] bg-gradient-to-br from-[var(--surface)] to-[var(--surface-2)] shadow-xl'
      : variant === 'subtle'
      ? 'glass-card rounded-[20px] p-4 border border-[var(--glass-border)]/60 bg-[var(--surface-2)]/60'
      : 'glass-card rounded-[24px] p-6 border border-[var(--glass-border)] bg-[var(--surface)] shadow-lg'

  return (
    <div className={`${baseClass} ${className}`} style={style} {...props}>
      {children}
    </div>
  )
}

/* ============================================================
   2. Input — مدخل نصي موحد بعناصر تحكم ناعمة
   ============================================================ */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', style = {}, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && <label className="text-xs font-semibold text-[var(--text-2)]">{label}</label>}
        <div className="relative w-full">
          {icon && (
            <span className="material-symbols-outlined absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-3)] text-[18px] pointer-events-none">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            className={`w-full ${icon ? 'pr-11' : 'px-4'} py-2.5 rounded-xl bg-[var(--surface-2)] border ${
              error ? 'border-red-500' : 'border-[var(--glass-border)]'
            } text-[var(--text)] placeholder:text-[var(--text-3)] text-sm font-medium focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/25 transition-all ${className}`}
            style={style}
            {...props}
          />
        </div>
        {error && <span className="text-xs font-bold text-red-500">{error}</span>}
      </div>
    )
  }
)
Input.displayName = 'Input'

/* ============================================================
   3. Select — قائمة منسدلة موحدة
   ============================================================ */
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, children, className = '', style = {}, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && <label className="text-xs font-semibold text-[var(--text-2)]">{label}</label>}
        <select
          ref={ref}
          className={`w-full px-4 py-2.5 rounded-xl bg-[var(--surface-2)] border ${
            error ? 'border-red-500' : 'border-[var(--glass-border)]'
          } text-[var(--text)] text-sm font-semibold focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/25 transition-all cursor-pointer ${className}`}
          style={{ backgroundColor: 'var(--surface-2)', color: 'var(--text)', ...style }}
          {...props}
        >
          {children}
        </select>
        {error && <span className="text-xs font-bold text-red-500">{error}</span>}
      </div>
    )
  }
)
Select.displayName = 'Select'

/* ============================================================
   4. Button — زر تفاعلي بحركة 150ms مجهرية
   ============================================================ */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  icon?: string
  loading?: boolean
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  className = '',
  disabled,
  style = {},
  ...props
}: ButtonProps) {
  const variantClasses = {
    primary: 'bg-[var(--accent)] text-white shadow-lg hover:opacity-95',
    secondary: 'bg-[var(--surface-2)] text-[var(--text)] border border-[var(--glass-border)] hover:bg-[var(--surface-3)]',
    ghost: 'bg-transparent text-[var(--text-2)] hover:bg-[var(--surface-2)]',
    danger: 'bg-red-500 text-white shadow-lg hover:bg-red-600',
  }

  const sizeClasses = {
    sm: 'px-3.5 py-1.5 text-xs rounded-xl',
    md: 'px-5 py-2.5 text-sm rounded-full',
    lg: 'px-7 py-3 text-base rounded-full',
  }

  return (
    <button
      disabled={disabled || loading}
      className={`btn-animated font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      style={style}
      {...props}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : icon ? (
        <span className="material-symbols-outlined text-[18px]">{icon}</span>
      ) : null}
      <span>{children}</span>
    </button>
  )
}

/* ============================================================
   5. Badge — شارة حالة بصرية متوافقة مع الوضعين الداكن والفاتح
   ============================================================ */
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  children: React.ReactNode
}

export function Badge({
  variant = 'neutral',
  children,
  className = '',
  style = {},
  ...props
}: BadgeProps) {
  const variantStyles = {
    primary: 'bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/25',
    success: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25',
    warning: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25',
    danger: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25',
    info: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/25',
    neutral: 'bg-[var(--surface-3)] text-[var(--text-2)] border border-[var(--line-soft)]',
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${variantStyles[variant]} ${className}`}
      style={style}
      {...props}
    >
      {children}
    </span>
  )
}

/* ============================================================
   6. Skeleton — هيكل تحميل انسيابي
   ============================================================ */
export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

export function Skeleton({ className = '', style = {}, ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-[var(--surface-3)] ${className}`}
      style={style}
      {...props}
    />
  )
}
