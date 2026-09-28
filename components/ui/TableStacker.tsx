'use client'

import { useEffect } from 'react'

/**
 * يجهّز الجداول (table.stackable) لعرض البطاقات على الموبايل:
 * يضع اسم العمود على كل خانة (data-label) حتى تظهر «التاريخ: …» داخل البطاقة.
 * يعمل تلقائياً للجداول الجديدة والصفوف المضافة (والنوافذ المنبثقة).
 */
/** هل أكمل React تفعيل هذا العنصر؟ (لا نعدّل HTML لم يُفعَّل بعد — يسبب عدم تطابق) */
const isHydrated = (el: Element) => Object.keys(el).some(k => k.startsWith('__reactFiber'))

function labelTable(table: HTMLTableElement): boolean {
  if (!isHydrated(table)) return false
  const headRow = table.tHead?.rows[table.tHead.rows.length - 1]
  if (!headRow) return true
  const labels: string[] = []
  for (const th of Array.from(headRow.cells)) {
    const text = (th.textContent || '').replace(/\s+/g, ' ').trim()
    for (let i = 0; i < (th.colSpan || 1); i++) labels.push(text)
  }
  for (const body of Array.from(table.tBodies)) {
    for (const tr of Array.from(body.rows)) {
      let col = 0
      for (const td of Array.from(tr.cells)) {
        const span = td.colSpan || 1
        if (span > 1 && span >= labels.length - 1) td.dataset.full = '1'
        else if (!td.dataset.label && labels[col]) td.dataset.label = labels[col]
        col += span
      }
    }
  }
  return true
}

export function TableStacker() {
  useEffect(() => {
    let raf = 0
    let retry: ReturnType<typeof setTimeout> | undefined
    let attempts = 0
    const run = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        let pending = false
        document.querySelectorAll<HTMLTableElement>('table.stackable').forEach(t => { if (!labelTable(t)) pending = true })
        // جداول لم تُفعَّل بعد: نعيد المحاولة بعد قليل
        clearTimeout(retry)
        if (pending && attempts++ < 40) retry = setTimeout(run, 150)
        else if (!pending) attempts = 0
      })
    }
    run()
    const mo = new MutationObserver(run)
    mo.observe(document.body, { childList: true, subtree: true })
    return () => { mo.disconnect(); cancelAnimationFrame(raf); clearTimeout(retry) }
  }, [])
  return null
}
