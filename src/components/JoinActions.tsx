import Link from 'next/link'
import { Check } from 'lucide-react'

const primary = 'inline-flex h-10 items-center justify-center rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-[color:var(--on-primary)] hover:brightness-110'
const secondary = 'inline-flex h-10 items-center justify-center rounded-xl border border-[color:var(--line2)] bg-[var(--card)] px-4 text-sm font-semibold text-[color:var(--link)] hover:bg-[var(--chip)]'

/**
 * What a visitor can do about a tournament. Registered people see their status. Group members see Participate.
 * Everyone else sees Join Group and Join Tournament (the tournament page lets them join as a guest).
 */
export default function JoinActions({ slug, tid, member, registered, open }: { slug: string; tid: string; member: boolean; registered: boolean; open: boolean }) {
  const join = `/${slug}/t/${tid}/join`
  if (registered) return <Link href={join} className={`${secondary} gap-1.5`}><Check aria-hidden="true" size={16} />Registered</Link>
  if (!open) return <span className="inline-flex h-10 items-center rounded-xl bg-[var(--chip)] px-4 text-sm font-semibold text-[color:var(--muted)]">Registration closed</span>
  if (member) return <Link href={join} className={primary}>Participate</Link>
  return (
    <>
      <Link href={`/${slug}/join`} className={secondary}>Join Group</Link>
      <Link href={join} className={primary}>Join Tournament</Link>
    </>
  )
}
