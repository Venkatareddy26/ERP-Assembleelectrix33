# Assemble Electrix ERP

A job-work manufacturing app built from the supplied BOM. React, TypeScript, Vite, Tailwind, shadcn/ui, with SQLite for local runs and browser storage for the hosted version.

The screenshot-based business suite adds owned-item sales/POS, purchases, quotations, expenses, payments, bank/cash registers, cheques, loans, company details, Excel item import and operational reports alongside the manufacturing modules. Read [reference coverage and remaining parity gaps](docs/vyapar-reference-coverage.md) before treating this as a complete replacement for Vyapar. Shared sync, automated messaging, online checkout and tax filing services are not configured. Backups with suite records use version 3; older backups remain readable.

## Run

Requires Node.js 24 or newer. In this folder:

```powershell
npm install
npm run dev
```

Open http://127.0.0.1:3000. For a compiled local run, use `npm run build` then `npm start`. The server listens only on this computer. The preview is a single-user local application, not a remotely accessible production system.

## Vercel / browser version

Connect this repository to Vercel. `vercel.json` selects `npm run build:hosted` and publishes `dist-hosted`. This build runs without a records server: the real imported BOM ships with the app and operations persist in this site's IndexedDB browser database. Excel exports are generated in the browser and the existing JSON Backup button exports the full workspace.

For a local check of the hosted build, run `npm run build:hosted` followed by `npx vite preview --outDir dist-hosted`. The regular `npm run dev`, `npm run build`, and `npm start` continue to use the existing SQLite server and the separate `dist` output.

Hosted records belong to the current site address, browser profile, and device. They are not shared between devices, uploaded to Vercel, or copied from the local SQLite files. Clearing site data removes browser records, so keep regular JSON backups. Demo and Actual use separate stores; Actual starts empty. Browser transactions reject stale writes from another tab and commit validated entries atomically. Existing localStorage preferences and backup reminders remain separate for Demo and Actual. Restore backup imports a downloaded JSON backup after validation and an explicit confirmation before replacing saved records.

## First real job

1. Choose **Your actual records** in the header. Demo operations use a separate database.
2. Add a customer and save that customer's piece rate for the product.
3. Add workers with their own wage rate or monthly salary.
4. Receive customer materials against a challan. Use **Products & BOM** to check the component requirements and stock shortages.
5. Create the job order, then record production. Each produced piece consumes its BOM, including eventual rejects.
6. Inspect production: accepted + rejected must equal produced. Rejected pieces require a reason and can be replaced with further production against the same order.
7. Dispatch accepted pieces. Create job-work bills for dispatched quantities that remain unbilled.

The order snapshots its agreed customer rate. Each production entry snapshots the worker's piece wage. Customer billing and worker wages remain separate. Worker piece earnings currently use accepted pieces; salaried compensation is recorded without payroll processing.

## Data and backups

`data/bom.json` contains 95 products, 120 materials, and 2,916 component rows from the source workbook. IDs are stored as strings. The six blank/summary rows are listed separately. Source row numbers and a SHA-256 fingerprint are retained. The original Excel file is unchanged. Material quantities are assumed to be pieces because the source has no unit column.

For local runs, operations persist in `data/actual.sqlite`; demo operations persist in `data/demo.sqlite`. These files and their contents remain unchanged by the hosting fix. The hosted build uses the separate browser stores described above. A saved state has a revision and an audit record for each mutation. Stale forms are rejected to prevent overwriting changes in another tab. This release does not support deleting or editing posted production, inspections, dispatches or bills; correction workflows need to be added before use as a production ledger.

The header Backup button exports the full workspace and BOM as a JSON snapshot. New snapshots use schema version 2, including component returns/corrections and bill payment receipts; version-1 snapshots remain readable. Restore backup beside it accepts a downloaded snapshot for the current workspace and matching Products & BOM list. It validates records before confirmation and replaces them only after confirmation. Restore works with browser storage and local SQLite, including recovery from unreadable saved records. It advances the revision so stale forms cannot save against restored records. Demo and Actual remain separate; shift, operator, and backup reminders remain browser preferences.

Module exports provide formatted Excel workbooks (all saved records in that module), with readable date and amount columns, frozen headings, and text IDs. Customer and inventory exports include their related registers on separate tabs. Keep exports private. To recover an exact SQLite database, stop the app before copying the database and any associated `-wal`/`-shm` files; restore to the same locations while stopped.

## Validation

```powershell
npm test
npm run build
```

Tests cover customer stock isolation, atomic failure on shortages, BOM consumption, QC reconciliation, replacement production, duplicate inward lines, over-dispatch, double billing, rate snapshots, bad inputs, and source import counts.

## Release boundaries

Bills are job-work statements **before tax**, not statutory tax invoices. Component returns/corrections and bill-wise payment receipts are supported. GST, authentication, permissions, shared online storage, editable BOMs, posting reversals, scrap recovery, bank reconciliation, attendance and payroll remain future work. The Vercel build stores records per browser; the separate SQLite server is local-only. See [the manufacturing/billing release and expansion plan](docs/manufacturing-billing-release.md) for the delivered scope and staged work.

## Design

The nine requested design/testing skills are installed under your Codex skills folder. Design decisions are recorded in `.interface-design/system.md` and `DESIGN.md`. UI fonts are bundled locally so the interface does not depend on a font CDN.

## Overview

Below 640px, the app uses a compact page header and bottom tabs. More contains secondary module links. Data contains workspace selection, search, Refresh, Backup, Restore backup and Shift. Registers become labeled cards; the BOM product list opens a detail view on tap. Materials has Balances / Ledger / Inward tabs. Billing's Payments button jumps to collections and receipt history.

Overview prioritizes outstanding orders due within 3 days (including overdue), orders at risk at their current production pace, customer material shortages against remaining production, QC entries older than 24 hours, today’s QC rejects, and unbilled dispatches. Stock requirements exclude accepted and pending pieces already produced. The flow labels component and product units separately; QC yield uses inspected pieces only.

The At risk pill is a display-only forecast shared by Job orders and Overview > Needs attention. It compares the quantity left to produce with recent usable output per calendar day over the last seven days, or since first production for newer orders. Idle days reduce pace; known rejects do not count as usable output. Accepted pieces and pieces awaiting QC count toward the target. Days remaining include the due date; an unfinished order without recorded pace is at risk. The forecast does not infer shift capacity or change saved records. Production lists pending inspections first, keeping newest entries first within each inspection group.

Click the shift beside the date to set the current shift and operator name. These are user-entered settings, not an inferred schedule or an authenticated identity. New audit entries retain the entered operator; older entries say “User not recorded.” Shift, operator, and last downloaded backup time are kept separately for Demo and Actual in browser preferences. Existing browser storage keys are preserved. The reminder initially says “Not recorded” because older downloads were not tracked. It records when a JSON backup download is initiated; it cannot verify that a file has been retained or restored.
