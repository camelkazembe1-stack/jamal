# JAMALI — JMS Multisystem Management

JAMALI is a web application featuring Google sign-in, an authenticated home dashboard, and shared navigation.

## Official Website

https://jamali-lime.vercel.app/

The application uses Firebase Authentication and is hosted on Vercel.

## Features

- Google sign-in using Firebase Authentication.
- Persistent authentication and authentication-state monitoring.
- Responsive home dashboard.
- Shared sidebar navigation.
- Home and Business page components.
- Sign-out functionality.
- Vercel hosting.

## Technology Stack

- HTML5, CSS3, and JavaScript ES modules.
- Firebase Authentication and Firebase JavaScript SDK.
- Vercel hosting.

## Project Structure

```text
jamali/
├── index.html
├── README.md
├── vercel.json
├── public/
│   ├── index.html
│   ├── firebase.js
│   ├── single-url.js
│   ├── sidebar.js
│   ├── home/
│   │   ├── 1.html
│   │   ├── 1.css
│   │   └── 1.js
│   └── business/
│       └── 3.html
├── scripts/
│   └── jamali-rate-limited-push.sh
└── systemd/
    └── user/
        ├── jamali-rate-limited-push.service
        └── jamali-rate-limited-push.timer
```

## Authentication

Users sign in through Google using Firebase Authentication. Verify the authentication redirect and session persistence against the deployed application.

## Dashboard and Navigation

The dashboard files are in `public/home/`. The shared sidebar component is `public/sidebar.js`. Verify that each intended page imports the component and that its links work correctly.

## Health System

The current project structure contains `public/business/3.html`; a separate Health page has not been confirmed. Implement the Health page and update the dashboard and sidebar before describing Health functionality as available.

## Deployment

The application is hosted on Vercel and configured through `vercel.json`. After committing changes, allow the configured automatic-push workflow to run and verify the deployed website.

## Documentation Policy

Keep this README synchronized with the actual project files and tested behavior. Planned functionality must not be described as completed functionality.
