'use client'

import { useRef, useEffect, useCallback } from 'react'

interface DragScrollOptions {
  speed?: number
  friction?: number
  enableWheel?: boolean
}

/**
 * useDragScroll
 * Modern Pointer-Events & Kinetic Physics Drag-To-Scroll Hook.
 * Works seamlessly in both RTL (Arabic) and LTR, with touch, mouse, and trackpad.
 * Uses pointer capture so clicking on buttons/children smoothly drags without dropping.
 */
export function useDragScroll<T extends HTMLElement = HTMLDivElement>({
  speed = 1.25,
  friction = 0.92,
  enableWheel = true,
}: DragScrollOptions = {}) {
  const ref = useRef<T | null>(null)
  const isPointerDown = useRef(false)
  const hasMoved = useRef(false)
  const lastX = useRef(0)
  const lastTime = useRef(0)
  const velocity = useRef(0)
  const totalDistance = useRef(0)
  const animationFrameId = useRef<number | null>(null)

  const stopMomentum = useCallback(() => {
    if (animationFrameId.current !== null) {
      cancelAnimationFrame(animationFrameId.current)
      animationFrameId.current = null
    }
    velocity.current = 0
  }, [])

  useEffect(() => {
    const slider = ref.current
    if (!slider) return

    slider.style.cursor = 'grab'
    slider.style.userSelect = 'none'
    slider.style.webkitUserSelect = 'none'
    slider.style.touchAction = 'pan-y'

    const handlePointerDown = (e: PointerEvent) => {
      // Only drag with primary mouse button (0) or touch/pen
      if (e.button !== 0 && e.pointerType === 'mouse') return

      stopMomentum()
      isPointerDown.current = true
      hasMoved.current = false
      lastX.current = e.clientX
      lastTime.current = performance.now()
      totalDistance.current = 0
      velocity.current = 0

      try {
        slider.setPointerCapture(e.pointerId)
      } catch {}
    }

    const handlePointerMove = (e: PointerEvent) => {
      if (!isPointerDown.current) return

      const deltaX = e.clientX - lastX.current
      const now = performance.now()
      const dt = Math.max(now - lastTime.current, 1)

      totalDistance.current += Math.abs(deltaX)

      if (totalDistance.current > 4) {
        hasMoved.current = true
        slider.style.cursor = 'grabbing'
      }

      // Instantaneous velocity (pixels per frame normalized)
      velocity.current = (deltaX / dt) * 16.67 * speed

      lastX.current = e.clientX
      lastTime.current = now

      // scrollBy automatically handles RTL and LTR across all browsers
      slider.scrollBy({ left: -deltaX * speed, behavior: 'instant' as ScrollBehavior })
    }

    const startMomentum = () => {
      if (!slider || Math.abs(velocity.current) < 0.25) {
        stopMomentum()
        if (slider) slider.style.cursor = 'grab'
        return
      }

      slider.scrollBy({ left: -velocity.current, behavior: 'instant' as ScrollBehavior })
      velocity.current *= friction

      animationFrameId.current = requestAnimationFrame(startMomentum)
    }

    const handlePointerUp = (e: PointerEvent) => {
      if (!isPointerDown.current) return
      isPointerDown.current = false

      try {
        if (slider.hasPointerCapture(e.pointerId)) {
          slider.releasePointerCapture(e.pointerId)
        }
      } catch {}

      if (slider) slider.style.cursor = 'grab'

      if (hasMoved.current && Math.abs(velocity.current) > 0.6) {
        startMomentum()
      }
    }

    const handlePointerCancel = (e: PointerEvent) => {
      if (!isPointerDown.current) return
      isPointerDown.current = false

      try {
        if (slider.hasPointerCapture(e.pointerId)) {
          slider.releasePointerCapture(e.pointerId)
        }
      } catch {}

      if (slider) slider.style.cursor = 'grab'
      stopMomentum()
    }

    // Intercept clicks on child buttons/links if user was dragging
    const handleClickCapture = (e: MouseEvent) => {
      if (hasMoved.current) {
        e.preventDefault()
        e.stopPropagation()
        hasMoved.current = false
      }
    }

    // Mouse wheel horizontal translation in RTL / LTR
    const handleWheel = (e: WheelEvent) => {
      if (!enableWheel || e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return

      if (slider.scrollWidth > slider.clientWidth) {
        e.preventDefault()
        const isRTL = getComputedStyle(slider).direction === 'rtl'
        const delta = isRTL ? -e.deltaY : e.deltaY
        slider.scrollBy({ left: delta * 0.85, behavior: 'smooth' })
      }
    }

    slider.addEventListener('pointerdown', handlePointerDown)
    slider.addEventListener('pointermove', handlePointerMove)
    slider.addEventListener('pointerup', handlePointerUp)
    slider.addEventListener('pointercancel', handlePointerCancel)
    slider.addEventListener('click', handleClickCapture, true)
    slider.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      stopMomentum()
      slider.removeEventListener('pointerdown', handlePointerDown)
      slider.removeEventListener('pointermove', handlePointerMove)
      slider.removeEventListener('pointerup', handlePointerUp)
      slider.removeEventListener('pointercancel', handlePointerCancel)
      slider.removeEventListener('click', handleClickCapture, true)
      slider.removeEventListener('wheel', handleWheel)
    }
  }, [speed, friction, enableWheel, stopMomentum])

  return ref
}
