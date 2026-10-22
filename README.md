# JAMALI

## Contents of `public/`

This directory contains the static website files served by the deployment.

- **`public/firebase.js`** — Firebase browser configuration. Initializes the JAMALI Firebase application and attempts to initialize Google Analytics when supported. Exports the Firebase app and Analytics variable. It does not implement authentication or database operations.
- **`public/index.html`** — JAMALI homepage. Displays the JAMALI brand, a welcome heading, a short introduction, the current year, and a simple status area. Loads firebase.js as an ES module.

## Firebase

`public/firebase.js` initializes the Firebase application and attempts to initialize Analytics when supported by the browser.

The homepage imports this module. A successful module import does not mean that user authentication, database access, or other Firebase features are implemented.

## Current homepage

`public/index.html` currently provides a simple welcome page. It does not contain login controls or links to other sections.
