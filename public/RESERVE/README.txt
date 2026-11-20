==========================================================
JAMALI - RESERVE FOLDER (deactivated login / admin code)
==========================================================

Everything about the Google user login, the logout, the account
administration and the administrator page-config (hidden fields)
was deactivated on 2026-11-20. Nothing was thrown away: it all
lives here, ready to be brought back later.

WHAT IS IN HERE
---------------
login/index-login-gate.html .......... the old front page (the login
                                       gate with Google sign-in, account
                                       login, create-account, recovery).
login/sidebar-with-login.js .......... the old sidebar.js with the
                                       session guard, the account desk,
                                       both logout buttons and the Admin
                                       button.
login/menu-with-admin.js ............. the old menu.js including the
                                       "Account Administration" entry.
login/home-1-with-account.js ......... the old home grid that followed
                                       account grants.
login/home-1-with-guard.html ......... the old home page that hid
                                       everything without a session.
login/victim-registration-322-reserve.js  the old page-config loader.
admin/system-admin/380.html|js|css ... the whole Account Administration
                                       panel (approvals, grants, roles).
firestore.rules-with-auth.txt ........ the old security rules that
                                       required a Google sign-in for
                                       every read and write.

HOW IT IS DEACTIVATED NOW
-------------------------
- index.html IS the home page. Opening the site goes straight to the
  app grid. No door page, no sign-in.
- The sidebar has no logout button, no account desk, no Admin button.
- Every page and every menu item is open for every visitor.
- The business-data Firestore rules allow anonymous use so saving and
  loading still work without an account. The system* collections
  (accounts, admins, approvals) stay locked as before.

HOW TO BRING IT BACK LATER
--------------------------
1. Copy login/index-login-gate.html back over public/index.html.
2. Copy login/sidebar-with-login.js back over public/sidebar.js.
3. Copy login/menu-with-admin.js back over public/menu.js.
4. Copy login/home-1-with-account.js back over public/home/1.js and
   login/home-1-with-guard.html back over public/home/1.html, then
   recreate public/index.html as the login gate.
5. Copy admin/system-admin/* back into a new public/system-admin/
   folder.
6. Copy login/victim-registration-322-reserve.js back over
   public/victim-registration/322.js.
7. Copy firestore.rules-with-auth.txt over firestore.rules (and
   restore the FIRESTORE_RULES block inside SERVER/server.js), then
   run:  node SERVER/sync.js   and publish the rules to Firebase.
8. Commit and push - Vercel rebuilds with the login gate again.
