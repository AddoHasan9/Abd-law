'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * يرسم المحتوى مباشرة داخل <body>.
 * ضروري للنوافذ والإشعارات: أي عنصر أب فيه backdrop-filter أو transform (زجاج Horizon)
 * يجعل position: fixed يتبعه بدل الشاشة، فتظهر النافذة في مكان البطاقة أو خارج الشاشة.
 */
export function Portal({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  useEffect(() => setReady(true), [])
  return ready ? createPortal(children, document.body) : null
}
