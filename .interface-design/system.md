# Assemble Electrix interface system

Audience: a job-work factory supervisor checking materials and recording a shift, and an owner preparing customer bills.
Domain: customer challans, CKD assemblies, component requirements, accepted pieces, dispatch balances, piece rates.
Color world: dark blue machine panels, teal workshop markings, white inspection sheets, amber safety markers, steel gray.
Signature: a material-to-payment production flow showing real quantities at every gate; a BOM readiness sheet calculates the exact components needed before a production entry.
Avoid: decorative revenue charts, generic marketing hero sections, unrelated illustrations.

Palette: workshop navy #112c34; production teal #087f72; paper #f6f8f9; ink #18343c; steel #52696f; safety amber #a56813.
Typography: locally bundled Manrope, 13px module table text / 12px Overview body, 11–12px metadata, 17px module / 14px Overview section headings, 30px page headings (25px mobile), tabular numerals.
Layout: 232px navigation, left-aligned content, bounded tables, quiet borders, 32px desktop gutters (24px compact, 18px mobile). Mobile uses an explicit labeled “Go to module” menu and horizontally scrollable tables within the content (640px minimum table width; statement tables wrap).
The desktop sidebar stays within the viewport: the brand and company footer are fixed within the dark panel, and only the navigation list scrolls on shorter screens.
Controls: shadcn buttons are 36px default, 32px small, 40px large; entry fields are 40px. Mobile buttons and module/filter selects are at least 44px. Controls use 6px radii, Overview panels 6px, other module panels 10px. shadcn components for controls, dialogs, fields, badges, alerts, and empty states.
Motion: instant navigation and data changes; 200ms dialog opacity/transform; 120ms Overview color transitions. Reduced motion removes dialog/spinner animation and Overview transitions.
State: demo and actual records are separate databases. No invented real customer rates. Visible form validation, loading, empty states, persistent storage errors.

Overview: plain module title, date, user-entered shift; real attention alerts before unequal KPIs, with Pending QC and Unbilled emphasized. No icons outside the sidebar on Overview. Due-order table uses a 780px minimum width and eight rows per page. Last eight operational activities show quantities, customers, actors, and dates; unknown actors stay unknown. Material-to-billing distinguishes component pcs from product pcs and shows yield/dispatch/billing conversion. Its quantities never wrap, stages do not shrink, and horizontal scrolling stays inside the panel. Lower conversion/activity columns use 1.2fr/.8fr with top alignment, stacking at the compact breakpoint.
Identity: supplied AE SVG mark, Assemble Electrix name, matching favicon; local Manrope Latin subset. Sidebar promo/tagline is removed. Global text search finds jobs, customers, and products. Module exports are formatted Excel workbooks.
Operational truth: low stock compares customer balances against outstanding production BOM requirements; QC aging uses createdAt over 24 hours; rejects today use recorded QC date. Shift/operator preferences are local and separate per demo/actual workspace; missing values are not inferred. Backup reminder tracks initiated JSON downloads only, with unknown history labeled Not recorded. The comparison clock updates to the same backup timestamp so Today appears immediately.

Overview polish: every attention row uses the same three columns (title, detail, action), including the stock disclosure. Small severity dots mark red issues before amber reminders. Rejections appear only in alerts. Cards use 12px desktop / 10px mobile insets with 6px radii; actions use short verbs. Refresh and Backup use outlined secondary controls. Last-backup status is visible only for Actual records, with a small Backup link in the desktop sidebar.

Final Overview details: all four KPI cards have a bottom action and equal row heights; Produced today links to Production. Pending QC and Unbilled use #B45309 on #FFFBEB. Alert actions use a verb and arrow. The Shift control is a bordered 6px button with a dropdown indicator and opens the existing settings dialog.
