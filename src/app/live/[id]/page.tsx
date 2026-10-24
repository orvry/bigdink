import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { MATCH_SELECT, slotLabel, rulesOf } from '@/lib/data'
import LiveBoard from '@/components/LiveBoard'
import Breadcrumbs from '@/components/Breadcrumbs'
import { btn, muted } from '@/lib/ui'

export const dynamic = 'force-dynamic'

export default async function Live({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await createClient()
  const { data: m } = await sb.from('matches').select(MATCH_SELECT).eq('id', id).single()
  if (!m) notFound()
  const { ptw, wb } = rulesOf(m)
  return (
    <>
      <Breadcrumbs items={[{ label: 'Summary', href: '/' }, { label: 'Live game' }]} />
      <p className={`text-sm ${muted}`}>Game {m.game_no} · {m.round}{m.court ? ` · Court ${m.court}` : ''}</p>
      <LiveBoard initial={m} name1={slotLabel(m, 1)} name2={slotLabel(m, 2)} ptw={ptw} wb={wb} />
      <p className={`text-center text-sm ${muted}`}>First to {ptw}, win by {wb}</p>
      <Link href="/standings" className={`${btn} md:self-center`}>View standings</Link>
    </>
  )
}
