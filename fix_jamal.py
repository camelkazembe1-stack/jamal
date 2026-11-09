#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fix_jamal.py - one-shot repair of the jamal repo public/ tree.

Enforces the two project rules:
  RULE 1: every page a button/link can open lives in its OWN folder,
          folder name = page name.
  RULE 2: every folder under public/ holds exactly one .html + one .css + one .js.

Steps
  [1] split the multi-page hubs into 24 new page folders (files keep the
      N.html / N.css / N.js naming),
  [2] move the 13 shared engine files to the public root (the same pattern
      the project already uses for menu.js / sidebar.js / firebase.js) and
      remove the emptied folders,
  [3] rewrite every reference in every .html / .js / .css,
  [4] patch menu.js / sidebar.js / field-control.js / linker.js / apply-rules.sh
      so navigation and access control keep working,
  [5] update README.md,
  [6] verify: folder rule, dead-link scan, node --check on every js file.

Safe to re-run: every step skips work that is already done.

Usage:
  python3 fix_jamal.py                # run inside the repo folder
  python3 fix_jamal.py /path/to/jamal
"""
import json, os, re, shutil, subprocess, sys

# ------------------------------------------------------------- locate repo ---
def find_repo():
    cands = []
    if len(sys.argv) > 1:
        cands.append(sys.argv[1])
    cands += [os.getcwd(), os.path.join(os.getcwd(), "jamal"),
              os.path.expanduser("~/jamal")]
    for c in cands:
        c = os.path.abspath(os.path.expanduser(c))
        if os.path.isdir(os.path.join(c, "public")):
            return c
    print("ERROR: could not find the jamal repo (a folder that contains public/).")
    print("  cd into the repo first, or run:  python3 fix_jamal.py /path/to/jamal")
    sys.exit(1)

REPO = find_repo()
PUB = os.path.join(REPO, "public")
print(f"repo: {REPO}")
print(f"public root: {PUB}")
print("")

log = []
def say(msg):
    print(msg)
    log.append(msg)

def need(path, what):
    if not os.path.exists(path):
        say(f"FATAL: {what} missing: {path}")
        sys.exit(1)

# ---------------------------------------------------------------- config -----
# (old_folder, page_number, new_folder, shared_css_or_None)
# shared_css: the hub stylesheet copied into the new folder as N.css.
# None: the page already owns its own N.css, which is moved along.
SPLITS = [
    ("ward-management",   331, "ward-registration",     "ward.css"),
    ("ward-management",   332, "bed-management",        "ward.css"),
    ("ward-management",   333, "ward-occupancy",        "ward.css"),
    ("ward-management",   334, "bed-assignment",        "ward.css"),
    ("ward-management",   335, "ward-bed-transfers",    "ward.css"),
    ("ward-management",   336, "cleaning-maintenance",  "ward.css"),
    ("ward-management",   337, "ward-register",         "ward.css"),
    ("ward-management",   338, "bed-transfer-history",  "ward.css"),
    ("patient-admission", 341, "new-admission",         "adm.css"),
    ("patient-admission", 342, "admission-list",        "adm.css"),
    ("patient-admission", 343, "admission-details",     "adm.css"),
    ("patient-discharge", 351, "start-discharge",       "dis.css"),
    ("patient-discharge", 352, "discharge-list",        "dis.css"),
    ("patient-discharge", 353, "discharge-details",     "dis.css"),
    ("laboratory",        361, "new-lab-request",       "lab.css"),
    ("laboratory",        362, "lab-request-list",      "lab.css"),
    ("laboratory",        363, "lab-workbench",         "lab.css"),
    ("radiology",         371, "new-imaging-request",   "rad.css"),
    ("radiology",         372, "imaging-requests",      "rad.css"),
    ("radiology",         373, "imaging-workbench",     "rad.css"),
    ("account-recovery",  355, "forgot-token",          None),
    ("account-recovery",  356, "forgot-password",       None),
    ("account-recovery",  357, "forgot-phone-number",   None),
    ("convertor",          64, "tool",                  None),
]
LANDING = {  # hub folder -> (landing page number, shared css name)
    "ward-management":   (330, "ward.css"),
    "patient-admission": (340, "adm.css"),
    "patient-discharge": (350, "dis.css"),
    "laboratory":        (360, "lab.css"),
    "radiology":         (370, "rad.css"),
}
# loose shared files: (old path rel. to public, new path rel. to public)
LIB_MOVES = [
    ("books/row-actions.js",    "row-actions.js"),
    ("journals/journal.css",    "journal.css"),
    ("journals/journal.js",     "journal.js"),
    ("records/records.css",     "records.css"),
    ("records/records.js",      "records.js"),
    ("reports/reports.js",      "reports.js"),
    ("reports2/reports2.css",   "reports2.css"),
    ("reports2/reports2.js",    "reports2.js"),
    ("ledger/postings.js",      "postings.js"),
    ("health/patient-info.css", "patient-info.css"),
    ("convertor/tools.js",      "tools.js"),
    ("SERVER/linker.js",        "linker.js"),
    ("SERVER/server.js",        "server.js"),
]
FOLDERS_TO_REMOVE = ["books", "journals", "records", "reports", "reports2",
                     "SERVER", "account-recovery"]
# whole-path rewrites applied to every html/js/css under public
PATH_REWRITES = [
    ("/SERVER/linker.js",        "/linker.js"),
    ("/books/row-actions.js",    "/row-actions.js"),
    ("/journals/journal.css",    "/journal.css"),
    ("/journals/journal.js",     "/journal.js"),
    ("/records/records.css",     "/records.css"),
    ("/records/records.js",      "/records.js"),
    ("/reports/reports.js",      "/reports.js"),
    ("/reports2/reports2.css",   "/reports2.css"),
    ("/reports2/reports2.js",    "/reports2.js"),
    ("/ledger/postings.js",      "/postings.js"),
    ("/health/patient-info.css", "/patient-info.css"),
    ("/convertor/tools.js",      "/tools.js"),
]
# extra one-file text fixes (pre-existing stale page numbers)
TEXT_FIXES = [
    ("video-subtitle-extractor/226.html", "/srt-to-vtt/163", "/srt-to-vtt/227"),
    ("video-subtitle-extractor/226.html", "/vtt-to-srt/164", "/vtt-to-srt/228"),
]
# grant aliases: new sub-folder -> parent module folder whose grant covers it
GRANT_ALIASES = {
    "ward-registration": "ward-management", "bed-management": "ward-management",
    "ward-occupancy": "ward-management",    "bed-assignment": "ward-management",
    "ward-bed-transfers": "ward-management", "cleaning-maintenance": "ward-management",
    "ward-register": "ward-management",     "bed-transfer-history": "ward-management",
    "new-admission": "patient-admission",   "admission-list": "patient-admission",
    "admission-details": "patient-admission",
    "start-discharge": "patient-discharge", "discharge-list": "patient-discharge",
    "discharge-details": "patient-discharge",
    "new-lab-request": "laboratory",        "lab-request-list": "laboratory",
    "lab-workbench": "laboratory",
    "new-imaging-request": "radiology",     "imaging-requests": "radiology",
    "imaging-workbench": "radiology",
    "tool": "convertor",
}
# dead links that exist in the ORIGINAL repo and are documented in the README
# as reserved folders still pending - they are not ours to fix
PENDING_OK = {
    ("view-file/4.html", "/bills-receivable/19"),
    ("view-file/4.html", "/bills-payable/20"),
}

# ------------------------------------------------- [1] split page folders ----
print("[1] splitting multi-page folders into one-folder-per-page")
for old, n, new, shared in SPLITS:
    src = os.path.join(PUB, old)
    dst = os.path.join(PUB, new)
    if not os.path.isdir(src) and os.path.isdir(dst):
        say(f"  skip  {new} (already split, {old} gone)")
        continue
    need(src, "source folder")
    if os.path.isdir(dst):
        say(f"  skip  {new} (target already exists)")
        continue
    os.makedirs(dst)
    for ext in ("html", "js"):
        f = os.path.join(src, f"{n}.{ext}")
        need(f, f"{old}/{n}.{ext}")
        shutil.move(f, os.path.join(dst, f"{n}.{ext}"))
    if shared:
        css_src = os.path.join(src, shared)
        need(css_src, f"{old}/{shared}")
        shutil.copy2(css_src, os.path.join(dst, f"{n}.css"))
        html = os.path.join(dst, f"{n}.html")
        text = open(html, encoding="utf-8").read()
        old_ref, new_ref = f"/{old}/{shared}", f"/{new}/{n}.css"
        if old_ref in text:
            open(html, "w", encoding="utf-8").write(text.replace(old_ref, new_ref))
    elif os.path.exists(os.path.join(src, f"{n}.css")):
        # the page owns its own stylesheet - move it, fix the header comment
        css_src = os.path.join(src, f"{n}.css")
        text = open(css_src, encoding="utf-8").read()
        if old == "account-recovery" and old in text:
            text = text.replace(old, new, 1)
        open(os.path.join(dst, f"{n}.css"), "w", encoding="utf-8").write(text)
        os.remove(css_src)
    say(f"  split /{old}/{n} -> /{new}/{n}  ({n}.html {n}.css {n}.js)")

# landing folders: rename the shared css to <n>.css and fix the landing ref
for old, (ln, shared) in LANDING.items():
    src_css = os.path.join(PUB, old, shared)
    dst_css = os.path.join(PUB, old, f"{ln}.css")
    if os.path.exists(src_css):
        shutil.move(src_css, dst_css)
        say(f"  hub   {old}: {shared} -> {ln}.css")
    html = os.path.join(PUB, old, f"{ln}.html")
    if os.path.exists(html):
        text = open(html, encoding="utf-8").read()
        old_ref = f"/{old}/{shared}"
        if old_ref in text:
            open(html, "w", encoding="utf-8").write(
                text.replace(old_ref, f"/{old}/{ln}.css"))

# --------------------------------------- [2] shared engine files to root -----
print("[2] moving shared engine files to the public root")
for old_rel, new_rel in LIB_MOVES:
    src = os.path.join(PUB, old_rel)
    dst = os.path.join(PUB, new_rel)
    if os.path.exists(src):
        shutil.move(src, dst)
        say(f"  {old_rel} -> /{new_rel}")
    elif os.path.exists(dst):
        say(f"  skip  {old_rel} (already moved)")
    else:
        say(f"FATAL: {old_rel} missing on both sides")
        sys.exit(1)
for d in FOLDERS_TO_REMOVE:
    full = os.path.join(PUB, d)
    if os.path.isdir(full) and not os.listdir(full):
        os.rmdir(full)
        say(f"  rmdir {d} (empty)")

# ------------------------------------------------ [3] rewrite references -----
print("[3] rewriting every reference (html/js/css)")
RX_MOVES = [(re.compile(r'/' + re.escape(old) + r'/' + str(n) + r'(?!\d)'),
             f'/{new}/{n}') for old, n, new, _ in SPLITS]
RX_LIB = [(re.compile(re.escape(a)), b) for a, b in PATH_REWRITES]

changed = 0
for dirpath, _, files in os.walk(PUB):
    for fn in files:
        if not fn.lower().endswith((".html", ".js", ".css")):
            continue
        p = os.path.join(dirpath, fn)
        rel = os.path.relpath(p, PUB).replace(os.sep, "/")
        text = open(p, encoding="utf-8", errors="ignore").read()
        orig = text
        for rx, rep in RX_LIB:
            text = rx.sub(rep, text)
        for rx, rep in RX_MOVES:
            text = rx.sub(rep, text)
        for frel, a, b in TEXT_FIXES:
            if rel == frel:
                text = text.replace(a, b)
        if text != orig:
            open(p, "w", encoding="utf-8").write(text)
            changed += 1
say(f"  {changed} files updated")

# ----------------------------------------------- [4] patch js/shell logic ----
print("[4] patching menu.js / sidebar.js / field-control.js / linker.js")

def patch(path, pairs, label):
    if not os.path.exists(path):
        say(f"  WARN: {label} not found - skipped")
        return
    text = open(path, encoding="utf-8").read()
    hit = 0
    for old, new in pairs:
        if old in text:
            text = text.replace(old, new)
            hit += 1
        elif new in text:
            hit += 1                       # already patched on an earlier run
        else:
            say(f"  WARN: pattern not found in {label}: {old[:60]!r}")
    open(path, "w", encoding="utf-8").write(text)
    say(f"  patched {label} ({hit}/{len(pairs)} patterns)")

# menu.js: repoint each moved page's menu entry at its new folder
# (355-357 and 64 have no menu entries - tolerated)
mpath = os.path.join(PUB, "menu.js")
mtext = open(mpath, encoding="utf-8").read()
menu_hits = 0
for old, n, new, _ in SPLITS:
    old_s, new_s = f'folder: "{old}", n: {n}', f'folder: "{new}", n: {n}'
    if old_s in mtext:
        mtext = mtext.replace(old_s, new_s)
        menu_hits += 1
open(mpath, "w", encoding="utf-8").write(mtext)
say(f"  menu.js: {menu_hits} menu entries repointed")

alias_js = "var GRANT_ALIASES = " + json.dumps(GRANT_ALIASES) + ";"
RECOV_JS = ('["forgot-token", "forgot-password", "forgot-phone-number"]'
            '.indexOf(current) === -1')
patch(os.path.join(PUB, "sidebar.js"), [
    ('var ALWAYS_OPEN = ["home", "account-recovery", "file-viewer"];',
     'var ALWAYS_OPEN = ["home", "forgot-token", "forgot-password", '
     '"forgot-phone-number", "file-viewer"];\n  ' + alias_js),
    ('return !!(session.grants && session.grants.indexOf(folder) !== -1);',
     'var gf = GRANT_ALIASES[folder] || folder;\n'
     '   return !!(session.grants && session.grants.indexOf(gf) !== -1);'),
    ('if (current !== "account-recovery") {',
     f'if ({RECOV_JS}) {{'),
    ('if (current !== "account-recovery" && !hasAnyGrant())',
     f'if ({RECOV_JS} && !hasAnyGrant())'),
], "sidebar.js")

patch(os.path.join(PUB, "field-control.js"), [
    ('F === "system-admin" || F === "account-recovery"',
     'F === "system-admin" || F === "forgot-token" || '
     'F === "forgot-password" || F === "forgot-phone-number"'),
], "field-control.js")

patch(os.path.join(PUB, "linker.js"), [
    ('const ALWAYS_OPEN = ["home", "account-recovery"];',
     'const ALWAYS_OPEN = ["home", "forgot-token", "forgot-password", '
     '"forgot-phone-number"];'),
], "linker.js")

ar_path = os.path.join(REPO, "apply-rules.sh")
if os.path.exists(ar_path):
    patch(ar_path, [
        ('for f in public/SERVER/server.js; do', 'for f in public/server.js; do'),
    ], "apply-rules.sh")

# --------------------------------------------------------- [5] README --------
print("[5] updating README.md")
readme = os.path.join(REPO, "README.md")
if os.path.exists(readme):
    text = open(readme, encoding="utf-8").read()

    def sub1(old, new):
        global text
        if old not in text:
            say(f"  note: README pattern not found: {old[:60]!r}")
            return
        text = text.replace(old, new, 1)

    FILES = {
        331: "ward-registration", 332: "bed-management", 333: "ward-occupancy",
        334: "bed-assignment", 335: "ward-bed-transfers", 336: "cleaning-maintenance",
        337: "ward-register", 338: "bed-transfer-history",
        341: "new-admission", 342: "admission-list", 343: "admission-details",
        351: "start-discharge", 352: "discharge-list", 353: "discharge-details",
        361: "new-lab-request", 362: "lab-request-list", 363: "lab-workbench",
        371: "new-imaging-request", 372: "imaging-requests", 373: "imaging-workbench",
    }
    for n, folder in FILES.items():
        sub1(f"Files: {n}.html, {n}.js.",
             f"Files: {n}.html, {n}.css and {n}.js, in their own folder /{folder}.")
    for n, folder in ((355, "forgot-token"), (356, "forgot-password"),
                      (357, "forgot-phone-number")):
        sub1(f"Files: {n}.html, {n}.css and {n}.js.",
             f"Files: {n}.html, {n}.css and {n}.js, in their own folder /{folder}.")

    sub1("The folder carries nine pages, 330 to 338, sharing one stylesheet. "
         "Files: 330.html, 330.js, ward.css.",
         "The folder carries the ward hub page. Its eight sub-pages live in their own "
         "folders (ward-registration, bed-management, ward-occupancy, bed-assignment, "
         "ward-bed-transfers, cleaning-maintenance, ward-register, bed-transfer-history), "
         "each carrying a copy of the stylesheet as its own N.css. "
         "Files: 330.html, 330.css and 330.js.")
    sub1("The folder carries four pages sharing one stylesheet. Files: 340.html, 340.js, adm.css.",
         "Its three sub-pages live in their own folders (new-admission, admission-list, "
         "admission-details), each carrying a copy of the stylesheet as its own N.css. "
         "Files: 340.html, 340.css and 340.js.")
    sub1("The folder carries four pages sharing one stylesheet. Files: 350.html, 350.js, dis.css.",
         "Its three sub-pages live in their own folders (start-discharge, discharge-list, "
         "discharge-details), each carrying a copy of the stylesheet as its own N.css. "
         "Files: 350.html, 350.css and 350.js.")
    sub1("The folder carries four pages sharing one stylesheet. Files: 360.html, 360.js, lab.css.",
         "Its three sub-pages live in their own folders (new-lab-request, lab-request-list, "
         "lab-workbench), each carrying a copy of the stylesheet as its own N.css. "
         "Files: 360.html, 360.css and 360.js.")
    sub1("The folder carries four pages sharing one stylesheet. Files: 370.html, 370.js, rad.css.",
         "Its three sub-pages live in their own folders (new-imaging-request, "
         "imaging-requests, imaging-workbench), each carrying a copy of the stylesheet "
         "as its own N.css. Files: 370.html, 370.css and 370.js.")
    sub1("Files: 63.html, 63.css and 63.js (the hub), 64.html, 64.css and 64.js (the "
         "not-found fallback page itself), and tools.js (the catalogue of all 256 tools). "
         "Seven files in all, every one named here.",
         "Files: 63.html, 63.css and 63.js. The not-found fallback page lives in its own "
         "folder /tool as 64.html, 64.css and 64.js, and the catalogue tools.js sits loose "
         "in the public root (the hub grid and the sidebar both read it).")
    sub1("64. convertor not found page - the friendly fallback when a tool address does "
         "not exist. It lives inside the convertor folder as its 64.html, 64.css and 64.js.",
         "64. tool - the friendly fallback when a tool address does not exist. It lives "
         "in its own folder /tool as 64.html, 64.css and 64.js.")
    sub1("Also home of the shared postings.js engine. Files: 18.html, 18.css, 18.js, "
         "plus postings.js - the shared posting engine the other book pages import.",
         "Files: 18.html, 18.css and 18.js. The shared posting engine postings.js sits "
         "loose in the public root; the other book pages import it from /postings.js.")
    sub1("Files: 321.html and 321.css, plus the shared patient-info.css and "
         "patient-info.js that the stage pages load.",
         "Files: 321.html, 321.css and patient-info.js. The shared patient-info.css sits "
         "loose in the public root; the stage pages import patient-info.js from "
         "/health/patient-info.js.")
    sub1("321. health - the Health hub, the doorway to the medical wing: seven square buttons",
         "321. health - the Health hub, the doorway to the medical wing: seven square "
         "buttons plus the ward, admission, discharge, laboratory and radiology hubs")

    sub1("- public/books/row-actions.js -", "- public/row-actions.js -")
    sub1("- public/journals - the engine folder (journal.js and journal.css) that renders "
         "the eight journals, pages 7 to 14.",
         "- public/journal.js and public/journal.css - the shared engine files that render "
         "the eight journals, pages 7 to 14, sitting loose in the public root like menu.js.")
    sub1("- public/records - the engine folder (records.js and records.css) behind the "
         "register pages 21 to 40, and the design base for the report pages too.",
         "- public/records.js and public/records.css - the shared engine files behind the "
         "register pages 21 to 40, and the design base for the report pages too, sitting "
         "loose in the public root like menu.js.")
    sub1("- public/reports - the one engine folder behind every report page "
         "(31, 33, 41 to 48, 53 and 55 to 61): core.js is the shared foundation "
         "(table shell, side panel, key-value card, empty and failure states, period bar, "
         "account selector); ledger.js carries the ledger views (Trial Balance, Adjusted "
         "Trial Balance, Post-Closing Trial Balance, General Ledger Report, Bank "
         "Reconciliation); parties.js carries the people views (AR and AP Schedules, AR "
         "and AP Reports, customer and supplier statements, Aged Receivables and Aged "
         "Payables - one party engine underneath); assets.js carries the register views "
         "(Stock Movement, Inventory Valuation, Depreciation, Fixed Assets Schedule, "
         "Accumulated Depreciation); reports.css carries the period bar and selector "
         "styles. Views only, no data entry.",
         "- public/reports.js - the one shared engine file behind the report pages "
         "(31, 33 and 41 to 48), sitting loose in the public root, imported from "
         "/reports.js. Views only, no data entry. - public/reports2.js and "
         "public/reports2.css - the statement and aged report engine (55 to 61), also "
         "loose in the public root.")
    sub1("- public/convertor, the extra files - besides pages 63 and 64 the folder "
         "carries tools.js (the registry of all 256 tools with id, label, slug and page "
         "number - the hub grid and the sidebar children both read it, so buttons and "
         "tree can never drift apart).",
         "- public/tools.js - the registry of all 256 tools with id, label, slug and "
         "page number (the hub grid reads it, so buttons and tree can never drift apart), "
         "sitting loose in the public root.")
    sub1("- public/health, the extra files - besides page 321 the folder carries "
         "patient-info.js and patient-info.css - the shared chip the health stage pages "
         "load to show a patient's every record by Registration ID.",
         "- public/patient-info.css - the stylesheet of the shared patient chip, sitting "
         "loose in the public root; the chip's code patient-info.js lives in the health "
         "folder and loads this file from /patient-info.css.")
    sub1("- public/SERVER - the one server folder, inside the web root where the browser "
         "can reach it: server.js picks the Firebase project and configuration, linker.js "
         "is the only connection point the modules talk through, and public/firebase.js "
         "hands all of it to every page.",
         "- public/server.js and public/linker.js - the two server files, sitting loose "
         "in the web root where the browser can reach them: server.js picks the Firebase "
         "project and configuration, linker.js is the only connection point the modules "
         "talk through, and public/firebase.js hands all of it to every page.")
    sub1("with the ALWAYS_OPEN list (home, account-recovery, file-viewer)",
         "with the ALWAYS_OPEN list (home, forgot-token, forgot-password, "
         "forgot-phone-number, file-viewer)")
    sub1("it reads the database project from public/SERVER/server.js",
         "it reads the database project from public/server.js")

    open(readme, "w", encoding="utf-8").write(text)
    say("  README entries updated")

    # real file counts for the closing line (walked from disk, .git excluded)
    def count_files(root):
        n = 0
        for dp, dn, fn in os.walk(root):
            dn[:] = [d for d in dn if d != ".git"]
            n += len(fn)
        return n
    total, pubc = count_files(REPO), count_files(PUB)
    text = open(readme, encoding="utf-8").read()
    text, ns = re.subn(
        r"That is the whole tree: \d+ project files, \d+ of them under public, "
        r"and every one of them is named above.",
        f"That is the whole tree: {total} project files, {pubc} of them under public, "
        f"and every one of them is named above.", text)
    open(readme, "w", encoding="utf-8").write(text)
    say(f"  README closing counts -> total={total}, public={pubc} ({ns} line)")
else:
    say("  skip (no README)")

# ----------------------------------------------------- [6] verification ------
print("[6] verification")
REF = re.compile(r'''
    (?:
      (?:href|src|data-redirect)\s*=\s*["\'](/[^"'#?]+)     # html attributes
    | @import\s+url\(\s*["\']?(/[^"\')]+)                   # css @import
    | import\s+[^;]*?from\s+["\'](/[^"\']+)                 # js import from
    | import\s*\(\s*["\'](/[^"\']+)                         # js dynamic import
    | (?:location(?:\.href|\.replace|\.assign)|window\.open)\s*[=(]\s*["\'](/[^"\']+)  # js nav
    )
''', re.X)

def resolve(ref):
    ref = ref.split("?")[0]
    if not ref.startswith("/") or ref.startswith("//"):
        return None
    path = os.path.join(PUB, ref.lstrip("/"))
    return (os.path.isfile(path) or os.path.isfile(path + ".html")
            or (os.path.isdir(path) and os.path.isfile(os.path.join(path, "index.html"))))

bad, pending, scanned = [], [], 0
for dirpath, _, fnames in os.walk(PUB):
    for fn in fnames:
        if not fn.lower().endswith((".html", ".js", ".css")):
            continue
        scanned += 1
        p = os.path.join(dirpath, fn)
        rel = os.path.relpath(p, PUB).replace(os.sep, "/")
        text = open(p, encoding="utf-8", errors="ignore").read()
        for m in REF.finditer(text):
            ref = next(g for g in m.groups() if g)
            if resolve(ref) is False:
                if (rel, ref) in PENDING_OK:
                    pending.append((rel, ref))
                else:
                    bad.append((rel, ref))
say(f"  files scanned: {scanned}")
say(f"  broken absolute refs: {len(bad)}"
    + (f"   known pending (README-documented): {len(pending)}" if pending else ""))
for rel, ref in bad[:25]:
    say(f"    BROKEN {rel} -> {ref}")

folders = [d for d in os.listdir(PUB) if os.path.isdir(os.path.join(PUB, d))]
bad_folders = []
for d in folders:
    fs = os.listdir(os.path.join(PUB, d))
    c = {e: sum(1 for f in fs if f.lower().endswith(e)) for e in ("html", "css", "js")}
    if not (c["html"] == 1 and c["css"] == 1 and c["js"] == 1 and len(fs) == 3):
        bad_folders.append((d, sorted(fs)))
say(f"  folders: {len(folders)}  rule violations: {len(bad_folders)}")
for d, fs in bad_folders:
    say(f"    BAD FOLDER {d}: {fs}")

node = shutil.which("node")
js_total = js_errs = 0
if node:
    for dirpath, _, fnames in os.walk(PUB):
        for fn in fnames:
            if fn.endswith(".js"):
                js_total += 1
                r = subprocess.run([node, "--check", os.path.join(dirpath, fn)],
                                   capture_output=True, text=True)
                if r.returncode != 0:
                    js_errs += 1
                    say(f"    JS SYNTAX {os.path.relpath(os.path.join(dirpath, fn), PUB)}: "
                        f"{r.stderr.strip()[:120]}")
    say(f"  js syntax: {js_total} checked, {js_errs} errors")
else:
    say("  node not available - syntax check skipped")

print("")
errs = len(bad) + len(bad_folders) + js_errs
if errs == 0:
    print("RESULT: OK - both rules hold, no broken refs, all js parses")
else:
    print(f"RESULT: {errs} problem(s) found - see the lines marked above")
print("")
print("review + commit:")
print(f"  cd {REPO}")
print("  git add -A")
print('  git commit -m "Enforce one-folder-per-page rules: split multi-page folders, '
      'move shared engines to public root, rewire all references"')
sys.exit(1 if errs else 0)
