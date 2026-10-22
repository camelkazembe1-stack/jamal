# JAMALI

JAMALI is a web application served from the `public/` directory.

## Live Website

https://jamali-lime.vercel.app/

The website is intended to use the root address for its page navigation.

## Main Pages

| Page | File |
|---|---|
| Home | `public/home/1.html` |
| Business | `public/Business/2.html` |
| Add Transaction | `public/Add Transaction/3.html` |
| View File | `public/View File/4.html` |

Page names should match their corresponding button names. The Business page provides navigation to Add Transaction and View File. The Add Transaction and View File buttons should use square green styling consistent with the Business button.

## Application Files

- `public/index.html` — website entry point and login interface.
- `public/firebase.js` — Firebase configuration and authentication setup.
- Each numbered page has its own HTML, CSS, and JavaScript files.
- `vercel.json` — Vercel deployment configuration.
- `README.md` — project documentation and repository tree.
- `scripts/` and `systemd/` — project automation files.

## Transaction Storage

The current transaction pages use browser `localStorage` with the key
`jamali_business_transactions`. These entries are stored in the browser and
are not automatically synchronized with Firebase or other devices.

## Repository Structure

The tree below is generated from the files currently present in this project.

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
│   └── index.html
├── scripts
│   └── jamali-rate-limited-push.sh
├── systemd
│   └── user
│       ├── jamali-rate-limited-push.service
│       └── jamali-rate-limited-push.timer
├── README.md
└── vercel.json
```
