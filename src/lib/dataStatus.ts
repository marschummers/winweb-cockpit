import type { AppMeta } from '../db/types'
import { formatDateTime } from './date'

// Ein echter BWA-Import überschreibt die "Datenstand"-Anzeige dauerhaft - auch wenn zu
// Beginn einmal Demodaten vorhanden waren, zählt ab dem ersten Import nur noch dessen
// Zeitpunkt (lastFinanceImportAt), da importFinanceMonths() die Demodaten dann bereits
// gelöscht hat.
export function describeFinanceDataStatus(appMeta: AppMeta | undefined): string {
  if (appMeta?.lastFinanceImportAt) {
    return `${formatDateTime(appMeta.lastFinanceImportAt)} (BWA-Import)`
  }
  if (appMeta?.demoSeededAt) {
    return `${formatDateTime(appMeta.demoSeededAt)} (Demodaten)`
  }
  return 'keine Daten'
}

// Analog für die Vertriebsseite: ein echter Journal-Import überschreibt dauerhaft die Anzeige.
export function describeSalesDataStatus(appMeta: AppMeta | undefined): string {
  if (appMeta?.lastSalesImportAt) {
    return `${formatDateTime(appMeta.lastSalesImportAt)} (Aktivitätenjournal)`
  }
  if (appMeta?.demoSeededAt) {
    return `${formatDateTime(appMeta.demoSeededAt)} (Demodaten)`
  }
  return 'keine Daten'
}
