import Link from 'next/link'
import { requireRole } from '@/lib/auth'
import { getContext } from '@/lib/data'
import { createTournament, addBracket, setActiveTournament, setVisibility } from '@/app/actions'
import { fmtWhen } from '@/lib/billing'
import ActionForm from '@/components/ActionForm'
import SubmitButton from '@/components/SubmitButton'
import Breadcrumbs from '@/components/Breadcrumbs'
import { card, btn, btn2, input, label, muted } from '@/lib/ui'
import type { Visibility } from '@/lib/types'

export const dynamic = 'force-dynamic'

function VisibilityForm({ kind, id, value }: { kind: 'org' | 'tournament'; id: string; value: Visibility }) {
  return (
    <ActionForm action={setVisibility} keepOnSuccess className="flex flex-col gap-1">
      <input type="hidden" name="kind" value={kind} /><input type="hidden" name="id" value={id} />
      <div className="flex items-center gap-2">
        <select name="visibility" defaultValue={value} aria-label="Visibility" className="h-11 flex-1 rounded-lg border border-[color:var(--line2)] bg-[var(--card)] px-2 text-sm">
          <option value="public">Public: listed in the feed</option><option value="private">Private: members only</option>
        </select>
        <SubmitButton pendingText="Saving…" className={`${btn2} h-11 text-sm`}>Save</SubmitButton>
      </div>
    </ActionForm>
  )
}

export default async function Admin({ params }: { params: Promise<{ org: string }> }) {
  const { org: slug } = await params
  await requireRole(slug, ['admin'])
  const { org, tournaments, active, brackets } = await getContext(slug)
  const base = `/${slug}`
  return (
    <>
      <Breadcrumbs items={[{ label: 'Group', href: base }, { label: 'Admin' }]} />
      <h1 className="text-2xl font-bold md:text-3xl">{org.name}: admin</h1>
      <div className="grid grid-cols-2 gap-2 text-center text-sm font-semibold md:max-w-3xl md:grid-cols-3 lg:grid-cols-6">
        <Link href={`${base}/admin/registrations`} className={btn}>Registrations</Link>
        <Link href={`${base}/admin/teams`} className={btn}>Teams</Link>
        <Link href={`${base}/admin/matches`} className={btn}>Matches</Link>
        <Link href={`${base}/admin/expenses`} className={btn}>Expenses</Link>
        <Link href={`${base}/admin/users`} className={btn}>Members</Link>
        <Link href={`${base}/admin/billing`} className={btn}>Billing</Link>
      </div>
      <p className={`text-sm ${muted}`}>Rental active until {org.rental_until ? fmtWhen(org.rental_until) : 'n/a'}.</p>
      {active && <a href={`${base}/t/${active.id}/report`} download className={`${btn2} md:max-w-2xl`}>Download PDF report</a>}
      <div className={`${card} flex flex-col gap-2 md:max-w-2xl`}>
        <h2 className="font-bold">Group visibility</h2>
        <VisibilityForm kind="org" id={org.id} value={org.visibility} />
        <p className={`text-xs ${muted}`}>A private group is hidden from the feed and only its members can open it, including all its tournaments.</p>
      </div>
      <div className="grid items-start gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          {tournaments.map((t) => (
            <div key={t.id} className={`${card} flex flex-col gap-2`}>
              <div className="flex items-center justify-between">
                <div><div className="font-semibold">{t.name}</div><div className={`text-xs ${muted}`}>{active?.id === t.id ? 'Active' : 'Draft'} · {t.courts} courts · to {t.points_to_win}, win by {t.win_by} · {t.currency}</div></div>
                {active?.id !== t.id && <form action={setActiveTournament.bind(null, t.id)}><SubmitButton pendingText="Switching…" className={`${btn2} h-11`}>Make active</SubmitButton></form>}
              </div>
              <Link href={`${base}/admin/tournaments/${t.id}`} className="text-sm font-semibold text-[color:var(--link)] underline">Edit details, description and banner</Link>
              <VisibilityForm kind="tournament" id={t.id} value={t.visibility} />
              {active?.id === t.id && (
                <ActionForm action={addBracket} className="flex flex-col gap-1">
                  <input type="hidden" name="tournament_id" value={t.id} />
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-sm ${muted}`}>Brackets: {brackets.map((b) => b.name).join(', ') || 'none'}</span>
                    <SubmitButton pendingText="Adding…" className={`${btn2} h-11 text-sm`}>+ Add bracket</SubmitButton>
                  </div>
                </ActionForm>
              )}
            </div>
          ))}
          {tournaments.length === 0 && <p className={`text-sm ${muted}`}>No tournaments yet. Create the first one.</p>}
        </div>
        <ActionForm action={createTournament} className={`${card} flex flex-col gap-3`}>
          <h2 className="font-bold">New tournament</h2>
          <input type="hidden" name="org_id" value={org.id} />
          <label className={label}>Name<input name="name" required className={input} /></label>
          <div className="flex gap-2"><label className={`${label} flex-1`}>Date<input name="date" type="date" className={input} /></label>
            <label className={`${label} w-24`}>Courts<input name="courts" type="number" min={1} defaultValue={4} className={input} /></label></div>
          <div className="flex gap-2"><label className={`${label} flex-1`}>Points to win<input name="points_to_win" type="number" min={1} defaultValue={11} className={input} /></label>
            <label className={`${label} flex-1`}>Win by<input name="win_by" type="number" min={1} defaultValue={2} className={input} /></label></div>
          <div className="flex gap-2"><label className={`${label} flex-1`}>Brackets (1 to 8)<input name="brackets" type="number" min={1} max={8} defaultValue={2} className={input} /></label>
            <label className={`${label} flex-1`}>Currency code<input name="currency" defaultValue="JPY" maxLength={3} className={`${input} uppercase`} /></label></div>
          <label className={label}>Visibility
            <select name="visibility" defaultValue="public" className={input}><option value="public">Public: listed in the feed</option><option value="private">Private: members only</option></select></label>
          <SubmitButton pendingText="Creating…" className={btn}>Create tournament</SubmitButton>
          <p className={`text-xs ${muted}`}>Games end automatically at the win score. You can add more brackets later.</p>
        </ActionForm>
      </div>
    </>
  )
}
