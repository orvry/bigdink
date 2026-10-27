'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarDays, CreditCard, Layers, LayoutDashboard, Monitor, Network, Settings, Swords, Trophy, UserCog, Users, Wallet } from 'lucide-react'
import type { Role } from '@/lib/types'

const ICONS = { dashboard: LayoutDashboard, standings: Trophy, brackets: Network, screen: Monitor, tournaments: Layers, matches: Swords, teams: Users, schedule: CalendarDays, expenses: Wallet, members: UserCog, billing: CreditCard, settings: Settings }

type Item = { label: string; icon: keyof typeof ICONS; scope: 't' | 'org'; path: string; exact?: boolean; show: boolean }

/** Sidebar links. Tournament links follow the tournament in the address bar, or the group's active one. */
export default function SidebarNav({ slug, defaultTid, role, rentalActive }: { slug: string; defaultTid: string | null; role: Role; rentalActive: boolean }) {
  const pathname = usePathname()
  const tid = pathname.match(/^\/[^/]+\/t\/([^/]+)/)?.[1] ?? defaultTid
  const score = rentalActive && role !== 'viewer'
  const manage = rentalActive && role === 'admin'
  const hasT = Boolean(tid)

  const groups: { title?: string; items: Item[] }[] = [
    { items: [{ label: 'Tournaments', icon: 'tournaments', scope: 'org', path: '', exact: true, show: true }] },
    { title: 'Tournament', items: [
      { label: 'Dashboard', icon: 'dashboard', scope: 't', path: '', exact: true, show: hasT },
      { label: 'Standings', icon: 'standings', scope: 't', path: '/standings', show: hasT },
      { label: 'Brackets', icon: 'brackets', scope: 't', path: '/bracket', show: hasT },
      { label: 'Big screen', icon: 'screen', scope: 't', path: '/screen', show: hasT },
    ] },
    { title: 'Manage', items: [
      { label: 'Matches', icon: 'matches', scope: 'org', path: '/scorer', show: score },
      { label: 'Players & Teams', icon: 'teams', scope: 'org', path: '/admin/teams', show: manage },
      { label: 'Schedule', icon: 'schedule', scope: 'org', path: '/admin/matches', show: manage },
      { label: 'Expenses', icon: 'expenses', scope: 'org', path: '/admin/expenses', show: manage },
      { label: 'Members', icon: 'members', scope: 'org', path: '/admin/users', show: manage },
      { label: 'Billing', icon: 'billing', scope: 'org', path: '/admin/billing', show: role === 'admin' },
      { label: 'Settings', icon: 'settings', scope: 'org', path: '/admin', exact: true, show: manage },
    ] },
  ]

  return (
    <nav aria-label="Main" className="flex flex-col gap-4">
      {groups.map((g, gi) => {
        const items = g.items.filter((i) => i.show)
        if (items.length === 0) return null
        return (
          <div key={gi} className="flex flex-col gap-1">
            {g.title && <div className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">{g.title}</div>}
            <ul className="flex flex-col gap-1">
              {items.map((i) => {
                const href = i.scope === 't' ? `/${slug}/t/${tid}${i.path}` : `/${slug}${i.path}`
                const active = i.exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
                const Icon = ICONS[i.icon]
                return (
                  <li key={i.label}>
                    <Link href={href} aria-current={active ? 'page' : undefined}
                      className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors ${active ? 'bg-[var(--nav-active-bg)] text-[color:var(--nav-active-text)]' : 'text-[color:var(--ink)] hover:bg-[var(--chip)]'}`}>
                      <Icon aria-hidden="true" size={20} />{i.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </nav>
  )
}
