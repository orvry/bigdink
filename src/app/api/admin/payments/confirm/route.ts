import { isAdminRequest, unauthorized } from '@/lib/adminApi'
import { normalizeRef, parseWhen } from '@/lib/payref'
import { confirmPayment } from '@/lib/system/payments'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/payments/confirm
 * Body: { "pay_code": "PB-7K3Q9", "amount": 500, "reference_number": "1234 567 890123", "datetime": "2026-10-26T14:05:00+08:00", "channel": "gcash" }
 * Reports one payment seen in the GCash, Maya or bank account and ties it to the payment with that code.
 * The payment completes if the amount is exactly what is due. Safe to send twice.
 */
export async function POST(req: Request) {
  if (!isAdminRequest(req)) return unauthorized()
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return Response.json({ error: 'Send a JSON body.' }, { status: 400 }) }

  const payCode = String(body.pay_code ?? '').trim()
  const amount = Math.round(Number(body.amount) * 100)
  const reference = normalizeRef(String(body.reference_number ?? ''))
  const paidAt = parseWhen(String(body.datetime ?? ''))
  if (!/^PB-[A-Z0-9]{5}$/i.test(payCode)) return Response.json({ error: 'pay_code is required, for example PB-7K3Q9. Find it on the payment list or in the payment message.' }, { status: 400 })
  if (!Number.isFinite(amount) || amount <= 0) return Response.json({ error: 'amount must be a positive number of pesos, for example 500.' }, { status: 400 })
  if (reference.length < 6 || reference.length > 40) return Response.json({ error: 'reference_number must be the reference shown in the payment app.' }, { status: 400 })
  if (!paidAt) return Response.json({ error: 'datetime must be ISO 8601, for example 2026-10-26T14:05:00+08:00. Without a timezone, Philippine time (+08:00) is assumed.' }, { status: 400 })

  const r = await confirmPayment({ payCode, amount, reference, paidAt, channel: typeof body.channel === 'string' ? body.channel.slice(0, 20) : null })
  if (r.ok) return Response.json(r)
  const http = r.status === 'unknown_code' ? 404 : r.status === 'error' ? 500 : 409
  return Response.json(r, { status: http })
}
