import { cache } from 'react'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isRentalActive } from '@/lib/billing'
import type { Org, Profile, Role } from '@/lib/types'

export type { Role }

// cache() makes these run once per request even when the layout and the page both call them.
export const getUser = cache(async () => {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  return user ? { id: user.id, email: user.email ?? '' } : null
})

export const getProfile = cache(async (): Promise<Profile | null> => {
  const u = await getUser()
  if (!u) return null
  const sb = await createClient()
  const { data } = await sb.from('profiles').select('display_name,avatar_url,is_system_admin').eq('id', u.id).maybeSingle()
  return (data as Profile | null) ?? { display_name: null, avatar_url: null, is_system_admin: false }
})

export async function requireUser() {
  const u = await getUser()
  if (!u) redirect('/login')
  return u
}

export const getOrg = cache(async (slug: string): Promise<Org> => {
  const sb = await createClient()
  const { data } = await sb.from('organizations').select('id,name,slug,visibility,rental_until,join_policy').eq('slug', slug).maybeSingle()
  if (!data) notFound() // also what a private group looks like to people outside it
  return data as Org
})

/** Role inside one group. Signed-out people and non-members are viewers. */
export const roleIn = cache(async (orgId: string): Promise<Role> => {
  const u = await getUser()
  if (!u) return 'viewer'
  const sb = await createClient()
  const { data } = await sb.from('memberships').select('role').eq('org_id', orgId).eq('user_id', u.id).maybeSingle()
  return (data?.role ?? 'viewer') as Role
})

/**
 * Sign-in + role check. When the group's rental has ended only viewing and reports remain,
 * so pages send admins to Billing and everyone else back to the group page (unless allowInactive).
 */
export async function requireRole(slug: string, roles: Role[], opts: { allowInactive?: boolean } = {}) {
  const org = await getOrg(slug)
  const user = await requireUser()
  const role = await roleIn(org.id)
  if (!roles.includes(role)) redirect('/denied')
  if (!opts.allowInactive && !isRentalActive(org)) redirect(role === 'admin' ? `/${slug}/admin/billing` : `/${slug}`)
  return { org, user, role }
}
