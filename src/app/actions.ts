'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth'
import { winReached } from '@/lib/rules'
import { seedPlayoffs } from '@/lib/playoffs'

const s = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim()
const n = (fd: FormData, k: string) => (s(fd, k) === '' ? null : Number(s(fd, k)))
const fail = (e: { message: string } | null) => { if (e) throw new Error(e.message) }

/* ---- auth (POST only: credentials never go in the URL) ---- */
export type AuthState = { error?: string; message?: string } | null

export async function authenticate(_prev: AuthState, fd: FormData): Promise<AuthState> {
  const sb = await createClient()
  const email = s(fd, 'email')
  const password = String(fd.get('password') ?? '')
  if (s(fd, 'intent') === 'signup') {
    const { data, error } = await sb.auth.signUp({ email, password })
    if (error) return { error: error.message }
    if (!data.session) return { message: 'Check your email to confirm your account, then sign in.' }
  } else {
    const { error } = await sb.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
  }
  redirect('/')
}

export async function signOut() {
  const sb = await createClient()
  await sb.auth.signOut()
  redirect('/')
}

/* ---- scorer ---- */
export async function addPoint(matchId: string, teamId: string, player: string) {
  const user = await requireRole(['admin', 'scorer'])
  const sb = await createClient()
  fail((await sb.from('score_events').insert({ match_id: matchId, team_id: teamId, player: player || null, created_by: user.id })).error)

  // Auto-declare the winner as soon as the win score is reached.
  const { data: m } = await sb.from('matches').select('score1,score2,tournament_id,tournament:tournaments(points_to_win,win_by)').eq('id', matchId).single()
  const t = m?.tournament as unknown as { points_to_win: number; win_by: number } | null | undefined
  if (m && winReached(m.score1, m.score2, t?.points_to_win ?? 11, t?.win_by ?? 2)) {
    fail((await sb.rpc('finish_match', { p_match: matchId })).error)
    await seedPlayoffs(m.tournament_id)
    revalidatePath('/', 'layout')
  }
  revalidatePath(`/scorer/${matchId}`)
}

export async function undoPoint(matchId: string) {
  await requireRole(['admin', 'scorer'])
  const sb = await createClient()
  const { data } = await sb.from('score_events').select('id').eq('match_id', matchId).order('id', { ascending: false }).limit(1).maybeSingle()
  if (data) fail((await sb.from('score_events').delete().eq('id', data.id)).error)
  revalidatePath(`/scorer/${matchId}`)
}

export async function setPaused(matchId: string, paused: boolean) {
  await requireRole(['admin', 'scorer'])
  const sb = await createClient()
  fail((await sb.rpc('set_paused', { p_match: matchId, p_paused: paused })).error)
  revalidatePath(`/scorer/${matchId}`)
}

/* ---- admin ---- */
export async function createTournament(fd: FormData) {
  await requireRole(['admin'])
  const sb = await createClient()
  const { data, error } = await sb.from('tournaments').insert({
    name: s(fd, 'name'), date: s(fd, 'date') || null, courts: n(fd, 'courts') ?? 4,
    points_to_win: n(fd, 'points_to_win') ?? 11, win_by: n(fd, 'win_by') ?? 2,
  }).select('id').single()
  fail(error)
  fail((await sb.from('brackets').insert([{ tournament_id: data!.id, name: 'A' }, { tournament_id: data!.id, name: 'B' }])).error)
  revalidatePath('/admin')
}

export async function setActiveTournament(id: string) {
  await requireRole(['admin'])
  const sb = await createClient()
  await sb.from('tournaments').update({ status: 'draft' }).neq('id', id).eq('status', 'active')
  fail((await sb.from('tournaments').update({ status: 'active' }).eq('id', id)).error)
  revalidatePath('/', 'layout')
}

export async function addTeam(fd: FormData) {
  await requireRole(['admin'])
  const sb = await createClient()
  fail((await sb.from('teams').insert({ tournament_id: s(fd, 'tournament_id'), bracket_id: s(fd, 'bracket_id'), name: s(fd, 'name'), seed: n(fd, 'seed') ?? 0, player1: s(fd, 'player1'), player2: s(fd, 'player2') })).error)
  revalidatePath('/admin/teams')
}

export async function deleteTeam(id: string) {
  await requireRole(['admin'])
  const sb = await createClient()
  fail((await sb.from('teams').delete().eq('id', id)).error)
  revalidatePath('/admin/teams')
}

export async function addMatch(fd: FormData) {
  await requireRole(['admin'])
  const sb = await createClient()
  fail((await sb.from('matches').insert({
    tournament_id: s(fd, 'tournament_id'), bracket_id: s(fd, 'bracket_id') || null, game_no: n(fd, 'game_no'), round: s(fd, 'round'),
    team1_id: s(fd, 'team1_id') || null, team2_id: s(fd, 'team2_id') || null,
    slot1_ref: s(fd, 'slot1_ref').toUpperCase() || null, slot2_ref: s(fd, 'slot2_ref').toUpperCase() || null,
    court: s(fd, 'court'), starts_at: s(fd, 'starts_at'),
  })).error)
  revalidatePath('/admin/matches')
}

export async function deleteMatch(id: string) {
  await requireRole(['admin'])
  const sb = await createClient()
  fail((await sb.from('matches').delete().eq('id', id)).error)
  revalidatePath('/admin/matches')
}

export async function refreshPlayoffs(tournamentId: string) {
  await requireRole(['admin'])
  await seedPlayoffs(tournamentId)
  revalidatePath('/', 'layout')
}

export async function setRole(fd: FormData) {
  const me = await requireRole(['admin'])
  const id = s(fd, 'id')
  if (id === me.id) throw new Error("You can't change your own role")
  const sb = await createClient()
  fail((await sb.from('profiles').update({ role: s(fd, 'role') }).eq('id', id)).error)
  revalidatePath('/admin/users')
}
