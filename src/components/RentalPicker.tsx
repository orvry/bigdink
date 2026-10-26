'use client'
import { useState } from 'react'
import { money } from '@/lib/format'
import { input, label } from '@/lib/ui'

/** Days input that shows the price as you type. pricePerDay is in centavos. */
export default function RentalPicker({ pricePerDay, max = 30, defaultDays = 1 }: { pricePerDay: number; max?: number; defaultDays?: number }) {
  const [days, setDays] = useState(defaultDays)
  const d = Math.min(max, Math.max(1, days || 1))
  return (
    <div className="flex flex-col gap-2">
      <label className={label}>Rental days (1 to {max})
        <input name="days" type="number" min={1} max={max} value={days || ''} onChange={(e) => setDays(Number(e.target.value))} className={input} />
      </label>
      <div className="flex items-center justify-between rounded-xl bg-[var(--chip)] p-3 text-sm">
        <span>{d} day{d === 1 ? '' : 's'} × {money(pricePerDay / 100, 'PHP')}</span>
        <b className="text-base">{money((d * pricePerDay) / 100, 'PHP')}</b>
      </div>
    </div>
  )
}
