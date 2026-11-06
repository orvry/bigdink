import Link from 'next/link'
import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { deleteAccount, updateProfile } from '@/app/actions'
import ActionForm from '@/components/ActionForm'
import SubmitButton from '@/components/SubmitButton'
import Breadcrumbs from '@/components/Breadcrumbs'
import { btn, card, input, label, muted } from '@/lib/ui'

export const dynamic = 'force-dynamic'

export default async function ProfileSettings() {
  const user = await requireUser()
  const sb = await createClient()
  const { data: p } = await sb.from('profiles').select('display_name,handle,bio,city,stats_visibility,avatar_url').eq('id', user.id).maybeSingle()
  return (
    <div className="flex flex-col gap-4 md:mx-auto md:w-full md:max-w-2xl">
      <Breadcrumbs items={[{ label: 'All tournaments', href: '/' }, { label: 'Profile settings' }]} />
      <h1 className="text-2xl font-bold md:text-3xl">Profile settings</h1>

      <ActionForm action={updateProfile} keepOnSuccess className={`${card} flex flex-col gap-4`}>
        <div className="flex items-center gap-4">
          <span aria-hidden="true" className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] bg-cover bg-center text-2xl font-bold text-[color:var(--on-primary)]" style={p?.avatar_url ? { backgroundImage: `url(${p.avatar_url})` } : undefined}>
            {p?.avatar_url ? '' : (p?.display_name || user.email).slice(0, 2).toUpperCase()}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <input name="photo" type="file" accept="image/png,image/jpeg,image/webp" aria-label="Choose a profile photo" className="text-sm file:mr-3 file:h-11 file:rounded-xl file:border file:border-[color:var(--line2)] file:bg-[var(--card)] file:px-4 file:font-semibold" />
            {p?.avatar_url && <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="remove_photo" />Remove my photo</label>}
          </div>
        </div>
        <label className={label}>Name<input name="display_name" maxLength={60} defaultValue={p?.display_name ?? ''} className={input} /></label>
        <label className={label}>Handle
          <input name="handle" maxLength={20} defaultValue={p?.handle ?? ''} placeholder="maria_dinks" autoCapitalize="none" className={input} />
        </label>
        <p className={`-mt-2 text-xs ${muted}`}>3 to 20 letters, numbers or underscores. Your public profile page exists only once you choose a handle: {p?.handle ? <Link href={`/u/${p.handle}`} className="font-semibold text-[color:var(--link)] underline">/u/{p.handle}</Link> : '/u/your-handle'}.</p>
        <label className={label}>About you (optional)<textarea name="bio" rows={3} maxLength={160} defaultValue={p?.bio ?? ''} className="w-full rounded-xl border border-[color:var(--line2)] bg-[var(--card)] p-3 text-base" /></label>
        <label className={label}>City (optional)<input name="city" maxLength={60} defaultValue={p?.city ?? ''} className={input} /></label>
        <label className={label}>Who can see my stats
          <select name="stats_visibility" defaultValue={p?.stats_visibility ?? 'everyone'} className={input}>
            <option value="everyone">Everyone (counts games in public tournaments)</option>
            <option value="members">People who share a group with me</option>
            <option value="me">Only me</option>
          </select>
        </label>
        <SubmitButton pendingText="Saving…" className={btn}>Save profile</SubmitButton>
      </ActionForm>

      <ActionForm action={deleteAccount} className={`${card} flex flex-col gap-3`}>
        <h2 className="text-lg font-bold" id="delete">Delete my account</h2>
        <p className={`text-sm ${muted}`}>This removes your account, photo and personal details. Game results stay, with your name as it was typed, so standings and history stay correct. This cannot be undone. If you are the only admin of a group, make someone else an admin first.</p>
        <label className={label}>Type DELETE to confirm<input name="confirm" autoComplete="off" className={input} /></label>
        <SubmitButton pendingText="Deleting…" className="inline-flex h-12 items-center justify-center rounded-xl bg-[var(--danger)] px-5 font-bold text-white">Delete my account</SubmitButton>
      </ActionForm>
    </div>
  )
}
