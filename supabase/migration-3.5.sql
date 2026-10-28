-- Pickleball Live 3.5 migration. Run after migration-3.4.sql.
-- Payments are now matched by their payment code (like PB-7K3Q9), so the amount is a plain whole price with no extra cents.

drop index if exists payments_open_amount;
alter table payment_confirmations add column if not exists pay_code text;      -- the code the system admin ties to the payment they saw
create index if not exists payment_confirmations_code on payment_confirmations (pay_code);

-- Matches a confirmation to the payment that has its code: same code, exact same amount, and a payment time after the
-- payment was created (10 minutes of clock tolerance) and before it expired. It can match before the payer enters a reference.
create or replace function match_payment_reference(p_ref text) returns uuid language plpgsql security definer set search_path=public as $$
declare c payment_confirmations; p payments;
begin
  select * into c from payment_confirmations where reference_number=p_ref and matched_payment_id is null for update;
  if c.id is null or c.pay_code is null then return null; end if;
  select * into p from payments
    where pay_code=c.pay_code and provider='manual' and status in ('pending','submitted') and amount=c.amount
      and c.paid_at >= created_at - interval '10 minutes' and (expires_at is null or c.paid_at <= expires_at)
    for update;
  if p.id is null then
    update payments set review_note='A payment with your code was received, but its amount or time does not match. Contact support and quote your payment code.'
      where pay_code=c.pay_code and provider='manual' and status in ('pending','submitted');
    return null;
  end if;
  update payments set reference_number=c.reference_number where id=p.id;      -- keep the confirmed receipt reference
  perform fulfill_payment(p.id);
  update payment_confirmations set matched_payment_id=p.id where id=c.id;
  return p.id;
end $$;
revoke all on function match_payment_reference(text) from public, anon, authenticated;
grant execute on function match_payment_reference(text) to service_role;
