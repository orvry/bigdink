import { randomInt } from 'node:crypto'
import { adminClient } from '@/lib/supabase/admin'
import { PAYMENTS_MODE, PAYMENT_EXPIRY_HOURS, CURRENCY, amountFor } from '@/lib/billing'

type NewPayment = {
  user_id: string; org_id?: string; purpose: 'new_group' | 'extend'; days: number
  group_name?: string; group_slug?: string; group_visibility?: string
}

export const newPayCode = () => {
  const letters = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // no 0/O, 1/I/L
  return `PB-${Array.from({ length: 5 }, () => letters[randomInt(letters.length)]).join('')}`
}

/**
 * Records a pending payment and returns its id. The amount is the plain price. In manual mode the payment code is what
 * ties a real transfer to this payment, so every payment gets its own code.
 */
export async function createPaymentRow(p: NewPayment): Promise<{ id: string } | { error: string }> {
  const admin = adminClient()
  const base = { ...p, amount: amountFor(p.days), currency: CURRENCY }
  if (PAYMENTS_MODE !== 'manual') {
    const { data, error } = await admin.from('payments').insert({ ...base, provider: PAYMENTS_MODE }).select('id').single()
    return error ? { error: error.message } : { id: data.id }
  }
  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await admin.from('payments').insert({
      ...base, provider: 'manual', pay_code: newPayCode(),
      expires_at: new Date(Date.now() + PAYMENT_EXPIRY_HOURS * 36e5).toISOString(),
    }).select('id').single()
    if (!error) return { id: data.id }
    if (!/duplicate key/i.test(error.message)) return { error: error.message } // a duplicate code: try another one
  }
  return { error: 'Could not create the payment. Please try again.' }
}
