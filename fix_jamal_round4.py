#!/usr/bin/env python3
# fix_jamal_round4.py - JAMAL HMS: the account-recovery consolidation round
#
# [1] Merge the whole recovery chain INTO the front door (public/index.html -
#     the same page that already carries the create-account and login panels)
#     as a fourth panel: Account Recovery with three tabs (Forgot Token /
#     Forgot Password / Forgot Phone). The "Forgot Token?" link now opens the
#     panel instead of navigating away; old ?mode= links open the right tab.
# [2] DELETE the recovery folders from public/: account-recovery,
#     forgot-token, forgot-password, forgot-phone-number (and stale empty
#     leftovers), so the recovery chain runs on index.html's single
#     html + style + script, exactly like login and create account.
# [3] vercel.json: the recovery rewrites become redirects to the front door
#     with the right tab pre-selected (?mode=token|password|phone).
# [4] public/sidebar.js and SERVER/linker.js: ALWAYS_OPEN drops
#     "account-recovery" (the folder no longer exists).
# [5] README.md: resolve the merge conflict, describe the new home of the
#     recovery chain, fix the ALWAYS_OPEN description.
# [6] Resolve the merge conflict inside public/stock-register/397.css
#     (both sides are kept - they carry different rules).
# [7] public/health: create the missing 321.js and link it -> 1+1+1.
# [8] Final audit: every folder exactly 1 html + 1 css + 1 js, and no
#     reference to the removed folders left anywhere in the served tree.
#
# Idempotent: safe to run again and again. Stdlib only.

import json
import os
import re
import shutil
import sys


def find_root():
    cwd = os.getcwd()
    cands = [cwd]
    try:
        for d in sorted(os.listdir(cwd)):
            p = os.path.join(cwd, d)
            if os.path.isdir(p):
                cands.append(p)
    except OSError:
        pass
    for c in cands:
        if os.path.isdir(os.path.join(c, "public")):
            return c
    return None


ROOT = find_root()
if ROOT is None:
    print("ERROR: cd into your jamal repo root first (the folder that")
    print("contains public/), then run: python3 fix_jamal_round4.py")
    sys.exit(1)

PUB = os.path.join(ROOT, "public")
IDX = os.path.join(PUB, "index.html")

CONFLICT_RE = re.compile(
    r"^<<<<<<< [^\n]*\n(.*?)^=======\n(.*?)^>>>>>>> [^\n]*\n", re.S | re.M)

print("=" * 64)
print("JAMAL HMS - round 4: the account-recovery consolidation")
print("repo root : %s" % ROOT)
print("=" * 64)
print()


def read_file(p):
    with open(p, "r", encoding="utf-8", errors="replace") as f:
        return f.read()


def write_file(p, s):
    with open(p, "w", encoding="utf-8", newline="\n") as f:
        f.write(s)


# ---------------------------------------------------------------------------
# STEP 1+2: the recovery chain moves into index.html, its folders are removed
# ---------------------------------------------------------------------------

RECOVERY_CSS = """  /* ---- account recovery panel (merged from the old recovery folders) ---- */
  .panel-title { font-size: 19px; text-align: center; margin-bottom: 14px; }
  .panel-title span { color: #38bdf8; }
  .tabs { display: flex; gap: 6px; margin-bottom: 18px; }
  .tabs button { flex: 1; background: #0b1220; color: #94a3b8; border: 1px solid #334155;
                 border-radius: 10px; padding: 9px 4px; font-size: 12.5px; font-weight: 700; cursor: pointer; }
  .tabs button.on { background: #0c2a45; color: #38bdf8; border-color: #38bdf8; }
  section.mode { display: none; }
  section.mode.on { display: block; }
  .next { margin-top: 16px; text-align: center; font-size: 13px; color: #94a3b8; }
  .next a { color: #38bdf8; cursor: pointer; text-decoration: none; font-weight: 700; }
  .token-box { margin-top: 14px; display: none; text-align: center; background: #0b1220;
               border: 1px dashed #38bdf8; border-radius: 12px; padding: 16px; }
  .token-box .tk { font-size: 34px; font-weight: 900; letter-spacing: 12px; color: #38bdf8; margin-top: 6px; }
  .token-box p { font-size: 12.5px; color: #94a3b8; }
  .message { margin-top: 18px; background: #0b1220; border: 1px solid #334155; border-radius: 12px;
             padding: 18px 16px; font-size: 14.5px; color: #e2e8f0; display: none; text-align: center; }
  a.panel-back { display: block; margin-top: 18px; text-align: center; font-size: 13px;
                 color: #64748b; text-decoration: none; cursor: pointer; }
  a.panel-back:hover { color: #38bdf8; }
</style>"""

RECOVERY_PANEL = '''    <section id="panel-recovery" class="hidden">
      <h2 class="panel-title">Account <span>Recovery</span></h2>
      <p class="sub">One place for the whole recovery chain: a lost token, a lost password or a changed phone number.</p>

      <div class="tabs">
        <button type="button" id="tab-token" class="on">Forgot Token</button>
        <button type="button" id="tab-password">Forgot Password</button>
        <button type="button" id="tab-phone">Forgot Phone</button>
      </div>

      <section class="mode on" id="mode-token">
        <p class="sub">Prove it is you with your password, and a new four-digit token will be issued.</p>
        <div id="ft-form">
          <label for="ft-username">Username</label>
          <input id="ft-username" type="text" autocomplete="username" placeholder="Your username">
          <label for="ft-password">Password</label>
          <input id="ft-password" type="password" autocomplete="current-password" placeholder="Your password">
          <button class="wide" id="ft-btn" type="button">Submit</button>
          <p class="status" id="status-token"></p>
          <p class="next">Still stuck? <a id="go-forgot-password">Forgot Password?</a></p>
        </div>
        <div class="token-box" id="token-box">
          <p>Your new four-digit token &mdash; write it down now, it is shown only once:</p>
          <div class="tk" id="token-value">&bull;&bull;&bull;&bull;</div>
        </div>
      </section>

      <section class="mode" id="mode-password">
        <p class="sub">Prove it is you with your phone number, then set a new password.</p>
        <section id="step-verify">
          <label for="fp-username">Username</label>
          <input id="fp-username" type="text" autocomplete="username" placeholder="Your username">
          <label for="fp-phone">Phone number</label>
          <input id="fp-phone" type="tel" placeholder="The phone number on the account">
          <button class="wide" id="fp-btn" type="button">Submit</button>
        </section>
        <section id="step-new" class="hidden">
          <label for="fp-new1">New password</label>
          <input id="fp-new1" type="password" autocomplete="new-password" placeholder="At least 6 characters">
          <label for="fp-new2">Repeat the new password</label>
          <input id="fp-new2" type="password" autocomplete="new-password" placeholder="Same again">
          <button class="wide" id="fp-save" type="button">Save New Password</button>
        </section>
        <p class="status" id="status-password"></p>
        <p class="next" id="fp-next">Cannot remember the phone number? <a id="go-forgot-phone">Forgot Phone Number?</a></p>
      </section>

      <section class="mode" id="mode-phone">
        <p class="sub">The last step of the recovery chain.</p>
        <div id="fph-form">
          <label for="fph-username">Username</label>
          <input id="fph-username" type="text" autocomplete="username" placeholder="Your username">
          <button class="wide" id="fph-btn" type="button">Submit</button>
        </div>
        <div class="message" id="message">
          Please go to the system administrator's office.
        </div>
      </section>

      <a class="panel-back" id="recovery-back">&larr; Back to Login</a>
    </section>

    <p class="status" id="status"></p>'''

RECOVERY_ENGINE = '''
    // ---------- account recovery (merged from the old recovery folders) ----------
    const REC_MODES = ["token", "password", "phone"];
    function recShow(mode) {
      REC_MODES.forEach((m) => {
        $("mode-" + m).classList.toggle("on", m === mode);
        $("tab-" + m).classList.toggle("on", m === mode);
      });
    }
    function sayR(el, m, ok) { el.textContent = m || ""; el.className = "status" + (ok ? " ok" : ""); }

    const carriedUser = new URLSearchParams(location.search).get("u");
    if (carriedUser) {
      $("ft-username").value = carriedUser;
      $("fp-username").value = carriedUser;
      $("fph-username").value = carriedUser;
    }
    const startMode = new URLSearchParams(location.search).get("mode");
    recShow(REC_MODES.indexOf(startMode) !== -1 ? startMode : "token");

    $("tab-token").addEventListener("click", () => recShow("token"));
    $("tab-password").addEventListener("click", () => recShow("password"));
    $("tab-phone").addEventListener("click", () => recShow("phone"));

    $("go-forgot-password").addEventListener("click", () => {
      const u = $("ft-username").value.trim();
      if (u) $("fp-username").value = u;
      recShow("password");
    });

    $("go-forgot-phone").addEventListener("click", () => {
      const u = $("fp-username").value.trim();
      if (u) $("fph-username").value = u;
      recShow("phone");
    });

    $("recovery-back").addEventListener("click", () => showPanel("login"));

    // the token desk: the password proves it is you, a new token comes out
    $("ft-btn").addEventListener("click", async () => {
      const btn = $("ft-btn");
      const rstatus = $("status-token");
      const username = $("ft-username").value.trim();
      const password = $("ft-password").value;
      if (!username) { sayR(rstatus, "Enter your username."); return; }
      if (!password) { sayR(rstatus, "Enter your password."); return; }
      btn.disabled = true; sayR(rstatus, "");

      try {
        if (!auth.currentUser) await signInWithPopup(auth, provider);

        const id = username.toLowerCase();
        const accSnap = await getDoc(doc(db, "systemAccounts", id));
        if (!accSnap.exists()) {
          const gone = await getDoc(doc(db, "systemDeleted", id));
          if (gone.exists() && gone.data().was === "approved") {
            sayR(rstatus, "This account was disapproved by the administrator and deleted from the system. Please create a new account.");
          } else if (gone.exists()) {
            sayR(rstatus, "This registration was deleted by the administrator before approval. Please create a new account.");
          } else {
            sayR(rstatus, "No account with this username.");
          }
          btn.disabled = false; return;
        }

        const credRef = doc(db, "systemCredentials", id);
        const credSnap = await getDoc(credRef);
        if (!credSnap.exists()) { sayR(rstatus, "Account data is incomplete. Ask the administrator."); btn.disabled = false; return; }

        const passHash = await sha(password);
        if (credSnap.data().passHash !== passHash) { sayR(rstatus, "Wrong password."); btn.disabled = false; return; }

        const newToken = String(Math.floor(1000 + Math.random() * 9000));
        const newHash = await sha(newToken);
        await updateDoc(credRef, { tokenHash: newHash });

        $("token-value").textContent = newToken;
        $("ft-form").style.display = "none";
        $("token-box").style.display = "block";
        sayR(rstatus, "");
        btn.disabled = false;
      } catch (err) {
        sayR(rstatus, "Could not reset the token: " + friendly(err));
        btn.disabled = false;
      }
    });

    // the password desk: the phone number proves it is you, then a new password
    let verifiedId = null;

    $("fp-btn").addEventListener("click", async () => {
      const btn = $("fp-btn");
      const rstatus = $("status-password");
      const username = $("fp-username").value.trim();
      const phone = $("fp-phone").value.trim();
      if (!username) { sayR(rstatus, "Enter your username."); return; }
      if (!phone) { sayR(rstatus, "Enter your phone number."); return; }
      btn.disabled = true; sayR(rstatus, "");

      try {
        if (!auth.currentUser) await signInWithPopup(auth, provider);

        const id = username.toLowerCase();
        const accSnap = await getDoc(doc(db, "systemAccounts", id));
        if (!accSnap.exists()) {
          const gone = await getDoc(doc(db, "systemDeleted", id));
          if (gone.exists() && gone.data().was === "approved") {
            sayR(rstatus, "This account was disapproved by the administrator and deleted from the system. Please create a new account.");
          } else if (gone.exists()) {
            sayR(rstatus, "This registration was deleted by the administrator before approval. Please create a new account.");
          } else {
            sayR(rstatus, "No account with this username.");
          }
          btn.disabled = false; return;
        }

        const credSnap = await getDoc(doc(db, "systemCredentials", id));
        if (!credSnap.exists()) { sayR(rstatus, "Account data is incomplete. Ask the administrator."); btn.disabled = false; return; }
        if (credSnap.data().phone !== phone) { sayR(rstatus, "That phone number does not match the account."); btn.disabled = false; return; }

        verifiedId = id;
        $("step-verify").classList.add("hidden");
        $("step-new").classList.remove("hidden");
        sayR(rstatus, "Phone verified. Now choose a new password.", true);
        btn.disabled = false;
      } catch (err) {
        sayR(rstatus, "Could not verify: " + friendly(err));
        btn.disabled = false;
      }
    });

    $("fp-save").addEventListener("click", async () => {
      const btn = $("fp-save");
      const rstatus = $("status-password");
      const p1 = $("fp-new1").value, p2 = $("fp-new2").value;
      if (!verifiedId) { sayR(rstatus, "Verify your phone number first."); return; }
      if (p1.length < 6) { sayR(rstatus, "Password must be at least 6 characters."); return; }
      if (p1 !== p2) { sayR(rstatus, "The two passwords do not match."); return; }
      btn.disabled = true; sayR(rstatus, "");

      try {
        const passHash = await sha(p1);
        await updateDoc(doc(db, "systemCredentials", verifiedId), { passHash: passHash });

        $("fp-next").style.display = "none";
        sayR(rstatus, "Password saved. Go back and login with your username and token.", true);
        $("step-new").classList.add("hidden");
        btn.disabled = false;
      } catch (err) {
        sayR(rstatus, "Could not save the password: " + friendly(err));
        btn.disabled = false;
      }
    });

    // the phone desk: the chain ends at the administrator's office
    $("fph-btn").addEventListener("click", () => {
      $("fph-form").style.display = "none";
      $("message").style.display = "block";
    });
'''

print("[STEP 1] index.html : the recovery chain joins the login / create account page")
html = read_file(IDX)
if 'id="panel-recovery"' in html:
    print("    OK - the recovery panel is already inside index.html")
else:
    # 1a. css
    if html.count("</style>") != 1:
        print("    WARN - expected exactly one </style> in index.html, css not injected")
    else:
        html = html.replace("</style>", RECOVERY_CSS, 1)
        print("    added the recovery styles into the <style> block")

    # 1b. the panel, right before the shared status line
    anchor_panel = '    <p class="status" id="status"></p>'
    if html.count(anchor_panel) != 1:
        print("    WARN - status anchor not found, panel html not injected")
    else:
        html = html.replace(anchor_panel, RECOVERY_PANEL, 1)
        print("    added the #panel-recovery section (3 tabs) to the card")

    # 1c. showPanel learns the recovery panel + a matching sub line
    old_show = """    function showPanel(which) {
      $("panel-gate").classList.toggle("hidden", which !== "gate");
      $("panel-login").classList.toggle("hidden", which !== "login");
      $("panel-create").classList.toggle("hidden", which !== "create");
      $("google-logout").hidden = (which === "gate");
      say("");
    }"""
    new_show = """    function showPanel(which) {
      $("panel-gate").classList.toggle("hidden", which !== "gate");
      $("panel-login").classList.toggle("hidden", which !== "login");
      $("panel-create").classList.toggle("hidden", which !== "create");
      $("panel-recovery").classList.toggle("hidden", which !== "recovery");
      $("google-logout").hidden = (which === "gate");
      $("sub-line").textContent = which === "recovery"
        ? "Recover your token, your password or your phone number."
        : "Login to your account, or create one.";
      say("");
    }"""
    if old_show in html:
        html = html.replace(old_show, new_show, 1)
        print('    showPanel() now handles "recovery" and updates the sub line')
    else:
        print("    WARN - showPanel() body not found; panel switching not extended")

    # 1d. the Forgot Token? link opens the panel instead of navigating away
    old_go = '''    $("go-forgot-token").addEventListener("click", () => {
      const u = $("li-username").value.trim();
      location.href = "/account-recovery/355" + (u ? "?u=" + encodeURIComponent(u) : "");
    });'''
    new_go = '''    $("go-forgot-token").addEventListener("click", () => {
      const u = $("li-username").value.trim();
      if (u) {
        $("ft-username").value = u;
        $("fp-username").value = u;
        $("fph-username").value = u;
      }
      const want = new URLSearchParams(location.search).get("mode");
      recShow(REC_MODES.indexOf(want) !== -1 ? want : "token");
      showPanel("recovery");
    });'''
    if old_go in html:
        html = html.replace(old_go, new_go, 1)
        print('    the "Forgot Token?" link now opens the recovery panel')
    else:
        print("    WARN - the old go-forgot-token handler was not found")

    # 1e. the recovery engine, right after the token-field listeners
    anchor_engine = '    $("li-token").addEventListener("input", showRecovery);\n'
    if html.count(anchor_engine) != 1:
        print("    WARN - engine anchor not found, recovery logic not injected")
    else:
        html = html.replace(anchor_engine, anchor_engine + RECOVERY_ENGINE, 1)
        print("    added the recovery engine (3 desks) to the module script")

    # 1f. old deep links like /?mode=password open the recovery panel
    old_auth = """        sessionStorage.removeItem(SESSION_KEY);
        showPanel("gate");
        handleDeniedAndNeed();
        return;"""
    new_auth = """        sessionStorage.removeItem(SESSION_KEY);
        showPanel("gate");
        handleDeniedAndNeed();
        const deepMode = new URLSearchParams(location.search).get("mode");
        if (REC_MODES.indexOf(deepMode) !== -1) showPanel("recovery");
        return;"""
    if old_auth in html:
        html = html.replace(old_auth, new_auth, 1)
        print("    old ?mode= links now open the recovery panel with the right tab")
    else:
        print("    WARN - onAuthStateChanged anchor not found; deep links stay on the gate")

    write_file(IDX, html)
print()

print("[STEP 2] removing the recovery folders from public/")
for d in ("account-recovery", "forgot-token", "forgot-password",
          "forgot-phone-number", "login", "create-account",
          "355", "356", "357"):
    p = os.path.join(PUB, d)
    if os.path.isdir(p):
        if os.listdir(p):
            shutil.rmtree(p)
            print("    deleted public/%s (with its files)" % d)
        else:
            os.rmdir(p)
            print("    deleted public/%s (empty leftover)" % d)
print()

# ---------------------------------------------------------------------------
# STEP 3: vercel.json - recovery rewrites become front-door redirects
# ---------------------------------------------------------------------------

print("[STEP 3] vercel.json : old recovery addresses redirect to the front door")
vpath = os.path.join(ROOT, "vercel.json")
if not os.path.isfile(vpath):
    print("    SKIP - vercel.json not found")
else:
    with open(vpath, "r", encoding="utf-8") as f:
        vj = json.load(f)

    def hits_removed(s, d):
        s, d = str(s), str(d)
        return ("account-recovery" in s or "account-recovery" in d
                or "/forgot-token" in s or "/forgot-token" in d
                or "/forgot-password" in s or "/forgot-password" in d
                or "/forgot-phone" in s or "/forgot-phone" in d)

    if "rewrites" in vj:
        before = len(vj["rewrites"])
        vj["rewrites"] = [e for e in vj["rewrites"] if not hits_removed(
            e.get("source", ""), e.get("destination", ""))]
        dropped = before - len(vj["rewrites"])
        if dropped:
            print("    removed %d recovery rewrite(s)" % dropped)
        else:
            print("    rewrites already clean")

    # old redirects whose destination pointed into the removed folders
    rb = len(vj.get("redirects", []))
    vj["redirects"] = [e for e in vj.get("redirects", [])
                       if not hits_removed("", e.get("destination", ""))]
    rdropped = rb - len(vj["redirects"])
    if rdropped:
        print("    removed %d old redirect(s) that pointed into the removed folders" % rdropped)
    else:
        print("    redirects already clean of the removed folders")

    groups = [
        (["/account-recovery", "/account-recovery/390",
          "/forgot-token", "/forgot-token/355", "/forgot-token/390"], "/?mode=token"),
        (["/account-recovery/391",
          "/forgot-password", "/forgot-password/356", "/forgot-password/391"], "/?mode=password"),
        (["/account-recovery/392",
          "/forgot-phone-number", "/forgot-phone-number/357", "/forgot-phone-number/392"], "/?mode=phone"),
    ]
    vj.setdefault("redirects", [])
    known = {(str(r.get("source")), str(r.get("destination")))
             for r in vj["redirects"]}
    added = 0
    for sources, dest in groups:
        for s in sources:
            for source in (s, s + "/"):
                if (source, dest) not in known:
                    vj["redirects"].append(
                        {"source": source, "destination": dest, "permanent": False})
                    known.add((source, dest))
                    added += 1
    print("    added %d redirect(s) -> /?mode=token|password|phone" % added)

    write_file(vpath, json.dumps(vj, indent=2, ensure_ascii=False) + "\n")
print()

# ---------------------------------------------------------------------------
# STEP 4: sidebar.js + SERVER/linker.js - ALWAYS_OPEN drops account-recovery
# ---------------------------------------------------------------------------

print("[STEP 4] ALWAYS_OPEN lists drop the removed folder")
sp = os.path.join(PUB, "sidebar.js")
if os.path.isfile(sp):
    s = read_file(sp)
    s2 = s.replace('var ALWAYS_OPEN = ["home", "account-recovery", "file-viewer"];',
                   'var ALWAYS_OPEN = ["home", "file-viewer"];')
    if s2 != s:
        write_file(sp, s2)
        print("    public/sidebar.js updated")
    else:
        print("    public/sidebar.js already clean")
lp = os.path.join(ROOT, "SERVER", "linker.js")
if os.path.isfile(lp):
    s = read_file(lp)
    s2 = s.replace('const ALWAYS_OPEN = ["home", "account-recovery"];',
                   'const ALWAYS_OPEN = ["home"];')
    if s2 != s:
        write_file(lp, s2)
        print("    SERVER/linker.js updated")
    else:
        print("    SERVER/linker.js already clean")
print()

# ---------------------------------------------------------------------------
# STEP 5: README - resolve the conflict blocks, describe the new home
# ---------------------------------------------------------------------------

print("[STEP 5] README.md")
rp = os.path.join(ROOT, "README.md")
if not os.path.isfile(rp):
    print("    SKIP - README.md not found")
else:
    r = read_file(rp)
    changed = False

    # 5a. resolve every conflict block ONE BLOCK AT A TIME (strict, per block,
    #     so a resolution can never swallow legitimate text between blocks)
    RETIRED_ENTRY = (
        "355-390. account-recovery - retired as folders: the whole recovery chain now lives "
        "on the front door itself. The account recovery panel - the forgot token desk, the "
        "forgot password desk and the forgot phone desk on three tabs - is now a section of "
        "public/index.html, the same page that carries the create account and login panels, "
        "so recovering an account never leaves the front door any more. The old "
        "account-recovery, forgot-token, forgot-password and forgot-phone-number folders are "
        "removed, and their old addresses redirect to the front door with the right tab "
        "pre-selected. Files: none - the panel runs inside index.html.\n")
    CONVERTOR_ENTRY = (
        "63. convertor - the Convertor hub: all 256 tools as same size square buttons, "
        "8 per row, in 14 families, with a live search and a star on the 14 essential tools. "
        "Files: 63.html, 63.css and 63.js.\n")
    HEALTH_ENTRY = (
        "321. health - the Health hub, the doorway to the medical wing: seven square buttons, "
        "Registration, Triage, Nurse Consultation, Doctor Consultation, Pharmacy, Treatment / "
        "Procedures and Patient List, in the same tile language as every launcher. "
        "Files: 321.html, 321.css and 321.js.\n")

    def resolve_block(up, stash, whole):
        if "355. account-recovery" in whole:
            return RETIRED_ENTRY
        if up.strip().startswith("63. convertor"):
            return CONVERTOR_ENTRY
        if up.strip().startswith("321. health"):
            return HEALTH_ENTRY
        if "public/convertor, the extra files" in up:
            # neither tools.js nor 506.js exists in the tree - drop the bullet
            return ""
        return up + stash  # unknown block: keep both sides, drop the markers

    blk_pat = CONFLICT_RE
    out, last, nblocks = [], 0, 0
    for m in blk_pat.finditer(r):
        out.append(r[last:m.start()])
        out.append(resolve_block(m.group(1), m.group(2), m.group(0)))
        last = m.end()
        nblocks += 1
    out.append(r[last:])
    r2 = "".join(out)
    if nblocks:
        r, changed = r2, True
        print("    resolved %d conflict block(s), one at a time" % nblocks)

    # 5c. the ALWAYS_OPEN description
    r2 = r.replace("(home, account-recovery, file-viewer)",
                   "(home, file-viewer)")
    if r2 != r:
        r, changed = r2, True
        print("    fixed the ALWAYS_OPEN description")

    if changed:
        write_file(rp, r)
    else:
        print("    OK - nothing to do")
print()

# ---------------------------------------------------------------------------
# STEP 6: 397.css - resolve its merge conflict (keep both sides)
# ---------------------------------------------------------------------------

print("[STEP 6] public/stock-register/397.css conflict")
cp = os.path.join(PUB, "stock-register", "397.css")
if not os.path.isfile(cp):
    print("    SKIP - file not found")
else:
    c = read_file(cp)
    if "<<<<<<<" in c:
        c2 = CONFLICT_RE.sub(lambda m: m.group(1) + m.group(2), c)
        if "<<<<<<<" not in c2:
            write_file(cp, c2)
            print("    resolved (both sides kept, markers removed)")
        else:
            print("    WARN - unexpected marker pattern, left untouched")
    else:
        print("    OK - already clean")
print()

# ---------------------------------------------------------------------------
# STEP 7: public/health - create the missing 321.js and link it
# ---------------------------------------------------------------------------

print("[STEP 7] public/health : complete the folder to 1 HTML + 1 CSS + 1 JS")
hp = os.path.join(PUB, "health")
hjs = os.path.join(hp, "321.js")
hhtml = os.path.join(hp, "321.html")
if not os.path.isdir(hp):
    print("    SKIP - public/health not found")
else:
    if not os.path.isfile(hjs):
        write_file(hjs, '''/* Health - page 321 (the medical wing hub).
   The module cards live in the markup; this script only adds
   small conveniences on top of them. */
(function () {
  "use strict";
  if (window.__jamalHealthHub) { return; }
  window.__jamalHealthHub = true;
  function init() {
    var cards = document.querySelectorAll(".mod");
    for (var i = 0; i < cards.length; i++) {
      cards[i].setAttribute("data-hub-index", String(i + 1));
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
''')
        print("    created 321.js (hub helper)")
    else:
        print("    321.js already exists")

    if os.path.isfile(hhtml):
        h = read_file(hhtml)
        if "/health/321.js" not in h:
            anchor = '<script src="/sidebar.js" defer></script>'
            if anchor in h:
                h = h.replace(anchor,
                              anchor + '\n<script src="/health/321.js" defer></script>', 1)
            else:
                h = h.replace("</head>",
                              '<script src="/health/321.js" defer></script>\n</head>', 1)
            write_file(hhtml, h)
            print("    linked 321.js into 321.html")
        else:
            print("    321.html already loads 321.js")
print()

# ---------------------------------------------------------------------------
# STEP 8: final audit
# ---------------------------------------------------------------------------

print("[STEP 8] final audit")
root_files = sorted(f for f in os.listdir(PUB)
                    if os.path.isfile(os.path.join(PUB, f)))
print("    public root files: %s" % ", ".join(root_files))

folders = 0
bad = []
for d in sorted(os.listdir(PUB)):
    p = os.path.join(PUB, d)
    if not os.path.isdir(p):
        continue
    folders += 1
    fs = os.listdir(p)
    h = [f for f in fs if f.endswith(".html")]
    c = [f for f in fs if f.endswith(".css")]
    j = [f for f in fs if f.endswith(".js")]
    if not (len(h) == 1 and len(c) == 1 and len(j) == 1):
        bad.append("%s (HTML=%d CSS=%d JS=%d)" % (d, len(h), len(c), len(j)))
print("    scanned %d folders under public/" % folders)
if bad:
    print("    WARN - folders not 1+1+1: %s" % "; ".join(bad))
else:
    print("    OK - every folder has exactly 1 HTML + 1 CSS + 1 JS")

left = set()
for dirpath, _dirs, files in os.walk(PUB):
    for fn in files:
        if fn.lower().endswith((".html", ".js", ".css")):
            p = os.path.join(dirpath, fn)
            s = read_file(p)
            if re.search(r"account-recovery|/forgot-token|/forgot-password|/forgot-phone-number",
                         s):
                left.add(os.path.relpath(p, ROOT))
if os.path.isfile(os.path.join(ROOT, "vercel.json")):
    with open(os.path.join(ROOT, "vercel.json"), "r", encoding="utf-8") as f:
        vchk = json.load(f)
    dirty = False
    for e in vchk.get("rewrites", []):
        if hits_removed(e.get("source", ""), e.get("destination", "")):
            dirty = True
    for e in vchk.get("redirects", []):
        if hits_removed("", e.get("destination", "")):
            dirty = True
    if dirty:
        left.add("vercel.json (a rewrite/redirect still TARGETS a removed folder)")
if os.path.isfile(lp) and re.search(
        r"account-recovery|/forgot-token|/forgot-password|/forgot-phone-number",
        read_file(lp)):
    left.add("SERVER/linker.js")
if left:
    print("    WARN - references to the removed folders remain in: %s"
          % ", ".join(sorted(left)))
else:
    print("    OK - no reference to the removed recovery folders is left")

vpath2 = os.path.join(ROOT, "vercel.json")
if os.path.isfile(vpath2):
    try:
        with open(vpath2, "r", encoding="utf-8") as f:
            json.load(f)
        print("    OK - vercel.json is valid JSON")
    except Exception as e:
        print("    WARN - vercel.json does not parse: %s" % e)

print()
print("DONE - review the audit above, then commit & push:")
print('  git add -A && git commit -m "Account recovery joins the front door: one panel inside index.html, recovery folders removed, health completes 1+1+1" && git push')
