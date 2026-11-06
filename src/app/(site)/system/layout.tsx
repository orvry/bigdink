import { redirect } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { isSystemAdmin } from '@/lib/system'
import SystemTabs from '@/components/SystemTabs'
import { muted } from '@/lib/ui'

/** The platform back office for system admins. Kept apart from the group screens so it can become its own application later. */
export default async function SystemLayout({ children }: { children: React.ReactNode }) {
  await requireUser()
  if (!(await isSystemAdmin())) redirect('/denied')
  return (
    <>
      <div><p className={`text-xs font-semibold uppercase tracking-widest ${muted}`}>System admin</p></div>
      <SystemTabs />
      {children}
    </>
  )
}
