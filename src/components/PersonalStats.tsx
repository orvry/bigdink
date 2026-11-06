import { IconTile } from '@/components/ui-kit'
import { Medal, Target, Trophy, Users } from 'lucide-react'
import { card, muted, num } from '@/lib/ui'
import type { PersonalStats as Stats } from '@/lib/types'

/**
 * Games, wins, win rate, points and titles for the signed-in user.
 * variant "wide": a row of four for a full-width spot. variant "side": a tidy list for a narrow column.
 */
export default function PersonalStats({ title, stats, variant = 'wide' }: { title: string; stats: Stats; variant?: 'wide' | 'side' }) {
  const items = [
    { label: 'Games played', value: stats.games, sub: `${stats.wins} won · ${stats.losses} lost`, icon: <Users size={20} />, tint: 'blue' as const },
    { label: 'Win rate', value: stats.winRate === null ? '–' : `${stats.winRate}%`, sub: `${stats.tournaments} tournament${stats.tournaments === 1 ? '' : 's'}`, icon: <Target size={20} />, tint: 'teal' as const },
    { label: 'Points won', value: stats.points, sub: 'in your games', icon: <Medal size={20} />, tint: 'coral' as const },
    { label: 'Titles', value: stats.titles, sub: 'tournaments won', icon: <Trophy size={20} />, tint: 'gold' as const },
  ]
  return (
    <section className={card} aria-label={title}>
      <h2 className="mb-3 text-lg font-bold">{title}</h2>
      {stats.games === 0 && stats.tournaments === 0 && <p className={`mb-4 text-sm ${muted}`}>Your stats start after you play a game. Join a tournament, and an admin will place you on a team.</p>}
      {variant === 'side' ? (
        <ul className="flex flex-col gap-3">
          {items.map((i) => (
            <li key={i.label} className="flex items-center gap-3">
              <IconTile tint={i.tint} size={40}>{i.icon}</IconTile>
              <div className="min-w-0 flex-1"><div className="text-sm font-semibold">{i.label}</div><div className={`truncate text-xs ${muted}`}>{i.sub}</div></div>
              <div className={`${num} text-2xl`}>{i.value}</div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {items.map((i) => (
            <div key={i.label} className="flex min-w-0 flex-col gap-1">
              <IconTile tint={i.tint} size={40}>{i.icon}</IconTile>
              <div className={`${num} mt-1 text-3xl`}>{i.value}</div>
              <div className="text-sm font-semibold">{i.label}</div>
              <div className={`text-xs ${muted}`}>{i.sub}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
