-- DEV ONLY. Wipes every Pickleball Live table and function so schema.sql (then migration-3.1.sql) can run again.
-- Your sign-in accounts (auth.users) are kept. All groups, tournaments, teams, games, expenses and payments are deleted.
drop trigger if exists on_auth_user_created on auth.users;
drop view if exists tournament_feed;
drop view if exists player_points;
drop table if exists payments, expenses, score_events, matches, teams, brackets, tournaments, memberships, organizations, profiles cascade;
drop function if exists handle_new_user(), app_role(), org_role(uuid), tournament_role(uuid), match_role(uuid),
  rental_active(uuid), tournament_rental_active(uuid), match_rental_active(uuid), can_view_tournament(uuid), can_view_match(uuid),
  apply_score(), finish_match(uuid), set_paused(uuid, boolean), fill_slot(uuid, int, uuid), fulfill_payment(uuid),
  create_org(text, text), add_member(uuid, text, text), keep_one_admin() cascade;
