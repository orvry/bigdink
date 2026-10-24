const MAP: Record<string, [string, string]> = {
  live: ['● Live', 'bg-[var(--live)] text-[color:var(--on-live)]'],
  paused: ['Paused', 'bg-[#F5C84C] text-[#10231A]'],
  final: ['Final', 'bg-[var(--chip)]'],
  scheduled: ['Up next', 'bg-[var(--chip)]'],
}
export default function StatusChip({ status }: { status: string }) {
  const [text, cls] = MAP[status] ?? MAP.scheduled
  return <span className={`inline-block rounded-full px-3 py-1.5 text-xs font-bold ${cls}`}>{text}</span>
}
