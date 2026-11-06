import type { ReactNode } from 'react'

/** A grey block that pulses while content loads. Hidden from screen readers; the wrapper announces "Loading". */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-xl bg-[var(--chip)] ${className}`} />
}

/** Wraps a skeleton so assistive technology hears that something is loading. */
export function LoadingRegion({ label = 'Loading', children, className = 'flex flex-col gap-4' }: { label?: string; children: ReactNode; className?: string }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className={className}>
      <span className="sr-only">{label}…</span>
      {children}
    </div>
  )
}

const panel = 'rounded-2xl border border-[color:var(--line)] bg-[var(--card)] p-4'

/** Tournament dashboard: banner, four stat cards, panels. */
export function DashboardSkeleton() {
  return (
    <LoadingRegion label="Loading the tournament">
      <Skeleton className="h-44 !rounded-3xl md:h-52" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-36" />)}</div>
      <div className="grid gap-4 lg:grid-cols-3"><Skeleton className="h-72 lg:col-span-2" /><Skeleton className="h-72" /></div>
      <div className="grid gap-4 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-56" />)}</div>
    </LoadingRegion>
  )
}

/** Feeds: a header card, cards in a column, and a side column. */
export function FeedSkeleton() {
  return (
    <LoadingRegion label="Loading">
      <Skeleton className="h-8 w-56" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-8">
        <div className="flex flex-col gap-3">
          <div className="flex gap-2"><Skeleton className="h-11 w-32" /><Skeleton className="h-11 w-24" /><Skeleton className="h-12 flex-1" /></div>
          {[0, 1].map((i) => <div key={i} className={`${panel} flex flex-col gap-3`}><div className="flex items-center gap-3"><Skeleton className="h-10 w-10 !rounded-full" /><Skeleton className="h-5 w-48" /></div><Skeleton className="h-6 w-2/3" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-10 w-40" /></div>)}
        </div>
        <Skeleton className="hidden h-56 lg:block" />
      </div>
    </LoadingRegion>
  )
}

/** Admin and system lists: a title, a list on the left, a form on the right. */
export function ListSkeleton() {
  return (
    <LoadingRegion label="Loading">
      <Skeleton className="h-9 w-64" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div>
        <Skeleton className="h-96" />
      </div>
    </LoadingRegion>
  )
}

/** Standings: title, tabs, rounded rows. */
export function TableSkeleton() {
  return (
    <LoadingRegion label="Loading standings">
      <Skeleton className="h-9 w-48" />
      <div className="flex gap-2"><Skeleton className="h-11 w-32" /><Skeleton className="h-11 w-32" /></div>
      <div className="flex flex-col gap-2">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 !rounded-2xl" />)}</div>
    </LoadingRegion>
  )
}

/** Bracket: title, tabs, a grid of small game cards. */
export function BracketSkeleton() {
  return (
    <LoadingRegion label="Loading the bracket">
      <Skeleton className="h-9 w-40" />
      <div className="flex gap-2"><Skeleton className="h-11 w-32" /><Skeleton className="h-11 w-32" /></div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">{[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <Skeleton key={i} className="h-20" />)}</div>
      <Skeleton className="h-40" />
    </LoadingRegion>
  )
}

/** Live game: status, big scoreboard, player stats. */
export function ScoreboardSkeleton() {
  return (
    <LoadingRegion label="Loading the game">
      <Skeleton className="h-5 w-52" />
      <Skeleton className="h-8 w-40 !rounded-full" />
      <Skeleton className="h-64 !rounded-2xl" />
      <Skeleton className="h-40" />
    </LoadingRegion>
  )
}

/** Scoring screen: scoreboard and the four player tiles. */
export function ScorerSkeleton() {
  return (
    <LoadingRegion label="Loading the game to score">
      <Skeleton className="h-5 w-64" />
      <Skeleton className="h-28" />
      <div className="grid gap-4 md:grid-cols-2">{[0, 1].map((i) => <div key={i} className="flex gap-2.5"><Skeleton className="h-32 flex-1 !rounded-2xl md:h-44" /><Skeleton className="h-32 flex-1 !rounded-2xl md:h-44" /></div>)}</div>
      <div className="grid gap-2.5 md:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}</div>
    </LoadingRegion>
  )
}

/** Big screen: fills the window like the real one. */
export function ScreenSkeleton() {
  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-[var(--bg)] p-4 md:p-8">
      <LoadingRegion label="Loading the big screen">
        <Skeleton className="h-12 w-72" />
        <div className="grid gap-4 lg:grid-cols-3 lg:gap-8"><Skeleton className="h-80 lg:col-span-2" /><Skeleton className="h-80" /></div>
      </LoadingRegion>
    </div>
  )
}

/** A single narrow card: join pages, payment, sign-in style screens. */
export function CardPageSkeleton() {
  return (
    <LoadingRegion label="Loading" className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <Skeleton className="h-8 w-56" /><Skeleton className="h-4 w-72" /><Skeleton className="h-56" /><Skeleton className="h-12" />
    </LoadingRegion>
  )
}
