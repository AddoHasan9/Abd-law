'use client'

import { useRef, useEffect, useCallback } from 'react'

interface DragScrollOptions {
  speed?: number
  friction?: number
  enableWheel?: boolean
}

/**
 * useDragScroll
 * Enables smooth, momentum-based drag-to-scroll on any scrollable container with a mouse.
 * Automatically suppresses accidental clicks when dragging.
 */
export function useDragScroll<T extends HTMLElement = HTMLDivElement>({
  speed = 1.3,
  friction = 0.94,
  enableWheel = true,
}: DragScrollOptions = {}) {
  const ref = useRef<T | null>(null)
  const isDown = useRef(false)
  const startX = useRef(0)
  const scrollLeft = useRef(0)
  const isDragging = useRef(false)
  const velocity = useRef(0)
  const lastX = useRef(0)
  const lastTime = useRef(0)
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

    // Apply smooth grab cursor styling
    slider.style.cursor = 'grab'
    slider.style.userSelect = 'none'
    slider.style.webkitUserSelect = 'none'

    const handleMouseDown = (e: MouseEvent) => {
      // Only drag on primary left click
      if (e.button !== 0) return

      stopMomentum()
      isDown.current = true
      isDragging.current = false
      startX.current = e.pageX - slider.offsetLeft
      scrollLeft.current = slider.scrollLeft
      lastX.current = e.pageX
      lastTime.current = performance.now()
      slider.style.cursor = 'grabbing'
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDown.current) return

      e.preventDefault()
      const x = e.pageX - slider.offsetLeft
      const walk = (x - startX.current) * speed
      const now = performance.now()
      const dt = Math.max(now - lastTime.current, 1)
      const dx = e.pageX - lastX.current

      // Calculate instantaneous velocity for smooth inertia
      velocity.current = (dx / dt) * 16

      lastX.current = e.pageX
      lastTime.current = now

      // If user moved more than 5px, flag as active drag (suppress clicks)
      if (Math.abs(x - startX.current) > 5) {
        isDragging.current = true
      }

      slider.scrollLeft = scrollLeft.current - walk
    }

    const startMomentum = () => {
      if (!slider || Math.abs(velocity.current) < 0.2) {
        stopMomentum()
        return
      }

      slider.scrollLeft -= velocity.current
      velocity.current *= friction

      animationFrameId.current = requestAnimationFrame(startMomentum)
    }

    const handleMouseUp = () => {
      if (!isDown.current) return
      isDown.current = false
      if (slider) {
        slider.style.cursor = 'grab'
      }

      if (isDragging.current && Math.abs(velocity.current) > 0.5) {
        startMomentum()
      }
    }

    const handleMouseLeave = () => {
      if (!isDown.current) return
      isDown.current = false
      if (slider) {
        slider.style.cursor = 'grab'
      }

      if (isDragging.current && Math.abs(velocity.current) > 0.5) {
        startMomentum()
      }
    }

    // Intercept clicks on child buttons/links if user was dragging
    const handleClickCapture = (e: MouseEvent) => {
      if (isDragging.current) {
        e.preventDefault()
        e.stopPropagation()
        isDragging.current = false
      }
    }

    // Optional: Vertical wheel converted to horizontal scroll
    const handleWheel = (e: WheelEvent) => {
      if (!enableWheel || e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return

      if (slider.scrollWidth > slider.clientWidth) {
        e.preventDefault()
        slider.scrollLeft += e.deltaY * 0.9
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
