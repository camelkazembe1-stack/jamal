# JAMALI

## Public directory

The `public/` directory contains the static files served by the deployment. Its current contents are listed below.

- **`public/firebase.js`** — Firebase configuration and initialization. Exports the Firebase app, Authentication instance, GoogleAuthProvider, and Analytics variable. Uses the JAMALI Firebase project configuration.
- **`public/home.html`** — Authenticated JAMALI home page. Checks Firebase Authentication, redirects signed-out users to index.html, displays the signed-in account email, and provides Business and Sign out buttons. The Business page itself has not yet been implemented.
- **`public/index.html`** — JAMALI login page. Displays the JAMALI Multisystem Management welcome message and a Continue with Google button. Uses Firebase Authentication popup sign-in and redirects signed-in users to home.html. Google sign-in must be enabled in Firebase Console.

## Google sign-in setup

1. Open Firebase Console and select project `jamal-542b5`.
2. Open Authentication and enable the Google sign-in provider.
3. In Authentication settings, add the deployed website domain to the authorized domains list.
4. Serve the website through HTTPS or localhost. ES modules and Firebase Authentication may not work when opening HTML files directly with a `file://` URL.

## Current limitations

Google sign-in depends on Firebase Console provider and domain settings. The Business button currently displays a message because a Business page has not been implemented. Authentication alone does not secure application data; configure suitable Firebase security rules before storing private user data.
