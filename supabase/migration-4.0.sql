-- Pickleball Live 4.0 migration. Run after migration-3.5.sql.
-- Adds: casual games (sessions), public profiles, profile stats, safe team links to users, group settings, and fixes.

-- ---------- fixes ----------
-- Admins could not see the profile of a guest who registered for their tournament. Now they can.
drop policy if exists "self or group admin" on profiles;
create policy "self or group admin" on profiles for select using (
  id = auth.uid()
  or exists (select 1 from memberships m where m.user_id = profiles.id and org_role(m.org_id) = 'admin')
  or exists (select 1 from tournament_registrations r where r.user_id = profiles.id and tournament_role(r.tournament_id) = 'admin')
);
-- Deleting an account must not delete payment history or scoring history.
alter table payments alter column user_id drop not null;
alter table payments drop constraint if exists payments_user_id_fkey;
alter table payments add constraint payments_user_id_fkey foreign key (user_id) references profiles on delete set null;
alter table score_events drop constraint if exists score_events_created_by_fkey;
alter table score_events add constraint score_events_created_by_fkey foreign key (created_by) references auth.users on delete set null;

-- Group settings go through a function, so admins can change visibility and joining but never the rental dates.
create or replace function set_group_settings(p_org uuid, p_visibility text, p_join_policy text) returns void language plpgsql security definer set search_path=public as $$
begin
  if coalesce(org_role(p_org),'none') <> 'admin' then raise exception 'not allowed'; end if;
  if p_visibility not in ('public','private') or p_join_policy not in ('open','invite') then raise exception 'Invalid setting'; end if;
  update organizations set visibility = p_visibility, join_policy = p_join_policy where id = p_org;
end $$;

-- ---------- profiles ----------
alter table profiles add column if not exists handle text;
alter table profiles add column if not exists bio text;
alter table profiles add column if not exists city text;
alter table profiles add column if not exists stats_visibility text not null default 'everyone' check (stats_visibility in ('everyone','members','me'));
create unique index if not exists profiles_handle_key on profiles (lower(handle)) where handle is not null;

-- A public profile exists only once the person has chosen a handle. Returns public fields only.
create or replace function get_public_profile(p_handle text) returns table(id uuid, handle text, display_name text, avatar_url text, bio text, city text)
language sql stable security definer set search_path=public as $$
  select p.id, p.handle, p.display_name, p.avatar_url, p.bio, p.city from profiles p where lower(p.handle) = lower(p_handle) $$;

-- Career totals. People see their own in full. Others see only games in public tournaments, and only if the person allows it.
create or replace function profile_stats(p_user uuid) returns table(t_tournaments int, t_games int, t_wins int, t_points int, t_titles int, t_casual int)
language plpgsql stable security definer set search_path=public as $$
declare v text; me boolean := (auth.uid() = p_user);
begin
  select stats_visibility into v from profiles where id = p_user;
  if v is null then return; end if;
  if not me and (v = 'me' or (v = 'members' and not exists (
       select 1 from memberships a join memberships b on a.org_id = b.org_id where a.user_id = p_user and b.user_id = auth.uid()))) then return; end if;
  return query
  select count(distinct s.tournament_id)::int,
    coalesce(sum(g.games),0)::int, coalesce(sum(g.wins),0)::int, coalesce(sum(g.points),0)::int,
    coalesce(sum(case when g.champion then 1 else 0 end),0)::int,
    coalesce(sum(case when s.kind = 'session' then g.games else 0 end),0)::int
  from (select ps.team_id, ps.tournament_id, ps.name, t.kind from player_seats ps join tournaments t on t.id = ps.tournament_id join organizations o on o.id = t.org_id
        where ps.user_id = p_user and (me or (t.visibility = 'public' and o.visibility = 'public'))) s
  cross join lateral (select
      (select count(*) from matches m where m.status='final' and (m.team1_id = s.team_id or m.team2_id = s.team_id))::int as games,
      (select count(*) from matches m where m.status='final' and m.winner_id = s.team_id)::int as wins,
      (select count(*) from score_events e where e.team_id = s.team_id and e.player = s.name)::int as points,
      exists (select 1 from matches m where m.round = 'Final' and m.status = 'final' and m.winner_id = s.team_id) as champion) g;
end $$;

create or replace function profile_history(p_user uuid) returns table(tournament_id uuid, name text, kind text, org_name text, org_slug text, on_date date, team_name text, games int, wins int, points int, champion boolean)
language plpgsql stable security definer set search_path=public as $$
declare v text; me boolean := (auth.uid() = p_user);
begin
  select stats_visibility into v from profiles where id = p_user;
  if v is null then return; end if;
  if not me and (v = 'me' or (v = 'members' and not exists (
       select 1 from memberships a join memberships b on a.org_id = b.org_id where a.user_id = p_user and b.user_id = auth.uid()))) then return; end if;
  return query
  select t.id, t.name, t.kind, o.name, o.slug, t.date, tm.name,
    (select count(*) from matches m where m.status='final' and (m.team1_id = ps.team_id or m.team2_id = ps.team_id))::int,
    (select count(*) from matches m where m.status='final' and m.winner_id = ps.team_id)::int,
    (select count(*) from score_events e where e.team_id = ps.team_id and e.player = ps.name)::int,
    exists (select 1 from matches m where m.round = 'Final' and m.status = 'final' and m.winner_id = ps.team_id)
  from player_seats ps join tournaments t on t.id = ps.tournament_id join organizations o on o.id = t.org_id join teams tm on tm.id = ps.team_id
  where ps.user_id = p_user and (me or (t.visibility = 'public' and o.visibility = 'public'))
  order by t.date desc nulls last, t.created_at desc limit 40;
end $$;

-- ---------- a team seat can only be linked to someone who belongs in that tournament ----------
create or replace function check_seat_users() returns trigger language plpgsql security definer set search_path=public as $$
declare oid uuid; u uuid;
begin
  select org_id into oid from tournaments where id = new.tournament_id;
  foreach u in array array[new.player1_user, new.player2_user] loop
    if u is not null
       and not exists (select 1 from memberships where org_id = oid and user_id = u)
       and not exists (select 1 from tournament_registrations where tournament_id = new.tournament_id and user_id = u) then
      raise exception 'A linked player must be a member of the group or registered for the tournament.';
    end if;
  end loop;
  return new;
end $$;
drop trigger if exists teams_check_seat_users on teams;
create trigger teams_check_seat_users before insert or update of player1_user, player2_user on teams for each row execute function check_seat_users();

-- ---------- casual games: a "session" is a tournament row of kind 'session' ----------
alter table tournaments add column if not exists kind text not null default 'tournament' check (kind in ('tournament','session'));
alter table tournaments add column if not exists session_format text check (session_format in ('single','session'));
alter table tournaments add column if not exists created_by uuid references profiles on delete set null;

-- The person who started a casual session can score it, even when they are only a member of the group.
create or replace function tournament_role(p_t uuid) returns text language sql stable security definer set search_path=public as $$
  select case when t.kind = 'session' and t.created_by = auth.uid() and m.role = 'member' then 'scorer' else m.role end
  from tournaments t join memberships m on m.org_id = t.org_id and m.user_id = auth.uid() where t.id = p_t $$;

drop view if exists tournament_feed;
drop view if exists tournament_cards;
create view tournament_cards with (security_invoker = true) as
select t.id, t.name, t.date, t.status, t.created_at, t.description, t.banner_url, t.registration_open, t.visibility, t.kind, t.session_format, t.created_by,
  o.id as org_id, o.name as org_name, o.slug as org_slug, o.visibility as org_visibility,
  (select count(*) from teams x where x.tournament_id = t.id)::int as teams,
  (select count(*) from matches m where m.tournament_id = t.id)::int as games,
  (select count(*) from matches m where m.tournament_id = t.id and m.status = 'final')::int as played,
  (select count(*) from matches m where m.tournament_id = t.id and m.status in ('live','paused'))::int as live,
  (select tm.name from matches m join teams tm on tm.id = m.winner_id where m.tournament_id = t.id and m.round = 'Final' and m.status = 'final' limit 1) as champion
from tournaments t join organizations o on o.id = t.org_id;
create view tournament_feed with (security_invoker = true) as
  select * from tournament_cards where visibility = 'public' and org_visibility = 'public';

-- Start a session. Any member of an active group can. Casual sessions are private unless the creator makes them public.
create or replace function create_session(p_org uuid, p_name text, p_format text, p_ptw int, p_wb int, p_visibility text) returns uuid
language plpgsql security definer set search_path=public as $$
declare tid uuid;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if org_role(p_org) is null then raise exception 'Join the group to start a game.'; end if;
  if not rental_active(p_org) then raise exception 'rental_inactive'; end if;
  if p_format not in ('single','session') or p_visibility not in ('public','private') then raise exception 'Invalid setting'; end if;
  if p_ptw < 1 or p_ptw > 99 or p_wb < 1 or p_wb > 10 then raise exception 'Invalid scoring rules'; end if;
  insert into tournaments(org_id, name, date, courts, points_to_win, win_by, status, visibility, registration_open, kind, session_format, created_by)
  values (p_org, coalesce(nullif(trim(p_name),''), 'Casual game'), current_date, 1, p_ptw, p_wb, 'active', p_visibility, false, 'session', p_format, auth.uid())
  returning id into tid;
  return tid;
end $$;

-- Add a game: two sides of one or two players. users are optional links to registered people (members of the group).
create or replace function add_session_game(p_session uuid, p_names1 text[], p_users1 uuid[], p_names2 text[], p_users2 uuid[], p_court text default null) returns uuid
language plpgsql security definer set search_path=public as $$
declare t tournaments; r text; n int; t1 uuid; t2 uuid; mid uuid;
begin
  select * into t from tournaments where id = p_session and kind = 'session';
  if t.id is null then raise exception 'Session not found'; end if;
  r := tournament_role(p_session);
  if r is null or (r <> 'admin' and t.created_by is distinct from auth.uid()) then raise exception 'not allowed'; end if;
  if not rental_active(t.org_id) then raise exception 'rental_inactive'; end if;
  if t.status = 'finished' then raise exception 'This session is finished.'; end if;
  select count(*) into n from matches where tournament_id = p_session;
  if t.session_format = 'single' and n >= 1 then raise exception 'A single game has only one game.'; end if;
  if coalesce(array_length(p_names1,1),0) not between 1 and 2 or coalesce(array_length(p_names2,1),0) not between 1 and 2 then
    raise exception 'Each side needs one or two players.';
  end if;
  insert into teams(tournament_id, name, seed, player1, player2, player1_user, player2_user)
    values (p_session, array_to_string(p_names1, ' & '), 0, p_names1[1], p_names1[2], p_users1[1], p_users1[2]) returning id into t1;
  insert into teams(tournament_id, name, seed, player1, player2, player1_user, player2_user)
    values (p_session, array_to_string(p_names2, ' & '), 0, p_names2[1], p_names2[2], p_users2[1], p_users2[2]) returning id into t2;
  insert into matches(tournament_id, bracket_id, game_no, round, court, team1_id, team2_id)
    values (p_session, null, n + 1, 'Casual', nullif(trim(p_court),''), t1, t2) returning id into mid;
  return mid;
end $$;

create or replace function finish_session(p_session uuid) returns void language plpgsql security definer set search_path=public as $$
declare t tournaments;
begin
  select * into t from tournaments where id = p_session and kind = 'session';
  if t.id is null then raise exception 'Session not found'; end if;
  if tournament_role(p_session) is null or (tournament_role(p_session) <> 'admin' and t.created_by is distinct from auth.uid()) then raise exception 'not allowed'; end if;
  update tournaments set status = 'finished' where id = p_session;
end $$;

create or replace function set_session_visibility(p_session uuid, p_visibility text) returns void language plpgsql security definer set search_path=public as $$
declare t tournaments;
begin
  select * into t from tournaments where id = p_session and kind = 'session';
  if t.id is null or p_visibility not in ('public','private') then raise exception 'Invalid request'; end if;
  if tournament_role(p_session) is null or (tournament_role(p_session) <> 'admin' and t.created_by is distinct from auth.uid()) then raise exception 'not allowed'; end if;
  update tournaments set visibility = p_visibility where id = p_session;
end $$;

-- Personal stats view: add the kind of tournament so casual games can be counted separately.
create or replace view my_tournament_stats with (security_invoker = true) as
select s.user_id, s.tournament_id, tr.org_id, s.team_id,
  (select count(*) from matches m where m.status='final' and (m.team1_id=s.team_id or m.team2_id=s.team_id))::int as games,
  (select count(*) from matches m where m.status='final' and m.winner_id=s.team_id)::int as wins,
  (select count(*) from score_events e where e.team_id=s.team_id and e.player=s.name)::int as points,
  exists (select 1 from matches m where m.round='Final' and m.status='final' and m.winner_id=s.team_id) as champion,
  tr.kind
from player_seats s join tournaments tr on tr.id=s.tournament_id
where s.user_id = auth.uid();

-- Members can see the names of the group's other members (needed to pick players for a casual game).
create or replace function group_members(p_org uuid) returns table(user_id uuid, name text)
language sql stable security definer set search_path=public as $$
  select m.user_id, coalesce(p.display_name, split_part(p.email, '@', 1))
  from memberships m join profiles p on p.id = m.user_id
  where m.org_id = p_org and org_role(p_org) is not null
  order by 2 $$;
