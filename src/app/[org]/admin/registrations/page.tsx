import { requireRole } from '@/lib/auth'
import { getContext } from '@/lib/data'
import { assignRegistration, setRegistrationStatus } from '@/app/actions'
import ActionForm from '@/components/ActionForm'
import SubmitButton from '@/components/SubmitButton'
import Breadcrumbs from '@/components/Breadcrumbs'
import { card, btn, btn2, input, muted } from '@/lib/ui'
import type { Registration, Team } from '@/lib/types'

export const dynamic = 'force-dynamic'

type Row = Registration & { profiles: { display_name: string | null; email: string; avatar_url: string | null } | null }

export default async function Registrations({ params }: { params: Promise<{ org: string }> }) {
  const { org: slug } = await params
  await requireRole(slug, ['admin'])
  const { sb, active } = await getContext(slug)
  const crumbs = [{ label: 'Group', href: `/${slug}` }, { label: 'Settings', href: `/${slug}/admin` }, { label: 'Registrations' }]
  if (!active) return <><Breadcrumbs items={crumbs} /><p>Create a tournament first.</p></>

  const [{ data }, { data: tm }] = await Promise.all([
    sb.from('tournament_registrations').select('*,profiles(display_name,email,avatar_url)').eq('tournament_id', active.id).neq('status', 'withdrawn').order('created_at'),
    sb.from('teams').select('*').eq('tournament_id', active.id).order('seed'),
  ])
  const rows = (data ?? []) as unknown as Row[]
  const teams = (tm ?? []) as (Team & { player1_user?: string | null; player2_user?: string | null })[]
  const seats = teams.flatMap((t) => ([1, 2] as const)
    .filter((n) => !t[`player${n}_user`])
    .map((n) => ({ value: `${t.id}:${n}`, label: `${t.name}: seat ${n}${t[`player${n}`] ? ` (${t[`player${n}`]})` : ' (empty)'}` })))

  return (
    <>
      <Breadcrumbs items={crumbs} />
      <h1 className="text-2xl font-bold md:text-3xl">Registrations</h1>
      <p className={`text-sm ${muted}`}>{active.name}. People who asked to take part. Place each person on a team seat: their account is linked, so their games and points count in their personal stats.</p>
      {rows.length === 0 && <p className={`${card} text-sm ${muted}`}>No registrations yet. People can join from the tournament page{active.registration_open ? '.' : ', but registration is switched off. Turn it on under Edit tournament.'}</p>}
      <div className="grid gap-3 lg:grid-cols-2">
        {rows.map((r) => {
          const name = r.profiles?.display_name || r.profiles?.email.split('@')[0] || 'Player'
          return (
            <article key={r.id} className={`${card} flex flex-col gap-3`}>
              <div className="flex items-center gap-3">
                <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] bg-cover bg-center font-bold text-[color:var(--on-primary)]" style={r.profiles?.avatar_url ? { backgroundImage: `url(${r.profiles.avatar_url})` } : undefined}>{r.profiles?.avatar_url ? '' : name.slice(0, 2).toUpperCase()}</span>
                <div className="min-w-0 flex-1"><div className="truncate font-semibold">{name}</div><div className={`truncate text-xs ${muted}`}>{r.profiles?.email}</div></div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${r.as_guest ? 'tint-gold' : 'tint-blue'}`}>{r.as_guest ? 'Guest' : 'Member'}</span>
              </div>
              {(r.partner_name || r.note) && <p className="text-sm">{r.partner_name && <>Partner: <b>{r.partner_name}</b>. </>}{r.note}</p>}
              <div className="flex flex-wrap items-center gap-2 text-sm"><b className="capitalize">{r.status}</b>{r.team_id && <span className={muted}>· on a team</span>}</div>
              <ActionForm action={setRegistrationStatus} keepOnSuccess className="flex flex-col gap-1">
                <input type="hidden" name="id" value={r.id} />
                <div className="flex gap-2">
                  <SubmitButton name="status" value="approved" pendingText="…" className={`${btn2} h-11 flex-1`}>Approve</SubmitButton>
                  <SubmitButton name="status" value="declined" pendingText="…" className={`${btn2} h-11 flex-1`}>Decline</SubmitButton>
                </div>
              </ActionForm>
              {!r.team_id && r.status !== 'declined' && (
                <ActionForm action={assignRegistration} keepOnSuccess className="flex flex-col gap-2">
                  <input type="hidden" name="reg_id" value={r.id} />
                  <select name="slot" aria-label={`Team seat for ${name}`} className={input} defaultValue="">
                    <option value="" disabled>Choose a team seat…</option>
                    {seats.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  <SubmitButton pendingText="Placing…" className={`${btn} h-11`}>Put on team</SubmitButton>
                </ActionForm>
              )}
            </article>
          )
        })}
      </div>
    </>
  )
}
