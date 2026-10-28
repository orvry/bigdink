import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { isSystemAdmin } from '@/lib/system'
import { adminClient } from '@/lib/supabase/admin'
import { deletePaymentAccount, savePaymentAccount } from '@/app/actions'
import ActionForm from '@/components/ActionForm'
import SubmitButton from '@/components/SubmitButton'
import Link from 'next/link'
import { btn, btn2, card, input, label, muted } from '@/lib/ui'
import type { PaymentAccount } from '@/lib/types'

export const dynamic = 'force-dynamic'

/** For system admins only: the accounts people pay into. Account numbers live in the database, QR images on the CDN. */
export default async function PaymentAccounts({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  await requireUser()
  if (!(await isSystemAdmin())) redirect('/denied')
  const { edit } = await searchParams
  const { data } = await adminClient().from('payment_accounts').select('*').order('sort').order('created_at')
  const accounts = (data ?? []) as PaymentAccount[]
  const cur = accounts.find((a) => a.id === edit)

  return (
    <>
      <h1 className="text-2xl font-bold md:text-3xl">Payment accounts</h1>
      <p className={`text-sm ${muted}`}>These are shown to people on the payment page. Only active accounts appear. Confirm payments on the Payments tab.</p>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          {accounts.length === 0 && <p className={`${card} text-sm ${muted}`}>No accounts yet. Add your GCash, Maya or bank account.</p>}
          {accounts.map((a) => (
            <article key={a.id} className={`${card} flex items-center gap-3`}>
              <div role="img" aria-label={a.qr_url ? `${a.label} QR code` : 'No QR image'} className="h-16 w-16 shrink-0 rounded-lg bg-[var(--chip)] bg-contain bg-center bg-no-repeat" style={a.qr_url ? { backgroundImage: `url(${a.qr_url})` } : undefined} />
              <div className="min-w-0 flex-1 text-sm">
                <div className="font-semibold">{a.label} <span className={`text-xs font-normal ${muted}`}>{a.active ? 'active' : 'hidden'}</span></div>
                <div className="truncate">{a.account_name}</div>
                <div className={`truncate text-xs ${muted}`}>{a.bank_name ? `${a.bank_name} · ` : ''}{a.account_number}</div>
              </div>
              <div className="flex flex-col gap-1">
                <Link href={`/system/payment-accounts?edit=${a.id}`} className={`${btn2} h-10 text-sm`}>Edit</Link>
                <form action={deletePaymentAccount.bind(null, a.id)}><SubmitButton pendingText="…" className="h-10 w-full text-sm font-semibold text-[color:var(--danger)]">Delete</SubmitButton></form>
              </div>
            </article>
          ))}
        </div>

        <ActionForm key={cur?.id ?? 'new'} action={savePaymentAccount} keepOnSuccess className={`${card} flex flex-col gap-3`}>
          <h2 className="font-bold">{cur ? 'Edit account' : 'Add an account'}</h2>
          <input type="hidden" name="id" value={cur?.id ?? ''} />
          <label className={label}>Type
            <select name="method" defaultValue={cur?.method ?? 'gcash'} className={input}><option value="gcash">GCash</option><option value="maya">Maya</option><option value="bank">Bank transfer</option></select></label>
          <label className={label}>Name shown to payers<input name="label" required defaultValue={cur?.label ?? ''} placeholder="GCash" className={input} /></label>
          <label className={label}>Account name<input name="account_name" required defaultValue={cur?.account_name ?? ''} className={input} /></label>
          <label className={label}>Account number<input name="account_number" required defaultValue={cur?.account_number ?? ''} inputMode="numeric" className={input} /></label>
          <label className={label}>Bank name (for bank transfers)<input name="bank_name" defaultValue={cur?.bank_name ?? ''} className={input} /></label>
          <label className={label}>QR code image<input name="qr" type="file" accept="image/png,image/jpeg,image/webp" className="text-sm file:mr-3 file:h-11 file:rounded-xl file:border file:border-[color:var(--line2)] file:bg-[var(--card)] file:px-4 file:font-semibold" /></label>
          <p className={`text-xs ${muted}`}>PNG, JPG or WebP, up to 3 MB. Stored on the CDN. {cur?.qr_url ? 'Leave empty to keep the current image.' : ''}</p>
          <div className="flex items-center gap-4">
            <label className={`${label} w-24`}>Order<input name="sort" type="number" defaultValue={cur?.sort ?? 0} className={input} /></label>
            <label className="mt-6 flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={cur ? cur.active : true} />Show to payers</label>
          </div>
          <SubmitButton pendingText="Saving…" className={btn}>{cur ? 'Save changes' : 'Add account'}</SubmitButton>
          {cur && <Link href="/system/payment-accounts" className="text-center text-sm font-semibold text-[color:var(--link)]">Add a new account instead</Link>}
        </ActionForm>
      </div>
    </>
  )
}
