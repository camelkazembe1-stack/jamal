# JAMALI — JMS Multisystem Management

## Project Overview

JAMALI is a web application featuring Google sign-in and a home dashboard. It uses Firebase Authentication, HTML, CSS, JavaScript, and Vercel hosting.

The project keeps page markup, styling, and behavior in separate files.

## Official Website Address

**https://jamali-lime.vercel.app/**

The browser's visible top-level URL must remain exactly at the website root during application navigation. Internal application resources may load separately, but the visible address must not change to page-specific paths.

## Project Structure

Important files include:

- `index.html` — root website entry page.
- `public/index.html` — public entry page, if used by deployment.
- `public/firebase.js` — Firebase application and authentication setup.
- `public/home/1.html` — home dashboard markup.
- `public/home/1.css` — home dashboard styling.
- `public/home/1.js` — home dashboard behavior.
- `vercel.json` — Vercel routing and deployment configuration.
- `README.md` — project documentation.

Inspect the repository before creating or renaming files. Files at the repository root and files under `public/` may be served differently depending on the Vercel configuration.

## Page File Naming

Application pages use numbered filenames within their respective directories. Keep each page's HTML, CSS, and JavaScript separate, using the same number for related files.

Example:

    public/
    ├── firebase.js
    ├── index.html
    └── home/
        ├── 1.html
        ├── 1.css
        └── 1.js

Keep the login entry page unnumbered as `index.html`. Inspect existing files before assigning numbers or creating new pages.

## Home Dashboard

The home dashboard uses:

- `public/home/1.html`
- `public/home/1.css`
- `public/home/1.js`

Dashboard design requirements:

- Square buttons.
- Eight buttons per row on desktop when space permits.
- Responsive layouts for smaller screens.
- A green Business button.
- Readable labels and accessible controls.

Make visual changes in CSS whenever possible. Avoid modifying working JavaScript for styling-only tasks.

## Firebase Authentication

Firebase Authentication handles Google sign-in and session management. The shared configuration is maintained in `public/firebase.js`.

Preserve the existing Firebase project configuration and working sign-in flow. Protect pages that require authentication, remove temporary diagnostic messages from production content, and ensure the deployed hostname is authorized in Firebase Authentication settings.

## Navigation and Routing

The visible browser address must remain:

`https://jamali-lime.vercel.app/`

Inspect `index.html`, page-loading scripts, and `vercel.json` before changing navigation. Ensure resources load correctly and navigation preserves the required top-level address.

Do not introduce obsolete page-specific routes. Preserve the required single-address navigation design.

## Deployment and Git Synchronization

JAMALI is hosted on Vercel. The repository uses an automatic Git synchronization workflow.

For changes:

1. Inspect the existing implementation.
2. Edit the necessary files.
3. Validate the changes.
4. Run `git diff --check`.
5. Review and commit the intended changes.
6. Allow the configured automatic synchronization service to publish local commits.
7. Verify the live website after deployment.

A local commit does not guarantee that deployment has completed.

## Development Guidelines

- Preserve the established project structure.
- Keep HTML, CSS, and JavaScript separate.
- Preserve working Firebase authentication.
- Keep the visible website address at `https://jamali-lime.vercel.app/`.
- Avoid obsolete routing instructions.
- Remove temporary diagnostic text from production pages.
- Maintain responsive desktop and mobile layouts.
- Validate changes before committing.
- Update this README whenever the project changes.

## Current Development Focus

Maintain the single-address website experience, preserve Google sign-in, improve the home dashboard and green Business button, and keep documentation aligned with the actual implementation.
