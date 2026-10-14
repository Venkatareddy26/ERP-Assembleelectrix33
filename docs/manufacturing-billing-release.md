# Manufacturing and billing: first release

This describes the first manufacturing release. The later screenshot-based business suite adds separate trading, cash/bank and accounting features; see [current feature coverage](vyapar-reference-coverage.md). The original job-work stock and billing rules below remain intact.

The agreed first stage is Assemble Electrix's job-work manufacturing and billing workflow, followed by expansion toward a broader business suite. The interface uses familiar billing-software patterns under the Assemble Electrix identity. This release does not claim complete Vyapar feature parity or use recovered proprietary implementation code.

## Delivered

| Area | Working behaviour |
|---|---|
| Product BOM | Existing real imported product/component requirements and customer-stock planning remain available. |
| Component balances | Customer-specific received, consumed, returned, corrected and remaining quantities. Corrections without an inward record also appear. |
| Component ledger | Receipts, saved BOM consumption snapshots, unused-material returns and stock corrections, with reference, reason, actor and running balance. Customer/component filters and register search reuse saved records. |
| Returns and corrections | Separate audited postings; required reference and reason; customer isolation, duplicate-reference checks, positive whole-piece quantities and shortage blocking. Existing production records are never rewritten. |
| Manufacturing | Existing job orders, worker rate snapshots, production, final QC, replacement of rejects and accepted-piece dispatch remain intact. Rejects do not restore consumed components. Readiness and low-stock alerts include returns/corrections. |
| Billing | Existing agreed-rate job-work bills and printable statements remain intact. Bill-wise partial/full receipts, payment method, unique receipt reference, outstanding balances and receipt history are added. |
| Payment safeguards | Receipts require an existing bill, cannot exceed its unpaid amount, cannot precede its bill date and cannot reuse a receipt reference. Stale forms are rejected. |
| Excel | Materials exports include component running balances and returns/corrections. Billing exports include unpaid bills and receipts while retaining the original bill register layout. |
| Persistence | Same SQLite and browser stores; new optional state collections do not wipe or reseed existing workspaces. Actual receives no sample operations. |
| Backups | New downloads use schema version 2 and include material movements and receipts. Existing version-1 backups are accepted and validated. Version-2 snapshots validate the new records, references and balances before replacement. Older app versions do not support version-2 backups. |

Balances follow **posting order** for each customer/component. A backdated document keeps its document date and does not change previous posting balances. Exports use that same calculation. Material movement records and payment receipts are immutable in this release; correction or reversal of those postings is a separate future workflow.

Payment receipts track saved **before-tax job-work charges**. They do not add GST, a bank ledger, reconciliation, customer advances or double-entry accounting. Worker wages remain separate from customer receipts.

## Verification

- Domain tests cover component isolation, shortage blocking after a return, corrections, saved consumption, posting-order balances, immutable bills, partial/full payments and failed-write atomicity.
- Backup tests cover old snapshots, version-2 round trips, malformed movements, excessive returns, overpaid bills and invalid references.
- Browser-store tests cover persistence, simultaneous receipt attempts, mode isolation and restore.
- Local SQLite API tests cover legacy stored JSON, movement/payment persistence across restart, stale writes and actual/demo isolation in temporary databases.
- Excel tests reconcile movements, balances, receipts and outstanding amounts.
- Isolated browser workflows at 1440×1000, 320×568, 375×667 and 844×390 exercised actual form saves, ledger views, bill statements, reloads, backup downloads and empty Actual records. Only disposable browser test records were written.

## Expansion stages

1. **Master data and manufacturing controls:** editable/versioned BOMs and component masters, explicit units, production corrections, material-movement reversals, scrap/rework and purchase-owned stock. Historical consumption snapshots must remain fixed when masters change.
2. **Billing and parties:** business/customer details, bill numbering, payment terms, customer advances, allocations across bills, receipt reversals and party statements.
3. **Tax invoices and integrations:** business tax setup, item/service classifications, jurisdiction-aware tax calculation, invoice/correction rules and exports. Statutory submissions require the corresponding provider/account integration and validation; no simulated successful filings.
4. **Business accounts:** suppliers, purchase orders, purchases, expenses, returns, cash/bank ledgers, accounting entries and reconciliation.
5. **Shared operations:** sign-in, roles, shared database, migration from device storage, audit access and restore procedures. Browser-only records remain device-specific until that is implemented.
6. **Advanced inventory and operations:** warehouses, transfers, batches/serials, stock valuation, costing, attendance/payroll and verified integrations as required.

Exact parity depends on observed workflows and an agreed feature list. REA findings identify packaged Vyapar feature references; they do not establish which menus or paid services are available in the installed account. No unimplemented module is presented as working UI.
