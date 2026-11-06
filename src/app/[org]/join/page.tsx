import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getOrg, getUser, roleIn } from '@/lib/auth'
import { isRentalActive } from '@/lib/billing'
import { joinGroup } from '@/app/actions'
import { safeNext } from '@/lib/nav'
import ActionForm from '@/components/ActionForm'
import SubmitButton from '@/components/SubmitButton'
import Breadcrumbs from '@/components/Breadcrumbs'
import { btn, card, muted } from '@/lib/ui'

export const dynamic = 'force-dynamic'

export default async function JoinGroup({ params, searchParams }: { params: Promise<{ org: string }>; searchParams: Promise<{ code?: string; next?: string }> }) {
  const { org: slug } = await params
  const { code, next } = await searchParams
  const org = await getOrg(slug)
  const user = await getUser()
  if ((await roleIn(org.id)) !== 'viewer') redirect(safeNext(next) === '/' ? `/${slug}` : safeNext(next))
  const here = `/${slug}/join${code ? `?code=${encodeURIComponent(code)}` : ''}`
  const open = org.visibility === 'public' && org.join_policy === 'open'
  return (
    <div className="md:mx-auto md:w-full md:max-w-md">
      <Breadcrumbs items={[{ label: org.name, href: `/${slug}` }, { label: 'Join' }]} />
      <h1 className="mt-2 text-2xl font-bold">Join {org.name}</h1>
      <div className={`${card} mt-3 flex flex-col gap-3`}>
        <p className="text-sm">Members can take part in the group’s tournaments, see its private tournaments, and have their games counted in their personal stats.</p>
        {!isRentalActive(org) && <p role="alert" className="text-sm font-semibold text-[color:var(--danger)]">This group’s rental has ended, so new members can’t join right now.</p>}
        {!open && !code && <p className={`text-sm ${muted}`}>This group is invite only. Ask a member for an invite link.</p>}
        {!user
          ? <Link href={`/login?next=${encodeURIComponent(here)}`} className={btn}>Sign in to join</Link>
          : (open || code) && (
            <ActionForm action={joinGroup} keepOnSuccess className="flex flex-col gap-2">
              <input type="hidden" name="org_id" value={org.id} /><input type="hidden" name="code" value={code ?? ''} /><input type="hidden" name="next" value={safeNext(next) === '/' ? `/${slug}` : safeNext(next)} />
              <SubmitButton pendingText="Joining…" className={btn}>Join group</SubmitButton>
            </ActionForm>
          )}
      </div>
    </div>
  )
}
