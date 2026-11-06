import Logo from '@/components/Logo'
import UserMenu from '@/components/UserMenu'

const wrap = 'mx-auto w-full max-w-md md:max-w-3xl lg:max-w-5xl'

/** Pages outside a group (feed, sign in, payments): a simple top bar, no sidebar. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-[color:var(--line)] bg-[var(--card)]">
        <div className={`${wrap} flex items-center justify-between px-4 py-3 md:px-8`}>
          <Logo />
          <UserMenu />
        </div>
      </header>
      <main className={`${wrap} flex flex-col gap-4 px-5 py-4 md:px-8 md:py-6`}>{children}</main>
    </>
  )
}
