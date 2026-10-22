# JAMALI — JMS Multisystem Management

JAMALI is a web application for managing systems through a shared dashboard.

## Website

https://jamali-lime.vercel.app/

The application is hosted on Vercel and uses Firebase Authentication for Google sign-in.

## Technology

- HTML
- CSS
- JavaScript ES modules
- Firebase Authentication
- Vercel hosting

## Project structure

```text
public/
├── index.html
├── firebase.js
├── sidebar.js
├── home/
│   ├── 1.html
│   ├── 1.css
│   └── 1.js
├── business/
│   └── 3.html
└── health/
    ├── 4.html
    ├── 4.css
    └── 4.js
You want to update the JAMALI README so that the **Business system becomes a Health system**.

Run this single terminal block in `~/jamali`. It will inspect the README and Business page, update the README to document Health instead of Business, and commit the change. It will **not rename or delete your existing Business files**.

```bash
cd ~/jamali && {
  set -eu

  echo "========== CURRENT README =========="
  cat README.md

  echo
  echo "========== EXISTING HEALTH FILES =========="
  find public -maxdepth 3 -type f -iname '*health*' -print

  echo
  echo "========== UPDATE README =========="
  cat > README.md <<'EOF'
# JAMALI — JMS Multisystem Management

JAMALI is a web application for managing systems through a shared dashboard.

## Website

https://jamali-lime.vercel.app/

The application is hosted on Vercel and uses Firebase Authentication for Google sign-in.

## Technology

- HTML
- CSS
- JavaScript ES modules
- Firebase Authentication
- Vercel hosting

## Project structure

```text
public/
├── index.html
├── firebase.js
├── sidebar.js
├── home/
│   ├── 1.html
│   ├── 1.css
│   └── 1.js
├── business/
│   └── 3.html
└── health/
    ├── 4.html
    ├── 4.css
    └── 4.js
```

The Health directory above describes the intended Health page structure; create those files before relying on the Health system in production.

## Dashboard

The Home dashboard provides navigation to application systems.

- **Home:** Main dashboard.
- **Health:** Intended health-management system.

The shared sidebar component is located at `public/sidebar.js`.

## Authentication

Firebase Authentication provides Google sign-in. Keep the existing Firebase configuration and authentication flow when modifying the application.

## URL architecture

The official website address is:

https://jamali-lime.vercel.app/

The application is configured to use Vercel's `public` directory for deployment. Preserve the single-URL architecture when changing page navigation.

## Development

The local repository is located at `~/jamali`.

After making changes, validate the affected files and commit the changes. The configured automatic Git workflow handles pushing commits.

## Important implementation status

The README documents the intended Health system. The existing Business page may still be present in `public/business/3.html`; updating this README does not convert that page into a working Health application.
