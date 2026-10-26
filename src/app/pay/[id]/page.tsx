import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { simulatePayment } from '@/app/actions'
import { PAYMENTS_MODE } from '@/lib/billing'
import { money } from '@/lib/format'
import SubmitButton from '@/components/SubmitButton'
import Breadcrumbs from '@/components/Breadcrumbs'
import { card, btn, btn2, muted } from '@/lib/ui'
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
  return (
    <div className="md:mx-auto md:w-full md:max-w-md">
      <Breadcrumbs items={[{ label: 'All tournaments', href: '/' }, { label: 'Payment' }]} />
      <h1 className="mt-2 text-2xl font-bold">Payment</h1>
      <div className={`${card} mt-3 flex flex-col gap-2`}>
        <div className="font-semibold">{what}</div>
        <div className={`text-sm ${muted}`}>{p.days} rental day{p.days === 1 ? '' : 's'}</div>
        <div className="text-3xl font-bold">{money(p.amount / 100, p.currency)}</div>
        <div className="text-sm">Status: <b className="capitalize">{p.status}</b></div>
      </div>

      {p.status === 'pending' && PAYMENTS_MODE === 'simulated' && (
        <div className="mt-3 flex flex-col gap-2">
          <p role="note" className="rounded-xl bg-[#F5C84C] p-3 text-sm font-semibold text-[#10231A]">Simulated checkout. No real money moves. Paymongo will replace this page.</p>
          <form action={simulatePayment.bind(null, id, 'success')}><SubmitButton pendingText="Processing…" className={`${btn} w-full`}>Simulate successful payment</SubmitButton></form>
          <form action={simulatePayment.bind(null, id, 'fail')}><SubmitButton pendingText="Processing…" className={`${btn2} w-full`}>Simulate failed payment</SubmitButton></form>
          <form action={simulatePayment.bind(null, id, 'cancel')}><SubmitButton pendingText="Cancelling…" className="h-12 w-full font-semibold text-[color:var(--muted)]">Cancel</SubmitButton></form>
        </div>
      )}
      {p.status === 'pending' && PAYMENTS_MODE !== 'simulated' && <p className={`mt-3 text-sm ${muted}`}>Waiting for the payment provider. This page updates when your payment is confirmed.</p>}
      {p.status === 'paid' && <Link href="/" className={`${btn} mt-3 w-full`}>Done. Back to your groups</Link>}
      {(p.status === 'failed' || p.status === 'cancelled') && (
        <div className="mt-3 flex flex-col gap-2">
          <p role="alert" className="text-sm font-semibold text-red-700 dark:text-red-400">This payment {p.status === 'failed' ? 'did not go through' : 'was cancelled'}. Nothing was charged and nothing was created.</p>
          <Link href={p.purpose === 'new_group' ? '/new-group' : '/'} className={`${btn} w-full`}>Try again</Link>
        </div>
      )}
    </div>
  )
}
