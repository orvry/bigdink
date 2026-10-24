import type { Metadata } from 'next'
import Link from 'next/link'
import { Barlow_Condensed, Inter } from 'next/font/google'
import './globals.css'
import './theme.css'
import { getUser } from '@/lib/auth'
import { signOut } from './actions'

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
          <nav className={`${wrap} flex items-center gap-1 overflow-x-auto px-2 md:px-6`}>
            <Link href="/" className={link}>Summary</Link>
            <Link href="/standings" className={link}>Standings</Link>
            <Link href="/bracket" className={link}>Bracket</Link>
            {user && user.role !== 'viewer' && <Link href="/scorer" className={link}>Score</Link>}
            {user?.role === 'admin' && <Link href="/admin" className={link}>Admin</Link>}
            <span className="flex-1" />
            {user ? <form action={signOut}><button className={link}>Sign out</button></form> : <Link href="/login" className={link}>Sign in</Link>}
          </nav>
        </header>
        <main className={`${wrap} flex flex-col gap-4 px-5 py-4 md:px-8 md:py-6`}>{children}</main>
      </body>
    </html>
  )
}
