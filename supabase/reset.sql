-- DEV ONLY. Wipes every Pickleball Live table and function so schema.sql (then migration-3.1.sql, 3.2 and 3.4) can run again.
-- Your sign-in accounts (auth.users) are kept. All groups, tournaments, teams, games, expenses and payments are deleted.
drop trigger if exists on_auth_user_created on auth.users;
drop view if exists my_tournament_stats, player_seats, tournament_feed, tournament_cards;
drop view if exists player_points;
drop table if exists payment_accounts, tournament_registrations, group_invites, payment_confirmations, payments, expenses, score_events, matches, teams, brackets, tournaments, memberships, organizations, profiles cascade;
drop function if exists handle_new_user(), app_role(), org_role(uuid), tournament_role(uuid), match_role(uuid),
  rental_active(uuid), tournament_rental_active(uuid), match_rental_active(uuid), can_view_tournament(uuid), can_view_match(uuid),
  apply_score(), finish_match(uuid), set_paused(uuid, boolean), fill_slot(uuid, int, uuid), fulfill_payment(uuid), ensure_invite(uuid), rotate_invite(uuid), join_group(uuid, text), register_for_tournament(uuid, boolean, text, text), withdraw_registration(uuid), match_payment_reference(text),
  create_org(text, text), add_member(uuid, text, text), keep_one_admin() cascade;
