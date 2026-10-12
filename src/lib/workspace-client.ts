import type { Bom, State, Workspace } from '../types';
import type { BrowserStore } from './browser-store.mjs';

export const usesBrowserStorage = import.meta.env.VITE_STORAGE_MODE === 'browser';
let storePromise: Promise<BrowserStore> | undefined;

function browserStore() {
  return storePromise ??= Promise.all([import('./browser-store.mjs'), import('../../data/bom.json')])
    .then(([{ createBrowserStore }, { default: bom }]) => createBrowserStore({ bom: bom as Bom }));
}

export async function loadWorkspace(mode: 'demo' | 'actual', signal?: AbortSignal): Promise<Workspace> {
  signal?.throwIfAborted();
  if (usesBrowserStorage) {
    const workspace = await (await browserStore()).load(mode);
    signal?.throwIfAborted();
    return workspace;
  }
  const response = await fetch('/api/workspace', { headers: { 'x-workspace': mode }, signal });
  if (!response.ok) throw new Error('Could not load saved records. Check that the local server is running.');
  return response.json();
}

export async function saveEntry(mode: 'demo' | 'actual', action: string, input: Record<string, unknown>, revision: number): Promise<{ state: State }> {
  if (usesBrowserStorage) return (await browserStore()).save(mode, action, input, revision);
  const response = await fetch('/api/action', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-workspace': mode },
    body: JSON.stringify({ action, input, revision }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'The entry could not be saved. Try again.');
  return result;
}

export async function exportWorkbook(mode: 'demo' | 'actual', section: string, options: { month: string; productId?: string }): Promise<Blob> {
  if (usesBrowserStorage) {
    const [{ buildWorkbook }, store] = await Promise.all([import('../../server/export.mjs'), browserStore()]);
    const bytes = await buildWorkbook(await store.load(mode), section, options);
    return new Blob([new Uint8Array(bytes).buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
  const params = new URLSearchParams({ section, month: options.month });
  if (options.productId) params.set('productId', options.productId);
  const response = await fetch(`/api/export?${params}`, { headers: { 'x-workspace': mode } });
  if (!response.ok) {
    const result = await response.json();
    throw new Error(result.error || 'The Excel export could not be prepared.');
  }
  return response.blob();
}
