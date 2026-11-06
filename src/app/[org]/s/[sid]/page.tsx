import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTournamentContext, MATCH_SELECT, slotLabel } from '@/lib/data'
import { getUser, roleIn } from '@/lib/auth'
import { isRentalActive } from '@/lib/billing'
import { addSessionGame, finishSession, setSessionVisibility } from '@/app/actions'
import ActionForm from '@/components/ActionForm'
import SubmitButton from '@/components/SubmitButton'
import ShareButton from '@/components/ShareButton'
import StatusChip from '@/components/StatusChip'
import Breadcrumbs from '@/components/Breadcrumbs'
import { btn, btn2, card, input, label, muted, num } from '@/lib/ui'
import type { Match } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function SessionPage({ params }: { params: Promise<{ org: string; sid: string }> }) {
  const { org: slug, sid } = await params
  const { sb, org, tournament: t } = await getTournamentContext(slug, sid)
  if (t.kind !== 'session') redirect(`/${slug}/t/${sid}`)
  const user = await getUser()
  const role = await roleIn(org.id)
  const active = isRentalActive(org)
  const owner = !!user && t.created_by === user.id
  const canEdit = active && (owner || role === 'admin')
  const canScore = active && (owner || role === 'admin' || role === 'scorer')
  const open = t.status !== 'finished'

  const [{ data }, { data: pts }, { data: mem }] = await Promise.all([
    sb.from('matches').select(MATCH_SELECT).eq('tournament_id', sid).order('game_no'),
    sb.from('player_points').select('team_id,player,points').eq('tournament_id', sid),
    canEdit ? sb.rpc('group_members', { p_org: org.id }) : Promise.resolve({ data: [] as never[] }),
  ])
  const games = (data ?? []) as Match[]
  const members = ((mem ?? []) as unknown as { user_id: string; name: string }[])
  const base = `/${slug}/t/${sid}`

  // tally per player name: games won and points won
  const tally = new Map<string, { won: number; played: number; points: number }>()
  const row = (name: string) => { if (!tally.has(name)) tally.set(name, { won: 0, played: 0, points: 0 }); return tally.get(name)! }
  for (const m of games.filter((g) => g.status === 'final')) {
    for (const [team, id] of [[m.team1, m.team1_id], [m.team2, m.team2_id]] as const) {
      for (const nm of [team?.player1, team?.player2].filter((x): x is string => Boolean(x))) { const r = row(nm); r.played++; if (m.winner_id === id) r.won++ }
    }
  }
  const teamsById = new Map(games.flatMap((g) => [g.team1, g.team2]).filter((x): x is NonNullable<typeof x> => Boolean(x)).map((tm) => [tm.id, tm]))
  for (const p of pts ?? []) { if (teamsById.has(p.team_id as string)) row(p.player as string).points += p.points as number }
  const rows = [...tally.entries()].sort((a, b) => b[1].won - a[1].won || b[1].points - a[1].points)

  const pick = (name: string, text: string) => (
    <label className={label}>{text}
      <select name={name} defaultValue="" className={input}><option value="">Typed name only</option>{members.map((x) => <option key={x.user_id} value={`${x.user_id}::${x.name}`}>{x.name}</option>)}</select>
    </label>
  )
  const side = (n: 1 | 2) => (
    <fieldset className="flex flex-col gap-2 rounded-xl border border-[color:var(--line)] p-3">
      <legend className="px-1 text-sm font-semibold text-[color:var(--muted)]">Side {n}</legend>
      {([1, 2] as const).map((i) => (
        <div key={i} className="grid gap-2 sm:grid-cols-2">
          <label className={label}>Player {i}{i === 2 ? ' (optional)' : ''}<input name={`s${n}p${i}`} placeholder="Name" className={input} /></label>
          {pick(`s${n}u${i}`, 'or pick a member')}
        </div>
      ))}
    </fieldset>
  )

  return (
    <>
      <Breadcrumbs items={[{ label: org.name, href: `/${slug}` }, { label: 'Casual game' }]} />
      <header className={`${card} flex flex-wrap items-center gap-3`}>
        <div className="min-w-48 flex-1">
          <h1 className="text-2xl font-bold">{t.name}</h1>
          <p className={`text-sm ${muted}`}>{t.session_format === 'single' ? 'One game' : 'Session'} · to {t.points_to_win}, win by {t.win_by} · {t.visibility === 'public' ? 'Public' : 'Private'} · {t.date ?? ''}{open ? '' : ' · Finished'}</p>
        </div>
        <div className="w-full sm:w-64"><ShareButton path={`/${slug}/s/${sid}`} title={t.name} /></div>
      </header>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section aria-label="Games" className="flex min-w-0 flex-col gap-3">
          <h2 className="text-lg font-bold">Games</h2>
          {games.length === 0 && <p className={`${card} text-sm ${muted}`}>No games yet. {canEdit ? 'Add the first game below.' : ''}</p>}
          {games.map((m) => (
            <article key={m.id} className={`${card} flex flex-wrap items-center gap-3`}>
              <div className="min-w-48 flex-1">
                <div className={`text-xs ${muted}`}>Game {m.game_no}{m.court ? ` · Court ${m.court}` : ''}</div>
                <div className="font-semibold">{slotLabel(m, 1)}</div>
                <div className="font-semibold">{slotLabel(m, 2)}</div>
              </div>
              <div className={`${num} text-3xl`}>{m.status === 'scheduled' ? '–' : `${m.score1}–${m.score2}`}</div>
              <StatusChip status={m.status} ready />
              {canScore && m.status !== 'final' && <Link href={`/${slug}/scorer/${m.id}`} className={btn}>Score</Link>}
              <Link href={`${base}/live/${m.id}`} className={btn2}>Watch live</Link>
            </article>
          ))}

          {canEdit && open && (t.session_format === 'session' || games.length === 0) && (
            <ActionForm action={addSessionGame} className={`${card} flex flex-col gap-3`}>
              <h2 className="font-bold">Add a game</h2>
              <input type="hidden" name="session_id" value={sid} />
              {side(1)}{side(2)}
              <label className={label}>Court (optional)<input name="court" className={input} /></label>
              <SubmitButton pendingText="Adding…" className={btn}>Add game</SubmitButton>
              <p className={`text-xs ${muted}`}>Picked members have their games and points counted in their personal stats. Typed names are just names.</p>
            </ActionForm>
          )}
        </section>

        <aside className="flex flex-col gap-3">
          {rows.length > 0 && (
            <section className={card} aria-label="Tally">
              <h2 className="mb-2 text-lg font-bold">Tally</h2>
              <table className="w-full text-left text-sm">
                <thead className={`text-xs ${muted}`}><tr><th className="py-1 font-semibold">Player</th><th className="font-semibold">Won</th><th className="font-semibold">Played</th><th className="font-semibold">Pts</th></tr></thead>
                <tbody>{rows.map(([name, r]) => <tr key={name} className="border-t border-[color:var(--line)]"><td className="py-1.5 font-semibold">{name}</td><td className="tabular">{r.won}</td><td className="tabular">{r.played}</td><td className="tabular">{r.points}</td></tr>)}</tbody>
              </table>
            </section>
          )}
          {canEdit && (
            <ActionForm action={setSessionVisibility} keepOnSuccess className={`${card} flex flex-col gap-2`}>
              <h2 className="font-bold">Who can see it</h2>
              <input type="hidden" name="session_id" value={sid} />
              <select name="visibility" defaultValue={t.visibility} aria-label="Visibility" className={input}><option value="private">Private: members only</option><option value="public">Public: anyone, and in the feed</option></select>
              <SubmitButton pendingText="Saving…" className={`${btn2} h-11`}>Save</SubmitButton>
            </ActionForm>
          )}
          {canEdit && open && games.length > 0 && games.every((g) => g.status === 'final') && (
            <form action={finishSession.bind(null, sid)}><SubmitButton pendingText="Finishing…" className={`${btn2} w-full`}>Finish this session</SubmitButton></form>
          )}
        </aside>
      </div>
    </>
  )
}
