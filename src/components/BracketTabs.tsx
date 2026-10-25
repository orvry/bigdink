import Link from 'next/link'
import type { Bracket } from '@/lib/types'

export default function BracketTabs({ base, brackets, current, playoffs }: { base: string; brackets: Bracket[]; current?: string; playoffs?: boolean }) {
  const tabs = [...brackets.map((b) => ({ key: b.name, label: `Bracket ${b.name}` })), ...(playoffs ? [{ key: 'P', label: 'Playoffs' }] : [])]
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((t) => (
        <Link key={t.key} href={`${base}?b=${t.key}`} aria-current={t.key === current ? 'page' : undefined}
          className={`flex h-11 min-w-24 flex-1 items-center justify-center rounded-xl text-sm font-semibold ${t.key === current ? 'bg-[var(--solid)] text-[color:var(--on-solid)]' : 'border border-[color:var(--ink)]'}`}>
          {t.label}
        </Link>
      ))}
    </div>
  )
}
