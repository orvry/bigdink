import { PDFDocument, StandardFonts, rgb, type Color, type PDFFont, type PDFPage } from 'pdf-lib'
import { BRAND } from './brand'

export const W = 595.28, H = 841.89, M = 48
// Rally Pop: ink #172033, muted #5B6475, Rally Blue #2457E6, border #DDE2EC
export const INK = rgb(0.09, 0.125, 0.2), MUTED = rgb(0.357, 0.392, 0.459), ACCENT = rgb(0.141, 0.341, 0.902), LINE = rgb(0.867, 0.886, 0.925)

// Standard PDF fonts only cover Latin-1, so swap anything else for a safe character.
export const clean = (s: unknown) =>
  String(s ?? '').replace(/[\u2013\u2014]/g, '-').replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[^\x20-\x7E\xA0-\xFF]/g, '?')

export class Doc {
  pdf!: PDFDocument
  font!: PDFFont
  bold!: PDFFont
  page!: PDFPage
  y = 0
  static async create() {
    const d = new Doc()
    d.pdf = await PDFDocument.create()
    d.font = await d.pdf.embedFont(StandardFonts.Helvetica)
    d.bold = await d.pdf.embedFont(StandardFonts.HelveticaBold)
    d.newPage()
    return d
  }
  newPage() { this.page = this.pdf.addPage([W, H]); this.y = H - M }
  ensure(h: number) { if (this.y - h < M + 20) this.newPage() }
  fit(t: string, f: PDFFont, size: number, maxW: number) {
    let s = clean(t)
    if (f.widthOfTextAtSize(s, size) <= maxW) return s
    while (s.length > 1 && f.widthOfTextAtSize(s + '...', size) > maxW) s = s.slice(0, -1)
    return s + '...'
  }
  /** center / right: width of the column the text sits in (x is its left edge). */
  text(t: unknown, x: number, o: { size?: number; bold?: boolean; color?: Color; maxW?: number; center?: number; right?: number } = {}) {
    const size = o.size ?? 10, f = o.bold ? this.bold : this.font
    const s = o.maxW ? this.fit(String(t ?? ''), f, size, o.maxW) : clean(t)
    if (o.center) x = x + (o.center - f.widthOfTextAtSize(s, size)) / 2
    if (o.right) x = x + o.right - f.widthOfTextAtSize(s, size)
    this.page.drawText(s, { x, y: this.y - size, size, font: f, color: o.color ?? INK })
  }
  rule() { this.page.drawLine({ start: { x: M, y: this.y }, end: { x: W - M, y: this.y }, thickness: 0.5, color: LINE }) }
  gap(n: number) { this.y -= n }
  heading(t: string) { this.ensure(40); this.gap(14); this.text(t, M, { size: 14, bold: true, color: ACCENT }); this.gap(22) }
  footers() {
    const pages = this.pdf.getPages()
    pages.forEach((p, i) => {
      p.drawText(BRAND.name, { x: M, y: 28, size: 8, font: this.font, color: MUTED })
      const label = `Page ${i + 1} of ${pages.length}`
      p.drawText(label, { x: W - M - this.font.widthOfTextAtSize(label, 8), y: 28, size: 8, font: this.font, color: MUTED })
    })
  }
}
