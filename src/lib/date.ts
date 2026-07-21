export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// Für die "Datenstand"-Anzeige: Datum + Uhrzeit, damit erkennbar ist, ob der letzte Import
// heute Morgen oder vor drei Tagen war.
export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatShortDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

export function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Zeitraum-Schlüssel für BWA-Monate, Format 'YYYY-MM' (sortierbar als String).
export function periodKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function currentPeriodKey(now = new Date()): string {
  return periodKey(now.getFullYear(), now.getMonth() + 1);
}

// Verschiebt einen Zeitraum-Schlüssel um eine bestimmte Anzahl Monate (auch rückwärts).
export function shiftPeriodKey(key: string, deltaMonths: number): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + deltaMonths, 1);
  return periodKey(d.getFullYear(), d.getMonth() + 1);
}

const MONTH_LABELS = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
];

export function periodKeyToLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return `${MONTH_LABELS[m - 1]} ${y}`;
}

export function periodKeyToShortLabel(key: string): string {
  const [, m] = key.split('-').map(Number);
  return MONTH_LABELS[m - 1].slice(0, 3);
}

// Für Chart-Achsen über mehrjährige Zeiträume (BWA-Monate): Monat + zweistelliges Jahr, damit
// z.B. Juli 2025 und Juli 2026 unterscheidbar bleiben (formatShortDate zeigt nur Tag.Monat).
export function formatMonthYearShort(timestamp: number): string {
  const d = new Date(timestamp);
  return `${MONTH_LABELS[d.getMonth()].slice(0, 3)} ${String(d.getFullYear()).slice(-2)}`;
}
