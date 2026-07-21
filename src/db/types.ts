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

export const DEAL_PHASES = ['Lead', 'Qualifiziert', 'Angebot', 'Verhandlung', 'Gewonnen', 'Verloren'] as const;
export type DealPhase = (typeof DEAL_PHASES)[number];

// Phasen, die noch zur offenen Pipeline zählen (Gewonnen/Verloren sind abgeschlossen und
// fließen nicht mehr in die gewichtete/ungewichtete Pipeline-Summe ein).
export const OPEN_DEAL_PHASES: DealPhase[] = ['Lead', 'Qualifiziert', 'Angebot', 'Verhandlung'];

// Eine Verkaufschance in der Vertriebspipeline.
export interface Deal {
  id: string;
  name: string;
  customerName: string;
  phase: DealPhase;
  volume: number;
  // Abschlusswahrscheinlichkeit in Prozent (0-100), abhängig von der Phase voreingestellt,
  // aber pro Opportunity einzeln anpassbar.
  probability: number;
  expectedCloseDateStr: string;
  createdAt: number;
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
}
