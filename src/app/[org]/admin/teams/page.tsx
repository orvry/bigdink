import { requireRole } from '@/lib/auth'
import { UserCheck } from 'lucide-react'
import { getContext, pickBracket } from '@/lib/data'
import { addTeam, deleteTeam } from '@/app/actions'
import ActionForm from '@/components/ActionForm'
import SubmitButton from '@/components/SubmitButton'
import BracketTabs from '@/components/BracketTabs'
import Breadcrumbs from '@/components/Breadcrumbs'
import { card, btn, input, label, muted } from '@/lib/ui'
import type { Team } from '@/lib/types'

type Person = { id: string; label: string }

export const dynamic = 'force-dynamic'

export default async function Teams({ params, searchParams }: { params: Promise<{ org: string }>; searchParams: Promise<{ b?: string }> }) {
  const { org: slug } = await params
  await requireRole(slug, ['admin'])
  const { b } = await searchParams
  const { sb, org, active, brackets } = await getContext(slug)
  const bracket = pickBracket(brackets, b)
  if (!active || !bracket) return <p>Create a tournament first.</p>
  const { data } = await sb.from('teams').select('*').eq('bracket_id', bracket.id).order('seed')
  const teams = (data ?? []) as (Team & { player1_user?: string | null; player2_user?: string | null })[]

  // People who can be linked to a seat: members of the group and people who registered for this tournament
  const [{ data: mem }, { data: reg }] = await Promise.all([
    sb.from('memberships').select('user_id,profiles(display_name,email)').eq('org_id', org.id),
    sb.from('tournament_registrations').select('user_id,profiles(display_name,email)').eq('tournament_id', active.id).in('status', ['pending', 'approved']),
  ])
  const people = new Map<string, Person>()
  for (const r of [...((mem ?? []) as unknown as { user_id: string; profiles: { display_name: string | null; email: string } | null }[]), ...((reg ?? []) as unknown as { user_id: string; profiles: { display_name: string | null; email: string } | null }[])]) {
    const name = r.profiles?.display_name || r.profiles?.email.split('@')[0]
    if (name && !people.has(r.user_id)) people.set(r.user_id, { id: r.user_id, label: name })
  }
  const options = [...people.values()].sort((a, b) => a.label.localeCompare(b.label))
  const pick = (name: string, labelText: string) => (
    <label className={label}>{labelText}
      <select name={name} defaultValue="" className={input}>
        <option value="">Typed name only</option>
        {options.map((p) => <option key={p.id} value={`${p.id}::${p.label}`}>{p.label}</option>)}
      </select>
    </label>
  )
  return (
    <>
      <Breadcrumbs items={[{ label: 'Group', href: `/${slug}` }, { label: 'Admin', href: `/${slug}/admin` }, { label: 'Teams' }]} />
      <h1 className="text-2xl font-bold md:text-3xl">Teams</h1>
      <BracketTabs base={`/${slug}/admin/teams`} brackets={brackets} current={bracket.name} />
      <div className="grid items-start gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <p className={`text-xs font-bold ${muted}`}>{teams.length} TEAMS, BY SEED</p>
          {teams.map((t) => (
            <div key={t.id} className="flex items-center gap-3 rounded-xl bg-[var(--card)] px-4 py-2.5">
              <b className="w-6 text-xl">{t.seed}</b>
              <div className="flex-1"><div className="font-semibold">{t.name}</div><div className={`text-xs ${muted}`}>{[t.player1, t.player2].filter(Boolean).join(' · ')}{(t.player1_user || t.player2_user) && <span className="ml-2 inline-flex items-center gap-1 font-semibold text-[color:var(--link)]"><UserCheck aria-hidden="true" size={12} />linked to an account</span>}</div></div>
              <form action={deleteTeam.bind(null, t.id)}><SubmitButton pendingText="Deleting…" className="h-11 px-3 text-sm font-bold text-red-700 dark:text-red-400">Delete</SubmitButton></form>
            </div>
          ))}
        </div>
        <ActionForm action={addTeam} className={`${card} flex flex-col gap-3`}>
          <h2 className="font-bold">Add team to Bracket {bracket.name}</h2>
          <input type="hidden" name="tournament_id" value={active.id} /><input type="hidden" name="bracket_id" value={bracket.id} />
          <label className={label}>Team name<input name="name" required className={input} /></label>
          <fieldset className="flex flex-col gap-2 rounded-xl border border-[color:var(--line)] p-3">
            <legend className="px-1 text-sm font-semibold text-[color:var(--muted)]">Player 1</legend>
            {pick('player1_pick', 'Registered person')}
            <label className={label}>Or type a name<input name="player1" className={input} /></label>
          </fieldset>
          <fieldset className="flex flex-col gap-2 rounded-xl border border-[color:var(--line)] p-3">
            <legend className="px-1 text-sm font-semibold text-[color:var(--muted)]">Player 2</legend>
            {pick('player2_pick', 'Registered person')}
            <label className={label}>Or type a name<input name="player2" className={input} /></label>
          </fieldset>
          <p className={`text-xs ${muted}`}>A linked person’s games and points count in their personal stats. A typed name is just a name, for a guest without an account.</p>
          <label className={label}>Seed<input name="seed" type="number" min={1} required className={input} /></label>
          <SubmitButton className={btn}>Save team</SubmitButton>
        </ActionForm>
      </div>
    </>
  )
}
