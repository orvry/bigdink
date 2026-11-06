import Link from 'next/link'
import { BRAND } from '@/lib/brand'

/** Pickleball with speed lines, plus the product name. */
export default function Logo({ href = '/', compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="flex items-center gap-3" aria-label={`${BRAND.name}, home`}>
      <svg width="44" height="36" viewBox="0 0 44 36" aria-hidden="true">
        <path d="M2 11h14M0 18h12M4 25h12" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" />
        <circle cx="30" cy="18" r="13" fill="var(--gold)" />
        {[[26, 12], [33, 11], [24, 19], [31, 18], [37, 19], [27, 25], [34, 25]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.7" fill="#E5A92A" />)}
      </svg>
      {!compact && (
        <span className="flex flex-col leading-tight">
          <span className="text-xl font-bold text-[color:var(--link)]">{BRAND.name}</span>
          <span className="text-xs font-medium text-[color:var(--muted)]">{BRAND.tagline}</span>
        </span>
      )}
    </Link>
  )
}
