'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { gamePoint } from '@/lib/rules'
import { num, muted } from '@/lib/ui'
import StatusChip from '@/components/StatusChip'
import type { Match, PlayerLine } from '@/lib/types'

type Ev = { team_id: string; player: string | null }

function ScoreRow({ name, score, lead }: { name: string; score: number; lead: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="text-lg font-bold md:text-2xl">{name}</div>
      <div className={`${num} text-[96px] md:text-[140px] ${lead ? '' : muted}`} aria-label={`${name} score`}>{score}</div>
    </div>
  )
}

const countFor = (events: Ev[], p: PlayerLine) => events.filter((e) => e.team_id === p.team_id && e.player === p.name).length

export default function LiveBoard({ initial, name1, name2, ptw, wb, players, initialEvents }: {
  initial: Match; name1: string; name2: string; ptw: number; wb: number
  players: PlayerLine[]      // each player with their tournament total as of page load (this game included)
  initialEvents: Ev[]        // every point recorded so far in this game
}) {
  const [m, setM] = useState<Match>(initial)
  const [events, setEvents] = useState<Ev[]>(initialEvents)
  const [atLoad] = useState(() => new Map(players.map((p) => [`${p.team_id}|${p.name}`, countFor(initialEvents, p)])))

  useEffect(() => {
    const sb = createClient()
    const ch = sb.channel(`match-${initial.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${initial.id}` }, (p) => {
        setM(p.new as Match)
        // a score change means points were added or undone: reload this game's points for the stats table
        sb.from('score_events').select('team_id,player').eq('match_id', initial.id).then(({ data }) => setEvents((data ?? []) as Ev[]))
      })
      .subscribe()
    return () => { sb.removeChannel(ch) }
  }, [initial.id])

  const leader = m.score1 === m.score2 ? 0 : m.score1 > m.score2 ? 1 : 2
  const winner = m.status === 'final' ? (m.winner_id === m.team1_id ? name1 : name2) : null
  const detail =
    m.status === 'final' ? `${initial.round === 'Final' ? `${winner} are the tournament champions, winning ` : `${winner} wins `}${Math.max(m.score1, m.score2)}–${Math.min(m.score1, m.score2)}`
    : m.status === 'paused' ? 'Play is paused. The score will resume shortly.'
    : m.status === 'live' ? (gamePoint(m.score1, m.score2, ptw, wb) ? 'Game point' : 'Game in progress')
    : `Not started${initial.starts_at ? ` · scheduled ${initial.starts_at}` : ''}`

  const rows = players.map((p) => {
    const game = countFor(events, p)
    return { ...p, game, total: p.total - (atLoad.get(`${p.team_id}|${p.name}`) ?? 0) + game }
  })
  const maxGame = Math.max(1, ...rows.map((r) => r.game))

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <StatusChip status={m.status} />
        <span className="font-semibold" role="status" aria-live="polite">{detail}</span>
      </div>
      <div className="rounded-2xl border border-[color:var(--line)] bg-[var(--card)] p-5 md:p-8">
        <ScoreRow name={name1} score={m.score1} lead={leader !== 2} />
        <div className="my-2 h-px bg-[var(--line)]" />
        <ScoreRow name={name2} score={m.score2} lead={leader !== 1} />
      </div>

      <section aria-label="Player stats" className="rounded-2xl border border-[color:var(--line)] bg-[var(--card)] p-4">
        <h2 className="font-bold">Player stats</h2>
        {rows.length === 0 || (events.length === 0 && rows.every((r) => r.total === 0)) ? (
          <p className={`mt-1 text-sm ${muted}`}>No player points yet. They appear as the scorer taps the player who won each point.</p>
        ) : (
          <table className="mt-2 w-full text-left text-sm">
            <thead className={`text-xs ${muted}`}><tr><th className="py-1 pr-2 font-semibold">Player</th><th className="py-1 pr-2 font-semibold">This game</th><th className="py-1 text-right font-semibold">Tournament</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.team_id}|${r.name}`} className="border-t border-[color:var(--line)]">
                  <td className="py-2 pr-2"><div className="font-semibold">{r.name}</div><div className={`text-xs ${muted}`}>{r.team}</div></td>
                  <td className="py-2 pr-2">
                    <div className="flex items-center gap-2"><span className="w-5 font-semibold">{r.game}</span>
                      <div className="h-2 flex-1 rounded-full bg-[var(--chip)]"><div className="h-2 rounded-full bg-[var(--primary)]" style={{ width: `${(r.game / maxGame) * 100}%` }} /></div></div>
                  </td>
                  <td className="py-2 text-right font-semibold">{r.total} pts</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
