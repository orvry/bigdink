import Link from 'next/link'
import { adminClient } from '@/lib/supabase/admin'
import { confirmPaymentAction, rejectPaymentAction } from '@/app/actions'
import { fmtWhen } from '@/lib/billing'
import { money } from '@/lib/format'
import ActionForm from '@/components/ActionForm'
import SubmitButton from '@/components/SubmitButton'
import { btn, btn2, card, input, label, muted } from '@/lib/ui'
import type { Payment } from '@/lib/types'

export const dynamic = 'force-dynamic'

type Row = Payment & { paid_at: string | null; reference_submitted_at: string | null; profiles: { email: string; display_name: string | null } | null }
const TABS = [['submitted', 'Waiting'], ['pending', 'Not paid yet'], ['paid', 'Paid'], ['closed', 'Closed']] as const

export default async function Payments({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = 'submitted' } = await searchParams
  let q = adminClient().from('payments').select('*,profiles(email,display_name)').eq('provider', 'manual').order('created_at', { ascending: false }).limit(50)
  q = status === 'closed' ? q.in('status', ['failed', 'cancelled']) : q.eq('status', TABS.some((t) => t[0] === status) ? status : 'submitted')
  const rows = ((await q).data ?? []) as unknown as Row[]
  const open = status === 'submitted' || status === 'pending'

  return (
    <>
      <h1 className="text-2xl font-bold md:text-3xl">Payments</h1>
      <div className="flex flex-wrap gap-2">
        {TABS.map(([key, text]) => (
          <Link key={key} href={`/system/payments?status=${key}`} aria-current={status === key ? 'page' : undefined}
            className={`flex h-11 items-center rounded-xl px-5 text-sm font-semibold ${status === key ? 'bg-[var(--solid)] text-[color:var(--on-solid)]' : 'border border-[color:var(--line2)]'}`}>{text}</Link>
        ))}
      </div>
      {rows.length === 0 && <p className={`${card} text-sm ${muted}`}>Nothing here.</p>}
      <div className="grid gap-3 lg:grid-cols-2">
        {rows.map((p) => (
          <article key={p.id} className={`${card} flex flex-col gap-3`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-[var(--chip)] px-2.5 py-1 text-sm font-bold tracking-wider tabular">{p.pay_code}</span>
              <span className="text-lg font-bold">{money(p.amount / 100, p.currency)}</span>
              <span className={`ml-auto text-xs ${muted}`}>{fmtWhen(p.created_at)}</span>
            </div>
            <div className="text-sm">
              <div className="font-semibold">{p.purpose === 'new_group' ? `New group: ${p.group_name}` : `Add ${p.days} day${p.days === 1 ? '' : 's'} to a group`}</div>
              <div className={muted}>{p.days} day{p.days === 1 ? '' : 's'} · {p.profiles?.display_name ?? p.profiles?.email}</div>
              {p.reference_number && <div>Payer’s reference number: <b className="tabular">{p.reference_number}</b></div>}
              {p.review_note && <div role="note" className="mt-1 font-semibold text-[color:var(--danger)]">{p.review_note}</div>}
              {p.status === 'paid' && p.paid_at && <div className={muted}>Paid {fmtWhen(p.paid_at)}</div>}
            </div>
            {open && (
              <>
                <ActionForm action={confirmPaymentAction} keepOnSuccess className="flex flex-col gap-2 rounded-xl bg-[var(--chip)] p-3">
                  <input type="hidden" name="pay_code" value={p.pay_code ?? ''} />
                  <p className="text-sm font-semibold">Found it in the payment account? Enter what you see there.</p>
                  <div className="flex gap-2">
                    <label className={`${label} flex-1`}>Amount received (pesos)<input name="amount" type="number" step="0.01" min={1} required defaultValue={p.amount / 100} className={input} /></label>
                    <label className={`${label} flex-1`}>Channel
                      <select name="channel" className={input} defaultValue=""><option value="">Not sure</option><option value="gcash">GCash</option><option value="maya">Maya</option><option value="bank">Bank</option></select></label>
                  </div>
                  <label className={label}>Reference number<input name="reference" required defaultValue={p.reference_number ?? ''} autoComplete="off" className={input} /></label>
                  <label className={label}>Date and time in the payment app (Philippine time)<input name="datetime" type="datetime-local" required className={input} /></label>
                  <SubmitButton pendingText="Confirming…" className={btn}>Confirm payment</SubmitButton>
                </ActionForm>
                <ActionForm action={rejectPaymentAction} className="flex flex-col gap-2">
                  <input type="hidden" name="pay_code" value={p.pay_code ?? ''} />
                  <label className={label}>Can’t find it? Reason shown to the payer<input name="reason" placeholder="No payment with this reference was found." className={input} /></label>
                  <SubmitButton pendingText="Rejecting…" className={`${btn2} h-11`}>Reject</SubmitButton>
                </ActionForm>
              </>
            )}
          </article>
        ))}
      </div>
    </>
  )
}
