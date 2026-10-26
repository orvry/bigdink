import { adminClient } from '@/lib/supabase/admin'
import { isAdminRequest, unauthorized } from '@/lib/adminApi'
import { normalizeRef, parseWhen } from '@/lib/payref'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/payments/confirm
 * Body: { "amount": 500.37, "reference_number": "1234 567 890123", "datetime": "2026-10-26T14:05:00+08:00", "channel": "gcash" }
 * Reports one payment seen in the GCash, Maya or bank account. It pays the matching payment as soon as the payer has
 * entered the same reference number and the amount is exactly the amount due. Safe to send twice.
 */
export async function POST(req: Request) {
  if (!isAdminRequest(req)) return unauthorized()
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return Response.json({ error: 'Send a JSON body.' }, { status: 400 }) }

  const amount = Math.round(Number(body.amount) * 100)
  const ref = normalizeRef(String(body.reference_number ?? ''))
  const when = parseWhen(String(body.datetime ?? ''))
  if (!Number.isFinite(amount) || amount <= 0) return Response.json({ error: 'amount must be a positive number of pesos, for example 500.37.' }, { status: 400 })
  if (ref.length < 6 || ref.length > 40) return Response.json({ error: 'reference_number must be the reference shown in the payment app.' }, { status: 400 })
  if (!when) return Response.json({ error: 'datetime must be ISO 8601, for example 2026-10-26T14:05:00+08:00. Without a timezone, Philippine time (+08:00) is assumed.' }, { status: 400 })
  const channel = typeof body.channel === 'string' ? body.channel.slice(0, 20) : null

  const admin = adminClient()
  const { error } = await admin.from('payment_confirmations').insert({ reference_number: ref, amount, paid_at: when.toISOString(), channel })
  if (error) {
    if (!/duplicate key/i.test(error.message)) return Response.json({ error: error.message }, { status: 500 })
    const { data: old } = await admin.from('payment_confirmations').select('amount,matched_payment_id').eq('reference_number', ref).single()
    if (old && old.amount !== amount) return Response.json({ status: 'conflict', error: 'This reference number was already reported with a different amount.' }, { status: 409 })
    if (old?.matched_payment_id) return Response.json({ status: 'already_matched' })
  }

  const { data: matched, error: matchError } = await admin.rpc('match_payment_reference', { p_ref: ref })
  if (matchError) return Response.json({ status: 'stored_not_matched', error: matchError.message }, { status: 500 })
  if (matched) {
    const { data: p } = await admin.from('payments').select('pay_code,purpose,days,group_slug').eq('id', matched as string).single()
    return Response.json({ status: 'matched', payment: p })
  }
  return Response.json({ status: 'stored', message: 'Stored. It will match when the payer enters this reference number and the amount due is the same.' })
}
