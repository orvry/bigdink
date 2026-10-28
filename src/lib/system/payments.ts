import { adminClient } from '@/lib/supabase/admin'

/**
 * System-admin payment actions. The confirmation API and the /system screens both call these, so the rules live in one
 * place. If the system admin tools become a separate application, it can keep calling the API and this folder moves with it.
 */
export type ConfirmInput = { payCode: string; amount: number; reference: string; paidAt: Date; channel?: string | null }
export type ConfirmResult =
  | { ok: true; status: 'matched'; payment: { pay_code: string; purpose: string; days: number; group_slug: string | null } }
  | { ok: true; status: 'already_matched' }
  | { ok: false; status: 'unknown_code' | 'closed' | 'amount_mismatch' | 'conflict' | 'not_matched' | 'error'; error: string }

const pesos = (centavos: number) => (centavos / 100).toLocaleString('en-PH', { maximumFractionDigits: 2 })

/** Amount is in centavos. Pays the payment that has this code, if the amount is exactly what is due. Safe to call twice. */
export async function confirmPayment(i: ConfirmInput): Promise<ConfirmResult> {
  const admin = adminClient()
  const code = i.payCode.trim().toUpperCase()

  const { data: p } = await admin.from('payments').select('id,status,amount').eq('pay_code', code).eq('provider', 'manual').maybeSingle()
  if (!p) return { ok: false, status: 'unknown_code', error: 'No payment has that code. Check it against the payment list.' }

  const { data: old } = await admin.from('payment_confirmations').select('pay_code,amount,matched_payment_id').eq('reference_number', i.reference).maybeSingle()
  if (old?.matched_payment_id) return { ok: true, status: 'already_matched' }
  if (old && (old.pay_code !== code || old.amount !== i.amount)) return { ok: false, status: 'conflict', error: 'This reference number was already reported with a different code or amount.' }
  if (!['pending', 'submitted'].includes(p.status)) return { ok: false, status: 'closed', error: `That payment is already ${p.status}.` }
  if (p.amount !== i.amount) return { ok: false, status: 'amount_mismatch', error: `The amount due is ${pesos(p.amount)} but ${pesos(i.amount)} was reported.` }

  if (!old) {
    const { error } = await admin.from('payment_confirmations').insert({ reference_number: i.reference, pay_code: code, amount: i.amount, paid_at: i.paidAt.toISOString(), channel: i.channel ?? null })
    if (error) return { ok: false, status: 'error', error: error.message }
  }
  const { data: matched, error } = await admin.rpc('match_payment_reference', { p_ref: i.reference })
  if (error) return { ok: false, status: 'error', error: error.message }
  if (!matched) return { ok: false, status: 'not_matched', error: 'The payment time is outside the allowed window (after the payment was created and before it expired).' }
  const { data: done } = await admin.from('payments').select('pay_code,purpose,days,group_slug').eq('id', matched as string).single()
  return { ok: true, status: 'matched', payment: done as { pay_code: string; purpose: string; days: number; group_slug: string | null } }
}

/** For a payment that cannot be found in the payment account. The payer sees the reason. */
export async function rejectPayment(payCode: string, reason: string): Promise<{ ok: boolean; error?: string }> {
  const { data, error } = await adminClient().from('payments')
    .update({ status: 'failed', review_note: reason.slice(0, 300) }).eq('pay_code', payCode.trim().toUpperCase()).eq('provider', 'manual').in('status', ['pending', 'submitted']).select('pay_code')
  if (error) return { ok: false, error: error.message }
  return data?.length ? { ok: true } : { ok: false, error: 'No open payment with that code.' }
}
