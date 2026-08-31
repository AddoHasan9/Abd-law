import confetti from 'canvas-confetti'

/**
 * Triggers a subtle, elegant celebratory confetti burst
 * Perfect for workflow completion, promotion to established, or tax clearance
 */
export function triggerCelebration(options?: confetti.Options) {
  if (typeof window === 'undefined') return

  confetti({
    particleCount: 50,
    spread: 60,
    origin: { y: 0.75 },
    colors: ['#38BDF8', '#10B981', '#F59E0B', '#6366F1', '#D4AF37'],
    disableForReducedMotion: true,
    ...options,
  })
}

export function triggerGrandCelebration() {
  if (typeof window === 'undefined') return

  const count = 200
  const defaults = {
    origin: { y: 0.7 },
    colors: ['#0284C7', '#10B981', '#F59E0B', '#38BDF8', '#AA771C'],
    disableForReducedMotion: true,
  }

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    })
  }

  fire(0.25, {
    spread: 26,
    startVelocity: 55,
  })
  fire(0.2, {
    spread: 60,
  })
  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8,
  })
  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2,
  })
  fire(0.1, {
    spread: 120,
    startVelocity: 45,
  })
}
