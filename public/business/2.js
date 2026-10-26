// business (page 2) — pure launcher; buttons redirect to real pages
import { requireAuth } from "/firebase.js";

await requireAuth(); // not logged in? → bounced to "/"
