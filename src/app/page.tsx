import Link from 'next/link'
import { getContext, MATCH_SELECT, slotLabel } from '@/lib/data'
import { card, num, btn, muted } from '@/lib/ui'

export const dynamic = 'force-dynamic'

export default async function Summary() {
  const { sb, active, brackets } = await getContext()
  if (!active) return <p>No tournament yet. An admin can create one in Admin.</p>
  const { data } = await sb.from('matches').select(MATCH_SELECT).eq('tournament_id', active.id).order('game_no')
  const matches = data ?? []
  const done = matches.filter((m) => m.status === 'final').length
  const live = matches.filter((m) => m.status === 'live' || m.status === 'paused')
  const stat = (v: number, l: string) => (
    <div className={`${card} flex-1`}><div className={`${num} text-[44px]`}>{v}</div><div className={`text-xs ${muted}`}>{l}</div></div>
  )
  return (
    <>
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{active.name}</h1>
        <p className={`text-sm ${muted}`}>{brackets.length} brackets, {matches.length} games. Top 2 per bracket reach the semifinals.</p>
      </div>
      <div className="flex gap-2 md:gap-4">{stat(done, 'Played')}{stat(live.length, 'In play')}{stat(matches.length - done, 'Remaining')}</div>
      <div className="grid gap-3 md:grid-cols-2 md:gap-4">
        {brackets.map((b) => {
          const ms = matches.filter((m) => m.bracket_id === b.id)
          const d = ms.filter((m) => m.status === 'final').length
          return (
            <Link key={b.id} href={`/bracket?b=${b.name}`} className={`${card} block transition-colors hover:border-[color:var(--green)]`}>
              <div className="flex justify-between"><b>Bracket {b.name}</b><span className={`text-sm ${muted}`}>{d} of {ms.length} games</span></div>
              <div className="my-2 h-2 rounded-full bg-[var(--chip)]"><div className="h-2 rounded-full bg-[#1F7A4D]" style={{ width: `${ms.length ? (d / ms.length) * 100 : 0}%` }} /></div>
              <div className="text-sm font-semibold text-[color:var(--link)]">View bracket and results</div>
            </Link>
          )
        })}
      </div>
      <h2 className="mt-2 text-sm font-bold">In play now</h2>
      {live.length === 0 && <p className={`text-sm ${muted}`}>No games are being played right now.</p>}
      <div className="grid gap-2 md:grid-cols-2">
        {live.map((m) => (
          <Link key={m.id} href={`/live/${m.id}`} className="flex items-center justify-between rounded-xl bg-[var(--card)] px-4 py-3 text-sm">
            <span>{slotLabel(m, 1)} vs {slotLabel(m, 2)}{m.status === 'paused' ? ' (paused)' : ''}</span><b>{m.score1}–{m.score2}</b>
          </Link>
        ))}
      </div>
      <Link href="/bracket" className={`${btn} md:self-start`}>View bracket</Link>
    </>
  )
}
