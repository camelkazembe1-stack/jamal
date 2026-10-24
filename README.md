JAMALI

Plain, honest bookkeeping for a small trading business, plus a 256 tool file and data converter.

A static, zero build web app: the books, journals, ledgers, registers and reports a small business actually needs, all driven by one append only transaction journal. Record a transaction once, and every other page derives from it. On top of the books sits the Convertor: 256 real, working file and data tools, every one on its own page in its own folder.

Live at https://jamali-lime.vercel.app


HIGHLIGHTS

Sign in with Google: nothing to install, nothing to configure.

Record once, read everywhere: cash books, journals, ledger, trial balance and schedules all read the same data. No re-entry, ever.

Append only journal: Firestore rules forbid updating or deleting a transaction, so the books cannot be silently rewritten.

61 bookkeeping pages, plus the Convertor: a hub of 256 square buttons, each opening a real working tool page, all client side.

A collapsible family tree sidebar on every page: branches open and close with a tap, the active page highlights itself, and the whole tree folds into a burger drawer on the phone.

Zero build step: vanilla HTML, CSS and JS (ES modules), served as is.


TECH AT A GLANCE

Front end: vanilla HTML, CSS and JS (ES modules). No framework, no build step.

Auth: Firebase Authentication, Google sign in with a popup.

Database: Cloud Firestore.

Hosting: Vercel, static, with clean URLs like /petty-cash/7 and /text-to-pdf/65.

FirebaseJS: version 10.12.2, loaded from the gstatic CDN.

Converter libraries: loaded per tool from the jsDelivr CDN (pdf-lib, pdf.js, jsPDF, SheetJS, mammoth, JSZip, PptxGenJS, lamejs, tesseract.js and friends), with built in pure JavaScript writers for DOCX, ODT, EPUB, TAR, gzip and more. Every tool runs entirely in the browser: nothing uploads anywhere, and a tool that hits a real browser limit says so on its page instead of producing a wrong file.


USING THE APP

Open the site and sign in with your Google account (index.html).

Business is the control room. From there open Add Transaction or View File. Home also carries a Computer tile.

Add Transaction walks you through it: pick a type (IN, OUT, NEUTRAL or CONTRA), pick the transaction, fill the form, save. Bank charges are stored as their own separate record automatically, so the bank columns stay exact.

View File is the library: every book, register and report is one click away.

Computer is the tools launcher: square tiles only, and today one tile, Convertor, which opens the hub of all 256 tools. Search the hub, tap a square button, and the tool opens on its own page.

The dark sidebar on every page mirrors the family tree: Business folds out to Add Transaction and View File, View File folds out to every book, register and report, and Computer folds out to Convertor and all 256 tools. Nodes with children show a small arrow: v opens a branch, ^ closes it, and the path to the page you are on opens by itself. The address bar always stays clean at the domain root.


ARCHITECTURE

One folder per page. The public folder is the web root, and every page lives in its own folder as N.html, N.css and N.js. Pages are addressed without the extension, for example /petty-cash/7. Two loose exceptions sit directly at the public root: 3.html and 6.html, working copies of pages 3 and 6 that the file guide below explains.

Navigation. menu.js holds the family tree as data: one line per page with label, icon, folder, page number and depth. sidebar.js is the frozen renderer: it draws the collapsible tree from that data, highlights the active page, opens the path to it, cleans the address bar, and slides away behind a burger button at 800px or below. sidebar.js holds no page data and calls no file, so a new page never touches it.

Loading order. Every content page links the shared base css and its own css, then loads menu.js and sidebar.js, menu first, both deferred, and finally its own js.

Styling. Every folder ships its own stylesheet. The shared bases, journals/journal.css and records/records.css, carry the design system. Each page's own css imports its base, adds the page's title accent colour and cleans up printing (sidebar, buttons and filters hidden, white paper background). The look: light slate background, white cards with a 14px radius, teal accents for the Computer family, dark navy sidebar.

Square tile language. The launchers (home, business, view file, computer) and the Convertor hub all use the same square tile grids: equal squares, 8 per row on desktop, 4 on tablets, 3 on phones, aspect ratio 1 to 1.

The engines behind the pages are listed in the file guide below.


HOW CHANGES ARRIVE (THE ONE FILE RULE)

Every working session delivers exactly ONE downloadable bash file, named jamali-taskNN-something.sh. It contains ALL of that session's changes as full file overwrites (the file is written anew with cat, never deleted, never patched in place), plus a verification tail that must end with ALL PASS.

Put the downloaded file inside ~/jamali and run it: bash jamali-taskNN-something.sh

Then ship it: git add -A, git commit, git push. Vercel deploys every push.

The file is idempotent: run it once or ten times, the result is the same.

This guide is maintained entry by entry, never regenerated wholesale: when a page changes, only that page's entry is edited; when a page is added, it gets one new entry under its own page number, and every other entry stands untouched. The entry numbers of the page sections are the page numbers themselves, kept in step with menu.js.


THE REPO, FILE BY FILE

Every page folder carries the same three files: N.html, N.css and N.js. Below, every file and folder has its number and one plain line about what it is for, and one blank line separates each entry. For the bookkeeping pages the entry number is the page number. Folders are explained by what they are for, not by what sits inside them.

The bookkeeping pages, one folder each, entries 1 to 61:

1. home - the landing page after sign in: greeting and two tiles, Business and Computer.

2. business - the control room: opens Add Transaction and View File.

3. add-transaction - the journal entry engine: every transaction is recorded here, once.

4. view-file - the library: a tile launcher for every book, register and report, plus Computer.

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

18. ledger - every account on its own T page: DR and CR sides, balance carried down and brought down. Also home of the shared postings.js engine.

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

55. general-ledger-report - every posting of one account for a chosen period: Date, Folio, Detail, Debit, Credit and a running Balance, with the opening balance brought in from before the start date.

56. ar-report - receivables per customer for a period: invoices, payments, notes and returns proven in one table, with each customer's open items listed under the totals.

57. ap-report - payables per supplier for a period: the same invoice, payment, note and return proof on the supplier side.

58. customer-statement - one customer's running account over a period: opening balance, every movement, closing balance and a small figures card.

59. supplier-statement - one supplier's running account over a period, the mirror of the customer statement.

60. aged-receivables - what customers owe, bucketed Current, 1 to 30, 31 to 60, 61 to 90 and 90 plus, as of a movable date, overdue rows tinted.

61. aged-payables - the same aging buckets for what JAMALI owes its suppliers.

The tools family:

62. computer - the tools launcher: square tiles only, today the Convertor tile with its 256 tools line. The old calculator was retired to git history, so the page is a pure launcher.

63. convertor - the Convertor hub: all 256 tools as same size square buttons, 8 per row, in 14 families, with a live search and a star on the 14 essential tools.

64. convertor not found page - the friendly fallback when a tool address does not exist.

65. the tool folders (pages 65 to 320) - one folder per tool, named after the tool (text-to-pdf, pdf-merge, excel-to-pdf and so on), each holding that tool's own real working page. Page number = tool id + 64. The 5 labels that repeat carry a 2 at the end of their slug.

The shared files and engines:

66. the loose root pages 3.html and 6.html - two leftovers from before the one folder per page convention, sitting directly at the public root instead of inside folders: 3.html is a working copy of Add Transaction and 6.html a working copy of the Double Column Cash Book. Both load their stylesheet and script from the page folders and carry the full sidebar, so the addresses /3 and /6 open the same pages as /add-transaction/3 and /cash-book/6. They stay so nothing that links to them breaks.

67. index.html - the front door: Google sign in, and where signed out visitors land.

68. firebase.js - the one Firebase module every page imports: Google auth, Firestore exports and the requireAuth guard that bounces signed out visitors to the start page.

69. menu.js - the family tree as data: one line per page (label, icon, folder, page number, depth). The ONE file to edit when a page is added, renamed or reordered. Adding a page is one line here, nothing else.

70. sidebar.js - the frozen tree renderer shared by every page: draws the collapsible sidebar from the menu.js data, active highlight, mobile burger, address bar cleanup. Holds no page data and calls no file, so it is never rewritten.

71. journals - the engine folder (journal.js and journal.css) that renders the eight journals, pages 7 to 14.

72. records - the engine folder (records.js and records.css) behind the register pages 21 to 40, and the design base for the report pages too.

73. reports - the engine folders (reports.js and reports2.js) that generate the reports and schedules, pages 41 to 61. reports2 adds the period bar, the account selector and the aging buckets. Views only, no data entry.

74. convertor tools.js - the Convertor registry: the 14 families and all 256 tools with id, label, slug and page number. The hub grid and the sidebar children both read it, so buttons and tree can never drift apart. slugs.txt and pages.txt sit beside it for the folder building loops.

At the root of the repo:

75. firestore.rules - the guard dog. Decides who may read or write each collection: the journal stays append only, registers can be created and settled but never deleted, everything needs a signed in user, and anything not matched is denied.

76. vercel.json - the routing table. Turns clean URLs like /petty-cash/7 into the real petty-cash/7.html, so the address bar stays at the domain root.

77. README.md - this guide.

78. scripts - the folder of home grown operational tooling.

79. scripts/jamali-rate-limited-push.sh - the gentle deployer. Pushes git changes rate limited, so deployments stay steady instead of bursty.

80. systemd/user - the folder of user level systemd units that keep the deploy rhythm running on their own.

81. systemd/user/jamali-rate-limited-push.service - runs the push script as a service.

82. systemd/user/jamali-rate-limited-push.timer - fires that service on a schedule.

83. public - the entire app, the web root Vercel serves. Every page folder and every shared file listed above lives here.


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

The report pages 55 to 61 add no collection of their own: they read transactions, invoices and notes and generate every figure at read time.


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

Changes arrive the way the one file rule above describes: run the downloaded bash file, commit, push.

Rate limited pushes: scripts/jamali-rate-limited-push.sh pushes the repo gently, and the systemd service and timer run it on a schedule, keeping deployment steady instead of bursty.


LOCAL DEVELOPMENT

cd ~/jamali/public

python3 -m http.server 8080 (or npx serve)

then open http://localhost:8080

A plain local server has no clean URL rewriting, so open pages with their .html ending, for example /computer/62.html.

Sign in and data need the real Firebase project: pages without a session bounce back to the start page by design. To develop offline, point public/firebase.js at a mock module that fakes auth and onSnapshot.


ADDING A NEW PAGE

Create the folder inside public and add N.html, N.css and N.js. The html links the shared base css and its own css, loads menu.js and sidebar.js (menu first, both deferred), then its own js.

Add ONE line to menu.js with the label, icon, folder, page number and depth. The sidebar tree, the open and close arrows and the active highlight all come free. Page numbers are never reused: the next free page number is 321.

Add its tile to the View File launcher grid in view-file/4.html, or a square tile on Computer for a tools module.

New collection? Extend firestore.rules, keep delete forbidden, then deploy the rules.

Adding a Convertor tool: append one entry to convertor/tools.js, one line to slugs.txt and pages.txt with the next page number, and build the folder with its three files. Hub, search and sidebar pick it up automatically.

Every folder ships html, css and js. No exceptions.


STATUS AND ROADMAP

Shipped: home 1, business 2, add transaction 3, view file 4, all transactions 5, cash books 6 and 15, journals 7 to 14, creditors, debtors and ledger 16 to 18, registers and documents 21 to 40, reports and schedules 41 to 61, the Computer launcher 62, the Convertor hub 63 and all 256 tools live on their own pages 65 to 320.

Next up: the bills receivable and payable folders (19, 20, provisioned), the remaining reports of the 24 report wave, and further converter catalogue phases whenever you call for them.

Last updated: 24 October 2026.
