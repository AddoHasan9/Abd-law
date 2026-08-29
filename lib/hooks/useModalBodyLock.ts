'use client'

import { useEffect } from 'react'

/** يمنع تمرير الصفحة ويغلق النافذة المنبثقة عند الضغط على زر ESC */
export function useModalBodyLock(isOpen: boolean, onClose?: () => void) {
  useEffect(() => {
    if (!isOpen) return
    document.body.classList.add('modal-open')

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.classList.remove('modal-open')
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])
}
