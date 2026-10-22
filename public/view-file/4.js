// view-file (page 4) — guarded
import { requireAuth } from "/firebase.js";

await requireAuth(); // not logged in? → bounced to "/"
