import type { Match, PlayerStat, Team } from './types'

/** Champion, runner-up and third place, once the Final (and 3rd place game) are finished. */
export function getChampion(playoffs: Match[]) {
  const f = playoffs.find((m) => m.round === 'Final' && m.status === 'final')
  if (!f || !f.team1 || !f.team2) return null
  const champ = f.winner_id === f.team1_id ? f.team1 : f.team2
  const runner = f.winner_id === f.team1_id ? f.team2 : f.team1
  const t = playoffs.find((m) => m.round === '3rd place' && m.status === 'final')
  const third = t && t.team1 && t.team2 ? (t.winner_id === t.team1_id ? t.team1 : t.team2) : null
  return { champ, runner, third, score: `${Math.max(f.score1, f.score2)}–${Math.min(f.score1, f.score2)}` }
}

/** Players ranked by points won. Only counts points scorers recorded with the player tiles. */
export function computeMvps(rows: { team_id: string; player: string; points: number }[], teams: Team[]): PlayerStat[] {
  const byId = new Map(teams.map((t) => [t.id, t]))
  return rows
    .flatMap((r) => {
      const t = byId.get(r.team_id)
      return t ? [{ player: r.player, team: t.name, bracketId: t.bracket_id ?? null, points: r.points }] : []
    })
    .sort((a, b) => b.points - a.points || a.player.localeCompare(b.player))
}

/** Everyone tied for the most points (co-MVPs). */
export const topMvps = (s: PlayerStat[]) => (s.length ? s.filter((x) => x.points === s[0].points) : [])
