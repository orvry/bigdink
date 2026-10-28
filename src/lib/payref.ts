/** Reference numbers are compared without spaces, dashes or letter case: "1234 567-890" equals "1234567890". */
export const normalizeRef = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '')

/**
 * Date and time from a payment app. Must be ISO 8601. With no timezone we assume Philippine time (UTC+8),
 * because that is where GCash, Maya and the banks report it. Returns null when it cannot be read.
 */
export function parseWhen(input: string): Date | null {
  const t = input.trim().replace(' ', 'T')
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(t)) return null
  const withZone = /(Z|[+-]\d{2}:?\d{2})$/i.test(t) ? t : `${t}+08:00`
  const d = new Date(withZone)
  return Number.isNaN(d.getTime()) ? null : d
}
