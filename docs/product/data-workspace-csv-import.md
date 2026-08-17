# Stage 18: CSV/XLSX Import and Data Workspace

## Purpose

Data Workspace provides two user-owned data flows:

- **Trade Import** stages CSV, XLSX, or clipboard data, validates it, and imports confirmed valid rows into the Journal.
- **Custom Table** provides a lightweight spreadsheet for trade plans, research notes, and risk tracking.

This stage does not add a formula engine, relations, board/calendar views, shared editing, broker APIs, market data, or trade execution.

## Data integrity

Files are parsed in the browser and are not uploaded to object storage. Staged rows and mappings are saved to the secure user data layer. Every table, row, import batch, account, and imported trade is scoped to the authenticated user.

Import uses the following safeguards:

- Client validation is repeated on the server.
- Required fields are symbol, direction, opened time, and entry price.
- Trade direction, numbers, and common date formats are normalized.
- Deterministic row hashes prevent duplicate trades in the same trading account.
- Existing trades are never overwritten.
- Valid rows import in resumable chunks of 250.
- Invalid rows remain in staging for correction.
- Rollback is explicit and deletes only trades associated with that import batch.
- Imported trades do not automatically create psychology records, rule checks, AI reviews, or vector memory.

## Workspace limits

- File size: 5 MB
- Rows: 5,000
- Columns: 50
- Autosave delay: 800 ms
- Autosave batch: 200 rows

## Custom tables

Custom tables support editable text, number, currency, percent, date, datetime, select, checkbox, and URL columns. The grid supports sorting, row filtering, column reordering, row selection, and rectangular clipboard paste from Excel, Google Sheets, and Notion.

## Account model

Each import targets a user-owned CSV trading account. Imported trades use `source=csv` and the selected account ID, which makes them available through existing Dashboard and Journal account filters. Future Bybit and OKX integrations will use the same ownership model without changing imported CSV history.

## Operational note

Apply `src/db/patches/011_data_workspace_csv_import.sql` before enabling the route in production. The migration is additive, enables row-level ownership policies, and does not delete existing data.
