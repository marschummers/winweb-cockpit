import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { computeCustomerFunnelStatuses, groupByPhase, FUNNEL_PHASES, FUNNEL_PHASE_LABELS } from '../lib/salesFunnel'
import { formatCurrency } from '../lib/format'
import { describeSalesDataStatus } from '../lib/dataStatus'

// Ab so vielen Tagen ohne neue Aktivität gilt ein Kunde als "hängengeblieben" und wird farblich
// hervorgehoben - ein fester Richtwert, unabhängig von der Phase.
const STALE_THRESHOLD_DAYS = 30

export default function SalesPage() {
  const activities = useLiveQuery(() => db.salesActivities.toArray(), [])
  const appMeta = useLiveQuery(() => db.appMeta.get('singleton'), [])
  if (!activities) return null

  const statuses = computeCustomerFunnelStatuses(activities)
  const grouped = groupByPhase(statuses)
  const openCount = FUNNEL_PHASES.filter((p) => p !== 'kunde').reduce((sum, p) => sum + grouped[p].length, 0)
  const staleCount = statuses.filter((s) => s.phase !== 'kunde' && s.phase !== 'verloren' && s.daysSinceLastActivity > STALE_THRESHOLD_DAYS).length

  return (
    <div className="page">
      <p className="screen-eyebrow">Vertrieb</p>
      <div className="page-header-row">
        <h1>Pipeline</h1>
        <Link to="/vertrieb/import" className="secondary-button">
          Importieren
        </Link>
      </div>
      <p className="data-status">Datenstand: {describeSalesDataStatus(appMeta)}</p>

      <div className="kpi-grid">
        <div className="kpi-card kpi-card-primary">
          <span className="kpi-label">Offene Interessenten</span>
          <span className="kpi-value">{openCount}</span>
          <p className="kpi-sub">
            {staleCount > 0 ? (
              <span className="kpi-delta down">{staleCount} seit über {STALE_THRESHOLD_DAYS} Tagen ohne Fortschritt</span>
            ) : (
              'alle Kunden kürzlich bewegt'
            )}
          </p>
        </div>
      </div>

      {activities.length === 0 && <p className="hint">Noch kein Aktivitätenjournal importiert.</p>}

      {FUNNEL_PHASES.map((phase) => {
        const customers = grouped[phase]
        if (customers.length === 0) return null
        return (
          <div key={phase} className="group-section">
            <div className="group-section-title">
              <span>{FUNNEL_PHASE_LABELS[phase]} · {customers.length}</span>
            </div>
            <div className="card-list">
              {customers.map((c) => (
                <div key={c.customerNumber} className="card">
                  <div>
                    <span className="card-title">{c.searchName || c.customerNumber}</span>
                    {c.lastContact && (
                      <span className="card-subtitle">
                        Letzter Kontakt: vor {c.lastContact.daysAgo} Tagen ({c.lastContact.activityType})
                      </span>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span className={`num ${c.daysSinceLastActivity > STALE_THRESHOLD_DAYS ? 'hint-error' : ''}`} style={{ fontWeight: 600, display: 'block' }}>
                      {c.daysSinceLastActivity} Tage
                    </span>
                    {c.price !== null && <span className="kpi-sub">{formatCurrency(c.price)}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {grouped.verloren.length > 0 && (
        <div className="group-section">
          <div className="group-section-title">
            <span>Verloren · {grouped.verloren.length}</span>
          </div>
          <div className="card-list">
            {grouped.verloren.map((c) => (
              <div key={c.customerNumber} className="card">
                <div>
                  <span className="card-title">{c.searchName || c.customerNumber}</span>
                  <span className="card-subtitle">{c.title}</span>
                </div>
                <span className="kpi-sub">{c.daysSinceLastActivity} Tage her</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {grouped.unbekannt.length > 0 && (
        <div className="group-section">
          <div className="group-section-title">
            <span>Unbekannte Aktivitäten · {grouped.unbekannt.length}</span>
          </div>
          <p className="hint">
            Für diese Kunden gibt es noch keine Aktivität, die einer Phase zugeordnet werden
            konnte (z.B. bisher nur Kontaktaktivitäten wie E-Mail/Anruf, oder ein neuer,
            noch unbekannter Aktivitätstyp im Journal).
          </p>
          <div className="card-list">
            {grouped.unbekannt.map((c) => (
              <div key={c.customerNumber} className="card">
                <div>
                  <span className="card-title">{c.searchName || c.customerNumber}</span>
                  <span className="card-subtitle">{c.rawActivityType}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
