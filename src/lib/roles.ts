import type { Role } from './types'
/** Members joined the group; scorers and admins can also score; only admins manage. Everyone else is a viewer. */
export const canScoreRole = (r: Role) => r === 'admin' || r === 'scorer'
export const isMemberRole = (r: Role) => r !== 'viewer'
