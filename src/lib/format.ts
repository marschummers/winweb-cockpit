// Beträge als volle Euro ohne Nachkommastellen: für dieses interne Management-Cockpit ist
// eine Cent-Rundungsdifferenz irrelevant, mathematisches Runden reicht.
export function formatCurrency(value: number): string {
  return Math.round(value).toLocaleString('de-DE') + ' €'
}

export function formatCurrencyCompact(value: number): string {
  const rounded = Math.round(value)
  if (Math.abs(rounded) >= 1000) {
    return (rounded / 1000).toLocaleString('de-DE', { maximumFractionDigits: 1 }) + 'T €'
  }
  return rounded.toLocaleString('de-DE') + ' €'
}

export function formatPercent(value: number, fractionDigits = 0): string {
  return value.toLocaleString('de-DE', { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits }) + ' %'
}

export function formatSignedPercent(value: number): string {
  const sign = value > 0 ? '+' : ''
  return sign + formatPercent(value)
}
