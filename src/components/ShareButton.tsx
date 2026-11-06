'use client'
import { useState, useSyncExternalStore } from 'react'
import { btn2 } from '@/lib/ui'

const noop = () => () => {}

export default function ShareButton({ path, title }: { path: string; title: string }) {
  const [msg, setMsg] = useState('')
  // true only in browsers with a share sheet (most phones); false on the server so nothing mismatches
  const canShare = useSyncExternalStore(noop, () => 'share' in navigator, () => false)
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 2500) }
  const url = () => location.origin + path
  async function copy() {
    try { await navigator.clipboard.writeText(url()); flash('Link copied to clipboard') }
    catch { flash('Could not copy. Copy the address from your browser instead.') }
  }
  async function share() { try { await navigator.share({ title, url: url() }) } catch { /* share sheet dismissed */ } }
  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        {canShare && <button type="button" onClick={share} className={`${btn2} flex-1`}>Share</button>}
        <button type="button" onClick={copy} className={`${btn2} flex-1`}>{msg.startsWith('Link copied') ? 'Copied ✓' : 'Copy link'}</button>
      </div>
      <p role="status" aria-live="polite" className="min-h-4 text-xs text-[color:var(--muted)]">{msg}</p>
    </div>
  )
}
