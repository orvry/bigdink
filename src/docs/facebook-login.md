# Facebook sign-in: setup

The app has a "Continue with Facebook" button. After signing in, the person's Facebook name is saved and their profile
photo is copied to our own image storage (the CDN), because Facebook photo addresses expire. Setup takes about 20 minutes.
Meta changes its console and rules from time to time, so follow its current screens if they differ from these steps.

## 1. Meta (Facebook) side
1. Go to developers.facebook.com, sign in, and create an app. Choose the option for letting people sign in with Facebook.
2. Add the **Facebook Login** product to the app.
3. In Facebook Login settings, add this to **Valid OAuth Redirect URIs**:
   `https://YOUR-PROJECT.supabase.co/auth/v1/callback`
   (Supabase shows the exact address on the Facebook provider screen. Copy it from there.)
4. Under App settings, Basic: copy the **App ID** and **App Secret**.
5. Fill in the privacy policy address and a data deletion instruction. Meta requires both before the app can go live.
6. The app asks only for `public_profile` and `email`, which normally need no review. Switch the app from Development to **Live** when ready. In Development mode only people you add as testers can sign in.

## 2. Supabase side
1. Authentication, then Providers, then Facebook: turn it on and paste the App ID and App Secret.
2. Authentication, then URL Configuration:
   - Site URL: your live address, for example `https://your-site.vercel.app`
   - Redirect URLs: add `https://your-site.vercel.app/auth/callback` and, for local work, `http://localhost:3000/auth/callback`

## 3. The app
1. Add `NEXT_PUBLIC_SITE_URL=https://your-site.vercel.app` to the environment (use `http://localhost:3000` locally).
2. `SUPABASE_SERVICE_ROLE_KEY` must be set. It is used to copy the photo into storage.
3. Run `supabase/migration-3.4.sql`, which creates the `images` storage bucket and the profile columns.

## Good to know
- Some Facebook accounts have no email (phone-number accounts). Sign-in can fail for them. They can use another method.
- If someone already has an email account with the same address, Supabase links the Facebook login to it.
- The photo is only copied the first time, and only when the profile has no photo yet.
- Only photos from Facebook's own addresses are accepted.
