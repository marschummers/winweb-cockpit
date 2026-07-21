import type { Deal, DealPhase, FinanceMonth, Project } from '../db/types';
import { currentPeriodKey, shiftPeriodKey, toDateInputValue } from '../lib/date';
import { newId } from '../db/db';

function rnd(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

// Erzeugt 13 BWA-Monate (aktueller Monat + 12 zurück), damit Monats- und
// Vorjahresvergleich-Ansichten schon in der Demo genug Datenpunkte haben.
function buildFinanceMonths(): FinanceMonth[] {
  const months: FinanceMonth[] = [];
  const baseRevenue = 178000;
  const monthlyGrowth = 1400;

  for (let i = 12; i >= 0; i--) {
    const trend = baseRevenue + monthlyGrowth * (12 - i);
    const revenue = Math.round(trend + rnd(-13000, 13000));
    // Personal- und Sachkosten als Anteil vom Umsatz (statt fixer Absolutwerte), damit die
    // EBIT-Marge unabhängig vom Umsatzniveau in einer realistischen Bandbreite (~10-20%) bleibt.
    const costs = Math.round(revenue * rnd(0.36, 0.41));
    const personnelCosts = Math.round(revenue * rnd(0.42, 0.47));
    const ebit = revenue - costs - personnelCosts;

    // Nur für die Kennzahlen EBIT-Quote/GK-Rohertrag/Personalquote gebraucht (siehe
    // lib/ratios.ts) - grossProfit so gewählt, dass GK/Rohertrag meist im Richtwert
    // 0,70-0,80 liegt, gelegentlich knapp darüber/darunter (realistische Schwankung).
    const totalOutput = Math.round(revenue + rnd(0, 3000));
    const grossProfit = Math.round((costs + personnelCosts) / rnd(0.68, 0.84));
    const resultBeforeTax = Math.round(ebit - rnd(500, 3000));

    months.push({
      id: newId(),
      periodKey: shiftPeriodKey(currentPeriodKey(), -i),
      revenue,
      costs,
      personnelCosts,
      ebit,
      totalOutput,
      grossProfit,
      resultBeforeTax,
    });
  }
  return months;
}

const DEAL_SEEDS: Array<{ name: string; customerName: string; phase: DealPhase; volume: number; closeInDays: number }> = [
  { name: 'Website-Relaunch', customerName: 'Nordlicht Logistik GmbH', phase: 'Verhandlung', volume: 42000, closeInDays: 14 },
  { name: 'ERP-Anbindung', customerName: 'Kanzlei Pfeiffer & Roth', phase: 'Angebot', volume: 68000, closeInDays: 35 },
  { name: 'Wartungsvertrag 2027', customerName: 'Bäckerei Sonnenkorn', phase: 'Qualifiziert', volume: 15000, closeInDays: 60 },
  { name: 'Cloud-Migration', customerName: 'Fahrrad Manufaktur Elbe', phase: 'Lead', volume: 95000, closeInDays: 100 },
  { name: 'App-Erweiterung Modul B', customerName: 'Softwarehaus Kettner', phase: 'Verhandlung', volume: 31000, closeInDays: 9 },
  { name: 'Prozessberatung Q3', customerName: 'Rehder Maschinenbau', phase: 'Angebot', volume: 24000, closeInDays: 28 },
  { name: 'Support-Erweiterung', customerName: 'Mustermann GmbH', phase: 'Lead', volume: 12000, closeInDays: 75 },
  { name: 'Datenmigration Altsystem', customerName: 'Holzwerk Trentmann', phase: 'Gewonnen', volume: 54000, closeInDays: -20 },
  { name: 'Individualreport BI', customerName: 'Trattner Immobilien', phase: 'Verloren', volume: 18000, closeInDays: -40 },
];

function buildDeals(): Deal[] {
  const now = Date.now();
  return DEAL_SEEDS.map((seed) => {
    const closeDate = new Date(now + seed.closeInDays * 24 * 60 * 60 * 1000);
    const probabilityByPhase: Record<DealPhase, number> = {
      Lead: 10,
      Qualifiziert: 25,
      Angebot: 50,
      Verhandlung: 75,
      Gewonnen: 100,
      Verloren: 0,
    };
    return {
      id: newId(),
      name: seed.name,
      customerName: seed.customerName,
      phase: seed.phase,
      volume: seed.volume,
      probability: probabilityByPhase[seed.phase],
      expectedCloseDateStr: toDateInputValue(closeDate),
      createdAt: now - rnd(5, 90) * 24 * 60 * 60 * 1000,
    };
  });
}

const PROJECT_SEEDS: Array<{
  name: string;
  customerName: string;
  budget: number;
  hoursBudget: number;
  hoursConsumed: number;
  budgetConsumed: number;
  status: Project['status'];
  startedDaysAgo: number;
}> = [
  { name: 'Shopsystem Migration', customerName: 'Fahrrad Manufaktur Elbe', budget: 78000, hoursBudget: 520, hoursConsumed: 340, budgetConsumed: 49000, status: 'aktiv', startedDaysAgo: 70 },
  { name: 'BI-Dashboard Rollout', customerName: 'Rehder Maschinenbau', budget: 32000, hoursBudget: 210, hoursConsumed: 195, budgetConsumed: 30500, status: 'aktiv', startedDaysAgo: 40 },
  { name: 'Wartung & Betrieb 2026', customerName: 'Holzwerk Trentmann', budget: 54000, hoursBudget: 360, hoursConsumed: 410, budgetConsumed: 61000, status: 'aktiv', startedDaysAgo: 200 },
  { name: 'Prozessdigitalisierung', customerName: 'Bäckerei Sonnenkorn', budget: 21000, hoursBudget: 140, hoursConsumed: 60, budgetConsumed: 9500, status: 'pausiert', startedDaysAgo: 25 },
  { name: 'CRM-Einführung', customerName: 'Kanzlei Pfeiffer & Roth', budget: 45000, hoursBudget: 300, hoursConsumed: 300, budgetConsumed: 44200, status: 'abgeschlossen', startedDaysAgo: 260 },
];

function buildProjects(): Project[] {
  const now = Date.now();
  return PROJECT_SEEDS.map((seed) => ({
    id: newId(),
    name: seed.name,
    customerName: seed.customerName,
    budget: seed.budget,
    hoursBudget: seed.hoursBudget,
    hoursConsumed: seed.hoursConsumed,
    budgetConsumed: seed.budgetConsumed,
    status: seed.status,
    startDateStr: toDateInputValue(new Date(now - seed.startedDaysAgo * 24 * 60 * 60 * 1000)),
  }));
}

export function buildDemoData(): { financeMonths: FinanceMonth[]; deals: Deal[]; projects: Project[] } {
  return {
    financeMonths: buildFinanceMonths(),
    deals: buildDeals(),
    projects: buildProjects(),
  };
}
