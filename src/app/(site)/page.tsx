import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getUser } from '@/lib/auth'
import { PRICE_PER_DAY } from '@/lib/billing'
import { money } from '@/lib/format'
import { getMyStats } from '@/lib/personal-stats'
import { getMyTournaments } from '@/lib/my-tournaments'
import { BRAND } from '@/lib/brand'
import FeedCard from '@/components/FeedCard'
import PersonalStats from '@/components/PersonalStats'
import { btn, card, input, muted } from '@/lib/ui'
import type { FeedRow } from '@/lib/types'

export const dynamic = 'force-dynamic'
const LIMIT = 30

export default async function Feed({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string }> }) {
  const { tab, q = '' } = await searchParams
  const groupsTab = tab === 'groups'
  const term = q.replace(/[%,()*]/g, ' ').trim()
  const sb = await createClient()
  const user = await getUser()

  const [{ data: mine }, { data: regs }, stats, upcoming] = await Promise.all([
    user ? sb.from('memberships').select('role,organizations(id,name,slug)').eq('user_id', user.id) : Promise.resolve({ data: [] as never[] }),
    user ? sb.from('tournament_registrations').select('tournament_id').eq('user_id', user.id).in('status', ['pending', 'approved']) : Promise.resolve({ data: [] as never[] }),
    user ? getMyStats(sb) : Promise.resolve(null),
    user ? getMyTournaments(sb, user.id) : Promise.resolve([]),
  ])
  const yours = ((mine ?? []) as unknown as { role: string; organizations: { id: string; name: string; slug: string } | null }[]).filter((m) => m.organizations)
  const memberOf = new Set(yours.map((m) => m.organizations!.id))
  const registered = new Set(((regs ?? []) as unknown as { tournament_id: string }[]).map((r) => r.tournament_id))

  let feed: FeedRow[] = []
  let groups: { id: string; name: string; slug: string; tournaments: { count: number }[] }[] = []
  if (groupsTab) {
    let gq = sb.from('organizations').select('id,name,slug,tournaments(count)').eq('visibility', 'public').order('name').limit(LIMIT)
    if (term) gq = gq.ilike('name', `%${term}%`)
    groups = ((await gq).data ?? []) as typeof groups
  } else {
    let fq = sb.from('tournament_feed').select('*').order('live', { ascending: false }).order('created_at', { ascending: false }).limit(LIMIT)
    if (term) fq = fq.or(`name.ilike.%${term}%,org_name.ilike.%${term}%`)
    feed = ((await fq).data ?? []) as FeedRow[]
  }
  const tabCls = (on: boolean) => `flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold ${on ? 'bg-[var(--solid)] text-[color:var(--on-solid)]' : 'border border-[color:var(--ink)]'}`

  return (
    <>
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{BRAND.name}</h1>
        <p className={`text-sm ${muted}`}>Browse public tournaments and groups. Watch live games, standings and brackets.</p>
      </div>

      {user && stats && <PersonalStats title="Your stats" stats={stats} />}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start lg:gap-8">
        <div className="flex min-w-0 flex-col gap-3">
          {user && upcoming.length > 0 && (
            <section aria-label="My upcoming tournaments" className={`${card} flex flex-col gap-2`}>
              <h2 className="text-lg font-bold">My upcoming tournaments</h2>
              {upcoming.slice(0, 5).map(({ card: c, label }) => (
                <Link key={c.id} href={`/${c.org_slug}/t/${c.id}`} className="flex items-center gap-3 rounded-xl p-2 hover:bg-[var(--chip)]">
                  <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{c.name}</span><span className={`block text-xs ${muted}`}>{c.org_name} · {c.date ?? 'Date to be announced'}</span></span>
                  <span className="tint-blue rounded-full px-3 py-1 text-xs font-bold">{label}</span>
                </Link>
              ))}
            </section>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-2">
              <Link href={`/${term ? `?q=${encodeURIComponent(term)}` : ''}`} className={tabCls(!groupsTab)}>Tournaments</Link>
              <Link href={`/?tab=groups${term ? `&q=${encodeURIComponent(term)}` : ''}`} className={tabCls(groupsTab)}>Groups</Link>
            </div>
            <form className="flex min-w-[14rem] flex-1 gap-2" role="search">
              {groupsTab && <input type="hidden" name="tab" value="groups" />}
              <input name="q" defaultValue={term} placeholder={groupsTab ? 'Search groups' : 'Search tournaments or groups'} aria-label="Search" className={input} />
              <button className="h-12 rounded-xl border border-[color:var(--line2)] px-4 font-semibold">Search</button>
            </form>
          </div>

          {groupsTab ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {groups.map((g) => (
                <div key={g.id} className={`${card} flex items-center gap-3`}>
                  <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] font-bold text-[color:var(--on-primary)]">{g.name.slice(0, 1).toUpperCase()}</span>
                  <Link href={`/${g.slug}`} className="min-w-0 flex-1"><span className="block truncate font-semibold hover:underline">{g.name}</span><span className={`block text-xs ${muted}`}>{g.tournaments?.[0]?.count ?? 0} tournaments</span></Link>
                  {!memberOf.has(g.id) && <Link href={`/${g.slug}/join`} className="inline-flex h-10 items-center rounded-xl border border-[color:var(--line2)] px-3 text-sm font-semibold text-[color:var(--link)]">Join Group</Link>}
                </div>
              ))}
              {groups.length === 0 && <p className={`text-sm ${muted}`}>No public groups found.</p>}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {feed.map((t) => <FeedCard key={t.id} t={t} member={memberOf.has(t.org_id)} registered={registered.has(t.id)} />)}
              {feed.length === 0 && <p className={`text-sm ${muted}`}>{term ? 'No public tournaments match your search.' : 'No public tournaments yet.'}</p>}
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-3 lg:sticky lg:top-4">
          {yours.length > 0 && (
            <section aria-label="Your groups" className={`${card} flex flex-col gap-2`}>
              <h2 className="text-sm font-bold">Your groups</h2>
              {yours.map((m) => (
                <Link key={m.organizations!.id} href={`/${m.organizations!.slug}`} className="flex items-center justify-between gap-2 rounded-lg px-1 py-1.5 text-sm font-semibold hover:bg-[var(--chip)]">
                  <span className="truncate">{m.organizations!.name}</span><span className={`shrink-0 text-xs font-normal ${muted}`}>{m.role}</span>
                </Link>
              ))}
            </section>
          )}
          <section aria-label="Create a group" className={`${card} flex flex-col gap-2`}>
            <h2 className="font-bold">Run your own tournaments</h2>
            <p className={`text-sm ${muted}`}>Create a group for your club or event to host tournaments, score games live and publish standings.</p>
            <p className="text-sm"><b>Creating a group has a fee.</b> You pay {money(PRICE_PER_DAY / 100, 'PHP')} for each day your group is active. You choose the number of days and pay before the group is created.</p>
            <Link href={user ? '/new-group' : '/login'} className={`${btn} w-full`}>{user ? 'Create a group' : 'Sign in to create a group'}</Link>
          </section>
        </aside>
      </div>
    </>
  )
}
