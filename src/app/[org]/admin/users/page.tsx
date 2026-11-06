import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { addMember, setMemberRole } from '@/app/actions'
import ActionForm from '@/components/ActionForm'
import SubmitButton from '@/components/SubmitButton'
import Breadcrumbs from '@/components/Breadcrumbs'
import { card, btn, input, label, muted } from '@/lib/ui'

export const dynamic = 'force-dynamic'

type Member = { user_id: string; role: string; profiles: { email: string } | null }

export default async function Members({ params }: { params: Promise<{ org: string }> }) {
  const { org: slug } = await params
  const { org, user } = await requireRole(slug, ['admin'])
  const sb = await createClient()
  const { data } = await sb.from('memberships').select('user_id,role,profiles(email)').eq('org_id', org.id)
  const members = ((data ?? []) as unknown as Member[]).sort((a, b) => (a.profiles?.email ?? '').localeCompare(b.profiles?.email ?? ''))
  const pill = (on: boolean) => `h-11 flex-1 rounded-lg text-sm font-semibold ${on ? 'bg-[var(--primary)] text-[color:var(--on-primary)]' : 'border border-[color:var(--line2)]'}`
  return (
    <>
      <Breadcrumbs items={[{ label: 'Group', href: `/${slug}` }, { label: 'Admin', href: `/${slug}/admin` }, { label: 'Members' }]} />
      <h1 className="text-2xl font-bold md:text-3xl">Members and roles</h1>
      <p className={`text-sm ${muted}`}>Roles are per group. Admins manage everything, scorers score games, members can take part in tournaments, and everyone else can only watch. Admins can change anyone else’s role or remove them.</p>
      <div className="grid items-start gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          {members.map((m) => (
            <div key={m.user_id} className="rounded-xl bg-[var(--card)] p-3.5">
              <div className="mb-2 font-semibold">{m.profiles?.email ?? 'Unknown'}{m.user_id === user.id ? ' (you)' : ''}</div>
              {m.user_id === user.id ? <span className={`text-sm ${muted}`}>{m.role === 'admin' ? 'Admin' : m.role === 'scorer' ? 'Scorer' : 'Member'}. You can’t change your own role.</span> : (
                <ActionForm action={setMemberRole} keepOnSuccess className="flex flex-col gap-1.5">
                  <input type="hidden" name="org_id" value={org.id} /><input type="hidden" name="user_id" value={m.user_id} />
                  <div className="flex gap-1.5">
                    <SubmitButton name="role" value="admin" pendingText="…" className={pill(m.role === 'admin')}>Admin</SubmitButton>
                    <SubmitButton name="role" value="scorer" pendingText="…" className={pill(m.role === 'scorer')}>Scorer</SubmitButton>
                    <SubmitButton name="role" value="member" pendingText="…" className={pill(m.role === 'member')}>Member</SubmitButton>
                    <SubmitButton name="role" value="remove" pendingText="…" className="h-11 flex-1 rounded-lg border border-[color:var(--line2)] text-sm font-semibold text-red-700 dark:text-red-400">Remove</SubmitButton>
                  </div>
                </ActionForm>
              )}
            </div>
          ))}
        </div>
        <ActionForm action={addMember} className={`${card} flex flex-col gap-3`}>
          <h2 className="font-bold">Add a member</h2>
          <input type="hidden" name="org_id" value={org.id} />
          <label className={label}>Email they signed up with<input name="email" type="email" required className={input} /></label>
          <label className={label}>Role<select name="role" className={input}><option value="member">Member</option><option value="scorer">Scorer</option><option value="admin">Admin</option></select></label>
          <SubmitButton pendingText="Adding…" className={btn}>Add member</SubmitButton>
          <p className={`text-xs ${muted}`}>They need to create an account on the sign-in page first.</p>
        </ActionForm>
      </div>
    </>
  )
}
