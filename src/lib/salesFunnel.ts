import type { SalesActivity } from '../db/types'

// Die fünf Trichter-Phasen (siehe Absprache mit dem Nutzer) plus zwei Sonderstatus:
// "verloren" (Lost Order - beendet den Trichter für diesen Kunden) und "unbekannt" (eine
// Aktivitätsbezeichnung, die keiner Phase zugeordnet werden konnte - taucht sie auf, ist das
// ein Hinweis, dass das Journal-Format sich geändert hat oder die Zuordnung erweitert werden muss).
export const FUNNEL_PHASES = ['anfrage', 'praesentation', 'richtpreisangebot', 'angebot', 'kunde'] as const
export type FunnelPhase = (typeof FUNNEL_PHASES)[number] | 'verloren' | 'unbekannt'

export const FUNNEL_PHASE_LABELS: Record<FunnelPhase, string> = {
  anfrage: 'Anfrage',
  praesentation: 'Präsentation',
  richtpreisangebot: 'Richtpreisangebot',
  angebot: 'Angebot',
  kunde: 'Kunde',
  verloren: 'Verloren',
  unbekannt: 'Unbekannt',
}

// Ordnet die rohe Aktivitätsbezeichnung aus dem Journal einer Funnel-Phase zu. "Präsentation"
// wird per Präfix erkannt (nicht nur "Präsentation online"), damit künftige Varianten wie
// "Präsentation vor Ort" automatisch mitgezählt werden. "K U N D E" kommt im System offenbar
// mit Leerzeichen zwischen den Buchstaben - Leerzeichen werden deshalb vor dem Vergleich entfernt.
export function mapActivityTypeToPhase(activityType: string): FunnelPhase {
  const trimmed = activityType.trim()
  const normalized = trimmed.toLowerCase().replace(/\s+/g, '')

  if (normalized === 'lostorder') return 'verloren'
  if (normalized === 'kunde') return 'kunde'
  if (trimmed.toLowerCase().startsWith('präsentation')) return 'praesentation'
  if (normalized === 'richtpreisangebot') return 'richtpreisangebot'
  if (normalized === 'angebot') return 'angebot'
  if (normalized === 'erstgesprächonline/telefonisch' || normalized === 'interessenten-anfrage') return 'anfrage'
  return 'unbekannt'
}

// Extrahiert einen Preis aus dem Titel-Feld, z.B. "218.200,--" -> 218200. Das Feld ist
// uneinheitlich befüllt (mal Preis, mal Freitext wie "Demo" oder "Sonstige Gründe") und
// enthält reale Tippfehler wie "55.300.-" oder "98.300.,--" - deshalb wird nicht auf ein
// exaktes Format geprüft, sondern der führende Zahlen-/Trennzeichen-Block toleranter
// interpretiert. Gibt null zurück, wenn der Titel erkennbar kein Preis ist (beginnt nicht
// mit einer Ziffer). Kauf- und Mietangaben (z.B. "990Euro/Monat") werden absichtlich NICHT
// unterschieden oder hochgerechnet - der Rohwert wird 1:1 übernommen (Absprache mit Nutzer).
export function parsePriceFromTitle(title: string): number | null {
  const trimmed = title.trim()
  if (!/^\d/.test(trimmed)) return null

  const match = trimmed.match(/^[\d.,]+/)
  if (!match) return null

  let numeric = match[0].replace(/[.,]+$/, '')
  if (numeric === '') return null

  const lastComma = numeric.lastIndexOf(',')
  const lastDot = numeric.lastIndexOf('.')
  const lastSep = Math.max(lastComma, lastDot)
  const digitsAfterSep = numeric.length - lastSep - 1

  let integerPart = numeric
  let decimalPart = ''
  if (lastSep !== -1 && digitsAfterSep >= 1 && digitsAfterSep <= 2) {
    integerPart = numeric.slice(0, lastSep)
    decimalPart = numeric.slice(lastSep + 1)
  }

  const cleanedInteger = integerPart.replace(/[.,]/g, '')
  if (cleanedInteger === '') return null
  const value = Number.parseFloat(cleanedInteger + (decimalPart ? '.' + decimalPart : ''))
  return Number.isNaN(value) ? null : Math.round(value)
}

export interface LastContact {
  activityType: string
  daysAgo: number
}

export interface CustomerFunnelStatus {
  customerNumber: string
  searchName: string
  phase: FunnelPhase
  // Die rohe Aktivitätsbezeichnung der Aktivität, die die Phase bestimmt hat, z.B.
  // "Präsentation online" - nützlich in der Anzeige, auch wenn "phase" schon die
  // normalisierte Kategorie ist.
  rawActivityType: string
  lastActivityDate: number
  daysSinceLastActivity: number
  price: number | null
  title: string
  // Gesetzt, wenn es NACH der phasenbestimmenden Aktivität noch einen reinen Kontakt gab
  // (z.B. eine E-Mail oder ein Anruf, die keine Phase auslösen) - sonst null, um auf der
  // Kundenkarte keine Information doppelt anzuzeigen (siehe SalesPage.tsx).
  lastContact: LastContact | null
}

// Nur die Felder, die für die Aggregation tatsächlich gebraucht werden - so lässt sich die
// Funktion sowohl mit bereits gespeicherten SalesActivity-Objekten (mit id) als auch mit
// frisch geparsten Import-Zeilen (noch ohne id) aufrufen.
type ActivityLike = Pick<SalesActivity, 'activityDate' | 'activityType' | 'customerNumber' | 'searchName' | 'title'>

function daysBetween(now: number, timestamp: number): number {
  return Math.floor((now - timestamp) / (24 * 60 * 60 * 1000))
}

// Aggregiert Rohaktivitäten pro Kunden-Nr. Die Phase wird NICHT einfach von der zeitlich
// neuesten Aktivität übernommen, sondern von der neuesten Aktivität, die sich überhaupt einer
// Phase zuordnen lässt - reine Kontaktaktivitäten wie E-Mails oder Anrufe (falls das Journal
// künftig um sie erweitert wird) verändern die Phase nicht, sonst würde ein Kunde mitten im
// Angebot nach einer Nachfass-Mail fälschlich in "Unbekannt" rutschen. Der tatsächlich
// jüngste Kontakt (egal welchen Typs) wird trotzdem festgehalten (lastContact), falls er
// neuer ist als die phasenbestimmende Aktivität.
export function computeCustomerFunnelStatuses(activities: ActivityLike[], now = Date.now()): CustomerFunnelStatus[] {
  const byCustomer = new Map<string, ActivityLike[]>()
  for (const activity of activities) {
    const list = byCustomer.get(activity.customerNumber)
    if (list) list.push(activity)
    else byCustomer.set(activity.customerNumber, [activity])
  }

  const statuses: CustomerFunnelStatus[] = []
  for (const customerActivities of byCustomer.values()) {
    const sorted = [...customerActivities].sort((a, b) => b.activityDate - a.activityDate)
    const mostRecentContact = sorted[0]
    const phaseActivity = sorted.find((a) => mapActivityTypeToPhase(a.activityType) !== 'unbekannt') ?? mostRecentContact

    const hasNewerContact = mostRecentContact.activityDate > phaseActivity.activityDate
    statuses.push({
      customerNumber: phaseActivity.customerNumber,
      searchName: phaseActivity.searchName,
      phase: mapActivityTypeToPhase(phaseActivity.activityType),
      rawActivityType: phaseActivity.activityType,
      lastActivityDate: phaseActivity.activityDate,
      daysSinceLastActivity: daysBetween(now, phaseActivity.activityDate),
      price: parsePriceFromTitle(phaseActivity.title),
      title: phaseActivity.title,
      lastContact: hasNewerContact
        ? { activityType: mostRecentContact.activityType, daysAgo: daysBetween(now, mostRecentContact.activityDate) }
        : null,
    })
  }
  return statuses
}

export function groupByPhase(statuses: CustomerFunnelStatus[]): Record<FunnelPhase, CustomerFunnelStatus[]> {
  const grouped: Record<FunnelPhase, CustomerFunnelStatus[]> = {
    anfrage: [],
    praesentation: [],
    richtpreisangebot: [],
    angebot: [],
    kunde: [],
    verloren: [],
    unbekannt: [],
  }
  for (const status of statuses) {
    grouped[status.phase].push(status)
  }
  for (const phase of Object.keys(grouped) as FunnelPhase[]) {
    grouped[phase].sort((a, b) => b.daysSinceLastActivity - a.daysSinceLastActivity)
  }
  return grouped
}
