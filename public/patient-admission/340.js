// patient-admission (page 340) — JAMALI Health — the Patient Admission hub
// A pure launcher, exactly like the Health hub 321 and the Ward Management
// hub 330: four square tiles and no data. Nothing here reads or writes
// Firestore, so nothing here can fail — the pages it opens (341 to 343)
// carry their own boot diagnostics, and the fourth tile opens the existing
// Ward Management assignment page 334 instead of duplicating it.

// no firebase import on purpose: the hub is a signpost, not a data page.
