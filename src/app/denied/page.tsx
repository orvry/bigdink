import Link from 'next/link'
import Breadcrumbs from '@/components/Breadcrumbs'
import { btn, muted } from '@/lib/ui'
export default function Denied() {
  return (
    <>
      <Breadcrumbs items={[{ label: 'Summary', href: '/' }, { label: 'Access denied' }]} />
      <div className="mt-12 flex flex-col items-center gap-3 text-center">
        <h1 className="text-2xl font-bold">Admins only</h1>
        <p className={`max-w-xs ${muted}`}>Your account can’t open this page. Ask a tournament admin to change your role.</p>
        <Link href="/" className={btn}>Back to summary</Link>
      </div>
    </>
  )
}
