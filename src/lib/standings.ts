import type { Match, Team } from './types'

export type Row = { team: Team; w: number; l: number; pf: number; pa: number; diff: number; via: 'h2h' | 'points' | null }

/**
 * Round-robin ranking:
 * 1. most wins
 * 2. two-way tie: winner of their head-to-head game
 * 3. three or more tied: most total points scored in the round robin
 * (leftover ties fall back to seed). Pass only round-robin matches.
 */
export function computeStandings(teams: Team[], matches: Match[]): Row[] {
  const rows = new Map<string, Row>(teams.map((t): [string, Row] => [t.id, { team: t, w: 0, l: 0, pf: 0, pa: 0, diff: 0, via: null }]))
  const h2h = new Map<string, string>()
  const key = (a: string, b: string) => [a, b].sort().join('|')
  for (const m of matches) {
    if (m.status !== 'final' || !m.team1_id || !m.team2_id) continue
    const a = rows.get(m.team1_id), b = rows.get(m.team2_id)
    if (!a || !b) continue
    a.pf += m.score1; a.pa += m.score2; b.pf += m.score2; b.pa += m.score1
    if (m.winner_id === m.team1_id) { a.w++; b.l++ } else { b.w++; a.l++ }
    h2h.set(key(m.team1_id, m.team2_id), m.winner_id ?? '')
  }
  const all = [...rows.values()].map((r) => ({ ...r, diff: r.pf - r.pa }))
  const wins = [...new Set(all.map((r) => r.w))].sort((x, y) => y - x)
  const bySeed = (x: Row, y: Row) => x.team.seed - y.team.seed
  const byPoints = (x: Row, y: Row) => y.pf - x.pf || bySeed(x, y)
  const out: Row[] = []
  for (const w of wins) {
    const g = all.filter((r) => r.w === w)
    if (g.length === 1) out.push(g[0])
    else if (g.length === 2) {
      const win = h2h.get(key(g[0].team.id, g[1].team.id))
      const sorted = win ? [...g].sort((x, y) => (x.team.id === win ? -1 : y.team.id === win ? 1 : 0)) : [...g].sort(byPoints)
      out.push(...sorted.map((r) => ({ ...r, via: (win ? 'h2h' : 'points') as Row['via'] })))
    } else out.push(...[...g].sort(byPoints).map((r) => ({ ...r, via: 'points' as Row['via'] })))
  }
  return out
}
