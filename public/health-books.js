/* JAMALI - public/health-books.js, hospital money in the one set of books.
 *
 * Loaded on every page by sidebar.js. The Health wing keeps its own
 * records (healthBilling, healthPayments, healthInsurance); this module
 * mirrors their money into the shared "transactions" collection, so the
 * Sales Journal, Cash Book, Debtors Book, Ledger, Income Statement and
 * Balance Sheet carry hospital income beside business income.
 *
 *   Hospital bill (not Cancelled)        IN  Sales            Credit     patient owes the net bill
 *   Payment against an invoice           IN  Debtors Recover  Cash/Bank  patient's debt goes down
 *   Payment with no invoice number       IN  Sales            Cash/Bank  cash sale
 *   Payment set to Refund approved,      OUT Sales Return     Cash/Bank  money paid back
 *   or a payment of type Refund
 *   Insurance claim (status Paid)        IN  Debtors Recover  Bank       insurer paid the patient's bill
 *
 * Every mirrored entry has a fixed id ("health-<collection>-<record id>")
 * and source: "health"; it is rewritten when the health record changes
 * and removed when the record is deleted or cancelled. Change hospital
 * money on the Health pages, not in Add Transaction.
 */
const SOURCES = ["healthBilling", "healthPayments", "healthInsurance"];
const PREFIX = "health-";
const num = (v) => { const n = Number(v); return isFinite(n) ? n : 0; };
const methodOf = (m) => (/^cash$/i.test(String(m || "").trim()) || !m ? "Cash" : "Bank");
const when = (r) => { const d = new Date(r.createdAt || r.date || Date.now()); return isNaN(d) ? new Date() : d; };

function entriesFor(coll, r) {
  const who = String(r.patientId || "").trim();
  const st = String(r.status || "");
  if (!who || st === "Cancelled") return [];
  const base = () => ({ dateTime: when(r), name: who, source: "health", sourceModule: coll, sourceRef: r.ref || "" });
  if (coll === "healthBilling") {
    const net = num(r.amount) - num(r.discount);
    return net > 0 ? [["", Object.assign(base(), { transactionType: "IN", transactionName: "Sales", flowMethod: "Credit", amount: net })]] : [];
  }
  if (coll === "healthPayments") {
    const amt = num(r.amount);
    if (amt <= 0) return [];
    const fm = methodOf(r.method);
    const refund = ["-refund", Object.assign(base(), { transactionType: "OUT", transactionName: "Sales Return", flowMethod: fm, amount: amt })];
    if (/refund/i.test(String(r.kind || ""))) return st === "Refund pending" ? [] : [refund];
    const out = [["", Object.assign(base(), {
      transactionType: "IN",
      transactionName: String(r.invoiceNo || "").trim() ? "Debtors Recover" : "Sales",
      flowMethod: fm, amount: amt
    })]];
    if (st === "Refund approved") out.push(refund);
    return out;
  }
  if (coll === "healthInsurance") {
    const amt = num(r.claimAmount);
    return st === "Paid" && amt > 0
      ? [["", Object.assign(base(), { transactionType: "IN", transactionName: "Debtors Recover", flowMethod: "Bank", amount: amt })]]
      : [];
  }
  return [];
}

const sig = (t) => [t.transactionType, t.transactionName, t.flowMethod, t.name, t.amount,
  t.dateTime && (t.dateTime.toMillis ? t.dateTime.toMillis() : new Date(t.dateTime).getTime()), t.sourceRef].join("|");

let api = null, busy = false, again = false;
async function reconcile() {
  if (busy) { again = true; return; }
  busy = true;
  try {
    const m = api;
    const want = new Map();
    for (const coll of SOURCES) {
      const snap = await m.getDocs(m.collection(m.db, coll));
      snap.docs.forEach((d) => {
        entriesFor(coll, d.data() || {}).forEach(([suffix, e]) => want.set(PREFIX + coll + "-" + d.id + suffix, e));
      });
    }
    const have = new Map();
    (await m.getDocs(m.collection(m.db, "transactions"))).docs.forEach((d) => {
      if (d.id.indexOf(PREFIX) === 0) have.set(d.id, d.data() || {});
    });
    for (const [id, e] of want)
      if (!have.has(id) || sig(have.get(id)) !== sig(e)) await m.setDoc(m.doc(m.db, "transactions", id), e);
    for (const id of have.keys())
      if (!want.has(id)) await m.deleteDoc(m.doc(m.db, "transactions", id));
  } catch (e) {
    console.warn("JAMALI health-books:", (e && e.message) || e);
  } finally {
    busy = false;
    if (again) { again = false; reconcile(); }
  }
}

(async () => {
  api = await import("/502.js");
  let t = null;
  const soon = () => { clearTimeout(t); t = setTimeout(reconcile, 150); };
  SOURCES.forEach((c) => api.onSnapshot(api.collection(api.db, c), soon, () => {}));
})();
