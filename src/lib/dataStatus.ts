import type { AppMeta } from '../db/types'
import { formatDateTime } from './date'

// Ein echter BWA-Import überschreibt die "Datenstand"-Anzeige dauerhaft - auch wenn zu
// Beginn einmal Demodaten vorhanden waren, zählt ab dem ersten Import nur noch dessen
// Zeitpunkt (lastFinanceImportAt), da importFinanceMonths() die Demodaten dann bereits
// gelöscht hat.
export function describeDataStatus(appMeta: AppMeta | undefined): string {
  if (appMeta?.lastFinanceImportAt) {
    return `${formatDateTime(appMeta.lastFinanceImportAt)} (BWA-Import)`
  }
  if (appMeta?.demoSeededAt) {
    return `${formatDateTime(appMeta.demoSeededAt)} (Demodaten)`
  }
  return 'keine Daten'
}
