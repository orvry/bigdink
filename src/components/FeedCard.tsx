import Link from 'next/link'
import JoinActions from '@/components/JoinActions'
import { card, muted } from '@/lib/ui'
import type { FeedRow } from '@/lib/types'

/** One tournament in a feed (home page and group page). member and registered tell it which buttons to show. */
export default function FeedCard({ t, member, registered }: { t: FeedRow; member: boolean; registered: boolean }) {
  const status = t.champion ? 'Completed' : t.live > 0 ? 'Live now' : t.played > 0 ? 'In progress' : 'Upcoming'
  const chip = t.live > 0 && !t.champion ? 'bg-[var(--live)] text-[color:var(--on-live)]' : 'bg-[var(--chip)]'
  return (
    <article className={`${card} flex flex-col gap-3 overflow-hidden !p-0`}>
      {t.banner_url && <div role="img" aria-label={`${t.name} banner`} className="h-32 w-full bg-[var(--chip)] bg-cover bg-center md:h-40" style={{ backgroundImage: `url(${t.banner_url})` }} />}
      <div className="flex flex-col gap-3 p-4 md:p-5">
        <header className="flex items-center gap-3">
          <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)] font-bold text-[color:var(--on-primary)]">{t.org_name.slice(0, 1).toUpperCase()}</span>
          <div className="flex-1">
            <Link href={`/${t.org_slug}`} className="font-semibold hover:underline">{t.org_name}</Link>
            <div className={`text-xs ${muted}`}>{t.date ?? 'Date to be announced'}</div>
          </div>
          <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${chip}`}>{status}</span>
        </header>
        <h2 className="text-lg font-bold">{t.name}</h2>
        {t.description && <p className={`line-clamp-2 text-sm ${muted}`}>{t.description}</p>}
        <p className={`text-sm ${muted}`}>{t.teams} teams · {t.games} games · {t.played} played{t.live > 0 ? ` · ${t.live} in play now` : ''}</p>
        {t.champion && <p className="text-sm"><span className={muted}>Champions:</span> <b>{t.champion}</b></p>}
        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
          <Link href={`/${t.org_slug}/t/${t.id}`} className="inline-flex h-10 items-center rounded-xl border border-[color:var(--ink)] px-4">{t.live > 0 ? 'Watch live' : 'View tournament'}</Link>
          <Link href={`/${t.org_slug}/t/${t.id}/standings`} className="px-2 py-2.5 text-[color:var(--link)]">Standings</Link>
          {!t.champion && <span className="ml-auto flex flex-wrap items-center gap-2"><JoinActions slug={t.org_slug} tid={t.id} member={member} registered={registered} open={t.registration_open} /></span>}
        </div>
      </div>
    </article>
  )
}
