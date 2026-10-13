import type { Bom, State, Workspace } from '../types';
import type { Backup } from '../../server/backup.mjs';

export type BrowserStore = {
  load(mode: 'demo' | 'actual'): Promise<Workspace>;
  save(mode: 'demo' | 'actual', action: string, input: Record<string, unknown>, revision: number): Promise<{ state: State; record: unknown }>;
  restore(mode: 'demo' | 'actual', backup: Backup, revision: number | null): Promise<Workspace>;
};

export function createBrowserStore(options: {
  bom: Bom;
  indexedDBFactory?: IDBFactory;
  databaseName?: string;
}): BrowserStore;
