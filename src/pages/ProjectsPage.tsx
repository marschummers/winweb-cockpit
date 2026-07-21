import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { budgetUsagePercent, hoursUsagePercent, isOverBudget } from '../lib/projects'
import { formatCurrency, formatPercent } from '../lib/format'
import type { ProjectStatus } from '../db/types'

// Neutraler Status (leere Klasse = Standard-Textfarbe) außer bei "pausiert" (Aufmerksamkeit)
// oder wenn ein laufendes Projekt sein Budget überschritten hat (siehe badgeClass unten).
const STATUS_BADGE_CLASS: Record<ProjectStatus, string> = {
  aktiv: '',
  pausiert: 'warn',
  abgeschlossen: '',
}

export default function ProjectsPage() {
  const projects = useLiveQuery(() => db.projects.toArray(), [])
  if (!projects) return null

  const activeCount = projects.filter((p) => p.status === 'aktiv').length
  const overBudgetCount = projects.filter((p) => p.status !== 'abgeschlossen' && isOverBudget(p)).length

  return (
    <div className="page">
      <p className="screen-eyebrow">Projekte</p>
      <h1>Kundenprojekte</h1>

      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">Aktive Projekte</span>
          <span className="kpi-value">{activeCount}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Über Budget</span>
          <span className="kpi-value">{overBudgetCount}</span>
        </div>
      </div>

      {projects.length === 0 && <p className="hint">Noch keine Projekte angelegt.</p>}

      <div className="card-list">
        {projects.map((project) => {
          const budgetPercent = budgetUsagePercent(project)
          const hoursPercent = hoursUsagePercent(project)
          const over = isOverBudget(project)

          return (
            <div key={project.id} className="card card-block">
              <div className="page-header-row">
                <div>
                  <span className="card-title">{project.name}</span>
                  <span className="card-subtitle">{project.customerName}</span>
                </div>
                <span
                  className={`status-badge ${
                    over && project.status !== 'abgeschlossen' ? 'bad' : STATUS_BADGE_CLASS[project.status]
                  }`}
                >
                  {project.status}
                </span>
              </div>

              <div>
                <div className="kpi-sub">
                  Budget: {formatCurrency(project.budgetConsumed)} von {formatCurrency(project.budget)} (
                  {formatPercent(Math.round(budgetPercent))})
                </div>
                <div className="progress-track">
                  <div
                    className={`progress-fill ${over ? 'over' : ''}`}
                    style={{ width: `${Math.min(100, budgetPercent)}%` }}
                  />
                </div>
              </div>

              <div className="kpi-sub">
                Stunden: {project.hoursConsumed} von {project.hoursBudget} ({formatPercent(Math.round(hoursPercent))})
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
