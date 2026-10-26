'use client'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/** Re-renders the page's server data whenever a game in the tournament changes (plus a slow backup timer). */
export default function LiveRefresh({ tournamentId }: { tournamentId: string }) {
  const router = useRouter()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    const sb = createClient()
    const refresh = () => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => router.refresh(), 800) // many quick points become one refresh
    }
    const ch = sb.channel(`screen-${tournamentId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `tournament_id=eq.${tournamentId}` }, refresh)
      .subscribe()
    const backup = setInterval(() => router.refresh(), 30000)
    return () => { sb.removeChannel(ch); clearInterval(backup); if (timer.current) clearTimeout(timer.current) }
  }, [tournamentId, router])
  return null
}
