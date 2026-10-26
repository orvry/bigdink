'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireUser, roleIn } from '@/lib/auth'
import { adminClient } from '@/lib/supabase/admin'
import { PAYMENTS_MODE, MAX_DAYS, CURRENCY, amountFor } from '@/lib/billing'
import { winReached } from '@/lib/rules'
import { seedPlayoffs } from '@/lib/playoffs'
import type { FormState } from '@/lib/types'

const s = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim()
const n = (fd: FormData, k: string) => (s(fd, k) === '' ? null : Number(s(fd, k)))
const refresh = () => revalidatePath('/', 'layout')
const friendly = (m: string) =>
  /rental_inactive/i.test(m) ? "This group's rental has ended. Renew it under Admin, Billing."
  : /row-level security|not allowed/i.test(m) ? "You don't have permission to do that, or this group's rental has ended."
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

/* ---- payments (rental, pay per day). Simulated for now; Paymongo replaces the checkout later. ---- */
const RESERVED = ['login', 'denied', 'new-group', 'pay', 'api', 'admin', 'report', '_next']
const parseDays = (fd: FormData) => Math.round(Number(s(fd, 'days')))

/** Step 1 of creating a group: record what the user wants, then send them to pay. The group exists only once paid. */
export async function startGroupPayment(_p: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser()
  const slug = s(fd, 'slug').toLowerCase()
  const days = parseDays(fd)
  const visibility = s(fd, 'visibility') === 'private' ? 'private' : 'public'
  if (!s(fd, 'name')) return { error: 'Enter a group name.' }
  if (!/^[a-z0-9][a-z0-9-]{1,38}$/.test(slug) || RESERVED.includes(slug)) return { error: 'The address needs 2 to 39 lowercase letters, numbers or dashes, and cannot be a reserved word.' }
  if (!Number.isInteger(days) || days < 1 || days > MAX_DAYS) return { error: `Choose between 1 and ${MAX_DAYS} rental days.` }
  const admin = adminClient()
  const { data: taken } = await admin.from('organizations').select('id').eq('slug', slug).maybeSingle()
  if (taken) return { error: 'That address is already taken.' }
  const { data, error } = await admin.from('payments').insert({
    user_id: user.id, purpose: 'new_group', days, amount: amountFor(days), currency: CURRENCY, provider: PAYMENTS_MODE,
    group_name: s(fd, 'name'), group_slug: slug, group_visibility: visibility,
  }).select('id').single()
  if (error) return { error: error.message }
  redirect(`/pay/${data.id}`)
}

/** Add more paid days to an existing group (admins only). */
export async function startExtendPayment(_p: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser()
  const orgId = s(fd, 'org_id')
  const days = parseDays(fd)
  if ((await roleIn(orgId)) !== 'admin') return { error: "Only the group's admins can add more days." }
  if (!Number.isInteger(days) || days < 1 || days > MAX_DAYS) return { error: `Choose between 1 and ${MAX_DAYS} rental days.` }
  const { data, error } = await adminClient().from('payments').insert({
    user_id: user.id, org_id: orgId, purpose: 'extend', days, amount: amountFor(days), currency: CURRENCY, provider: PAYMENTS_MODE,
  }).select('id').single()
  if (error) return { error: error.message }
  redirect(`/pay/${data.id}`)
}

/**
 * The fake checkout. Only works while PAYMENTS_MODE=simulated, and only for the person who started the payment.
 * With Paymongo, the webhook will call the same fulfill_payment function instead of this.
 */
export async function simulatePayment(paymentId: string, outcome: 'success' | 'fail' | 'cancel') {
  const user = await requireUser()
  if (PAYMENTS_MODE !== 'simulated') throw new Error('Simulated payments are turned off')
  const admin = adminClient()
  const { data: p } = await admin.from('payments').select('*').eq('id', paymentId).single()
  if (!p || p.user_id !== user.id) redirect('/denied')
  if (p.status !== 'pending') redirect(`/pay/${paymentId}`)
  if (outcome !== 'success') {
    await admin.from('payments').update({ status: outcome === 'fail' ? 'failed' : 'cancelled' }).eq('id', paymentId)
    redirect(`/pay/${paymentId}`)
  }
  const { data: orgId, error } = await admin.rpc('fulfill_payment', { p_payment: paymentId })
  if (error) {
    await admin.from('payments').update({ status: 'failed' }).eq('id', paymentId)
    redirect(`/pay/${paymentId}`)
  }
  const { data: org } = await admin.from('organizations').select('slug').eq('id', orgId as string).single()
  refresh()
  redirect(p.purpose === 'new_group' ? `/${org?.slug}/admin` : `/${org?.slug}/admin/billing?paid=1`)
}

/** Public or private, for a group or one of its tournaments. */
export async function setVisibility(_p: FormState, fd: FormData): Promise<FormState> {
  await requireUser()
  const sb = await createClient()
  const visibility = s(fd, 'visibility') === 'private' ? 'private' : 'public'
  const table = s(fd, 'kind') === 'org' ? 'organizations' : 'tournaments'
  return run(`Now ${visibility}.`, () => sb.from(table).update({ visibility }).eq('id', s(fd, 'id')))
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
    visibility: s(fd, 'visibility') === 'private' ? 'private' : 'public',
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
