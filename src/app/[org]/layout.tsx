import Link from 'next/link'
import { getContext } from '@/lib/data'
import { roleIn } from '@/lib/auth'
import { isRentalActive, hoursLeft, fmtWhen } from '@/lib/billing'
import Logo from '@/components/Logo'
import MobileMenu from '@/components/MobileMenu'
import SidebarNav from '@/components/SidebarNav'
import UserMenu from '@/components/UserMenu'
import TournamentSwitcher from '@/components/TournamentSwitcher'

/** The group shell: sidebar with icons on the left, top bar with the user menu, then the page. */
export default async function OrgLayout({ children, params }: { children: React.ReactNode; params: Promise<{ org: string }> }) {
  const { org: slug } = await params
  const { org, active, tournaments } = await getContext(slug)
  const role = await roleIn(org.id)
  const rentalActive = isRentalActive(org)
  const base = `/${slug}`

  const sidebar = (
    <>
      <Logo />
      <SidebarNav slug={slug} defaultTid={active?.id ?? null} role={role} rentalActive={rentalActive} />
      <TournamentSwitcher slug={slug} tournaments={tournaments.map((t) => ({ id: t.id, name: t.name, date: t.date }))} defaultTid={active?.id ?? null} orgName={org.name} />
    </>
  )

  return (
    <div className="min-h-screen lg:pl-64">
      <aside aria-label="Sidebar" className="fixed inset-y-0 left-0 hidden w-64 flex-col gap-6 overflow-y-auto border-r border-[color:var(--line)] bg-[var(--card)] p-4 lg:flex">{sidebar}</aside>
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-[color:var(--line)] bg-[var(--bg)] px-4 py-2.5 md:px-8">
          <MobileMenu slug={slug} defaultTid={active?.id ?? null}>{sidebar}</MobileMenu>
          <Link href={base} className="flex min-w-0 items-center gap-2 font-semibold lg:hidden"><span className="truncate">{org.name}</span></Link>
          <span className="hidden items-center gap-2 text-sm font-semibold lg:flex">
            {org.name}{org.visibility === 'private' && <span className="rounded-full bg-[var(--chip)] px-2 py-0.5 text-xs font-bold">Private</span>}
          </span>
          <span className="flex-1" />
          <UserMenu role={role} />
        </header>
        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-4 pb-24 md:px-8 md:py-6 lg:pb-6">
          {!rentalActive && (
            <div role="status" className="rounded-xl bg-[var(--gold)] p-3 text-sm font-semibold text-[#172033]">
              This group’s rental has ended. Viewing and report downloads still work.{' '}
              {role === 'admin' ? <Link href={`${base}/admin/billing`} className="underline">Renew the rental</Link> : 'Scoring and management are paused until an admin renews.'}
            </div>
          )}
          {rentalActive && role === 'admin' && hoursLeft(org) < 24 && (
            <div role="status" className="rounded-xl bg-[var(--gold)] p-3 text-sm font-semibold text-[#172033]">
              Rental ends {fmtWhen(org.rental_until!)}. <Link href={`${base}/admin/billing`} className="underline">Add more days</Link>
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  )
}
