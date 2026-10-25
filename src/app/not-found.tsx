import Link from 'next/link'
import { btn, muted } from '@/lib/ui'

export default function NotFound() {
  return (
    <div className="mt-12 flex flex-col items-center gap-3 text-center">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className={`max-w-xs ${muted}`}>That group or page doesn’t exist. Check the address, or pick a group from the list.</p>
      <Link href="/" className={btn}>See all groups</Link>
    </div>
  )
}
