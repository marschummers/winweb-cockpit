import type { FinanceMonth } from '../db/types'
import { shiftPeriodKey } from './date'

export type RatioStatus = 'good' | 'bad'

export interface RatioDefinition {
  label: string
  description: string
  guideline: string
  unit: '%' | 'x'
  value: (month: FinanceMonth) => number | null
  status: (value: number) => RatioStatus
  // true, wenn zusätzlich zum Monatswert ein rollierender 3-Monats-Schnitt gezeigt werden soll
  // (glättet Ausreißer durch Sondereffekte wie Messebesuche). Bei der Personalquote nicht
  // gewünscht (siehe Absprache mit dem Nutzer).
  smoothed?: boolean
}

// Ergebnis vor Steuern im Verhältnis zur Gesamtleistung - beschreibt die operative
// Rentabilität: wie viel Ergebnis bleibt von der Gesamtleistung übrig. Nur der Richtwert
// als UNTERGRENZE wird als Warnung markiert, da hier "je höher desto besser" gilt.
export const EBIT_QUOTE: RatioDefinition = {
  label: 'EBIT-Quote',
  description: 'Ergebnis vor Steuern im Verhältnis zur Gesamtleistung - operative Rentabilität.',
  guideline: 'Richtwert 10-25 %, je höher desto besser',
  unit: '%',
  // !totalOutput statt "=== 0": fängt auch Monate ab, die noch aus einer Zeit vor Einführung
  // dieses Felds stammen (dort ist totalOutput undefined, nicht 0) - sonst würde die Division
  // undefined/undefined ein stilles NaN statt eines sauberen "keine Daten" ergeben.
  value: (month) => (!month.totalOutput ? null : (month.resultBeforeTax / month.totalOutput) * 100),
  status: (value) => (value < 10 ? 'bad' : 'good'),
  smoothed: true,
}

// Gesamtkosten (inkl. Personal) im Verhältnis zum Rohertrag - wie viel vom Rohertrag für
// laufende Kosten gebraucht wird. Hier gilt "je kleiner desto effizienter", deshalb wird nur
// die OBERGRENZE als Warnung markiert.
export const COST_TO_GROSS_PROFIT: RatioDefinition = {
  label: 'GK/Rohertrag',
  description: 'Gesamtkosten im Verhältnis zum Rohertrag - wie viel vom Rohertrag laufende Kosten aufzehren.',
  guideline: 'Richtwert 0,70-0,80, je kleiner desto effizienter',
  unit: 'x',
  value: (month) => (!month.grossProfit ? null : (month.costs + month.personnelCosts) / month.grossProfit),
  status: (value) => (value > 0.8 ? 'bad' : 'good'),
  smoothed: true,
}

// Personalkosten im Verhältnis zur Gesamtleistung - Anteil der Personalkosten an der
// Gesamtleistung. Auch hier "je kleiner desto besser", nur die Obergrenze wird markiert.
export const PERSONNEL_QUOTE: RatioDefinition = {
  label: 'Personalquote',
  description: 'Personalkosten im Verhältnis zur Gesamtleistung - Anteil der Personalkosten am erwirtschafteten Ergebnis.',
  guideline: 'Richtwert 60-70 %, je kleiner desto besser',
  unit: '%',
  value: (month) => (!month.totalOutput ? null : (month.personnelCosts / month.totalOutput) * 100),
  status: (value) => (value > 70 ? 'bad' : 'good'),
}

export const FINANCE_RATIOS: RatioDefinition[] = [EBIT_QUOTE, COST_TO_GROSS_PROFIT, PERSONNEL_QUOTE]

// Rollierender Schnitt aus dem Monat selbst und den (exakt) zwei vorangegangenen Kalender-
// monaten - glättet Ausreißer durch Sondereffekte (z.B. Messebesuche). Fehlt einer der Vor-
// monate in den Daten, wird nur über die tatsächlich vorhandenen Werte gemittelt (z.B. am
// Anfang der Zeitreihe), statt gar keinen Wert zu zeigen.
export function rollingAverage(
  months: FinanceMonth[],
  current: FinanceMonth,
  valueFn: (month: FinanceMonth) => number | null,
  windowSize = 3,
): number | null {
  const values: number[] = []
  for (let offset = 0; offset < windowSize; offset++) {
    const targetKey = shiftPeriodKey(current.periodKey, -offset)
    const month = months.find((m) => m.periodKey === targetKey)
    if (!month) continue
    const value = valueFn(month)
    if (value !== null) values.push(value)
  }
  if (values.length === 0) return null
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

// Dezember/Januar: BWA-Werte laufen zum Jahreswechsel oft aus dem Ruder (Abgrenzungen,
// Jahresendbuchungen, Betriebsferien) und sind laut Nutzer kaum interpretierbar - diese
// Monate werden auf der Finanzen-Seite und im Cockpit farblich als eingeschränkt
// aussagekräftig markiert statt stillschweigend wie jeder andere Monat behandelt zu werden.
export function isYearEndMonth(periodKey: string): boolean {
  const month = periodKey.split('-')[1]
  return month === '12' || month === '01'
}
