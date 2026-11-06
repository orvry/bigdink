'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Re-checks the page every few seconds, for screens waiting on something (like a payment confirmation). */
export default function PollRefresh({ seconds = 15 }: { seconds?: number }) {
  const router = useRouter()
  useEffect(() => {
    const t = setInterval(() => router.refresh(), seconds * 1000)
    return () => clearInterval(t)
  }, [router, seconds])
  return null
}
