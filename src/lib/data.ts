import { cache } from 'react'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOrg } from '@/lib/auth'
import type { Bracket, Match, Tournament } from '@/lib/types'

export const MATCH_SELECT =
  '*, team1:teams!matches_team1_id_fkey(id,name,seed,player1,player2), team2:teams!matches_team2_id_fkey(id,name,seed,player1,player2), tournament:tournaments(points_to_win,win_by)'

/** The group, its tournaments, the active tournament and that tournament's brackets. */
export const getContext = cache(async (slug: string) => {
  const org = await getOrg(slug)
  const sb = await createClient()
  const { data: ts } = await sb.from('tournaments').select('*').eq('org_id', org.id).order('created_at', { ascending: false })
  const tournaments = (ts ?? []) as Tournament[]
  const active = tournaments.find((t) => t.status === 'active') ?? tournaments[0] ?? null
  const { data: bs } = active
    ? await sb.from('brackets').select('*').eq('tournament_id', active.id).order('name')
    : { data: [] as Bracket[] }
  return { sb, org, tournaments, active, brackets: (bs ?? []) as Bracket[] }
})

/** One specific tournament of a group (the public pages live under /<group>/t/<id>). */
export const getTournamentContext = cache(async (slug: string, tid: string) => {
  const org = await getOrg(slug)
  const sb = await createClient()
  const { data: t } = await sb.from('tournaments').select('*').eq('id', tid).eq('org_id', org.id).maybeSingle()
  if (!t) notFound()
  const { data: bs } = await sb.from('brackets').select('*').eq('tournament_id', tid).order('name')
  return { sb, org, tournament: t as Tournament, brackets: (bs ?? []) as Bracket[] }
})

export const pickBracket = (brackets: Bracket[], b?: string): Bracket => brackets.find((x) => x.name === b) ?? brackets[0]

/** b = 'A' | 'B' | ... for a bracket, or 'P' for the playoff games (no bracket). */
export async function scopedMatches(slug: string, b?: string) {
  const ctx = await getContext(slug)
  const isP = b === 'P'
  // null for playoffs; typed as Bracket so pages can read bracket.name after their own isP check
  const bracket = (isP ? null : pickBracket(ctx.brackets, b)) as Bracket
  if (!ctx.active || (!isP && !bracket)) return { ...ctx, bracket, isP, matches: [] as Match[] }
  let q = ctx.sb.from('matches').select(MATCH_SELECT).eq('tournament_id', ctx.active.id).order('game_no')
  q = isP ? q.is('bracket_id', null) : q.eq('bracket_id', bracket.id)
  const { data } = await q
  return { ...ctx, bracket, isP, matches: (data ?? []) as Match[] }
}

const ord = (n: string) => ({ '1': '1st', '2': '2nd', '3': '3rd' } as Record<string, string>)[n] ?? `${n}th`
export const refLabel = (ref?: string | null) => {
  if (!ref) return 'TBD'
  const k = ref[0], r = ref.slice(1)
  if (k === 'W') return `Winner of game ${r}`
  if (k === 'L') return `Loser of game ${r}`
  return `${ord(r)} in Bracket ${k}`
}
export const slotLabel = (m: Match, n: 1 | 2) => (n === 1 ? m.team1?.name ?? refLabel(m.slot1_ref) : m.team2?.name ?? refLabel(m.slot2_ref))
export const rulesOf = (m: Pick<Match, 'tournament'>) => ({ ptw: m.tournament?.points_to_win ?? 11, wb: m.tournament?.win_by ?? 2 })
