-- Pickleball Live 3.2 migration: manual QR payments (GCash, Maya, bank) confirmed through a system-admin API.
-- Run after migration-3.1.sql. New project order: schema.sql, migration-3.1.sql, migration-3.2.sql.
-- Paying works like this: the payer scans a QR code, pays the exact amount shown (the cents make it unique),
-- then types the reference number from their receipt. A system admin (or a script) confirms the payment through
-- the API with the amount, reference number and date/time seen in the payment app. When both sides agree, it is paid.

alter table payments drop constraint if exists payments_status_check;
alter table payments add constraint payments_status_check check (status in ('pending','submitted','paid','failed','cancelled'));
alter table payments drop constraint if exists payments_provider_check;
alter table payments add constraint payments_provider_check check (provider in ('simulated','paymongo','manual'));
alter table payments add column if not exists pay_code text;                 -- short code the payer can quote to support, e.g. PB-7K3Q9
alter table payments add column if not exists reference_number text;         -- typed by the payer, normalized (upper case, letters and digits only)
alter table payments add column if not exists reference_submitted_at timestamptz;
alter table payments add column if not exists ref_attempts int not null default 0;
alter table payments add column if not exists review_note text;              -- shown to the payer when something does not match
alter table payments add column if not exists expires_at timestamptz;        -- unpaid manual payments stop being accepted after 48 hours
create unique index if not exists payments_pay_code on payments (pay_code) where pay_code is not null;
-- Two open manual payments can never owe the same amount. That is what stops someone claiming another person's reference number.
create unique index if not exists payments_open_amount on payments (amount) where provider='manual' and status in ('pending','submitted');
create unique index if not exists payments_paid_reference on payments (reference_number) where status='paid' and reference_number is not null;
create index if not exists payments_reference on payments (reference_number) where reference_number is not null;

-- What the system admin reports from the payment app. Server only: no policies, so no browser access.
create table if not exists payment_confirmations (
  id uuid primary key default gen_random_uuid(),
  reference_number text not null unique,                       -- normalized, one confirmation per reference
  amount int not null check (amount > 0),                      -- centavos
  paid_at timestamptz not null,                                -- date and time shown in the payment app
  channel text,                                                -- optional: gcash, maya, bank
  matched_payment_id uuid references payments on delete set null,
  received_at timestamptz not null default now()
);
alter table payment_confirmations enable row level security;

create or replace function fulfill_payment(p_payment uuid) returns text language plpgsql security definer set search_path=public as $$
declare p payments; oid uuid;
begin
  select * into p from payments where id=p_payment for update;
  if p.id is null then raise exception 'payment not found'; end if;
  if p.status='paid' then return coalesce(p.org_id::text,''); end if;      -- safe to call twice (webhooks retry)
  if p.status not in ('pending','submitted') then raise exception 'payment is %', p.status; end if;
  if p.purpose='new_group' then
    insert into organizations(name, slug, visibility, rental_until)
      values (p.group_name, p.group_slug, coalesce(p.group_visibility,'public'), now() + make_interval(days => p.days))
      returning id into oid;
    insert into memberships(org_id, user_id, role) values (oid, p.user_id, 'admin');
  else
    oid := p.org_id;
    update organizations set rental_until = greatest(coalesce(rental_until, now()), now()) + make_interval(days => p.days) where id=oid;
  end if;
  update payments set status='paid', paid_at=now(), org_id=oid where id=p_payment;
  return oid::text;
end $$;

-- Matches a confirmation to the payer's submitted reference: same reference, exact same amount,
-- and a payment time that is after the payment was created (10 minutes of clock tolerance) and before it expired.
create or replace function match_payment_reference(p_ref text) returns uuid language plpgsql security definer set search_path=public as $$
declare c payment_confirmations; p payments;
begin
  select * into c from payment_confirmations where reference_number=p_ref and matched_payment_id is null for update;
  if c.id is null then return null; end if;
  select * into p from payments
    where reference_number=p_ref and provider='manual' and status='submitted' and amount=c.amount
      and c.paid_at >= created_at - interval '10 minutes' and (expires_at is null or c.paid_at <= expires_at)
    order by created_at limit 1 for update;
  if p.id is null then
    update payments set review_note='A payment with this reference was received, but its amount or time does not match this payment. Contact support and quote your payment code.'
      where reference_number=p_ref and provider='manual' and status='submitted';
    return null;
  end if;
  perform fulfill_payment(p.id);
  update payment_confirmations set matched_payment_id=p.id where id=c.id;
  return p.id;
end $$;
revoke all on function match_payment_reference(text) from public, anon, authenticated;
grant execute on function match_payment_reference(text) to service_role;
