'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Check, ChevronsUpDown, Layers, Trophy } from 'lucide-react'

type T = { id: string; name: string; date: string | null }

/** The card at the bottom of the sidebar. Shows the tournament you are in and lets you switch to another one. */
export default function TournamentSwitcher({ slug, tournaments, defaultTid, orgName }: { slug: string; tournaments: T[]; defaultTid: string | null; orgName: string }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  if (tournaments.length === 0) return null
  const tid = pathname.match(/^\/[^/]+\/t\/([^/]+)/)?.[1] ?? defaultTid
  const current = tournaments.find((t) => t.id === tid) ?? tournaments[0]
  return (
    <div className="relative mt-auto" onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false) }}>
      {open && (
        <div role="menu" aria-label="Switch tournament" className="absolute inset-x-0 bottom-full z-30 mb-2 max-h-72 overflow-y-auto rounded-2xl border border-[color:var(--line)] bg-[var(--elev)] p-2 shadow-lg" onClick={() => setOpen(false)}>
          <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">Switch tournament</div>
          {tournaments.map((t) => (
            <Link key={t.id} role="menuitem" href={`/${slug}/t/${t.id}`} className="flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm hover:bg-[var(--chip)]">
              <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{t.name}</span><span className="block text-xs text-[color:var(--muted)]">{t.date ?? 'No date'}</span></span>
              {t.id === current.id && <Check aria-label="Current tournament" size={16} className="text-[color:var(--link)]" />}
            </Link>
          ))}
          <Link role="menuitem" href={`/${slug}`} className="mt-1 flex min-h-11 items-center gap-2 rounded-xl border-t border-[color:var(--line)] px-2 text-sm font-semibold text-[color:var(--link)] hover:bg-[var(--chip)]"><Layers aria-hidden="true" size={16} />All tournaments</Link>
        </div>
      )}
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 rounded-2xl border border-[color:var(--line)] bg-[var(--elev)] p-3 text-left">
        <span aria-hidden="true" className="tint-gold flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"><Trophy size={20} /></span>
        <span className="min-w-0 flex-1 text-xs leading-snug">
          <span className="block truncate text-sm font-semibold">{current.name}</span>
          <span className="block text-[color:var(--muted)]">{current.date ?? 'Date to be announced'}</span>
          <span className="block truncate text-[color:var(--muted)]">{orgName}</span>
        </span>
        <ChevronsUpDown aria-hidden="true" size={16} className="shrink-0 text-[color:var(--muted)]" /><span className="sr-only">Switch tournament</span>
      </button>
    </div>
  )
}
