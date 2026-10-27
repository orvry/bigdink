import Link from 'next/link'
import { ChevronDown, LogOut } from 'lucide-react'
import { getUser } from '@/lib/auth'
import { signOut } from '@/app/actions'
import SubmitButton from '@/components/SubmitButton'
import ThemeToggle from '@/components/ThemeToggle'
import type { Role } from '@/lib/types'

const ROLE_LABEL: Record<Role, string> = { admin: 'Admin', scorer: 'Scorer', viewer: 'Viewer' }

/** Avatar, name and role, with a small menu: theme, all groups, sign out. */
export default async function UserMenu({ role }: { role?: Role }) {
  const user = await getUser()
  if (!user) return <Link href="/login" className="inline-flex h-11 items-center rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-[color:var(--on-primary)]">Sign in</Link>
  const name = user.email.split('@')[0]
  return (
    <details className="relative">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-xl px-1 [&::-webkit-details-marker]:hidden">
        <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)] text-sm font-bold text-[color:var(--on-primary)]">{name.slice(0, 2).toUpperCase()}</span>
        <span className="hidden flex-col text-left leading-tight sm:flex">
          <span className="max-w-40 truncate text-sm font-semibold">{name}</span>
          <span className="text-xs text-[color:var(--muted)]">{role ? ROLE_LABEL[role] : 'Signed in'}</span>
        </span>
        <ChevronDown aria-hidden="true" size={16} className="text-[color:var(--muted)]" />
        <span className="sr-only">Account menu</span>
      </summary>
      <div className="absolute right-0 z-30 mt-2 flex w-64 flex-col gap-3 rounded-2xl border border-[color:var(--line)] bg-[var(--elev)] p-3 shadow-lg">
        <div className="px-1 text-sm"><div className="truncate font-semibold">{user.email}</div></div>
        <ThemeToggle />
        <Link href="/" className="rounded-lg px-2 py-2.5 text-sm font-semibold hover:bg-[var(--chip)]">All tournaments and groups</Link>
        <form action={signOut}>
          <SubmitButton pendingText="Signing out…" className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[color:var(--line2)] text-sm font-semibold"><LogOut aria-hidden="true" size={16} />Sign out</SubmitButton>
        </form>
      </div>
    </details>
  )
}
