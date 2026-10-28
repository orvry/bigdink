import Link from 'next/link'
import { Settings } from 'lucide-react'
import { getContext } from '@/lib/data'
import { getUser, roleIn } from '@/lib/auth'
import { isMemberRole } from '@/lib/roles'
import { getMyStats } from '@/lib/personal-stats'
import FeedCard from '@/components/FeedCard'
import PersonalStats from '@/components/PersonalStats'
import ShareButton from '@/components/ShareButton'
import SubmitButton from '@/components/SubmitButton'
import { rotateInvite } from '@/app/actions'
import { card, btn2, muted } from '@/lib/ui'
import type { FeedRow } from '@/lib/types'

export const dynamic = 'force-dynamic'

/** The group's home: its news feed of tournaments, a list of tournaments, and the signed-in member's own stats here. */
export default async function GroupHome({ params }: { params: Promise<{ org: string }> }) {
  const { org: slug } = await params
  const { sb, org, active } = await getContext(slug)
  const user = await getUser()
  const role = await roleIn(org.id)
  const member = isMemberRole(role)

  const [{ data: cards }, { data: regs }, stats, invite] = await Promise.all([
    sb.from('tournament_cards').select('*').eq('org_id', org.id).order('created_at', { ascending: false }),
    user ? sb.from('tournament_registrations').select('tournament_id').eq('user_id', user.id).in('status', ['pending', 'approved']) : Promise.resolve({ data: [] as never[] }),
    user && member ? getMyStats(sb, org.id) : Promise.resolve(null),
    member ? sb.rpc('ensure_invite', { p_org: org.id }) : Promise.resolve({ data: null }),
  ])
  const feed = (cards ?? []) as FeedRow[]
  const registered = new Set(((regs ?? []) as unknown as { tournament_id: string }[]).map((r) => r.tournament_id))
  const code = invite.data as string | null

  return (
    <>
      <header className={`${card} flex flex-wrap items-center gap-4`}>
        <span aria-hidden="true" className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary)] text-2xl font-bold text-[color:var(--on-primary)]">{org.name.slice(0, 1).toUpperCase()}</span>
        <div className="min-w-48 flex-1">
          <h1 className="text-2xl font-bold">{org.name}</h1>
          <p className={`text-sm ${muted}`}>
            {org.visibility === 'public' ? 'Public group' : 'Private group'} · {org.join_policy === 'open' && org.visibility === 'public' ? 'Anyone can join' : 'Join by invite'}
            {member ? ` · you are ${role === 'admin' ? 'an admin' : role === 'scorer' ? 'a scorer' : 'a member'}` : ''}
          </p>
        </div>
        {!member && <Link href={`/${slug}/join`} className="inline-flex h-12 items-center rounded-xl bg-[var(--primary)] px-5 font-bold text-[color:var(--on-primary)]">Join Group</Link>}
        {role === 'admin' && <Link href={`/${slug}/admin`} className={btn2}><Settings aria-hidden="true" size={18} />Manage</Link>}
        {member && code && (
          <details className="relative">
            <summary className={`${btn2} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>Invite</summary>
            <div className="absolute right-0 z-20 mt-2 flex w-72 max-w-[85vw] flex-col gap-2 rounded-2xl border border-[color:var(--line)] bg-[var(--elev)] p-3 shadow-lg">
              <p className="text-sm font-semibold">Invite people to {org.name}</p>
              <p className={`text-xs ${muted}`}>Anyone with this link can join the group, even if it is invite only.</p>
              <ShareButton path={`/${slug}/join?code=${code}`} title={`Join ${org.name}`} />
              {role === 'admin' && <form action={rotateInvite.bind(null, org.id)}><SubmitButton pendingText="Changing…" className="w-full text-xs font-semibold text-[color:var(--muted)] underline">Replace the link (the old one stops working)</SubmitButton></form>}
            </div>
          </details>
        )}
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-8">
        <section aria-label="News feed" className="flex min-w-0 flex-col gap-3">
          <h2 className="text-lg font-bold">News feed</h2>
          {feed.length === 0 && <p className={`text-sm ${muted}`}>No tournaments yet.{role === 'admin' ? ' Create one under Settings.' : ''}</p>}
          {feed.map((t) => <FeedCard key={t.id} t={t} member={member} registered={registered.has(t.id)} />)}
        </section>
        <aside className="flex flex-col gap-3 lg:sticky lg:top-20">
          {user && member && stats && <PersonalStats title="Your stats here" stats={stats} />}
          {!user && <section className={card}><p className="text-sm"><Link href={`/login?next=${encodeURIComponent(`/${slug}`)}`} className="font-bold text-[color:var(--link)]">Sign in</Link> to see your stats and join tournaments.</p></section>}
          <section className={`${card} flex flex-col gap-1`} aria-label="Tournaments">
            <h2 className="mb-1 text-lg font-bold">Tournaments</h2>
            {feed.length === 0 && <p className={`text-sm ${muted}`}>None yet.</p>}
            {feed.map((t) => (
              <Link key={t.id} href={`/${slug}/t/${t.id}`} className="flex min-h-11 items-center gap-2 rounded-xl px-2 hover:bg-[var(--chip)]">
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{t.name}</span><span className={`block text-xs ${muted}`}>{t.date ?? 'No date'}{t.id === active?.id ? ' · active' : ''}</span></span>
                {t.visibility === 'private' && <span className="rounded-full bg-[var(--chip)] px-2 py-0.5 text-xs font-bold">Private</span>}
              </Link>
            ))}
          </section>
        </aside>
      </div>
    </>
  )
}
