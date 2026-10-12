---
name: Assemble Electrix
description: Compact local manufacturing workspace for customer-owned job work.
colors:
  primary: "#087f72"
  workshop: "#112c34"
  foreground: "#18343c"
  background: "#f6f8f9"
  paper: "#fff"
  secondary: "#e9f2f1"
  muted: "#f0f4f5"
  muted-foreground: "#52696f"
  accent: "#e5f1ef"
  border: "#dce5e8"
  focus: "#55b2a4"
  attention: "#a56813"
  status-ok-bg: "#e6f3ec"
  status-ok-text: "#256742"
  status-warn-bg: "#faf0da"
  status-warn-text: "#8a5d17"
  status-info-bg: "#eaf0f8"
  status-info-text: "#476c9b"
  status-neutral-bg: "#eff3f4"
  status-neutral-text: "#516a70"
  destructive: "#b33b32"
  nav-active: "#234952"
  nav-hover: "#1e3c44"
  nav-marker: "#72d0ba"
  overview-priority: "#FFFBEB"
  overview-priority-border: "#f3dfb9"
  overview-problem: "#a52d28"
  overview-waiting: "#B45309"
  overview-done: "#28613c"
  overview-problem-bg: "#fbecea"
  overview-waiting-bg: "#faf1dd"
  overview-done-bg: "#e8f2e9"
typography:
  headline:
    fontFamily: "Manrope, sans-serif"
    fontSize: "30px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-.035em"
  title:
    fontFamily: "Manrope, sans-serif"
    fontSize: "17px"
    fontWeight: 700
    letterSpacing: "-.02em"
  body:
    fontFamily: "Manrope, sans-serif"
    fontSize: "13px"
  overview-body:
    fontFamily: "Manrope, sans-serif"
    fontSize: "12px"
    lineHeight: 1.6
  label:
    fontFamily: "Manrope, sans-serif"
    fontSize: "11px"
    fontWeight: 600
  metric:
    fontFamily: "Manrope, sans-serif"
    fontSize: "25px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-.02em"
  metric-priority:
    fontFamily: "Manrope, sans-serif"
    fontSize: "29px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-.02em"
  overview-title:
    fontFamily: "Manrope, sans-serif"
    fontSize: "14px"
    fontWeight: 700
    letterSpacing: "0"
  button:
    fontFamily: "Manrope, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: "20px"
rounded:
  sm: "4px"
  md: "6px"
  nav: "7px"
  lg: "8px"
  panel: "10px"
  pill: "9999px"
spacing:
  tight: "8px"
  control: "12px"
  overview-inset: "12px"
  mobile: "18px"
  panel: "22px"
  compact: "24px"
  desktop: "32px"
  wide: "40px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.paper}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  button-ghost:
    textColor: "{colors.foreground}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
    height: "32px"
  panel:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.panel}"
    padding: "20px 22px"
  input-entry:
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "4px 12px"
    height: "40px"
  chip-ok:
    backgroundColor: "{colors.status-ok-bg}"
    textColor: "{colors.status-ok-text}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  navigation-active:
    backgroundColor: "{colors.nav-active}"
    textColor: "{colors.paper}"
    rounded: "{rounded.nav}"
    padding: "10px 12px"
  overview-panel:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "12px"
  overview-kpi-priority:
    backgroundColor: "{colors.overview-priority}"
    textColor: "{colors.foreground}"
    typography: "{typography.metric-priority}"
    rounded: "{rounded.md}"
    padding: "12px"
---
# Design System: Assemble Electrix

## Overview

**Creative North Star: "Practical factory workspace"**

Assemble Electrix is practical, dense factory software. The dark industrial navy sidebar and teal actions remain, while Overview is a plain working register: real attention alerts first, unequal KPIs second, due orders next, then material conversion and recent operational activity.

The user explicitly replaced the former showcase dashboard. Overview uses text controls, compact sections, and quantities with clear units; no pictogram icons appear outside its sidebar. Other modules retain their established bordered panels, shadcn controls, and BOM workflows. The company identity uses the supplied AE SVG mark on the shell and statements, with a matching favicon.

This name describes the user's revised direction. No approved comp or quality-bar reference was supplied; no visual approval is inferred.

**Key Characteristics:**
- Attention before totals; due work before summaries.
- Neutral unequal Overview KPIs emphasize Pending QC and Unbilled amount.
- Text-only Overview, compact bordered work surfaces, and tabular quantities.
- Explicit component/product units, record mode, and unknown history.

## Colors

Industrial navy and teal frame the workspace; Overview uses white and steel-gray surfaces rather than colorful dashboard cards. Frontmatter values are normative.

### Primary
- **Production teal** (`primary`): saves, creation, links, and production progress.
- **Workshop navy** (`workshop`): sidebar with separate active, hover, and current-module marker tones.

### Secondary
- **Operational state colors**: Overview problem red, waiting amber, and done green have dedicated text/background pairs. Amber/red apply only where the record state warrants them. Other modules retain their green, amber, blue, and neutral status chips and destructive red validation.

### Neutral
- **Paper and pale steel**: white panels over the pale page; muted surfaces for quiet controls.
- **Priority steel** (`overview-priority`, `overview-priority-border`): Pending QC and Unbilled amount panels.
- **Ink and steel text**: primary record text and subdued metadata. Supporting text now uses the darker global muted token.
- **Quiet border and focus teal**: record divisions and visible keyboard focus.

**The Action Color Rule.** Use teal for actionable controls, links, and production progress; Overview KPI emphasis comes from neutral surface and size, with semantic color only for relevant states.

## Typography

**Display and Body Font:** locally bundled Manrope Latin subset, with sans-serif fallback. Preserve this single-family functional hierarchy.

### Hierarchy
- **Headline**: plain module name (30px desktop, 25px mobile). Overview places date and editable current shift beside it; it has no introductory slogan.
- **Title**: other module headings (17px); Overview section headings (14px), with no negative tracking.
- **Body**: shared record tables (13px); Overview copy and due table (12px), secondary text (11px).
- **Label**: compact metadata and table headers (11px). Sidebar links use (13px, 500).
- **Metric**: Overview ordinary quantities (25px) and priority quantities (29px); both become (23px) on mobile. Empty KPI phrases use (15px) desktop and (13px) mobile.
- **Button**: shared control text (14px), with smaller shipped variants.

**The Quantity Rule.** Use tabular numerals and right alignment for comparable quantities, rates, and charges; name component pieces separately from product pieces.

## Layout

The shared shell retains a sticky (232px) sidebar, flexible content, (1600px) maximum content width, and default (28px 32px 36px) content padding. The brand and footer stay within the viewport while the navigation list scrolls on short screens. Sidebar links use (10px 12px) padding and (42px) minimum height. The global top bar wraps, has (70px) minimum height, and contains search, record mode, Refresh, and Backup.

Overview is a vertical register with (14px) section gaps and (20px) top inset. Attention occupies a full-width panel above KPIs. KPI columns use (1fr 1.25fr 1fr 1.4fr), with Pending QC and Unbilled amount receiving larger neutral emphasis. Due orders occupy a full-width table with (780px) minimum width, (9px 12px) cells, and eight orders per page. The lower conversion/activity area uses (1.2fr / .8fr) columns, with an activity minimum width of (340px) and top-aligned panels, then stacks at the compact breakpoint. Ordinary module tables retain their established shared density and panels.

At (1180px) and below: sidebar (205px), content gutters (24px), Overview KPIs become two unequal columns, bottom panels stack, alert text rearranges, and global search expands. BOM browser narrows from (330px) to (280px).

At (800px) and below: a labeled **Go to module** select replaces the sidebar navigation; backup age remains visible beneath it in Actual mode. Search occupies a full-width row above top actions. Overview section gaps become (14px), KPI insets (10px), and priority panels stay in the second column. Attention rows retain three aligned columns for title, detail, and action, with narrower columns on mobile. Material-flow quantities scroll inside their panel. Shared tables retain a (640px) minimum width; the Overview due table retains (780px). Statement tables wrap. Shared buttons and module/filter selects have (44px) minimum mobile heights, as do entry fields. Content gutters are (18px), then (16px) at (480px). Page actions wrap into usable full-width controls.

## Elevation & Depth

Work panels are flat, white, and bordered. Shadcn outline controls and fields retain their extra-small shadow. Dialogs retain the large shared shadow and half-opacity black overlay. Global search results use a restrained shadow (`0 5px 16px #112c341c`).

**The Quiet Surface Rule.** Separate resting work surfaces with borders and tone; reserve strong elevation for dialogs and restrained elevation for search results.

Dialogs use (200ms) opacity/scale transitions and the existing ease-out curve. Overview links and controls use (120ms ease-out) color transitions. Navigation and data changes remain immediate. Reduced-motion styles remove dialog/spinner animation and Overview transitions.

## Shapes

Overview panels, KPIs, search results, fields, and buttons use (6px) corners. Overview status labels use (4px) corners. Other modules keep (10px) main panels, (7px) navigation, (8px) dialogs, and pill status badges. Do not spread the Overview-specific panel change into other modules without a new request.

## Components

### Buttons
Teal marks a clear operation. Outline controls are bordered; ghost actions stay quiet. Default shadcn buttons are (36px), small (32px), and large (40px), before mobile minimums. Hover changes color, focus remains visible, and disabled controls halve opacity. Overview buttons and top-bar actions use words without icons; other modules retain their icon conventions.

### Chips
Other modules retain semantic pill chips. Overview uses compact rectangular text status labels with problem, waiting, done, or neutral backgrounds; status words remain explicit.

### Cards / Containers
Overview attention and operations panels use thin borders, (6px) radius, and (12px) section headers. KPIs use (12px) desktop and (10px) mobile insets and priority steel tones. Other modules retain (10px) panel radii, (20px 22px) headers, and (0 22px 22px) bodies, with smaller mobile gutters.

### Inputs / Fields
Entry fields retain labels, (40px) desktop height, border/ring focus, and nearby validation. Global search is icon-free, searches jobs/customers/products, and presents grouped textual results beneath the field; Escape clears it. The result panel is capped at (360px) height. Shift/operator settings are editable local preferences per record workspace, not inferred schedules or authentication.

### Navigation
Use the AE SVG mark and Assemble Electrix name, without a promotional tagline. Desktop links retain icons, text, active fill, and marker. In Actual mode the footer shows backup age and a small Backup link, then Local operations. Demo mode hides backup status. Mobile preserves a labeled module menu and Actual-only backup age. Refresh and Backup in the top bar use outlined secondary buttons. The reminder records an initiated JSON download only; it updates the comparison clock to the same timestamp so **Today** appears immediately. Missing history displays **Not recorded**.

### Overview attention and quantities

Use a shared three-column row for title, detail, and action, including the expandable stock row. Red rejections, shortages, and overdue orders precede amber reminders. Each row has a small semantic-colored marker. Rejections appear only in alerts, and KPI navigation uses short verbs.
Show overdue jobs, work due within three days, customer material shortages, QC older than 24 hours, today's recorded rejects, and unbilled dispatches when real data supports them. Low-stock comparison uses outstanding production BOM requirements, not a made-up threshold. QC age uses entry creation time; today's rejects use recorded QC date. If nothing is actionable, show the plain all-clear sentence.

Produced today, Pending QC, Ready to dispatch, and Unbilled amount use unequal neutral KPI panels. Show specific empty phrases instead of implying activity. Date and shift appear with the plain Overview title; unknown shift stays **Not set**.

### Material conversion and activity
The compact ordered flow shows material component pieces, then manufactured/accepted/dispatched/billed product pieces. Quantities never wrap; stages do not shrink and retain (84px) minimum width, rising to (90px) on mobile. The single row scrolls horizontally within its panel whenever needed. Billed is a quantity, not money. QC yield is accepted divided by inspected; dispatch and billing conversion use accepted and dispatched denominators respectively. Undefined ratios display a dash. Recent activity shows the last eight inward, production, dispatch, and billing entries, with reference, quantity/unit, customer, actor, and date/time. Unknown actors remain **User not recorded**; new operator preferences do not rewrite old history.

### Tables, exports, and dialogs
Keep due work in the observed due-order register; right-align quantities and retain identifiers plus product descriptions. Entry dialogs remain capped at (560px), statements at (650px); both respect viewport width minus (32px), (90dvh) maximum height, and internal scrolling. Statements carry the AE mark and demo label. Module exports use formatted Excel workbooks; JSON is the workspace backup format. State what was exported without claiming remote synchronization or verified backup storage.

## Do's and Don'ts

### Do:
- Do show real attention alerts before Overview KPIs.
- Do keep current module, date, shift, and record mode explicit.
- Do put the next valid action beside the record it changes.
- Do preserve contained horizontal table scrolling and visible keyboard focus.
- Do label demo records on statements and exported workbooks.
- Do keep customer billing rates and worker wages visibly separate.
- Do leave missing shift, operator, and backup history visibly unknown.

### Don't:
- Don't add icons outside the sidebar on Overview.
- Don't restore the promotional sidebar tagline or factory pitch.
- Don't use equal colorful KPI cards, decorative revenue charts, or marketing hero layouts on Overview.
- Don't imply an initiated backup download proves the file was saved.
- Don't conceal validation, shortage, loading, or storage-error feedback.

## Final Overview control details

All four KPI cards have a bottom action and equal grid-row heights. Production links to its register. Pending QC and Unbilled amount use #B45309 text with #FFFBEB surfaces. Alert actions include their verb and arrow, within 120px desktop / 92px mobile action columns. The shift control is a bordered 6px button with a dropdown indicator, opening the existing settings dialog. Actual-only sidebar backup metadata retains its small Backup link.
