import Link from 'next/link'
import { getOrg, roleIn } from '@/lib/auth'

export default async function OrgLayout({ children, params }: { children: React.ReactNode; params: Promise<{ org: string }> }) {
  const { org: slug } = await params
  const org = await getOrg(slug)
  const role = await roleIn(org.id)
  const base = `/${slug}`
  const link = 'whitespace-nowrap px-3 py-3 text-sm font-semibold'
  return (
    <>
      <nav aria-label={`${org.name} sections`} className="-mt-4 flex items-center gap-1 overflow-x-auto border-b border-[color:var(--line)] md:-mt-6">
        <Link href={base} className="px-3 py-3 text-sm font-bold">{org.name}</Link>
        <span aria-hidden="true" className="text-[color:var(--line2)]">|</span>
        <Link href={base} className={link}>Summary</Link>
        <Link href={`${base}/standings`} className={link}>Standings</Link>
        <Link href={`${base}/bracket`} className={link}>Bracket</Link>
        {role !== 'viewer' && <Link href={`${base}/scorer`} className={link}>Score</Link>}
        {role === 'admin' && <Link href={`${base}/admin`} className={link}>Admin</Link>}
      </nav>
      {children}
    </>
  )
}
