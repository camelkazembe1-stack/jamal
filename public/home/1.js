// home (page 1) — launcher grid; guarded by Firebase auth
import { requireAuth } from "/firebase.js";

await requireAuth(); // not logged in? → bounced to "/"
