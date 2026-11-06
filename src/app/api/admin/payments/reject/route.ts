import { isAdminRequest, unauthorized } from '@/lib/adminApi'
import { rejectPayment } from '@/lib/system/payments'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/payments/reject
 * Body: { "pay_code": "PB-7K3Q9", "reason": "No payment with this reference was found." }
 * Use it when a payment cannot be found in the payment account. The payer sees the reason.
 */
export async function POST(req: Request) {
  if (!isAdminRequest(req)) return unauthorized()
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return Response.json({ error: 'Send a JSON body.' }, { status: 400 }) }
  const code = String(body.pay_code ?? '').trim()
  const reason = String(body.reason ?? '').trim()
  if (!code || !reason) return Response.json({ error: 'pay_code and reason are required.' }, { status: 400 })
  const r = await rejectPayment(code, reason)
  return r.ok ? Response.json({ status: 'rejected', pay_code: code.toUpperCase() }) : Response.json({ error: r.error }, { status: r.error?.startsWith('No open') ? 404 : 500 })
}
