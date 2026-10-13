import type { Workspace } from '../types';

const number = new Intl.NumberFormat('en-IN');
const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
type Item = { label: string; value: string; note: string };
const count = (label: string, value: number, note: string, empty: string): Item => ({ label, value: value ? number.format(value) : empty, note });

// A read-only summary of saved rows. Workflow validation and saved values stay
// in their existing domain/storage layer; this component never writes records.
export function ModuleSummary({ section, workspace }: { section: string; workspace: Workspace }) {
  const { state: s, bom } = workspace;
  let items: Item[];
  switch (section) {
    case 'bom': items = [count('Products', bom.products.length, 'Imported product catalogue', 'No products'), count('Materials', bom.materials.length, 'Components in the BOM', 'No materials'), count('BOM lines', bom.lines.length, 'Product-to-material requirements', 'No BOM lines')]; break;
    case 'customers': items = [count('Customers', s.customers.length, 'Customers in this workspace', 'No customers'), count('Product rates', s.rates.length, 'Saved customer piece rates', 'No rates'), count('Job orders', s.orders.length, 'Customer work received', 'No orders')]; break;
    case 'inventory': items = [count('Material receipts', s.inwards.length, 'Saved inward entries', 'No receipts'), count('Received pieces', s.inwards.reduce((sum, row) => sum + row.quantity, 0), 'Component pieces · all receipts', 'None received'), count('Customers', new Set(s.inwards.map(row => row.customerId)).size, 'Customers with inward records', 'None yet')]; break;
    case 'orders': items = [count('Job orders', s.orders.length, 'All saved job orders', 'No orders'), count('Ordered pieces', s.orders.reduce((sum, row) => sum + row.quantity, 0), 'Product pieces · all orders', 'None ordered'), count('Customers', new Set(s.orders.map(row => row.customerId)).size, 'Customers with job orders', 'None yet')]; break;
    case 'production': items = [count('Production entries', s.production.length, 'All recorded output', 'No entries'), count('Produced pieces', s.production.reduce((sum, row) => sum + row.quantity, 0), 'Product pieces · all entries', 'None produced'), count('Pending QC', s.production.filter(row => !row.inspected).reduce((sum, row) => sum + row.quantity, 0), 'Pieces awaiting inspection', 'None pending')]; break;
    case 'quality': items = [count('Awaiting inspection', s.production.filter(row => !row.inspected).length, 'Uninspected production entries', 'Queue clear'), count('Accepted pieces', s.production.reduce((sum, row) => sum + row.accepted, 0), 'Accepted in saved inspections', 'None accepted'), count('Rejected pieces', s.production.reduce((sum, row) => sum + row.rejected, 0), 'Rejected in saved inspections', 'None rejected')]; break;
    case 'dispatch': items = [count('Dispatches', s.dispatches.length, 'Saved dispatch records', 'No dispatches'), count('Dispatched pieces', s.dispatches.reduce((sum, row) => sum + row.quantity, 0), 'Accepted product pieces sent out', 'None dispatched'), count('Customers', new Set(s.dispatches.map(row => s.orders.find(order => order.id === row.orderId)?.customerId)).size, 'Customers with dispatched work', 'None yet')]; break;
    case 'billing': {
      const charges = s.invoices.reduce((sum, row) => sum + row.amountPaise, 0);
      items = [count('Job-work bills', s.invoices.length, 'Saved billing statements', 'No bills'), count('Billed pieces', s.invoices.reduce((sum, row) => sum + row.quantity, 0), 'Dispatched pieces billed', 'None billed'), { label: 'Billed charges', value: charges ? money.format(charges / 100) : 'Nothing billed', note: 'Job-work charges · before tax' }]; break;
    }
    case 'workers': items = [count('Workers', s.workers.length, 'Registered workers', 'No workers'), count('Piece-rate workers', s.workers.filter(row => row.type === 'piece').length, 'Paid per accepted piece', 'None yet'), count('Salaried workers', s.workers.filter(row => row.type !== 'piece').length, 'Monthly salary records', 'None yet')]; break;
    default: return null;
  }
  return <dl className="module-summary" data-module={section} aria-label={`${section} saved record summary`}>{items.map(item => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd><dd className="summary-note">{item.note}</dd></div>)}</dl>;
}
