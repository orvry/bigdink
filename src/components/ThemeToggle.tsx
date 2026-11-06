'use client'
import { useSyncExternalStore } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'

const KEY = 'theme'
const listeners = new Set<() => void>()
const subscribe = (cb: () => void) => { listeners.add(cb); return () => { listeners.delete(cb) } }
const current = () => localStorage.getItem(KEY) ?? 'system'

function choose(v: string) {
  if (v === 'system') { localStorage.removeItem(KEY); document.documentElement.removeAttribute('data-theme') }
  else { localStorage.setItem(KEY, v); document.documentElement.dataset.theme = v }
  listeners.forEach((l) => l())
}

const OPTIONS = [['light', 'Light', Sun], ['dark', 'Dark', Moon], ['system', 'Device', Monitor]] as const

export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, current, () => 'system')
  return (
    <div role="group" aria-label="Theme" className="flex gap-1 rounded-xl bg-[var(--chip)] p-1">
      {OPTIONS.map(([v, text, Icon]) => (
        <button key={v} type="button" onClick={() => choose(v)} aria-pressed={theme === v}
          className={`flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold ${theme === v ? 'bg-[var(--card)] text-[color:var(--ink)] shadow-sm' : 'text-[color:var(--muted)]'}`}>
          <Icon aria-hidden="true" size={14} />{text}
        </button>
      ))}
    </div>
  )
}
