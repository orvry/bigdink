import Link from 'next/link'
import { getContext } from '@/lib/data'
import { roleIn } from '@/lib/auth'
import { card, btn, muted } from '@/lib/ui'

export const dynamic = 'force-dynamic'

export default async function GroupHome({ params }: { params: Promise<{ org: string }> }) {
  const { org: slug } = await params
  const { org, tournaments, active } = await getContext(slug)
  const role = await roleIn(org.id)
  return (
    <>
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{org.name}</h1>
        <p className={`text-sm ${muted}`}>{org.visibility === 'public' ? 'Public group' : 'Private group'}{role !== 'viewer' ? ` · you are ${role === 'admin' ? 'an admin' : 'a scorer'}` : ''}</p>
      </div>
      {active && <Link href={`/${slug}/t/${active.id}`} className={`${btn} md:self-start`}>Open {active.name}</Link>}
      <h2 className="text-sm font-bold">Tournaments</h2>
      {tournaments.length === 0 && <p className={`text-sm ${muted}`}>No tournaments yet.{role === 'admin' ? ' Create one under Admin.' : ''}</p>}
      <div className="grid gap-2 md:grid-cols-2">
        {tournaments.map((t) => (
          <Link key={t.id} href={`/${slug}/t/${t.id}`} className={`${card} flex items-center justify-between gap-3 transition-colors hover:border-[color:var(--green)]`}>
            <span><span className="font-semibold">{t.name}</span><span className={`block text-xs ${muted}`}>{t.date ?? 'No date'}{t.id === active?.id ? ' · active' : ''}</span></span>
            {t.visibility === 'private' && <span className="rounded-full bg-[var(--chip)] px-2.5 py-1 text-xs font-bold">Private</span>}
          </Link>
        ))}
      </div>
    </>
  )
}
