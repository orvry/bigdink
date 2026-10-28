import type { createClient } from '@/lib/supabase/server'
import type { FeedRow } from '@/lib/types'

type Sb = Awaited<ReturnType<typeof createClient>>

/** Tournaments the user registered for or plays in, that are not finished yet, soonest first. */
export async function getMyTournaments(sb: Sb, userId: string): Promise<{ card: FeedRow; label: string }[]> {
  const [{ data: regs }, { data: seats }] = await Promise.all([
    sb.from('tournament_registrations').select('tournament_id,status').eq('user_id', userId).in('status', ['pending', 'approved']),
    sb.from('player_seats').select('tournament_id,team_id').eq('user_id', userId),
  ])
  const ids = [...new Set([...(regs ?? []).map((r) => r.tournament_id as string), ...(seats ?? []).map((s) => s.tournament_id as string)])]
  if (ids.length === 0) return []
  const teamIds = (seats ?? []).map((s) => s.team_id as string)
  const [{ data: cards }, { data: teams }] = await Promise.all([
    sb.from('tournament_cards').select('*').in('id', ids),
    teamIds.length ? sb.from('teams').select('id,name').in('id', teamIds) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ])
  const teamName = new Map((teams ?? []).map((t) => [t.id as string, t.name as string]))
  return ((cards ?? []) as FeedRow[])
    .filter((c) => !c.champion)
    .map((c) => {
      const seat = (seats ?? []).find((s) => s.tournament_id === c.id)
      const reg = (regs ?? []).find((r) => r.tournament_id === c.id)
      const label = seat ? `You are on team ${teamName.get(seat.team_id as string) ?? ''}`.trim() : reg?.status === 'approved' ? 'Registered and approved' : 'Registered, waiting for approval'
      return { card: c, label }
    })
    .sort((a, b) => (a.card.date ?? '9999').localeCompare(b.card.date ?? '9999'))
}
