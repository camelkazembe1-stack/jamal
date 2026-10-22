// add-transaction (page 3) — guarded
import { requireAuth } from "/firebase.js";

await requireAuth(); // not logged in? → bounced to "/"
