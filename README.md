# JAMALI Multisystem Management

## Public URL

All page navigation must remain at the root URL:

`https://jamali-lime.vercel.app/`

The root page displays Google login when the visitor is signed out. After successful login, the home page is loaded into the root page without changing the browser URL.

## Home page files

- `public/home/1.html` — Home page HTML.
- `public/home/1.css` — Home page styling, including the green square Business button.
- `public/home/1.js` — Home page authentication guard and Business button behavior.
- `public/firebase.js` — Firebase initialization and authentication configuration.
- `public/index.html` — Root entry point and Google login.

The home page files remain in the `home/` folder. The public home route `/home/` redirects to the root URL. Authenticated home content should load internally while the public address remains `https://jamali-lime.vercel.app/`.

The Business page has not been created yet.

## Public file inventory

- `public/firebase.js`
- `public/home/1.css`
- `public/home/1.html`
- `public/home/1.js`
- `public/index.html`

## Complete Repository Tree

This tree is generated from the current project directory. It includes hidden files and folders but excludes Git's internal `.git/` directory.

## Complete Repository Tree

This tree is generated from the current project directory. It includes hidden files and folders but excludes Git's internal `.git/` directory.

## Complete Repository Tree

<!-- REPOSITORY_TREE_START -->
```text
.
├── public/
│   ├── home/
│   │   ├── 1.css
│   │   ├── 1.html
│   │   └── 1.js
│   ├── firebase.js
│   └── index.html
├── scripts/
│   └── jamali-rate-limited-push.sh
├── systemd/
│   └── user/
│       ├── jamali-rate-limited-push.service
│       └── jamali-rate-limited-push.timer
├── README.md
└── vercel.json
```
<!-- REPOSITORY_TREE_END -->
