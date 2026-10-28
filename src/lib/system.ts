import { getProfile } from '@/lib/auth'
/** System admins run the platform (payment accounts). Set by hand in the database. */
export const isSystemAdmin = async () => (await getProfile())?.is_system_admin === true
