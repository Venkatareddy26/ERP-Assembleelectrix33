import { useEffect, useId, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, ClipboardList } from 'lucide-react';
import { Button } from './ui/button';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia, EmptyContent } from './ui/empty';

export type Column<T> = {
  title: string;
  render: (row: T) => ReactNode;
  right?: boolean;
  action?: boolean | ((row: T) => boolean);
};

const count = (value: number) => new Intl.NumberFormat('en-IN').format(value);

// One register and one pagination state for both layouts. Mobile labels reuse
// the actual column headings; the saved rows and their actions stay the same.
export function DataTable<T>({ rows, columns, empty = 'No records yet', description = 'Use the add button above to create your first entry.', searchQuery = '', action, mobileStatus, mobileLayout, mobileDetails }: {
  rows: T[];
  columns: Column<T>[];
  empty?: string;
  description?: string;
  searchQuery?: string;
  action?: ReactNode;
  mobileStatus?: (row: T) => ReactNode;
  mobileLayout?: 'production' | 'dispatch-ready';
  mobileDetails?: (row: T) => ReactNode;
}) {
  const [page, setPage] = useState(0);
  const tableId = useId();
  const size = 10, pages = Math.max(1, Math.ceil(rows.length / size)), safePage = Math.min(page, pages - 1);
  useEffect(() => setPage(0), [rows.length, searchQuery]);
  if (!rows.length) return <Empty className="empty-state"><EmptyHeader><EmptyMedia variant="icon"><ClipboardList /></EmptyMedia><EmptyTitle>{searchQuery ? 'No matching records' : empty}</EmptyTitle><EmptyDescription>{searchQuery ? 'Try another name or reference, or clear the search.' : description}</EmptyDescription></EmptyHeader>{action && <EmptyContent>{action}</EmptyContent>}</Empty>;
  return <>
    <div className="table-wrap register-wrap" tabIndex={0} role="region" aria-label="Records">
      <table className="data-table register-table" data-mobile-layout={mobileLayout} role="table">
        <thead><tr>{mobileStatus && <th id={`${tableId}-status`} className="mobile-record-status" scope="col">Status</th>}{columns.map((column, index) => <th key={column.title} id={`${tableId}-${index}`} scope="col" className={column.right ? 'right' : ''}>{column.title}</th>)}</tr></thead>
        <tbody>{rows.slice(safePage * size, (safePage + 1) * size).map((row, index) => {
          const status = mobileStatus?.(row);
          const details = mobileDetails?.(row);
          return <tr key={index}>
            {status && <td headers={`${tableId}-status`} className="mobile-record-status">{status}</td>}
            {columns.map((column, columnIndex) => {
              const isAction = column.title === '' || (typeof column.action === 'function' ? column.action(row) : column.action);
              return <td key={column.title} headers={`${tableId}-${columnIndex}`} data-label={column.title} data-column={columnIndex} className={[column.right ? 'right number' : '', isAction ? 'record-action' : ''].filter(Boolean).join(' ')}>{column.title && !isAction && <span className="mobile-cell-label" aria-hidden="true">{column.title}</span>}{column.render(row)}</td>;
            })}
            {details && <td className="mobile-record-details" colSpan={columns.length}>{details}</td>}
          </tr>;
        })}</tbody>
      </table>
    </div>
    <div className="pagination"><span>{count(safePage * size + 1)}–{count(Math.min((safePage + 1) * size, rows.length))} of {count(rows.length)} records</span><div><Button variant="ghost" size="sm" aria-label="Previous page" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}><ChevronLeft /></Button><span>{safePage + 1} / {pages}</span><Button variant="ghost" size="sm" aria-label="Next page" disabled={safePage === pages - 1} onClick={() => setPage(safePage + 1)}><ChevronRight /></Button></div></div>
  </>;
}
