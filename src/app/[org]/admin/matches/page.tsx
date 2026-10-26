import { requireRole } from '@/lib/auth'
import { scopedMatches, slotLabel } from '@/lib/data'
import { addMatch, deleteMatch, refreshPlayoffs } from '@/app/actions'
import ActionForm from '@/components/ActionForm'
import SubmitButton from '@/components/SubmitButton'
import BracketTabs from '@/components/BracketTabs'
import Breadcrumbs from '@/components/Breadcrumbs'
import { card, btn, btn2, input, label, muted, ROUNDS } from '@/lib/ui'

export const dynamic = 'force-dynamic'

export default async function Matches({ params, searchParams }: { params: Promise<{ org: string }>; searchParams: Promise<{ b?: string }> }) {
  const { org: slug } = await params
  await requireRole(slug, ['admin'])
  const { b } = await searchParams
  const { sb, active, brackets, bracket, isP, matches } = await scopedMatches(slug, b)
  if (!active || (!bracket && !isP)) return <p>Create a tournament first.</p>
  let tq = sb.from('teams').select('id,name,seed').eq('tournament_id', active.id).order('seed')
  if (!isP) tq = tq.eq('bracket_id', bracket.id)
  const { data: teams } = await tq
  const opts = (
    <>
      <option value="">TBD / filled automatically</option>
      {(teams ?? []).map((t) => <option key={t.id} value={t.id}>{t.name} (Seed {t.seed})</option>)}
    </>
  )
  const rounds = isP ? ROUNDS.slice(1) : ROUNDS.slice(0, 1)
  return (
    <>
      <Breadcrumbs items={[{ label: 'Group', href: `/${slug}` }, { label: 'Admin', href: `/${slug}/admin` }, { label: 'Matches' }]} />
      <h1 className="text-2xl font-bold md:text-3xl">Matches</h1>
      <BracketTabs base={`/${slug}/admin/matches`} brackets={brackets} current={isP ? 'P' : bracket.name} playoffs />
      <div className="grid items-start gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className={`text-xs font-bold ${muted}`}>{matches.length} GAMES ADDED</p>
            {isP && <form action={refreshPlayoffs.bind(null, active.id)}><SubmitButton pendingText="Filling…" className={`${btn2} h-11 text-sm`}>Fill from standings</SubmitButton></form>}
          </div>
          {matches.map((m) => (
            <div key={m.id} className="flex items-center gap-2 rounded-xl bg-[var(--card)] px-4 py-2.5">
              <div className="flex-1"><div className={`text-xs ${muted}`}>Game {m.game_no} · {m.round}{m.court ? ` · Court ${m.court}` : ''}{m.starts_at ? ` · ${m.starts_at}` : ''}</div>
                <div className="font-semibold">{slotLabel(m, 1)} vs {slotLabel(m, 2)}</div></div>
              <form action={deleteMatch.bind(null, m.id)}><SubmitButton pendingText="Deleting…" className="h-11 px-3 text-sm font-bold text-red-700 dark:text-red-400">Delete</SubmitButton></form>
            </div>
          ))}
        </div>
        <ActionForm action={addMatch} className={`${card} flex flex-col gap-3`}>
          <h2 className="font-bold">Add {isP ? 'playoff' : `Bracket ${bracket.name}`} match</h2>
          <input type="hidden" name="tournament_id" value={active.id} />
          <input type="hidden" name="bracket_id" value={isP ? '' : bracket.id} />
          <div className="flex gap-2">
            <label className={`${label} flex-1`}>Round<select name="round" className={input}>{rounds.map((r) => <option key={r}>{r}</option>)}</select></label>
            <label className={`${label} w-24`}>Game #<input name="game_no" type="number" required className={input} /></label>
          </div>
          <label className={label}>Team 1<select name="team1_id" className={input}>{opts}</select></label>
          <label className={label}>Team 2<select name="team2_id" className={input}>{opts}</select></label>
          {isP && (
            <div className="flex gap-2">
              <label className={`${label} flex-1`}>Team 1 comes from<input name="slot1_ref" placeholder="A1, B2, W9, L9" className={input} /></label>
              <label className={`${label} flex-1`}>Team 2 comes from<input name="slot2_ref" placeholder="A1, B2, W9, L9" className={input} /></label>
            </div>
          )}
          <div className="flex gap-2">
            <label className={`${label} flex-1`}>Court<input name="court" className={input} /></label>
            <label className={`${label} flex-1`}>Start time<input name="starts_at" placeholder="10:30" className={input} /></label>
          </div>
          {isP && <p className={`text-xs ${muted}`}>A1 is first place in Bracket A, and so on for every bracket. W9 is the winner of playoff game 9, L9 the loser. Playoff game numbers must be unique. Round-robin numbers only need to be unique within their bracket.</p>}
          <SubmitButton className={btn}>Save match</SubmitButton>
        </ActionForm>
      </div>
    </>
  )
}
