import { useEffect, useState } from 'react'
import { updateFinanceMonthComment } from '../db/db'

// Lokaler Zwischenstand statt direktem Schreiben bei jedem Tastendruck - sonst würde
// useLiveQuery in FinancePage bei jedem Zeichen neu abfragen und die Karte neu rendern,
// während man noch mittendrin tippt. Gespeichert wird erst beim Verlassen des Felds.
export default function MonthCommentField({ monthId, initialComment }: { monthId: string; initialComment?: string }) {
  const [value, setValue] = useState(initialComment ?? '')

  useEffect(() => {
    setValue(initialComment ?? '')
  }, [monthId, initialComment])

  function handleBlur() {
    if (value !== (initialComment ?? '')) {
      updateFinanceMonthComment(monthId, value)
    }
  }

  return (
    <textarea
      className="month-comment"
      placeholder="Kommentar zur Interpretation…"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleBlur}
      rows={2}
    />
  )
}
