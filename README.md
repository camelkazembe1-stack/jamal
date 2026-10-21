# JAMALI — JMS Multsystem Management

## Project overview
JAMALI is a web application with a Google sign-in entry page and separate
application pages. Firebase Authentication handles sign-in and session checks.
Vercel serves the site and rewrites clean application URLs to numbered HTML files.

## Main files
- `index.html`: root login entry page.
- `public/index.html`: public login page copy.
- `public/firebase.js`: shared Firebase application and authentication setup.
- `public/<page-name>/<number>.html`: application page.
- `public/<page-name>/<number>.css`: matching page stylesheet, when needed.
- `public/<page-name>/<number>.js`: matching page script, when needed.
- `vercel.json`: clean URL rewrites.
- `README.md`: project documentation.

## Page numbering
Every application page has a globally unique, increasing number.
The HTML, CSS, and JavaScript files belonging to a page use the same number.
The login `index.html` is the exception and remains unnumbered.
When adding a page, use the next unused global number.

## Clean URLs
Each page is intended to use a URL ending in `/app/`, for example:
- `/home/app/`
- `/settings/app/`

Vercel rewrites those URLs internally to the corresponding numbered HTML file.
The browser address bar should show the clean route rather than the HTML filename.

## Authentication
The login page uses Firebase Google authentication.
After successful sign-in it navigates to the configured home route.
Application pages must check the Firebase authentication session before showing
protected content. Configure the deployed hostname in Firebase Authentication's
authorized domains.

## Deployment
The repository is configured for Vercel static hosting.
`vercel.json` maps clean routes to their numbered HTML files.
The repository's automatic Git synchronization service is responsible for
publishing local commits; do not manually push from this setup.

## Adding pages
1. Create a page directory under `public/`.
2. Assign the next unused global number.
3. Name the files `<number>.html`, `<number>.css`, and `<number>.js`.
4. Add a rewrite for `/<page-name>/app/` in `vercel.json`.
5. Link to the clean route, not the numbered HTML filename.
6. Update this README when the architecture changes.
