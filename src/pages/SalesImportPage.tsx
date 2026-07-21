import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { decodeSalesJournalFile, parseSalesJournalCsv, type ParsedSalesActivity } from '../lib/importSalesJournal'
import { computeCustomerFunnelStatuses, groupByPhase, FUNNEL_PHASES, FUNNEL_PHASE_LABELS } from '../lib/salesFunnel'
import { importSalesActivities } from '../db/db'

type Status = 'idle' | 'preview' | 'importing' | 'done'

export default function SalesImportPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<Status>('idle')
  const [activities, setActivities] = useState<ParsedSalesActivity[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(null)

    let text: string
    try {
      text = await decodeSalesJournalFile(file)
    } catch {
      setError('Die Datei konnte nicht gelesen werden.')
      return
    }

    const parsed = parseSalesJournalCsv(text)
    if (parsed.activities.length === 0) {
      setError('In dieser Datei wurden keine gültigen Aktivitäts-Zeilen erkannt. Ist es das Kundenaktivitätenjournal?')
      return
    }

    setActivities(parsed.activities)
    setWarnings(parsed.warnings)
    setStatus('preview')
  }

  async function handleConfirm() {
    setStatus('importing')
    await importSalesActivities(activities)
    setStatus('done')
  }

  if (status === 'done') {
    return (
      <div className="page">
        <p className="screen-eyebrow">Vertrieb</p>
        <h1>Import abgeschlossen</h1>
        <p className="hint">{activities.length} Aktivitäten wurden übernommen.</p>
        <button className="primary-button" onClick={() => navigate('/vertrieb')}>
          Zur Pipeline
        </button>
      </div>
    )
  }

  const statuses = status === 'preview' ? computeCustomerFunnelStatuses(activities) : []
  const grouped = status === 'preview' ? groupByPhase(statuses) : null
  const uniqueCustomers = new Set(activities.map((a) => a.customerNumber)).size

  return (
    <div className="page">
      <p className="screen-eyebrow">Vertrieb</p>
      <h1>Aktivitätenjournal importieren</h1>

      {status === 'idle' && (
        <>
          <p className="hint">
            Wähle den CSV-Export des Kundenaktivitätenjournals aus. Die Datei bleibt
            ausschließlich auf diesem Gerät – es wird nichts hochgeladen oder übertragen.
            Ein Import ersetzt die komplette bisherige Vertriebsliste, da jede Exportdatei die
            gesamte Historie neu enthält.
          </p>
          <label className="primary-button file-picker-label">
            Datei auswählen
            <input type="file" accept=".csv,text/csv" onChange={handleFile} style={{ display: 'none' }} />
          </label>
          {error && <p className="hint-error">{error}</p>}
        </>
      )}

      {status === 'preview' && grouped && (
        <>
          <p className="hint">
            {activities.length} Aktivitäten · {uniqueCustomers} Kunden erkannt.
          </p>

          {warnings.length > 0 && (
            <div className="progress-card warn">
              <p className="progress-card-title">Hinweise</p>
              {warnings.map((w) => (
                <p key={w} className="hint" style={{ margin: '0.2rem 0' }}>
                  {w}
                </p>
              ))}
            </div>
          )}

          <div className="card-list">
            {FUNNEL_PHASES.map((phase) => (
              <div key={phase} className="card">
                <span className="card-title">{FUNNEL_PHASE_LABELS[phase]}</span>
                <span className="num" style={{ fontWeight: 600 }}>{grouped[phase].length}</span>
              </div>
            ))}
            <div className="card">
              <span className="card-title">Verloren</span>
              <span className="num" style={{ fontWeight: 600 }}>{grouped.verloren.length}</span>
            </div>
            {grouped.unbekannt.length > 0 && (
              <div className="card">
                <span className="card-title">Unbekannt</span>
                <span className="num" style={{ fontWeight: 600 }}>{grouped.unbekannt.length}</span>
              </div>
            )}
          </div>

          <button className="primary-button" onClick={handleConfirm}>
            Import bestätigen
          </button>
          <button className="secondary-button" style={{ width: '100%' }} onClick={() => setStatus('idle')}>
            Andere Datei wählen
          </button>
        </>
      )}

      {status === 'importing' && <p className="hint">Importiere …</p>}
    </div>
  )
}
