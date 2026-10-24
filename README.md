# Pickleball Live starter

1. `npm i @supabase/ssr @supabase/supabase-js`
2. Create a Supabase project, run `supabase/schema.sql` in the SQL editor.
3. Copy `.env.example` to `.env.local` and fill both values.
4. Copy these folders/files into your project (merge `app/layout.tsx` with yours; keep your `globals.css`).
5. In Supabase Auth, create your user, then run:
   `update profiles set role='admin' where email='you@example.com';`
6. `npm run dev`
