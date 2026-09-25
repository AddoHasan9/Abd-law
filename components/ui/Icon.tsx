/**
 * مكتبة الأيقونات — SVG محلية بالكامل
 * ------------------------------------------------------------
 * منقولة من نموذج المرحلة 1. لا تعتمد على أي CDN أو حزمة خارجية،
 * فالتطبيق يعمل بلا إنترنت وبلا زيادة في حجم الحزمة.
 *
 * الاستعمال:
 *   <IconSprite />              مرة واحدة في التخطيط الجذري
 *   <Icon name="brief" />       في أي مكان
 */
import React, { type SVGProps } from 'react'

export type IconName = keyof typeof SYMBOLS

const SYMBOLS = {
  "tools": <symbol key="tools" id="ic-tools" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a4 4 0 0 0 5 5l-8.4 8.4a2.1 2.1 0 0 1-3-3z" /><path d="M14.7 6.3 17 4l3 3-2.3 2.3M4 4l5 5M3.5 7.5l4-4" /></symbol>,
  "scale": <symbol key="scale" id="ic-scale" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v18M7 21h10M6 7l-3 7h6zM18 7l-3 7h6z" /><path d="M3 14a3 3 0 0 0 6 0M15 14a3 3 0 0 0 6 0M5 7h14" /></symbol>,
  "grid": <symbol key="grid" id="ic-grid" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7.5" height="7.5" rx="2" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="2" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="2" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" /></symbol>,
  "brief": <symbol key="brief" id="ic-brief" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2.5" y="7" width="19" height="13.5" rx="2.5" /><path d="M8.5 7V5.5A2 2 0 0 1 10.5 3.5h3A2 2 0 0 1 15.5 5.5V7M2.5 12.5h19" /></symbol>,
  "build": <symbol key="build" id="ic-build" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M15 21V10h4a2 2 0 0 1 2 2v9" /><path d="M8.5 7h3M8.5 11h3M8.5 15h3" /></symbol>,
  "vault": <symbol key="vault" id="ic-vault" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2.5" y="4" width="19" height="16" rx="2.5" /><circle cx="12" cy="12" r="4" /><path d="M12 8v-1M12 17v-1M16 12h1M7 12H6" /></symbol>,
  "stamp": <symbol key="stamp" id="ic-stamp" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3.5h6a2 2 0 0 1 2 2.2l-.6 5.3h-8.8L7 5.7a2 2 0 0 1 2-2.2Z" /><rect x="4" y="14" width="16" height="3" rx="1.5" /><path d="M5 20.5h14" /></symbol>,
  "doc": <symbol key="doc" id="ic-doc" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2.5H7.5a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7z" /><path d="M14 2.5V7h4.5M9 12.5h6M9 16.5h4" /></symbol>,
  "archive": <symbol key="archive" id="ic-archive" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2.5" y="3.5" width="19" height="5" rx="1.5" /><path d="M4.5 8.5v10a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-10M9.5 13h5" /></symbol>,
  "users": <symbol key="users" id="ic-users" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 5.2a3.5 3.5 0 0 1 0 5.6M17.5 14.4a6.5 6.5 0 0 1 4 5.6" /></symbol>,
  "user": <symbol key="user" id="ic-user" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" /></symbol>,
  "badge": <symbol key="badge" id="ic-badge" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2.5" /><path d="M9 5V3.5h6V5" /><circle cx="12" cy="11" r="2.5" /><path d="M8 17.5a4 4 0 0 1 8 0" /></symbol>,
  "door": <symbol key="door" id="ic-door" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 21V4.5a1.5 1.5 0 0 1 1.2-1.47l9-1.8A1.5 1.5 0 0 1 16 2.7V21M2.5 21h19M12.5 12.5v1.5" /></symbol>,
  "spark": <symbol key="spark" id="ic-spark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /><path d="M18.5 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" /></symbol>,
  "ticket": <symbol key="ticket" id="ic-ticket" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8.5V6.5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2.5 2.5 0 0 0 0 5v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2.5 2.5 0 0 0 0-5Z" /><path d="M13 5.5v3M13 11v2M13 15.5v3" /></symbol>,
  "chat": <symbol key="chat" id="ic-chat" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20.5 12a8 8 0 0 1-11.7 7.1L3.5 20.5l1.4-5.3A8 8 0 1 1 20.5 12Z" /><path d="M8.5 11h7M8.5 14.5h4" /></symbol>,
  "cal": <symbol key="cal" id="ic-cal" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4.5" width="18" height="17" rx="2.5" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" /><circle cx="8.5" cy="14" r="1.1" fill="currentColor" stroke="none" /><circle cx="12.5" cy="14" r="1.1" fill="currentColor" stroke="none" /></symbol>,
  "chart": <symbol key="chart" id="ic-chart" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 21h17M6.5 21v-7M11 21V7M15.5 21v-4M20 21V11" /></symbol>,
  "target": <symbol key="target" id="ic-target" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" /></symbol>,
  "steps": <symbol key="steps" id="ic-steps" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="5.5" cy="6" r="2.5" /><circle cx="5.5" cy="18" r="2.5" /><path d="M5.5 8.5v7M10 6h5.5a2.5 2.5 0 0 1 0 5H13M10 18h9" /></symbol>,
  "wallet": <symbol key="wallet" id="ic-wallet" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18a2 2 0 0 1 2 2v1" /><rect x="3" y="7.5" width="18" height="12.5" rx="2.5" /><circle cx="16.5" cy="14" r="1.4" fill="currentColor" stroke="none" /></symbol>,
  "shield": <symbol key="shield" id="ic-shield" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.5 4.5 5.5v6c0 5 3.2 8.7 7.5 10 4.3-1.3 7.5-5 7.5-10v-6z" /><path d="m9 12 2 2 4-4" /></symbol>,
  "key": <symbol key="key" id="ic-key" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="4.5" /><path d="m11.2 11.2 8.3 8.3M17 17l2-2M14.5 14.5l1.5-1.5" /></symbol>,
  "log": <symbol key="log" id="ic-log" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H18a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6.5A2.5 2.5 0 0 1 4 18.5z" /><path d="M8 8h8M8 12h8M8 16h5" /></symbol>,
  "gear": <symbol key="gear" id="ic-gear" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3.2" /><path d="M19.4 14.5a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5v.2a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1h.2a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" /></symbol>,
  "bell": <symbol key="bell" id="ic-bell" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8.5a6 6 0 1 0-12 0c0 6-2.5 7.5-2.5 7.5h17S18 14.5 18 8.5" /><path d="M13.7 20a2 2 0 0 1-3.4 0" /></symbol>,
  "search": <symbol key="search" id="ic-search" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="10.5" cy="10.5" r="7" /><path d="m20 20-4.5-4.5" /></symbol>,
  "sun": <symbol key="sun" id="ic-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4.2" /><path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8 6 18M18 6l1.8-1.8" /></symbol>,
  "moon": <symbol key="moon" id="ic-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20.5 14.3A8.5 8.5 0 1 1 9.7 3.5a6.8 6.8 0 0 0 10.8 10.8" /></symbol>,
  "menu": <symbol key="menu" id="ic-menu" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M4 12h16M4 17h16" /></symbol>,
  "x": <symbol key="x" id="ic-x" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 6l12 12M18 6 6 18" /></symbol>,
  "out": <symbol key="out" id="ic-out" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 20.5H6.5a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2H14" /><path d="M17 15.5 20.5 12 17 8.5M20.5 12H9.5" /></symbol>,
  "clock": <symbol key="clock" id="ic-clock" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></symbol>,
  "alert": <symbol key="alert" id="ic-alert" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M10.3 3.9 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4.5M12 17.2v.1" /></symbol>,
  "check": <symbol key="check" id="ic-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8.5" /><path d="m8.5 12 2.5 2.5 4.5-5" /></symbol>,
  "info": <symbol key="info" id="ic-info" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 8v.1" /></symbol>,
  "plus": <symbol key="plus" id="ic-plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></symbol>,
  "chev": <symbol key="chev" id="ic-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></symbol>,
  "build2": <symbol key="build2" id="ic-build2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 3 8v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8z" /><path d="M9.5 21v-6h5v6" /></symbol>,
}

/** يُدرَج مرة واحدة في التخطيط — يعرّف كل الرموز */
export function IconSprite() {
  return (
    <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
      <defs>{Object.values(SYMBOLS)}</defs>
    </svg>
  )
}

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName
  className?: string
}

export function Icon({ name, className = 'icon', width = 20, height = 20, ...rest }: IconProps) {
  return (
    <svg className={className} width={width} height={height} aria-hidden {...rest}>
      <use href={`#ic-${name}`} />
    </svg>
  )
}
