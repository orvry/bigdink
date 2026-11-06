import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth'
import PersonalStats from '@/components/PersonalStats'
import Breadcrumbs from '@/components/Breadcrumbs'
import { btn2, card, muted } from '@/lib/ui'
import type { HistoryRow, PublicProfile } from '@/lib/types'

export const dynamic = 'force-dynamic'

type StatsRow = { t_tournaments: number; t_games: number; t_wins: number; t_points: number; t_titles: number; t_casual: number }

export default async function PublicProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params
  const sb = await createClient()
  const { data } = await sb.rpc('get_public_profile', { p_handle: handle })
  const p = (data as PublicProfile[] | null)?.[0]
  if (!p) notFound()
  const me = await getUser()
  const [{ data: st }, { data: hist }] = await Promise.all([sb.rpc('profile_stats', { p_user: p.id }), sb.rpc('profile_history', { p_user: p.id })])
  const s = (st as StatsRow[] | null)?.[0]
  const history = (hist ?? []) as HistoryRow[]
  const name = p.display_name || p.handle

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs items={[{ label: 'All tournaments', href: '/' }, { label: name }]} />
      <header className={`${card} flex flex-wrap items-center gap-4`}>
        <span aria-hidden="true" className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] bg-cover bg-center text-2xl font-bold text-[color:var(--on-primary)]" style={p.avatar_url ? { backgroundImage: `url(${p.avatar_url})` } : undefined}>{p.avatar_url ? '' : name.slice(0, 2).toUpperCase()}</span>
        <div className="min-w-48 flex-1">
          <h1 className="text-2xl font-bold">{name}</h1>
          <p className={`text-sm ${muted}`}>@{p.handle}{p.city ? ` · ${p.city}` : ''}</p>
          {p.bio && <p className="mt-2 text-sm">{p.bio}</p>}
        </div>
        {me?.id === p.id && <Link href="/settings/profile" className={btn2}>Edit profile</Link>}
      </header>

      {s ? (
        <PersonalStats title="Career stats" variant="wide" stats={{
          tournaments: s.t_tournaments, games: s.t_games, wins: s.t_wins, losses: s.t_games - s.t_wins, points: s.t_points, titles: s.t_titles,
          winRate: s.t_games ? Math.round((s.t_wins / s.t_games) * 100) : null, casualGames: s.t_casual,
        }} />
      ) : (
        <section className={card}><h2 className="text-lg font-bold">Career stats</h2><p className={`mt-1 text-sm ${muted}`}>{name} keeps their stats private.</p></section>
      )}

      {s && (
        <section className={card} aria-label="History">
          <h2 className="mb-3 text-lg font-bold">History</h2>
          {history.length === 0 && <p className={`text-sm ${muted}`}>No games yet.</p>}
          <ul className="flex flex-col gap-1">
            {history.map((h) => (
              <li key={`${h.tournament_id}-${h.team_name}`}>
                <Link href={h.kind === 'session' ? `/${h.org_slug}/s/${h.tournament_id}` : `/${h.org_slug}/t/${h.tournament_id}`} className="flex flex-wrap items-center gap-3 rounded-xl p-2 hover:bg-[var(--chip)]">
                  <span className="min-w-48 flex-1">
                    <span className="block font-semibold">{h.name}{h.kind === 'session' && <span className="tint-blue ml-2 rounded-full px-2 py-0.5 text-xs font-bold">Casual</span>}{h.champion && <span className="tint-gold ml-2 rounded-full px-2 py-0.5 text-xs font-bold">Champion</span>}</span>
                    <span className={`block text-xs ${muted}`}>{h.org_name} · {h.on_date ?? 'No date'} · as {h.team_name}</span>
                  </span>
                  <span className={`text-sm ${muted}`}>{h.wins} won of {h.games} · {h.points} pts</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
