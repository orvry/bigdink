'use client'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Layers, LayoutDashboard, Menu, Network, Trophy, X } from 'lucide-react'

const noop = () => () => {}

/**
 * Phones and tablets. A menu button in the top bar opens the full sidebar as a drawer, and a bottom bar keeps the main
 * places one tap away. Both are drawn on the page body, so no parent element can clip or shrink them.
 */
export default function MobileMenu({ children, slug, defaultTid }: { children: React.ReactNode; slug: string; defaultTid: string | null }) {
  const [open, setOpen] = useState(false)
  const mounted = useSyncExternalStore(noop, () => true, () => false)
  const pathname = usePathname()
  const tid = pathname.match(/^\/[^/]+\/t\/([^/]+)/)?.[1] ?? defaultTid

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden' // the page behind does not scroll while the menu is open
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', onKey) }
  }, [open])

  const tabs = [
    { href: `/${slug}`, label: 'Tournaments', Icon: Layers, exact: true },
    ...(tid ? [
      { href: `/${slug}/t/${tid}`, label: 'Dashboard', Icon: LayoutDashboard, exact: true },
      { href: `/${slug}/t/${tid}/standings`, label: 'Standings', Icon: Trophy, exact: false },
      { href: `/${slug}/t/${tid}/bracket`, label: 'Brackets', Icon: Network, exact: false },
    ] : []),
  ]
  const tab = 'flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold'

  return (
    <div className="lg:hidden">
      <button type="button" onClick={() => setOpen(true)} aria-expanded={open} aria-label="Open menu" className="flex h-11 w-11 items-center justify-center rounded-xl border border-[color:var(--line2)]">
        <Menu aria-hidden="true" size={22} />
      </button>

      {mounted && createPortal(
        <nav aria-label="Quick navigation" className="fixed inset-x-0 bottom-0 z-30 flex border-t border-[color:var(--line)] bg-[var(--card)] pb-[env(safe-area-inset-bottom)] lg:hidden">
          {tabs.map(({ href, label, Icon, exact }) => {
            const on = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
            return (
              <Link key={href} href={href} aria-current={on ? 'page' : undefined} className={`${tab} ${on ? 'text-[color:var(--link)]' : 'text-[color:var(--muted)]'}`}>
                <Icon aria-hidden="true" size={22} />{label}
              </Link>
            )
          })}
          <button type="button" onClick={() => setOpen(true)} className={`${tab} text-[color:var(--muted)]`}><Menu aria-hidden="true" size={22} />More</button>
        </nav>,
        document.body,
      )}

      {mounted && open && createPortal(
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} aria-hidden="true" />
          <div role="dialog" aria-modal="true" aria-label="Menu" className="relative flex h-full w-72 max-w-[85vw] flex-col gap-4 overflow-y-auto bg-[var(--card)] p-4 text-[color:var(--ink)]"
            onClick={(e) => { if ((e.target as HTMLElement).closest('a')) setOpen(false) }}>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-xl"><X aria-hidden="true" size={22} /></button>
            {children}
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
