import { useState } from 'react';
import type { Workspace, State } from '../types';
import { billPaid } from '../../server/manufacturing.mjs';
import { DataTable } from './record-table';
import { OperationalEntry } from './operational-entry';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
const money=(n:number)=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(n/100);
export function BillingReceipts({w,search,operator,saved}:{w:Workspace;search:string;operator:string;saved:(state:State)=>void}){
 const [invoiceId,setInvoiceId]=useState<string|null>(null);
 const customer=(orderId:string)=>w.state.customers.find(row=>row.id===w.state.orders.find(order=>order.id===orderId)?.customerId)?.name??'';
 const matches=(...text:string[])=>text.join(' ').toLowerCase().includes(search.toLowerCase());
 const due=w.state.invoices.filter(row=>billPaid(w.state,row.id)<row.amountPaise);
 const outstanding=due.reduce((sum,row)=>sum+row.amountPaise-billPaid(w.state,row.id),0);
 return <section className="panel billing-receipts" aria-labelledby="payments-heading"><div className="panel-header"><div><h2 id="payments-heading" tabIndex={-1}>Payments & outstanding</h2><p data-rule={true}>{outstanding?`${money(outstanding)} unpaid on saved job-work bills`:'No unpaid job-work bills'} · before tax</p></div><Button variant="outline" disabled={!due.length} onClick={()=>setInvoiceId('')}>Record payment</Button></div>
 <Tabs defaultValue="outstanding"><TabsList aria-label="Billing payment registers"><TabsTrigger value="outstanding">Outstanding</TabsTrigger><TabsTrigger value="receipts">Receipts</TabsTrigger></TabsList>
 <TabsContent value="outstanding"><DataTable rows={due.filter(row=>matches(row.number,customer(row.orderId)))} searchQuery={search} empty={w.state.invoices.length?'All saved bills are paid':'No bills to collect yet'} description="Create a bill from dispatched pieces, then record receipts against it." columns={[{title:'Bill / customer',render:row=><><span className="primary-text record-id">{row.number}</span><span className="secondary-text">{customer(row.orderId)}</span></>},{title:'Billed amount',right:true,render:row=>money(row.amountPaise)},{title:'Received',right:true,render:row=>money(billPaid(w.state,row.id))},{title:'Outstanding',right:true,render:row=><strong>{money(row.amountPaise-billPaid(w.state,row.id))}</strong>},{title:'',render:row=><Button variant="outline" size="sm" onClick={()=>setInvoiceId(row.id)}>Receive payment</Button>}]}/></TabsContent>
 <TabsContent value="receipts"><DataTable rows={[...(w.state.payments??[])].reverse().filter(row=>{const bill=w.state.invoices.find(bill=>bill.id===row.invoiceId);return matches(row.number,row.reference,bill?.number??'',bill?customer(bill.orderId):'')})} searchQuery={search} empty="No payments recorded" description="Record a receipt when a customer pays a saved bill." columns={[{title:'Receipt / date',render:row=><><span className="primary-text record-id">{row.number}</span><span className="secondary-text">{row.date}</span></>},{title:'Bill / customer',render:row=>{const bill=w.state.invoices.find(bill=>bill.id===row.invoiceId);return <><span className="primary-text">{bill?.number}</span><span className="secondary-text">{bill?customer(bill.orderId):''}</span></>}},{title:'Reference',render:row=>row.reference},{title:'Method',render:row=><Badge variant="outline" className="badge-neutral">{row.method.toUpperCase()}</Badge>},{title:'Amount',right:true,render:row=>money(row.amountPaise)}]}/></TabsContent>
 </Tabs>{invoiceId!==null&&<OperationalEntry w={w} kind="payment" initial={{invoiceId}} operator={operator} saved={saved} close={()=>setInvoiceId(null)}/>}</section>;
}
