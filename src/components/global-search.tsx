import { useMemo, useRef, useState } from 'react';
import { Input } from './ui/input';
import type { Workspace } from '../types';

export function GlobalSearch({ w, select }: { w: Workspace | null; select: (section: string, term: string, productId?: string) => void }) {
  const [query, setQuery] = useState(''), [focused, setFocused] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const results = useMemo(() => {
    if (!w || !query.trim()) return [];
    const q = query.trim().toLowerCase();
    const customer = new Map(w.state.customers.map(c => [c.id, c.name]));
    const product = new Map(w.bom.products.map(p => [p.id, p.name]));
    return [
      ...w.state.orders.filter(o => `${o.number} ${customer.get(o.customerId)} ${o.productId} ${product.get(o.productId)}`.toLowerCase().includes(q)).slice(0, 5).map(o => ({ id: o.id, kind: 'Job order', title: o.number, detail: `${customer.get(o.customerId)} · ${o.productId}`, section: 'orders', term: o.number, productId: undefined })),
      ...w.state.customers.filter(c => `${c.name} ${c.contact}`.toLowerCase().includes(q)).slice(0, 5).map(c => ({ id: c.id, kind: 'Customer', title: c.name, detail: c.contact, section: 'customers', term: c.name, productId: undefined })),
      ...w.bom.products.filter(p => `${p.id} ${p.name}`.toLowerCase().includes(q)).slice(0, 5).map(p => ({ id: p.id, kind: 'Product', title: p.id, detail: p.name, section: 'bom', term: '', productId: p.id })),
    ];
  }, [w, query]);
  return <div className="global-search" ref={container} onBlur={e => { if (!container.current?.contains(e.relatedTarget as Node)) setFocused(false); }}>
    <Input name="global-search" aria-label="Search job orders, customers, and products" aria-controls={focused && query.trim() ? 'global-search-results' : undefined} placeholder="Search jobs, customers, products…" autoComplete="off" value={query} disabled={!w} onFocus={() => setFocused(true)} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') { setFocused(false); setQuery(''); } }} />
    {query && <button className="global-search-clear" aria-label="Clear global search" onMouseDown={e => e.preventDefault()} onClick={() => { setQuery(''); container.current?.querySelector('input')?.focus(); }}>Clear</button>}
    {focused && query.trim() && <section className="global-search-results" id="global-search-results" aria-label="Search results"><p role="status">{results.length ? `${results.length} matches shown` : 'No matching job orders, customers, or products.'}</p>{!!results.length && <ul>{results.map(r => <li key={`${r.kind}-${r.id}`}><a href={`#${r.section}`} onClick={() => { select(r.section, r.term, r.productId); setQuery(''); setFocused(false); }}><span>{r.kind}</span><div><strong>{r.title}</strong>{r.detail && <small>{r.detail}</small>}</div></a></li>)}</ul>}</section>}
  </div>;
}
