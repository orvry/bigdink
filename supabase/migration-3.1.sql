-- Pickleball Live 3.1 migration. Run AFTER schema.sql.
--   New project:        run schema.sql, then this file.
--   Existing v3 project: run only this file. Existing groups get a 30-day grace rental.
-- Adds: rental payments (pay-per-day gate), public/private groups and tournaments, the public feed views.

alter table organizations add column if not exists visibility text not null default 'public' check (visibility in ('public','private'));
alter table organizations add column if not exists rental_until timestamptz;
alter table tournaments add column if not exists visibility text not null default 'public' check (visibility in ('public','private'));
update organizations set rental_until = now() + interval '30 days' where rental_until is null;

-- ---------- payments ----------
create table payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  org_id uuid references organizations on delete set null,
  purpose text not null check (purpose in ('new_group','extend')),
  days int not null check (days between 1 and 90),
  amount int not null check (amount >= 0),               -- centavos (PHP, what Paymongo uses)
  currency text not null default 'PHP',
  status text not null default 'pending' check (status in ('pending','paid','failed','cancelled')),
  provider text not null check (provider in ('simulated','paymongo')),
  provider_ref text,                                     -- Paymongo checkout/payment id later
  group_name text, group_slug text, group_visibility text,  -- for 'new_group': created only once paid
  created_at timestamptz not null default now(), paid_at timestamptz
);
create unique index payments_provider_ref on payments (provider_ref) where provider_ref is not null;
alter table payments enable row level security;
-- Clients can only READ their own payments. Rows are created and marked paid by server code (service role).
create policy "own or group admin" on payments for select using (user_id=auth.uid() or (org_id is not null and org_role(org_id)='admin'));

-- ---------- rental + visibility helpers ----------
create function rental_active(p_org uuid) returns boolean language sql stable security definer set search_path=public as $$
  select coalesce((select rental_until > now() from organizations where id=p_org), false) $$;
create function tournament_rental_active(p_t uuid) returns boolean language sql stable security definer set search_path=public as $$
  select coalesce((select rental_active(org_id) from tournaments where id=p_t), false) $$;
create function match_rental_active(p_m uuid) returns boolean language sql stable security definer set search_path=public as $$
  select coalesce((select tournament_rental_active(tournament_id) from matches where id=p_m), false) $$;
-- Public = visible to everyone. Private = members of the group only. A tournament is public only if its group is too.
create function can_view_tournament(p_t uuid) returns boolean language sql stable security definer set search_path=public as $$
  select exists (select 1 from tournaments t join organizations o on o.id=t.org_id
    where t.id=p_t and (org_role(o.id) is not null or (t.visibility='public' and o.visibility='public'))) $$;
create function can_view_match(p_m uuid) returns boolean language sql stable security definer set search_path=public as $$
  select exists (select 1 from matches m where m.id=p_m and can_view_tournament(m.tournament_id)) $$;

-- ---------- paying turns into a group / more days (server only) ----------
create or replace function fulfill_payment(p_payment uuid) returns text language plpgsql security definer set search_path=public as $$
declare p payments; oid uuid;
begin
  select * into p from payments where id=p_payment for update;
  if p.id is null then raise exception 'payment not found'; end if;
  if p.status='paid' then return coalesce(p.org_id::text,''); end if;      -- safe to call twice (webhooks retry)
  if p.status<>'pending' then raise exception 'payment is %', p.status; end if;
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
revoke all on function fulfill_payment(uuid) from public, anon, authenticated;
grant execute on function fulfill_payment(uuid) to service_role;
-- Groups can no longer be created for free from the browser.
drop function if exists create_org(text, text);

-- ---------- functions: refuse work when the rental has ended ----------
create or replace function finish_match(p_match uuid) returns void language plpgsql security definer set search_path=public as $$
declare m matches; w uuid; l uuid; ptw int; wb int;
begin
  if coalesce(match_role(p_match),'none') not in ('admin','scorer') then raise exception 'not allowed'; end if;
  if not match_rental_active(p_match) then raise exception 'rental_inactive'; end if;
  select * into m from matches where id=p_match;
  if m.status='final' then return; end if;
  select points_to_win, win_by into ptw, wb from tournaments where id=m.tournament_id;
  if greatest(m.score1,m.score2) < ptw or abs(m.score1-m.score2) < wb then raise exception 'Win score not reached'; end if;
  w := case when m.score1>m.score2 then m.team1_id else m.team2_id end;
  l := case when m.score1>m.score2 then m.team2_id else m.team1_id end;
  update matches set status='final', winner_id=w where id=p_match;
  if m.bracket_id is null then
    update matches set team1_id=w where tournament_id=m.tournament_id and bracket_id is null and slot1_ref='W'||m.game_no;
    update matches set team2_id=w where tournament_id=m.tournament_id and bracket_id is null and slot2_ref='W'||m.game_no;
    update matches set team1_id=l where tournament_id=m.tournament_id and bracket_id is null and slot1_ref='L'||m.game_no;
    update matches set team2_id=l where tournament_id=m.tournament_id and bracket_id is null and slot2_ref='L'||m.game_no;
  end if;
end $$;

create or replace function set_paused(p_match uuid, p_paused boolean) returns void language plpgsql security definer set search_path=public as $$
begin
  if coalesce(match_role(p_match),'none') not in ('admin','scorer') then raise exception 'not allowed'; end if;
  if not match_rental_active(p_match) then raise exception 'rental_inactive'; end if;
  if p_paused then update matches set status='paused' where id=p_match and status='live';
  else update matches set status='live' where id=p_match and status='paused'; end if;
end $$;

create or replace function fill_slot(p_match uuid, p_slot int, p_team uuid) returns void language plpgsql security definer set search_path=public as $$
begin
  if coalesce(match_role(p_match),'none') not in ('admin','scorer') then raise exception 'not allowed'; end if;
  if not match_rental_active(p_match) then raise exception 'rental_inactive'; end if;
  if p_slot=1 then update matches set team1_id=p_team where id=p_match and team1_id is null and status='scheduled';
  else update matches set team2_id=p_team where id=p_match and team2_id is null and status='scheduled'; end if;
end $$;

create or replace function add_member(p_org uuid, p_email text, p_role text) returns void language plpgsql security definer set search_path=public as $$
declare uid uuid;
begin
  if coalesce(org_role(p_org),'none') <> 'admin' then raise exception 'not allowed'; end if;
  if not rental_active(p_org) then raise exception 'rental_inactive'; end if;
  select id into uid from profiles where lower(email)=lower(trim(p_email));
  if uid is null then raise exception 'No account with that email yet. Ask them to create an account first.'; end if;
  insert into memberships(org_id, user_id, role) values (p_org, uid, p_role)
  on conflict (org_id, user_id) do update set role=excluded.role;
end $$;

-- ---------- policies ----------
drop policy if exists "read" on organizations;
create policy "read" on organizations for select using (visibility='public' or org_role(id) is not null);

drop policy if exists "admin changes roles" on memberships;
drop policy if exists "admin removes" on memberships;
create policy "admin changes roles" on memberships for update using (org_role(org_id)='admin' and rental_active(org_id)) with check (org_role(org_id)='admin' and rental_active(org_id));
create policy "admin removes" on memberships for delete using (org_role(org_id)='admin' and rental_active(org_id));

drop policy if exists "read" on tournaments; drop policy if exists "admin" on tournaments;
create policy "read" on tournaments for select using (can_view_tournament(id));
create policy "admin" on tournaments for all using (org_role(org_id)='admin' and rental_active(org_id)) with check (org_role(org_id)='admin' and rental_active(org_id));

drop policy if exists "read" on brackets; drop policy if exists "admin" on brackets;
create policy "read" on brackets for select using (can_view_tournament(tournament_id));
create policy "admin" on brackets for all using (tournament_role(tournament_id)='admin' and tournament_rental_active(tournament_id)) with check (tournament_role(tournament_id)='admin' and tournament_rental_active(tournament_id));

drop policy if exists "read" on teams; drop policy if exists "admin" on teams;
create policy "read" on teams for select using (can_view_tournament(tournament_id));
create policy "admin" on teams for all using (tournament_role(tournament_id)='admin' and tournament_rental_active(tournament_id)) with check (tournament_role(tournament_id)='admin' and tournament_rental_active(tournament_id));

drop policy if exists "read" on matches; drop policy if exists "admin" on matches;
create policy "read" on matches for select using (can_view_tournament(tournament_id));
create policy "admin" on matches for all using (tournament_role(tournament_id)='admin' and tournament_rental_active(tournament_id)) with check (tournament_role(tournament_id)='admin' and tournament_rental_active(tournament_id));

drop policy if exists "read" on score_events; drop policy if exists "score" on score_events; drop policy if exists "undo" on score_events;
create policy "read" on score_events for select using (can_view_match(match_id));
create policy "score" on score_events for insert with check (match_role(match_id) in ('admin','scorer') and match_rental_active(match_id) and created_by=auth.uid());
create policy "undo" on score_events for delete using (match_role(match_id) in ('admin','scorer') and match_rental_active(match_id));

-- Expenses stay readable by admins when the rental has ended (so the expense report can still be downloaded); changes need an active rental.
drop policy if exists "admin only" on expenses;
create policy "admin read" on expenses for select using (tournament_role(tournament_id)='admin');
create policy "admin insert" on expenses for insert with check (tournament_role(tournament_id)='admin' and tournament_rental_active(tournament_id));
create policy "admin update" on expenses for update using (tournament_role(tournament_id)='admin' and tournament_rental_active(tournament_id)) with check (tournament_role(tournament_id)='admin' and tournament_rental_active(tournament_id));
create policy "admin delete" on expenses for delete using (tournament_role(tournament_id)='admin' and tournament_rental_active(tournament_id));

-- ---------- public feed ----------
create view tournament_feed with (security_invoker = true) as
select t.id, t.name, t.date, t.status, t.created_at, o.id as org_id, o.name as org_name, o.slug as org_slug,
  (select count(*) from teams x where x.tournament_id=t.id)::int as teams,
  (select count(*) from matches m where m.tournament_id=t.id)::int as games,
  (select count(*) from matches m where m.tournament_id=t.id and m.status='final')::int as played,
  (select count(*) from matches m where m.tournament_id=t.id and m.status in ('live','paused'))::int as live,
  (select tm.name from matches m join teams tm on tm.id=m.winner_id where m.tournament_id=t.id and m.round='Final' and m.status='final' limit 1) as champion
from tournaments t join organizations o on o.id=t.org_id
where t.visibility='public' and o.visibility='public';
