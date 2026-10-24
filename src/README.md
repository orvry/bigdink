# Pickleball Live starter

1. `npm i @supabase/ssr @supabase/supabase-js`
2. Supabase SQL editor:
   - NEW project: run `supabase/schema.sql`.
   - Already ran the first schema.sql: run `supabase/migration-002.sql` once instead.
3. Create `.env.local` with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
4. Copy these folders/files into your project (merge `app/layout.tsx` with yours).
5. Create an account on /login, then:
   `update profiles set role='admin' where email='you@example.com';`
6. `npm run dev`
