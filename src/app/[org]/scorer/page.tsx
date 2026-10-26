import Link from 'next/link'
import { requireRole } from '@/lib/auth'
import { scopedMatches, slotLabel } from '@/lib/data'
import BracketTabs from '@/components/BracketTabs'
import Breadcrumbs from '@/components/Breadcrumbs'
import StatusChip from '@/components/StatusChip'
import { muted } from '@/lib/ui'

export const dynamic = 'force-dynamic'

export default async function ScorerHome({ params, searchParams }: { params: Promise<{ org: string }>; searchParams: Promise<{ b?: string }> }) {
  const { org: slug } = await params
  await requireRole(slug, ['admin', 'scorer'])
  const { b } = await searchParams
  const { brackets, bracket, isP, matches } = await scopedMatches(slug, b)
  if (!bracket && !isP) return <p>No bracket yet.</p>
  return (
    <>
      <Breadcrumbs items={[{ label: 'Group', href: `/${slug}` }, { label: 'Score' }]} />
      <h1 className="text-2xl font-bold md:text-3xl">Pick a game to score</h1>
      <BracketTabs base={`/${slug}/scorer`} brackets={brackets} current={isP ? 'P' : bracket.name} playoffs />
      <div className="grid gap-2 md:grid-cols-2">
        {matches.map((m) => {
          const ready = m.team1_id && m.team2_id && m.status !== 'final'
          const body = (
            <div className="flex min-h-11 items-center justify-between gap-3 rounded-xl bg-[var(--card)] px-4 py-2.5">
              <div><div className={`text-xs ${muted}`}>Game {m.game_no} · {m.round}{m.court ? ` · Court ${m.court}` : ''}</div>
                <div className="font-semibold">{slotLabel(m, 1)} vs {slotLabel(m, 2)}</div></div>
              <div className="text-right">{m.status === 'final' && <div className="mb-1 text-sm font-bold">{m.score1}–{m.score2}</div>}
                {m.status === 'scheduled' && !ready ? <span className="rounded-full bg-[var(--chip)] px-3 py-1.5 text-xs font-bold">Waiting</span> : <StatusChip status={m.status} />}</div>
            </div>
          )
          return ready ? <Link key={m.id} href={`/${slug}/scorer/${m.id}`}>{body}</Link> : <div key={m.id}>{body}</div>
        })}
      </div>
      {matches.length === 0 && <p className={`text-sm ${muted}`}>No games here yet. An admin adds them under Admin, Matches.</p>}
    </>
  )
}
