import Link from 'next/link'
import Breadcrumbs from '@/components/Breadcrumbs'
import { btn, muted } from '@/lib/ui'
export default function Denied() {
  return (
    <>
      <Breadcrumbs items={[{ label: 'All groups', href: '/' }, { label: 'Access denied' }]} />
      <div className="mt-12 flex flex-col items-center gap-3 text-center">
        <h1 className="text-2xl font-bold">You don’t have access</h1>
        <p className={`max-w-xs ${muted}`}>Your account can’t open this page. Ask an admin of the group to change your role.</p>
        <Link href="/" className={btn}>Back to all groups</Link>
      </div>
    </>
  )
}
