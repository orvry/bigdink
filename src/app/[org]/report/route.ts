import { getContext, MATCH_SELECT } from '@/lib/data'
import { computeStandings } from '@/lib/standings'
import { computeMvps, topMvps } from '@/lib/stats'
import { buildReport } from '@/lib/report'
import type { Match, Team } from '@/lib/types'

export const dynamic = 'force-dynamic'

// GET /<group>/report -> PDF of the group's active tournament (everything in it is already public).
export async function GET(_req: Request, { params }: { params: Promise<{ org: string }> }) {
  const { org: slug } = await params
  const { sb, org, active, brackets } = await getContext(slug)
  if (!active) return new Response('No tournament yet.', { status: 404 })

  const [{ data: teams }, { data: matches }, { data: pts }] = await Promise.all([
    sb.from('teams').select('*').eq('tournament_id', active.id),
    sb.from('matches').select(MATCH_SELECT).eq('tournament_id', active.id).order('game_no'),
    sb.from('player_points').select('team_id,player,points').eq('tournament_id', active.id),
  ])
  const all = (matches ?? []) as Match[]
  const allTeams = (teams ?? []) as Team[]
  const mvps = computeMvps(pts ?? [], allTeams)

  const bytes = await buildReport({
    orgName: org.name,
    tournament: active,
    brackets: brackets.map((b) => {
      const games = all.filter((m) => m.bracket_id === b.id && m.round === 'Round robin')
      const rows = computeStandings(allTeams.filter((t) => t.bracket_id === b.id), games)
      return { name: b.name, rows, games, mvps: topMvps(mvps.filter((p) => p.bracketId === b.id)) }
    }),
    playoffs: all.filter((m) => m.bracket_id === null),
    mvps,
    generatedAt: new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
  })

  const file = active.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'tournament'
  return new Response(new Uint8Array(bytes), {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${file}-report.pdf"` },
  })
}
