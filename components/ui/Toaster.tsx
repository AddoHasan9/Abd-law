'use client'

import { Toaster as SonnerToaster } from 'sonner'

export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      dir="rtl"
      richColors
      closeButton
      toastOptions={{
        style: {
          fontFamily: 'var(--font-tajawal), sans-serif',
          borderRadius: '12px',
          padding: '12px 16px',
        },
      }}
    />
  )
}
