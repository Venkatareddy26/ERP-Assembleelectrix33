import { useRef, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { normalizePartyCredit, partyCredit } from '../../server/party-credit.mjs';
import { saveEntry } from '../lib/workspace-client';
import { indiaDay, money } from '../lib/suite';
import type { State, Workspace } from '../types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Field, FieldGroup, FieldLabel } from './ui/field';
import { Input } from './ui/input';

type Props = {w:Workspace;partyId:string;operator:string;saved:(state:State)=>void};
export function PartyCreditWarning({w,partyId,added=0}:{w:Workspace;partyId:string;added?:number}) {
  const status=partyCredit(w.state,partyId),excess=status.balancePaise+added-status.limitPaise;
  return status.enabled&&excess>0?<Alert variant="destructive"><AlertDescription>{added>0?'This bill would take the party':'The party is'} {money(excess)} over the credit warning limit. You can still save the transaction.</AlertDescription></Alert>:null;
}
export function PartyCredit(props:Props) {
  const [open,setOpen]=useState(false);
  const status=partyCredit(props.w.state,props.partyId);
  return <div className="party-credit grid gap-2 p-3"><p>{status.enabled?`Credit warning limit: ${money(status.limitPaise)} · Balance: ${money(status.balancePaise)}`:'Credit warning is off.'}</p><PartyCreditWarning w={props.w} partyId={props.partyId}/><Button type="button" variant="outline" className="justify-self-start" onClick={()=>setOpen(true)}>Set credit warning</Button>{open&&<CreditSettings {...props} close={()=>setOpen(false)}/>}</div>;
}

function CreditSettings({w,partyId,operator,saved,close}:Props&{close:()=>void}) {
  const initial=partyCredit(w.state,partyId);
  const [enabled,setEnabled]=useState(initial.enabled),[limit,setLimit]=useState((initial.limitPaise/100).toFixed(2));
  const [pending,setPending]=useState(false),[dirty,setDirty]=useState(false),[error,setError]=useState('');
  const revision=useRef(w.state.revision),trigger=useRef(document.activeElement as HTMLElement|null),errorNode=useRef<HTMLDivElement>(null);
  const dismiss=()=>{if(!pending&&(!dirty||confirm('Discard unsaved credit warning changes?')))close()};
  async function submit(event:FormEvent) {
    event.preventDefault();setPending(true);setError('');
    try {
      const normalized=normalizePartyCredit(w.state,{partyId,data:{enabled:String(enabled),limit}});
      const result=await saveEntry(w.mode,'business-record',{kind:'party-credit',date:indiaDay(),...normalized,recordedBy:operator},revision.current);
      saved(result.state);toast.success('Party credit warning saved.');close();
    } catch (e) {setError((e as Error).message);requestAnimationFrame(()=>errorNode.current?.focus())} finally {setPending(false)}
  }
  return <Dialog open onOpenChange={value=>!value&&dismiss()}><DialogContent className="suite-entry" showCloseButton={!pending} onPointerDownOutside={e=>e.preventDefault()} onEscapeKeyDown={e=>{e.preventDefault();dismiss()}} onCloseAutoFocus={e=>{e.preventDefault();if(trigger.current?.isConnected)trigger.current.focus({preventScroll:true})}}><DialogHeader><DialogTitle>Party credit warning</DialogTitle><DialogDescription>Compare the party’s current balance with a saved limit. This is an advisory warning; transactions remain available.</DialogDescription></DialogHeader><form onSubmit={submit} aria-busy={pending}><div className="suite-entry-body"><FieldGroup><Field><FieldLabel htmlFor="party-credit-enabled"><input id="party-credit-enabled" type="checkbox" checked={enabled} disabled={pending} onChange={e=>{setDirty(true);setEnabled(e.target.checked)}}/>Enable credit warning</FieldLabel></Field><Field><FieldLabel htmlFor="party-credit-limit">Credit warning limit (₹)</FieldLabel><Input id="party-credit-limit" type="number" inputMode="decimal" min="0" max="1000000" step="0.01" required disabled={pending} value={limit} onChange={e=>{setDirty(true);setLimit(e.target.value)}}/></Field><p>Current balance: {money(initial.balancePaise)}. Includes job-work bills and trading bills, receipts, returns and refunds.</p></FieldGroup>{error&&<div className="form-error" role="alert" tabIndex={-1} ref={errorNode}>{error}</div>}</div><div className="suite-entry-footer"><Button type="button" variant="outline" onClick={dismiss} disabled={pending}>Cancel</Button><Button type="submit" disabled={pending}>{pending?'Saving…':'Save credit warning'}</Button></div></form></DialogContent></Dialog>;
}
