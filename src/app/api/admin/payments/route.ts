import { adminClient } from '@/lib/supabase/admin'
import { isAdminRequest, unauthorized } from '@/lib/adminApi'

export const dynamic = 'force-dynamic'

/** GET /api/admin/payments?status=submitted: payments waiting to be checked against the payment account. */
export async function GET(req: Request) {
  if (!isAdminRequest(req)) return unauthorized()
  const status = new URL(req.url).searchParams.get('status') ?? 'submitted'
  if (!['pending', 'submitted', 'paid', 'failed', 'cancelled'].includes(status)) return Response.json({ error: 'Unknown status.' }, { status: 400 })
  const { data, error } = await adminClient()
    .from('payments')
    .select('pay_code,status,purpose,days,amount,currency,group_name,group_slug,reference_number,reference_submitted_at,created_at,expires_at,review_note,profiles(email)')
    .eq('provider', 'manual').eq('status', status)
    .order('created_at', { ascending: true }).limit(100)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  const rows = (data ?? []).map((p) => {
    const { amount, profiles, ...rest } = p as typeof p & { profiles: { email: string } | null }
    return { ...rest, amount: amount / 100, payer_email: profiles?.email ?? null }
  })
  return Response.json({ payments: rows })
}
