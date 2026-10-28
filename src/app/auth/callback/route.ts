import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { safeNext } from '@/lib/nav'
import { syncProfileFromProvider } from '@/lib/profile-sync'

/** Where Facebook sends people back to. Finishes the sign-in, saves their name and photo, then continues to the page they wanted. */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? url.origin
  const code = url.searchParams.get('code')
  if (code) {
    const sb = await createClient()
    const { error } = await sb.auth.exchangeCodeForSession(code)
    if (!error) {
      const { data: { user } } = await sb.auth.getUser()
      if (user) await syncProfileFromProvider(user)
      return NextResponse.redirect(new URL(safeNext(url.searchParams.get('next')), origin))
    }
  }
  return NextResponse.redirect(new URL('/login?error=signin', origin))
}
