import { requireRole } from '@/lib/auth'
import { getContext } from '@/lib/data'
import { addExpense, deleteExpense } from '@/app/actions'
import ActionForm from '@/components/ActionForm'
import SubmitButton from '@/components/SubmitButton'
import Breadcrumbs from '@/components/Breadcrumbs'
import { money } from '@/lib/format'
import { card, btn, btn2, input, label, muted, num, EXPENSE_CATEGORIES } from '@/lib/ui'
import type { Expense, Team } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function Expenses({ params }: { params: Promise<{ org: string }> }) {
  const { org: slug } = await params
  await requireRole(slug, ['admin'])
  const { sb, active } = await getContext(slug)
  const base = `/${slug}`
  const crumbs = [{ label: 'Summary', href: base }, { label: 'Admin', href: `${base}/admin` }, { label: 'Expenses' }]
  if (!active) return <><Breadcrumbs items={crumbs} /><p>Create a tournament first.</p></>

  const [{ data: ex }, { data: teams }] = await Promise.all([
    sb.from('expenses').select('*').eq('tournament_id', active.id).order('spent_on', { ascending: false }),
    sb.from('teams').select('player1,player2').eq('tournament_id', active.id),
  ])
  const expenses = (ex ?? []) as Expense[]
  const players = ((teams ?? []) as Pick<Team, 'player1' | 'player2'>[]).reduce((n, t) => n + [t.player1, t.player2].filter(Boolean).length, 0)
  const total = expenses.reduce((a, e) => a + Number(e.amount), 0)
  const per = players ? total / players : 0
  const cur = active.currency
  const cats = new Map<string, number>()
  for (const e of expenses) cats.set(e.category, (cats.get(e.category) ?? 0) + Number(e.amount))
  const stat = (v: string, l: string) => <div className={`${card} flex-1`}><div className={`${num} text-[32px] md:text-[40px]`}>{v}</div><div className={`text-xs ${muted}`}>{l}</div></div>

  return (
    <>
      <Breadcrumbs items={crumbs} />
      <h1 className="text-2xl font-bold md:text-3xl">Expenses</h1>
      <p className={`text-sm ${muted}`}>{active.name}. Only admins of this group can see this page. Amounts are in {cur}.</p>
      <div className="flex gap-2 md:gap-4">{stat(money(total, cur), 'Total expenses')}{stat(String(players), 'Players')}{stat(money(per, cur), 'Cost per player')}</div>
      {players === 0 && <p className={`text-sm ${muted}`}>Cost per player needs teams with player names. Add them under Admin, Teams.</p>}
      <a href={`${base}/report/expenses`} download className={`${btn2} md:max-w-sm`}>Download expense report (PDF)</a>

      <div className="grid items-start gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          {cats.size > 0 && (
            <div className={card}>
              <h2 className="mb-1 font-bold">By category</h2>
              <ul className="flex flex-col gap-1 text-sm">
                {[...cats.entries()].sort((a, b) => b[1] - a[1]).map(([c, v]) => (
                  <li key={c} className="flex justify-between"><span>{c}</span><span className="font-semibold">{money(v, cur)}</span></li>
                ))}
              </ul>
            </div>
          )}
          <p className={`mt-2 text-xs font-bold ${muted}`}>{expenses.length} EXPENSES</p>
          {expenses.map((e) => (
            <div key={e.id} className="flex items-center gap-2 rounded-xl bg-[var(--card)] px-4 py-2.5">
              <div className="flex-1"><div className={`text-xs ${muted}`}>{e.spent_on} · {e.category}</div><div className="font-semibold">{e.description}</div></div>
              <div className="font-semibold">{money(Number(e.amount), cur)}</div>
              <form action={deleteExpense.bind(null, e.id)}><SubmitButton pendingText="…" className="h-11 px-3 text-sm font-bold text-red-700 dark:text-red-400">Delete</SubmitButton></form>
            </div>
          ))}
        </div>
        <ActionForm action={addExpense} className={`${card} flex flex-col gap-3`}>
          <h2 className="font-bold">Add an expense</h2>
          <input type="hidden" name="tournament_id" value={active.id} />
          <div className="flex gap-2">
            <label className={`${label} flex-1`}>Date<input name="spent_on" type="date" className={input} /></label>
            <label className={`${label} flex-1`}>Amount ({cur})<input name="amount" type="number" inputMode="decimal" min={0} step="0.01" required className={input} /></label>
          </div>
          <label className={label}>Category<select name="category" className={input}>{EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
          <label className={label}>Description<input name="description" required placeholder="Court rental, 4 courts x 3 hours" className={input} /></label>
          <SubmitButton className={btn}>Save expense</SubmitButton>
          <p className={`text-xs ${muted}`}>The total is split equally among all players on the tournament’s teams. Leave the date empty to use today.</p>
        </ActionForm>
      </div>
    </>
  )
}
