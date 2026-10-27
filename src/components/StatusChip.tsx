import { CalendarClock, Check, Clock, Pause, Radio } from 'lucide-react'

const MAP = {
  live: { text: 'In progress', Icon: Radio, cls: 'bg-[var(--live)] text-[color:var(--on-live)]' },
  paused: { text: 'Paused', Icon: Pause, cls: 'bg-[var(--gold)] text-[#172033]' },
  final: { text: 'Completed', Icon: Check, cls: 'bg-[var(--chip)] text-[color:var(--ink)]' },
  ready: { text: 'Ready', Icon: Clock, cls: 'tint-blue' },
  scheduled: { text: 'Scheduled', Icon: CalendarClock, cls: 'bg-[var(--chip)] text-[color:var(--ink)]' },
} as const

/** Status always has a word and an icon, never color alone. Pass ready for a scheduled game whose teams are both known. */
export default function StatusChip({ status, ready = false }: { status: string; ready?: boolean }) {
  const key = (status === 'scheduled' && ready ? 'ready' : status) as keyof typeof MAP
  const { text, Icon, cls } = MAP[key] ?? MAP.scheduled
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${cls}`}>
      <Icon aria-hidden="true" size={14} />{text}
    </span>
  )
}
