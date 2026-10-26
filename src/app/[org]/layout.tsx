import Link from 'next/link'
import { getOrg, roleIn } from '@/lib/auth'
import { isRentalActive, hoursLeft, fmtWhen } from '@/lib/billing'

export default async function OrgLayout({ children, params }: { children: React.ReactNode; params: Promise<{ org: string }> }) {
  const { org: slug } = await params
  const org = await getOrg(slug)
  const role = await roleIn(org.id)
  const active = isRentalActive(org)
  const base = `/${slug}`
  const link = 'whitespace-nowrap px-3 py-3 text-sm font-semibold'
  return (
    <>
      <nav aria-label={`${org.name} menu`} className="-mt-4 flex items-center gap-1 overflow-x-auto border-b border-[color:var(--line)] md:-mt-6">
        <Link href={base} className="px-3 py-3 text-sm font-bold">{org.name}</Link>
        {org.visibility === 'private' && <span className="rounded-full bg-[var(--chip)] px-2 py-0.5 text-xs font-bold">Private</span>}
        <span className="flex-1" />
        {active && role !== 'viewer' && <Link href={`${base}/scorer`} className={link}>Score</Link>}
        {active && role === 'admin' && <Link href={`${base}/admin`} className={link}>Admin</Link>}
        {!active && role === 'admin' && <Link href={`${base}/admin/billing`} className={link}>Billing</Link>}
      </nav>
      {!active && (
        <div role="status" className="rounded-xl bg-[#F5C84C] p-3 text-sm font-semibold text-[#10231A]">
          This group’s rental has ended. Viewing and report downloads still work.{' '}
          {role === 'admin' ? <Link href={`${base}/admin/billing`} className="underline">Renew the rental</Link> : 'Scoring and management are paused until an admin renews.'}
        </div>
      )}
      {active && role === 'admin' && hoursLeft(org) < 24 && (
        <div role="status" className="rounded-xl bg-[#F5C84C] p-3 text-sm font-semibold text-[#10231A]">
          Rental ends {fmtWhen(org.rental_until!)}. <Link href={`${base}/admin/billing`} className="underline">Add more days</Link>
        </div>
      )}
      {children}
    </>
  )
}
