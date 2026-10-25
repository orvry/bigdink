import { requireUser } from '@/lib/auth'
import { createGroup } from '@/app/actions'
import ActionForm from '@/components/ActionForm'
import SubmitButton from '@/components/SubmitButton'
import Breadcrumbs from '@/components/Breadcrumbs'
import { btn, input, label, muted } from '@/lib/ui'

export default async function NewGroup() {
  await requireUser()
  return (
    <div className="md:mx-auto md:w-full md:max-w-md">
      <Breadcrumbs items={[{ label: 'All groups', href: '/' }, { label: 'New group' }]} />
      <h1 className="mt-2 text-2xl font-bold">Create a group</h1>
      <p className={`mb-3 text-sm ${muted}`}>A group is your club or event organizer. It owns its tournaments, and you become its admin.</p>
      <ActionForm action={createGroup} keepOnSuccess className="flex flex-col gap-3">
        <label className={label}>Group name<input name="name" required placeholder="Tokyo Pickleball Club" className={input} /></label>
        <label className={label}>Web address<input name="slug" required placeholder="tokyo-pickleball" pattern="[a-z0-9][a-z0-9\-]{1,38}" className={input} /></label>
        <p className={`text-xs ${muted}`}>Lowercase letters, numbers and dashes. Your page will be at /your-address. You can’t change it later.</p>
        <SubmitButton pendingText="Creating…" className={btn}>Create group</SubmitButton>
      </ActionForm>
    </div>
  )
}
