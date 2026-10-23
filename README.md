cat > README.md << 'EOF'
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

## Page map

**Core**

| # | Folder              | Page                                                   |
| - | ------------------- | ------------------------------------------------------ |
| 1 | `home`              | Home — sign-in landing and news                        |
| 2 | `business`          | Business — control room; opens Add Transaction / View File |
| 3 | `add-transaction`   | Add Transaction — the journal entry engine             |
| 4 | `view-file`         | View File — launcher grid for every book and report    |
| 5 | `all-transactions`  | All Transactions — the full journal, filterable        |

**Cash books**

| #  | Folder              | Page                                                    |
| -- | ------------------- | ------------------------------------------------------- |
| 6  | `cash-book`         | Double Column Cash Book — bank + cash, DR/CR            |
| 15 | `cash-book-single`  | Cash Book — single column                               |

**Journals (pages 7–14, one engine)**

| #  | Folder               | Page                        |
| -- | -------------------- | --------------------------- |
| 7  | `petty-cash`         | Petty Cash Book             |
| 8  | `sales-journal`      | Sales Journal               |
| 9  | `purchases-journal`  | Purchases Journal           |
| 10 | `sales-returns`      | Sales Returns Journal       |
| 11 | `purchases-returns`  | Purchases Returns Journal   |
| 12 | `general-journal`    | General Journal — two-sided DR/CR |
| 13 | `cash-receipts`      | Cash Receipts Journal       |
| 14 | `cash-payments`      | Cash Payments Journal       |

**Ledgers**

| #  | Folder          | Page                                                          |
| -- | --------------- | ------------------------------------------------------------- |
| 16 | `creditors-book`| Creditors Book — what JAMALI owes, per supplier               |
| 17 | `debtors-book`  | Debtors Book — what customers owe JAMALI                      |
| 18 | `ledger`        | Ledger — every account on its own page (DR/CR, Balance c/d → b/d) |

**Registers & documents (pages 21–40, one engine)**

| #  | Folder                      | Page                              |
| -- | --------------------------- | --------------------------------- |
| 21 | `sales-order-book`          | Sales Order Book                  |
| 22 | `purchase-order-book`       | Purchase Order Book               |
| 23 | `sales-invoice`             | Sales Invoices                    |
| 24 | `purchase-invoice`          | Purchase Invoices                 |
| 25 | `grn-register`              | GRN Register — goods received     |
| 26 | `dispatch-register`         | Dispatch Register — goods sent    |
| 27 | `sales-invoice-register`    | Sales Invoice Register            |
| 28 | `purchase-invoice-register` | Purchase Invoice Register         |
| 29 | `debit-note-register`       | Debit Note Register               |
| 30 | `credit-note-register`      | Credit Note Register              |
| 31 | `stock-movement`            | Stock Movement                    |
| 32 | `fixed-assets`              | Fixed Assets Register             |
| 33 | `depreciation`              | Depreciation (straight-line)      |
| 34 | `payroll`                   | Payroll                           |
| 35 | `employee-advance`          | Employee Advance                  |
| 36 | `petty-cash-voucher`        | Petty Cash Voucher                |
| 37 | `receipt-voucher`           | Receipt Voucher                   |
| 38 | `payment-voucher`           | Payment Voucher                   |
| 39 | `cheque-register`           | Cheque Register                   |
| 40 | `delivery-note`             | Delivery Note                     |

**Reports & schedules (pages 41–54, generated)**

| #  | Folder                        | Page                                        |
| -- | ----------------------------- | ------------------------------------------- |
| 41 | `trial-balance`               | Trial Balance — debits must equal credits   |
| 42 | `adjusted-trial-balance`      | Adjusted Trial Balance (+ adjustments table)|
| 43 | `post-closing-trial-balance`  | Post-Closing Trial Balance                  |
| 44 | `ar-schedule`                 | AR Schedule — receivables by customer       |
| 45 | `ap-schedule`                 | AP Schedule — payables by supplier          |
| 46 | `inventory-valuation`         | Inventory Valuation (FIFO + weighted avg)   |
| 47 | `fixed-assets-schedule`       | Fixed Assets Schedule                       |
| 48 | `accumulated-depreciation`    | Accumulated Depreciation                    |
| 49 | `accrued-expenses`            | Accrued Expenses                            |
| 50 | `prepaid-expenses`            | Prepaid Expenses                            |
| 51 | `accrued-income`              | Accrued Income                              |
| 52 | `unearned-revenue`            | Unearned Revenue                            |
| 53 | `bank-reconciliation`         | Bank Reconciliation                         |
| 54 | `suspense-account`            | Suspense Account — clears at zero           |

**Provisioned, folders pending:** Bills Receivable (19) and Bills Payable
(20) — the `bills` collection is already in the security rules.

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

## Repo layout
