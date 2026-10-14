import type { State } from '../src/types';
export function moveSign(type: string): number;
export function moveLabel(type: string): string;
export function componentStock(state: State, customerId: string, materialId: string): number;
export function billPaid(state: State, invoiceId: string): number;
export type ComponentLedgerRow = { id: string; customerId: string; materialId: string; kind: string; reference: string; received: number; issued: number; note: string; date: string; createdAt: string; actor: string; sequence: number; fallback: number; balance: number };
export function componentLedger(state: State): ComponentLedgerRow[];
