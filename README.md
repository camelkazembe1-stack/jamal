# JAMALI

**Plain, honest bookkeeping for a small trading business.**

A static, zero-build web app: the books, journals, ledgers, registers and
reports a small business actually needs — all driven by **one append-only
transaction journal**. Record a transaction once; every other page derives
from it.

Live at **https://jamali-lime.vercel.app**

---

## Highlights

- **Sign in with Google** — nothing to install, nothing to configure.
- **Record once, read everywhere** — cash books, journals, ledger, trial
  balance and schedules all read the same data. No re-entry, ever.
- **Append-only journal** — Firestore rules forbid updating or deleting a
  transaction. The books cannot be silently rewritten.
- **52 live pages** — cash books, 8 journals, ledgers, 20 registers and
  documents, 14 reports and schedules.
- **Works on the phone** — the sidebar folds into a burger at 800px; every
  page is checked at 390px.
- **Zero build step** — vanilla HTML + CSS + JS (ES modules), served as-is.

## Tech at a glance

| Layer      | Choice                                                  |
| ---------- | ------------------------------------------------------- |
| Front end  | Vanilla HTML/CSS/JS, ES modules, no framework, no build |
| Auth       | Firebase Authentication — Google sign-in (popup)        |
| Database   | Cloud Firestore                                         |
| Hosting    | Vercel — static, clean URLs (`/petty-cash/7`)           |
| FirebaseJS | 10.12.2, loaded from the gstatic CDN                    |

## Using the app

1. Open the site and **sign in with your Google account** (`index.html`).
2. **Business** is the control room. From there open **Add Transaction**
   or **View File**.
3. **Add Transaction** walks you through it: pick a type
   (IN / OUT / NEUTRAL / CONTRA) → pick the transaction → fill the form →
   save. Bank charges are stored as their **own separate record**
   automatically, so the bank columns stay exact.
4. **View File** is the library — every book, register and report is one
   click away. The dark sidebar on every page mirrors the same family tree
   (deeper pages are indented), and the address bar always stays clean at
   the domain root.

## Architecture

**One folder per page.** `public/` is the web root and every page lives in
its own folder as `N.html` + `N.css` + `N.js` — no exceptions. Pages are
addressed without the extension (`/petty-cash/7`).

**Shared modules:**

| Module                            | Used by        | Role                                                                                     |
| --------------------------------- | -------------- | ---------------------------------------------------------------------------------------- |
| `public/firebase.js`              | every page     | One Firebase module: Google auth, Firestore exports, `requireAuth()` guard (bounces to `/`) |
| `public/sidebar.js`               | every page     | The family tree: 220px fixed sidebar, active-page highlight, mobile burger + overlay, cleans the address bar |
| `public/journals/journal.js`      | pages 7–14     | Journal engine: filters the journal by naming keywords and renders the book with totals   |
| `public/journals/journal.css`     | pages 7–14     | Book design system (shared base)                                                          |
| `public/records/records.js`       | register pages | Register engine: form card, status tabs, tables, settle editor, summary cards             |
| `public/reports/reports.js`       | report pages   | Report/schedule engine (generated views — no re-entry)                                    |
| `public/records/records.css`      | pages 21–54    | Register + report design system (shared base)                                             |
| `public/ledger/postings.js`       | page 18        | Double-entry posting engine: groups entries into accounts, DR/CR sides, Balance c/d → b/d  |

**Navigation:** `sidebar.js` reads the current folder first, then cleans the
address bar with `history.replaceState`, so the active page stays
highlighted at `/`. On screens ≤ 800px the sidebar slides away behind a
burger button with a tap-to-close overlay.

**Styling convention:** every folder ships its own stylesheet. The shared
bases (`journals/journal.css`, `records/records.css`) carry the design
system; each page's own `N.css` imports its base, adds the page's title
accent colour, and cleans up printing (sidebar, buttons and filters hidden,
white paper background). Look: light slate background, white 14px-radius
cards, sky-blue accents, dark navy sidebar.

## The repo — every file and folder, and what it does

Page folders each carry the same three files (`N.html` + `N.css` + `N.js`,
see Architecture) — so below, every file and folder is explained by what it
is **for**, not by what sits inside it.

**At the root**

| Path | Role |
| --- | --- |
| `firestore.rules` | The guard dog. Decides who may read or write each collection: the journal stays append-only, registers can be created and settled but never deleted, everything needs a signed-in user, and anything not matched is denied. |
| `vercel.json` | The routing table. Turns clean URLs like `/petty-cash/7` into the real `petty-cash/7.html`, so the address bar stays at the domain root. |
| `README.md` | This guide — the architecture, the pages, the data model and the rules of the game in one place. |
| `scripts/` | Home-grown operational tooling. |
| `scripts/jamali-rate-limited-push.sh` | The gentle deployer — pushes git changes rate-limited, so deployments stay steady instead of bursty. |
| `systemd/user/` | User-level systemd units that keep the deploy rhythm running on their own. |
| `systemd/user/jamali-rate-limited-push.service` | Runs the push script as a service. |
| `systemd/user/jamali-rate-limited-push.timer` | Fires that service on a schedule. |
| `public/` | The entire app — the web root Vercel serves. Everything below lives here. |

**Inside `public/` — shared files and engines**

| Path | Role |
| --- | --- |
| `index.html` | The front door — Google sign-in, and where signed-out visitors land. |
| `firebase.js` | The one Firebase module every page imports — Google auth, Firestore exports and the `requireAuth()` guard. |
| `sidebar.js` | The family-tree navigation shared by every page — sidebar, active highlight, mobile burger, address-bar cleanup. |
| `journals/` | The journal engine (`journal.js` + `journal.css`) that renders the eight journals, pages 7–14. |
| `records/` | The register engine (`records.js` + `records.css`) behind the register pages 21–40 — and the design base for the report pages too. |
| `reports/` | The report engine (`reports.js`) that generates the reports and schedules, pages 41–54 — views only, no data entry. |

**Inside `public/` — the page folders**

*Core*

| Folder | # | Role |
| --- | --- | --- |
| `home` | 1 | The landing page after sign-in — greeting, news and the jump-off point. |
| `business` | 2 | The control room — opens Add Transaction and View File. |
| `add-transaction` | 3 | The journal entry engine — every transaction is recorded here, once. |
| `view-file` | 4 | The library — a tile launcher for every book, register and report. |
| `all-transactions` | 5 | The full journal — every recorded transaction, filterable in one table. |

*Cash books*

| Folder | # | Role |
| --- | --- | --- |
| `cash-book` | 6 | Double-column cash book — bank and cash side by side, DR and CR. |
| `cash-book-single` | 15 | Single-column cash book — cash movements only. |

*Journals (one engine, pages 7–14)*

| Folder | # | Role |
| --- | --- | --- |
| `petty-cash` | 7 | Petty Cash Book — small day-to-day spend (names containing "Petty" land here). |
| `sales-journal` | 8 | Sales Journal — credit sales at a glance. |
| `purchases-journal` | 9 | Purchases Journal — credit purchases at a glance. |
| `sales-returns` | 10 | Sales Returns Journal — goods customers sent back. |
| `purchases-returns` | 11 | Purchases Returns Journal — goods sent back to suppliers. |
| `general-journal` | 12 | General Journal — everything that fits nowhere else, two-sided DR/CR. |
| `cash-receipts` | 13 | Cash Receipts Journal — money coming in. |
| `cash-payments` | 14 | Cash Payments Journal — money going out. |

*Ledgers*

| Folder | # | Role |
| --- | --- | --- |
| `creditors-book` | 16 | What JAMALI owes — running balance per supplier. |
| `debtors-book` | 17 | What customers owe JAMALI — running balance per customer. |
| `ledger` | 18 | Every account on its own T-page — DR/CR sides, Balance c/d → b/d. Also home of the shared `postings.js` engine. |

*Registers & documents (one engine, pages 21–40)*

| Folder | # | Role |
| --- | --- | --- |
| `sales-order-book` | 21 | Customer orders taken — not yet invoiced. |
| `purchase-order-book` | 22 | Orders placed with suppliers — not yet received. |
| `sales-invoice` | 23 | Sales invoices raised on customers. |
| `purchase-invoice` | 24 | Purchase invoices received from suppliers. |
| `grn-register` | 25 | Goods Received Notes — what physically arrived. |
| `dispatch-register` | 26 | Dispatch notes — what physically left the building. |
| `sales-invoice-register` | 27 | Every sales invoice with its settlement status. |
| `purchase-invoice-register` | 28 | Every purchase invoice with its settlement status. |
| `debit-note-register` | 29 | Debit notes — corrections that reduce what we owe suppliers. |
| `credit-note-register` | 30 | Credit notes — corrections that reduce what customers owe us. |
| `stock-movement` | 31 | Goods in, goods out and the running quantity per stock item. |
| `fixed-assets` | 32 | What the business owns — each asset at cost, in service. |
| `depreciation` | 33 | Straight-line depreciation computed per asset. |
| `payroll` | 34 | Salaries, deductions and net pay per employee. |
| `employee-advance` | 35 | Money advanced to employees and how it is recovered. |
| `petty-cash-voucher` | 36 | Signed vouchers behind every small cash spend. |
| `receipt-voucher` | 37 | Proof when money is received. |
| `payment-voucher` | 38 | The approval trail when money goes out. |
| `cheque-register` | 39 | Every cheque written — pending, cleared or bounced. |
| `delivery-note` | 40 | Delivery notes — what went out with each consignment. |

*Reports & schedules (generated, pages 41–54)*

| Folder | # | Role |
| --- | --- | --- |
| `trial-balance` | 41 | All ledger balances in one table — debits must equal credits. |
| `adjusted-trial-balance` | 42 | The trial balance plus the adjustment entries. |
| `post-closing-trial-balance` | 43 | After the nominal accounts are closed to Capital. |
| `ar-schedule` | 44 | Receivables by customer, straight from the books. |
| `ap-schedule` | 45 | Payables by supplier, straight from the books. |
| `inventory-valuation` | 46 | FIFO layers and weighted average, side by side. |
| `fixed-assets-schedule` | 47 | Cost, additions and depreciation to date per asset. |
| `accumulated-depreciation` | 48 | The wear-and-tear tally per asset. |
| `accrued-expenses` | 49 | Expenses incurred but not yet paid. |
| `prepaid-expenses` | 50 | Expenses paid but not yet consumed. |
| `accrued-income` | 51 | Income earned but not yet received. |
| `unearned-revenue` | 52 | Money received but not yet earned. |
| `bank-reconciliation` | 53 | Statement vs books — the difference must be zero. |
| `suspense-account` | 54 | The temporary parking spot — it clears at zero. |

**Provisioned, folders pending:** Bills Receivable (19) — bills drawn on
customers, tracked to settlement — and Bills Payable (20) — bills accepted
from suppliers, tracked to payment. The `bills` collection is already in
the security rules.

## Data model

**The journal — collection `transactions`** (written by page 3):

| field             | meaning                                              |
| ----------------- | ---------------------------------------------------- |
| `transactionName` | what happened — "Sales", "Rent", "Petty Expense", …  |
| `dateTime`        | server timestamp                                     |
| `flowMethod`      | `Cash` / `Bank` / `Credit` / `N/A`                   |
| `transactionType` | `IN` / `OUT` / `NEUTRAL` / `CONTRA`                  |
| `name`            | counterparty or detail — "Customer A", "Landlord A"  |
| `amount`          | the money amount                                     |

- The transaction lists per type live in `add-transaction/3.js` under
  `TRANSACTIONS` (marked **EDIT ME**) — tune them to the business.
- The books select their rows from `transactionName`, so naming matters
  (e.g. names containing "Petty" land in the Petty Cash Book).

**Registers and inputs** — one collection per register family; written by
their own pages, read by every derived view:

| collection     | feeds                                                       |
| -------------- | ----------------------------------------------------------- |
| `orders`       | sales / purchase order books (21, 22)                        |
| `invoices`     | sales & purchase invoices (23, 24), registers (27, 28), AR/AP schedules (44, 45) |
| `goods`        | GRN (25), dispatch (26), stock movement (31), inventory (46) |
| `notes`        | debit / credit note registers (29, 30)                       |
| `vouchers`     | petty cash / receipt / payment vouchers (36–38)              |
| `cheques`      | cheque register (39)                                         |
| `deliveryNotes`| delivery note (40)                                           |
| `payroll`      | payroll (34)                                                 |
| `advances`     | employee advance (35)                                        |
| `assets`       | fixed assets & depreciation schedules (32, 33, 47, 48)       |
| `adjustments`  | adjusted / post-closing TB (42, 43), accruals & prepayments (49–52) |
| `bankrec`      | bank reconciliation (53)                                     |
| `suspense`     | suspense account (54)                                        |
| `bills`        | bills receivable / payable (19, 20 — folders pending)        |

## Security (`firestore.rules`)

- **Nothing is public.** Every collection requires a signed-in user
  (`request.auth != null`).
- **`transactions` is append-only**: `create` + `read` only. Update and
  delete are `if false` — the journal cannot be rewritten, by rule.
- **Register collections** allow `create` + `read` + `update` (settlements
  and status edits); **delete is always false**.
- **Catch-all deny**: any document not matched above is unreadable and
  unwritable.
- Deploy after edits: `firebase deploy --only firestore:rules`.

## Accounting principles baked in

- **Record once, derive everywhere.** Journals, ledgers, schedules and
  reports are generated from the same records — a figure entered twice is
  impossible by design.
- **Status is computed, never stored.** Pending / Partially Paid / Paid /
  Overdue / Cleared / Bounced are derived at read time from dates and
  settlements, so they can never go stale.
- **A contra is a move, not income.** Cash deposits and withdrawals
  (cash ↔ bank) never inflate revenue or expenses.
- **Oldest invoice settles first.** Open invoices are settled FIFO by due
  date; aging buckets run Current / 1–30 / 31–60 / 61–90 / 90+.
- **The trial balance must balance.** Debits = credits or the page says so
  out loud.
- **The ledger carries down.** Each account page totals both sides, enters
  Balance c/d on the smaller side to close the period, and Balance b/d on
  the opposite side to open the next.
- **The bank rec proves itself.** Statement balance, deposits in transit
  and outstanding cheques produce an adjusted balance; the difference
  against the books must be zero.
- **Suspense clears at zero.** DR total = CR total or the account stays
  open.

## Deployment & syncing

- **Vercel** serves `public/` at the domain root with clean URLs
  (`vercel.json`): `/petty-cash/7` → `petty-cash/7.html`. Every `git push`
  deploys — static output, so builds are instant.
- **Rate-limited pushes:** `scripts/jamali-rate-limited-push.sh` pushes the
  repo gently; `systemd/user/jamali-rate-limited-push.service` +
  `jamali-rate-limited-push.timer` run it on a schedule, keeping deployment
  steady instead of bursty.

## Local development

```bash
cd ~/jamali/public
python3 -m http.server 8080        # or: npx serve
# open http://localhost:8080
```

Sign-in and data need the real Firebase project — pages without a session
bounce to `/` by design. To develop offline, point `public/firebase.js` at
a mock module that fakes auth and `onSnapshot`.

## Adding page #N (checklist)

1. `mkdir public/<folder>` — add `N.html` (links the shared base css, its
   own `N.css`, `/sidebar.js`, and its own `N.js`), `N.css`, `N.js`.
2. Register it in `sidebar.js` → `PAGES` (label, icon, folder, page
   number, depth) — the sidebar and active highlight come free.
3. Add its tile to the **View File** launcher grid (`view-file/4.html`).
4. New collection? Extend `firestore.rules` (keep `delete: if false`) and
   `firebase deploy --only firestore:rules`.
5. Every folder ships **html + css + js** — no exceptions.

## Status & roadmap

- **Shipped:** core (1–5), cash books (6, 15), journals (7–14), ledgers
  (16–18), registers & documents (21–40), reports & schedules (41–54) —
  52 pages, all live.
- **Next up:** Bills Receivable / Bills Payable (19–20) and the wider
  report suite — sales, purchases and cash analyses, profitability,
  budgets and ratios.

*Last updated: 23 October 2026.*
