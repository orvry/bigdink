import { num } from '@/lib/ui'
import type { getChampion } from '@/lib/stats'

export default function ChampionBanner({ c }: { c: NonNullable<ReturnType<typeof getChampion>> }) {
  const players = [c.champ.player1, c.champ.player2].filter(Boolean).join(' & ')
  return (
    <section aria-label="Tournament champions" className="rounded-2xl bg-[var(--solid)] p-5 text-center text-[color:var(--on-solid)] md:p-8">
      <div className="text-xs font-bold tracking-widest">TOURNAMENT CHAMPIONS</div>
      <div className={`${num} my-2 text-5xl md:text-7xl`}>{c.champ.name}</div>
      {players && <div className="text-sm font-semibold md:text-base">{players}</div>}
      <p className="mt-3 text-sm">
        Won the final {c.score} over {c.runner?.name ?? 'the runner-up'}.{c.third ? ` Third place: ${c.third.name}.` : ''}
      </p>
    </section>
  )
}
