import { csvRowsToObjects, decodeCsvFileGeneric, parseCsv } from './csv'
import type { SalesActivity } from '../db/types'
import { mapActivityTypeToPhase } from './salesFunnel'

const COL_DATE = 'Aktivitätsdatum'
const COL_ACTIVITY = 'Aktivität'
const COL_CUSTOMER_NUMBER = 'Kunden-Nr.'
const COL_SEARCH_NAME = 'Suchname'
const COL_TITLE = 'Titel'

export interface ParsedSalesActivity extends Omit<SalesActivity, 'id'> {
  rowNumber: number
}

export interface ParsedSalesImport {
  activities: ParsedSalesActivity[]
  warnings: string[]
  unmappedActivityTypes: string[]
}

export async function decodeSalesJournalFile(file: File): Promise<string> {
  return decodeCsvFileGeneric(file, COL_DATE)
}

// "08.12.2025 12:23:00" -> Timestamp. Gibt null zurück, wenn das Format nicht passt (z.B.
// eine leere oder unerwartet formatierte Zeile), statt eine falsche Zeit zu raten.
function parseGermanDateTime(raw: string): number | null {
  const match = raw.trim().match(/^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/)
  if (!match) return null
  const [, day, month, year, hour, minute, second] = match
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  )
  return Number.isNaN(date.getTime()) ? null : date.getTime()
}

export function parseSalesJournalCsv(text: string): ParsedSalesImport {
  const rows = parseCsv(text, ';')
  const objects = csvRowsToObjects(rows)
  const warnings: string[] = []
  const unmappedTypes = new Set<string>()

  const activities: ParsedSalesActivity[] = []
  objects.forEach((obj, index) => {
    const rowNumber = index + 2 // +1 Kopfzeile, +1 weil index bei 0 beginnt
    const activityDate = parseGermanDateTime(obj[COL_DATE] ?? '')
    const activityType = (obj[COL_ACTIVITY] ?? '').trim()
    const customerNumber = (obj[COL_CUSTOMER_NUMBER] ?? '').trim()

    if (activityDate === null || activityType === '' || customerNumber === '') {
      warnings.push(`Zeile ${rowNumber} übersprungen (Datum, Aktivität oder Kunden-Nr. fehlt).`)
      return
    }

    if (mapActivityTypeToPhase(activityType) === 'unbekannt') {
      unmappedTypes.add(activityType)
    }

    activities.push({
      rowNumber,
      activityDate,
      activityType,
      customerNumber,
      searchName: obj[COL_SEARCH_NAME] ?? '',
      title: obj[COL_TITLE] ?? '',
    })
  })

  if (unmappedTypes.size > 0) {
    warnings.push(
      `Aktivitätstypen ohne Phasen-Zuordnung gefunden (z.B. Kontaktaktivitäten wie E-Mail/Anruf - das ist normal, sie verändern nur nicht die Phase): ${Array.from(unmappedTypes).join(', ')}`,
    )
  }

  return { activities, warnings, unmappedActivityTypes: Array.from(unmappedTypes) }
}
