import Dexie, { type EntityTable } from 'dexie';
import type { FinanceMonth, Deal, Project, AppMeta } from './types';
import { buildDemoData } from '../data/seed';
import type { ParsedFinanceMonth } from '../lib/importDatev';

export const db = new Dexie('winweb-cockpit') as Dexie & {
  financeMonths: EntityTable<FinanceMonth, 'id'>;
  deals: EntityTable<Deal, 'id'>;
  projects: EntityTable<Project, 'id'>;
  appMeta: EntityTable<AppMeta, 'id'>;
};

db.version(1).stores({
  financeMonths: 'id, periodKey',
  deals: 'id, phase, expectedCloseDateStr',
  projects: 'id, status',
  appMeta: 'id',
});

export function newId(): string {
  return crypto.randomUUID();
}

// Befüllt die (leere) Datenbank einmalig mit realistisch wirkenden Demodaten für alle vier
// Bereiche, damit Cockpit/Finanzen/Vertrieb/Projekte von Anfang an navigierbar sind, statt
// leere Zustände zu zeigen. Das Flag wird SOFORT gesetzt (vor jedem await), damit React
// StrictMode im Dev-Modus (doppelte Effect-Ausführung) keine doppelten Demodaten anlegt.
const SEED_FLAG_KEY = 'winweb-cockpit-demo-seeded-v1';

export async function seedDemoDataIfNeeded() {
  if (localStorage.getItem(SEED_FLAG_KEY)) {
    await healStaleDemoDataIfNeeded();
    return;
  }
  localStorage.setItem(SEED_FLAG_KEY, '1');

  const alreadyHasData = (await db.financeMonths.count()) > 0;
  if (alreadyHasData) return;

  await replaceFinanceRelatedDemoData();
}

async function replaceFinanceRelatedDemoData(): Promise<void> {
  const demo = buildDemoData();
  const now = Date.now();
  await db.transaction('rw', db.financeMonths, db.deals, db.projects, db.appMeta, async () => {
    await db.financeMonths.clear();
    await db.deals.clear();
    await db.projects.clear();
    await db.financeMonths.bulkAdd(demo.financeMonths);
    await db.deals.bulkAdd(demo.deals);
    await db.projects.bulkAdd(demo.projects);
    const meta = await db.appMeta.get('singleton');
    await db.appMeta.put({ ...meta, id: 'singleton', demoSeededAt: now });
  });
}

// Demodaten, die noch aus einer Version vor Einführung von totalOutput/grossProfit/
// resultBeforeTax stammen, werden automatisch aufgefrischt - sonst blieben EBIT-Quote &
// Co. für alle, die die App schon vor diesen Feldern geöffnet hatten, dauerhaft leer/NaN.
// Echte importierte Daten werden NIE angefasst (erkennbar an appMeta.lastFinanceImportAt).
async function healStaleDemoDataIfNeeded(): Promise<void> {
  const meta = await db.appMeta.get('singleton');
  if (meta?.lastFinanceImportAt) return;

  const hasStaleRow = (await db.financeMonths.filter((m) => m.totalOutput === undefined).count()) > 0;
  if (!hasStaleRow) return;

  await replaceFinanceRelatedDemoData();
}

// Übernimmt geparste BWA-Monate aus einem CSV-Import in financeMonths. Beim ALLERERSTEN
// echten Import werden zuerst die Demodaten gelöscht (sie sollen nicht neben echten Zahlen
// stehen bleiben) - bei jedem weiteren Import bleiben bereits importierte Monate erhalten,
// die nicht in der neuen Datei vorkommen (eine BWA-Entwicklungsübersicht deckt immer nur ein
// rollierendes 12-Monats-Fenster ab). Ein Monat, der schon existiert (gleicher periodKey),
// wird per Update überschrieben statt dupliziert - das macht den Import wiederholbar.
export async function importFinanceMonths(parsedMonths: ParsedFinanceMonth[]): Promise<void> {
  await db.transaction('rw', db.financeMonths, db.appMeta, async () => {
    const meta = await db.appMeta.get('singleton');
    const isFirstRealImport = !meta?.lastFinanceImportAt;
    if (isFirstRealImport) {
      await db.financeMonths.clear();
    }

    for (const month of parsedMonths) {
      const existing = await db.financeMonths.where('periodKey').equals(month.periodKey).first();
      const fields = {
        periodKey: month.periodKey,
        revenue: month.revenue,
        costs: month.costs,
        personnelCosts: month.personnelCosts,
        ebit: month.ebit,
        totalOutput: month.totalOutput,
        grossProfit: month.grossProfit,
        resultBeforeTax: month.resultBeforeTax,
      };
      if (existing) {
        await db.financeMonths.update(existing.id, fields);
      } else {
        await db.financeMonths.add({ id: newId(), ...fields });
      }
    }

    await db.appMeta.put({ ...meta, id: 'singleton', lastFinanceImportAt: Date.now() });
  });
}

// Speichert die Interpretations-Notiz zu einem BWA-Monat (rein manuell, nie aus dem Import).
export async function updateFinanceMonthComment(id: string, comment: string): Promise<void> {
  await db.financeMonths.update(id, { comment });
}

// Löscht alle Daten und legt frische Demodaten an (Einstellungen → "Demodaten zurücksetzen").
// Nur in dieser frühen Phase relevant, solange es noch keinen echten Import gibt.
export async function resetToFreshDemoData() {
  await db.transaction('rw', db.financeMonths, db.deals, db.projects, db.appMeta, async () => {
    await db.financeMonths.clear();
    await db.deals.clear();
    await db.projects.clear();
    await db.appMeta.clear();
  });
  localStorage.removeItem(SEED_FLAG_KEY);
  await seedDemoDataIfNeeded();
}
