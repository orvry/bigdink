'use client'
import { useContext } from 'react'
import { useFormStatus } from 'react-dom'
import { PendingCtx } from '@/components/ActionForm'

/** Disables itself and shows progress while its form is submitting. pendingText={false} keeps the label and only dims. */
export default function SubmitButton({ children, pendingText = 'Saving…', className = '', name, value, disabled }: {
  children: React.ReactNode
  pendingText?: string | false
  className?: string
  name?: string
  value?: string
  disabled?: boolean
}) {
  const { pending: formPending } = useFormStatus()
  const formWide = useContext(PendingCtx)
  const pending = formPending || formWide
  return (
    <button type="submit" name={name} value={value} disabled={pending || disabled} aria-busy={pending} className={`${className} ${pending ? 'opacity-70' : ''}`}>
      {pending && pendingText ? pendingText : children}
    </button>
  )
}
