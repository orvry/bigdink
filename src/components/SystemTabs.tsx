'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [['/system', 'Overview'], ['/system/payments', 'Payments'], ['/system/payment-accounts', 'Payment accounts'], ['/system/groups', 'Groups']] as const

export default function SystemTabs() {
  const pathname = usePathname()
  return (
    <nav aria-label="System" className="flex gap-1 overflow-x-auto rounded-xl bg-[var(--chip)] p-1">
      {TABS.map(([href, label]) => {
        const on = href === '/system' ? pathname === href : pathname.startsWith(href)
        return <Link key={href} href={href} aria-current={on ? 'page' : undefined} className={`flex h-10 items-center whitespace-nowrap rounded-lg px-4 text-sm font-semibold ${on ? 'bg-[var(--card)] shadow-sm' : 'text-[color:var(--muted)]'}`}>{label}</Link>
      })}
    </nav>
  )
}
