# Assemble Electrix — changes and verification

## Full-suite screenshot theme and local business workflows

- Matched the supplied screenshot structure across 42 screens: expandable navy sidebar, company menu/header, red/blue actions, split parties view, white registers, pale-blue filters and report navigation. Mobile retains cards, bottom tabs and scrolling More/Data sheets.
- Added actual owned-item sales/POS, estimates, proformas, orders, delivery challans, suppliers, purchases, payments, expenses, full unpaid returns, bank/cash registers, cheques, loans, company details and atomic Excel item import. Trading stock stays separate from customer BOM components.
- Added a derived accounting journal and filtered reports with Excel/print. Home totals include new bills and supplier payables. Bill-wise margin is labelled as an estimate, and entered tax summaries are not presented as tax filings.
- Preserved legacy state and backup imports. New suite snapshots use backup version 3, with ordered-record validation and existing stale-write protection. POS bill/receipt and cheque clearance/payment save atomically.
- External services remain visibly unconnected; catalogue exports, individual WhatsApp message preparation and official service links provide the working local alternatives. Detailed reference coverage and remaining parity gaps are in `docs/vyapar-reference-coverage.md`.
- Verification: 52 tests; both builds; 42 routes at desktop, small phones and landscape; real isolated suite saves, POS, report Excel, v3 backups/reload; five-size form/sheet reachability; mobile Excel import; and the existing manufacturing/receipt workflows. No user workspace was used for test writes.

## Screenshot-matched home and REA setup

- Added dark navy desktop navigation, red/blue rounded actions, blue-grey panel dividers and a split billing home based on the supplied Vyapar screenshot. Mobile navigation and sheets retain their existing structure.
- Added real outstanding receivables, payment totals, monthly daily billed-charge chart, all-time billing total and working register shortcuts. Actual mode never uses screenshot amounts. Operational alerts, production KPIs, due orders and recent activity remain available below the financial home (first on phones).
- Kept manufacturing shortcuts in the right column instead of presenting unavailable WhatsApp/Google services as working integrations. Purchase accounting, tax filing and full Vyapar feature parity are outside this manufacturing/billing release.
- Ran `npx rea-agents@latest setup --client codex --yes`: Codex registration and bundled reverse-engineering skill installed; unrelated configuration preserved with a setup backup. Restart Codex to load the MCP registration. Native Ghidra/IDA engines are not installed.
- New visual source: `src/components/billing-home.tsx` and `src/billing-shell.css`; integrated through Overview and the stylesheet entry point.
- Validation: 42 tests, local and hosted builds passed; ten modules checked at 1440, 768, 320, 375, 440 and 844px landscape. Isolated browser saves verify that partial payments update home receivables/collections, both sales periods reconcile to saved bills, reload preserves data, backups round-trip and actual mode remains empty.

## Manufacturing and billing release

- Added customer/component balances and a posting-order ledger with recorded receipts, BOM consumption, unused-material returns and stock corrections. Movement forms retain a reason/reference and block unavailable stock or duplicate postings.
- Added bill-wise payment receipts, partial/full collections, outstanding balances and receipt history. Payments preserve saved bill rates and amounts, reject overpayment and retain revision checks.
- Updated BOM planning, low-stock alerts, bill previews and Excel exports to reconcile the new ledgers. Existing customer, worker, QC and dispatch rules remain intact.
- New JSON backups use version 2. Existing stored workspaces and version-1 backups remain readable; new snapshot validation covers material movements and bill receipts.
- Added domain, backup, export, browser persistence and local SQLite API coverage, plus isolated browser form-save workflows on desktop, small phones and landscape.
- Delivered scope and future suite expansion are documented in `docs/manufacturing-billing-release.md`.

## Billing-style manufacturing interface

- Applied a Vyapar-inspired billing-software direction across all ten modules: light navigation grouped into Manufacturing and Records & billing, red primary actions, compact white registers and neutral surfaces.
- Added read-only module summaries from existing records. Empty actual workspaces show helpful messages; the imported product catalogue stays real in both modes.
- Updated the AE mark, favicon and wordmark to match the action colour. Bill statements, entry forms, filters, pagination and exports retain their existing handlers and values.
- Preserved mobile cards, bottom tabs and the independently scrolling More/Data sheets. Mobile summaries are compact, and BOM detail hides the catalogue summary.
- Verified all ten modules at desktop, tablet, phone and landscape sizes, plus entry dialogs, QC/dispatch actions, bill preview, Excel export, BOM planning and empty Actual records. All 33 tests and both builds passed.
- Source changes: `src/factory-design.css`, `src/components/workspace-navigation.tsx`, `src/components/module-summary.tsx`, `src/App.tsx`, `src/main.tsx`, `src/components/brand-mark.tsx`, `public/assemble-electrix-mark.svg`, `public/assemble-electrix-logo.svg` and `index.html`.

## Final mobile checks

- Removed constant Unbilled and Billed pills from mobile billing cards; amounts and actions are unchanged.
- Applied 16px plus safe-area padding to both sheet containers, with internal scrolling capped at 85dvh.
- Verified 360, 375, 412 and 440px layouts: no horizontal overflow, aligned production/QC quantities and dispatch product/ready rows. Short-screen Data controls scroll above the bottom inset.
- Close, backdrop, module tap and browser Back each release body pointer and scroll locks; page taps and touch scrolling work afterward. Shift opens existing settings from Data below Workspace.

## Reachable mobile sheets

- More contains only the six secondary modules. Data retains search and workspace actions, with a labeled Shift control below Workspace.
- Both sheets use a fixed header and a flexing body that scrolls independently within 85dvh, with 16px plus safe-area padding beneath the last control.
- Sheet dismissal unmounts the modal so Radix releases its page locks. Close, backdrop, navigation and browser Back were checked for normal page scrolling and taps afterward.
- Browser checks passed at 320×568, 360×640, 375×667, 440×956 and 844×390; landscape touch gestures scroll both sheet bodies. All 33 tests and local/hosted builds passed.
- Files: `src/components/mobile-navigation.tsx`, `src/mobile.css` and this change log. Desktop styles and record handling are unchanged.

## Phone layout below 640px

- Added a compact 56px header, an accessible More sheet for workspace/search/backup controls, and Overview/Production/QC/Dispatch/More bottom tabs.
- Reused the existing register rows and action handlers in stacked cards with readable labels, status pills, and full-width row actions. Core tables and rejection notes stay within the phone viewport.
- Kept job references unbroken and customer names at normal word boundaries. Pointer-selected native selects release focus; keyboard users retain a visible focus indicator.
- Stacked mobile alerts and combined due-soon/at-risk orders with due dates. Desktop alert rows and all calculations remain unchanged.
- Made the BOM list a normal page list with tap-to-open detail, a Products return button, and a secondary phone export control.
- Scoped layout rules to screens below 640px. Desktop Overview measurements match the original. Backend, persistence, backup format, wage, stock, QC and billing rules are unchanged.
- Files: `src/mobile.css`, `src/components/mobile-navigation.tsx`, `src/components/record-table.tsx`, `src/lib/mobile-select-focus.ts`, `src/App.tsx`, `src/components/overview.tsx`, `src/components/global-search.tsx`, `src/main.tsx`, and design documentation.

## Hosted records fix

- Vercel previously published the frontend without `/api/workspace`, so every module showed “Records could not load.”
- Added an explicit hosted build with the imported BOM and IndexedDB storage. Local development and production builds retain the original SQLite API.
- Reused the existing domain validation and Excel workbook implementation in the browser. Actual starts empty; only Demo receives sample records.
- Browser writes commit atomically and reject stale revisions across tabs. Storage failures and damaged records do not silently reset existing data.
- JSON backups retain the existing full-workspace format, localStorage preferences are preserved, and hosted copy clearly says records save in this browser on this device.
- Files: `src/lib/browser-store.mjs` and declarations, `src/lib/workspace-client.ts`, `src/vite-env.d.ts`, `src/App.tsx`, `server/domain.mjs`, `server/export.mjs` and declarations, `vite.config.ts`, `vercel.json`, package manifests, browser-store tests, and documentation.

## Overview

- Plain Overview heading with the current India date and an editable current shift.
- Real alerts appear first: overdue/due orders, stock short against remaining order requirements, QC older than 24 hours, today's inspected rejects, and unbilled dispatches.
- Compact neutral panels emphasize Pending QC and Unbilled amount. No KPI icons or sidebar promotion.
- Helpful empty states, due orders, global job/customer/product search, and eight recent operational entries with timestamps and recorded operators.
- Component and product quantities have explicit units. QC yield excludes uninspected output; dispatch and billing conversions use their matching quantities.
- Backup download history, shift, and operator settings persist separately for Demo and Actual. Existing localStorage keys and saved databases are preserved.
- Older actor and backup history remain unknown. The backup reminder records download initiation, not a verified restore.

### Files changed for Overview

| File | Change |
| --- | --- |
| src/App.tsx | Overview integration, date/shift settings, search navigation, backup reminder, operator capture |
| src/components/overview.tsx | Alert queue, KPIs, due orders, flow, recent activity |
| src/components/global-search.tsx | Search across saved orders/customers and imported products |
| src/lib/overview.ts | Derived counts, shortages, due dates, QC age, activity, backup age |
| src/lib/workspace-preferences.ts | Separate local preferences for each workspace |
| src/overview.css | Compact responsive layout and semantic status colors |
| src/main.tsx | Overview stylesheet and smaller local font subset |
| src/types.ts | Optional audit actor and production timestamps |
| server/domain.mjs | Optional operator on new audit entries; existing history unchanged |
| tests/overview.test.mjs | Alerts, stock ownership, empty Actual mode, audit and preference checks |
| README.md | Behavior, calculations, and backup reminder semantics |
| PRODUCT.md | Updated export capability |
| DESIGN.md | Current UI system |
| .impeccable/design.json | Design tokens and component previews |
| .interface-design/system.md | Durable interface decisions |

## Logo, Excel export, and earlier audit fixes

The AE monogram is shared by the sidebar, statements and browser icon. Excel exports replace CSV downloads with genuine date cells, wide columns, numeric amounts, frozen headings and readable text IDs. Customer and stock exports include their related registers. Delayed refresh responses cannot overwrite another workspace, invalid earnings months cannot show lifetime wages, and malformed static addresses no longer terminate the server.

Additional changed files: src/styles.css; src/components/brand-mark.tsx; src/lib/latest-request.ts; public/assemble-electrix-mark.svg; public/assemble-electrix-logo.svg; index.html; server/export.mjs; server/index.mjs; tests/export.test.mjs; tests/latest-request.test.mjs; tests/server.test.mjs; package.json; package-lock.json.

## Verification

- 18 automated tests pass; production build passes.
- Desktop and 390px mobile UI checked. Tables and flow scroll within their containers without document overflow.
- Global job search opened the matching filtered job register.
- Demo shift/operator preferences survived reload; temporary test values were cleared.
- JSON backup downloaded successfully, matched saved Demo state, and immediately updated its reminder.
- Actual remained revision 0 with zero operational records. No sample records were added to Actual.
- Excel billing download checked for genuine dates, numeric charges and saved widths.
- Independent final review scored unbroken quantities, content-height panels, and immediate backup age as resolved.

Compiled dist files were regenerated. Source BOM and operational database contents were preserved.

## Overview refinement

Changed src/components/overview.tsx, src/overview.css, and src/App.tsx. Attention rows align title/detail/action columns, red issues precede amber reminders, and stock expansion supports the keyboard. Rejections are shown once. Cards use tighter insets and short actions. Header Refresh/Backup are outlined controls; the sidebar uses a small Download link and backup status appears only in Actual mode. Design documentation is updated. No calculation, database, or preference storage logic changed.

Final small polish changes the same three UI files: all KPI cards have equal-height structure and an action; alerts use verb/arrow links; Pending QC and Unbilled use #B45309 / #FFFBEB; Shift is a compact button; the Actual-only sidebar link reads Backup. Empty Actual messages were verified. No logic or data files changed.

## Mobile More sheet correction

- Removed centered-dialog translate offsets from More and anchored the sheet to both viewport edges and the bottom.
- Added one-column module/data lists, visible workspace labeling, full-width 44px data controls, and vertical-only motion.
- Browser Back, module taps, and backdrop taps dismiss the sheet; body scroll stays locked while open.
- Red mobile At risk pills, 11px tab labels, and landscape phone support.
- Verified all six requested viewports, all six module links and four data controls; desktop centered dialogs, workflow calculations, and saved records are unchanged.

## Remaining mobile polish

- Compact Production/QC quantity rows and Dispatch product/ready rows, with product names and full rejection notes.
- Search-adjacent accessible Export Excel icon; header ellipsis for Data, bottom More for modules.
- Full-card Overview KPI links and operating-rule-only mobile subtitles.
- Keyboard-only focus rings on tabs and card links.
- Verified all pages at 360, 375 and 440px without overflow. Desktop, calculations and saved records are unchanged.
