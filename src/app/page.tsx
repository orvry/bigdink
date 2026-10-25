import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth'
import { btn, card, muted } from '@/lib/ui'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const sb = await createClient()
  const user = await getUser()
  const { data: orgs } = await sb.from('organizations').select('id,name,slug').order('name')
  const { data: mine } = user ? await sb.from('memberships').select('org_id,role').eq('user_id', user.id) : { data: [] as { org_id: string; role: string }[] }
  const roleOf = new Map((mine ?? []).map((m) => [m.org_id, m.role]))
  const yours = (orgs ?? []).filter((o) => roleOf.has(o.id))
  const row = (o: { id: string; name: string; slug: string }) => (
    <Link key={o.id} href={`/${o.slug}`} className={`${card} flex items-center justify-between transition-colors hover:border-[color:var(--green)]`}>
      <span className="font-semibold">{o.name}</span>
      <span className={`text-xs ${muted}`}>{roleOf.get(o.id) ?? 'view'}</span>
    </Link>
  )
  return (
    <>
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Pickleball Live</h1>
        <p className={`text-sm ${muted}`}>Live scores, standings and brackets. Each group runs its own tournaments.</p>
      </div>
      {yours.length > 0 && (<><h2 className="text-sm font-bold">Your groups</h2><div className="grid gap-2 md:grid-cols-2">{yours.map(row)}</div></>)}
      <h2 className="text-sm font-bold">All groups</h2>
      {(orgs ?? []).length === 0 && <p className={`text-sm ${muted}`}>No groups yet. Be the first to create one.</p>}
      <div className="grid gap-2 md:grid-cols-2">{(orgs ?? []).map(row)}</div>
      <Link href={user ? '/new-group' : '/login'} className={`${btn} md:self-start`}>{user ? 'Create a group' : 'Sign in to create a group'}</Link>
    </>
  )
}
