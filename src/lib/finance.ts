import type { FinanceMonth } from '../db/types'

// Monate liegen in der DB unsortiert vor (Dexie liefert Einfüge-/Index-Reihenfolge, nicht
// zwingend chronologisch) - für Verlauf und "aktueller Monat" wird explizit nach periodKey
// sortiert (funktioniert als String-Sortierung dank 'YYYY-MM').
export function sortByPeriod(months: FinanceMonth[]): FinanceMonth[] {
  return [...months].sort((a, b) => a.periodKey.localeCompare(b.periodKey))
}

export function getLatestMonth(months: FinanceMonth[]): FinanceMonth | null {
  const sorted = sortByPeriod(months)
  return sorted.length > 0 ? sorted[sorted.length - 1] : null
}

export function getPreviousMonth(months: FinanceMonth[], current: FinanceMonth): FinanceMonth | null {
  const sorted = sortByPeriod(months)
  const idx = sorted.findIndex((m) => m.id === current.id)
  return idx > 0 ? sorted[idx - 1] : null
}

// Relative Veränderung in Prozent, z.B. für "ggü. Vormonat". null, wenn kein Vergleichswert
// existiert oder dieser 0 ist (Division durch 0 ergäbe sonst Infinity/NaN).
export function percentChange(current: number, previous: number | undefined | null): number | null {
  if (previous === undefined || previous === null || previous === 0) return null
  return ((current - previous) / Math.abs(previous)) * 100
}

export function ebitMargin(month: FinanceMonth): number {
  return month.revenue === 0 ? 0 : (month.ebit / month.revenue) * 100
}
