import Link from 'next/link'
import { getTournamentContext } from '@/lib/data'

export default async function TournamentLayout({ children, params }: { children: React.ReactNode; params: Promise<{ org: string; tid: string }> }) {
  const { org: slug, tid } = await params
  const { tournament } = await getTournamentContext(slug, tid)
  const base = `/${slug}/t/${tid}`
  const link = 'whitespace-nowrap px-3 py-3 text-sm font-semibold'
  return (
    <>
      <nav aria-label={`${tournament.name} menu`} className="flex items-center gap-1 overflow-x-auto border-b border-[color:var(--line)]">
        <span className="px-3 py-3 text-sm font-bold">{tournament.name}</span>
        <Link href={base} className={link}>Summary</Link>
        <Link href={`${base}/standings`} className={link}>Standings</Link>
        <Link href={`${base}/bracket`} className={link}>Bracket</Link>
        <Link href={`${base}/screen`} className={link}>Big screen</Link>
      </nav>
      {children}
    </>
  )
}
