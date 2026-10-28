import { getTournamentContext, pickBracket } from '@/lib/data'
import { computeStandings } from '@/lib/standings'
import BracketTabs from '@/components/BracketTabs'
import Breadcrumbs from '@/components/Breadcrumbs'
import { muted } from '@/lib/ui'
import type { Match, Team } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function Standings({ params, searchParams }: { params: Promise<{ org: string; tid: string }>; searchParams: Promise<{ b?: string }> }) {
  const { org: slug, tid } = await params
  const { b } = await searchParams
  const { sb, org, brackets } = await getTournamentContext(slug, tid)
  const bracket = pickBracket(brackets, b)
  if (!bracket) return <p>No bracket yet.</p>
  const [{ data: teams }, { data: matches }] = await Promise.all([
    sb.from('teams').select('*').eq('bracket_id', bracket.id),
    sb.from('matches').select('*').eq('bracket_id', bracket.id).eq('round', 'Round robin'),
  ])
  const rows = computeStandings((teams ?? []) as Team[], (matches ?? []) as Match[])
  const th = 'px-3 py-1 font-semibold'
  // Rounded rows. Teams that advance get a soft blue tint and a blue bar on the left. No divider line.
  const rowCells = '[&>td]:border-y [&>td]:border-[color:var(--line)] [&>td:first-child]:rounded-l-2xl [&>td:first-child]:border-l [&>td:last-child]:rounded-r-2xl [&>td:last-child]:border-r'
  const advancing = '[&>td]:bg-[var(--tint-blue)] [&>td:first-child]:shadow-[inset_4px_0_0_var(--primary)]'
  return (
    <>
      <Breadcrumbs items={[{ label: org.name, href: `/${slug}` }, { label: 'Tournament', href: `/${slug}/t/${tid}` }, { label: 'Standings' }]} />
      <h1 className="text-2xl font-bold md:text-3xl">Standings</h1>
      <BracketTabs base={`/${slug}/t/${tid}/standings`} brackets={brackets} current={bracket.name} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[22rem] border-separate border-spacing-y-2 text-left text-[15px]">
          <thead className={`text-xs ${muted}`}>
            <tr>
              <th className={th}>#</th><th className={th}>Team</th>
              <th className={th}><abbr title="Wins">W</abbr></th>
              <th className={th}><abbr title="Losses">L</abbr></th>
              <th className={th}><abbr title="Points for: total points scored">PF</abbr></th>
              <th className={th}><abbr title="Point difference: points scored minus points allowed">+/−</abbr></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.team.id} className={`${rowCells} ${i < 2 ? advancing : '[&>td]:bg-[var(--card)]'}`}>
                <td className="px-3 py-3 font-bold">{i + 1}</td>
                <td className="px-3"><div className="font-semibold">{r.team.name}</div>
                  <div className={`text-xs ${muted}`}>{i < 2 ? 'Advances to semifinals' : ''}{i < 2 && r.via ? ' · ' : ''}{r.via === 'h2h' ? 'Won head-to-head' : r.via === 'points' ? 'Tiebreak: total points' : ''}</div></td>
                <td className="px-3 tabular">{r.w}</td><td className="px-3 tabular">{r.l}</td><td className="px-3 tabular">{r.pf}</td><td className="px-3 tabular">{r.diff > 0 ? `+${r.diff}` : r.diff}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className={`grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2 ${muted}`}>
        <div><dt className="inline font-bold text-[color:var(--ink)]">W</dt> <dd className="inline">Wins: games the team won.</dd></div>
        <div><dt className="inline font-bold text-[color:var(--ink)]">L</dt> <dd className="inline">Losses: games the team lost.</dd></div>
        <div><dt className="inline font-bold text-[color:var(--ink)]">PF</dt> <dd className="inline">Points for: total points the team scored.</dd></div>
        <div><dt className="inline font-bold text-[color:var(--ink)]">+/−</dt> <dd className="inline">Point difference: points scored minus points allowed.</dd></div>
      </dl>
      <ol className={`list-decimal pl-5 text-xs ${muted}`}>
        <li>Most wins.</li>
        <li>Two teams tied: the team that won their head-to-head game ranks higher.</li>
        <li>Three or more tied: most total points (PF) in the round robin.</li>
        <li>Only the top 2 teams in each bracket advance to the semifinals.</li>
      </ol>
    </>
  )
}
