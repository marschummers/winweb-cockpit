import Dexie, { type EntityTable } from 'dexie';
import type { FinanceMonth, Deal, Project, AppMeta } from './types';
import { buildDemoData } from '../data/seed';

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
  if (localStorage.getItem(SEED_FLAG_KEY)) return;
  localStorage.setItem(SEED_FLAG_KEY, '1');

  const alreadyHasData = (await db.financeMonths.count()) > 0;
  if (alreadyHasData) return;

  const demo = buildDemoData();
  const now = Date.now();
  await db.transaction('rw', db.financeMonths, db.deals, db.projects, db.appMeta, async () => {
    await db.financeMonths.bulkAdd(demo.financeMonths);
    await db.deals.bulkAdd(demo.deals);
    await db.projects.bulkAdd(demo.projects);
    await db.appMeta.put({ id: 'singleton', demoSeededAt: now });
  });
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
