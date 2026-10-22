# JAMALI

JAMALI is a web application served from the `public/` directory.

## Live Website

https://jamali-lime.vercel.app/

## Main Pages

- Home: `public/home/1.html`
- Business: `public/Business/2.html`
- Add Transaction: `public/Add Transaction/3.html`
- View File: `public/View File/4.html`

## Shared Sidebar

`public/sidebar.js` provides shared navigation and consistent square green navigation buttons. Every HTML page in `public/` loads this script except `public/index.html`, which remains the entry/login page.

## Transaction Storage

The transaction pages currently use browser `localStorage`; entries are not automatically synchronized with Firebase or other devices.

## Add Transaction and Firestore

The Add Transaction page is `public/Add Transaction/3.html`.

- Display Transactions reveals the four labelled groups and their transaction buttons together.
- IN: Sales and Discount Received.
- OUT: Purchases and Rent.
- NEUTRAL: Retained Profit.
- CONTRA: Withdraw Cash and Deposit Cash.
- Selecting a transaction opens its form with the applicable fields visible together.
- Transaction records are saved in the Cloud Firestore `transactions` collection with `date`, `transactionName`, `flow`, `method`, `name`, `amount`, and `charges`.
- Bank charges, when greater than zero, are saved as a separate OUT transaction in the same atomic Firestore batch.
- The page uses the existing `/firebase.js` Firebase initialization and does not replace the project configuration.

## Complete Repository Tree

```text
jamali/
├── public/
│   ├── Add Transaction/
│   │   ├── 3.css
│   │   ├── 3.html
│   │   └── 3.js
│   ├── Business/
│   │   ├── 2.css
│   │   ├── 2.html
│   │   └── 2.js
│   ├── home/
│   │   ├── 1.css
│   │   ├── 1.html
│   │   └── 1.js
│   ├── View File/
│   │   ├── 4.css
│   │   ├── 4.html
│   │   └── 4.js
│   ├── firebase.js
│   ├── index.html
│   └── sidebar.js
├── scripts/
│   └── jamali-rate-limited-push.sh
├── systemd/
│   └── user/
│       ├── jamali-rate-limited-push.service
│       └── jamali-rate-limited-push.timer
├── README.md
└── vercel.json
```

### Add Transaction

Transaction buttons appear directly when the page opens; there is no Display Transactions button. Groups:

- IN: Sales, Commission Received.
- OUT: Purchases, Rent.
- NEUTRAL: Retained Profit.
- CONTRA: Withdraw Cash, Deposit Cash.

Selecting a transaction opens its applicable fields and follows that transaction's existing flow.
