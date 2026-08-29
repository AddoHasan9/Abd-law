/**
 * نظام مراقبة وتسجيل الأخطاء البرمجية (Production Logger & Sentry Monitoring Layer)
 * ------------------------------------------------------------
 * يقوم بالتقاط وتسجيل أي خطأ أو استثناء بشكل منظم وآمن دون تعريض سياق المستخدم للخطر.
 */

export interface LogContext {
  module?: string
  action?: string
  userId?: string
  metadata?: Record<string, unknown>
}

class Logger {
  private isProd = process.env.NODE_ENV === 'production'

  /** تسجل خطأ برمجياً مع سياق العملية */
  error(message: string, error?: unknown, context: LogContext = {}) {
    const timestamp = new Date().toISOString()
    const errorDetails = error instanceof Error ? error.message : String(error || '')

    const payload = {
      timestamp,
      level: 'ERROR',
      message,
      error: errorDetails,
      context,
    }

    if (!this.isProd) {
      // In dev mode, log safely
      console.warn(`[LOGGER:ERROR] ${message}`, payload)
    }

    // In production, sync with Sentry / External Log Vault
    this.sendToMonitoring(payload)
  }

  /** تسجل تحذيراً تشغيلياً */
  warn(message: string, context: LogContext = {}) {
    if (!this.isProd) {
      console.warn(`[LOGGER:WARN] ${message}`, context)
    }
  }

  /** إرسال السجل إلى خادم المراقبة */
  private sendToMonitoring(payload: unknown) {
    try {
      const win = typeof window !== 'undefined' ? (window as unknown as Record<string, { captureException?: (p: unknown) => void }>) : null
      if (win?.Sentry?.captureException) {
        win.Sentry.captureException(payload)
      }
    } catch {}
  }
}

export const logger = new Logger()
