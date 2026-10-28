/** Only follow in-site paths after sign-in, so a link cannot send someone to another website. */
export const safeNext = (n: string | null | undefined) => (n && n.startsWith('/') && !n.startsWith('//') ? n : '/')
