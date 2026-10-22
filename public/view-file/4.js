// view-file (page 4) — View File = module launcher.
// Buttons redirect to the module pages (no page loads here, real navigation).
import { requireAuth } from "/firebase.js";

await requireAuth(); // not logged in? -> bounced to "/"
