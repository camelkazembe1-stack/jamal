# JAMALI Multisystem Management

## Pages and files

- Login page: `/` (`public/index.html`).
- Home page: `/home/` (`public/home/1.html`).
- Google sign-in redirects to `/home/` after successful authentication.
- The home page redirects unauthenticated visitors to the login page.
- The Business button is green and square. The desktop grid supports up to eight buttons per row.
- No Sign out button is displayed on the home page.
- The Business destination page has not yet been created.

## Public file inventory

- `public/firebase.js` — Firebase initialization and Google Authentication configuration.
- `public/home/1.css` — Home page styling; square green system buttons, up to eight per row on desktop.
- `public/home/1.html` — Authenticated home page.
- `public/home/1.js` — Home page authentication guard and Business button behavior.
- `public/index.html` — Login page with Google sign-in.
