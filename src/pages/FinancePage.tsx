import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { ebitMargin, getPreviousMonth, getSamePeriodLastYear, percentChange, sortByPeriod } from '../lib/finance'
import { formatCurrency, formatCurrencyCompact, formatPercent, formatRatio, formatSignedPercent } from '../lib/format'
import { formatMonthYearShort, periodKeyToLabel } from '../lib/date'
import { FINANCE_RATIOS, isYearEndMonth, rollingAverage } from '../lib/ratios'
import LineChart from '../components/LineChart'
import MonthCommentField from '../components/MonthCommentField'

export default function FinancePage() {
  const financeMonths = useLiveQuery(() => db.financeMonths.toArray(), [])
  if (!financeMonths) return null

  const sorted = sortByPeriod(financeMonths)
  const newestFirst = [...sorted].reverse()
  const revenuePoints = sorted.map((m) => ({ x: new Date(`${m.periodKey}-01`).getTime(), y: m.revenue }))

  return (
    <div className="page">
      <p className="screen-eyebrow">Finanzen</p>
      <div className="page-header-row">
        <h1>BWA-Übersicht</h1>
        <Link to="/finanzen/import" className="secondary-button">
          Importieren
        </Link>
      </div>

      {sorted.length === 0 && <p className="hint">Noch keine Finanzdaten importiert.</p>}

      {revenuePoints.length > 1 && (
        <div className="progress-card">
          <p className="progress-card-title">Umsatzverlauf</p>
          <LineChart points={revenuePoints} color="var(--accent)" unit=" €" formatX={formatMonthYearShort} />
        </div>
      )}

      {sorted.length > 0 && (
        <div className="progress-card">
          <p className="progress-card-title">Kennzahlen erklärt</p>
          <div className="ratio-legend">
            {FINANCE_RATIOS.map((ratio) => (
              <p key={ratio.label} className="ratio-legend-item">
                <strong>{ratio.label}:</strong> {ratio.description}
                <span className="guideline">{ratio.guideline}</span>
              </p>
            ))}
            <p className="ratio-legend-item">
              Bei EBIT-Quote und GK/Rohertrag zeigt "Ø 3M" den Schnitt aus dem Monat und den
              zwei vorangegangenen - glättet Ausreißer durch Sondereffekte (z.B. Messen).
            </p>
          </div>
        </div>
      )}

      <div className="card-list">
        {newestFirst.map((month) => {
          const previousMonth = getPreviousMonth(sorted, month)
          const momDelta = previousMonth ? percentChange(month.ebit, previousMonth.ebit) : null

          const yearAgoMonth = getSamePeriodLastYear(sorted, month)
          const yoyDelta = yearAgoMonth ? percentChange(month.ebit, yearAgoMonth.ebit) : null

          const yearEnd = isYearEndMonth(month.periodKey)

          return (
            <div key={month.id} className={`card card-block ${yearEnd ? 'year-end' : ''}`}>
              <div className="page-header-row">
                <span className="card-title">{periodKeyToLabel(month.periodKey)}</span>
                {momDelta !== null && (
                  <span className={`status-badge ${Math.round(momDelta) >= 0 ? 'good' : 'bad'}`}>
                    {formatSignedPercent(momDelta)} ggü. Vormonat
                  </span>
                )}
              </div>

              {yearEnd && (
                <p className="hint-warn" style={{ margin: 0, fontSize: '0.8rem' }}>
                  Jahreswechsel – Werte durch Abgrenzungen/Jahresendbuchungen eingeschränkt aussagekräftig
                </p>
              )}

              <div className="finance-stat-grid">
                <div className="finance-stat">
                  <span className="finance-stat-label">Umsatz</span>
                  <span className="finance-stat-value">{formatCurrencyCompact(month.revenue)}</span>
                </div>
                <div className="finance-stat">
                  <span className="finance-stat-label">Kosten</span>
                  <span className="finance-stat-value">{formatCurrencyCompact(month.costs)}</span>
                </div>
                <div className="finance-stat">
                  <span className="finance-stat-label">Personal</span>
                  <span className="finance-stat-value">{formatCurrencyCompact(month.personnelCosts)}</span>
                </div>
                <div className="finance-stat">
                  <span className="finance-stat-label">EBIT</span>
                  <span className="finance-stat-value">{formatCurrency(month.ebit)}</span>
                </div>
              </div>

              <div className="finance-stat-grid cols-3">
                {FINANCE_RATIOS.map((ratio) => {
                  const value = ratio.value(month)
                  if (value === null) return null
                  // Erst runden, dann gegen den Richtwert prüfen - sonst könnte ein Wert wie
                  // 0,8014 als "0,80" angezeigt (wirkt wie genau auf der Grenze), aber wegen
                  // des ungerundeten Werts trotzdem als Überschreitung markiert werden.
                  const rounded = ratio.unit === '%' ? Math.round(value) : Math.round(value * 100) / 100
                  const status = ratio.status(rounded)
                  const displayValue = ratio.unit === '%' ? formatPercent(rounded) : formatRatio(rounded)

                  const avg = ratio.smoothed ? rollingAverage(sorted, month, ratio.value) : null
                  const avgDisplay =
                    avg === null
                      ? null
                      : ratio.unit === '%'
                        ? formatPercent(Math.round(avg))
                        : formatRatio(Math.round(avg * 100) / 100)

                  return (
                    <div key={ratio.label} className="finance-stat">
                      <span className="finance-stat-label">{ratio.label}</span>
                      <span className={`finance-stat-value ${status === 'bad' ? 'bad' : ''}`}>{displayValue}</span>
                      {avgDisplay !== null && <span className="finance-stat-subvalue">Ø 3M {avgDisplay}</span>}
                    </div>
                  )
                })}
              </div>

              <p className="kpi-sub">
                Marge {formatPercent(ebitMargin(month), 1)}
                {yoyDelta !== null && (
                  <>
                    {' · '}
                    <span className={`kpi-delta ${Math.round(yoyDelta) >= 0 ? 'up' : 'down'}`}>
                      {formatSignedPercent(yoyDelta)}
                    </span>{' '}
                    ggü. Vorjahr
                  </>
                )}
              </p>

              <MonthCommentField monthId={month.id} initialComment={month.comment} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
