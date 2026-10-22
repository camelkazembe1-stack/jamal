# JAMALI

## Contents of `public/`

The `public/` directory contains the files served as static website assets by the deployment configuration.

- **`public/firebase.js`** — Firebase browser configuration. Initializes the JAMALI Firebase application and initializes Google Analytics when supported. Exports the Firebase app and Analytics variable. It does not by itself implement login, database access, or other Firebase services.

## Firebase configuration

`public/firebase.js` initializes the JAMALI Firebase application using the configured Firebase project and attempts to initialize Google Analytics when supported by the browser.

The Firebase configuration is intended for browser use. Secure Firebase data with appropriate Firebase Authentication settings and Firestore or Storage security rules. Do not put private service account credentials in browser files.

## Current limitations

The presence of `firebase.js` does not mean that login, database operations, or other Firebase features have been implemented. Those require additional code.
