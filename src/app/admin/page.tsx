import Link from 'next/link'
import { requireRole } from '@/lib/auth'
import { getContext } from '@/lib/data'
import { createTournament, setActiveTournament } from '@/app/actions'
import Breadcrumbs from '@/components/Breadcrumbs'
import { card, btn, btn2, input, label, muted } from '@/lib/ui'

export const dynamic = 'force-dynamic'

export default async function Admin() {
  await requireRole(['admin'])
  const { tournaments, active } = await getContext()
  return (
    <>
      <Breadcrumbs items={[{ label: 'Summary', href: '/' }, { label: 'Admin' }]} />
      <h1 className="text-2xl font-bold md:text-3xl">Tournaments</h1>
      <div className="grid grid-cols-3 gap-2 text-center text-sm font-semibold md:max-w-lg">
        <Link href="/admin/teams" className={btn}>Teams</Link>
        <Link href="/admin/matches" className={btn}>Matches</Link>
        <Link href="/admin/users" className={btn}>Users</Link>
      </div>
      <a href="/report" download className={`${btn2} md:max-w-lg`}>Download PDF report</a>
      <div className="grid items-start gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          {tournaments.map((t) => (
            <div key={t.id} className={`${card} flex items-center justify-between`}>
              <div><div className="font-semibold">{t.name}</div><div className={`text-xs ${muted}`}>{active?.id === t.id ? 'Active' : 'Draft'} · {t.courts} courts · to {t.points_to_win}, win by {t.win_by}</div></div>
              {active?.id !== t.id && <form action={setActiveTournament.bind(null, t.id)}><button className={`${btn2} h-11`}>Make active</button></form>}
            </div>
          ))}
        </div>
        <form action={createTournament} className={`${card} flex flex-col gap-3`}>
          <h2 className="font-bold">New tournament</h2>
          <label className={label}>Name<input name="name" required className={input} /></label>
          <div className="flex gap-2"><label className={`${label} flex-1`}>Date<input name="date" type="date" className={input} /></label>
            <label className={`${label} w-24`}>Courts<input name="courts" type="number" defaultValue={4} className={input} /></label></div>
          <div className="flex gap-2"><label className={`${label} flex-1`}>Points to win<input name="points_to_win" type="number" min={1} defaultValue={11} className={input} /></label>
            <label className={`${label} flex-1`}>Win by<input name="win_by" type="number" min={1} defaultValue={2} className={input} /></label></div>
          <button className={btn}>Create tournament</button>
          <p className={`text-xs ${muted}`}>Creates Bracket A and Bracket B. Games end automatically at the win score.</p>
        </form>
      </div>
    </>
  )
}
