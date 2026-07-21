// Beträge als volle Euro ohne Nachkommastellen: für dieses interne Management-Cockpit ist
// eine Cent-Rundungsdifferenz irrelevant, mathematisches Runden reicht. Fest 0 Nachkommastellen
// (nicht nur "maximum"), damit ausgeschriebene Beträge immer gleich aussehen.
export function formatCurrency(value: number): string {
  return Math.round(value).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €'
}

// "T"-Kurzform (z.B. "198,8T €"): fest EINE Nachkommastelle, auch wenn sie zufällig 0 ist
// (z.B. "200,0T €" statt mal "200T €", mal "198,8T €" - vorher inkonsistent, weil nur ein
// maximum statt fixer Nachkommastellen gesetzt war).
export function formatCurrencyCompact(value: number): string {
  const rounded = Math.round(value)
  if (Math.abs(rounded) >= 1000) {
    return (rounded / 1000).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'T €'
  }
  return rounded.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + ' €'
}

export function formatPercent(value: number, fractionDigits = 0): string {
  return value.toLocaleString('de-DE', { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits }) + ' %'
}

// Für Kennzahlen ohne Prozent-Einheit, z.B. GK/Rohertrag (ein Verhältnis wie 0,74).
export function formatRatio(value: number, fractionDigits = 2): string {
  return value.toLocaleString('de-DE', { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits })
}

// Rundet VOR der Vorzeichen-Entscheidung, sonst zeigt z.B. ein Delta von 0,36 % ein
// irreführendes "+0 %" (Vorzeichen vom ungerundeten Wert, Anzeige vom gerundeten).
export function formatSignedPercent(value: number, fractionDigits = 0): string {
  const factor = 10 ** fractionDigits
  const rounded = Math.round(value * factor) / factor
  const sign = rounded > 0 ? '+' : ''
  return sign + formatPercent(rounded, fractionDigits)
}
