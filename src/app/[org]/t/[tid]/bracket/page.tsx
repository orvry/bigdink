import Link from 'next/link'
import { getTournamentContext, pickBracket, MATCH_SELECT, slotLabel } from '@/lib/data'
import { computeMvps, getChampion } from '@/lib/stats'
import BracketTabs from '@/components/BracketTabs'
import Breadcrumbs from '@/components/Breadcrumbs'
import ChampionBanner from '@/components/ChampionBanner'
import MvpPanel from '@/components/MvpPanel'
import { muted } from '@/lib/ui'
import type { Match, Team } from '@/lib/types'

export const dynamic = 'force-dynamic'

function Game({ m, base }: { m: Match; base: string }) {
  const row = (n: 1 | 2) => {
    const win = m.status === 'final' && m.winner_id === (n === 1 ? m.team1_id : m.team2_id)
    return (
      <div className={`flex justify-between gap-2 px-2.5 py-1 ${win ? 'font-bold' : ''}`}>
        <span className="truncate">{slotLabel(m, n)}</span><span>{m.status === 'scheduled' ? '' : n === 1 ? m.score1 : m.score2}</span>
      </div>
    )
  }
  const border = m.status === 'live' ? 'border-[color:var(--green)]' : m.status === 'paused' ? 'border-[color:var(--gold)]' : 'border-[color:var(--line)]'
  return (
    <Link href={`${base}/live/${m.id}`} className={`block w-full rounded-xl border-[1.5px] bg-[var(--card)] text-[13px] ${border}`}>
      <div className={`px-2.5 pt-1 text-[11px] ${muted}`}>Game {m.game_no}{m.status === 'paused' ? ' · paused' : ''}</div>
      {row(1)}{row(2)}
    </Link>
  )
}

export default async function Bracket({ params, searchParams }: { params: Promise<{ org: string; tid: string }>; searchParams: Promise<{ b?: string }> }) {
  const { org: slug, tid } = await params
  const { b } = await searchParams
  const { sb, org, brackets } = await getTournamentContext(slug, tid)
  const bracket = pickBracket(brackets, b)
  const base = `/${slug}/t/${tid}`
  if (!bracket) return <p>No bracket yet.</p>
  const [{ data: rr }, { data: po }, { data: teams }, { data: pts }] = await Promise.all([
    sb.from('matches').select(MATCH_SELECT).eq('bracket_id', bracket.id).eq('round', 'Round robin').order('game_no'),
    sb.from('matches').select(MATCH_SELECT).eq('tournament_id', tid).is('bracket_id', null).order('game_no'),
    sb.from('teams').select('*').eq('bracket_id', bracket.id),
    sb.from('player_points').select('team_id,player,points').eq('tournament_id', tid),
  ])
  const playoffs = (po ?? []) as Match[]
  const champion = getChampion(playoffs)
  const mvps = computeMvps(pts ?? [], (teams ?? []) as Team[])
  const col = (rounds: string[]) => playoffs.filter((m) => rounds.includes(m.round))
  return (
    <>
      <Breadcrumbs items={[{ label: org.name, href: `/${slug}` }, { label: 'Tournament', href: base }, { label: `Bracket ${bracket.name}` }]} />
      <h1 className="text-2xl font-bold md:text-3xl">Bracket</h1>
      {champion && <ChampionBanner c={champion} />}
      <BracketTabs base={`${base}/bracket`} brackets={brackets} current={bracket.name} />
      <h2 className="mt-2 font-bold">Round robin · Bracket {bracket.name}</h2>
      <p className={`text-xs ${muted}`}>Tap a game for its live score. Green outline is live, bold is the winner.</p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {((rr ?? []) as Match[]).map((m) => <Game key={m.id} m={m} base={base} />)}
      </div>
      {(rr ?? []).length === 0 && <p className={`text-sm ${muted}`}>No games added yet.</p>}
      <MvpPanel title={`Bracket ${bracket.name} MVP`} stats={mvps} />
      <h2 className="mt-4 font-bold">Playoffs</h2>
      <p className={`text-xs ${muted}`}>The top 2 teams from each bracket fill the semifinals when their round robin ends.</p>
      <div className="grid grid-cols-2 gap-6 md:max-w-2xl md:gap-12">
        <div className="flex flex-col justify-around gap-3"><div className={`text-xs font-bold ${muted}`}>Semifinals</div>{col(['Semifinals']).map((m) => <Game key={m.id} m={m} base={base} />)}</div>
        <div className="flex flex-col justify-around gap-3"><div className={`text-xs font-bold ${muted}`}>Final and 3rd place</div>{col(['Final', '3rd place']).map((m) => <div key={m.id}><div className={`mb-1 text-[11px] ${muted}`}>{m.round}</div><Game m={m} base={base} /></div>)}</div>
      </div>
    </>
  )
}
