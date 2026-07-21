import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { ebitMargin, getLatestMonth, getPreviousMonth, percentChange, sortByPeriod } from '../lib/finance'
import { unweightedPipeline, weightedPipeline } from '../lib/sales'
import { isOverBudget } from '../lib/projects'
import { formatCurrency, formatCurrencyCompact, formatPercent, formatSignedPercent } from '../lib/format'
import { formatMonthYearShort, periodKeyToLabel } from '../lib/date'
import { describeDataStatus } from '../lib/dataStatus'
import { isYearEndMonth } from '../lib/ratios'
import LineChart from '../components/LineChart'

export default function CockpitPage() {
  const financeMonths = useLiveQuery(() => db.financeMonths.toArray(), [])
  const deals = useLiveQuery(() => db.deals.toArray(), [])
  const projects = useLiveQuery(() => db.projects.toArray(), [])
  const appMeta = useLiveQuery(() => db.appMeta.get('singleton'), [])

  if (!financeMonths || !deals || !projects) return null

  const sortedMonths = sortByPeriod(financeMonths)
  const latest = getLatestMonth(financeMonths)
  const previousMonth = latest ? getPreviousMonth(sortedMonths, latest) : null

  const revenueDelta = latest && previousMonth ? percentChange(latest.revenue, previousMonth.revenue) : null
  const ebitDelta = latest && previousMonth ? percentChange(latest.ebit, previousMonth.ebit) : null

  const activeProjects = projects.filter((p) => p.status === 'aktiv')
  const overBudgetCount = activeProjects.filter(isOverBudget).length

  const revenuePoints = sortedMonths.map((m) => ({
    x: new Date(`${m.periodKey}-01`).getTime(),
    y: m.revenue,
  }))

  return (
    <div className="page">
      <p className="screen-eyebrow">Cockpit</p>
      <h1>Überblick</h1>
      <p className="data-status">Datenstand: {describeDataStatus(appMeta)}</p>

      {latest && (
        <div className="kpi-grid">
          <div className="kpi-card kpi-card-primary">
            <span className="kpi-label">EBIT · {periodKeyToLabel(latest.periodKey)}</span>
            <span className="kpi-value">{formatCurrency(latest.ebit)}</span>
            <p className="kpi-sub">
              Marge {formatPercent(ebitMargin(latest), 1)}
              {ebitDelta !== null && (
                <>
                  {' · '}
                  <span className={`kpi-delta ${Math.round(ebitDelta) >= 0 ? 'up' : 'down'}`}>{formatSignedPercent(ebitDelta)}</span>{' '}
                  ggü. Vormonat
                </>
              )}
            </p>
            {latest && isYearEndMonth(latest.periodKey) && (
              <p className="hint-warn" style={{ margin: '0.3rem 0 0', fontSize: '0.76rem' }}>
                Jahreswechsel – eingeschränkt aussagekräftig
              </p>
            )}
          </div>

          <div className="kpi-card">
            <span className="kpi-label">Umsatz</span>
            <span className="kpi-value">{formatCurrencyCompact(latest.revenue)}</span>
            {revenueDelta !== null && (
              <p className="kpi-sub">
                <span className={`kpi-delta ${Math.round(revenueDelta) >= 0 ? 'up' : 'down'}`}>{formatSignedPercent(revenueDelta)}</span>{' '}
                ggü. Vormonat
              </p>
            )}
          </div>

          <div className="kpi-card">
            <span className="kpi-label">Pipeline gewichtet</span>
            <span className="kpi-value">{formatCurrencyCompact(weightedPipeline(deals))}</span>
            <p className="kpi-sub">von {formatCurrencyCompact(unweightedPipeline(deals))} offen</p>
          </div>

          <div className="kpi-card">
            <span className="kpi-label">Projekte aktiv</span>
            <span className="kpi-value">{activeProjects.length}</span>
            <p className="kpi-sub">
              {overBudgetCount > 0 ? (
                <span className="kpi-delta down">{overBudgetCount} über Budget</span>
              ) : (
                'alle im Budget'
              )}
            </p>
          </div>
        </div>
      )}

      {revenuePoints.length > 1 && (
        <div className="progress-card">
          <p className="progress-card-title">Umsatzverlauf</p>
          <LineChart points={revenuePoints} color="var(--accent)" unit=" €" formatX={formatMonthYearShort} />
        </div>
      )}

      <Link to="/finanzen" className="back-link">
        Alle Finanzkennzahlen ansehen →
      </Link>

      {revenuePoints.length === 0 && <p className="hint">Noch keine Finanzdaten vorhanden.</p>}
    </div>
  )
}
