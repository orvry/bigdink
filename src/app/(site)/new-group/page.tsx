import { requireUser } from '@/lib/auth'
import { startGroupPayment } from '@/app/actions'
import { PRICE_PER_DAY, PAYMENTS_MODE, MAX_DAYS } from '@/lib/billing'
import { money } from '@/lib/format'
import ActionForm from '@/components/ActionForm'
import SubmitButton from '@/components/SubmitButton'
import RentalPicker from '@/components/RentalPicker'
import Breadcrumbs from '@/components/Breadcrumbs'
import { btn, input, label, muted } from '@/lib/ui'

export default async function NewGroup() {
  await requireUser()
  return (
    <div className="md:mx-auto md:w-full md:max-w-md">
      <Breadcrumbs items={[{ label: 'All tournaments', href: '/' }, { label: 'Create a group' }]} />
      <h1 className="mt-2 text-2xl font-bold">Create a group</h1>
      <p className={`mb-3 text-sm ${muted}`}>A group is your club or event organizer. It hosts your tournaments, scorers and members.</p>
      <section aria-label="Cost" className="mb-3 rounded-xl border border-[color:var(--line)] bg-[var(--card)] p-3 text-sm">
        <b>Creating a group has a fee: {money(PRICE_PER_DAY / 100, 'PHP')} per day.</b>
        <ul className="mt-1 list-disc pl-5">
          <li>You choose how many days below and pay on the next screen. The group is created only after payment.</li>
          <li>While your days last, every feature works.</li>
          <li>When they run out, people can still view the summary, standings and brackets and download reports. Scoring and management pause until you add more days.</li>
        </ul>
      </section>
      {PAYMENTS_MODE === 'manual' && <p role="note" className="mb-3 rounded-xl bg-[var(--chip)] p-3 text-sm"><b>How you pay:</b> on the next screen you scan a GCash, Maya or bank QR code, pay the exact amount, and type the reference number from your receipt. An admin confirms it, and your group is created right after.</p>}
      {PAYMENTS_MODE === 'simulated' && <p role="note" className="mb-3 rounded-xl bg-[var(--gold)] p-3 text-sm font-semibold text-[#172033]">Test mode: payment is simulated and no money is charged.</p>}
      <ActionForm action={startGroupPayment} keepOnSuccess className="flex flex-col gap-3">
        <label className={label}>Group name<input name="name" required placeholder="Tokyo Pickleball Club" className={input} /></label>
        <label className={label}>Web address<input name="slug" required placeholder="tokyo-pickleball" pattern="[a-z0-9][a-z0-9\-]{1,38}" className={input} /></label>
        <p className={`text-xs ${muted}`}>Lowercase letters, numbers and dashes. Your page will be at /your-address. You can’t change it later.</p>
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1 text-sm font-semibold text-[color:var(--muted)]">Who can see this group?</legend>
          <label className="flex items-start gap-2 text-sm"><input type="radio" name="visibility" value="public" defaultChecked className="mt-1" /><span><b>Public.</b> Listed in the public feed. Anyone can watch.</span></label>
          <label className="flex items-start gap-2 text-sm"><input type="radio" name="visibility" value="private" className="mt-1" /><span><b>Private.</b> Not listed. Only members can open it.</span></label>
        </fieldset>
        <RentalPicker pricePerDay={PRICE_PER_DAY} max={MAX_DAYS} />
        <SubmitButton pendingText="Continuing…" className={btn}>Continue to payment</SubmitButton>
      </ActionForm>
    </div>
  )
}
