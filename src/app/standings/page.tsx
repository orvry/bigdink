import { getContext, pickBracket } from '@/lib/data'
import { computeStandings } from '@/lib/standings'
import BracketTabs from '@/components/BracketTabs'
import Breadcrumbs from '@/components/Breadcrumbs'
import { muted } from '@/lib/ui'

export const dynamic = 'force-dynamic'

export default async function Standings({ searchParams }: { searchParams: Promise<{ b?: string }> }) {
  const { b } = await searchParams
  const { sb, brackets } = await getContext()
  const bracket = pickBracket(brackets, b)
  if (!bracket) return <p>No bracket yet.</p>
  const [{ data: teams }, { data: matches }] = await Promise.all([
    sb.from('teams').select('*').eq('bracket_id', bracket.id),
    sb.from('matches').select('*').eq('bracket_id', bracket.id).eq('round', 'Round robin'),
  ])
  const rows = computeStandings(teams ?? [], matches ?? [])
  const th = 'px-3 py-2 font-semibold'
  return (
    <>
      <Breadcrumbs items={[{ label: 'Summary', href: '/' }, { label: 'Standings' }]} />
      <h1 className="text-2xl font-bold md:text-3xl">Standings</h1>
      <BracketTabs base="/standings" brackets={brackets} current={bracket.name} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[22rem] text-left text-[15px]">
          <thead className={`text-xs ${muted}`}><tr><th className={th}>#</th><th className={th}>Team</th><th className={th}>W</th><th className={th}>L</th><th className={th}>PF</th><th className={th}>+/−</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.team.id} className={`bg-[var(--card)] ${i < 2 ? 'border-l-4 border-l-[#1F7A4D]' : 'border-l-4 border-l-transparent'} ${i === 1 ? 'border-b-2 border-b-[color:var(--ink)]' : 'border-b border-b-[color:var(--line)]'}`}>
                <td className="px-3 py-3 font-bold">{i + 1}</td>
                <td className="px-3"><div className="font-semibold">{r.team.name}</div>
                  <div className={`text-xs ${muted}`}>{i < 2 ? 'Advances to semifinals' : ''}{i < 2 && r.via ? ' · ' : ''}{r.via === 'h2h' ? 'Won head-to-head' : r.via === 'points' ? 'Tiebreak: total points' : ''}</div></td>
                <td className="px-3">{r.w}</td><td className="px-3">{r.l}</td><td className="px-3">{r.pf}</td><td className="px-3">{r.diff > 0 ? `+${r.diff}` : r.diff}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ol className={`list-decimal pl-5 text-xs ${muted}`}>
        <li>Most wins.</li>
        <li>Two teams tied: the team that won their head-to-head game ranks higher.</li>
        <li>Three or more tied: most total points in the round robin.</li>
        <li>Only the top 2 teams in each bracket advance to the semifinals.</li>
      </ol>
    </>
  )
}
