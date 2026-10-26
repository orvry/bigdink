import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getTournamentContext, MATCH_SELECT, slotLabel, rulesOf } from '@/lib/data'
import LiveBoard from '@/components/LiveBoard'
import Breadcrumbs from '@/components/Breadcrumbs'
import ShareButton from '@/components/ShareButton'
import { btn, muted } from '@/lib/ui'
import type { Match, PlayerLine, Team } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function Live({ params }: { params: Promise<{ org: string; tid: string; id: string }> }) {
  const { org: slug, tid, id } = await params
  const { sb, org } = await getTournamentContext(slug, tid)
  const { data } = await sb.from('matches').select(MATCH_SELECT).eq('id', id).eq('tournament_id', tid).maybeSingle()
  if (!data) notFound()
  const m = data as Match
  const { ptw, wb } = rulesOf(m)
  const base = `/${slug}/t/${tid}`

  const teams = [m.team1, m.team2].filter((t): t is Team => Boolean(t))
  const [{ data: ev }, { data: totals }] = await Promise.all([
    sb.from('score_events').select('team_id,player').eq('match_id', id),
    sb.from('player_points').select('team_id,player,points').eq('tournament_id', tid).in('team_id', teams.map((t) => t.id)),
  ])
  const total = new Map((totals ?? []).map((r) => [`${r.team_id}|${r.player}`, r.points as number]))
  const players: PlayerLine[] = teams.flatMap((t) =>
    [t.player1, t.player2].filter((p): p is string => Boolean(p)).map((name) => ({ team_id: t.id, team: t.name, name, total: total.get(`${t.id}|${name}`) ?? 0 })))

  return (
    <>
      <Breadcrumbs items={[{ label: org.name, href: `/${slug}` }, { label: 'Tournament', href: base }, { label: 'Live game' }]} />
      <p className={`text-sm ${muted}`}>Game {m.game_no} · {m.round}{m.court ? ` · Court ${m.court}` : ''}</p>
      <LiveBoard initial={m} name1={slotLabel(m, 1)} name2={slotLabel(m, 2)} ptw={ptw} wb={wb} players={players} initialEvents={ev ?? []} />
      <p className={`text-center text-sm ${muted}`}>First to {ptw}, win by {wb}</p>
      <div className="md:mx-auto md:w-full md:max-w-sm"><ShareButton path={`${base}/live/${id}`} title={`${slotLabel(m, 1)} vs ${slotLabel(m, 2)}`} /></div>
      <Link href={`${base}/standings`} className={`${btn} md:self-center`}>View standings</Link>
    </>
  )
}
