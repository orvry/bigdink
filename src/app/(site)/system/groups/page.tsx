import Link from 'next/link'
import { adminClient } from '@/lib/supabase/admin'
import { grantRentalDays } from '@/app/actions'
import { fmtWhen, isRentalActive } from '@/lib/billing'
import ActionForm from '@/components/ActionForm'
import SubmitButton from '@/components/SubmitButton'
import { btn2, card, input, muted } from '@/lib/ui'

export const dynamic = 'force-dynamic'

type Row = { id: string; name: string; slug: string; visibility: string; rental_until: string | null; created_at: string; tournaments: { count: number }[]; memberships: { count: number }[] }

export default async function Groups() {
  const { data } = await adminClient().from('organizations').select('id,name,slug,visibility,rental_until,created_at,tournaments(count),memberships(count)').order('created_at', { ascending: false }).limit(100)
  const rows = (data ?? []) as unknown as Row[]
  return (
    <>
      <h1 className="text-2xl font-bold md:text-3xl">Groups</h1>
      {rows.length === 0 && <p className={`${card} text-sm ${muted}`}>No groups yet.</p>}
      <div className="grid gap-3 lg:grid-cols-2">
        {rows.map((g) => {
          const active = isRentalActive(g)
          return (
            <article key={g.id} className={`${card} flex flex-col gap-3`}>
              <div className="flex items-center gap-2">
                <Link href={`/${g.slug}`} className="flex-1 font-semibold hover:underline">{g.name}</Link>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${active ? 'bg-[var(--live)] text-[color:var(--on-live)]' : 'bg-[var(--gold)] text-[#172033]'}`}>{active ? 'Active' : 'Ended'}</span>
              </div>
              <div className={`text-sm ${muted}`}>
                {g.visibility} · {g.tournaments?.[0]?.count ?? 0} tournaments · {g.memberships?.[0]?.count ?? 0} members<br />
                {g.rental_until ? `${active ? 'Active until' : 'Ended'} ${fmtWhen(g.rental_until)}` : 'Never rented'}
              </div>
              <ActionForm action={grantRentalDays} className="flex items-end gap-2">
                <input type="hidden" name="org_id" value={g.id} />
                <label className="flex flex-1 flex-col gap-1 text-sm font-semibold text-[color:var(--muted)]">Add free days<input name="days" type="number" min={1} max={90} defaultValue={7} className={input} /></label>
                <SubmitButton pendingText="Adding…" className={`${btn2} h-12`}>Add days</SubmitButton>
              </ActionForm>
            </article>
          )
        })}
      </div>
    </>
  )
}
