'use client'
import { createContext, startTransition, useActionState, useEffect, useRef } from 'react'
import type { FormState } from '@/lib/types'

export const PendingCtx = createContext(false)

/**
 * A form that shows "saving", then a success or error message under the buttons.
 * Typed values stay in the fields if something goes wrong, and are cleared after a successful save.
 */
export default function ActionForm({ action, children, className, keepOnSuccess = false }: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>
  children: React.ReactNode
  className?: string
  keepOnSuccess?: boolean
}) {
  const [state, formAction, pending] = useActionState(action, null)
  const ref = useRef<HTMLFormElement>(null)
  useEffect(() => { if (state?.ok && !keepOnSuccess) ref.current?.reset() }, [state, keepOnSuccess])
  return (
    <form
      ref={ref}
      className={className}
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter)
        startTransition(() => formAction(fd))
      }}
    >
      <PendingCtx.Provider value={pending}>{children}</PendingCtx.Provider>
      <div aria-live="polite">
        {state?.error && <p role="alert" className="text-sm font-semibold text-red-700 dark:text-red-400">{state.error}</p>}
        {state?.ok && <p role="status" className="text-sm font-semibold text-[color:var(--link)]">✓ {state.ok}</p>}
      </div>
    </form>
  )
}
