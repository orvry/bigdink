import { getContext, pickBracket, MATCH_SELECT, slotLabel } from '@/lib/data'
import BracketTabs from '@/components/BracketTabs'
import Breadcrumbs from '@/components/Breadcrumbs'
import type { Match } from '@/lib/types'
import { muted } from '@/lib/ui'

export const dynamic = 'force-dynamic'

function Game({ m }: { m: Match }) {
  const row = (n: 1 | 2) => {
    const win = m.status === 'final' && m.winner_id === (n === 1 ? m.team1_id : m.team2_id)
    return (
      <div className={`flex justify-between gap-2 px-2.5 py-1 ${win ? 'font-bold' : ''}`}>
        <span className="truncate">{slotLabel(m, n)}</span><span>{m.status === 'scheduled' ? '' : n === 1 ? m.score1 : m.score2}</span>
      </div>
    )
  }
  const border = m.status === 'live' ? 'border-[color:var(--green)]' : m.status === 'paused' ? 'border-[#F5C84C]' : 'border-[color:var(--line)]'
  return (
    <a href={`/live/${m.id}`} className={`block w-full rounded-xl border-[1.5px] bg-[var(--card)] text-[13px] ${border}`}>
      <div className={`px-2.5 pt-1 text-[11px] ${muted}`}>Game {m.game_no}{m.status === 'paused' ? ' · paused' : ''}</div>
      {row(1)}{row(2)}
    </a>
  )
}

export default async function Bracket({ searchParams }: { searchParams: Promise<{ b?: string }> }) {
  const { b } = await searchParams
  const { sb, active, brackets } = await getContext()
  const bracket = pickBracket(brackets, b)
  if (!active || !bracket) return <p>No bracket yet.</p>
  const [{ data: rr }, { data: po }] = await Promise.all([
    sb.from('matches').select(MATCH_SELECT).eq('bracket_id', bracket.id).eq('round', 'Round robin').order('game_no'),
    sb.from('matches').select(MATCH_SELECT).eq('tournament_id', active.id).is('bracket_id', null).order('game_no'),
  ])
  const col = (rounds: string[]) => (po ?? []).filter((m) => rounds.includes(m.round))
  return (
    <>
      <Breadcrumbs items={[{ label: 'Summary', href: '/' }, { label: `Bracket ${bracket.name}` }]} />
      <h1 className="text-2xl font-bold md:text-3xl">Bracket</h1>
      <BracketTabs base="/bracket" brackets={brackets} current={bracket.name} />
      <h2 className="mt-2 font-bold">Round robin · Bracket {bracket.name}</h2>
      <p className={`text-xs ${muted}`}>Tap a game for its live score. Green outline is live, bold is the winner.</p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {(rr ?? []).map((m) => <Game key={m.id} m={m} />)}
      </div>
      {(rr ?? []).length === 0 && <p className={`text-sm ${muted}`}>No games added yet.</p>}
      <h2 className="mt-4 font-bold">Playoffs</h2>
      <p className={`text-xs ${muted}`}>The top 2 teams from each bracket fill the semifinals when their round robin ends.</p>
      <div className="grid grid-cols-2 gap-6 md:max-w-2xl md:gap-12">
        <div className="flex flex-col justify-around gap-3"><div className={`text-xs font-bold ${muted}`}>Semifinals</div>{col(['Semifinals']).map((m) => <Game key={m.id} m={m} />)}</div>
        <div className="flex flex-col justify-around gap-3"><div className={`text-xs font-bold ${muted}`}>Final and 3rd place</div>{col(['Final', '3rd place']).map((m) => <div key={m.id}><div className={`mb-1 text-[11px] ${muted}`}>{m.round}</div><Game m={m} /></div>)}</div>
      </div>
    </>
  )
}
