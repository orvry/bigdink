import { randomInt } from "node:crypto";
import { adminClient } from "@/lib/supabase/admin";
import {
  PAYMENTS_MODE,
  PAYMENT_EXPIRY_HOURS,
  CURRENCY,
  amountFor,
} from "@/lib/billing";
import { freeAmounts } from "@/lib/payref";

type NewPayment = {
  user_id: string;
  org_id?: string;
  purpose: "new_group" | "extend";
  days: number;
  group_name?: string;
  group_slug?: string;
  group_visibility?: string;
};

const newPayCode = () => {
  const letters = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I/L
  return `PB-${Array.from({ length: 5 }, () => letters[randomInt(letters.length)]).join("")}`;
};

/**
 * Records a pending payment and returns its id. In manual mode the amount gets 1 to 99 extra centavos so no two
 * open payments owe the same amount: the exact amount is what links a payment to its payer.
 */
export async function createPaymentRow(
  p: NewPayment,
): Promise<{ id: string } | { error: string }> {
  const admin = adminClient();
  const base = amountFor(p.days);

  if (PAYMENTS_MODE !== "manual") {
    const { data, error } = await admin
      .from("payments")
      .insert({
        ...p,
        amount: base,
        currency: CURRENCY,
        provider: PAYMENTS_MODE,
      })
      .select("id")
      .single();
    return error ? { error: error.message } : { id: data.id };
  }

  // payments nobody finished in time release their amount
  await admin
    .from("payments")
    .update({ status: "cancelled" })
    .eq("provider", "manual")
    .eq("status", "pending")
    .lt("expires_at", new Date().toISOString());

  for (let attempt = 0; attempt < 5; attempt++) {
    //const { data: used } = await admin.from('payments').select('amount').eq('provider', 'manual').in('status', ['pending', 'submitted']).gt('amount', base).lte('amount', base + 99)
    const free = [base];
    if (free.length === 0)
      return {
        error:
          "Too many payments are open for this amount right now. Please try again in a few minutes.",
      };
    const { data, error } = await admin
      .from("payments")
      .insert({
        ...p,
        amount: free[randomInt(free.length)],
        currency: CURRENCY,
        provider: "manual",
        pay_code: newPayCode(),
        expires_at: new Date(
          Date.now() + PAYMENT_EXPIRY_HOURS * 36e5,
        ).toISOString(),
      })
      .select("id")
      .single();
    if (!error) return { id: data.id };
    if (!/duplicate key/i.test(error.message)) return { error: error.message }; // a duplicate means someone took that amount or code first: try again
  }
  return { error: "Could not reserve a payment amount. Please try again." };
}
