import { createClient } from '@/lib/supabase/server'
import { computeStandings } from '@/lib/standings'

/** When a bracket's round robin is complete, put its top 2 into the playoff slots that ask for them (A1, A2, B1, B2). */
export async function seedPlayoffs(tournamentId: string) {
  const sb = await createClient()
  const { data: brackets } = await sb.from('brackets').select('id,name').eq('tournament_id', tournamentId)
  const ranks: Record<string, string> = {}
  for (const b of brackets ?? []) {
    const [{ data: teams }, { data: ms }] = await Promise.all([
      sb.from('teams').select('*').eq('bracket_id', b.id),
      sb.from('matches').select('*').eq('bracket_id', b.id).eq('round', 'Round robin'),
    ])
    if (!ms?.length || ms.some((m) => m.status !== 'final')) continue
    computeStandings(teams ?? [], ms).slice(0, 2).forEach((r, i) => { ranks[`${b.name}${i + 1}`] = r.team.id })
  }
  const { data: po } = await sb.from('matches').select('id,slot1_ref,slot2_ref,team1_id,team2_id').eq('tournament_id', tournamentId).is('bracket_id', null)
  for (const m of po ?? []) {
    if (m.slot1_ref && !m.team1_id && ranks[m.slot1_ref]) await sb.rpc('fill_slot', { p_match: m.id, p_slot: 1, p_team: ranks[m.slot1_ref] })
    if (m.slot2_ref && !m.team2_id && ranks[m.slot2_ref]) await sb.rpc('fill_slot', { p_match: m.id, p_slot: 2, p_team: ranks[m.slot2_ref] })
  }
}
