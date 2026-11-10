# Vyapar static feature investigation — 2026-10-14

This investigation uses the locally installed Vyapar 35.1.0 shipped application archive. It does not execute Vyapar, access customer databases, or establish account entitlements. Product behavior below is distinguished from our implementation choices. No proprietary implementation source is included here.

## Scope and retained evidence

- Installed target: C:/Users/venka/AppData/Local/Programs/Vyaparapp/resources/app.asar.
- Party UI member: uijsx-UIComponent_jsx_AddEditFirmDialog_jsx-UIComponent_jsx_AddEditPartyDialog_jsx-UIComponen-5ae780.bundle.js, SHA-256 6d9c6170215df92d2b43493460c876ed691f155cc03628c023bada91988c8a97.
- REA parent: ev_556e6ea469d7c2e6140862d2551cc61470ef3e0949c05fea96f5d2a958d85795.
- REA summary: ev_28282e0876dc92384a3baa8883c44045058055eb96b9d5a281a7c6540e282158.
- REA parsed one JavaScript file, visited 124,211 syntax nodes, recovered 72 module identities and 996 static findings. The requested 25-second analysis budget expired. Application and semantic coverage remain partial; absence of a recovered relationship is not absence of a feature.
- Existing ignored evidence is under artifacts/vyapar-analysis/. A bounded scan decoded hexadecimal escape sequences as text only. This did not evaluate a string-decoder function or bundle bootstrap.

## Findings

| Question | Observation | Interpretation and remaining uncertainty |
| --- | --- | --- |
| Party credit limits | The packaged plan/features interface describes a party-specific limit with alerts when a balance exceeds it. The party-dialog bundle includes credit-limit enabled/toggle properties and a warning-dialog handler. | Configurable limits and warnings are supported by shipped text. Whether a warning can be overridden or prevents a particular transaction is unresolved. Hard rejection in our app would be an explicit implementation choice. |
| Opening balances | Party-dialog and POS-related bundles include opening-balance amount, type and date getter/handler labels. A separately shipped adapter maps opening_balance, balance and credit_limit fields into party data. | Dated opening balances and a balance direction/type are supported by static fields. Exact posting rules, migration behavior and edit restrictions remain unresolved. |
| Multiple POS bills | The supplied screenshot shows numbered bill tabs and New Bill. The shipped POS-related bundle contains new-bill creation handlers and separate New Bill / Save and New Bill labels with keyboard hints. | Creating another bill is observed at the UI/text level. Persistent parked-cart behavior across reload, draft limits and save timing are unresolved. Our persistence policy must be tested independently. |
| Partial returns and refunds | A packaged controller is named ConvertToReturn. Bounded literal searches of this controller and the selected party/POS bundles do not resolve partial-return limits or refund posting semantics. Generic refunded/payment-state strings elsewhere also include vendor-library and external-payment contexts. | A return conversion entry point exists, but this investigation does not establish partial-refund allocation or cash/account effects. Any local partial-return implementation must use original validation/accounting rules and independent tests. |

## Reconstruction boundary

Assemble Electrix implements dated party opening balances, advisory credit warnings, browser-local parked POS carts, and partial returns and refunds on trading bills. The implementation uses its own validation and accounting, with tests for amount and date bounds, duplicate and over-return prevention, inventory, cash, accounting reports, backup restore and draft persistence. POS drafts stay in the originating browser and are excluded from financial backups. Live Google, WhatsApp, network, payment-provider and tax-filing services require their actual integrations and credentials; shipped labels do not make those services connected.

The prior desktop-control denial remains in effect. This investigation neither controls Vyapar nor uses another interface to bypass that restriction.
