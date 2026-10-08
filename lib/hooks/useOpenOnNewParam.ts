'use client'

import { useEffect } from 'react'

/**
 * يفتح نافذة الإضافة إذا وصلت الصفحة برابط فيه ‎?new=1 (مثل «الإجراءات السريعة» في لوحة التحكم)،
 * ثم يزيل المعامل من الرابط حتى لا تُفتح النافذة مرة ثانية عند التحديث.
 */
export function useOpenOnNewParam(open: () => void) {
  useEffect(() => {
    const url = new URL(window.location.href)
    if (url.searchParams.get('new') !== '1') return
    url.searchParams.delete('new')
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
    open()
    // يُنفَّذ مرة واحدة عند فتح الصفحة
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
