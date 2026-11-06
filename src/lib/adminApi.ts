import { createHash, timingSafeEqual } from 'node:crypto'

/** Checks the "Authorization: Bearer <ADMIN_API_KEY>" header. The key is a long random secret kept in the server environment. */
export function isAdminRequest(req: Request) {
  const key = process.env.ADMIN_API_KEY
  if (!key || key.length < 24) return false // refuse to run with a missing or weak key
  const given = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  const a = createHash('sha256').update(given).digest()
  const b = createHash('sha256').update(key).digest()
  return timingSafeEqual(a, b)
}
export const unauthorized = () => Response.json({ error: 'Unauthorized' }, { status: 401 })
