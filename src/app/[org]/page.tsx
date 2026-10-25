import Link from 'next/link'
import { getContext, MATCH_SELECT, slotLabel } from '@/lib/data'
import { computeMvps, getChampion } from '@/lib/stats'
import ChampionBanner from '@/components/ChampionBanner'
import MvpPanel from '@/components/MvpPanel'
import { card, num, btn, btn2, muted } from '@/lib/ui'
import type { Match, Team } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function Summary({ params }: { params: Promise<{ org: string }> }) {
  const { org: slug } = await params
  const { sb, org, active, brackets } = await getContext(slug)
  const base = `/${slug}`
  if (!active) return <p>{org.name} has no tournament yet. An admin can create one under Admin.</p>

  const [{ data }, { data: teams }, { data: pts }] = await Promise.all([
    sb.from('matches').select(MATCH_SELECT).eq('tournament_id', active.id).order('game_no'),
    sb.from('teams').select('*').eq('tournament_id', active.id),
    sb.from('player_points').select('team_id,player,points').eq('tournament_id', active.id),
  ])
  const matches = (data ?? []) as Match[]
  const champion = getChampion(matches.filter((m) => m.bracket_id === null))
  const mvps = computeMvps(pts ?? [], (teams ?? []) as Team[])
  const done = matches.filter((m) => m.status === 'final').length
  const live = matches.filter((m) => m.status === 'live' || m.status === 'paused')
  const stat = (v: number, l: string) => (
    <div className={`${card} flex-1`}><div className={`${num} text-[44px]`}>{v}</div><div className={`text-xs ${muted}`}>{l}</div></div>
  )
  return (
    <>
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{active.name}</h1>
        <p className={`text-sm ${muted}`}>{brackets.length} bracket{brackets.length === 1 ? '' : 's'}, {matches.length} games. Top 2 per bracket reach the semifinals.</p>
      </div>
      {champion && <ChampionBanner c={champion} />}
      <div className="flex gap-2 md:gap-4">{stat(done, 'Played')}{stat(live.length, 'In play')}{stat(matches.length - done, 'Remaining')}</div>
      <div className="grid gap-3 md:grid-cols-2 md:gap-4">
        {brackets.map((b) => {
          const ms = matches.filter((m) => m.bracket_id === b.id)
          const d = ms.filter((m) => m.status === 'final').length
          return (
            <Link key={b.id} href={`${base}/bracket?b=${b.name}`} className={`${card} block transition-colors hover:border-[color:var(--green)]`}>
              <div className="flex justify-between"><b>Bracket {b.name}</b><span className={`text-sm ${muted}`}>{d} of {ms.length} games</span></div>
              <div className="my-2 h-2 rounded-full bg-[var(--chip)]"><div className="h-2 rounded-full bg-[#1F7A4D]" style={{ width: `${ms.length ? (d / ms.length) * 100 : 0}%` }} /></div>
              <div className="text-sm font-semibold text-[color:var(--link)]">View bracket and results</div>
            </Link>
          )
        })}
      </div>
      <MvpPanel title={champion ? 'Tournament MVP' : 'MVP race'} stats={mvps} />
      <h2 className="mt-2 text-sm font-bold">In play now</h2>
      {live.length === 0 && <p className={`text-sm ${muted}`}>No games are being played right now.</p>}
      <div className="grid gap-2 md:grid-cols-2">
        {live.map((m) => (
          <Link key={m.id} href={`${base}/live/${m.id}`} className="flex items-center justify-between rounded-xl bg-[var(--card)] px-4 py-3 text-sm">
            <span>{slotLabel(m, 1)} vs {slotLabel(m, 2)}{m.status === 'paused' ? ' (paused)' : ''}</span><b>{m.score1}–{m.score2}</b>
          </Link>
        ))}
      </div>
      <div className="flex flex-col gap-2 md:flex-row">
        <Link href={`${base}/bracket`} className={btn}>View bracket</Link>
        <a href={`${base}/report`} download className={btn2}>Download PDF report</a>
      </div>
    </>
  )
}
