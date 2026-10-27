import Link from 'next/link'
import Image from 'next/image'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { simulatePayment, submitReference } from '@/app/actions'
import { PAYMENTS_MODE, fmtWhen } from '@/lib/billing'
import { PAY_METHODS } from '@/lib/payment-methods'
import { money } from '@/lib/format'
import ActionForm from '@/components/ActionForm'
import PollRefresh from '@/components/PollRefresh'
import SubmitButton from '@/components/SubmitButton'
import Breadcrumbs from '@/components/Breadcrumbs'
import { card, btn, btn2, input, label, muted } from '@/lib/ui'
import type { Payment } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function Pay({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireUser()
  const sb = await createClient()
  const { data } = await sb.from('payments').select('*').eq('id', id).maybeSingle()
  if (!data) notFound() // not yours, or doesn't exist
  const p = data as Payment
  const what = p.purpose === 'new_group' ? `New group: ${p.group_name}` : 'Add more days to the group'
  const manual = p.provider === 'manual'
  const expired = manual && p.status === 'pending' && !!p.expires_at && new Date(p.expires_at) < new Date()
  const open = (p.status === 'pending' || p.status === 'submitted') && !expired

  let dest = '/'
  if (p.status === 'paid') {
    const { data: org } = p.org_id ? await sb.from('organizations').select('slug').eq('id', p.org_id).maybeSingle() : { data: null }
    if (org) dest = p.purpose === 'new_group' ? `/${org.slug}/admin` : `/${org.slug}/admin/billing?paid=1`
  }

  return (
    <div className="md:mx-auto md:w-full md:max-w-2xl">
      <Breadcrumbs items={[{ label: 'All tournaments', href: '/' }, { label: 'Payment' }]} />
      <h1 className="mt-2 text-2xl font-bold">Payment</h1>

      <div className={`${card} mt-3 flex flex-col gap-2`}>
        <div className="font-semibold">{what}</div>
        <div className={`text-sm ${muted}`}>{p.days} day{p.days === 1 ? '' : 's'}</div>
        <div className="text-sm">Amount to pay</div>
        <div className="text-4xl font-bold">{money(p.amount / 100, p.currency)}</div>
        {manual && open && <p className="text-sm font-semibold">Pay exactly this amount, including the cents. The cents identify your payment.</p>}
        {manual && p.pay_code && <div className="text-sm">Payment code: <b className="rounded bg-[var(--chip)] px-2 py-0.5">{p.pay_code}</b> <span className={muted}>Put it in the payment message if the app has one. Quote it if you contact support.</span></div>}
        <div className="text-sm">Status: <b>{expired ? 'Expired' : p.status === 'submitted' ? 'Waiting for confirmation' : p.status.charAt(0).toUpperCase() + p.status.slice(1)}</b></div>
      </div>

      {manual && open && (
        <>
          <h2 className="mt-4 font-bold">Step 1. Scan and pay</h2>
          <p className={`text-sm ${muted}`}>Open GCash, Maya or your banking app, scan one of these codes and pay {money(p.amount / 100, p.currency)}.</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            {PAY_METHODS.map((m) => {
              const has = existsSync(path.join(process.cwd(), 'public', m.qr))
              return (
                <section key={m.id} aria-label={m.name} className={`${card} flex flex-col items-center gap-2 text-center`}>
                  <h3 className="font-bold">{m.name}</h3>
                  {has ? <Image src={m.qr} alt={`${m.name} payment QR code`} width={224} height={224} unoptimized className="h-auto w-full max-w-[14rem] rounded-lg" />
                    : <p className={`rounded-lg bg-[var(--chip)] p-4 text-sm ${muted}`}>QR not set up yet. Add {m.qr} to the public folder.</p>}
                  <div className="text-sm font-semibold">{m.accountName}</div>
                  {m.accountNumber && <div className={`text-xs ${muted}`}>{m.accountNumber}</div>}
                </section>
              )
            })}
          </div>

          <h2 className="mt-4 font-bold">Step 2. Enter your reference number</h2>
          <p className={`text-sm ${muted}`}>After paying, your payment app shows a reference number on the receipt. Type it here so we can match your payment.</p>
          <ActionForm action={submitReference} keepOnSuccess className={`${card} mt-2 flex flex-col gap-3`}>
            <input type="hidden" name="payment_id" value={p.id} />
            <label className={label}>Reference number
              <input name="reference" required defaultValue={p.reference_number ?? ''} autoComplete="off" inputMode="text" placeholder="For example 1234 567 890123" className={input} />
            </label>
            <SubmitButton pendingText="Checking…" className={btn}>{p.status === 'submitted' ? 'Update reference number' : 'I have paid. Check my payment'}</SubmitButton>
          </ActionForm>
        </>
      )}

      {manual && p.status === 'submitted' && !expired && (
        <div role="status" className={`${card} mt-3`}>
          <PollRefresh seconds={15} />
          <p className="font-semibold">Waiting for confirmation of reference {p.reference_number}.</p>
          <p className={`mt-1 text-sm ${muted}`}>An admin checks it against the payment account. This page updates by itself when it is confirmed. You can leave and come back to this link.</p>
          {p.review_note && <p role="alert" className="mt-2 text-sm font-semibold text-red-700 dark:text-red-400">{p.review_note}</p>}
        </div>
      )}
      {manual && open && p.expires_at && <p className={`mt-2 text-xs ${muted}`}>Pay before {fmtWhen(p.expires_at)}. After that this payment expires and you can start a new one.</p>}

      {p.status === 'pending' && !manual && PAYMENTS_MODE === 'simulated' && (
        <div className="mt-3 flex flex-col gap-2">
          <p role="note" className="rounded-xl bg-[var(--gold)] p-3 text-sm font-semibold text-[#172033]">Simulated checkout. No real money moves.</p>
          <form action={simulatePayment.bind(null, id, 'success')}><SubmitButton pendingText="Processing…" className={`${btn} w-full`}>Simulate successful payment</SubmitButton></form>
          <form action={simulatePayment.bind(null, id, 'fail')}><SubmitButton pendingText="Processing…" className={`${btn2} w-full`}>Simulate failed payment</SubmitButton></form>
          <form action={simulatePayment.bind(null, id, 'cancel')}><SubmitButton pendingText="Cancelling…" className="h-12 w-full font-semibold text-[color:var(--muted)]">Cancel</SubmitButton></form>
        </div>
      )}

      {p.status === 'paid' && (
        <div className="mt-3 flex flex-col gap-2">
          <p role="status" className="rounded-xl bg-[var(--chip)] p-3 text-sm font-semibold">✓ Payment confirmed. Thank you.</p>
          <Link href={dest} className={`${btn} w-full`}>{dest === '/' ? 'Back to home' : p.purpose === 'new_group' ? 'Open your group' : 'Back to billing'}</Link>
        </div>
      )}
      {(p.status === 'failed' || p.status === 'cancelled' || expired) && (
        <div className="mt-3 flex flex-col gap-2">
          <p role="alert" className="text-sm font-semibold text-red-700 dark:text-red-400">
            {expired ? 'This payment expired before it was completed.' : p.status === 'failed' ? 'This payment was not accepted.' : 'This payment was cancelled.'} Nothing was created.
          </p>
          {p.review_note && <p className="text-sm">{p.review_note}</p>}
          <Link href={p.purpose === 'new_group' ? '/new-group' : '/'} className={`${btn} w-full`}>Start again</Link>
        </div>
      )}
    </div>
  )
}
