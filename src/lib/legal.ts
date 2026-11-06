/** Where the Terms of Service and Privacy Policy are published. Change NEXT_PUBLIC_LEGAL_BASE_URL to move them. */
const base = (process.env.NEXT_PUBLIC_LEGAL_BASE_URL ?? 'https://orvry.github.io/rallyclub').replace(/\/$/, '')
export const LEGAL = { terms: `${base}/terms.html`, privacy: `${base}/privacy.html`, center: `${base}/index.html` }
