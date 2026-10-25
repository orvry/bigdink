import Link from 'next/link'
import { requireRole } from '@/lib/auth'
import { getContext } from '@/lib/data'
import { createTournament, addBracket, setActiveTournament } from '@/app/actions'
import ActionForm from '@/components/ActionForm'
import SubmitButton from '@/components/SubmitButton'
import Breadcrumbs from '@/components/Breadcrumbs'
import { card, btn, btn2, input, label, muted } from '@/lib/ui'

export const dynamic = 'force-dynamic'

export default async function Admin({ params }: { params: Promise<{ org: string }> }) {
  const { org: slug } = await params
  await requireRole(slug, ['admin'])
  const { org, tournaments, active, brackets } = await getContext(slug)
  const base = `/${slug}`
  return (
    <>
      <Breadcrumbs items={[{ label: 'Summary', href: base }, { label: 'Admin' }]} />
      <h1 className="text-2xl font-bold md:text-3xl">{org.name}: admin</h1>
      <div className="grid grid-cols-2 gap-2 text-center text-sm font-semibold md:max-w-xl md:grid-cols-4">
        <Link href={`${base}/admin/teams`} className={btn}>Teams</Link>
        <Link href={`${base}/admin/matches`} className={btn}>Matches</Link>
        <Link href={`${base}/admin/expenses`} className={btn}>Expenses</Link>
        <Link href={`${base}/admin/users`} className={btn}>Members</Link>
      </div>
      <a href={`${base}/report`} download className={`${btn2} md:max-w-xl`}>Download PDF report</a>
      <div className="grid items-start gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          {tournaments.map((t) => (
            <div key={t.id} className={`${card} flex flex-col gap-2`}>
              <div className="flex items-center justify-between">
                <div><div className="font-semibold">{t.name}</div><div className={`text-xs ${muted}`}>{active?.id === t.id ? 'Active' : 'Draft'} · {t.courts} courts · to {t.points_to_win}, win by {t.win_by} · {t.currency}</div></div>
                {active?.id !== t.id && <form action={setActiveTournament.bind(null, t.id)}><SubmitButton pendingText="Switching…" className={`${btn2} h-11`}>Make active</SubmitButton></form>}
              </div>
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
          <SubmitButton pendingText="Creating…" className={btn}>Create tournament</SubmitButton>
          <p className={`text-xs ${muted}`}>Games end automatically at the win score. You can add more brackets later.</p>
        </ActionForm>
      </div>
    </>
  )
}
