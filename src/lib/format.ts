/** Money for screens (symbol) or PDFs (3-letter code, which the built-in PDF fonts can always print). */
export function money(n: number, currency: string, code = false) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, currencyDisplay: code ? 'code' : 'symbol' }).format(n)
  } catch {
    return `${currency} ${n.toFixed(2)}`
  }
}
