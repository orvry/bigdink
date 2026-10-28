import Link from 'next/link'
import { adminClient } from '@/lib/supabase/admin'
import { money } from '@/lib/format'
import { StatCard } from '@/components/ui-kit'
import { Building2, CalendarCheck, Clock, Wallet } from 'lucide-react'
import { card, muted } from '@/lib/ui'

export const dynamic = 'force-dynamic'

export default async function SystemOverview() {
  const admin = adminClient()
  const since = new Date(Date.now() - 30 * 864e5).toISOString()
  const [groups, active, waiting, unreported, paid] = await Promise.all([
    admin.from('organizations').select('id', { count: 'exact', head: true }),
    admin.from('organizations').select('id', { count: 'exact', head: true }).gt('rental_until', new Date().toISOString()),
    admin.from('payments').select('id', { count: 'exact', head: true }).eq('provider', 'manual').eq('status', 'submitted'),
    admin.from('payments').select('id', { count: 'exact', head: true }).eq('provider', 'manual').eq('status', 'pending'),
    admin.from('payments').select('amount').eq('status', 'paid').gt('amount', 0).gt('paid_at', since),
  ])
  const revenue = (paid.data ?? []).reduce((a, r) => a + (r.amount as number), 0)
  return (
    <>
      <h1 className="text-2xl font-bold md:text-3xl">Overview</h1>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard tint="blue" icon={<Building2 size={22} />} label="Groups" value={groups.count ?? 0} sub={`${active.count ?? 0} with an active rental`} />
        <StatCard tint="coral" icon={<Clock size={22} />} label="Waiting for confirmation" value={waiting.count ?? 0} sub="payer says they paid" />
        <StatCard tint="gold" icon={<CalendarCheck size={22} />} label="Not paid yet" value={unreported.count ?? 0} sub="payment started" />
        <StatCard tint="teal" icon={<Wallet size={22} />} label="Paid, last 30 days" value={money(revenue / 100, 'PHP')} />
      </div>
      <section className={`${card} flex flex-col gap-2`}>
        <h2 className="text-lg font-bold">What to do</h2>
        <p className={`text-sm ${muted}`}>Open <Link href="/system/payments" className="font-semibold text-[color:var(--link)]">Payments</Link>, find each waiting payment in your GCash, Maya or bank account, and confirm it with the amount, reference number and time you see. The same actions are available to scripts through the confirmation API (see docs/payment-api.md).</p>
      </section>
    </>
  )
}
