-- Pickleball Live 3.4 migration. Run after migration-3.2.sql.
-- Adds: tournament description + banner, registration (join as guest / participate), the "member" role, group invites,
-- user links on team seats (for personal stats), Facebook-ready profiles, payment accounts, and the image bucket.

-- ---------- profiles: name, photo, system admin flag ----------
alter table profiles add column if not exists display_name text;
alter table profiles add column if not exists avatar_url text;
alter table profiles add column if not exists is_system_admin boolean not null default false;  -- set by hand: update profiles set is_system_admin=true where email='you@example.com';
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into profiles(id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'));
  return new;
end $$;
update profiles p set display_name = coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name')
  from auth.users u where u.id = p.id and p.display_name is null;

-- ---------- tournaments ----------
alter table tournaments add column if not exists description text;
alter table tournaments add column if not exists banner_url text;
alter table tournaments add column if not exists registration_open boolean not null default true;

-- ---------- teams: a seat can be linked to a registered user ----------
alter table teams add column if not exists player1_user uuid references profiles on delete set null;
alter table teams add column if not exists player2_user uuid references profiles on delete set null;

-- ---------- groups: member role, join policy, invites ----------
alter table memberships drop constraint if exists memberships_role_check;
alter table memberships add constraint memberships_role_check check (role in ('admin','scorer','member'));
alter table organizations add column if not exists join_policy text not null default 'open' check (join_policy in ('open','invite'));

create table if not exists group_invites (
  org_id uuid primary key references organizations on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now()
);
alter table group_invites enable row level security;
drop policy if exists "members read invite" on group_invites;
create policy "members read invite" on group_invites for select using (org_role(org_id) is not null);

-- Any member can get the group's invite code (it is created the first time).
create or replace function ensure_invite(p_org uuid) returns text language plpgsql security definer set search_path=public as $$
declare c text;
begin
  if org_role(p_org) is null then raise exception 'not allowed'; end if;
  insert into group_invites(org_id, code) values (p_org, substr(replace(gen_random_uuid()::text,'-',''),1,12)) on conflict (org_id) do nothing;
  select code into c from group_invites where org_id=p_org;
  return c;
end $$;
create or replace function rotate_invite(p_org uuid) returns text language plpgsql security definer set search_path=public as $$
declare c text := substr(replace(gen_random_uuid()::text,'-',''),1,12);
begin
  if coalesce(org_role(p_org),'none') <> 'admin' then raise exception 'not allowed'; end if;
  insert into group_invites(org_id, code) values (p_org, c) on conflict (org_id) do update set code=excluded.code, created_at=now();
  return c;
end $$;
-- Joining: open public groups let any signed-in user in; otherwise a valid invite code is needed.
create or replace function join_group(p_org uuid, p_code text default null) returns void language plpgsql security definer set search_path=public as $$
declare o organizations;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  select * into o from organizations where id=p_org;
  if o.id is null then raise exception 'Group not found'; end if;
  if exists (select 1 from memberships where org_id=p_org and user_id=auth.uid()) then return; end if;
  if not rental_active(p_org) then raise exception 'rental_inactive'; end if;
  if not ((p_code is not null and exists (select 1 from group_invites where org_id=p_org and code=p_code))
          or (o.visibility='public' and o.join_policy='open')) then
    raise exception 'This group is invite only. Ask a member for an invite link.';
  end if;
  insert into memberships(org_id, user_id, role) values (p_org, auth.uid(), 'member');
end $$;

-- ---------- tournament registrations ----------
create table if not exists tournament_registrations (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  as_guest boolean not null default false,
  partner_name text, note text,
  status text not null default 'pending' check (status in ('pending','approved','declined','withdrawn')),
  team_id uuid references teams on delete set null,
  created_at timestamptz not null default now(),
  unique (tournament_id, user_id)
);
alter table tournament_registrations enable row level security;
drop policy if exists "own or admin" on tournament_registrations;
drop policy if exists "admin manages" on tournament_registrations;
create policy "own or admin" on tournament_registrations for select using (user_id=auth.uid() or tournament_role(tournament_id)='admin');
create policy "admin manages" on tournament_registrations for update using (tournament_role(tournament_id)='admin' and tournament_rental_active(tournament_id))
  with check (tournament_role(tournament_id)='admin' and tournament_rental_active(tournament_id));

create or replace function register_for_tournament(p_tournament uuid, p_as_guest boolean, p_partner text, p_note text) returns void language plpgsql security definer set search_path=public as $$
declare t tournaments; r tournament_registrations; is_member boolean;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  select * into t from tournaments where id=p_tournament;
  if t.id is null or not can_view_tournament(p_tournament) then raise exception 'Tournament not found'; end if;
  if not t.registration_open then raise exception 'Registration is closed for this tournament.'; end if;
  if not rental_active(t.org_id) then raise exception 'rental_inactive'; end if;
  is_member := org_role(t.org_id) is not null;
  if not is_member and not p_as_guest then raise exception 'Join the group first, or register as a guest.'; end if;
  select * into r from tournament_registrations where tournament_id=p_tournament and user_id=auth.uid();
  if r.id is not null and r.status in ('pending','approved') then raise exception 'You are already registered.'; end if;
  if r.id is null then
    insert into tournament_registrations(tournament_id, user_id, as_guest, partner_name, note)
      values (p_tournament, auth.uid(), not is_member, nullif(trim(p_partner),''), nullif(trim(p_note),''));
  else
    update tournament_registrations set status='pending', as_guest=not is_member, partner_name=nullif(trim(p_partner),''), note=nullif(trim(p_note),''), team_id=null where id=r.id;
  end if;
end $$;
create or replace function withdraw_registration(p_tournament uuid) returns void language plpgsql security definer set search_path=public as $$
begin
  update tournament_registrations set status='withdrawn' where tournament_id=p_tournament and user_id=auth.uid() and status in ('pending','approved');
end $$;

-- ---------- views: cards for feeds, and personal stats ----------
drop view if exists tournament_feed;
create view tournament_cards with (security_invoker = true) as
select t.id, t.name, t.date, t.status, t.created_at, t.description, t.banner_url, t.registration_open, t.visibility,
  o.id as org_id, o.name as org_name, o.slug as org_slug, o.visibility as org_visibility,
  (select count(*) from teams x where x.tournament_id=t.id)::int as teams,
  (select count(*) from matches m where m.tournament_id=t.id)::int as games,
  (select count(*) from matches m where m.tournament_id=t.id and m.status='final')::int as played,
  (select count(*) from matches m where m.tournament_id=t.id and m.status in ('live','paused'))::int as live,
  (select tm.name from matches m join teams tm on tm.id=m.winner_id where m.tournament_id=t.id and m.round='Final' and m.status='final' limit 1) as champion
from tournaments t join organizations o on o.id=t.org_id;
create view tournament_feed with (security_invoker = true) as
  select * from tournament_cards where visibility='public' and org_visibility='public';

create view player_seats with (security_invoker = true) as
  select t.id as team_id, t.tournament_id, 1 as seat, t.player1 as name, t.player1_user as user_id from teams t where t.player1_user is not null
  union all
  select t.id, t.tournament_id, 2, t.player2, t.player2_user from teams t where t.player2_user is not null;

-- Only the signed-in user's own rows. Games, wins and points while linked to a team seat.
create view my_tournament_stats with (security_invoker = true) as
select s.user_id, s.tournament_id, tr.org_id, s.team_id,
  (select count(*) from matches m where m.status='final' and (m.team1_id=s.team_id or m.team2_id=s.team_id))::int as games,
  (select count(*) from matches m where m.status='final' and m.winner_id=s.team_id)::int as wins,
  (select count(*) from score_events e where e.team_id=s.team_id and e.player=s.name)::int as points,
  exists (select 1 from matches m where m.round='Final' and m.status='final' and m.winner_id=s.team_id) as champion
from player_seats s join tournaments tr on tr.id=s.tournament_id
where s.user_id = auth.uid();

-- ---------- payment accounts (shown on the payment page; the QR image lives in the CDN bucket) ----------
create table if not exists payment_accounts (
  id uuid primary key default gen_random_uuid(),
  method text not null check (method in ('gcash','maya','bank')),
  label text not null,
  account_name text not null,
  account_number text not null,
  bank_name text,
  qr_url text,                         -- public CDN address of the QR image
  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
alter table payment_accounts enable row level security;
drop policy if exists "signed in can read active" on payment_accounts;
create policy "signed in can read active" on payment_accounts for select to authenticated using (active);   -- writes: server only, system admins

-- ---------- image bucket (public, so files are served through the CDN) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('images', 'images', true, 4194304, array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;
