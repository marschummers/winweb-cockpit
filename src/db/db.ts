import Dexie, { type EntityTable } from 'dexie';
import type { FinanceMonth, SalesActivity, Project, AppMeta } from './types';
import { buildDemoData } from '../data/seed';
import type { ParsedFinanceMonth } from '../lib/importDatev';
import type { ParsedSalesActivity } from '../lib/importSalesJournal';

export const db = new Dexie('winweb-cockpit') as Dexie & {
  financeMonths: EntityTable<FinanceMonth, 'id'>;
  salesActivities: EntityTable<SalesActivity, 'id'>;
  projects: EntityTable<Project, 'id'>;
  appMeta: EntityTable<AppMeta, 'id'>;
};

db.version(1).stores({
  financeMonths: 'id, periodKey',
  deals: 'id, phase, expectedCloseDateStr',
  projects: 'id, status',
  appMeta: 'id',
});

// Vertriebspipeline wird nicht mehr manuell gepflegt (Deal-Modell), sondern monatlich aus dem
// Kundenaktivitätenjournal importiert (siehe lib/salesFunnel.ts) - "deals" wird entfernt,
// "salesActivities" kommt neu dazu.
db.version(2).stores({
  deals: null,
  salesActivities: 'id, customerNumber, activityDate',
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

  const demo = buildDemoData();
  const now = Date.now();
  await db.transaction('rw', db.financeMonths, db.salesActivities, db.projects, db.appMeta, async () => {
    await db.financeMonths.bulkAdd(demo.financeMonths);
    await db.salesActivities.bulkAdd(demo.salesActivities);
    await db.projects.bulkAdd(demo.projects);
    await db.appMeta.put({ id: 'singleton', demoSeededAt: now });
  });
}

// Heilt veraltete/fehlende Demodaten - JEDE Domäne (Finanzen/Vertrieb) wird nur dann
// angefasst, wenn für GENAU DIESE Domäne noch nie ein echter Import stattfand. So bleibt
// z.B. ein echter BWA-Import unangetastet, auch wenn zeitgleich die Vertriebs-Demodaten
// (neue Tabelle durch ein Dexie-Schema-Upgrade) noch befüllt werden müssen.
async function healStaleDemoDataIfNeeded(): Promise<void> {
  const meta = await db.appMeta.get('singleton');

  if (!meta?.lastFinanceImportAt) {
    const financeStale = (await db.financeMonths.filter((m) => m.totalOutput === undefined).count()) > 0;
    if (financeStale) {
      const demo = buildDemoData();
      await db.transaction('rw', db.financeMonths, db.appMeta, async () => {
        await db.financeMonths.clear();
        await db.financeMonths.bulkAdd(demo.financeMonths);
        const current = await db.appMeta.get('singleton');
        await db.appMeta.put({ ...current, id: 'singleton', demoSeededAt: Date.now() });
      });
    }
  }

  if (!meta?.lastSalesImportAt) {
    const salesEmpty = (await db.salesActivities.count()) === 0;
    if (salesEmpty) {
      const demo = buildDemoData();
      await db.transaction('rw', db.salesActivities, db.appMeta, async () => {
        await db.salesActivities.bulkAdd(demo.salesActivities);
        const current = await db.appMeta.get('singleton');
        await db.appMeta.put({ ...current, id: 'singleton', demoSeededAt: current?.demoSeededAt ?? Date.now() });
      });
    }
  }
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

// Übernimmt das komplette Kundenaktivitätenjournal. Anders als beim BWA-Import ist das hier
// IMMER ein vollständiger Ersatz (kein Upsert): jede monatliche Datei enthält laut Nutzer die
// komplette Historie neu, nicht nur neue Zeilen - ein Merge würde sonst nur unnötig
// komplizieren, ohne dass alte Zeilen je verloren gingen.
export async function importSalesActivities(parsed: ParsedSalesActivity[]): Promise<void> {
  await db.transaction('rw', db.salesActivities, db.appMeta, async () => {
    await db.salesActivities.clear();
    await db.salesActivities.bulkAdd(
      parsed.map((activity) => ({
        id: newId(),
        activityDate: activity.activityDate,
        activityType: activity.activityType,
        customerNumber: activity.customerNumber,
        searchName: activity.searchName,
        title: activity.title,
      })),
    );
    const meta = await db.appMeta.get('singleton');
    await db.appMeta.put({ ...meta, id: 'singleton', lastSalesImportAt: Date.now() });
  });
}

// Löscht alle Daten und legt frische Demodaten an (Einstellungen → "Demodaten zurücksetzen").
// Nur in dieser frühen Phase relevant, solange es noch keinen echten Import gibt.
export async function resetToFreshDemoData() {
  await db.transaction('rw', db.financeMonths, db.salesActivities, db.projects, db.appMeta, async () => {
    await db.financeMonths.clear();
    await db.salesActivities.clear();
    await db.projects.clear();
    await db.appMeta.clear();
  });
  localStorage.removeItem(SEED_FLAG_KEY);
  await seedDemoDataIfNeeded();
}
