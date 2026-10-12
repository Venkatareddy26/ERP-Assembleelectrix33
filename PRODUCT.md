# Assemble Electrix

Local job-work manufacturing ERP for a factory that receives customer-owned materials, assembles CKD products, and charges per accepted product. The supplied BOM is authoritative for product/component quantities. Customers and rates are entered separately. Worker wages never share customer billing rates.

First release: customer and rate masters, BOM explorer and material planning, material inward and ownership-aware stock, orders, production with BOM consumption, final QC, dispatch, job-work bills, worker piece earnings, formatted Excel exports, JSON backups.
Local runs keep the original single-computer SQLite app. Vercel runs use a separate per-browser IndexedDB store and the same domain rules, with formatted Excel exports and JSON backups. The imported BOM is bundled; Actual starts empty and Demo is isolated. No shared remote database, tax invoice or tax determination, authentication, bank payments, multi-user permissions, or salary payroll processing.
