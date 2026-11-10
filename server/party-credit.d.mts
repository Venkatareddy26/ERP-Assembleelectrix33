import type { State } from '../src/types';
export type PartyCreditStatus = { enabled: boolean; limitPaise: number; balancePaise: number; exceeded: boolean; remainingPaise: number };
export function normalizePartyCredit(state: State, input: Record<string, unknown>): {partyId:string;data:{enabled:string;limit:string}};
export function partyCredit(state: State, partyId: string): PartyCreditStatus;
