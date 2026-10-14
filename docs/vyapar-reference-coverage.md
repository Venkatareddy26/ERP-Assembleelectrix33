# Screenshot reference coverage

The 46 supplied screenshots (1532–1577) define the visual direction. Assemble Electrix retains its identity and its manufacturing workflow. This is an independent implementation; no extracted Vyapar source, QR code, customer data, support phone number or trial subscription has been added to the application.

## Working local features

| Reference | Screen | Delivered behaviour |
|---|---|---|
| 1532 | Home | Navy expandable navigation, business header, sale/purchase actions, genuine receivable/payable totals, daily sales chart, report links and factory queues. Totals include saved trading bills and existing job-work bills. |
| 1533 | Parties | Customer/supplier list, search, selected-party transactions and unpaid balances. Existing customer-specific manufacturing rates remain accessible. |
| 1536–1537 | Items | Products/services with code/barcode, unit, HSN/SAC, category, sale/purchase prices and entered tax rate. Pricing and Stock tabs explain the separate owned-stock ledger. |
| 1538 | Sale invoices | Saved line-item sales, discounts, entered tax, status, outstanding amounts, receipts, preview, print and Excel. Existing job-work bills remain in their original register and also appear in reports. |
| 1539–1540 | Estimate, proforma | Separate immutable documents with full conversion to a sale, preserving saved party/lines/prices. Conversion cannot be repeated. |
| 1541 | Payment-In | Bill-specific partial/full trading receipts with cash/bank/UPI/other methods. Existing job-work collections remain available in Billing. |
| 1542–1543 | Sale orders, challans | Owned-item orders and delivery records; full conversion to a sale. Delivery reserves/issues owned stock; its sale conversion does not issue stock again. Manufacturing dispatch still requires accepted QC pieces. |
| 1544 | Credit note | Full return of an unpaid trading bill, with reason, stock restoration and reversal of sales/tax. Paid or partly paid returns are blocked pending a separate refund workflow. |
| 1545 | POS | Item name/code search (including keyboard barcode entry), cart, quantity/rate/discount/tax, customer/date, payment mode, cash change and remarks. Bill and optional receipt save atomically; print preview follows. No loyalty programme or multi-bill parking is claimed. |
| 1546, 1549 | Purchases, purchase orders | Supplier-specific purchased stock, bills, unpaid balances, orders and one-time full conversion. Owned trading stock never borrows customer-owned BOM components. |
| 1547 | Payment-Out | Partial/full supplier bill settlement, selected bank account or cash, date and reference. Overpayment is blocked. |
| 1548 | Expenses | Category, description, date, amount and payment method. Cash expenses cannot borrow money from a future receipt. |
| 1550 | Debit note | Full unpaid purchase return, reason, stock checks and payable/tax reversal. |
| 1556–1557 | Banks, cash | Manually recorded bank accounts/opening balances, receipt/payment balances, cash register and audited cash adjustments. No direct bank connection is implied. |
| 1558 | Cheques | Received/issued cheques, due date and number; cancellation or one-time clearance. Clearance applies a real payment to a selected outstanding bill and bank account in one save. |
| 1559 | Loans | Principal, fixed annual reducing interest, monthly instalment estimate, scheduled total, repayments and remaining scheduled balance. Principal enters cash; fees and variable rates need separate records. |
| 1560–1563, 1566 | Registers | Sales, purchases, day book, all transactions and cash movements; date/party/search filters, numeric Excel and printing. |
| 1564–1565, 1570 | Margin reports | Booked P&L and an explicitly estimated bill margin. Estimated margin excludes tax, salaries and overheads and uses prior purchase averages or accepted piece wages. It is not a claim of complete factory profitability. |
| 1567–1568 | Accounts | Derived double-entry trial balance and balance sheet, including owned inventory cost, taxes, receivables/payables, payments, cash/bank, expenses, loans and recorded capital. Unrecorded liabilities, wages and opening balances are excluded. Customer-owned components carry no business inventory value. |
| 1569, 1571–1574 | Party reports | Statement, all parties, item-wise trading quantities/amounts, party totals and General (ungrouped) totals. Statement balances exclude payments after the report's end date. |
| 1575 | Item import | Excel template, preview, value-only import and atomic validation of up to 1,000 rows. Formulas, duplicate names/codes and invalid rows are rejected without partial writes. Barcode/product catalogue lookup services are not connected. |
| 1576 | Business setup | Saved company name, contact, address and GSTIN; header and printable document branding. |
| 1577 | Accountant access | JSON and Excel file sharing. Remote accountant sign-in is not enabled. |

## External services and remaining parity gaps

| Reference | Current state |
|---|---|
| 1534, 1553 | WhatsApp pages prepare individual document messages for user review. Automatic sends, QR device linking, bulk campaigns and delivery tracking need a service integration. No message is sent by this implementation. |
| 1535 | Business network page explains that live shared invoices require an online backend and sign-in. |
| 1551 | Google profile page opens the official Google management service; no OAuth account connection is configured. |
| 1552 | Marketing tools export a real product price list. A campaign/template editor and campaign analytics are not implemented. |
| 1554 | Online store exports a catalogue. Publishing, checkout, payments and live web orders need a connected store/backend. |
| 1555 | Smart Ads links to Google Ads. It does not create or purchase campaigns. |

This is **not full Vyapar parity**. Other gaps include partial returns/refunds, document editing/voiding, multi-company accounting, full GST return/e-invoice/e-waybill services, automated bank reconciliation, remote sync and account permissions, loyalty points, parked POS bills and a vendor barcode library. New records are intentionally immutable; a future edit/reversal workflow must preserve the stock/payment history.

## Storage and recovery

- Existing manufacturing collections and database names remain unchanged. No existing actual records are replaced or seeded.
- New suite entries use an optional `businessRecords` collection in the same SQLite/IndexedDB workspace and the existing optimistic revision check.
- JSON backups containing suite entries use version 3. Versions 1 and 2 remain readable. Version 3 validates the ordered transaction history, totals, references, stock, cash and cheque clearance receipt before replacement.
- A browser backup is a local recovery file. It does not create shared or cloud storage. Business profile records are included in that backup; existing shift/operator preferences retain their original storage behaviour.
- Owned stock follows recorded transactions, and dated issues cannot make an earlier stock balance negative. Customer component stock continues to follow the established job-work posting ledger.

## Source changes

- Theme/navigation: `src/suite.css`, `src/billing-shell.css`, `src/components/workspace-navigation.tsx`, `src/components/desktop-menu.tsx`, `src/components/billing-home.tsx`, `src/App.tsx`, `src/main.tsx`.
- Suite screens/forms: `src/components/suite-workspace.tsx`, `src/components/suite-entry.tsx`, `src/components/point-of-sale.tsx`, `src/components/suite-import.tsx`, `src/components/suite-reports.tsx`, `src/lib/suite.ts`, `src/types.ts`.
- Validation/journal/storage compatibility: `server/commerce.mjs`, `server/bookkeeping.mjs`, their declarations, `server/domain.mjs`, `server/backup.mjs`, `server/backup.d.mts`, `server/index.mjs`.
- Verification: `tests/commerce.test.mjs`, plus existing manufacturing, backup, storage and export tests. Browser screenshots and isolated test records remain outside the Git deliverable.

## Verified

- 52 automated tests pass, including atomic POS save, cheque settlement, dated cash/stock checks, backup validation, stale writes, persistence and legacy manufacturing workflows.
- All 42 module routes load without browser exceptions or document overflow at 1920×1080, 375×667, 320×568 and 844×390.
- An isolated actual workspace completes customer/supplier/item creation → purchase → quotation → sale conversion → partial receipt → POS cash sale/change → stock reconciliation → Excel report → version-3 backup → reload.
- Forms and both mobile sheets are checked at 320×568, 360×640, 375×667, 440×956 and 844×390. Final controls remain reachable; item/Back/X dismissal releases page interaction. Excel item import saves and reloads on mobile.
- Existing component return/correction, ledger, job-work receipt, statement, reload, version-2 backup and empty Actual flows also pass on desktop, small phones and landscape.
- Local and hosted builds pass. Suite screens and Excel load separately from the initial application. The existing large Excel library chunk still produces a size warning.
