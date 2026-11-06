import { createClient } from '@supabase/supabase-js'

/**
 * Service-role client: bypasses row-level security. Server code only, and only for things a user must never do
 * themselves, such as marking a payment paid. Never import this from a component marked 'use client'.
 */
export function adminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false } })
}
