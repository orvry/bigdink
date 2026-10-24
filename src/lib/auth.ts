import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type Role = 'admin' | 'scorer' | 'viewer'

export async function getUser() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null
  const { data: p } = await sb.from('profiles').select('role').eq('id', user.id).single()
  return { id: user.id, email: user.email ?? '', role: (p?.role ?? 'viewer') as Role }
}

export async function requireRole(roles: Role[]) {
  const u = await getUser()
  if (!u) redirect('/login')
  if (!roles.includes(u.role)) redirect('/denied')
  return u
}
