# Assemble Electrix — changes and verification

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
