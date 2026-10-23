JAMALI

Plain, honest bookkeeping for a small trading business.

A static, zero build web app: the books, journals, ledgers, registers and reports a small business actually needs, all driven by one append only transaction journal. Record a transaction once, and every other page derives from it.

Live at https://jamali-lime.vercel.app


HIGHLIGHTS

Sign in with Google: nothing to install, nothing to configure.

Record once, read everywhere: cash books, journals, ledger, trial balance and schedules all read the same data. No re-entry, ever.

Append only journal: Firestore rules forbid updating or deleting a transaction, so the books cannot be silently rewritten.

52 live pages: cash books, 8 journals, ledgers, 20 registers and documents, 14 reports and schedules.

Works on the phone: the sidebar folds into a burger at 800px, and every page is checked at 390px.

Zero build step: vanilla HTML, CSS and JS (ES modules), served as is.


TECH AT A GLANCE

Front end: vanilla HTML, CSS and JS (ES modules). No framework, no build step.

Auth: Firebase Authentication, Google sign in with a popup.

Database: Cloud Firestore.

Hosting: Vercel, static, with clean URLs like /petty-cash/7.

FirebaseJS: version 10.12.2, loaded from the gstatic CDN.


USING THE APP

Open the site and sign in with your Google account (index.html).

Business is the control room. From there open Add Transaction or View File.

Add Transaction walks you through it: pick a type (IN, OUT, NEUTRAL or CONTRA), pick the transaction, fill the form, save. Bank charges are stored as their own separate record automatically, so the bank columns stay exact.

View File is the library: every book, register and report is one click away. The dark sidebar on every page mirrors the same family tree, deeper pages are indented, and the address bar always stays clean at the domain root.


ARCHITECTURE

One folder per page. The public folder is the web root, and every page lives in its own folder as N.html, N.css and N.js. Pages are addressed without the extension, for example /petty-cash/7.

Navigation. sidebar.js sits on every page: a 220px fixed family tree with the active page highlighted. It cleans the address bar so the URL stays at the domain root, and on screens of 800px or below the sidebar slides away behind a burger button with a tap to close overlay.

Styling. Every folder ships its own stylesheet. The shared bases, journals/journal.css and records/records.css, carry the design system. Each page's own css imports its base, adds the page's title accent colour and cleans up printing (sidebar, buttons and filters hidden, white paper background). The look: light slate background, white cards with a 14px radius, sky blue accents, dark navy sidebar.

The engines behind the pages are listed in the file guide below.


THE REPO, FILE BY FILE

Every page folder carries the same three files: N.html, N.css and N.js. Below, every file and folder has its number and one plain line about what it is for, and one blank line separates each entry. Folders are explained by what they are for, not by what sits inside them.

The pages, one folder each, 1 to 54:

1. home - the landing page after sign in: greeting, news and the jump off point.

2. business - the control room: opens Add Transaction and View File.

3. add-transaction - the journal entry engine: every transaction is recorded here, once.

4. view-file - the library: a tile launcher for every book, register and report.

5. all-transactions - the full journal: every recorded transaction, filterable in one table.

6. cash-book - the double column cash book: bank and cash side by side, DR and CR.

7. petty-cash - the petty cash book: small day to day spend. Names containing Petty land here.

8. sales-journal - the sales journal: credit sales at a glance.

9. purchases-journal - the purchases journal: credit purchases at a glance.

10. sales-returns - the sales returns journal: goods customers sent back.

11. purchases-returns - the purchases returns journal: goods sent back to suppliers.

12. general-journal - the general journal: everything that fits nowhere else, two sided DR and CR.

13. cash-receipts - the cash receipts journal: money coming in.

14. cash-payments - the cash payments journal: money going out.

15. cash-book-single - the single column cash book: cash movements only.

16. creditors-book - what JAMALI owes: a running balance per supplier.

17. debtors-book - what customers owe JAMALI: a running balance per customer.

18. ledger - every account on its own T page: DR and CR sides, balance carried down and brought down (c/d, b/d). Also home of the shared postings.js engine.

19. bills receivable (folder pending) - bills drawn on customers, tracked to settlement. The bills collection is already in the security rules.

20. bills payable (folder pending) - bills accepted from suppliers, tracked to payment. The bills collection is already in the security rules.

21. sales-order-book - customer orders taken, not yet invoiced.

22. purchase-order-book - orders placed with suppliers, not yet received.

23. sales-invoice - sales invoices raised on customers.

24. purchase-invoice - purchase invoices received from suppliers.

25. grn-register - goods received notes: what physically arrived.

26. dispatch-register - dispatch notes: what physically left the building.

27. sales-invoice-register - every sales invoice with its settlement status.

28. purchase-invoice-register - every purchase invoice with its settlement status.

29. debit-note-register - debit notes: corrections that reduce what we owe suppliers.

30. credit-note-register - credit notes: corrections that reduce what customers owe us.

31. stock-movement - goods in, goods out and the running quantity per stock item.

32. fixed-assets - what the business owns: each asset at cost, in service.

33. depreciation - straight line depreciation computed per asset.

34. payroll - salaries, deductions and net pay per employee.

35. employee-advance - money advanced to employees and how it is recovered.

36. petty-cash-voucher - signed vouchers behind every small cash spend.

37. receipt-voucher - proof when money is received.

38. payment-voucher - the approval trail when money goes out.

39. cheque-register - every cheque written: pending, cleared or bounced.

40. delivery-note - delivery notes: what went out with each consignment.

41. trial-balance - all ledger balances in one table: debits must equal credits.

42. adjusted-trial-balance - the trial balance plus the adjustment entries.

43. post-closing-trial-balance - the trial balance after the nominal accounts are closed to capital.

44. ar-schedule - receivables by customer, straight from the books.

45. ap-schedule - payables by supplier, straight from the books.

46. inventory-valuation - inventory value two ways: FIFO layers and weighted average, side by side.

47. fixed-assets-schedule - cost, additions and depreciation to date per asset.

48. accumulated-depreciation - the wear and tear tally per asset.

49. accrued-expenses - expenses incurred but not yet paid.

50. prepaid-expenses - expenses paid but not yet consumed.

51. accrued-income - income earned but not yet received.

52. unearned-revenue - money received but not yet earned.

53. bank-reconciliation - statement against books: the difference must be zero.

54. suspense-account - the temporary parking spot: it clears at zero.

The shared files and engines, 55 to 60:

55. index.html - the front door: Google sign in, and where signed out visitors land.

56. firebase.js - the one Firebase module every page imports: Google auth, Firestore exports and the requireAuth guard that bounces signed out visitors to the start page.

57. sidebar.js - the family tree navigation shared by every page: the sidebar, the active page highlight, the mobile burger and the address bar cleanup.

58. journals - the engine folder (journal.js and journal.css) that renders the eight journals, pages 7 to 14.

59. records - the engine folder (records.js and records.css) behind the register pages 21 to 40, and the design base for the report pages too.

60. reports - the engine folder (reports.js) that generates the reports and schedules, pages 41 to 54. Views only, no data entry.

At the root of the repo, 61 to 69:

61. firestore.rules - the guard dog. Decides who may read or write each collection: the journal stays append only, registers can be created and settled but never deleted, everything needs a signed in user, and anything not matched is denied.

62. vercel.json - the routing table. Turns clean URLs like /petty-cash/7 into the real petty-cash/7.html, so the address bar stays at the domain root.

63. README.md - this guide.

64. scripts - the folder of home grown operational tooling.

65. scripts/jamali-rate-limited-push.sh - the gentle deployer. Pushes git changes rate limited, so deployments stay steady instead of bursty.

66. systemd/user - the folder of user level systemd units that keep the deploy rhythm running on their own.

67. systemd/user/jamali-rate-limited-push.service - runs the push script as a service.

68. systemd/user/jamali-rate-limited-push.timer - fires that service on a schedule.

69. public - the entire app, the web root Vercel serves. Every page folder and every shared file listed above lives here.


DATA MODEL

The journal. One collection, called transactions, written by page 3. Six fields:

transactionName: what happened, for example Sales, Rent or Petty Expense.

dateTime: the server timestamp.

flowMethod: Cash, Bank, Credit or N/A.

transactionType: IN, OUT, NEUTRAL or CONTRA.

name: the counterparty or detail, for example Customer A or Landlord A.

amount: the money amount.

The transaction lists per type live in add-transaction/3.js under TRANSACTIONS, marked EDIT ME, so you can tune them to the business. The books select their rows from transactionName, so naming matters: names containing Petty land in the petty cash book.

Registers and inputs. One collection per register family, written by their own pages and read by every derived view:

orders: feeds the sales and purchase order books, pages 21 and 22.

invoices: feeds sales and purchase invoices (23, 24), their registers (27, 28) and the AR and AP schedules (44, 45).

goods: feeds the GRN register (25), dispatch (26), stock movement (31) and inventory valuation (46).

notes: feeds the debit and credit note registers (29, 30).

vouchers: feeds the petty cash, receipt and payment vouchers (36 to 38).

cheques: feeds the cheque register (39).

deliveryNotes: feeds the delivery note page (40).

payroll: feeds payroll (34).

advances: feeds employee advance (35).

assets: feeds fixed assets (32), depreciation (33) and their schedules (47, 48).

adjustments: feeds the adjusted and post closing trial balances (42, 43) and the accrual pages (49 to 52).

bankrec: feeds the bank reconciliation (53).

suspense: feeds the suspense account (54).

bills: feeds bills receivable and payable (19, 20, folders pending).


SECURITY

Nothing is public. Every collection requires a signed in user.

The transactions journal is append only: create and read only. Update and delete are forbidden by rule, so the journal cannot be rewritten.

Register collections allow create, read and update, for settlements and status edits. Delete is always false.

Catch all deny: any document not matched above is unreadable and unwritable.

After editing, deploy the rules: firebase deploy --only firestore:rules


ACCOUNTING PRINCIPLES BAKED IN

Record once, derive everywhere. Journals, ledgers, schedules and reports are generated from the same records, so a figure entered twice is impossible by design.

Status is computed, never stored. Pending, partially paid, paid, overdue, cleared, bounced: all derived at read time from dates and settlements, so they can never go stale.

A contra is a move, not income. Cash deposits and withdrawals, cash to bank and back, never inflate revenue or expenses.

Oldest invoice settles first. Open invoices are settled FIFO by due date, and the aging buckets run Current, 1 to 30, 31 to 60, 61 to 90 and 90 plus.

The trial balance must balance. Debits equal credits, or the page says so out loud.

The ledger carries down. Each account page totals both sides, enters balance c/d on the smaller side to close the period, and balance b/d on the opposite side to open the next.

The bank rec proves itself. Statement balance, deposits in transit and outstanding cheques produce an adjusted balance, and the difference against the books must be zero.

Suspense clears at zero. Debits equal credits, or the account stays open.


DEPLOYMENT AND SYNCING

Vercel serves the public folder at the domain root with clean URLs: /petty-cash/7 becomes petty-cash/7.html. Every git push deploys, and since the output is static the builds are instant.

Rate limited pushes: scripts/jamali-rate-limited-push.sh pushes the repo gently, and the systemd service and timer run it on a schedule, keeping deployment steady instead of bursty.


LOCAL DEVELOPMENT

cd ~/jamali/public

python3 -m http.server 8080 (or npx serve)

then open http://localhost:8080

Sign in and data need the real Firebase project: pages without a session bounce back to the start page by design. To develop offline, point public/firebase.js at a mock module that fakes auth and onSnapshot.


ADDING A NEW PAGE

Create the folder inside public and add N.html, N.css and N.js. The html links the shared base css, its own css, sidebar.js and its own js.

Register the page in sidebar.js under PAGES with its label, icon, folder, page number and depth. The sidebar and the active highlight come free.

Add its tile to the View File launcher grid, in view-file/4.html.

New collection? Extend firestore.rules, keep delete forbidden, then deploy: firebase deploy --only firestore:rules

Every folder ships html, css and js. No exceptions.


STATUS AND ROADMAP

Shipped: core pages 1 to 5, cash books 6 and 15, journals 7 to 14, ledgers 16 to 18, registers and documents 21 to 40, reports and schedules 41 to 54. 52 pages, all live.

Next up: the wider report suite, sales, purchases and cash analyses, profitability, budgets and ratios. Bills receivable and payable (19, 20) are provisioned, folders pending.

Last updated: 23 October 2026.
