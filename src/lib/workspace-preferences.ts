export type Preferences = { shift: string; operator: string; lastBackupAt?: string };
export const preferenceKey = (mode: 'demo' | 'actual') => `assemble-electrix:${mode}:preferences`;
export function readPreferences(storage: Pick<Storage, 'getItem'>, mode: 'demo' | 'actual'): Preferences {
  try {
    const value = JSON.parse(storage.getItem(preferenceKey(mode)) || '{}');
    return { shift: typeof value.shift === 'string' ? value.shift.slice(0, 80) : '', operator: typeof value.operator === 'string' ? value.operator.slice(0, 250) : '', lastBackupAt: typeof value.lastBackupAt === 'string' ? value.lastBackupAt : undefined };
  } catch { return { shift: '', operator: '' }; }
}
export function writePreferences(storage: Pick<Storage, 'setItem'>, mode: 'demo' | 'actual', preferences: Preferences) {
  storage.setItem(preferenceKey(mode), JSON.stringify(preferences));
}
