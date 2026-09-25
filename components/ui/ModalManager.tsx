'use client'

import { useEffect } from 'react'
import { confirmAction } from '@/components/ui/ConfirmDialog'

/**
 * سلوك موحّد لكل النوافذ المنبثقة (.modal-veil + .modal) بدون تعديل كل نافذة:
 *  - Esc يغلق النافذة العليا
 *  - قفل تمرير الصفحة خلف النافذة (مهم على iPhone)
 *  - حصر التركيز داخل النافذة (Tab لا يخرج منها) وإرجاعه عند الإغلاق
 *  - تحذير «تغييرات غير محفوظة» عند الإغلاق بعد الكتابة في النموذج
 */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const topVeil = () => {
  const all = document.querySelectorAll<HTMLElement>('.modal-veil')
  return all.length ? all[all.length - 1] : null
}
const modalOf = (veil: HTMLElement | null) => {
  if (!veil) return null
  let el = veil.nextElementSibling as HTMLElement | null
  while (el && !el.classList.contains('modal')) el = el.nextElementSibling as HTMLElement | null
  return el ?? (veil.parentElement?.querySelector<HTMLElement>(':scope > .modal') ?? null)
}
const isCloseButton = (btn: HTMLElement) => {
  const label = (btn.getAttribute('aria-label') || btn.textContent || '').trim()
  return /^(إغلاق|إلغاء|close)$/i.test(label) || btn.classList.contains('modal-close')
}

export function ModalManager() {
  useEffect(() => {
    const dirty = new WeakSet<HTMLElement>()
    let bypass = false
    let locked = false
    let savedScroll: { el: HTMLElement; overflow: string }[] = []
    const openers = new WeakMap<HTMLElement, HTMLElement | null>()
    let lastTop: HTMLElement | null = null

    const lock = (on: boolean) => {
      if (on === locked) return
      locked = on
      if (on) {
        const targets = [document.documentElement, document.body, document.getElementById('view-root')].filter(Boolean) as HTMLElement[]
        savedScroll = targets.map(el => ({ el, overflow: el.style.overflow }))
        targets.forEach(el => { el.style.overflow = 'hidden' })
      } else {
        savedScroll.forEach(({ el, overflow }) => { el.style.overflow = overflow })
        savedScroll = []
      }
    }

    const sync = () => {
      const veil = topVeil()
      lock(!!veil)
      const modal = modalOf(veil)
      if (modal && modal !== lastTop) {
        openers.set(modal, document.activeElement as HTMLElement | null)
        if (!modal.hasAttribute('role')) modal.setAttribute('role', 'dialog')
        modal.setAttribute('aria-modal', 'true')
        if (!modal.contains(document.activeElement)) {
          const first = modal.querySelector<HTMLElement>('input:not([type="hidden"]):not([disabled]), select, textarea') ??
            modal.querySelector<HTMLElement>(FOCUSABLE)
          // على اللمس لا نفتح الكيبورد تلقائياً — نركّز على النافذة نفسها
          if (first && window.matchMedia('(hover: hover)').matches) first.focus({ preventScroll: true })
          else { modal.tabIndex = -1; modal.focus({ preventScroll: true }) }
        }
      }
      if (!modal && lastTop) {
        const opener = openers.get(lastTop)
        if (opener && document.contains(opener)) opener.focus({ preventScroll: true })
      }
      lastTop = modal
    }

    const guardedClose = async (trigger: HTMLElement, modal: HTMLElement | null) => {
      if (!modal || !dirty.has(modal)) return false
      const ok = await confirmAction({
        title: 'لديك تغييرات غير محفوظة',
        message: 'إذا أغلقت النافذة الآن ستضيع البيانات التي أدخلتها.',
        tone: 'warn',
        confirmText: 'إغلاق بدون حفظ',
        cancelText: 'متابعة التعديل',
      })
      if (ok) {
        dirty.delete(modal)
        bypass = true
        trigger.click()
        bypass = false
      }
      return true
    }

    const onInput = (e: Event) => {
      const t = e.target as HTMLElement
      const modal = t.closest?.('.modal') as HTMLElement | null
      if (!modal || (t as HTMLInputElement).type === 'search' || t.closest('[data-no-dirty]')) return
      dirty.add(modal)
    }

    const onClick = (e: MouseEvent) => {
      if (bypass) return
      const t = e.target as HTMLElement
      const veil = topVeil()
      if (!veil) return
      const modal = modalOf(veil)
      // ضغط «حفظ» أو زر إرسال = المستخدم حفظ؛ لا نحذّره بعدها
      const saveBtn = t.closest('button') as HTMLElement | null
      if (saveBtn && modal?.contains(saveBtn) && (saveBtn.getAttribute('type') === 'submit' || /^(حفظ|تحديث|إضافة|تأكيد|إنشاء)/.test((saveBtn.textContent || '').trim()))) {
        dirty.delete(modal)
        return
      }
      let trigger: HTMLElement | null = null
      if (t === veil) trigger = veil
      else {
        const btn = t.closest('button') as HTMLElement | null
        if (btn && modal?.contains(btn) && isCloseButton(btn) && btn.getAttribute('type') !== 'submit') trigger = btn
      }
      if (!trigger || !modal || !dirty.has(modal)) return
      e.preventDefault()
      e.stopPropagation()
      void guardedClose(trigger, modal)
    }

    const onKey = (e: KeyboardEvent) => {
      if (document.querySelector('.confirm-veil')) return // نافذة التأكيد تتولى مفاتيحها
      const veil = topVeil()
      const modal = modalOf(veil)
      if (!veil || !modal) return
      if (e.key === 'Escape') {
        e.preventDefault()
        if (dirty.has(modal)) void guardedClose(veil, modal)
        else veil.click()
        return
      }
      if (e.key === 'Tab') {
        const items = Array.from(modal.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(el => el.offsetParent !== null)
        if (!items.length) return
        const first = items[0], last = items[items.length - 1]
        const active = document.activeElement as HTMLElement | null
        if (!modal.contains(active)) { e.preventDefault(); first.focus(); return }
        if (e.shiftKey && active === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus() }
      }
    }

    const mo = new MutationObserver(sync)
    mo.observe(document.body, { childList: true, subtree: true })
    document.addEventListener('input', onInput, true)
    document.addEventListener('change', onInput, true)
    document.addEventListener('click', onClick, true)
    document.addEventListener('keydown', onKey)
    const onSubmit = (e: Event) => { const m = (e.target as HTMLElement).closest?.('.modal') as HTMLElement | null; if (m) dirty.delete(m) }
    document.addEventListener('submit', onSubmit, true)
    sync()
    return () => {
      mo.disconnect()
      document.removeEventListener('input', onInput, true)
      document.removeEventListener('change', onInput, true)
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('submit', onSubmit, true)
      lock(false)
    }
  }, [])

  return null
}
