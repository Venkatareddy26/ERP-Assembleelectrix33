import type { Workspace } from '../src/types';

export function buildWorkbook(
  workspace: Workspace,
  section: string,
  options?: { month?: string; productId?: string },
): Promise<Uint8Array>;
