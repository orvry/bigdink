'use client'
import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

/**
 * A thin bar at the top of the window that starts the moment an in-site link is clicked and ends when the new page
 * arrives. It also stops by itself after 12 seconds, in case a navigation never completes.
 */
export default function NavProgress() {
  const here = `${usePathname()}?${useSearchParams().toString()}`
  const [startedAt, setStartedAt] = useState<string | null>(null) // the address we were on when the click happened

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.('a')
      if (!a || a.target === '_blank' || a.hasAttribute('download') || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
      const url = new URL(a.href, location.href)
      if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search)) return
      setStartedAt(`${location.pathname}?${location.search.replace(/^\?/, '')}`)
      clearTimeout(timer)
      timer = setTimeout(() => setStartedAt(null), 12000)
    }
    document.addEventListener('click', onClick, true)
    return () => { document.removeEventListener('click', onClick, true); clearTimeout(timer) }
  }, [])

  if (startedAt === null || startedAt !== here) return null // finished: the address changed
  return <div aria-hidden="true" className="nav-progress fixed left-0 top-0 z-[60] h-[3px] bg-[var(--primary)]" />
}
