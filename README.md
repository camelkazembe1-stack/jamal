# JAMALI — MultiSystem Management

Static web app deployed on **Vercel** with **Google login via Firebase**.
Local changes are pushed to GitHub automatically by a systemd user timer
(rate-limited). Vercel deploys every push to `main`.

## Repository tree (final)


## Files

### Repo level

| File | Purpose |
|---|---|
| `vercel.json` | Vercel config: serves `public/`, clean URLs, trailing slashes, redirects `/home` → `/` |
| `systemd/user/jamali-rate-limited-push.timer` | Triggers the sync service every 10 seconds |
| `systemd/user/jamali-rate-limited-push.service` | Oneshot service that runs the push script |
| `scripts/jamali-rate-limited-push.sh` | Auto-commits local changes and pushes to GitHub `main` (max once / 60s), with backups and history-safety checks |

### public/ — the website

| File | Purpose |
|---|---|
| `public/index.html` | **Login page.** "Welcome to Jamal MultiSystem Management — please login to save and secure your data". Google button → popup login → success redirects to `/home/1`. Already-logged-in visitors skip straight to home. |
| `public/firebase.js` | **Shared Firebase module** (v10.12.2, gstatic CDN). Exports `auth`, `provider`, `signInWithPopup`, `signOut`, `onAuthStateChanged`, and `requireAuth()` — the guard every inner page calls; no user → redirect to `/`. |
| `public/sidebar.js` | **Shared sidebar**, auto-injected (HTML + CSS) into every page that includes it — all pages except `index.html`. Shows only Home for now. Link targets are controlled by the `PAGES` array at the top of the file. |
| `public/home/1.html / 1.css / 1.js` | **Page 1 — Home.** Launcher grid of square buttons, 8 per row (4 on tablets, 3 on phones). Business tile → `/business/2`. Guarded by `requireAuth()`. |
| `public/business/2.html / 2.css / 2.js` | **Page 2 — Business.** PURE launcher: square-tile grid, 8 per row. Buttons redirect to real pages (Transaction → `/transaction/3`, View File → `/view-file/4`). Nothing loads inside Business itself. |
| `public/transaction/3.html / 3.css / 3.js` | **Page 3 — Transaction.** Placeholder, same auth guard + sidebar. |
| `public/view-file/4.html / 4.css / 4.js` | **Page 4 — View File.** Placeholder, same auth guard + sidebar. |

## Numbering convention (IMPORTANT)

- Every page except `index.html` lives in its own folder with ONE stable number:
  `page/n.html` + `page/n.css` + `page/n.js`
- `n` is a **global page counter**: home = 1, business = 2, transaction = 3, view-file = 4, the next new page = 5, and so on (`n++`)
- **Folder name = page name exactly** (the folder is the page's UID): `transaction/` = Transaction, `view-file/` = View File
- Old file versions live in **Git history** (the auto-push commits everything), so files stay stable and get revised in place.

## Design rules

- All buttons in the app are **square tiles** displayed in grids of **8 per row**.

## Auth flow

`/` (index) → Google popup login → success → `/home/1` → every inner page
calls `requireAuth()` → not-logged-in users are bounced back to `/`.

## Adding a new system button (example: Dashboard = page 3)

1. Create the page: `public/dashboard/3.html` + `3.css` + `3.js`
   (copy the pattern from `public/business/`)
2. Add a tile inside `#app-grid` in `public/home/1.html`:
   `<a class="tile" href="/dashboard/3"><span class="tile-icon">📊</span><span class="tile-label">Dashboard</span></a>`
3. Optional: add it to the sidebar `PAGES` array in `public/sidebar.js`

## Firebase console requirements (one-time)

1. Authentication → Sign-in method → enable **Google**
2. Authentication → Settings → Authorized domains → add the Vercel domain

## Deployment flow

1. Files change locally → timer detects pending changes (every 10s)
2. Script commits + pushes to GitHub `main` (rate-limited, once / 60s)
3. Vercel builds and deploys automatically
