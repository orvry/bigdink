# Payment confirmation (system admins)

Payments are made by QR (GCash, Maya or bank) for a plain whole-peso price. Every payment has its own **payment code**
(like `PB-7K3Q9`). The payer writes the code in the payment message and, after paying, types the reference number from
their receipt on the payment page. You confirm the payment by telling the system what you see in the payment account,
together with the payment code. When the code and the exact amount match, the group is created or the days are added.

You can do this on the **System, Payments** screen in the app, or through the API below. Both use the same rules.
To use the API, send `Authorization: Bearer <ADMIN_API_KEY>` (the secret in your server environment) over https, and
never put the key in browser code or anywhere public.

## The routine

1. List the payments waiting: the Payments screen, or `GET /api/admin/payments?status=submitted`.
2. For each one, look in the payment account for the reference number the payer typed, or for the payment code in the message.
3. Found it: confirm with the **code**, the **amount**, the **reference number** and the **date and time** you see there.
4. Not found: reject it with a reason. The payer sees the reason.

Payers whose app has no message field cannot write the code, so they type the reference number instead. The list shows
it next to the code, which is how you tie a transfer to a payment.

## GET /api/admin/payments?status=submitted

Lists manual payments by status (`pending`, `submitted`, `paid`, `failed`, `cancelled`). Default `submitted`. Oldest first, up to 100.

```bash
curl -H "Authorization: Bearer $ADMIN_API_KEY" "https://YOUR-SITE/api/admin/payments?status=submitted"
```

Each payment has `pay_code`, `amount` (pesos), `currency`, `reference_number` (what the payer typed), `reference_submitted_at`,
`purpose` (`new_group` or `extend`), `days`, `group_name`, `payer_email`.

## POST /api/admin/payments/confirm

| Field | Meaning |
|---|---|
| `pay_code` | The payment code, for example `PB-7K3Q9`. Required. |
| `amount` | Pesos received, for example `500`. Must equal the amount due exactly. |
| `reference_number` | The reference shown in the payment app. Spaces, dashes and letter case are ignored. |
| `datetime` | When the payment was made, ISO 8601, for example `2026-10-26T14:05:00+08:00`. With no timezone, Philippine time (+08:00) is assumed. |
| `channel` | Optional: `gcash`, `maya` or `bank`. |

```bash
curl -X POST https://YOUR-SITE/api/admin/payments/confirm \
  -H "Authorization: Bearer $ADMIN_API_KEY" -H "Content-Type: application/json" \
  -d '{"pay_code": "PB-7K3Q9", "amount": 500, "reference_number": "1234 567 890123", "datetime": "2026-10-26T14:05:00+08:00", "channel": "gcash"}'
```

Answers (JSON with a `status`):
- `matched` (200): paid. The group was created or the days were added.
- `already_matched` (200): you sent this one before. Nothing changed.
- `unknown_code` (404): no payment has that code.
- `amount_mismatch` (409): the amount differs from the amount due. The message says what is due.
- `closed` (409): that payment is already paid, rejected, cancelled or expired.
- `conflict` (409): this reference number was reported before with a different code or amount.
- `not_matched` (409): the payment time is not after the payment was created (10 minutes tolerance) or is after it expired.
- `400`: something is missing or unreadable. The message says what.

## POST /api/admin/payments/reject

```bash
curl -X POST https://YOUR-SITE/api/admin/payments/reject \
  -H "Authorization: Bearer $ADMIN_API_KEY" -H "Content-Type: application/json" \
  -d '{"pay_code": "PB-7K3Q9", "reason": "No payment with this reference was found."}'
```

The payment is closed as failed and the payer sees your reason. Nothing is created.

## Why the payment code

The payer cannot confirm their own payment: only you can, and you decide which code a transfer belongs to. The code
identifies the payment, so the price stays a plain number of pesos. Someone typing another person's reference number
cannot get that payment credited, because the confirmation names the code.

## Good to know

- Unpaid payments expire after 48 hours. Payers can start a new one.
- A payer can try 5 reference numbers per payment.
- Keep `ADMIN_API_KEY` secret. To change it, set a new value in the server environment and redeploy.
- Everything here runs with the service role key on the server. The browser can never mark a payment paid.
- Only system admins (the flag on the profile) can open the System screens.
