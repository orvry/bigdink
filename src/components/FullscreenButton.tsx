'use client'
import { btn2 } from '@/lib/ui'

export default function FullscreenButton() {
  async function toggle() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await document.documentElement.requestFullscreen()
    } catch { /* the browser refused fullscreen */ }
  }
  return <button type="button" onClick={toggle} className={`${btn2} h-11 text-sm`}>Full screen</button>
}
