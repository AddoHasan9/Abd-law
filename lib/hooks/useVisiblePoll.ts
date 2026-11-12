'use client'

import { useEffect, useRef } from 'react'

/**
 * تحديث دوري خفيف على قاعدة البيانات:
 * - يشغّل الدالة عند الفتح، ثم كل `intervalMs` فقط والتبويب ظاهر
 * - لا يرسل أي طلب والتبويب مخفي (تبويب منسي طوال اليوم = صفر طلبات)
 * - عند الرجوع للتبويب يحدّث فوراً إذا مرّ نصف المدة على الأقل
 */
export function useVisiblePoll(fn: () => unknown, intervalMs: number) {
  const fnRef = useRef(fn)
  fnRef.current = fn

  useEffect(() => {
    let last = 0
    const run = () => { last = Date.now(); void fnRef.current() }
    run()
    const timer = setInterval(() => { if (!document.hidden) run() }, intervalMs)
    const onVisible = () => { if (!document.hidden && Date.now() - last > intervalMs / 2) run() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onVisible) }
  }, [intervalMs])
}
