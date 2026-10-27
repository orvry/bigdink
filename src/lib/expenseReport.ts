import { Doc, M, W, MUTED, ACCENT } from './pdf'
import { money } from './format'
import type { Expense } from './types'

export type ExpenseReportData = {
  orgName: string
  tournament: { name: string; date?: string | null; currency: string }
  expenses: Expense[]
  players: { name: string; team: string }[]
  generatedAt: string
}

export async function buildExpenseReport(r: ExpenseReportData): Promise<Uint8Array> {
  const d = await Doc.create()
  const cur = r.tournament.currency
  const fmt = (n: number) => money(n, cur, true)
  const total = r.expenses.reduce((a, e) => a + Number(e.amount), 0)
  const perPlayer = r.players.length ? total / r.players.length : 0
  const right = W - M

  d.text('Expense report', M, { size: 24, bold: true }); d.gap(32)
  d.text(`${r.orgName} - ${r.tournament.name}${r.tournament.date ? ` - ${r.tournament.date}` : ''}`, M, { color: MUTED }); d.gap(14)
  d.text(`Generated ${r.generatedAt}. Amounts in ${cur}.`, M, { color: MUTED, size: 9 }); d.gap(10)
  d.rule()

  d.heading('Summary')
  const stat = (label: string, value: string, x: number) => {
    d.text(label, x, { size: 9, color: MUTED }); d.gap(13); d.text(value, x, { size: 18, bold: true }); d.gap(-13)
  }
  stat('Total expenses', fmt(total), M); stat('Players', String(r.players.length), M + 190); stat('Cost per player', fmt(perPlayer), M + 330)
  d.gap(46)

  // by category
  const cats = new Map<string, number>()
  for (const e of r.expenses) cats.set(e.category, (cats.get(e.category) ?? 0) + Number(e.amount))
  d.heading('Expenses by category')
  if (cats.size === 0) { d.text('No expenses recorded.', M, { color: MUTED }); d.gap(16) }
  else {
    d.text('Category', M, { size: 8, bold: true, color: MUTED }); d.text('Share', M + 300, { size: 8, bold: true, color: MUTED, right: 60 }); d.text('Amount', M + 380, { size: 8, bold: true, color: MUTED, right: right - M - 380 })
    d.gap(14); d.rule(); d.gap(4)
    for (const [c, v] of [...cats.entries()].sort((a, b) => b[1] - a[1])) {
      d.ensure(20)
      d.text(c, M, { maxW: 280 }); d.text(total ? `${Math.round((v / total) * 100)}%` : '', M + 300, { right: 60 }); d.text(fmt(v), M + 380, { right: right - M - 380 })
      d.gap(17)
    }
  }

  // itemized
  d.heading('All expenses')
  const items = [...r.expenses].sort((a, b) => a.spent_on.localeCompare(b.spent_on))
  const head = () => {
    d.text('Date', M, { size: 8, bold: true, color: MUTED }); d.text('Category', M + 72, { size: 8, bold: true, color: MUTED })
    d.text('Description', M + 200, { size: 8, bold: true, color: MUTED }); d.text('Amount', M + 400, { size: 8, bold: true, color: MUTED, right: right - M - 400 })
    d.gap(14); d.rule(); d.gap(4)
  }
  if (items.length === 0) { d.text('No expenses recorded.', M, { color: MUTED }); d.gap(16) }
  else {
    d.ensure(40); head()
    for (const e of items) {
      if (d.y - 18 < M + 20) { d.newPage(); head() }
      d.text(e.spent_on, M); d.text(e.category, M + 72, { maxW: 122, size: 9 }); d.text(e.description, M + 200, { maxW: 196, size: 9 })
      d.text(fmt(Number(e.amount)), M + 400, { right: right - M - 400 })
      d.gap(17)
    }
    d.rule(); d.gap(6)
    d.text('Total', M + 200, { bold: true }); d.text(fmt(total), M + 400, { bold: true, right: right - M - 400 }); d.gap(20)
  }

  // per player
  d.heading('Cost per player')
  d.text(`${fmt(total)} divided equally among ${r.players.length} player${r.players.length === 1 ? '' : 's'} = ${fmt(perPlayer)} each.`, M, { bold: true, color: ACCENT }); d.gap(18)
  if (r.players.length) {
    const headP = () => {
      d.text('Player', M, { size: 8, bold: true, color: MUTED }); d.text('Team', M + 220, { size: 8, bold: true, color: MUTED })
      d.text('Amount due', M + 400, { size: 8, bold: true, color: MUTED, right: right - M - 400 })
      d.gap(14); d.rule(); d.gap(4)
    }
    d.ensure(40); headP()
    for (const p of r.players) {
      if (d.y - 18 < M + 20) { d.newPage(); headP() }
      d.text(p.name, M, { maxW: 210 }); d.text(p.team, M + 220, { maxW: 170, color: MUTED }); d.text(fmt(perPlayer), M + 400, { right: right - M - 400 })
      d.gap(17)
    }
  }
  d.gap(6)
  d.text('The cost is split equally. Amounts are rounded for display, so the per-player amounts may differ from the total by a small rounding difference.', M, { size: 7.5, color: MUTED })
  d.footers()
  return d.pdf.save()
}
