// BWA-Kennzahlen eines Monats. Beträge in vollen Euro als Zahl (Math.round genügt für dieses
// interne Management-Cockpit - anders als bei einer Buchhaltung spielt eine Cent-Rundungs-
// differenz hier keine Rolle). periodKey ist der Monat im Format 'YYYY-MM'. Es gibt bewusst
// keine Planwerte - nur Monats- und Vorjahresvergleiche auf Basis der Ist-Zahlen.
export interface FinanceMonth {
  id: string;
  periodKey: string;
  revenue: number;
  costs: number;
  personnelCosts: number;
  ebit: number;
  // Zusätzliche BWA-Zeilen, nur für die Kennzahlen EBIT-Quote/GK-Rohertrag/Personalquote
  // gebraucht (siehe lib/ratios.ts). 0, wenn die Zeile beim Import nicht gefunden wurde.
  totalOutput: number;
  grossProfit: number;
  resultBeforeTax: number;
  // Freitext-Notiz zur Interpretation des Monats (z.B. "Sonderausgabe Messe"). Rein manuell
  // gepflegt, kommt nie aus dem CSV-Import.
  comment?: string;
}

// Eine einzelne Zeile aus dem monatlich importierten Kundenaktivitätenjournal (CRM-Export).
// Die aktuelle Vertriebsphase eines Kunden wird NICHT hier gespeichert, sondern aus der
// jeweils neuesten Aktivität pro Kunden-Nr. abgeleitet (siehe lib/salesFunnel.ts) - der
// Import liefert bei jedem Hochladen die komplette Historie neu, nicht nur neue Zeilen.
export interface SalesActivity {
  id: string;
  activityDate: number;
  // Rohe Aktivitätsbezeichnung aus dem Export (z.B. "Richtpreisangebot", "Präsentation
  // online", "K U N D E") - die Zuordnung zu einer Funnel-Phase passiert erst beim Auswerten.
  activityType: string;
  customerNumber: string;
  searchName: string;
  // Enthält bei Richtpreisangebot/Angebot/Kunde oft einen Preis (z.B. "218.200,--"), sonst
  // Freitext (z.B. "Demo", "Sonstige Gründe") - siehe parsePriceFromTitle in lib/salesFunnel.ts.
  title: string;
}

export type ProjectStatus = 'aktiv' | 'pausiert' | 'abgeschlossen';

// Ein laufendes oder abgeschlossenes Kundenprojekt mit Budget- und Stunden-Tracking.
export interface Project {
  id: string;
  name: string;
  customerName: string;
  budget: number;
  hoursBudget: number;
  hoursConsumed: number;
  budgetConsumed: number;
  status: ProjectStatus;
  startDateStr: string;
}

// Einzige Zeile mit App-weiten Metadaten, u.a. für die "Datenstand"-Anzeige.
export interface AppMeta {
  id: 'singleton';
  demoSeededAt?: number;
  lastFinanceImportAt?: number;
  lastSalesImportAt?: number;
}
