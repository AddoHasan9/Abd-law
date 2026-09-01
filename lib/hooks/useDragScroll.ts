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
  const isDown = useRef(false)
  const isDragging = useRef(false)
  const startX = useRef(0)
  const lastX = useRef(0)
  const lastTime = useRef(0)
  const velocity = useRef(0)
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

    slider.style.userSelect = 'none'
    slider.style.webkitUserSelect = 'none'

    const handleMouseDown = (e: MouseEvent) => {
      // Only drag on primary left mouse click
      if (e.button !== 0) return

      stopMomentum()
      isDown.current = true
      isDragging.current = false
      startX.current = e.clientX
      lastX.current = e.clientX
      lastTime.current = performance.now()
      velocity.current = 0
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDown.current) return

      const deltaFromStart = Math.abs(e.clientX - startX.current)

      // Only mark as active drag after user moves > 4px (suppresses drag on pure clicks)
      if (deltaFromStart > 4) {
        isDragging.current = true
        slider.style.cursor = 'grabbing'
      }

      if (!isDragging.current) return

      const deltaX = e.clientX - lastX.current
      const now = performance.now()
      const dt = Math.max(now - lastTime.current, 1)

      // Calculate instantaneous velocity for inertia glide
      velocity.current = (deltaX / dt) * 16.67 * speed

      lastX.current = e.clientX
      lastTime.current = now

      // scrollBy automatically handles RTL and LTR across all browsers
      slider.scrollBy({ left: -deltaX * speed, behavior: 'instant' as ScrollBehavior })
    }

    const startMomentum = () => {
      if (!slider || Math.abs(velocity.current) < 0.25) {
        stopMomentum()
        if (slider) slider.style.cursor = ''
        return
      }

      slider.scrollBy({ left: -velocity.current, behavior: 'instant' as ScrollBehavior })
      velocity.current *= friction

      animationFrameId.current = requestAnimationFrame(startMomentum)
    }

    const handleMouseUp = () => {
      if (!isDown.current) return
      isDown.current = false
      if (slider) slider.style.cursor = ''

      if (isDragging.current && Math.abs(velocity.current) > 0.6) {
        startMomentum()
      }
    }

    const handleMouseLeave = () => {
      if (!isDown.current) return
      isDown.current = false
      if (slider) slider.style.cursor = ''

      if (isDragging.current && Math.abs(velocity.current) > 0.6) {
        startMomentum()
      }
    }

    // Intercept clicks on child buttons/links ONLY if the user was actually dragging
    const handleClickCapture = (e: MouseEvent) => {
      if (isDragging.current) {
        e.preventDefault()
        e.stopPropagation()
        isDragging.current = false
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

    slider.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    slider.addEventListener('mouseleave', handleMouseLeave)
    slider.addEventListener('click', handleClickCapture, true)
    slider.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      stopMomentum()
      slider.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      slider.removeEventListener('mouseleave', handleMouseLeave)
      slider.removeEventListener('click', handleClickCapture, true)
      slider.removeEventListener('wheel', handleWheel)
    }
  }, [speed, friction, enableWheel, stopMomentum])

  return ref
}
