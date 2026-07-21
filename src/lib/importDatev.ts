import { periodKey } from './date';

// Die vier Zeilen, die wir aus der DATEV-BWA-Entwicklungsübersicht in unser Cockpit übernehmen.
// "Kosten" bilden wir bewusst als Gesamtkosten OHNE Personalkosten, weil "Gesamtkosten" in der
// DATEV-BWA die Personalkosten bereits mit einschließt (sie steht als erste Zeile unter
// "Kostenarten:"). "Betriebsergebnis" ist das operative Ergebnis vor Zinsen/neutralem
// Ergebnis - der EBIT-nächste Wert in dieser BWA-Form (siehe Absprache mit dem Nutzer).
const ROW_REVENUE = 'Umsatzerlöse';
const ROW_TOTAL_COSTS = 'Gesamtkosten';
const ROW_PERSONNEL_COSTS = 'Personalkosten';
const ROW_EBIT = 'Betriebsergebnis';
// Zusätzliche Zeilen, nur für die Kennzahlen EBIT-Quote/GK-Rohertrag/Personalquote gebraucht
// (siehe lib/ratios.ts) - nicht für die vier Basis-Kennzahlen oben.
const ROW_TOTAL_OUTPUT = 'Gesamtleistung';
const ROW_GROSS_PROFIT = 'Rohertrag';
const ROW_RESULT_BEFORE_TAX = 'Ergebnis vor Steuern';

const MONTH_ABBREVIATIONS: Record<string, number> = {
  Jan: 1,
  Feb: 2,
  Mrz: 3,
  Apr: 4,
  Mai: 5,
  Jun: 6,
  Jul: 7,
  Aug: 8,
  Sep: 9,
  Okt: 10,
  Nov: 11,
  Dez: 12,
};

export interface ParsedFinanceMonth {
  periodKey: string;
  label: string;
  revenue: number;
  costs: number;
  personnelCosts: number;
  ebit: number;
  totalOutput: number;
  grossProfit: number;
  resultBeforeTax: number;
  // true, wenn für diesen Monat alle vier Basis-Werte leer/0 waren (typisch für den laufenden,
  // noch nicht abgeschlossenen Monat am rechten Rand einer BWA-Entwicklungsübersicht).
  looksEmpty: boolean;
}

export interface ParsedFinanceImport {
  companyName: string | null;
  months: ParsedFinanceMonth[];
  warnings: string[];
}

// DATEV exportiert BWA-CSVs standardmäßig als ANSI (Windows-1252), nicht als UTF-8. Ein
// direkter UTF-8-Decode von Windows-1252-Bytes erzeugt entweder das Replacement-Zeichen
// (bei ungültigen Byte-Folgen) oder lesbaren, aber falschen Text (bei zufällig gültigen
// Folgen) - deshalb wird zuerst UTF-8 versucht und bei Anzeichen von Fehlkodierung auf
// Windows-1252 zurückgefallen, statt die Kodierung blind anzunehmen.
export async function decodeCsvFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const utf8 = new TextDecoder('utf-8').decode(buffer);
  if (!utf8.includes('�') && utf8.includes('Bezeichnung')) return utf8;
  return new TextDecoder('windows-1252').decode(buffer);
}

function splitCsvLine(line: string): string[] {
  return line.split(';').map((cell) => cell.trim().replace(/^"|"$/g, ''));
}

// Deutsche Zahlschreibweise: Punkt als Tausendertrenner, Komma als Dezimaltrenner. DATEV
// stellt negative Werte oft mit einem Minus HINTER der Zahl dar (z.B. "1.234,56-") statt
// davor - beide Varianten werden unterstützt. Ein leeres Feld bedeutet in der BWA "0,00",
// nicht "unbekannt".
function parseGermanAmount(raw: string): number {
  const trimmed = raw.trim();
  if (trimmed === '') return 0;

  let negative = false;
  let value = trimmed;
  if (value.endsWith('-')) {
    negative = true;
    value = value.slice(0, -1).trim();
  } else if (value.startsWith('-')) {
    negative = true;
    value = value.slice(1).trim();
  }

  const normalized = value.replace(/\./g, '').replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  if (Number.isNaN(parsed)) return 0;
  return Math.round(negative ? -parsed : parsed);
}

// "Jul 25" -> { periodKey: '2025-07', label: 'Jul 25' }. Gibt null zurück, wenn die Spalte
// keine erkennbare Monatsangabe ist (z.B. eine Fußzeile) - solche Spalten werden übersprungen
// statt eine falsche Periode zu raten.
function parseMonthColumnHeader(raw: string): { periodKey: string; label: string } | null {
  const match = raw.trim().match(/^([A-ZÄÖÜa-zäöü]{3,4})\s+(\d{2})$/);
  if (!match) return null;
  const monthNum = MONTH_ABBREVIATIONS[match[1]];
  if (!monthNum) return null;
  const year = 2000 + Number.parseInt(match[2], 10);
  return { periodKey: periodKey(year, monthNum), label: raw.trim() };
}

export function parseDatevBwaCsv(text: string): ParsedFinanceImport {
  const lines = text.split(/\r\n|\n/).filter((l) => l.trim() !== '');
  const rows = lines.map(splitCsvLine);
  const warnings: string[] = [];

  const companyName = rows[1]?.[0]?.trim() || null;

  const headerRow = rows.find((r) => r[0]?.trim() === 'Bezeichnung');
  if (!headerRow) {
    return {
      companyName,
      months: [],
      warnings: ['Kopfzeile ("Bezeichnung") nicht gefunden - Datei entspricht nicht dem erwarteten BWA-Format.'],
    };
  }

  const columns: Array<{ index: number; periodKey: string; label: string }> = [];
  headerRow.forEach((cell, index) => {
    if (index === 0) return;
    const parsed = parseMonthColumnHeader(cell);
    if (parsed) columns.push({ index, ...parsed });
  });
  if (columns.length === 0) {
    warnings.push('Keine Monatsspalten in der Kopfzeile erkannt.');
  }

  function findRow(label: string): string[] | null {
    const row = rows.find((r) => r[0]?.trim() === label);
    if (!row) {
      warnings.push(`Zeile "${label}" wurde in der Datei nicht gefunden - Werte werden als 0 angenommen.`);
      return null;
    }
    return row;
  }

  const revenueRow = findRow(ROW_REVENUE);
  const totalCostsRow = findRow(ROW_TOTAL_COSTS);
  const personnelCostsRow = findRow(ROW_PERSONNEL_COSTS);
  const ebitRow = findRow(ROW_EBIT);
  const totalOutputRow = findRow(ROW_TOTAL_OUTPUT);
  const grossProfitRow = findRow(ROW_GROSS_PROFIT);
  const resultBeforeTaxRow = findRow(ROW_RESULT_BEFORE_TAX);

  const months: ParsedFinanceMonth[] = columns.map((col) => {
    const revenue = revenueRow ? parseGermanAmount(revenueRow[col.index] ?? '') : 0;
    const totalCosts = totalCostsRow ? parseGermanAmount(totalCostsRow[col.index] ?? '') : 0;
    const personnelCosts = personnelCostsRow ? parseGermanAmount(personnelCostsRow[col.index] ?? '') : 0;
    const ebit = ebitRow ? parseGermanAmount(ebitRow[col.index] ?? '') : 0;
    const totalOutput = totalOutputRow ? parseGermanAmount(totalOutputRow[col.index] ?? '') : 0;
    const grossProfit = grossProfitRow ? parseGermanAmount(grossProfitRow[col.index] ?? '') : 0;
    const resultBeforeTax = resultBeforeTaxRow ? parseGermanAmount(resultBeforeTaxRow[col.index] ?? '') : 0;

    return {
      periodKey: col.periodKey,
      label: col.label,
      revenue,
      costs: totalCosts - personnelCosts,
      personnelCosts,
      ebit,
      totalOutput,
      grossProfit,
      resultBeforeTax,
      looksEmpty: revenue === 0 && totalCosts === 0 && personnelCosts === 0 && ebit === 0,
    };
  });

  return { companyName, months, warnings };
}
