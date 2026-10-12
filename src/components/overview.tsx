import { useMemo, useState } from 'react';
import { Button } from './ui/button';
import { buildOverview } from '../lib/overview';
import type { Workspace } from '../types';

const count = (n: number) => new Intl.NumberFormat('en-IN').format(n);
const money = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n / 100);
const date = (d: string) => new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${d}T12:00:00Z`));
const when = (d: string) => new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }).format(new Date(d));
const percent = (a: number, b: number) => b ? new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 }).format(a / b * 100) + '%' : '—';

export function Overview({ w, now, recordProduction, newOrder }: { w: Workspace; now: Date; recordProduction: () => void; newOrder: () => void }) {
  const model = useMemo(() => buildOverview(w, now), [w, now]);
  const [page, setPage] = useState(0);
  const [stockExpanded, setStockExpanded] = useState(false);
  const { total, overdue, dueSoon, shortages, oldQcPieces, rejectedToday, unbilledPaise } = model;
  const hasAttention = overdue.length || dueSoon.length || shortages.length || oldQcPieces || rejectedToday || unbilledPaise;
  const pages = Math.max(1, Math.ceil(model.dueOrders.length / 8)), safePage = Math.min(page, pages - 1);
  const inspected = total.accepted + total.rejected;
  const actions = { production: 'Production', inward: 'Material inward', dispatch: 'Dispatch', invoice: 'Billing' } as Record<string, string>;

  return <div className="operations-overview">
    <section className="attention-board" aria-labelledby="attention-heading">
      <div className="section-heading"><h2 id="attention-heading">Needs attention</h2></div>
      {!hasAttention ? <p className="all-clear">Nothing needs attention right now.</p> : <ul className="attention-list">
        {!!rejectedToday && <li className="issue"><div className="attention-row"><strong>{count(rejectedToday)} pieces rejected today</strong><span>Recorded in today’s quality inspections</span><a href="#quality" aria-label="Review QC for rejected pieces">Review QC <span aria-hidden="true">→</span></a></div></li>}
        {!!shortages.length && <li className="issue stock-alert"><div className="attention-row"><button className="stock-toggle" aria-expanded={stockExpanded} aria-controls="stock-alert-details" onClick={() => setStockExpanded(v => !v)}><strong>{count(shortages.length)} customer material {shortages.length === 1 ? 'balance' : 'balances'} below required stock</strong><span>{stockExpanded ? 'Hide details' : 'Show details'}</span></button><span>Based on remaining production for open orders</span><a href="#inventory" aria-label="Check stock for customer materials">Check stock <span aria-hidden="true">→</span></a></div><div id="stock-alert-details" hidden={!stockExpanded}><ul>{shortages.slice(0, 8).map(r => <li key={`${r.customerId}:${r.materialId}`}><div><strong>{r.materialId} · {r.material}</strong><span>{r.customer}</span></div><span>{count(r.available)} available / {count(r.required)} required · <b>{count(r.shortfall)} short</b></span></li>)}</ul>{shortages.length > 8 && <p>Showing 8 of {count(shortages.length)} shortages. Review Stock for the complete register.</p>}</div></li>}
        {!!overdue.length && <li className="issue"><div className="attention-row"><strong>{count(overdue.length)} job {overdue.length === 1 ? 'order' : 'orders'} overdue</strong><span>{overdue.slice(0, 3).map(o => `${o.number} · ${date(o.due)}`).join('; ')}{overdue.length > 3 ? `; +${overdue.length - 3} more` : ''}</span><a href="#orders" aria-label="View orders that are overdue">View orders <span aria-hidden="true">→</span></a></div></li>}
        {!!oldQcPieces && <li className="waiting"><div className="attention-row"><strong>{count(oldQcPieces)} pieces waiting for QC for more than 1 day</strong><span>{count(model.oldQcEntries)} uninspected {model.oldQcEntries === 1 ? 'entry' : 'entries'}</span><a href="#quality" aria-label="Review QC for entries older than one day">Review QC <span aria-hidden="true">→</span></a></div></li>}
        {!!dueSoon.length && <li className="waiting"><div className="attention-row"><strong>{count(dueSoon.length)} job {dueSoon.length === 1 ? 'order' : 'orders'} due within 3 days</strong><span>{dueSoon.slice(0, 3).map(o => `${o.number} · ${date(o.due)}`).join('; ')}{dueSoon.length > 3 ? `; +${dueSoon.length - 3} more` : ''}</span><a href="#orders" aria-label="View orders due within three days">View orders <span aria-hidden="true">→</span></a></div></li>}
        {!!unbilledPaise && <li className="waiting"><div className="attention-row"><strong>{money(unbilledPaise)} dispatched work unbilled</strong><span>{count(model.unbilledOrders.length)} job {model.unbilledOrders.length === 1 ? 'order' : 'orders'} with unbilled pieces</span><a href="#billing" aria-label="Open billing for dispatched work">Open billing <span aria-hidden="true">→</span></a></div></li>}
      </ul>}
    </section>

    <section className="operational-kpis" aria-label="Current production and billing totals">
      <div className="operational-kpi"><h2>Produced today</h2><div className="kpi-value">{model.producedToday ? count(model.producedToday) : <span className="kpi-empty">No entry today</span>}</div>{model.producedToday ? <p>Products recorded today</p> : <p>No production recorded today. <button onClick={recordProduction}>Record production</button> to add the first entry.</p>}<a href="#production">Production</a></div>
      <div className="operational-kpi priority"><h2>Pending QC</h2><div className={'kpi-value ' + (total.pending ? 'status-waiting' : '')}>{total.pending ? count(total.pending) : <span className="kpi-empty">None pending</span>}</div><p>{total.pending ? 'Pieces awaiting final inspection' : 'No pieces waiting for inspection.'}</p><a href="#quality">Inspect</a></div>
      <div className="operational-kpi"><h2>Ready to dispatch</h2><div className="kpi-value">{model.ready ? count(model.ready) : <span className="kpi-empty">None ready</span>}</div><p>{model.ready ? 'Accepted products still in the factory' : 'Accepted pieces will appear here after QC.'}</p><a href="#dispatch">Dispatch</a></div>
      <div className="operational-kpi priority"><h2>Unbilled amount</h2><div className={'kpi-value ' + (unbilledPaise ? 'status-waiting' : '')}>{unbilledPaise ? money(unbilledPaise) : <span className="kpi-empty">Nothing unbilled</span>}</div><p>{unbilledPaise ? 'Dispatched job-work charges, before tax' : 'No dispatched work waiting to be billed.'}</p><a href="#billing">Bill</a></div>
    </section>

    <section className="operations-panel" aria-labelledby="due-heading">
      <div className="section-heading"><h2 id="due-heading">Job orders due soon</h2><a href="#orders">All job orders</a></div>
      {!w.state.orders.length ? <div className="plain-empty"><p>No job orders yet. Create your first one.</p><Button onClick={newOrder}>Create job order</Button></div> : !model.dueOrders.length ? <p className="plain-empty">No outstanding job orders due within the next 3 days.</p> : <>
        <div className="table-wrap" tabIndex={0} role="region" aria-label="Job orders due soon, scroll for more columns"><table className="data-table due-table"><thead><tr><th scope="col">Job order</th><th scope="col">Customer</th><th scope="col">Product</th><th scope="col" className="right">Quantity</th><th scope="col">Due date</th><th scope="col">Status</th></tr></thead><tbody>{model.dueOrders.slice(safePage * 8, safePage * 8 + 8).map(o => {
          const status = model.status(o), t = model.orderTotals.get(o.id)!;
          return <tr key={o.id}><td><a className="order-reference" href={`#orders`} title={`Open job orders for ${o.number}`}>{o.number}</a></td><td>{model.customers.get(o.customerId)}</td><td><span className="primary-text">{o.productId}</span><span className="secondary-text">{model.products.get(o.productId)}</span></td><td className="right number">{count(o.quantity)}<span className="secondary-text">{count(t.accepted)} accepted</span></td><td className={'due-date ' + (o.due < model.date ? 'status-problem' : '')}>{date(o.due)}</td><td><span className={'plain-status ' + (status === 'Overdue' ? 'problem' : status === 'Dispatched' ? 'done' : 'waiting')}>{status}</span></td></tr>;
        })}</tbody></table></div>
        {pages > 1 && <div className="pagination"><span>{safePage * 8 + 1}–{Math.min(safePage * 8 + 8, model.dueOrders.length)} of {count(model.dueOrders.length)} orders</span><div><Button variant="outline" size="sm" disabled={!safePage} onClick={() => setPage(safePage - 1)}>Previous</Button><Button variant="outline" size="sm" disabled={safePage === pages - 1} onClick={() => setPage(safePage + 1)}>Next</Button></div></div>}
      </>}
    </section>

    <div className="operations-bottom">
      <section className="operations-panel" aria-labelledby="flow-heading"><div className="section-heading"><h2 id="flow-heading">Material to billing</h2><span>All saved work</span></div>
        {!w.state.inwards.length && !total.produced ? <p className="plain-empty">Receive customer materials and record production to start tracking this flow.</p> : <>
          <ol className="production-flow" tabIndex={0} aria-label="Material to billing quantities, scroll horizontally to view all stages"><li><span>Material inward</span><strong>{count(model.receivedComponents)}</strong><small>component pcs</small></li><li><span>Manufactured</span><strong>{count(total.produced)}</strong><small>product pcs</small></li><li><span>QC accepted</span><strong>{count(total.accepted)}</strong><small>product pcs</small></li><li><span>Dispatched</span><strong>{count(total.dispatched)}</strong><small>product pcs</small></li><li><span>Billed</span><strong>{count(total.billed)}</strong><small>product pcs</small></li></ol>
          <div className="conversion-details"><p><strong>QC yield {percent(total.accepted, inspected)}</strong> · Accepted out of {count(inspected)} inspected pieces</p><p>Dispatched {percent(total.dispatched, total.accepted)} of accepted pieces · Billed {percent(total.billed, total.dispatched)} of dispatched pieces</p>{!!total.pending && <p>{count(total.pending)} produced pieces still await QC.</p>}</div>
        </>}
        <div className="overview-entry-actions"><Button variant="outline" onClick={recordProduction}>Record production</Button><a href="#inventory">Material inward</a><a href="#dispatch">Dispatch</a></div>
      </section>
      <section className="operations-panel" aria-labelledby="activity-heading"><div className="section-heading"><h2 id="activity-heading">Recent activity</h2><span>Last 8 entries</span></div>
        {!model.activity.length ? <p className="plain-empty">No activity recorded yet. Inward, production, dispatch, and billing entries will appear here.</p> : <ol className="operations-activity">{model.activity.map(a => <li key={a.id}><div><strong>{actions[a.action]}{a.reference ? ` · ${a.reference}` : ''}</strong><p>{a.quantity !== undefined ? `${count(a.quantity)} ${a.action === 'inward' ? 'component' : 'product'} pcs` : ''}{a.customer ? ` · ${a.customer}` : ''}</p><span>By {a.actor || 'User not recorded'}</span></div><time dateTime={a.createdAt}>{when(a.createdAt)}</time></li>)}</ol>}
      </section>
    </div>
  </div>;
}
