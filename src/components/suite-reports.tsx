import { useEffect, useRef, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { businessRows, businessDue } from '../../server/commerce.mjs';
import { accountBalances } from '../../server/bookkeeping.mjs';
import { money, indiaDay, transactions, downloadExcel, partyName, displayDate } from '../lib/suite';
import type { Workspace } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { DataTable } from './record-table';
export const reportNames=['Sale','Purchase','Day book','All Transactions','Profit And Loss','Bill Wise Profit','Cash flow','Trial Balance Report','Balance Sheet','Party Statement','All parties','Party Report By Item','Sale Purchase By Party','Sale Purchase By Party Group','Tax summary'];
export function printPanel(node:HTMLElement|null){if(!node)return;const copy=document.createElement('div');copy.className='bill-print';copy.append(node.cloneNode(true));document.body.append(copy);window.print();copy.remove()}
export function SuiteReports({w}:{w:Workspace}){
 const [report,setReport]=useState('Sale'),[from,setFrom]=useState(indiaDay().slice(0,7)+'-01'),[to,setTo]=useState(indiaDay()),[query,setQuery]=useState(''),[party,setParty]=useState(''),[exporting,setExporting]=useState(false);const printable=useRef<HTMLDivElement>(null);
 useEffect(()=>{const update=()=>{let requested='';try{requested=decodeURIComponent(location.hash.split('/')[1]||'')}catch{}if(reportNames.includes(requested))setReport(requested)};update();window.addEventListener('hashchange',update);return()=>window.removeEventListener('hashchange',update)},[]);
 const snapshot:Workspace={...w,state:{...w.state,invoices:w.state.invoices.filter(r=>r.date<=to),payments:w.state.payments?.filter(r=>r.date<=to),businessRecords:businessRows(w.state).filter(r=>r.date<=to)}};
 const entries=transactions(snapshot).filter(t=>t.date>=from&&t.date<=to&&(!party||t.partyId===party)),business=businessRows(snapshot.state),accounts=accountBalances(w.state,report==='Profit And Loss'?from:'',to);
 let headers:string[]=[],rows:(string|number)[][]=[],currencyCols:number[]=[];
 if(['Sale','Purchase','Day book','All Transactions','Cash flow','Party Statement'].includes(report)){
  const filtered=entries.filter(t=>report==='Sale'?['Sale','Job-work bill','Credit note'].includes(t.type):report==='Purchase'?['Purchase bill','Debit note'].includes(t.type):report==='Cash flow'?t.cashIn||t.cashOut:true);
  headers=['Date','Ref no.','Party name','Type','Payment type','Total (₹)','Received / paid (₹)','Balance (₹)'];currencyCols=[5,6,7];rows=filtered.map(t=>[t.date,t.number,t.party,t.type,t.method,t.total/100,t.received/100,t.balance/100]);
  if(report==='Day book'||report==='Cash flow'){headers=['Date','Ref no.','Name','Type','Money in (₹)','Money out (₹)'];currencyCols=[4,5];rows=filtered.filter(t=>t.cashIn||t.cashOut).map(t=>[t.date,t.number,t.party,t.type,t.cashIn/100,t.cashOut/100])}
 }
 if(['Profit And Loss','Trial Balance Report','Balance Sheet'].includes(report)){
  if(report==='Profit And Loss'){headers=['Particulars','Income (₹)','Expense (₹)'];currencyCols=[1,2];rows=accounts.filter(a=>['income','expense'].includes(a.category)).map(a=>[a.account,a.category==='income'?(a.credit-a.debit)/100:0,a.category==='expense'?(a.debit-a.credit)/100:0]);const income=rows.reduce((n,r)=>n+Number(r[1]),0),expense=rows.reduce((n,r)=>n+Number(r[2]),0);rows.push(['Net profit / loss',income-expense,0])}
  else if(report==='Trial Balance Report'){headers=['Account','Category','Debit (₹)','Credit (₹)'];currencyCols=[2,3];rows=accounts.map(a=>[a.account,a.category,Math.max(0,a.debit-a.credit)/100,Math.max(0,a.credit-a.debit)/100]);rows.push(['Total','',rows.reduce((n,r)=>n+Number(r[2]),0),rows.reduce((n,r)=>n+Number(r[3]),0)])}
  else {headers=['Account','Category','Balance (₹)'];currencyCols=[2];rows=accounts.filter(a=>!['income','expense'].includes(a.category)).map(a=>[a.account,a.category,(a.category==='asset'?a.debit-a.credit:a.credit-a.debit)/100]);const profit=accounts.filter(a=>['income','expense'].includes(a.category)).reduce((n,a)=>n+a.credit-a.debit,0);if(profit)rows.push(['Retained earnings from saved entries','equity',profit/100])}
 }
 if(['All parties','Sale Purchase By Party','Sale Purchase By Party Group'].includes(report)){
  const parties=[...w.state.customers.map(c=>({id:c.id,name:c.name,contact:c.contact})),...business.filter(r=>r.kind==='supplier').map(r=>({id:r.id,name:r.data.name,contact:r.data.phone}))].filter(c=>!party||c.id===party);
  headers=['Party name','Contact','Sale amount (₹)','Purchase amount (₹)','Receivable (₹)','Payable (₹)'];currencyCols=[2,3,4,5];rows=parties.map(c=>{const tx=entries.filter(t=>t.partyId===c.id);return[c.name,c.contact,tx.filter(t=>['Sale','Job-work bill'].includes(t.type)).reduce((n,t)=>n+t.total,0)/100,tx.filter(t=>t.type==='Purchase bill').reduce((n,t)=>n+t.total,0)/100,tx.filter(t=>['Sale','Job-work bill'].includes(t.type)).reduce((n,t)=>n+t.balance,0)/100,tx.filter(t=>t.type==='Purchase bill').reduce((n,t)=>n+t.balance,0)/100]});
  if(report==='Sale Purchase By Party Group'){rows=rows.length?[['General','All ungrouped parties',...Array.from({length:4},(_,i)=>rows.reduce((n,r)=>n+Number(r[i+2]),0))]]:[];headers[0]='Group name'}
 }
 if(report==='Party Report By Item'){
  headers=['Party name','Item','Sale quantity','Sale amount (₹)','Purchase quantity','Purchase amount (₹)'];currencyCols=[3,5];const groups=new Map<string,(string|number)[]>();
  for(const r of business.filter(r=>['sale','purchase'].includes(r.kind)&&r.date>=from&&r.date<=to&&(!party||r.partyId===party)))for(const l of r.lines){const key=r.partyId+':'+l.itemId,row=groups.get(key)||[partyName(w,r.partyId),l.name,0,0,0,0];const i=r.kind==='sale'?2:4;row[i]=Number(row[i])+l.quantity;row[i+1]=Number(row[i+1])+l.amountPaise/100;groups.set(key,row)}rows=[...groups.values()];
 }
 if(report==='Bill Wise Profit'){
  headers=['Date','Invoice no.','Party','Sale before tax (₹)','Estimated cost (₹)','Estimated margin (₹)'];currencyCols=[3,4,5];
  rows=entries.filter(t=>['Sale','Job-work bill'].includes(t.type)).map(t=>{
   let cost=0,net=t.total;
   if(t.record){
    net=t.record.lines.reduce((n,l)=>n+Math.round(l.quantity*l.ratePaise*(1-l.discountBps/10000)),0);
    cost=t.record.lines.reduce((n,l)=>{const purchases=business.filter(r=>r.kind==='purchase'&&r.createdAt<=t.record!.createdAt&&r.date<=t.date).flatMap(r=>r.lines).filter(i=>i.itemId===l.itemId);const qty=purchases.reduce((n,p)=>n+p.quantity,0),value=purchases.reduce((n,p)=>n+Math.round(p.quantity*p.ratePaise*(1-p.discountBps/10000)),0);return n+(qty?Math.round(l.quantity*value/qty):0)},0);
   }else{
    const invoice=w.state.invoices.find(i=>i.id===t.id),produced=w.state.production.filter(p=>p.orderId===invoice?.orderId&&p.inspected&&p.date<=t.date),accepted=produced.reduce((n,p)=>n+p.accepted,0);
    cost=accepted?produced.reduce((n,p)=>n+p.accepted*p.wageRatePaise,0)*(invoice?.quantity||0)/accepted:0;
   }
   return[t.date,t.number,t.party,net/100,Math.round(cost)/100,(net-Math.round(cost))/100];
  });
 }
 if(report==='Tax summary'){
  headers=['Date','Invoice','Type','Tax rate %','Taxable amount (₹)','Tax (₹)'];currencyCols=[4,5];rows=business.filter(r=>['sale','purchase','credit','debit'].includes(r.kind)&&r.date>=from&&r.date<=to).flatMap(r=>r.lines.map(l=>{const net=Math.round(l.quantity*l.ratePaise*(1-l.discountBps/10000));return[r.date,r.number,r.kind,l.taxBps/100,net/100,(l.amountPaise-net)/100]}));
 }
 const filtered=rows.filter(r=>r.join(' ').toLowerCase().includes(query.toLowerCase()));
 async function exportReport(){setExporting(true);try{await downloadExcel(report,headers,filtered)}catch(e){toast.error((e as Error).message)}finally{setExporting(false)}}
 return <div className="suite-report-layout"><nav className="suite-report-nav" aria-label="Report types"><p>Transaction reports</p>{reportNames.map((name,i)=><div key={name}>{i===9&&<p>Party reports</p>}{i===14&&<p>Tax reports</p>}<button aria-current={report===name?'page':undefined} className={report===name?'active':''} onClick={()=>{setReport(name);setQuery('')}}>{name}</button></div>)}</nav><div className="suite-report-main"><div className="suite-filter-bar"><label>From<Input type="date" aria-label="Report from date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>To<Input type="date" aria-label="Report to date" value={to} min={from} onChange={e=>setTo(e.target.value)}/></label><label>Party<select className="native-select" aria-label="Report party" value={party} onChange={e=>setParty(e.target.value)}><option value="">All parties</option>{w.state.customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}{business.filter(r=>r.kind==='supplier').map(r=><option key={r.id} value={r.id}>{r.data.name}</option>)}</select></label><Button variant="outline" disabled={exporting} onClick={()=>void exportReport()}><Download data-icon="inline-start"/>{exporting?'Preparing…':'Excel report'}</Button><Button variant="outline" onClick={()=>printPanel(printable.current)}><Printer data-icon="inline-start"/>Print</Button></div><div ref={printable} className="suite-printable"><h2>{report}</h2><p className="suite-report-note">{from} to {to} · {report==='Tax summary'?'Entered tax rates only. This is not a GSTR filing or an e-invoice.':report==='Bill Wise Profit'?'Estimated item cost uses prior purchase averages; job-work cost allocates accepted piece wages by accepted quantity. Salaries, tax and overheads are excluded.':'Based on saved transactions. Customer-owned materials are excluded from inventory value. Unrecorded wages, liabilities and opening balances are excluded.'}</p><Input aria-label="Search report" placeholder="Search transactions" value={query} onChange={e=>setQuery(e.target.value)}/><DataTable rows={filtered} searchQuery={query} empty="No transactions to show" description="Save transactions in this workspace, then choose their date range." columns={headers.map((h,i)=>({title:h,right:currencyCols.includes(i),render:(r:(string|number)[])=>currencyCols.includes(i)?money(Math.round(Number(r[i])*100)):h==='Date'?displayDate(String(r[i])):r[i]}))}/></div></div></div>;
}
