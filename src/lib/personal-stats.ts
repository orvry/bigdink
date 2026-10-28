import type { createClient } from '@/lib/supabase/server'
import type { PersonalStats } from '@/lib/types'

type Sb = Awaited<ReturnType<typeof createClient>>

/** The signed-in user's totals, overall or inside one group. Counts only games where they were linked to a team seat. */
export async function getMyStats(sb: Sb, orgId?: string): Promise<PersonalStats> {
  let q = sb.from('my_tournament_stats').select('tournament_id,games,wins,points,champion')
  if (orgId) q = q.eq('org_id', orgId)
  const rows = (await q).data ?? []
  const games = rows.reduce((a, r) => a + (r.games as number), 0)
  const wins = rows.reduce((a, r) => a + (r.wins as number), 0)
  return {
    tournaments: rows.length, games, wins, losses: games - wins,
    points: rows.reduce((a, r) => a + (r.points as number), 0),
    titles: rows.filter((r) => r.champion).length,
    winRate: games ? Math.round((wins / games) * 100) : null,
  }
}
