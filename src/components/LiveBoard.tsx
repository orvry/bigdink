'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { gamePoint } from '@/lib/rules'
import { num, muted } from '@/lib/ui'
import StatusChip from '@/components/StatusChip'
import type { Match } from '@/lib/types'

function ScoreRow({ name, score, lead }: { name: string; score: number; lead: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="text-lg font-bold md:text-2xl">{name}</div>
      <div className={`${num} text-[96px] md:text-[140px] ${lead ? '' : muted}`} aria-label={`${name} score`}>{score}</div>
    </div>
  )
}

export default function LiveBoard({ initial, name1, name2, ptw, wb }: { initial: Match; name1: string; name2: string; ptw: number; wb: number }) {
  const [m, setM] = useState<Match>(initial)
  useEffect(() => {
    const sb = createClient()
    const ch = sb.channel(`match-${initial.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${initial.id}` }, (p) => setM(p.new as Match))
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
    </div>
  )
}
