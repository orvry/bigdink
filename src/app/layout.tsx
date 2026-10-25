import type { Metadata } from 'next'
import Link from 'next/link'
import { Barlow_Condensed, Inter } from 'next/font/google'
import './globals.css'
import './theme.css'
import { getUser } from '@/lib/auth'
import { signOut } from './actions'
import SubmitButton from '@/components/SubmitButton'

const display = Barlow_Condensed({ subsets: ['latin'], weight: '700', variable: '--font-display' })
const body = Inter({ subsets: ['latin'], variable: '--font-body' })
export const metadata: Metadata = { title: 'Pickleball Live' }

const wrap = 'mx-auto w-full max-w-md md:max-w-3xl lg:max-w-5xl'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser()
  const link = 'whitespace-nowrap px-3 py-3 text-sm font-semibold'
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} antialiased`} style={{ fontFamily: 'var(--font-body), system-ui, sans-serif' }}>
        <header className="border-b border-[color:var(--line)] bg-[var(--card)]">
          <div className={`${wrap} flex items-center gap-1 px-2 md:px-6`}>
            <Link href="/" className="px-3 py-3 font-bold">Pickleball Live</Link>
            <span className="flex-1" />
            {user ? (
              <>
                <span className="hidden text-xs text-[color:var(--muted)] md:inline">{user.email}</span>
                <form action={signOut}><SubmitButton pendingText="Signing out…" className={link}>Sign out</SubmitButton></form>
              </>
            ) : <Link href="/login" className={link}>Sign in</Link>}
          </div>
        </header>
        <main className={`${wrap} flex flex-col gap-4 px-5 py-4 md:px-8 md:py-6`}>{children}</main>
      </body>
    </html>
  )
}
