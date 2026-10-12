import type { Bom, State, Workspace } from '../types';

export type BrowserStore = {
  load(mode: 'demo' | 'actual'): Promise<Workspace>;
  save(mode: 'demo' | 'actual', action: string, input: Record<string, unknown>, revision: number): Promise<{ state: State; record: unknown }>;
};

export function createBrowserStore(options: {
  bom: Bom;
  indexedDBFactory?: IDBFactory;
  databaseName?: string;
}): BrowserStore;
