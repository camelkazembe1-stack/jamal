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

## Complete Repository Tree

```text
.
├── public
│   ├── Add Transaction
│   │   ├── 3.css
│   │   ├── 3.html
│   │   └── 3.js
│   ├── Business
│   │   ├── 2.css
│   │   ├── 2.html
│   │   └── 2.js
│   ├── home
│   │   ├── 1.css
│   │   ├── 1.html
│   │   └── 1.js
│   ├── View File
│   │   ├── 4.css
│   │   ├── 4.html
│   │   └── 4.js
│   ├── firebase.js
│   ├── index.html
│   └── sidebar.js
├── scripts
│   └── jamali-rate-limited-push.sh
├── systemd
│   └── user
│       ├── jamali-rate-limited-push.service
│       └── jamali-rate-limited-push.timer
├── README.md
└── vercel.json
```
