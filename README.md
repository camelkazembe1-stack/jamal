# JAMALI — JMS Multisystem Management

JAMALI is a web application for JMS Multisystem Management. It provides Google sign-in and an authenticated home dashboard.

## Official Website

https://jamali-lime.vercel.app/

The application is designed to keep the browser at the root website address while displaying the dashboard after successful authentication.

## Features

- Google sign-in using Firebase Authentication.
- Persistent authentication using Firebase browser-local persistence.
- Authentication-state monitoring.
- Home dashboard with a Business button.
- Responsive dashboard layout.
- Green Business button design.
- Square dashboard buttons, with up to eight columns on desktop screens.
- Sign-out functionality.
- Vercel hosting.

## Technology Stack

- HTML5
- CSS3
- JavaScript ES modules
- Firebase Authentication
- Firebase SDK 11.6.0
- Vercel

## Project Structure

    jamali/
    ├── index.html
    ├── single-url.js
    ├── firebase.js
    ├── README.md
    ├── vercel.json
    ├── public/
    │   ├── index.html
    │   ├── single-url.js
    │   ├── firebase.js
    │   └── home/
    │       ├── 1.html
    │       ├── 1.css
    │       └── 1.js
    ├── scripts/
    │   └── jamali-rate-limited-push.sh
    └── systemd/
        └── user/
            ├── jamali-rate-limited-push.service
            └── jamali-rate-limited-push.timer

## Authentication Flow

1. Open the official website.
2. Select **Continue with Google**.
3. Complete Google sign-in.
4. Firebase verifies the authentication state.
5. After successful authentication, the home dashboard is displayed.
6. Select **Sign out** to end the session.

The intended public website address remains:

https://jamali-lime.vercel.app/

## Dashboard

The home dashboard is located in `public/home/`.

- `1.html` contains the dashboard markup.
- `1.css` contains dashboard styling and responsive layout rules.
- `1.js` handles authentication checks and sign-out behavior.

The Business button is intended to open the Business application. Its destination must correspond to an existing, deployed Business page.

## Firebase Configuration

Firebase configuration is maintained in the Firebase JavaScript modules.

Before deployment, verify:

- The Firebase project configuration is correct.
- Google is enabled as a sign-in provider.
- The deployed website's domain is authorized in Firebase Authentication.
- Authentication imports use the correct file paths.
- The login and dashboard pages use compatible Firebase configuration.

Do not commit private credentials, service-account keys, or other secrets.

## Deployment

The application is hosted on Vercel.

After making changes:

1. Validate the updated files.
2. Commit the changes to Git.
3. Confirm that the intended GitHub repository receives the commit.
4. Verify the Vercel deployment.
5. Test Google sign-in, dashboard access, the Business button, and sign-out.

## Important

This README documents the intended project structure and behavior. Features should be considered operational only after they have been tested in the deployed application.
