'use client'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'

/** Phone and tablet: a menu button that slides the sidebar in. Closes when a link is tapped, or on Escape. */
export default function MobileMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="lg:hidden" onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false) }}>
      <button type="button" onClick={() => setOpen(true)} aria-expanded={open} aria-label="Open menu" className="flex h-11 w-11 items-center justify-center rounded-xl border border-[color:var(--line2)]">
        <Menu aria-hidden="true" size={22} />
      </button>
      {open && (
        <div className="fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} aria-hidden="true" />
          <div role="dialog" aria-modal="true" aria-label="Menu" className="relative flex w-72 max-w-[85vw] flex-col gap-4 overflow-y-auto bg-[var(--card)] p-4"
            onClick={(e) => { if ((e.target as HTMLElement).closest('a')) setOpen(false) }}>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-xl"><X aria-hidden="true" size={22} /></button>
            {children}
          </div>
        </div>
      )}
    </div>
  )
}
