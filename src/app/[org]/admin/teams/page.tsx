import { requireRole } from '@/lib/auth'
import { getContext, pickBracket } from '@/lib/data'
import { addTeam, deleteTeam } from '@/app/actions'
import ActionForm from '@/components/ActionForm'
import SubmitButton from '@/components/SubmitButton'
import BracketTabs from '@/components/BracketTabs'
import Breadcrumbs from '@/components/Breadcrumbs'
import { card, btn, input, label, muted } from '@/lib/ui'
import type { Team } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function Teams({ params, searchParams }: { params: Promise<{ org: string }>; searchParams: Promise<{ b?: string }> }) {
  const { org: slug } = await params
  await requireRole(slug, ['admin'])
  const { b } = await searchParams
  const { sb, active, brackets } = await getContext(slug)
  const bracket = pickBracket(brackets, b)
  if (!active || !bracket) return <p>Create a tournament first.</p>
  const { data } = await sb.from('teams').select('*').eq('bracket_id', bracket.id).order('seed')
  const teams = (data ?? []) as Team[]
  return (
    <>
      <Breadcrumbs items={[{ label: 'Summary', href: `/${slug}` }, { label: 'Admin', href: `/${slug}/admin` }, { label: 'Teams' }]} />
      <h1 className="text-2xl font-bold md:text-3xl">Teams</h1>
      <BracketTabs base={`/${slug}/admin/teams`} brackets={brackets} current={bracket.name} />
      <div className="grid items-start gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <p className={`text-xs font-bold ${muted}`}>{teams.length} TEAMS, BY SEED</p>
          {teams.map((t) => (
            <div key={t.id} className="flex items-center gap-3 rounded-xl bg-[var(--card)] px-4 py-2.5">
              <b className="w-6 text-xl">{t.seed}</b>
              <div className="flex-1"><div className="font-semibold">{t.name}</div><div className={`text-xs ${muted}`}>{[t.player1, t.player2].filter(Boolean).join(' · ')}</div></div>
              <form action={deleteTeam.bind(null, t.id)}><SubmitButton pendingText="Deleting…" className="h-11 px-3 text-sm font-bold text-red-700 dark:text-red-400">Delete</SubmitButton></form>
            </div>
          ))}
        </div>
        <ActionForm action={addTeam} className={`${card} flex flex-col gap-3`}>
          <h2 className="font-bold">Add team to Bracket {bracket.name}</h2>
          <input type="hidden" name="tournament_id" value={active.id} /><input type="hidden" name="bracket_id" value={bracket.id} />
          <label className={label}>Team name<input name="name" required className={input} /></label>
          <label className={label}>Player 1<input name="player1" className={input} /></label>
          <label className={label}>Player 2<input name="player2" className={input} /></label>
          <label className={label}>Seed<input name="seed" type="number" min={1} required className={input} /></label>
          <SubmitButton className={btn}>Save team</SubmitButton>
        </ActionForm>
      </div>
    </>
  )
}
