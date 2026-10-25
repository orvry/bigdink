'use client'
import Link from 'next/link'
import { authenticate } from '@/app/actions'
import ActionForm from '@/components/ActionForm'
import SubmitButton from '@/components/SubmitButton'
import Breadcrumbs from '@/components/Breadcrumbs'
import { btn, btn2, input, label, num, muted } from '@/lib/ui'

export default function Login() {
  return (
    <div className="md:mx-auto md:w-full md:max-w-md">
      <Breadcrumbs items={[{ label: 'All groups', href: '/' }, { label: 'Sign in' }]} />
      <ActionForm action={authenticate} keepOnSuccess className="mt-6 flex flex-col gap-3">
        <div className={`${num} text-[44px]`}>Pickleball Live</div>
        <p className={`mb-2 ${muted}`}>Sign in to score games or manage tournaments.</p>
        <label className={label}>Email<input name="email" type="email" autoComplete="email" required className={input} /></label>
        <label className={label}>Password<input name="password" type="password" autoComplete="current-password" minLength={6} required className={input} /></label>
        <SubmitButton name="intent" value="signin" pendingText="Please wait…" className={btn}>Sign in</SubmitButton>
        <SubmitButton name="intent" value="signup" pendingText="Please wait…" className={btn2}>Create account</SubmitButton>
        <Link href="/" className="py-3 text-center font-bold text-[color:var(--link)]">Just watching? Browse live scores</Link>
      </ActionForm>
    </div>
  )
}
