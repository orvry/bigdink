'use client'
import { useState } from 'react'
import { btn2 } from '@/lib/ui'

export default function ShareButton({ path, title }: { path: string; title: string }) {
  const [copied, setCopied] = useState(false)
  async function share() {
    const url = location.origin + path
    try {
      if (navigator.share) { await navigator.share({ title, url }); return }
      await navigator.clipboard.writeText(url)
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    } catch { /* share sheet dismissed */ }
  }
  return (
    <button type="button" onClick={share} className={`${btn2} w-full`}>
      <span aria-live="polite">{copied ? 'Link copied' : 'Share live link'}</span>
    </button>
  )
}
