import { getContext, MATCH_SELECT } from '@/lib/data'
import { computeStandings } from '@/lib/standings'
import { buildReport } from '@/lib/report'

export const dynamic = 'force-dynamic'

// GET /report -> PDF of the active tournament (everything in it is already public).
export async function GET() {
  const { sb, active, brackets } = await getContext()
  if (!active) return new Response('No tournament yet.', { status: 404 })

  const [{ data: teams }, { data: matches }] = await Promise.all([
    sb.from('teams').select('*').eq('tournament_id', active.id),
    sb.from('matches').select(MATCH_SELECT).eq('tournament_id', active.id).order('game_no'),
  ])
  const all = matches ?? []

  const bytes = await buildReport({
    tournament: active,
    brackets: brackets.map((b) => {
      const games = all.filter((m) => m.bracket_id === b.id && m.round === 'Round robin')
      const rows = computeStandings((teams ?? []).filter((t) => t.bracket_id === b.id), games)
      return { name: b.name, rows, games }
    }),
    playoffs: all.filter((m) => m.bracket_id === null),
    generatedAt: new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
  })

  const file = active.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'tournament'
  return new Response(new Uint8Array(bytes), {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${file}-report.pdf"` },
  })
}
