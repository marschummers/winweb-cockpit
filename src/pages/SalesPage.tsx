import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { DEAL_PHASES } from '../db/types'
import { unweightedPipeline, weightedPipeline } from '../lib/sales'
import { formatCurrency, formatCurrencyCompact } from '../lib/format'
import { formatDate } from '../lib/date'

export default function SalesPage() {
  const deals = useLiveQuery(() => db.deals.toArray(), [])
  if (!deals) return null

  return (
    <div className="page">
      <p className="screen-eyebrow">Vertrieb</p>
      <h1>Pipeline</h1>

      <div className="kpi-grid">
        <div className="kpi-card kpi-card-primary">
          <span className="kpi-label">Gewichtete Pipeline</span>
          <span className="kpi-value">{formatCurrency(weightedPipeline(deals))}</span>
          <p className="kpi-sub">von {formatCurrency(unweightedPipeline(deals))} offenem Volumen</p>
        </div>
      </div>

      {deals.length === 0 && <p className="hint">Noch keine Verkaufschancen angelegt.</p>}

      {DEAL_PHASES.map((phase) => {
        const phaseDeals = deals.filter((d) => d.phase === phase)
        if (phaseDeals.length === 0) return null
        const phaseVolume = phaseDeals.reduce((sum, d) => sum + d.volume, 0)

        return (
          <div key={phase} className="group-section">
            <div className="group-section-title">
              <span>
                {phase} · {phaseDeals.length}
              </span>
              <span className="num">{formatCurrencyCompact(phaseVolume)}</span>
            </div>
            <div className="card-list">
              {phaseDeals.map((deal) => (
                <div key={deal.id} className="card">
                  <div>
                    <span className="card-title">{deal.name}</span>
                    <span className="card-subtitle">{deal.customerName}</span>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span className="num" style={{ fontWeight: 600, display: 'block' }}>
                      {formatCurrencyCompact(deal.volume)}
                    </span>
                    <span className="kpi-sub">
                      {deal.probability} % · {formatDate(new Date(`${deal.expectedCloseDateStr}T00:00:00`).getTime())}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
