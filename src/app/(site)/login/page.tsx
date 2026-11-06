'use client'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { authenticate, signInWithFacebook } from '@/app/actions'
import ActionForm from '@/components/ActionForm'
import SubmitButton from '@/components/SubmitButton'
import Breadcrumbs from '@/components/Breadcrumbs'
import { BRAND } from '@/lib/brand'
import { btn, btn2, input, label, num, muted } from '@/lib/ui'

function LoginForm() {
  const params = useSearchParams()
  const next = params.get('next') ?? '/'
  const problem = params.get('error')
  return (
    <div className="md:mx-auto md:w-full md:max-w-md">
      <Breadcrumbs items={[{ label: 'All tournaments', href: '/' }, { label: 'Sign in' }]} />
      <div className="mt-6 flex flex-col gap-3">
        <div className={`${num} text-4xl`}>{BRAND.name}</div>
        <p className={`mb-1 ${muted}`}>Sign in to join tournaments, score games or manage your group.</p>
        {problem && <p role="alert" className="text-sm font-semibold text-[color:var(--danger)]">{problem === 'facebook' ? 'Facebook sign-in is not available right now.' : 'Sign-in did not finish. Please try again.'}</p>}
        <form action={signInWithFacebook}>
          <input type="hidden" name="next" value={next} />
          <SubmitButton pendingText="Opening Facebook…" className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#1877F2] font-bold text-white">
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 22v-8h2.7l.5-3.3h-3.2V8.6c0-.9.4-1.7 1.8-1.7h1.5V4.1c-.3 0-1.2-.1-2.2-.1-2.3 0-3.8 1.4-3.8 3.9v2.8H8v3.3h2.8v8h2.7z" /></svg>
            Continue with Facebook
          </SubmitButton>
        </form>
        <div className={`flex items-center gap-3 text-xs ${muted}`}><span className="h-px flex-1 bg-[var(--line)]" />or use your email<span className="h-px flex-1 bg-[var(--line)]" /></div>
        <ActionForm action={authenticate} keepOnSuccess className="flex flex-col gap-3">
          <input type="hidden" name="next" value={next} />
          <label className={label}>Email<input name="email" type="email" autoComplete="email" required className={input} /></label>
          <label className={label}>Password<input name="password" type="password" autoComplete="current-password" minLength={6} required className={input} /></label>
          <SubmitButton name="intent" value="signin" pendingText="Please wait…" className={btn}>Sign in</SubmitButton>
          <SubmitButton name="intent" value="signup" pendingText="Please wait…" className={btn2}>Create account</SubmitButton>
        </ActionForm>
        <Link href="/" className="py-3 text-center font-bold text-[color:var(--link)]">Just watching? Browse live scores</Link>
      </div>
    </div>
  )
}

export default function Login() {
  return <Suspense><LoginForm /></Suspense>
}
