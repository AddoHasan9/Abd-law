'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { logger } from '@/lib/logger'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/** جدار حماية الأخطاء الستري (React Error Boundary) */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('Unhandled React Component Error', error, {
      module: 'ErrorBoundary',
      metadata: { componentStack: errorInfo.componentStack },
    })
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="p-8 rounded-[24px] bg-[var(--surface-2)] border border-red-500/30 text-center flex flex-col items-center justify-center gap-4 my-6">
          <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center font-bold text-xl">
            ⚠️
          </div>
          <h3 className="text-lg font-bold text-[var(--text)]">حدث خطأ غير متوقع في هذا الجزء</h3>
          <p className="text-xs text-[var(--text-3)] max-w-md">
            تم تسجيل الخطأ تلقائياً في نظام المراقبة. يمكنك إعادة تحميل الصفحة للاستمرار.
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-6 py-2.5 rounded-full bg-[var(--accent)] text-white text-xs font-bold shadow-md hover:opacity-90 transition cursor-pointer"
          >
            إعادة المحاولة
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
