import type { Bom, State, Workspace } from '../src/types';

export type Backup = Workspace & { exportedAt: string; schemaVersion: 1 | 2 | 3 };
export const recordCollections: (keyof Omit<State, 'revision'>)[];
export const loadErrorMessage: string;
export const staleRestoreMessage: string;
export function validateBackup(backup: unknown, mode: 'demo' | 'actual', bom: Bom): Backup;
export function parseBackup(text: string, mode: 'demo' | 'actual', bom: Bom): Backup;
export function isReadableState(state: unknown): state is State;
export function restoredState(backup: Backup, currentState: unknown, expectedRevision: number | null): State;
