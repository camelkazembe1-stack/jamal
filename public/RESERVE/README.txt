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
requireAuth-guard.txt ................ the inner-page sign-in guard that
                                       bounced visitors without an account
                                       back to the front page.
admin/page-visibility-sidebar.js ..... the intermediate sidebar.js that
                                       still carried the administrator's
                                       page-visibility tooling: the minus
                                       pin that hid any field or button on
                                       a page, the plus pin that attached
                                       predefined options to a field, the
                                       sidebar folder hide control, the
                                       "Hidden (n)" chip and panel, the
                                       page guards ("not available for
                                       your account", "wait for admin
                                       module allowance") and the live
                                       visibility channel.

WHAT WENT AWAY WITH IT (second pass, same day)
----------------------------------------------
The minus and plus pins on the tool pages, the sidebar folder
hide control and the "Hidden (n)" chip were administrator
controls. They are now fully out of the running sidebar.js - not
disabled, removed - together with their styles and every function
that read the visibility config. What stays is the plain folder
(+)/(−) toggle that only opens and closes a menu section; that one
is navigation, not administration.

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
   folder. To also bring the minus/plus page-config tooling back,
   copy admin/page-visibility-sidebar.js over public/sidebar.js (it
   is the newer of the two reserved sidebars - use it INSTEAD of
   login/sidebar-with-login.js).
6. Copy login/victim-registration-322-reserve.js back over
   public/victim-registration/322.js.
7. Copy firestore.rules-with-auth.txt over firestore.rules (and
   restore the FIRESTORE_RULES block inside SERVER/server.js), then
   run:  node SERVER/sync.js   and publish the rules to Firebase.
8. Put the requireAuth() guard back in SERVER/server.js out of
   requireAuth-guard.txt, run  node SERVER/sync.js  and commit.
9. Commit and push - Vercel rebuilds with the login gate again.
