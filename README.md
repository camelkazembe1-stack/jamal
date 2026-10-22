# JAMALI

JAMALI is a web application served from the `public/` directory.

## Live Website

https://jamali-lime.vercel.app/

The application is intended to keep navigation at the root website address.

## Main Pages

- Home: `public/home/1.html`
- Business: `public/Business/2.html`
- Add Transaction: `public/Add Transaction/3.html`
- View File: `public/View File/4.html`

Page names should match the names of their corresponding navigation buttons.

## Button Design Standard

All HTML pages use a shared button design:

- Identical square dimensions: 140 × 140 pixels on normal screens.
- Green background with white, bold, centered text.
- Consistent rounded corners, spacing, and hover styling.
- Applied to form buttons and links used as page-navigation buttons.
- The button dimensions reduce on very narrow screens to fit the display.

The shared style is embedded in each HTML page so it remains available when page content is loaded dynamically.

## Transaction Storage

The transaction pages currently use browser `localStorage`. Data saved in one browser is not automatically synchronized with Firebase or other devices.

## Repository Tree

The tree below reflects the files currently present in the project.

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
