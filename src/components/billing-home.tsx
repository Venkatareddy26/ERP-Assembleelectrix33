import { useState } from 'react';
import { billPaid } from '../../server/manufacturing.mjs';
import { businessDue, businessRows } from '../../server/commerce.mjs';
import type { Workspace } from '../types';

const money = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value / 100);

/** Financial home uses saved bills and receipts; no projected sales or sample totals. */
export function BillingHome({ w, now }: { w: Workspace; now: Date }) {
  const [period, setPeriod] = useState('month');
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
  const month = today.slice(0, 7);
  const days = new Date(Number(month.slice(0, 4)), Number(month.slice(5)), 0).getDate();
  const business = businessRows(w.state);
  const billed = [...w.state.invoices,...business.filter(r=>r.kind==='sale'||r.kind==='credit').map(r=>({...r,amountPaise:r.kind==='credit'?-r.amountPaise:r.amountPaise}))];
  const invoices = billed.filter(b => period === 'all' || b.date.slice(0, 7) === month);
  const sales = invoices.reduce((sum, b) => sum + b.amountPaise, 0);
  const outstanding = w.state.invoices.filter(b => b.amountPaise > billPaid(w.state, b.id));
  const tradeOutstanding=business.filter(r=>r.kind==='sale'&&businessDue(w.state,r)>0);
  const receivable = outstanding.reduce((sum, b) => sum + b.amountPaise - billPaid(w.state, b.id), 0)+tradeOutstanding.reduce((n,r)=>n+businessDue(w.state,r),0);
  const parties = new Set(outstanding.map(b => w.state.orders.find(o => o.id === b.orderId)?.customerId));
  tradeOutstanding.forEach(r=>parties.add(r.partyId));
  const payable=business.filter(r=>r.kind==='purchase').reduce((n,r)=>n+businessDue(w.state,r),0);
  const points = Array.from({ length: days }, (_, i) => billed.filter(b => b.date === `${month}-${String(i + 1).padStart(2, '0')}`).reduce((sum, b) => sum + b.amountPaise, 0));
  const max = Math.max(...points, 10000);
  const min=Math.min(0,...points),range=max-min,zeroY=285+min/range*240;
  const line = points.map((v, i) => `${55 + i * 900 / (days - 1)},${285 - (v-min) / range * 240}`).join(' ');
  return <section className="billing-home" aria-label="Billing overview">
    <div className="billing-home-main">
      <div className="home-balances">
        <a className="home-balance" href="#reports/Party%20Statement"><h2>Total receivable</h2><strong>{receivable ? money(receivable) : 'Nothing outstanding'}</strong><p>{receivable ? `From ${parties.size} ${parties.size === 1 ? 'customer' : 'customers'}` : 'Unpaid bills will appear here.'}</p><span className="balance-indicator incoming" aria-hidden="true">↓</span></a>
        <a className="home-balance" href="#purchases"><h2>Total payable</h2><strong>{payable ? money(payable) : 'Nothing payable'}</strong><p>{payable?'Unpaid supplier bills':'You don’t have any payables as of now.'}</p><span className="balance-indicator payable" aria-hidden="true">↑</span></a>
      </div>
      <section className="home-sales" aria-labelledby="home-sales-title">
        <div className="home-sales-heading"><div><h2 id="home-sales-title">Total sale</h2><strong>{invoices.length ? money(sales) : 'No bills recorded'}</strong></div><label><span className="sr-only">Sales period</span><select value={period} onChange={e => setPeriod(e.target.value)}><option value="month">This month</option><option value="all">All time</option></select></label></div>
        {period === 'month' ? <><svg className="home-sales-chart" viewBox="0 0 980 330" role="img" aria-label={`Daily billed job-work charges for ${month}. Total ${money(sales)}.`}>
          {[0, 1, 2, 3, 4].map(i => <g key={i}><line x1="55" x2="955" y1={285 - i * 60} y2={285 - i * 60} stroke="#e1e4e9"/><text x="45" y={290 - i * 60} textAnchor="end">{new Intl.NumberFormat('en-IN', { notation: 'compact' }).format((min+range*i/4) / 100)}</text></g>)}
          <polygon points={`55,${zeroY} ${line} 955,${zeroY}`} fill="#dce8ff"/><polyline points={line} fill="none" stroke="#0879fa" strokeWidth="1.7"/>
          {[1, 4, 7, 10, 13, 16, 19, 22, 25, 28, days].filter((v, i, a) => a.indexOf(v) === i && v <= days).map(d => <text key={d} x={55 + (d - 1) * 900 / (days - 1)} y="312" textAnchor="middle">{d} {new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(new Date(`${month}-01T12:00:00`))}</text>)}
        </svg>{!invoices.length && <p className="home-chart-note">Create a bill after dispatch to start tracking sales.</p>}</> : <div className="home-all-sales"><p>{invoices.length} saved bills</p><a href="#billing">View billing register →</a></div>}
      </section>
      <section className="home-reports"><h2>Most Used Reports</h2><div>{[['Sale Report', 'Sale'], ['All Transactions', 'All Transactions'], ['Daybook Report', 'Day book'], ['Party Statement', 'Party Statement']].map(([label, target]) => <a key={target} href={`#reports/${encodeURIComponent(target)}`}>{label}<span aria-hidden="true">›</span></a>)}</div></section>
    </div>
    <aside className="home-factory-rail" aria-label="Manufacturing shortcuts">
      <section><h2>WhatsApp Connect <span className="home-service-state">Not connected</span></h2><p>Prepare messages from saved bills. Automatic delivery needs a business connection.</p><a href="#whatsapp">Connect WhatsApp</a></section>
      <section><h2>Google Profile Manager</h2><p>Manage your business information and profile through Google.</p><a href="#google">Connect now</a></section>
      <section><h2>Manufacturing</h2><p>Receive customer components, manufacture against a BOM and track finished pieces.</p><a href="#orders">Job orders →</a><a href="#bom">Products & BOM →</a></section>
      <section><h2>Component stock</h2><p>Customer-wise balances, consumption, unused material returns and stock corrections.</p><a href="#inventory">View stock ledger →</a></section>
      <section><h2>Quality & dispatch</h2><p>Inspect production before dispatch. Create bills for dispatched quantities.</p><a href="#quality">Inspect pieces →</a><a href="#dispatch">Dispatch register →</a></section>
      <section><h2>Workers & earnings</h2><p>Piece-rate earnings and salaried worker records.</p><a href="#workers">View workers →</a></section>
    </aside>
  </section>;
}
