import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { startExtendPayment } from '@/app/actions'
import { PRICE_PER_DAY, PAYMENTS_MODE, MAX_DAYS, isRentalActive, fmtWhen } from '@/lib/billing'
import { money } from '@/lib/format'
import ActionForm from '@/components/ActionForm'
import SubmitButton from '@/components/SubmitButton'
import RentalPicker from '@/components/RentalPicker'
import Breadcrumbs from '@/components/Breadcrumbs'
import { card, btn, muted } from '@/lib/ui'
import type { Payment } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function Billing({ params, searchParams }: { params: Promise<{ org: string }>; searchParams: Promise<{ paid?: string }> }) {
  const { org: slug } = await params
  const { paid } = await searchParams
  // allowInactive: this is the page an admin needs when the rental has ended
  const { org } = await requireRole(slug, ['admin'], { allowInactive: true })
  const sb = await createClient()
  const { data } = await sb.from('payments').select('*').eq('org_id', org.id).order('created_at', { ascending: false }).limit(20)
  const payments = (data ?? []) as Payment[]
  const active = isRentalActive(org)
  const daysLeft = org.rental_until ? Math.max(0, Math.ceil((new Date(org.rental_until).getTime() - Date.now()) / 864e5)) : 0
  return (
    <>
      <Breadcrumbs items={[{ label: 'Group', href: `/${slug}` }, { label: 'Billing' }]} />
      <h1 className="text-2xl font-bold md:text-3xl">Billing</h1>
      {paid && <p role="status" className="rounded-xl bg-[var(--chip)] p-3 text-sm font-semibold">✓ Payment received. Your rental was extended.</p>}
      <div className="grid items-start gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <div className={`${card} flex flex-col gap-1`}>
            <div className="flex items-center justify-between"><b>{org.name}</b>
              <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${active ? 'bg-[var(--live)] text-[color:var(--on-live)]' : 'bg-[var(--gold)] text-[#172033]'}`}>{active ? 'Active' : 'Ended'}</span></div>
            {org.rental_until && <div className="text-sm">{active ? `Active until ${fmtWhen(org.rental_until)} (${daysLeft} day${daysLeft === 1 ? '' : 's'} left)` : `Ended ${fmtWhen(org.rental_until)}`}</div>}
            <p className={`mt-1 text-xs ${muted}`}>{active ? 'All features are available.' : 'Only viewing the summary, standings and brackets, and downloading reports, work until you renew.'}</p>
          </div>
          <h2 className="text-sm font-bold">Payments</h2>
          {payments.length === 0 && <p className={`text-sm ${muted}`}>No payments yet.</p>}
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl bg-[var(--card)] px-4 py-2.5 text-sm">
              <div><div className="font-semibold">{p.days} day{p.days === 1 ? '' : 's'} · {money(p.amount / 100, p.currency)}</div><div className={`text-xs ${muted}`}>{fmtWhen(p.paid_at ?? p.created_at)}{p.provider === 'simulated' ? ' · simulated' : ''}</div></div>
              <span className="rounded-full bg-[var(--chip)] px-2.5 py-1 text-xs font-bold capitalize">{p.status}</span>
            </div>
          ))}
        </div>
        <ActionForm action={startExtendPayment} keepOnSuccess className={`${card} flex flex-col gap-3`}>
          <h2 className="font-bold">Add more days</h2>
          <input type="hidden" name="org_id" value={org.id} />
          {PAYMENTS_MODE === 'manual' && <p role="note" className="rounded-xl bg-[var(--chip)] p-3 text-sm">You pay by scanning a GCash, Maya or bank QR code and entering your reference number. An admin confirms it, and the days are added right after.</p>}
          {PAYMENTS_MODE === 'simulated' && <p role="note" className="rounded-xl bg-[var(--gold)] p-3 text-sm font-semibold text-[#172033]">Test mode: payment is simulated and no money is charged.</p>}
          <RentalPicker pricePerDay={PRICE_PER_DAY} max={MAX_DAYS} />
          <SubmitButton pendingText="Continuing…" className={btn}>Continue to payment</SubmitButton>
          <p className={`text-xs ${muted}`}>New days are added after any time you have left.</p>
        </ActionForm>
      </div>
    </>
  )
}
