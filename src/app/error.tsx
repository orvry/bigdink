'use client'
import { btn, muted } from '@/lib/ui'

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="mx-auto mt-12 flex max-w-md p-6 flex-col items-center gap-3 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className={`max-w-xs ${muted}`}>Please try again. If it keeps happening, tell the tournament organizer.</p>
      <button onClick={reset} className={btn}>Try again</button>
    </div>
  )
}
