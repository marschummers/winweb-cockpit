import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, resetToFreshDemoData } from '../db/db'
import { describeDataStatus } from '../lib/dataStatus'

export default function SettingsPage() {
  const appMeta = useLiveQuery(() => db.appMeta.get('singleton'), [])
  const [resetting, setResetting] = useState(false)
  const hasRealImport = Boolean(appMeta?.lastFinanceImportAt)

  async function handleReset() {
    if (!confirm('Alle Demodaten löschen und neu erzeugen?')) return
    setResetting(true)
    try {
      await resetToFreshDemoData()
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="page">
      <p className="screen-eyebrow">Einstellungen</p>
      <h1>Einstellungen</h1>

      <div className="progress-card">
        <p className="progress-card-title">Datenstand</p>
        <p className="hint" style={{ margin: 0 }}>{describeDataStatus(appMeta)}</p>
      </div>

      <div className="progress-card">
        <p className="progress-card-title">Datenschutz</p>
        <p className="hint" style={{ margin: 0 }}>
          Alle Daten dieser App bleiben ausschließlich lokal auf diesem Gerät gespeichert und
          werden nicht an externe Dienste übermittelt.
        </p>
      </div>

      {/* Sobald echte BWA-Daten importiert wurden, darf dieser Button nicht mehr angezeigt
          werden - er würde sonst echte Finanzdaten durch Demodaten ersetzen. */}
      {!hasRealImport && (
        <button className="secondary-button" onClick={handleReset} disabled={resetting}>
          {resetting ? 'Setze zurück …' : 'Demodaten zurücksetzen'}
        </button>
      )}
    </div>
  )
}
