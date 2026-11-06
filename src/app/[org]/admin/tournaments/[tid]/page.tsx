import { requireRole } from '@/lib/auth'
import { getTournamentContext } from '@/lib/data'
import { updateTournament } from '@/app/actions'
import ActionForm from '@/components/ActionForm'
import SubmitButton from '@/components/SubmitButton'
import Breadcrumbs from '@/components/Breadcrumbs'
import { btn, card, input, label, muted } from '@/lib/ui'

export const dynamic = 'force-dynamic'

export default async function EditTournament({ params }: { params: Promise<{ org: string; tid: string }> }) {
  const { org: slug, tid } = await params
  await requireRole(slug, ['admin'])
  const { tournament: t } = await getTournamentContext(slug, tid)
  return (
    <>
      <Breadcrumbs items={[{ label: 'Group', href: `/${slug}` }, { label: 'Settings', href: `/${slug}/admin` }, { label: 'Edit tournament' }]} />
      <h1 className="text-2xl font-bold md:text-3xl">Edit tournament</h1>
      <ActionForm action={updateTournament} keepOnSuccess className={`${card} flex flex-col gap-4 md:max-w-2xl`}>
        <input type="hidden" name="id" value={t.id} />
        <label className={label}>Name<input name="name" required defaultValue={t.name} className={input} /></label>
        <label className={label}>Description<textarea name="description" rows={4} maxLength={500} defaultValue={t.description ?? ''} placeholder="Tell people what this tournament is about: format, venue, who can join." className="w-full rounded-xl border border-[color:var(--line2)] bg-[var(--card)] p-3 text-base" /></label>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-semibold text-[color:var(--muted)]">Banner</span>
          {t.banner_url
            ? <div role="img" aria-label="Current banner" className="h-32 w-full rounded-xl bg-[var(--chip)] bg-cover bg-center md:h-44" style={{ backgroundImage: `url(${t.banner_url})` }} />
            : <p className={`rounded-xl bg-[var(--chip)] p-4 text-sm ${muted}`}>No banner yet. The overview shows the default blue banner.</p>}
          <input name="banner" type="file" accept="image/png,image/jpeg,image/webp" aria-label="Choose a banner image" className="text-sm file:mr-3 file:h-11 file:rounded-xl file:border file:border-[color:var(--line2)] file:bg-[var(--card)] file:px-4 file:font-semibold" />
          <p className={`text-xs ${muted}`}>A wide picture works best. PNG, JPG or WebP, up to 3 MB. It is stored on the CDN.</p>
          {t.banner_url && <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="remove_banner" />Remove the current banner</label>}
        </div>

        <div className="flex gap-3"><label className={`${label} flex-1`}>Date<input name="date" type="date" defaultValue={t.date ?? ''} className={input} /></label>
          <label className={`${label} w-28`}>Courts<input name="courts" type="number" min={1} defaultValue={t.courts ?? 4} className={input} /></label></div>
        <div className="flex gap-3"><label className={`${label} flex-1`}>Points to win<input name="points_to_win" type="number" min={1} defaultValue={t.points_to_win} className={input} /></label>
          <label className={`${label} flex-1`}>Win by<input name="win_by" type="number" min={1} defaultValue={t.win_by} className={input} /></label>
          <label className={`${label} w-28`}>Currency<input name="currency" maxLength={3} defaultValue={t.currency} className={`${input} uppercase`} /></label></div>
        <label className={label}>Visibility
          <select name="visibility" defaultValue={t.visibility} className={input}><option value="public">Public: listed in the feed</option><option value="private">Private: members only</option></select></label>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="registration_open" defaultChecked={t.registration_open} className="mt-1" /><span><b>Registration is open.</b> People can join as guests or members until you switch this off.</span></label>
        <SubmitButton pendingText="Saving…" className={btn}>Save changes</SubmitButton>
        <p className={`text-xs ${muted}`}>Changing the points to win or win by only affects games that have not ended yet.</p>
      </ActionForm>
    </>
  )
}
