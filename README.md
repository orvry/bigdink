# Pickleball Live starter (v3.1)

1. `npm i @supabase/ssr @supabase/supabase-js pdf-lib`
2. Supabase SQL editor:
   - NEW project: run `supabase/schema.sql`, then `supabase/migration-3.1.sql`.
   - Existing 3.0 project: run only `supabase/migration-3.1.sql` (existing groups get a 30-day grace rental).
   - Older than 3.0, dev data only (this deletes it): run `supabase/reset.sql`, then both files above.
3. Copy `.env.example` to `.env.local` and fill it in. `SUPABASE_SERVICE_ROLE_KEY` (Project Settings, API) is a secret: server only, never in the browser, never committed.
4. Copy these folders/files into your project. Tournament pages moved: delete the old `app/[org]/standings`, `app/[org]/bracket`, `app/[org]/live` folders and `app/[org]/report/route.ts` if you still have them (they now live under `app/[org]/t/[tid]/`).
5. `npm run dev`, open /login, create an account, then rent your group at /new-group. Payment is simulated while `PAYMENTS_MODE=simulated`.
6. Add members on `/<group>/admin/users` (they must have created an account first).

Deploying: add the same environment variables in Vercel. Keep `PAYMENTS_MODE=simulated` until the Paymongo integration exists, or nobody can pay.

See CHANGELOG.md for what is new.
