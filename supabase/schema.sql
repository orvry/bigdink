-- Pickleball Live v3: FRESH INSTALL (run supabase/reset.sql first if you already ran an older version).
-- Run in the Supabase SQL editor. Afterwards: sign up in the app, then create your group on /new-group.

create table profiles (id uuid primary key references auth.users on delete cascade, email text);
create function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into profiles(id,email) values (new.id,new.email); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- A "group" (organization) owns tournaments. Anyone can watch; only members can score or manage.
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,38}$'),
  created_at timestamptz default now()
);
-- No row = viewer. 'scorer' can score games. 'admin' manages the group.
create table memberships (
  org_id uuid not null references organizations on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  role text not null check (role in ('admin','scorer')),
  primary key (org_id, user_id)
);

create table tournaments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations on delete cascade,
  name text not null, date date, courts int default 4,
  points_to_win int not null default 11, win_by int not null default 2,
  currency text not null default 'JPY',
  status text not null default 'draft', created_at timestamptz default now()
);
create table brackets (id uuid primary key default gen_random_uuid(), tournament_id uuid not null references tournaments on delete cascade, name text not null);
create table teams (id uuid primary key default gen_random_uuid(), tournament_id uuid not null references tournaments on delete cascade, bracket_id uuid references brackets on delete set null, name text not null, seed int not null default 0, player1 text, player2 text);
-- bracket_id is null for playoff games. game_no is unique within a bracket and among playoff games.
-- slotN_ref: 'W9' winner of playoff game 9, 'L9' loser of playoff game 9, 'A1' first place in bracket A.
create table matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments on delete cascade,
  bracket_id uuid references brackets on delete cascade,
  game_no int not null, round text not null, court text, starts_at text,
  team1_id uuid references teams on delete set null, team2_id uuid references teams on delete set null,
  slot1_ref text, slot2_ref text,
  status text not null default 'scheduled' check (status in ('scheduled','live','paused','final')),
  score1 int not null default 0, score2 int not null default 0, winner_id uuid references teams,
  unique (bracket_id, game_no)
);
create unique index matches_playoff_game_no on matches (tournament_id, game_no) where bracket_id is null;
create table score_events (id bigint generated always as identity primary key, match_id uuid not null references matches on delete cascade, team_id uuid not null references teams, player text, created_by uuid references auth.users, created_at timestamptz default now());
create table expenses (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments on delete cascade,
  spent_on date not null default current_date,
  category text not null, description text not null,
  amount numeric(12,2) not null check (amount >= 0),
  created_at timestamptz default now()
);

-- Role lookups. security definer so they can read memberships without recursing into its policies.
create function org_role(p_org uuid) returns text language sql stable security definer set search_path=public as $$
  select role from memberships where org_id=p_org and user_id=auth.uid() $$;
create function tournament_role(p_t uuid) returns text language sql stable security definer set search_path=public as $$
  select m.role from tournaments t join memberships m on m.org_id=t.org_id and m.user_id=auth.uid() where t.id=p_t $$;
create function match_role(p_m uuid) returns text language sql stable security definer set search_path=public as $$
  select tournament_role(tournament_id) from matches where id=p_m $$;

create function apply_score() returns trigger language plpgsql security definer set search_path=public as $$
declare m matches;
begin
  if tg_op='INSERT' then
    select * into m from matches where id=new.match_id;
    if m.status='final' then raise exception 'match is final'; end if;
    if m.status='paused' then raise exception 'game is paused'; end if;
    if new.team_id=m.team1_id then update matches set score1=score1+1,status='live' where id=m.id;
    elsif new.team_id=m.team2_id then update matches set score2=score2+1,status='live' where id=m.id;
    else raise exception 'team not in match'; end if;
    return new;
  else
    select * into m from matches where id=old.match_id;
    if m.status='final' then raise exception 'match is final'; end if;
    if old.team_id=m.team1_id then update matches set score1=score1-1 where id=m.id; else update matches set score2=score2-1 where id=m.id; end if;
    return old;
  end if;
end $$;
create trigger score_events_apply after insert or delete on score_events for each row execute function apply_score();

create function finish_match(p_match uuid) returns void language plpgsql security definer set search_path=public as $$
declare m matches; w uuid; l uuid; ptw int; wb int;
begin
  if coalesce(match_role(p_match),'none') not in ('admin','scorer') then raise exception 'not allowed'; end if;
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

create function set_paused(p_match uuid, p_paused boolean) returns void language plpgsql security definer set search_path=public as $$
begin
  if coalesce(match_role(p_match),'none') not in ('admin','scorer') then raise exception 'not allowed'; end if;
  if p_paused then update matches set status='paused' where id=p_match and status='live';
  else update matches set status='live' where id=p_match and status='paused'; end if;
end $$;

create function fill_slot(p_match uuid, p_slot int, p_team uuid) returns void language plpgsql security definer set search_path=public as $$
begin
  if coalesce(match_role(p_match),'none') not in ('admin','scorer') then raise exception 'not allowed'; end if;
  if p_slot=1 then update matches set team1_id=p_team where id=p_match and team1_id is null and status='scheduled';
  else update matches set team2_id=p_team where id=p_match and team2_id is null and status='scheduled'; end if;
end $$;

-- Any signed-in user can start a group and becomes its first admin.
create function create_org(p_name text, p_slug text) returns uuid language plpgsql security definer set search_path=public as $$
declare oid uuid;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if p_slug in ('login','denied','new-group','api','admin','report','_next') then raise exception 'That address is reserved'; end if;
  insert into organizations(name, slug) values (p_name, p_slug) returning id into oid;
  insert into memberships(org_id, user_id, role) values (oid, auth.uid(), 'admin');
  return oid;
end $$;

-- Admins add people by the email they signed up with.
create function add_member(p_org uuid, p_email text, p_role text) returns void language plpgsql security definer set search_path=public as $$
declare uid uuid;
begin
  if coalesce(org_role(p_org),'none') <> 'admin' then raise exception 'not allowed'; end if;
  select id into uid from profiles where lower(email)=lower(trim(p_email));
  if uid is null then raise exception 'No account with that email yet. Ask them to create an account first.'; end if;
  insert into memberships(org_id, user_id, role) values (p_org, uid, p_role)
  on conflict (org_id, user_id) do update set role=excluded.role;
end $$;

-- A group can never be left without an admin.
create function keep_one_admin() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if old.role='admin' and (tg_op='DELETE' or new.role<>'admin') then
    if not exists (select 1 from memberships where org_id=old.org_id and role='admin' and user_id<>old.user_id) then
      raise exception 'A group needs at least one admin';
    end if;
  end if;
  return coalesce(new, old);
end $$;
create trigger memberships_keep_admin before update or delete on memberships for each row execute function keep_one_admin();

-- Points won per player (for MVPs). security_invoker keeps row-level security in force.
create view player_points with (security_invoker = true) as
  select m.tournament_id, e.team_id, e.player, count(*)::int as points
  from score_events e join matches m on m.id=e.match_id
  where e.player is not null
  group by m.tournament_id, e.team_id, e.player;

alter table profiles enable row level security; alter table organizations enable row level security; alter table memberships enable row level security;
alter table tournaments enable row level security; alter table brackets enable row level security; alter table teams enable row level security;
alter table matches enable row level security; alter table score_events enable row level security; alter table expenses enable row level security;

create policy "self or group admin" on profiles for select using (
  id=auth.uid() or exists (select 1 from memberships m where m.user_id=profiles.id and org_role(m.org_id)='admin'));
create policy "read" on organizations for select using (true);
create policy "see members" on memberships for select using (user_id=auth.uid() or org_role(org_id)='admin');
create policy "admin changes roles" on memberships for update using (org_role(org_id)='admin') with check (org_role(org_id)='admin');
create policy "admin removes" on memberships for delete using (org_role(org_id)='admin');

create policy "read" on tournaments for select using (true);
create policy "admin" on tournaments for all using (org_role(org_id)='admin') with check (org_role(org_id)='admin');
create policy "read" on brackets for select using (true);
create policy "admin" on brackets for all using (tournament_role(tournament_id)='admin') with check (tournament_role(tournament_id)='admin');
create policy "read" on teams for select using (true);
create policy "admin" on teams for all using (tournament_role(tournament_id)='admin') with check (tournament_role(tournament_id)='admin');
create policy "read" on matches for select using (true);
create policy "admin" on matches for all using (tournament_role(tournament_id)='admin') with check (tournament_role(tournament_id)='admin');
create policy "read" on score_events for select using (true);
create policy "score" on score_events for insert with check (match_role(match_id) in ('admin','scorer') and created_by=auth.uid());
create policy "undo" on score_events for delete using (match_role(match_id) in ('admin','scorer'));
-- Money is private to the group's admins.
create policy "admin only" on expenses for all using (tournament_role(tournament_id)='admin') with check (tournament_role(tournament_id)='admin');

-- Accounts that existed before this schema ran still need a profile row.
insert into profiles(id, email) select id, email from auth.users on conflict do nothing;
alter publication supabase_realtime add table matches;
