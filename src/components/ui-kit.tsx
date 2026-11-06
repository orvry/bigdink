import type { ReactNode } from 'react'
import { muted, num } from '@/lib/ui'

type Tint = 'blue' | 'teal' | 'coral' | 'gold'

export function IconTile({ tint, children, size = 44 }: { tint: Tint; children: ReactNode; size?: number }) {
  return <span aria-hidden="true" style={{ width: size, height: size }} className={`tint-${tint} flex shrink-0 items-center justify-center rounded-xl`}>{children}</span>
}

export function CardHeader({ title, badge, action }: { title: string; badge?: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <h2 className="text-lg font-bold">{title}</h2>
      {badge && <span className="tint-teal rounded-full px-2.5 py-1 text-xs font-bold">{badge}</span>}
      <span className="flex-1" />
      {action}
    </div>
  )
}

export function StatCard({ icon, tint, label, value, sub, progress }: { icon: ReactNode; tint: Tint; label: string; value: ReactNode; sub?: ReactNode; progress?: number }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-[color:var(--line)] bg-[var(--card)] p-4">
      <IconTile tint={tint}>{icon}</IconTile>
      <div className={`text-sm ${muted}`}>{label}</div>
      <div className={`${num} text-3xl`}>{value}</div>
      {progress !== undefined && (
        <div className="flex items-center gap-2">
          <div role="progressbar" aria-label={label} aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} className="h-2 flex-1 rounded-full bg-[var(--chip)]">
            <div className="h-2 rounded-full bg-[var(--primary)]" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-xs font-semibold">{progress}%</span>
        </div>
      )}
      {sub && <div className={`text-xs ${muted}`}>{sub}</div>}
    </div>
  )
}

const DOTS = ['var(--primary)', 'var(--coral)', 'var(--teal)', 'var(--gold)']
/** A small colored dot that stays the same for a team. Decorative only: the name is always next to it. */
export function TeamDot({ id }: { id: string }) {
  const n = [...id].reduce((a, c) => a + c.charCodeAt(0), 0)
  return <span aria-hidden="true" className="inline-block h-3.5 w-3.5 shrink-0 rounded-full" style={{ background: DOTS[n % DOTS.length] }} />
}

/** Ring chart. Every segment also appears in the legend with its name and number. */
export function Donut({ segments, centerTop, centerBottom }: { segments: { label: string; value: number; color: string }[]; centerTop: string; centerBottom: string }) {
  const total = segments.reduce((a, s) => a + s.value, 0)
  const r = 52, c = 2 * Math.PI * r
  let offset = 0
  return (
    <div className="flex flex-wrap items-center gap-5">
      <div className="relative h-36 w-36 shrink-0" role="img" aria-label={`${centerTop} ${centerBottom}`}>
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r={r} fill="none" stroke="var(--chip)" strokeWidth="12" />
          {total > 0 && segments.map((s) => {
            const len = (s.value / total) * c
            const el = <circle key={s.label} cx="60" cy="60" r={r} fill="none" stroke={s.color} strokeWidth="12" strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} />
            offset += len
            return s.value > 0 ? el : null
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className={`${num} text-3xl`}>{centerTop}</span>
          <span className={`text-xs ${muted}`}>{centerBottom}</span>
        </div>
      </div>
      <ul className="flex flex-1 flex-col gap-2 text-sm">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-full" style={{ background: s.color }} />
            <span className="flex-1">{s.label}</span><b className="tabular">{s.value}</b>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Blue banner with a paddle, ball and coral and teal shapes. Decorative. */
export function HeroBanner({ eyebrow, title, meta, status, description, bannerUrl }: { eyebrow: string; title: string; meta: string; status: ReactNode; description?: string | null; bannerUrl?: string | null }) {
  return (
    <section className="relative isolate overflow-hidden rounded-3xl p-6 text-white md:p-8" style={{ background: bannerUrl ? `linear-gradient(rgba(16,21,34,.62), rgba(16,21,34,.62)), url(${bannerUrl}) center / cover` : 'linear-gradient(110deg, var(--hero-from), var(--hero-to))' }}>
      <svg aria-hidden="true" viewBox="0 0 400 200" preserveAspectRatio="xMaxYMid slice" className={`pointer-events-none absolute inset-y-0 right-0 -z-10 h-full w-3/5 ${bannerUrl ? 'hidden' : 'hidden sm:block'}`}>
        <path d="M400 0H290Q330 55 400 72Z" fill="var(--coral)" />
        <path d="M400 200H270Q330 148 400 138Z" fill="var(--teal)" />
        <g transform="rotate(-32 270 100)">
          <rect x="228" y="18" width="116" height="138" rx="58" fill="rgba(255,255,255,.14)" stroke="#fff" strokeWidth="6" />
          <rect x="274" y="152" width="24" height="46" rx="8" fill="rgba(255,255,255,.7)" />
        </g>
        <circle cx="200" cy="132" r="32" fill="var(--gold)" />
        {[[190, 122], [206, 120], [194, 138], [210, 136], [200, 128]].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="3.4" fill="#E5A92A" />)}
      </svg>
      <p className="text-xs font-semibold uppercase tracking-widest opacity-90">{eyebrow}</p>
      <h1 className="mt-1 text-3xl font-bold md:text-4xl">{title}</h1>
      <p className="mt-2 text-sm md:text-base">{meta}</p>
      {description && <p className="mt-2 max-w-2xl text-sm opacity-95 md:text-base">{description}</p>}
      <div className="mt-4">{status}</div>
    </section>
  )
}
