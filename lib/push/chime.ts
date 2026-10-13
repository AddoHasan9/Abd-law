'use client'
/** نغمة تنبيه قصيرة (نغمتان صاعدتان) عبر Web Audio — بلا ملفات صوتية */
let ctx: AudioContext | null = null
export function playChime() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    ctx = ctx || new AC()
    if (ctx.state === 'suspended') void ctx.resume()
    const t0 = ctx.currentTime + 0.02
    ;[[880, 0], [1320, 0.16]].forEach(([freq, at]) => {
      const o = ctx!.createOscillator()
      const g = ctx!.createGain()
      o.type = 'sine'
      o.frequency.value = freq
      g.gain.setValueAtTime(0.0001, t0 + at)
      g.gain.exponentialRampToValueAtTime(0.22, t0 + at + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + 0.45)
      o.connect(g).connect(ctx!.destination)
      o.start(t0 + at)
      o.stop(t0 + at + 0.5)
    })
  } catch { /* الصوت غير متاح — التنبيه المرئي يكفي */ }
}
