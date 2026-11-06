import { BRAND } from '@/lib/brand'
import { LEGAL } from '@/lib/legal'

/** Small footer with the legal links. They open in a new tab so nobody loses their place. */
export default function Footer({ className = '' }: { className?: string }) {
  const link = 'font-semibold text-[color:var(--link)] hover:underline'
  return (
    <footer className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-[color:var(--line)] py-4 text-xs text-[color:var(--muted)] ${className}`}>
      <span>© {new Date().getFullYear()} {BRAND.name}</span>
      <a href={LEGAL.terms} target="_blank" rel="noopener noreferrer" className={link}>Terms of Service</a>
      <a href={LEGAL.privacy} target="_blank" rel="noopener noreferrer" className={link}>Privacy Policy</a>
    </footer>
  )
}
