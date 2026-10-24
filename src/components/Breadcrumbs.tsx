import Link from 'next/link'
import { muted } from '@/lib/ui'

export default function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className={`text-sm ${muted}`}>
      <ol className="flex flex-wrap items-center gap-x-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden="true">/</span>}
            {it.href
              ? <Link href={it.href} className="py-2 font-semibold text-[color:var(--link)] hover:underline">{it.label}</Link>
              : <span aria-current="page" className="py-2">{it.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  )
}
