import Link from 'next/link'
import { ArrowRight, CalendarClock, ChevronRight, ClipboardCheck, FileDown, Monitor, Network, Plus, Trophy, UserRound, Users, Wallet, Check } from 'lucide-react'
import { getTournamentContext, MATCH_SELECT, slotLabel } from '@/lib/data'
import { roleIn } from '@/lib/auth'
import { isRentalActive } from '@/lib/billing'
import { computeStandings } from '@/lib/standings'
import { computeMvps, getChampion } from '@/lib/stats'
import ChampionBanner from '@/components/ChampionBanner'
import MvpPanel from '@/components/MvpPanel'
import StatusChip from '@/components/StatusChip'
import { CardHeader, Donut, HeroBanner, IconTile, StatCard, TeamDot } from '@/components/ui-kit'
import { btn, btn2, card, muted, num } from '@/lib/ui'
import type { Match, Team } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function Dashboard({ params }: { params: Promise<{ org: string; tid: string }> }) {
  const { org: slug, tid } = await params
  const { sb, org, tournament, brackets } = await getTournamentContext(slug, tid)
  const base = `/${slug}/t/${tid}`
  const role = await roleIn(org.id)
  const rentalActive = isRentalActive(org)
  const canScore = rentalActive && role !== 'viewer'
  const canManage = rentalActive && role === 'admin'

  const [{ data }, { data: tm }, { data: pts }] = await Promise.all([
    sb.from('matches').select(MATCH_SELECT).eq('tournament_id', tid).order('game_no'),
    sb.from('teams').select('*').eq('tournament_id', tid),
    sb.from('player_points').select('team_id,player,points').eq('tournament_id', tid),
  ])
  const matches = (data ?? []) as Match[]
  const teams = (tm ?? []) as Team[]
  const champion = getChampion(matches.filter((m) => m.bracket_id === null))
  const mvps = computeMvps(pts ?? [], teams)

  const total = matches.length
  const completed = matches.filter((m) => m.status === 'final')
  const live = matches.filter((m) => m.status === 'live' || m.status === 'paused')
  const ready = matches.filter((m) => m.status === 'scheduled' && m.team1_id && m.team2_id)
  const waiting = matches.filter((m) => m.status === 'scheduled' && !(m.team1_id && m.team2_id))
  const pct = total ? Math.round((completed.length / total) * 100) : 0
  const players = teams.reduce((n, t) => n + [t.player1, t.player2].filter(Boolean).length, 0)
  const next = ready[0]
  const status = champion ? 'Completed' : live.length || completed.length ? 'In progress' : 'Not started'

  const topTeams = brackets
    .flatMap((b) => computeStandings(teams.filter((t) => t.bracket_id === b.id), matches.filter((m) => m.bracket_id === b.id && m.round === 'Round robin')))
    .sort((a, b) => b.w - a.w || b.pf - a.pf)
    .slice(0, 4)
  const recent = [...completed].sort((a, b) => b.game_no - a.game_no).slice(0, 5)

  const actions = canManage
    ? [
        { icon: <Plus size={20} />, tint: 'blue' as const, title: 'Add Match', desc: 'Create a new match', href: `/${slug}/admin/matches` },
        { icon: <Network size={20} />, tint: 'coral' as const, title: 'Manage Brackets', desc: 'Add or edit brackets', href: `/${slug}/admin` },
        { icon: <Users size={20} />, tint: 'teal' as const, title: 'Register Teams', desc: 'Add teams and players', href: `/${slug}/admin/teams` },
        { icon: <Wallet size={20} />, tint: 'gold' as const, title: 'Record Expenses', desc: 'Track costs per player', href: `/${slug}/admin/expenses` },
      ]
    : [
        { icon: <Network size={20} />, tint: 'blue' as const, title: 'View Brackets', desc: 'Rounds and playoffs', href: `${base}/bracket` },
        { icon: <Trophy size={20} />, tint: 'coral' as const, title: 'Standings', desc: 'Who is advancing', href: `${base}/standings` },
        { icon: <Monitor size={20} />, tint: 'teal' as const, title: 'Big Screen', desc: 'Scores for a TV or projector', href: `${base}/screen` },
        { icon: <FileDown size={20} />, tint: 'gold' as const, title: 'PDF Report', desc: 'Download the results', href: `${base}/report` },
      ]

  const rank = ['bg-[var(--gold)] text-[#172033]', 'bg-[var(--chip)]', 'tint-coral', 'bg-[var(--chip)]']

  return (
    <>
      <HeroBanner
        eyebrow="Tournament overview" title={tournament.name}
        meta={`${teams.length} teams · ${brackets.length} bracket${brackets.length === 1 ? '' : 's'} · ${tournament.date ?? 'Date to be announced'}`}
        status={<span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--teal)] px-3 py-1.5 text-xs font-bold text-[#06231F]"><Check size={14} aria-hidden="true" />{status}</span>}
      />
      {champion && <ChampionBanner c={champion} />}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard tint="blue" icon={<Users size={22} />} label="Registered teams" value={teams.length} sub={`in ${brackets.length} bracket${brackets.length === 1 ? '' : 's'}`} />
        <StatCard tint="teal" icon={<ClipboardCheck size={22} />} label="Matches played" value={<>{completed.length} / {total}</>} progress={pct} />
        <StatCard tint="coral" icon={<CalendarClock size={22} />} label="Upcoming matches" value={ready.length} sub={next ? `Next: Game ${next.game_no}${next.court ? ` · Court ${next.court}` : ''}${next.starts_at ? ` · ${next.starts_at}` : ''}` : 'Nothing scheduled'} />
        <StatCard tint="gold" icon={<UserRound size={22} />} label="Total players" value={players} sub={`across ${teams.length} teams`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className={`${card} lg:col-span-2`} aria-label="Live matches">
          <CardHeader title="Live Matches" badge={`${live.length} active`} action={<Link href={`${base}/screen`} className="flex items-center gap-1 text-sm font-semibold text-[color:var(--link)]">View all <ArrowRight size={14} aria-hidden="true" /></Link>} />
          {live.length === 0 && <p className={`rounded-xl bg-[var(--chip)] p-4 text-sm ${muted}`}>No game is being played right now. {next ? 'The next game is ready to start.' : ''}</p>}
          <div className="flex flex-col gap-3">
            {live.slice(0, 4).map((m) => (
              <div key={m.id} className="grid gap-3 rounded-2xl border border-[color:var(--line)] p-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="tint-blue rounded-full px-3 py-1 text-xs font-bold">{m.court ? `Court ${m.court}` : `Game ${m.game_no}`}</span>
                    <StatusChip status={m.status} />
                  </div>
                  {([1, 2] as const).map((n) => {
                    const t = n === 1 ? m.team1 : m.team2
                    return (
                      <div key={n} className="flex items-center gap-2">
                        {t ? <TeamDot id={t.id} /> : <span className="h-3.5 w-3.5" />}
                        <span className="flex-1 font-semibold">{slotLabel(m, n)}{t?.seed ? <span className={`ml-2 text-xs font-normal ${muted}`}>Seed #{t.seed}</span> : null}</span>
                        <span className={`${num} text-2xl`}>{n === 1 ? m.score1 : m.score2}</span>
                      </div>
                    )
                  })}
                </div>
                <div className="flex items-center gap-2">
                  {canScore
                    ? <Link href={`/${slug}/scorer/${m.id}`} className={`${btn} flex-1 sm:flex-none`}>Update Score</Link>
                    : <Link href={`${base}/live/${m.id}`} className={`${btn2} flex-1 sm:flex-none`}>Watch live</Link>}
                  <ChevronRight aria-hidden="true" size={18} className={`hidden sm:block ${muted}`} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={card} aria-label="Quick actions">
          <CardHeader title="Quick Actions" />
          <ul className="flex flex-col gap-1">
            {actions.map((a) => (
              <li key={a.title}>
                <Link href={a.href} className="flex min-h-14 items-center gap-3 rounded-xl p-2 hover:bg-[var(--chip)]">
                  <IconTile tint={a.tint}>{a.icon}</IconTile>
                  <span className="flex-1"><span className="block text-sm font-semibold">{a.title}</span><span className={`block text-xs ${muted}`}>{a.desc}</span></span>
                  <ChevronRight aria-hidden="true" size={16} className={muted} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className={card} aria-label="Tournament progress">
          <CardHeader title="Tournament Progress" />
          <Donut centerTop={`${pct}%`} centerBottom="Matches completed" segments={[
            { label: 'Completed', value: completed.length, color: 'var(--teal)' },
            { label: 'Live', value: live.length, color: 'var(--primary)' },
            { label: 'Upcoming', value: ready.length, color: 'var(--gold)' },
            { label: 'Waiting for teams', value: waiting.length, color: 'var(--line2)' },
          ]} />
        </section>

        <section className={card} aria-label="Top teams">
          <CardHeader title="Top Teams" action={<Link href={`${base}/standings`} className="flex items-center gap-1 text-sm font-semibold text-[color:var(--link)]">View all <ArrowRight size={14} aria-hidden="true" /></Link>} />
          {topTeams.length === 0 && <p className={`text-sm ${muted}`}>Standings appear after the first finished game.</p>}
          <ol className="flex flex-col gap-2">
            {topTeams.map((r, i) => (
              <li key={r.team.id} className="flex items-center gap-3 text-sm">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${rank[i]}`} aria-label={`Rank ${i + 1}`}>{i + 1}</span>
                <TeamDot id={r.team.id} /><span className="flex-1 font-semibold">{r.team.name}</span>
                <span className={`tabular ${muted}`}>{r.w} {r.w === 1 ? 'win' : 'wins'}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className={card} aria-label="Recent activity">
          <CardHeader title="Recent Activity" />
          {recent.length === 0 && <p className={`text-sm ${muted}`}>No finished games yet.</p>}
          <ul className="flex flex-col gap-3">
            {recent.map((m) => (
              <li key={m.id} className="flex items-center gap-3">
                <IconTile tint="teal" size={36}><Check size={18} /></IconTile>
                <Link href={`${base}/live/${m.id}`} className="min-w-0 flex-1 text-sm">
                  <span className="block truncate font-semibold">{slotLabel(m, 1)} vs {slotLabel(m, 2)}</span>
                  <span className={`block text-xs ${muted}`}>Completed {m.score1}–{m.score2}{m.court ? ` · Court ${m.court}` : ''}</span>
                </Link>
                <span className={`text-xs ${muted}`}>Game {m.game_no}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-1"><MvpPanel title={champion ? 'Tournament MVP' : 'MVP race'} stats={mvps} /></div>
        <section className="tint-blue flex flex-wrap items-center gap-4 rounded-2xl p-5 lg:col-span-2" aria-label="Next step">
          <Trophy aria-hidden="true" size={56} />
          <div className="min-w-48 flex-1 text-[color:var(--ink)]">
            <h2 className="text-lg font-bold">{champion ? 'The tournament is complete' : 'Ready for the next match?'}</h2>
            <p className="text-sm text-[color:var(--muted)]">{champion ? 'Download the full results as a PDF.' : canScore ? 'Keep the tournament on track by updating scores and match results.' : 'Follow every game, score and standing as it happens.'}</p>
          </div>
          {champion
            ? <a href={`${base}/report`} download className={btn}>Download report <ArrowRight aria-hidden="true" size={16} /></a>
            : <Link href={canScore ? `/${slug}/scorer` : `${base}/bracket`} className={btn}>{canScore ? 'Go to Matches' : 'View bracket'} <ArrowRight aria-hidden="true" size={16} /></Link>}
        </section>
      </div>
    </>
  )
}
