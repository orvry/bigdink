import { IconTile } from '@/components/ui-kit'
import { Medal, Target, Trophy, Users } from 'lucide-react'
import { card, muted, num } from '@/lib/ui'
import type { PersonalStats as Stats } from '@/lib/types'

/** Games, wins, win rate, points and titles for the signed-in user. */
export default function PersonalStats({ title, stats }: { title: string; stats: Stats }) {
  const items = [
    { label: 'Games played', value: stats.games, sub: `${stats.wins} won · ${stats.losses} lost`, icon: <Users size={20} />, tint: 'blue' as const },
    { label: 'Win rate', value: stats.winRate === null ? '–' : `${stats.winRate}%`, sub: `${stats.tournaments} tournament${stats.tournaments === 1 ? '' : 's'}`, icon: <Target size={20} />, tint: 'teal' as const },
    { label: 'Points won', value: stats.points, sub: 'while you were scoring', icon: <Medal size={20} />, tint: 'coral' as const },
    { label: 'Titles', value: stats.titles, sub: 'tournaments won', icon: <Trophy size={20} />, tint: 'gold' as const },
  ]
  return (
    <section className={card} aria-label={title}>
      <h2 className="mb-3 text-lg font-bold">{title}</h2>
      {stats.games === 0 && stats.tournaments === 0 && <p className={`mb-3 text-sm ${muted}`}>Your stats start after you play a game. Join a tournament, and an admin will place you on a team.</p>}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {items.map((i) => (
          <div key={i.label} className="flex items-center gap-3">
            <IconTile tint={i.tint} size={40}>{i.icon}</IconTile>
            <div><div className={`${num} text-2xl`}>{i.value}</div><div className="text-xs font-semibold">{i.label}</div><div className={`text-xs ${muted}`}>{i.sub}</div></div>
          </div>
        ))}
      </div>
    </section>
  )
}
