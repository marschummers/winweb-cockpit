import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { ebitMargin, percentChange, sortByPeriod } from '../lib/finance'
import { formatCurrency, formatCurrencyCompact, formatPercent, formatSignedPercent } from '../lib/format'
import { formatMonthYearShort, periodKeyToLabel } from '../lib/date'
import LineChart from '../components/LineChart'

export default function FinancePage() {
  const financeMonths = useLiveQuery(() => db.financeMonths.toArray(), [])
  if (!financeMonths) return null

  const sorted = sortByPeriod(financeMonths)
  const newestFirst = [...sorted].reverse()
  const revenuePoints = sorted.map((m) => ({ x: new Date(`${m.periodKey}-01`).getTime(), y: m.revenue }))

  return (
    <div className="page">
      <p className="screen-eyebrow">Finanzen</p>
      <h1>BWA-Übersicht</h1>

      {sorted.length === 0 && <p className="hint">Noch keine Finanzdaten importiert.</p>}

      {revenuePoints.length > 1 && (
        <div className="progress-card">
          <p className="progress-card-title">Umsatzverlauf</p>
          <LineChart points={revenuePoints} color="var(--accent)" unit=" €" formatX={formatMonthYearShort} />
        </div>
      )}

      <div className="card-list">
        {newestFirst.map((month) => {
          const ebitDelta = percentChange(month.ebit, month.ebitPlan)
          return (
            <div key={month.id} className="card card-block">
              <div className="page-header-row">
                <span className="card-title">{periodKeyToLabel(month.periodKey)}</span>
                {ebitDelta !== null && (
                  <span className={`status-badge ${ebitDelta >= 0 ? 'good' : 'bad'}`}>
                    {formatSignedPercent(Math.round(ebitDelta))} ggü. Plan
                  </span>
                )}
              </div>
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
              <p className="kpi-sub">Marge {formatPercent(ebitMargin(month), 1)}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
