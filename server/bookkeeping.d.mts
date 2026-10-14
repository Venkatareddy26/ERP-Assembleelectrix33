import type { State } from '../src/types';
export type JournalLine={id:string;date:string;number:string;account:string;category:string;debit:number;credit:number};
export type AccountBalance={account:string;category:string;debit:number;credit:number};
export function journal(state:State):JournalLine[];
export function accountBalances(state:State,from?:string,to?:string):AccountBalance[];
