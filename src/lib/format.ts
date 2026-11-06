/** Money for screens (symbol) or PDFs (3-letter code, which the built-in PDF fonts can always print). */
export function money(n: number, currency: string, code = false) {
  // No decimals for whole amounts (₱500). Amounts that do have cents keep two decimals.
  const whole = Math.round(n * 100) % 100 === 0
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, currencyDisplay: code ? 'code' : 'symbol', minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 }).format(n)
  } catch {
    return `${currency} ${n.toFixed(2)}`
  }
}
