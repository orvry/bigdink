# Payment confirmation API (for system admins)

Payments are made by QR (GCash, Maya or bank). The payer pays the exact amount shown, then types the reference
number from their receipt on the payment page. You confirm the payment by telling the system what you see in the
payment account. When the reference number and the amount match, the payment completes by itself: the group is
created or the days are added.

All calls need the header `Authorization: Bearer <ADMIN_API_KEY>` (the secret in your server environment).
Always use https. Never put the key in the app's browser code or in a public place.

## The daily routine

1. List the payments waiting to be checked: `GET /api/admin/payments?status=submitted`
2. For each one, look in the GCash, Maya or bank account for the reference number and the amount.
3. Found it: `POST /api/admin/payments/confirm` with the amount, reference number and date/time you see.
4. Not found: `POST /api/admin/payments/reject` with the payment code and a reason.

The order does not matter. You can confirm a payment before the payer types the reference number. It is kept, and it matches as soon as they do.

## GET /api/admin/payments?status=submitted

Lists manual payments in a status (`pending`, `submitted`, `paid`, `failed`, `cancelled`). Default `submitted`. Oldest first, up to 100.

```bash
curl -H "Authorization: Bearer $ADMIN_API_KEY" "https://YOUR-SITE/api/admin/payments?status=submitted"
```

Each payment has `pay_code`, `amount` (pesos, with the cents that identify it), `currency`, `reference_number`
(what the payer typed), `reference_submitted_at`, `purpose` (`new_group` or `extend`), `days`, `group_name`, `payer_email`.

## POST /api/admin/payments/confirm

| Field | Meaning |
|---|---|
| `amount` | Pesos received, for example `500.37`. Must equal the amount due exactly. |
| `reference_number` | The reference shown in the payment app. Spaces, dashes and letter case are ignored. |
| `datetime` | When the payment was made, ISO 8601, for example `2026-10-26T14:05:00+08:00`. With no timezone, Philippine time (+08:00) is assumed. |
| `channel` | Optional: `gcash`, `maya` or `bank`. |

```bash
curl -X POST https://YOUR-SITE/api/admin/payments/confirm \
  -H "Authorization: Bearer $ADMIN_API_KEY" -H "Content-Type: application/json" \
  -d '{"amount": 500.37, "reference_number": "1234 567 890123", "datetime": "2026-10-26T14:05:00+08:00", "channel": "gcash"}'
```

Answers:
- `{"status":"matched","payment":{...}}`: paid, and the group or days were applied.
- `{"status":"stored"}`: saved. No payer has entered this reference with this amount yet. It matches when they do.
- `{"status":"already_matched"}`: you sent this one before. Nothing changed.
- `409 conflict`: this reference number was reported before with a different amount. Check it.
- `400`: something in the request is missing or unreadable. The message says what.

A payment matches only when all three agree: the same reference number, exactly the same amount, and a payment time
after the payment was created (10 minutes of tolerance) and before it expired. If a payer enters a reference that you
confirmed with a different amount or time, they see a message asking them to contact support and quote their payment code.

## POST /api/admin/payments/reject

```bash
curl -X POST https://YOUR-SITE/api/admin/payments/reject \
  -H "Authorization: Bearer $ADMIN_API_KEY" -H "Content-Type: application/json" \
  -d '{"pay_code": "PB-7K3Q9", "reason": "No payment with this reference was found."}'
```

The payment is closed as failed and the payer sees your reason. Nothing is created.

## Why the amount has cents

Every open payment gets a different amount (the price plus 1 to 99 centavos). The exact amount is what ties a
payment to its payer. Without it, someone could type another person's reference number and claim their payment.
Payers are told to pay the exact amount. If they pay a different amount, it will not match, and you can handle it by hand.

## Good to know

- Unpaid payments expire after 48 hours. Payers can start a new one.
- A payer can try 5 reference numbers per payment.
- Keep `ADMIN_API_KEY` secret. To change it, set a new value in the server environment and redeploy.
- Everything here runs through the service role key on the server. The browser can never mark a payment paid.
