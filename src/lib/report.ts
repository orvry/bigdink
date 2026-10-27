import { Doc, M, INK, MUTED, ACCENT } from './pdf'
import type { Match, PlayerStat } from './types'
import type { Row } from './standings'

export type ReportData = {
  orgName: string
  tournament: { name: string; date?: string | null; points_to_win: number; win_by: number }
  brackets: { name: string; rows: Row[]; games: Match[]; mvps: PlayerStat[] }[]
  playoffs: Match[]
  mvps: PlayerStat[] // overall ranking by points won
  generatedAt: string
}

const name = (m: Match, n: 1 | 2) => (n === 1 ? m.team1?.name : m.team2?.name) ?? 'TBD'
const finalScore = (m: Match) => (m.status === 'final' ? `${m.score1} - ${m.score2}` : m.status === 'scheduled' ? 'not played' : `${m.score1} - ${m.score2} (${m.status})`)

function gameRows(d: Doc, games: Match[], withRound: boolean) {
  if (!games.length) { d.text('No games yet.', M, { color: MUTED }); d.gap(16); return }
  const cols = withRound ? { g: M, r: M + 30, a: M + 100, s: M + 262, b: M + 318, c: M + 450 } : { g: M, r: M, a: M + 40, s: M + 202, b: M + 258, c: M + 440 }
  const head = () => {
    d.text('Game', cols.g, { size: 8, bold: true, color: MUTED })
    if (withRound) d.text('Round', cols.r, { size: 8, bold: true, color: MUTED })
    d.text('Team 1', cols.a, { size: 8, bold: true, color: MUTED }); d.text('Score', cols.s, { size: 8, bold: true, color: MUTED })
    d.text('Team 2', cols.b, { size: 8, bold: true, color: MUTED }); d.text('Court', cols.c, { size: 8, bold: true, color: MUTED })
    d.gap(14); d.rule(); d.gap(4)
  }
  d.ensure(40); head()
  for (const m of games) {
    if (d.y - 18 < M + 20) { d.newPage(); head() }
    const w1 = m.status === 'final' && m.winner_id === m.team1_id, w2 = m.status === 'final' && m.winner_id === m.team2_id
    d.text(m.game_no, cols.g)
    if (withRound) d.text(m.round, cols.r, { maxW: 66, size: 9 })
    d.text(name(m, 1), cols.a, { bold: w1, maxW: withRound ? 156 : 150 })
    d.text(finalScore(m), cols.s, { maxW: 54, size: 9 })
    d.text(name(m, 2), cols.b, { bold: w2, maxW: withRound ? 126 : 120 })
    d.text(m.court ?? '', cols.c, { maxW: 50 })
    d.gap(17)
  }
}

export async function buildReport(r: ReportData): Promise<Uint8Array> {
  const d = await Doc.create()
  const t = r.tournament
  const all = [...r.brackets.flatMap((b) => b.games), ...r.playoffs]
  const played = all.filter((m) => m.status === 'final').length

  d.text(t.name, M, { size: 24, bold: true }); d.gap(32)
  d.text(`${r.orgName} - tournament report${t.date ? ` - ${t.date}` : ''}`, M, { color: MUTED }); d.gap(14)
  d.text(`Games to ${t.points_to_win}, win by ${t.win_by}. ${played} of ${all.length} games played. Generated ${r.generatedAt}.`, M, { color: MUTED, size: 9 }); d.gap(10)
  d.rule()

  const fin = r.playoffs.find((m) => m.round === 'Final' && m.status === 'final')
  const third = r.playoffs.find((m) => m.round === '3rd place' && m.status === 'final')
  d.heading('Final result')
  if (fin) {
    const champ = fin.winner_id === fin.team1_id ? fin.team1 : fin.team2
    const runner = fin.winner_id === fin.team1_id ? fin.team2 : fin.team1
    d.text('Champions', M, { size: 9, color: MUTED }); d.gap(13); d.text(champ?.name, M, { size: 20, bold: true }); d.gap(26)
    const names = [champ?.player1, champ?.player2].filter(Boolean).join(' & ')
    if (names) { d.text(names, M, { color: MUTED }); d.gap(15) }
    d.text(`Runner-up: ${runner?.name ?? 'TBD'}`, M); d.gap(15)
    if (third) { const tw = third.winner_id === third.team1_id ? third.team1 : third.team2; d.text(`Third place: ${tw?.name}`, M); d.gap(15) }
  } else { d.text('The final has not been played yet.', M, { color: MUTED }); d.gap(16) }

  d.heading(fin ? 'Most valuable players' : 'Most valuable players (so far)')
  if (r.mvps.length) {
    const top = r.mvps[0].points
    d.text('#', M, { size: 8, bold: true, color: MUTED }); d.text('Player', M + 22, { size: 8, bold: true, color: MUTED })
    d.text('Team', M + 200, { size: 8, bold: true, color: MUTED }); d.text('Points won', M + 400, { size: 8, bold: true, color: MUTED, right: 99 })
    d.gap(14); d.rule(); d.gap(4)
    r.mvps.slice(0, 5).forEach((p, i) => {
      d.ensure(20)
      d.text(i + 1, M, { bold: true }); d.text(p.player + (p.points === top ? '  (MVP)' : ''), M + 22, { bold: p.points === top, maxW: 172 })
      d.text(p.team, M + 200, { maxW: 190, color: MUTED }); d.text(p.points, M + 400, { right: 99 })
      d.gap(17)
    })
    d.text('MVP is the player who won the most points, from the player taps scorers record. Ties share the title.', M, { size: 7.5, color: MUTED }); d.gap(12)
  } else { d.text('No player points recorded.', M, { color: MUTED }); d.gap(16) }

  for (const b of r.brackets) {
    d.heading(`Bracket ${b.name} standings`)
    d.ensure(60)
    const c = { n: M, team: M + 22, pl: M + 170, w: M + 356, l: M + 384, pf: M + 412, df: M + 450 }
    const head = () => {
      for (const [k, x] of [['#', c.n], ['Team', c.team], ['Players', c.pl], ['W', c.w], ['L', c.l], ['PF', c.pf], ['+/-', c.df]] as [string, number][]) d.text(k, x, { size: 8, bold: true, color: MUTED })
      d.gap(14); d.rule(); d.gap(4)
    }
    head()
    b.rows.forEach((row, i) => {
      if (d.y - 22 < M + 20) { d.newPage(); head() }
      d.text(i + 1, c.n, { bold: true })
      d.text(row.team.name, c.team, { bold: true, maxW: 144 })
      d.text([row.team.player1, row.team.player2].filter(Boolean).join(', '), c.pl, { maxW: 176, size: 9, color: MUTED })
      d.text(row.w, c.w); d.text(row.l, c.l); d.text(row.pf, c.pf); d.text(row.diff > 0 ? `+${row.diff}` : row.diff, c.df)
      d.gap(12)
      const note = [i < 2 ? 'Advances to semifinals' : '', row.via === 'h2h' ? 'won head-to-head' : row.via === 'points' ? 'tiebreak: total points' : ''].filter(Boolean).join(', ')
      if (note) d.text(note, c.team, { size: 7.5, color: i < 2 ? ACCENT : MUTED })
      d.gap(note ? 12 : 6)
    })
    d.gap(4)
    d.ensure(40)
    d.text('W = wins.  L = losses.  PF = points for (total points scored).  +/- = points scored minus points allowed.', M, { size: 7.5, color: MUTED }); d.gap(11)
    d.text('Ranking: most wins; two-way tie goes to the head-to-head winner; three or more tied go by total round-robin points (PF).', M, { size: 7.5, color: MUTED }); d.gap(11)
    if (b.mvps.length) { d.text(`Bracket ${b.name} MVP: ${b.mvps.map((p) => `${p.player} (${p.team})`).join(', ')} - ${b.mvps[0].points} points`, M, { size: 8.5, bold: true, color: INK }); d.gap(14) } else d.gap(6)
    d.heading(`Bracket ${b.name} round-robin results`)
    gameRows(d, b.games, false)
  }

  d.heading('Playoffs')
  gameRows(d, r.playoffs, true)
  d.footers()
  return d.pdf.save()
}
