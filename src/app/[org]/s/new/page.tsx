import { requireRole } from '@/lib/auth'
import { createSession } from '@/app/actions'
import ActionForm from '@/components/ActionForm'
import SubmitButton from '@/components/SubmitButton'
import Breadcrumbs from '@/components/Breadcrumbs'
import { btn, card, input, label, muted } from '@/lib/ui'

export const dynamic = 'force-dynamic'

export default async function NewSession({ params }: { params: Promise<{ org: string }> }) {
  const { org: slug } = await params
  const { org } = await requireRole(slug, ['admin', 'scorer', 'member'])
  return (
    <div className="md:mx-auto md:w-full md:max-w-xl">
      <Breadcrumbs items={[{ label: org.name, href: `/${slug}` }, { label: 'Start a game' }]} />
      <h1 className="mt-2 text-2xl font-bold md:text-3xl">Start a game</h1>
      <p className={`mt-1 text-sm ${muted}`}>Play and score a game outside any tournament. It uses {org.name}’s paid days.</p>
      <ActionForm action={createSession} keepOnSuccess className={`${card} mt-4 flex flex-col gap-4`}>
        <input type="hidden" name="org_id" value={org.id} /><input type="hidden" name="slug" value={slug} />
        <label className={label}>Name (optional)<input name="name" placeholder="Friday open play" className={input} /></label>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold text-[color:var(--muted)]">What are you playing?</legend>
          <label className="flex items-start gap-2 text-sm"><input type="radio" name="format" value="single" defaultChecked className="mt-1" /><span><b>One game.</b> A single game between two sides.</span></label>
          <label className="flex items-start gap-2 text-sm"><input type="radio" name="format" value="session" className="mt-1" /><span><b>A session.</b> Several games, added one after another. Partners can change every game.</span></label>
        </fieldset>
        <div className="flex gap-3">
          <label className={`${label} flex-1`}>Points to win<input name="points_to_win" type="number" min={1} max={99} defaultValue={11} className={input} /></label>
          <label className={`${label} flex-1`}>Win by<input name="win_by" type="number" min={1} max={10} defaultValue={2} className={input} /></label>
        </div>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold text-[color:var(--muted)]">Who can see it?</legend>
          <label className="flex items-start gap-2 text-sm"><input type="radio" name="visibility" value="private" defaultChecked className="mt-1" /><span><b>Private.</b> Only members of {org.name}.</span></label>
          <label className="flex items-start gap-2 text-sm"><input type="radio" name="visibility" value="public" className="mt-1" /><span><b>Public.</b> Anyone with the link, and it can appear in the feed.</span></label>
        </fieldset>
        <SubmitButton pendingText="Starting…" className={btn}>Start</SubmitButton>
      </ActionForm>
    </div>
  )
}
