// business (page 2) — guarded
import { requireAuth } from "/firebase.js";

await requireAuth(); // not logged in? → bounced to "/"
