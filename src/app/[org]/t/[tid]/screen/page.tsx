import Link from 'next/link'
import { getTournamentContext, MATCH_SELECT, slotLabel, rulesOf } from '@/lib/data'
import { computeStandings } from '@/lib/standings'
import { getChampion } from '@/lib/stats'
import { gamePoint } from '@/lib/rules'
import LiveRefresh from '@/components/LiveRefresh'
import FullscreenButton from '@/components/FullscreenButton'
import StatusChip from '@/components/StatusChip'
import { num, muted } from '@/lib/ui'
import type { Match, Team } from '@/lib/types'

export const dynamic = 'force-dynamic'

/** Big-screen mode for a TV or projector: scores side by side, standings on the right. Updates by itself. */
export default async function Screen({ params }: { params: Promise<{ org: string; tid: string }> }) {
  const { org: slug, tid } = await params
  const { sb, org, tournament, brackets } = await getTournamentContext(slug, tid)
  const [{ data: ms }, { data: tm }] = await Promise.all([
    sb.from('matches').select(MATCH_SELECT).eq('tournament_id', tid).order('game_no'),
    sb.from('teams').select('*').eq('tournament_id', tid),
  ])
  const matches = (ms ?? []) as Match[]
  const teams = (tm ?? []) as Team[]
  const champion = getChampion(matches.filter((m) => m.bracket_id === null))
  const playing = matches.filter((m) => m.status === 'live' || m.status === 'paused')
  const upNext = matches.filter((m) => m.status === 'scheduled' && m.team1_id && m.team2_id).slice(0, 4)
  const results = matches.filter((m) => m.status === 'final').sort((a, b) => b.game_no - a.game_no).slice(0, 4)
  const { ptw, wb } = rulesOf(matches[0] ?? {})
  const names = (t?: Team | null) => [t?.player1, t?.player2].filter(Boolean).join(' & ')

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-[var(--bg)] p-4 md:p-8">
      <LiveRefresh tournamentId={tid} />
      <header className="mb-4 flex flex-wrap items-center gap-3 md:mb-6">
        <div className="flex-1">
          <div className={`text-sm md:text-lg ${muted}`}>{org.name}</div>
          <h1 className="text-2xl font-bold md:text-5xl">{tournament.name}</h1>
        </div>
        <FullscreenButton />
        <Link href={`/${slug}/t/${tid}`} className="flex h-11 items-center rounded-xl border border-[color:var(--ink)] px-4 text-sm font-semibold">Exit</Link>
      </header>

      {champion && (
        <section aria-label="Champions" className="mb-4 rounded-3xl bg-[var(--solid)] p-6 text-center text-[color:var(--on-solid)] md:mb-6 md:p-10">
          <div className="text-sm font-bold tracking-widest md:text-xl">TOURNAMENT CHAMPIONS</div>
          <div className={`${num} my-2 text-[clamp(3rem,8vw,8rem)]`}>{champion.champ.name}</div>
          <div className="text-lg md:text-2xl">{names(champion.champ)}</div>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-3 lg:gap-8">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <h2 className="text-lg font-bold md:text-2xl">Now playing</h2>
          {playing.length === 0 && <p className={`rounded-3xl border border-[color:var(--line)] bg-[var(--card)] p-6 text-lg ${muted}`}>No game in play right now.</p>}
          {playing.map((m) => {
            const lead1 = m.score1 > m.score2, lead2 = m.score2 > m.score1
            const gp = m.status === 'live' && gamePoint(m.score1, m.score2, ptw, wb)
            return (
              <article key={m.id} className="rounded-3xl border border-[color:var(--line)] bg-[var(--card)] p-5 md:p-8">
                <div className={`mb-3 flex flex-wrap items-center gap-3 text-sm md:text-xl ${muted}`}>
                  <StatusChip status={m.status} /><span>Game {m.game_no} · {m.round}{m.court ? ` · Court ${m.court}` : ''}</span>
                  {gp && <b className="text-[color:var(--ink)]">Game point</b>}
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 md:gap-8">
                  <div className="text-right"><div className="text-xl font-bold md:text-4xl">{slotLabel(m, 1)}</div><div className={`text-sm md:text-xl ${muted}`}>{names(m.team1)}</div></div>
                  <div className={`${num} flex items-center gap-3 text-[clamp(3.5rem,9vw,9rem)] md:gap-6`}>
                    <span className={lead2 ? muted : ''}>{m.score1}</span><span className={muted}>–</span><span className={lead1 ? muted : ''}>{m.score2}</span>
                  </div>
                  <div><div className="text-xl font-bold md:text-4xl">{slotLabel(m, 2)}</div><div className={`text-sm md:text-xl ${muted}`}>{names(m.team2)}</div></div>
                </div>
              </article>
            )
          })}
          <div className="grid gap-4 md:grid-cols-2">
            <section aria-label="Up next" className="rounded-2xl border border-[color:var(--line)] bg-[var(--card)] p-4">
              <h2 className="mb-2 font-bold md:text-xl">Up next</h2>
              {upNext.length === 0 && <p className={`text-sm ${muted}`}>Nothing scheduled.</p>}
              {upNext.map((m) => <div key={m.id} className="flex justify-between gap-2 py-1 text-sm md:text-lg"><span>{slotLabel(m, 1)} vs {slotLabel(m, 2)}</span><span className={muted}>{m.court ? `Court ${m.court}` : ''}{m.starts_at ? ` ${m.starts_at}` : ''}</span></div>)}
            </section>
            <section aria-label="Latest results" className="rounded-2xl border border-[color:var(--line)] bg-[var(--card)] p-4">
              <h2 className="mb-2 font-bold md:text-xl">Latest results</h2>
              {results.length === 0 && <p className={`text-sm ${muted}`}>No finished games yet.</p>}
              {results.map((m) => <div key={m.id} className="flex justify-between gap-2 py-1 text-sm md:text-lg"><span>{slotLabel(m, 1)} vs {slotLabel(m, 2)}</span><b>{m.score1}–{m.score2}</b></div>)}
            </section>
          </div>
        </div>

        <aside aria-label="Standings" className="flex flex-col gap-4">
          <h2 className="text-lg font-bold md:text-2xl">Standings</h2>
          {brackets.map((b) => {
            const rows = computeStandings(teams.filter((t) => t.bracket_id === b.id), matches.filter((m) => m.bracket_id === b.id && m.round === 'Round robin'))
            return (
              <section key={b.id} className="rounded-2xl border border-[color:var(--line)] bg-[var(--card)] p-4">
                <h3 className="mb-2 font-bold md:text-xl">Bracket {b.name}</h3>
                <table className="w-full text-left text-sm md:text-lg">
                  <thead className={`text-xs md:text-base ${muted}`}><tr><th className="py-1">#</th><th>Team</th><th className="text-right"><abbr title="Wins">W</abbr></th><th className="text-right"><abbr title="Losses">L</abbr></th><th className="text-right"><abbr title="Points for">PF</abbr></th></tr></thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={r.team.id} className={`border-t border-[color:var(--line)] ${i < 2 ? 'font-semibold' : ''}`}>
                        <td className="py-1.5">{i + 1}</td><td>{r.team.name}{i < 2 ? ' ✓' : ''}</td><td className="text-right">{r.w}</td><td className="text-right">{r.l}</td><td className="text-right">{r.pf}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )
          })}
          <p className={`text-xs md:text-base ${muted}`}>✓ = advances to the semifinals</p>
        </aside>
      </div>
    </div>
  )
}
