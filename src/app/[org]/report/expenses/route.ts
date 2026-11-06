import { getContext } from '@/lib/data'
import { roleIn } from '@/lib/auth'
import { buildExpenseReport } from '@/lib/expenseReport'
import type { Expense, Team } from '@/lib/types'

export const dynamic = 'force-dynamic'

// GET /<group>/report/expenses -> expense report PDF. Admins only: money is private to the group's admins.
export async function GET(_req: Request, { params }: { params: Promise<{ org: string }> }) {
  const { org: slug } = await params
  const { sb, org, active } = await getContext(slug)
  if ((await roleIn(org.id)) !== 'admin') return new Response('Admins only.', { status: 403 })
  if (!active) return new Response('No tournament yet.', { status: 404 })

  const [{ data: ex }, { data: teams }] = await Promise.all([
    sb.from('expenses').select('*').eq('tournament_id', active.id),
    sb.from('teams').select('*').eq('tournament_id', active.id).order('seed'),
  ])
  const players = ((teams ?? []) as Team[]).flatMap((t) => [t.player1, t.player2].filter((p): p is string => Boolean(p)).map((name) => ({ name, team: t.name })))

  const bytes = await buildExpenseReport({
    orgName: org.name,
    tournament: active,
    expenses: (ex ?? []) as Expense[],
    players,
    generatedAt: new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
  })
  const file = active.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'tournament'
  return new Response(new Uint8Array(bytes), {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${file}-expenses.pdf"` },
  })
}
