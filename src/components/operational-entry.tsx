import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { State, Workspace } from '../types';
import { billPaid, componentStock } from '../../server/manufacturing.mjs';
import { saveEntry } from '../lib/workspace-client';
import { indiaDate } from '../lib/overview';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Field, FieldGroup, FieldLabel } from './ui/field';
import { Alert, AlertDescription } from './ui/alert';
import { toast } from 'sonner';
const money=(n:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(n/100);
export function OperationalEntry({ w, kind, initial={}, operator, saved, close }: {w:Workspace;kind:'material-move'|'payment';initial?:Record<string,string>;operator:string;saved:(state:State)=>void;close:()=>void}){
 const [values,setValues]=useState<Record<string,string>>({date:indiaDate(new Date()),type:'return',method:'bank',...initial});
 const [pending,setPending]=useState(false),[dirty,setDirty]=useState(false),[error,setError]=useState('');
 const revision=useRef(w.state.revision),alive=useRef(true),failure=useRef<HTMLDivElement>(null),trigger=useRef(document.activeElement as HTMLElement|null);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false}},[]);
 const set=(key:string,value:string)=>{setDirty(true);setValues(old=>({...old,[key]:value}))};
 const changeClose=()=>{if(!pending&&(!dirty||window.confirm('Discard the changes in this form?')))close()};
 const invoice=w.state.invoices.find(row=>row.id===values.invoiceId);
 const due=invoice?invoice.amountPaise-billPaid(w.state,invoice.id):0;
 const balance=componentStock(w.state,values.customerId,values.materialId);
 const title=kind==='payment'?'Record payment':'Material return or correction';
 const select=(key:string,label:string,options:{value:string;label:string}[]) => <Field><FieldLabel htmlFor={`op-${key}`}>{label}</FieldLabel><select className="native-select" id={`op-${key}`} required value={values[key]??''} disabled={pending} onChange={e=>set(key,e.target.value)}><option value="">Select {label.toLowerCase()}</option>{options.map(row=><option key={row.value} value={row.value}>{row.label}</option>)}</select></Field>;
 const input=(key:string,label:string,type='text',step?:string) => <Field><FieldLabel htmlFor={`op-${key}`}>{label}</FieldLabel><Input id={`op-${key}`} name={key} type={type} step={step} min={type==='number'?(kind==='payment'?0.01:1):undefined} max={type==='number'?(kind==='payment'?Math.min(1000000,due/100):10000000):undefined} maxLength={type==='text'?250:undefined} required value={values[key]??''} disabled={pending} onChange={e=>set(key,e.target.value)}/></Field>;
 async function submit(e:FormEvent){e.preventDefault();setPending(true);setError('');try{const result=await saveEntry(w.mode,kind,{...values,recordedBy:operator},revision.current);if(alive.current){saved(result.state);toast.success(kind==='payment'?'Payment recorded.':'Component movement recorded.');close()}}catch(e){if(alive.current){setError((e as Error).message);requestAnimationFrame(()=>failure.current?.focus())}}finally{if(alive.current)setPending(false)}}
 return <Dialog open onOpenChange={next=>!next&&changeClose()}><DialogContent className="operational-entry-dialog" showCloseButton={!pending} onCloseAutoFocus={e=>{e.preventDefault();if(trigger.current?.isConnected)trigger.current.focus({preventScroll:true})}} onPointerDownOutside={e=>e.preventDefault()} onEscapeKeyDown={e=>{e.preventDefault();changeClose()}}><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{w.mode==='demo'?'Demo workspace':'Your actual records'} · This creates a separate, audited entry.</DialogDescription></DialogHeader><form onSubmit={submit} aria-busy={pending}><FieldGroup className="form-grid">
 {kind==='material-move'?<>
 {select('type','Movement',[{value:'return',label:'Return unused materials to customer'},{value:'adjustment-in',label:'Stock correction — add pieces'},{value:'adjustment-out',label:'Stock correction — remove pieces'}])}
 {select('customerId','Customer',w.state.customers.map(row=>({value:row.id,label:row.name})))}
 {select('materialId','Component',w.bom.materials.map(row=>({value:row.id,label:`${row.id} — ${row.name}`})))}
 {values.customerId&&values.materialId&&<Alert><AlertDescription>Available: <strong>{new Intl.NumberFormat('en-IN').format(balance)} component pcs</strong>. Production consumption stays unchanged. A return removes only unused stock.</AlertDescription></Alert>}
 {input('quantity','Component quantity (pcs)','number','1')}{input('reference','Challan / correction reference')}{input('note','Reason')}{input('date','Movement date','date')}
 </>:<>
 {select('invoiceId','Bill',w.state.invoices.filter(row=>row.amountPaise>billPaid(w.state,row.id)).map(row=>{const order=w.state.orders.find(item=>item.id===row.orderId);return {value:row.id,label:`${row.number} · ${w.state.customers.find(item=>item.id===order?.customerId)?.name??''} · ${money(row.amountPaise-billPaid(w.state,row.id))} due`}}))}
 {invoice&&<Alert><AlertDescription>Outstanding: <strong>{money(due)}</strong>. Receipts apply to this bill’s saved job-work charges, before tax.</AlertDescription></Alert>}
 {input('amount','Amount received (₹)','number','0.01')}{select('method','Payment method',[{value:'cash',label:'Cash'},{value:'bank',label:'Bank transfer'},{value:'upi',label:'UPI'},{value:'other',label:'Other'}])}{input('reference','Unique receipt reference')}{input('date','Payment date','date')}
 </>}
 {error&&<div className="form-error" role="alert" tabIndex={-1} ref={failure}>{error}</div>}
 </FieldGroup><div className="form-controls"><Button type="button" variant="outline" disabled={pending} onClick={changeClose}>Cancel</Button><Button type="submit" disabled={pending}>{pending?'Saving…':kind==='payment'?'Save payment':'Record movement'}</Button></div></form></DialogContent></Dialog>;
}
