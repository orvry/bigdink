import { card, muted } from '@/lib/ui'
import type { PlayerStat } from '@/lib/types'

export default function MvpPanel({ title, stats, limit = 5 }: { title: string; stats: PlayerStat[]; limit?: number }) {
  const top = stats[0]?.points
  return (
    <section className={card} aria-label={title}>
      <h2 className="font-bold">{title}</h2>
      {stats.length === 0 ? (
        <p className={`mt-1 text-sm ${muted}`}>No player points yet. They appear as scorers tap the player who won each point.</p>
      ) : (
        <ol className="mt-2 flex flex-col gap-1.5">
          {stats.slice(0, limit).map((p, i) => (
            <li key={`${p.team}-${p.player}`} className="flex items-center gap-3 text-sm">
              <span className="w-5 font-bold">{i + 1}</span>
              <span className="flex-1"><span className="font-semibold">{p.player}</span> <span className={muted}>{p.team}</span></span>
              {p.points === top && <span className="rounded-full bg-[var(--gold)] px-2 py-0.5 text-xs font-bold text-[#172033]">MVP</span>}
              <span className="w-16 text-right font-semibold">{p.points} pts</span>
            </li>
          ))}
        </ol>
      )}
      <p className={`mt-2 text-xs ${muted}`}>MVP is the player who won the most points. Tied players share the title.</p>
    </section>
  )
}
