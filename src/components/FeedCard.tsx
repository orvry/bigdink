import Link from 'next/link'
import { card, muted } from '@/lib/ui'
import type { FeedRow } from '@/lib/types'

/** One tournament in the public feed. */
export default function FeedCard({ t }: { t: FeedRow }) {
  const status = t.champion ? 'Completed' : t.live > 0 ? 'Live now' : t.played > 0 ? 'In progress' : 'Upcoming'
  const chip = t.live > 0 && !t.champion ? 'bg-[var(--live)] text-[color:var(--on-live)]' : 'bg-[var(--chip)]'
  return (
    <article className={`${card} flex flex-col gap-3`}>
      <header className="flex items-center gap-3">
        <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1F7A4D] font-bold text-white">{t.org_name.slice(0, 1).toUpperCase()}</span>
        <div className="flex-1">
          <Link href={`/${t.org_slug}`} className="font-semibold hover:underline">{t.org_name}</Link>
          <div className={`text-xs ${muted}`}>{t.date ?? 'Date to be announced'}</div>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${chip}`}>{status}</span>
      </header>
      <h2 className="text-lg font-bold">{t.name}</h2>
      <p className={`text-sm ${muted}`}>{t.teams} teams · {t.games} games · {t.played} played{t.live > 0 ? ` · ${t.live} in play now` : ''}</p>
      {t.champion && <p className="text-sm"><span className={muted}>Champions:</span> <b>{t.champion}</b></p>}
      <div className="flex gap-2 text-sm font-semibold">
        <Link href={`/${t.org_slug}/t/${t.id}`} className="rounded-lg border border-[color:var(--ink)] px-3 py-2.5">{t.live > 0 ? 'Watch live' : 'View tournament'}</Link>
        <Link href={`/${t.org_slug}/t/${t.id}/standings`} className="px-3 py-2.5 text-[color:var(--link)]">Standings</Link>
      </div>
    </article>
  )
}
