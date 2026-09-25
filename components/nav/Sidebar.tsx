'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useSearchParams } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'
import { NAV, txTypeLeaves, type NavGroup, type NavLeaf } from '@/lib/nav'
import { can } from '@/lib/constants'
import type { Profile } from '@/types/database'
import DeadlineCard, { type DeadlineItem } from './DeadlineCard'

const STORE_KEY = 'nav-closed'

interface Props {
  profile: Profile | null
  officeName: string
  txCounts: Record<string, number>
  badges: Record<string, number>
  deadline?: DeadlineItem | null
  deadlines?: DeadlineItem[]
  onNavigate?: () => void
}

export default function Sidebar({
  profile, officeName, txCounts, badges, deadline, deadlines = [], onNavigate,
}: Props) {
  const pathname = usePathname()
  const params = useSearchParams()
  const typeParam = params.get('type')

  const [closed, setClosed] = useState<Set<string>>(new Set(['g-sys']))
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY)
      if (raw) {
        setClosed(new Set(JSON.parse(raw) as string[]))
      } else {
        setClosed(new Set(['g-sys']))
      }
    } catch {
      setClosed(new Set(['g-sys']))
    }
    setReady(true)
  }, [])

  // Auto-expand group if current route belongs to it
  useEffect(() => {
    if (pathname.startsWith('/settings')) {
      setClosed(prev => {
        if (prev.has('g-sys')) {
          const next = new Set(prev)
          next.delete('g-sys')
          return next
        }
        return prev
      })
    }
    if (pathname.startsWith('/commercial')) {
      setClosed(prev => {
        if (prev.has('g-com')) {
          const next = new Set(prev)
          next.delete('g-com')
          return next
        }
        return prev
      })
    }
  }, [pathname])

  const toggle = useCallback((key: string) => {
    setClosed(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      try { localStorage.setItem(STORE_KEY, JSON.stringify([...next])) } catch { }
      return next
    })
  }, [])

  // أقل صلاحية عند غياب الملف الشخصي (fail-closed) — يطابق إنفاذ الخادم.
  // الأدمن الحقيقي يملك صف profiles فعلي فيمرّ دوره كما هو.
  const currentRole = profile?.role || 'staff'

  const visible = (item: { cap?: string }) => {
    if (!item.cap) return true
    if (item.cap === '*') return currentRole === 'super_admin' || currentRole === 'admin'
    return can(currentRole, item.cap)
  }

  const isActive = (leaf: NavLeaf) => {
    const [base, query] = leaf.href.split('?')
    if (query) {
      const want = new URLSearchParams(query).get('type')
      return pathname === base && typeParam === want
    }
    if (base === '/commercial') {
      return pathname === base && !typeParam
    }
    if (base === '/settings') {
      return pathname === '/settings'
    }
    return pathname === base || (base !== '/' && pathname.startsWith(base + '/'))
  }

  const renderLeaf = (leaf: NavLeaf, sub: boolean) => {
    const active = isActive(leaf)
    return (
      <Link
        key={leaf.key}
        href={leaf.href}
        onClick={onNavigate}
        className={`nav-item${sub ? ' sub' : ' hover:-translate-x-0.5'} transition duration-150`}
        aria-current={active ? 'page' : undefined}
      >
        {sub && (
          <span className="nav-tree-node">
            <span className="nav-tree-dot" />
          </span>
        )}
        {!sub && leaf.icon && <Icon name={leaf.icon} className="icon shrink-0" />}
        <span className="truncate flex-1 text-right">{leaf.label}</span>
        {leaf.count !== undefined && (
          <span className={`nav-num transition-colors ${active ? 'font-bold text-[var(--accent)]' : ''}`}>
            {leaf.count}
          </span>
        )}
        {badges[leaf.key] ? (
          <span className="nav-badge animate-pulse">
            {badges[leaf.key]}
          </span>
        ) : null}
      </Link>
    )
  }

  const renderGroup = (g: NavGroup) => {
    const extra = g.withTxTypes ? txTypeLeaves(txCounts) : []
    const items = [...g.items, ...extra].filter(visible)
    if (!items.length) return null

    const shut = ready && !!g.label && closed.has(g.key)
    const body = items.map(i => renderLeaf(i, !!g.href))

    if (!g.label) {
      return <div className="nav-group" key={g.key}>{body}</div>
    }

    return (
      <div className="nav-group" key={g.key}>
        {g.href ? (
          <div className="nav-head-row group">
            <Link
              href={g.href}
              onClick={onNavigate}
              className="nav-item nav-item-head transition duration-150 hover:-translate-x-0.5"
              aria-current={
                pathname === g.href && !typeParam ? 'page' : undefined
              }
            >
              {g.icon && <Icon name={g.icon} className="icon shrink-0" />}
              <span className="truncate flex-1 text-right">{g.label}</span>
            </Link>
            <button
              type="button"
              className="nav-toggle transition-transform duration-150 hover:scale-105 cursor-pointer"
              onClick={() => toggle(g.key)}
              aria-expanded={!shut}
              aria-label={`طيّ ${g.label}`}
            >
              <Icon name="chev" className={`icon chev transition-transform duration-200 ${shut ? 'rotate-90' : 'rotate-0'}`} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="nav-group-head transition-colors duration-150 hover:text-[var(--text)] cursor-pointer"
            onClick={() => toggle(g.key)}
            aria-expanded={!shut}
          >
            <span className="text-right flex-1">{g.label}</span>
            <Icon name="chev" className={`icon chev transition-transform duration-200 ${shut ? 'rotate-90' : 'rotate-0'}`} />
          </button>
        )}

        <div className={`nav-body${shut ? '' : ' open'}`}>
          <div className={g.href ? 'nav-sub' : undefined}>{body}</div>
        </div>
      </div>
    )
  }

  return (
    <aside id="sidebar" className="transition-all duration-300">
      {/* Brand Header with Refined Luxury Styling */}
      <div className="side-head group cursor-default">
        <div className="w-[38px] h-[38px] rounded-xl bg-gradient-to-br from-white/10 to-white/[0.03] border border-white/15 p-1 flex items-center justify-center shadow-2xs group-hover:scale-105 group-hover:border-[color:color-mix(in_srgb,var(--accent)_50%,transparent)] transition-all duration-300 flex-none overflow-hidden">
          <Image
            src="/logo.png"
            alt="شعار مكتب المحامي عبدالحسن الخزرجي"
            width={34}
            height={34}
            className="w-full h-full object-contain filter drop-shadow-2xs"
            priority
          />
        </div>
        <div className="flex-1 min-w-0 pr-0.5">
          <div className="side-name tracking-tight font-black text-[13px] text-[var(--text)] leading-snug">
            مكتب المحامي عبدالحسن الخزرجي
          </div>
          <div className="side-role text-[10px] text-[var(--text-3)] font-bold mt-0.5 tracking-wide">
            للمحاماة والاستشارات القانونية
          </div>
        </div>
      </div>

      <nav className="side-nav" aria-label="أقسام التطبيق">
        {NAV.map(renderGroup)}
        <DeadlineCard deadlines={deadlines} item={deadline} />
      </nav>
    </aside>
  )
}
