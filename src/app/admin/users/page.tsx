import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { setRole } from '@/app/actions'
import Breadcrumbs from '@/components/Breadcrumbs'
import { muted } from '@/lib/ui'

export const dynamic = 'force-dynamic'

export default async function Users() {
  const me = await requireRole(['admin'])
  const sb = await createClient()
  const { data } = await sb.from('profiles').select('*').order('email')
  return (
    <>
      <Breadcrumbs items={[{ label: 'Summary', href: '/' }, { label: 'Admin', href: '/admin' }, { label: 'Users' }]} />
      <h1 className="text-2xl font-bold md:text-3xl">Users and roles</h1>
      <p className={`text-sm ${muted}`}>Admins edit tournaments. Scorers score games. Viewers watch. People create an account on the sign-in page, then appear here.</p>
      <div className="grid gap-2 md:grid-cols-2">
        {(data ?? []).map((u) => (
          <div key={u.id} className="rounded-xl bg-[var(--card)] p-3.5">
            <div className="mb-2 font-semibold">{u.email}{u.id === me.id ? ' (you)' : ''}</div>
            {u.id === me.id ? <span className={`text-sm ${muted}`}>Admin. You can’t change your own role.</span> : (
              <form action={setRole} className="flex gap-1.5">
                <input type="hidden" name="id" value={u.id} />
                {(['admin', 'scorer', 'viewer'] as const).map((r) => (
                  <button key={r} name="role" value={r} className={`h-11 flex-1 rounded-lg text-sm font-semibold capitalize ${u.role === r ? 'bg-[#1F7A4D] text-white' : 'border border-[color:var(--line2)]'}`}>{r}</button>
                ))}
              </form>
            )}
          </div>
        ))}
      </div>
    </>
  )
}
