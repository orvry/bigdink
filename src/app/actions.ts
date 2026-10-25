'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth'
import { winReached } from '@/lib/rules'
import { seedPlayoffs } from '@/lib/playoffs'
import type { FormState } from '@/lib/types'

const s = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim()
const n = (fd: FormData, k: string) => (s(fd, k) === '' ? null : Number(s(fd, k)))
const refresh = () => revalidatePath('/', 'layout')
const friendly = (m: string) =>
  /row-level security|not allowed/i.test(m) ? "You don't have permission to do that."
  : /duplicate key/i.test(m) ? 'That already exists, for example the same game number or address.' : m
type Result = PromiseLike<{ error: { message: string } | null }>

/** Runs a database write and turns the outcome into a message the form can show. */
async function run(okMessage: string, fn: () => Result): Promise<FormState> {
  const { error } = await fn()
  if (error) return { error: friendly(error.message) }
  refresh()
  return { ok: okMessage }
}

/* ---- accounts (form actions are POST, so credentials never appear in the URL) ---- */
export async function authenticate(_p: FormState, fd: FormData): Promise<FormState> {
  const sb = await createClient()
  const email = s(fd, 'email')
  const password = String(fd.get('password') ?? '')
  if (s(fd, 'intent') === 'signup') {
    const { data, error } = await sb.auth.signUp({ email, password })
    if (error) return { error: error.message }
    if (!data.session) return { ok: 'Check your email to confirm your account, then sign in.' }
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

export async function createGroup(_p: FormState, fd: FormData): Promise<FormState> {
  await requireUser()
  const sb = await createClient()
  const slug = s(fd, 'slug').toLowerCase()
  if (!/^[a-z0-9][a-z0-9-]{1,38}$/.test(slug)) return { error: 'The address needs 2 to 39 lowercase letters, numbers or dashes.' }
  const { error } = await sb.rpc('create_org', { p_name: s(fd, 'name'), p_slug: slug })
  if (error) return { error: friendly(error.message) }
  redirect(`/${slug}/admin`)
}

/* ---- scorer ---- */
export async function addPoint(matchId: string, teamId: string, player: string) {
  const user = await requireUser()
  const sb = await createClient()
  const { error } = await sb.from('score_events').insert({ match_id: matchId, team_id: teamId, player: player || null, created_by: user.id })
  if (error) {
    if (/row-level security|not allowed/i.test(error.message)) redirect('/denied')
    revalidatePath('/', 'layout') // paused or finished in the meantime: the page now shows the real state
    return
  }
  // Auto-declare the winner as soon as the win score is reached.
  const { data: m } = await sb.from('matches').select('score1,score2,tournament_id,tournament:tournaments(points_to_win,win_by)').eq('id', matchId).single()
  const t = m?.tournament as unknown as { points_to_win: number; win_by: number } | null | undefined
  if (m && winReached(m.score1, m.score2, t?.points_to_win ?? 11, t?.win_by ?? 2)) {
    await sb.rpc('finish_match', { p_match: matchId })
    await seedPlayoffs(m.tournament_id)
  }
  refresh()
}

export async function undoPoint(matchId: string) {
  await requireUser()
  const sb = await createClient()
  const { data } = await sb.from('score_events').select('id').eq('match_id', matchId).order('id', { ascending: false }).limit(1).maybeSingle()
  if (data) await sb.from('score_events').delete().eq('id', data.id)
  refresh()
}

export async function setPaused(matchId: string, paused: boolean) {
  await requireUser()
  const sb = await createClient()
  await sb.rpc('set_paused', { p_match: matchId, p_paused: paused })
  refresh()
}

/* ---- tournaments, brackets, teams, matches ---- */
export async function createTournament(_p: FormState, fd: FormData): Promise<FormState> {
  await requireUser()
  const sb = await createClient()
  const count = Math.min(8, Math.max(1, n(fd, 'brackets') ?? 2))
  const currency = (s(fd, 'currency') || 'JPY').toUpperCase()
  if (!/^[A-Z]{3}$/.test(currency)) return { error: 'Currency must be a 3-letter code such as JPY, PHP or USD.' }
  const { data, error } = await sb.from('tournaments').insert({
    org_id: s(fd, 'org_id'), name: s(fd, 'name'), date: s(fd, 'date') || null, courts: n(fd, 'courts') ?? 4,
    points_to_win: n(fd, 'points_to_win') ?? 11, win_by: n(fd, 'win_by') ?? 2, currency,
  }).select('id').single()
  if (error) return { error: friendly(error.message) }
  const { error: e2 } = await sb.from('brackets').insert(Array.from({ length: count }, (_, i) => ({ tournament_id: data.id, name: String.fromCharCode(65 + i) })))
  if (e2) return { error: friendly(e2.message) }
  refresh()
  return { ok: `Tournament created with ${count} bracket${count === 1 ? '' : 's'}.` }
}

export async function addBracket(_p: FormState, fd: FormData): Promise<FormState> {
  await requireUser()
  const sb = await createClient()
  const tid = s(fd, 'tournament_id')
  const { data } = await sb.from('brackets').select('name').eq('tournament_id', tid)
  const used = new Set((data ?? []).map((b) => b.name))
  const letter = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)).find((l) => !used.has(l))
  if (!letter) return { error: 'All 26 bracket letters are in use.' }
  return run(`Bracket ${letter} added. Add its teams and games next.`, () => sb.from('brackets').insert({ tournament_id: tid, name: letter }))
}

export async function setActiveTournament(id: string) {
  await requireUser()
  const sb = await createClient()
  const { data: t } = await sb.from('tournaments').select('org_id').eq('id', id).single()
  if (!t) return
  await sb.from('tournaments').update({ status: 'draft' }).eq('org_id', t.org_id).neq('id', id).eq('status', 'active')
  await sb.from('tournaments').update({ status: 'active' }).eq('id', id)
  refresh()
}

export async function addTeam(_p: FormState, fd: FormData): Promise<FormState> {
  await requireUser()
  const sb = await createClient()
  return run(`Team ${s(fd, 'name')} saved.`, () => sb.from('teams').insert({
    tournament_id: s(fd, 'tournament_id'), bracket_id: s(fd, 'bracket_id'), name: s(fd, 'name'),
    seed: n(fd, 'seed') ?? 0, player1: s(fd, 'player1'), player2: s(fd, 'player2'),
  }))
}

export async function deleteTeam(id: string) {
  await requireUser()
  const sb = await createClient()
  await sb.from('teams').delete().eq('id', id)
  refresh()
}

export async function addMatch(_p: FormState, fd: FormData): Promise<FormState> {
  await requireUser()
  const sb = await createClient()
  return run(`Game ${s(fd, 'game_no')} saved.`, () => sb.from('matches').insert({
    tournament_id: s(fd, 'tournament_id'), bracket_id: s(fd, 'bracket_id') || null, game_no: n(fd, 'game_no'), round: s(fd, 'round'),
    team1_id: s(fd, 'team1_id') || null, team2_id: s(fd, 'team2_id') || null,
    slot1_ref: s(fd, 'slot1_ref').toUpperCase() || null, slot2_ref: s(fd, 'slot2_ref').toUpperCase() || null,
    court: s(fd, 'court'), starts_at: s(fd, 'starts_at'),
  }))
}

export async function deleteMatch(id: string) {
  await requireUser()
  const sb = await createClient()
  await sb.from('matches').delete().eq('id', id)
  refresh()
}

export async function refreshPlayoffs(tournamentId: string) {
  await requireUser()
  await seedPlayoffs(tournamentId)
  refresh()
}

/* ---- members (roles are per group) ---- */
export async function addMember(_p: FormState, fd: FormData): Promise<FormState> {
  await requireUser()
  const sb = await createClient()
  return run(`${s(fd, 'email')} added as ${s(fd, 'role')}.`, () => sb.rpc('add_member', { p_org: s(fd, 'org_id'), p_email: s(fd, 'email'), p_role: s(fd, 'role') }))
}

export async function setMemberRole(_p: FormState, fd: FormData): Promise<FormState> {
  await requireUser()
  const sb = await createClient()
  const org = s(fd, 'org_id'), user = s(fd, 'user_id'), role = s(fd, 'role')
  if (role === 'remove') return run('Removed from the group.', () => sb.from('memberships').delete().eq('org_id', org).eq('user_id', user))
  return run(`Role changed to ${role}.`, () => sb.from('memberships').update({ role }).eq('org_id', org).eq('user_id', user))
}

/* ---- accounting ---- */
export async function addExpense(_p: FormState, fd: FormData): Promise<FormState> {
  await requireUser()
  const sb = await createClient()
  const amount = Number(s(fd, 'amount'))
  if (!Number.isFinite(amount) || amount < 0) return { error: 'Enter the amount as a number, for example 4500.' }
  return run('Expense saved.', () => sb.from('expenses').insert({
    tournament_id: s(fd, 'tournament_id'), spent_on: s(fd, 'spent_on') || new Date().toISOString().slice(0, 10),
    category: s(fd, 'category'), description: s(fd, 'description'), amount,
  }))
}

export async function deleteExpense(id: string) {
  await requireUser()
  const sb = await createClient()
  await sb.from('expenses').delete().eq('id', id)
  refresh()
}
