import Link from 'next/link'
import { getTournamentContext } from '@/lib/data'
import { getUser, roleIn } from '@/lib/auth'
import { isMemberRole } from '@/lib/roles'
import { isRentalActive } from '@/lib/billing'
import { registerForTournament, withdrawRegistration } from '@/app/actions'
import ActionForm from '@/components/ActionForm'
import SubmitButton from '@/components/SubmitButton'
import Breadcrumbs from '@/components/Breadcrumbs'
import { btn, btn2, card, input, label, muted } from '@/lib/ui'
import type { Registration } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function JoinTournament({ params }: { params: Promise<{ org: string; tid: string }> }) {
  const { org: slug, tid } = await params
  const { sb, org, tournament } = await getTournamentContext(slug, tid)
  const user = await getUser()
  const member = isMemberRole(await roleIn(org.id))
  const here = `/${slug}/t/${tid}/join`
  const { data } = user ? await sb.from('tournament_registrations').select('*').eq('tournament_id', tid).eq('user_id', user.id).maybeSingle() : { data: null }
  const reg = data as Registration | null
  const active = reg && (reg.status === 'pending' || reg.status === 'approved')
  const closed = !tournament.registration_open || !isRentalActive(org)

  const fields = (guest: boolean) => (
    <>
      <input type="hidden" name="tournament_id" value={tid} /><input type="hidden" name="as_guest" value={guest ? '1' : '0'} />
      <label className={label}>Partner (optional)<input name="partner" placeholder="Name of the player you want to team up with" className={input} /></label>
      <label className={label}>Note for the organizer (optional)<input name="note" maxLength={200} className={input} /></label>
    </>
  )

  return (
    <div className="md:mx-auto md:w-full md:max-w-xl">
      <Breadcrumbs items={[{ label: org.name, href: `/${slug}` }, { label: tournament.name, href: `/${slug}/t/${tid}` }, { label: 'Join' }]} />
      <h1 className="mt-2 text-2xl font-bold">{tournament.name}</h1>
      <p className={`text-sm ${muted}`}>{tournament.date ?? 'Date to be announced'} · {org.name}</p>
      {tournament.description && <p className="mt-2 text-sm">{tournament.description}</p>}

      <div className="mt-4 flex flex-col gap-3">
        {!user && (
          <section className={`${card} flex flex-col gap-2`}>
            <p className="text-sm">Sign in to take part. It only takes a moment, and you can use Facebook.</p>
            <Link href={`/login?next=${encodeURIComponent(here)}`} className={btn}>Sign in to continue</Link>
          </section>
        )}

        {user && active && (
          <section className={`${card} flex flex-col gap-2`} role="status">
            <h2 className="font-bold">You are registered</h2>
            <p className="text-sm">{reg.status === 'approved' ? 'The organizer approved your spot.' : 'Waiting for the organizer to confirm your spot and place you on a team.'}{reg.as_guest ? ' You joined as a guest.' : ''}</p>
            {reg.partner_name && <p className={`text-sm ${muted}`}>Partner: {reg.partner_name}</p>}
            <form action={withdrawRegistration.bind(null, tid)}><SubmitButton pendingText="Withdrawing…" className={btn2}>Withdraw my registration</SubmitButton></form>
          </section>
        )}

        {user && !active && closed && <p className={`${card} text-sm`} role="status">Registration is closed for this tournament.</p>}

        {user && !active && !closed && member && (
          <ActionForm action={registerForTournament} className={`${card} flex flex-col gap-3`}>
            <h2 className="font-bold">Participate</h2>
            <p className={`text-sm ${muted}`}>You are a member of {org.name}. Register, and the organizer will place you on a team.</p>
            {fields(false)}
            <SubmitButton pendingText="Registering…" className={btn}>Participate</SubmitButton>
          </ActionForm>
        )}

        {user && !active && !closed && !member && (
          <>
            <ActionForm action={registerForTournament} className={`${card} flex flex-col gap-3`}>
              <h2 className="font-bold">Join as a guest</h2>
              <p className={`text-sm ${muted}`}>Take part in this tournament without joining the group.</p>
              {fields(true)}
              <SubmitButton pendingText="Registering…" className={btn}>Join as guest</SubmitButton>
            </ActionForm>
            <section className={`${card} flex flex-col gap-2`}>
              <h2 className="font-bold">Or join the group</h2>
              <p className={`text-sm ${muted}`}>Members can take part in every tournament of {org.name} and see their stats in the group.</p>
              <Link href={`/${slug}/join?next=${encodeURIComponent(here)}`} className={btn2}>Join {org.name}, then participate</Link>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
