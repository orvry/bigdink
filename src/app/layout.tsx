import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import './theme.css'
import { Suspense } from 'react'
import { BRAND } from '@/lib/brand'
import NavProgress from '@/components/NavProgress'

const body = Inter({ subsets: ['latin'], variable: '--font-body' })
export const metadata: Metadata = { title: { default: `${BRAND.name} ${BRAND.tagline}`, template: `%s | ${BRAND.name}` } }

// Applies the saved light/dark choice before the first paint so the page never flashes the wrong theme.
const themeScript = `try{var t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t}catch(e){}`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body className={`${body.variable} antialiased`} style={{ fontFamily: 'var(--font-body), Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif' }}>
        <Suspense fallback={null}><NavProgress /></Suspense>
        {children}
      </body>
    </html>
  )
}
