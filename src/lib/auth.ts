import { cache } from 'react'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Org, Role } from '@/lib/types'

export type { Role }

// cache() makes these run once per request even when the layout and the page both call them.
export const getUser = cache(async () => {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  return user ? { id: user.id, email: user.email ?? '' } : null
})

export async function requireUser() {
  const u = await getUser()
  if (!u) redirect('/login')
  return u
}

export const getOrg = cache(async (slug: string): Promise<Org> => {
  const sb = await createClient()
  const { data } = await sb.from('organizations').select('id,name,slug').eq('slug', slug).maybeSingle()
  if (!data) notFound()
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

export async function requireRole(slug: string, roles: Role[]) {
  const org = await getOrg(slug)
  const user = await requireUser()
  const role = await roleIn(org.id)
  if (!roles.includes(role)) redirect('/denied')
  return { org, user, role }
}
