import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, resetToFreshDemoData } from '../db/db'
import { describeFinanceDataStatus, describeSalesDataStatus } from '../lib/dataStatus'

export default function SettingsPage() {
  const appMeta = useLiveQuery(() => db.appMeta.get('singleton'), [])
  const [resetting, setResetting] = useState(false)
  const hasRealImport = Boolean(appMeta?.lastFinanceImportAt || appMeta?.lastSalesImportAt)

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
        <p className="progress-card-title">Datenstand Finanzen</p>
        <p className="hint" style={{ margin: 0 }}>{describeFinanceDataStatus(appMeta)}</p>
      </div>

      <div className="progress-card">
        <p className="progress-card-title">Datenstand Vertrieb</p>
        <p className="hint" style={{ margin: 0 }}>{describeSalesDataStatus(appMeta)}</p>
      </div>

      <div className="progress-card">
        <p className="progress-card-title">Datenschutz</p>
        <p className="hint" style={{ margin: 0 }}>
          Alle Daten dieser App bleiben ausschließlich lokal auf diesem Gerät gespeichert und
          werden nicht an externe Dienste übermittelt.
        </p>
      </div>

      {/* Sobald echte BWA- oder Vertriebsdaten importiert wurden, darf dieser Button nicht
          mehr angezeigt werden - er würde sonst echte Daten durch Demodaten ersetzen. */}
      {!hasRealImport && (
        <button className="secondary-button" onClick={handleReset} disabled={resetting}>
          {resetting ? 'Setze zurück …' : 'Demodaten zurücksetzen'}
        </button>
      )}
    </div>
  )
}
