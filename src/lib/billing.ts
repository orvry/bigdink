import type { Org } from './types'

/**
 * 'manual'    = the payer scans a GCash, Maya or bank QR and a system admin confirms through the API (use this live).
 * 'simulated' = a fake checkout page for development. 'paymongo' is reserved for later.
 */
export const PAYMENTS_MODE = (process.env.PAYMENTS_MODE ?? 'simulated') as 'simulated' | 'manual' | 'paymongo'
/** Unpaid manual payments stop being accepted after this many hours. */
export const PAYMENT_EXPIRY_HOURS = 48
/** Price per rental day in centavos. Set RENTAL_PRICE_PER_DAY in pesos (default 500). */
export const PRICE_PER_DAY = Math.round(Number(process.env.RENTAL_PRICE_PER_DAY ?? 500) * 100)
export const CURRENCY = 'PHP'
export const MAX_DAYS = 30

export const amountFor = (days: number) => days * PRICE_PER_DAY
export const isRentalActive = (o: Pick<Org, 'rental_until'>) => !!o.rental_until && new Date(o.rental_until).getTime() > Date.now()
export const hoursLeft = (o: Pick<Org, 'rental_until'>) => (o.rental_until ? (new Date(o.rental_until).getTime() - Date.now()) / 36e5 : 0)
export const fmtWhen = (iso: string) =>
  new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: process.env.APP_TIMEZONE ?? 'Asia/Tokyo' })
