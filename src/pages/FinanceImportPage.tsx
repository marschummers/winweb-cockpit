import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { decodeCsvFile, parseDatevBwaCsv, type ParsedFinanceMonth } from '../lib/importDatev'
import { importFinanceMonths } from '../db/db'
import { formatCurrency } from '../lib/format'
import { periodKeyToLabel } from '../lib/date'

type Status = 'idle' | 'preview' | 'importing' | 'done'

export default function FinanceImportPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<Status>('idle')
  const [companyName, setCompanyName] = useState<string | null>(null)
  const [months, setMonths] = useState<ParsedFinanceMonth[]>([])
  const [warnings, setWarnings] = useState<string[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [importedCount, setImportedCount] = useState(0)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(null)

    let text: string
    try {
      text = await decodeCsvFile(file)
    } catch {
      setError('Die Datei konnte nicht gelesen werden.')
      return
    }

    const parsed = parseDatevBwaCsv(text)
    if (parsed.months.length === 0) {
      setError('In dieser Datei wurden keine Monatsspalten erkannt. Ist es eine DATEV-BWA-Entwicklungsübersicht?')
      return
    }

    setCompanyName(parsed.companyName)
    setMonths(parsed.months)
    setWarnings(parsed.warnings)
    setSelected(new Set(parsed.months.filter((m) => !m.looksEmpty).map((m) => m.periodKey)))
    setStatus('preview')
  }

  function toggleMonth(key: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function handleConfirm() {
    setStatus('importing')
    const toImport = months.filter((m) => selected.has(m.periodKey))
    await importFinanceMonths(toImport)
    setImportedCount(toImport.length)
    setStatus('done')
  }

  if (status === 'done') {
    return (
      <div className="page">
        <p className="screen-eyebrow">Finanzen</p>
        <h1>Import abgeschlossen</h1>
        <p className="hint">{importedCount} Monate wurden übernommen.</p>
        <button className="primary-button" onClick={() => navigate('/finanzen')}>
          Zur BWA-Übersicht
        </button>
      </div>
    )
  }

  return (
    <div className="page">
      <p className="screen-eyebrow">Finanzen</p>
      <h1>BWA importieren</h1>

      {status === 'idle' && (
        <>
          <p className="hint">
            Wähle die BWA-Entwicklungsübersicht (CSV-Export aus DATEV) aus. Die Datei bleibt
            ausschließlich auf diesem Gerät – es wird nichts hochgeladen oder übertragen.
          </p>
          <label className="primary-button file-picker-label">
            Datei auswählen
            <input type="file" accept=".csv,text/csv" onChange={handleFile} style={{ display: 'none' }} />
          </label>
          {error && <p className="hint-error">{error}</p>}
        </>
      )}

      {status === 'preview' && (
        <>
          {companyName && <p className="hint">Firma laut Datei: {companyName}</p>}

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

          <p className="hint">
            {selected.size} von {months.length} Monaten ausgewählt – abwählen, was nicht übernommen werden soll.
          </p>

          <div className="card-list">
            {months.map((month) => {
              const checked = selected.has(month.periodKey)
              return (
                <label key={month.periodKey} className="card card-block month-check-row">
                  <div className="page-header-row">
                    <span className="card-title">{periodKeyToLabel(month.periodKey)}</span>
                    <input type="checkbox" checked={checked} onChange={() => toggleMonth(month.periodKey)} />
                  </div>
                  {month.looksEmpty ? (
                    <p className="kpi-sub">Keine Werte in dieser Spalte (vermutlich noch nicht abgeschlossener Monat).</p>
                  ) : (
                    <div className="finance-stat-grid">
                      <div className="finance-stat">
                        <span className="finance-stat-label">Umsatz</span>
                        <span className="finance-stat-value">{formatCurrency(month.revenue)}</span>
                      </div>
                      <div className="finance-stat">
                        <span className="finance-stat-label">Kosten</span>
                        <span className="finance-stat-value">{formatCurrency(month.costs)}</span>
                      </div>
                      <div className="finance-stat">
                        <span className="finance-stat-label">Personal</span>
                        <span className="finance-stat-value">{formatCurrency(month.personnelCosts)}</span>
                      </div>
                      <div className="finance-stat">
                        <span className="finance-stat-label">EBIT</span>
                        <span className="finance-stat-value">{formatCurrency(month.ebit)}</span>
                      </div>
                    </div>
                  )}
                </label>
              )
            })}
          </div>

          <button className="primary-button" onClick={handleConfirm} disabled={selected.size === 0}>
            {selected.size} {selected.size === 1 ? 'Monat' : 'Monate'} importieren
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
