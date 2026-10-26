import { adminClient } from '@/lib/supabase/admin'
import { isAdminRequest, unauthorized } from '@/lib/adminApi'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/payments/reject
 * Body: { "pay_code": "PB-7K3Q9", "reason": "No payment with this reference was found." }
 * Use it when a submitted reference number does not exist in the payment account. The payer sees the reason.
 */
export async function POST(req: Request) {
  if (!isAdminRequest(req)) return unauthorized()
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return Response.json({ error: 'Send a JSON body.' }, { status: 400 }) }
  const code = String(body.pay_code ?? '').trim().toUpperCase()
  const reason = String(body.reason ?? '').trim().slice(0, 300)
  if (!code || !reason) return Response.json({ error: 'pay_code and reason are required.' }, { status: 400 })
  const { data, error } = await adminClient().from('payments')
    .update({ status: 'failed', review_note: reason }).eq('pay_code', code).eq('provider', 'manual').in('status', ['pending', 'submitted']).select('pay_code')
  if (error) return Response.json({ error: error.message }, { status: 500 })
  if (!data?.length) return Response.json({ error: 'No open payment with that code.' }, { status: 404 })
  return Response.json({ status: 'rejected', pay_code: code })
}
