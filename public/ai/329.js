/* JAMALI AI — the shared AI engine, carried by page 329 (the AI hub) and
 * imported by every other AI page, the same way the book pages import 512.js.
 *
 * What it does (the working AI):
 *   - the AI conversation screen: user messages and attachments on one side,
 *     structured confirmation cards, tool outputs and status on the other,
 *     scrolled to the newest item (339);
 *   - the input bar with the up-arrow send button and its three states, driven
 *     by the status model Ready / Processing / Needs-confirmation (344, 422);
 *   - attachments: images and documents ride with any message; video and audio
 *     are refused at once (345, 346, 418); every picked file shows as a
 *     preview card above the input - thumbnail for images, type and size for
 *     the rest - with a live reading progress bar and a remove button per
 *     file, unlimited in count and size, sent with or without a message;
 *   - understanding: Swahili, English or a mix, text, photographed receipts
 *     (OCR) and documents (PDF, Word, Excel, CSV, text) read into the exact
 *     fields the target module expects (347, 348, 349);
 *   - the combined answer: an open request runs the two searches and the
 *     files together - the user's own live records first (grants respected,
 *     read only), then the open web, then every uploaded file - and lands
 *     as ONE answer card that names each source, the connections between
 *     them and the differences, never a guessed record;
 *   - the web search: a word the dictionaries do not know (kashata) is
 *     looked up on the open web - keyless, CORS-open Wikipedia, English and
 *     Swahili, cached so the same term never costs a second trip - and the
 *     answer comes back tied to the system;
 *   - the processing spinner: an animated spinning circle with an honest
 *     label while the AI works; the input locks, duplicate sends are refused,
 *     and the arrow comes back the moment the AI is Ready;
 *   - the retry: a failed request keeps its exact text and files, and every
 *     error card carries a Retry button that resends it unchanged;
 *   - the file request: "naomba pdf ya <link>" and its English friends are
 *     real Convertor runs - the link, the typed text or the attachments are
 *     read in the page, the Text-to-PDF tool (#65, page 65) builds the
 *     document, and the finished file comes back as a download link (391);
 *   - the chat layer: greetings, thanks, capabilities and open questions get
 *     real replies or web answers instead of a clarification loop; wellbeing
 *     words ("naumwa malaria") are heard, looked up on the web and answered
 *     with the health wing's own steps - never a record question;
 *   - the desks: Business, Stock, Health, Computer — mapping, clarification,
 *     one confirmation summary per action, execution through the exact
 *     collections and validation the manual pages use (354-392, 394, 395,
 *     400-403, 409, 410, 411);
 *   - the audit trail: every AI write carries the logged-in user's identity
 *     and timestamp, and every finished action is retrievable on page 417
 *     through the aiHistory collection (414, 417).
 *
 * Wiring (406): connects exclusively through /502.js — requireAuth, Google
 * authentication, Firestore — exactly like every other page.
 */
import {
  requireAuth, auth, db, collection, doc, addDoc, getDocs, getDoc,
  writeBatch, query, orderBy, limit, serverTimestamp, increment
} from "/502.js";

/* =====================================================================
 * PURE CORE — no window, no Firestore. The same code a Node test runs.
 * ===================================================================== */

const AI_VERSION = "1.4";

/* The business names, exactly page 3's own lists. */
const IN_NAMES = ["Sales", "Commission Receivable", "Purchase Return", "Petty Cash",
  "Capital", "Debtors Recover", "Interest Received", "Rent Received", "Discount Received",
  "Commission Received", "Other Income", "Service Income", "Donation"];
const OUT_NAMES = ["Purchases", "Rent", "Sales Return", "Petty Expense", "Transport",
  "Creditors Recover", "Wages", "Salary", "Electricity", "Water", "Telephone", "Internet",
  "Repairs", "Insurance", "Advertising", "Stationery", "Postage", "Cleaning", "Security",
  "Fuel", "Maintenance", "Accounting Fees", "Legal Fees", "Bad Debts", "Carriage", "Customs",
  "Licence", "Delivery", "Printing", "Bank Charges"];
const NEUTRAL_NAMES = ["Loan", "Other"];
const CONTRA_NAMES = ["Cash Withdrawal", "Cash Deposit"];
const ALL_TXN_NAMES = IN_NAMES.concat(OUT_NAMES, NEUTRAL_NAMES, CONTRA_NAMES);

/* The fourteen stock causes, in the four groups, exactly page 399's own table. */
const STOCK_GROUPS = [
  { dir: "IN", money: "OUT", label: "Stock IN - With Money", causes: ["Purchases", "Sales Returns"] },
  { dir: "IN", money: null, label: "Stock IN - Without Money", causes: ["Free Stock Received", "Stock Transfers IN", "Stock Adjustments IN"] },
  { dir: "OUT", money: "IN", label: "Stock OUT - With Money", causes: ["Sales", "Purchases Returns"] },
  { dir: "OUT", money: null, label: "Stock OUT - Without Money", causes: ["Stock Damage", "Stock Expiry", "Theft", "Internal Use", "Free Samples", "Stock Transfers OUT", "Stock Adjustments OUT"] }
];
const STOCK_CAUSES = [];
STOCK_GROUPS.forEach(function (g) { g.causes.forEach(function (c) { STOCK_CAUSES.push({ name: c, dir: g.dir, money: g.money }); }); });

/* The module map (421): the modules the AI may reach and their hub pages. */
const MODULE_MAP = [
  { key: "business", label: "Business", hub: 2, hubFolder: "business", folders: ["business", "add-transaction", "view-file"] },
  { key: "stock", label: "Stock Management", hub: 396, hubFolder: "stock-management", folders: ["stock-register", "stock-progress", "stock-change"] },
  { key: "health", label: "Health", hub: 321, hubFolder: "health", folders: ["health"] },
  { key: "medical", label: "The Medical Wing", hub: 330, hubFolder: "ward-management", folders: ["victim-registration", "triage", "nurse-consultation", "doctor-consultation", "pharmacy", "treatment-procedures", "patient-module"] },
  { key: "wing2", label: "Admissions and Discharges", hub: 340, hubFolder: "patient-admission", folders: ["patient-admission", "patient-discharge"] },
  { key: "wing3", label: "Laboratory", hub: 360, hubFolder: "laboratory", folders: ["laboratory"] },
  { key: "wing4", label: "Radiology", hub: 370, hubFolder: "radiology", folders: ["radiology"] },
  { key: "computer", label: "Computer", hub: 62, hubFolder: "computer", folders: ["computer", "convertor", "tool"] }
];

/* The AI pages of the family (408, 421): every AI number the sidebar shows,
 * served by THIS one folder - no other AI folder exists. The pages guide
 * below is built from this list, and ?m=<number> opens a page directly. */
const AI_PAGES = [
  { n: 329, hub: true, label: "AI", about: "The AI hub - the doorway to every AI capability, all inside this one folder." },
  { n: 339, desk: "ai-chat", label: "AI Conversation", about: "The conversation screen: messages and attachments on one side, confirmation cards, tool outputs and status on the other, scrolled to the newest." },
  { n: 344, desk: "ai-input-bar", label: "Input Bar", about: "The up-arrow send button: deactivated while empty, blue once text or a valid file is there, locked while the AI works." },
  { n: 345, desk: "ai-attachments", label: "Attachments", about: "Images and documents may ride with any message - no storage limit, no size limit, no upload count limit." },
  { n: 346, desk: "ai-blocked-uploads", label: "Blocked Uploads", about: "Video and audio are refused at once with a clear notice, before the send button ever activates." },
  { n: 347, desk: "ai-image-reading", label: "Image Reading", about: "A photographed receipt, invoice, photo or handwritten note is read into the exact fields the target module expects." },
  { n: 348, desk: "ai-document-reading", label: "Document Reading", about: "PDF, Word, Excel, CSV, text and archives are read into the exact fields, tables and entries the target module expects." },
  { n: 349, desk: "ai-languages", label: "Languages", about: "Swahili, English or a mix are read the same way - 'nimeuza 500' lands exactly like 'sales 500'." },
  { n: 354, desk: "ai-business", label: "AI for Business", about: "Sales, purchases, expenses, income, contra entries, debtors and creditors mapped to their exact transaction names, types, amounts and methods." },
  { n: 355, desk: "ai-add-transaction", label: "AI Add Transaction", about: "The AI fills the Add Transaction form the manual page uses, through one confirmation before anything saves." },
  { n: 356, desk: "ai-cash-default", label: "Cash Default Rule", about: "Cash is the default payment method whenever the user does not say one." },
  { n: 357, desk: "ai-batch-business", label: "Batch Business", about: "Many business items in one message are extracted into one confirmation summary." },
  { n: 358, desk: "ai-contra", label: "AI Contra Entries", about: "Cash Withdrawal and Cash Deposit written as CONTRA - no type, no payment method." },
  { n: 359, desk: "ai-debtors-creditors", label: "AI Debtors & Creditors", about: "Credit sales and purchases find their debtor or creditor and settle against them." },
  { n: 364, desk: "ai-stock", label: "AI for Stock", about: "Registrations, movements, packages and units and the balance - the whole stock desk through the AI." },
  { n: 365, desk: "ai-stock-register-write", label: "AI Stock Register", about: "Stock registered with its name, units present, buying price, units per package and unit selling price, exactly like the manual register." },
  { n: 366, desk: "ai-stock-movement-write", label: "AI Stock Movements", about: "The fourteen stock causes write their movement and the transaction that belongs to it, in one batch." },
  { n: 367, desk: "ai-packages-units", label: "AI Packages & Units", about: "Packages and units calculate each other through Units per Package wherever a quantity is typed." },
  { n: 368, desk: "ai-batch-stock", label: "AI Batch Stock", about: "Many stock movements in one message, extracted into one confirmation summary." },
  { n: 369, desk: "ai-stock-balance", label: "AI Stock Balance", about: "The balance never goes below zero - every movement is checked before it is written." },
  { n: 374, desk: "ai-health", label: "AI for Health", about: "Registration, triage, consultations, pharmacy, wards, admissions, laboratory and radiology through the AI." },
  { n: 375, desk: "ai-patient-registration", label: "AI Patient Registration", about: "Patients registered with the exact fields the manual registration page uses." },
  { n: 376, desk: "ai-triage-consultation", label: "AI Triage & Consultation", about: "Triage notes and nurse or doctor consultations mapped to their own collections." },
  { n: 377, desk: "ai-pharmacy-treatment", label: "AI Pharmacy & Treatment", about: "Prescriptions and treatments written the way the pharmacy and treatment pages write them." },
  { n: 378, desk: "ai-wards-beds", label: "AI Wards & Beds", about: "Wards, beds, occupancy and transfers through the AI, into the ward pages' own collections." },
  { n: 379, desk: "ai-admission-discharge", label: "AI Admission & Discharge", about: "Admissions and discharges mapped to the admission and discharge pages' own collections." },
  { n: 381, desk: "ai-computer", label: "AI for Computer", about: "Attach a file and say what it should become - the AI names the exact built-in tool and runs it." },
  { n: 382, desk: "ai-tool-matcher", label: "AI Tool Matcher", about: "The matcher names the exact built-in tool for the request, or says honestly that none exists." },
  { n: 383, desk: "ai-convert-documents", label: "AI Document Conversions", about: "Document to document and document to data conversions, through the real tools." },
  { n: 384, desk: "ai-convert-data", label: "AI Data Conversions", about: "CSV, Excel, JSON and friends converted both ways, with the result as a download link." },
  { n: 385, desk: "ai-convert-images", label: "AI Image Conversions", about: "Image format, size and compression changes through the built-in tools." },
  { n: 386, desk: "ai-convert-audio-video", label: "AI Audio & Video", about: "The computer tools that touch audio and video files - while attachments of them stay refused at the input (346)." },
  { n: 387, desk: "ai-convert-archives", label: "AI Archive Work", about: "Zip and archive listing, extraction and creation through the built-in tools." },
  { n: 388, desk: "ai-convert-ebooks", label: "AI Ebook Conversions", about: "Epub, mobi, pdf and the friends of each, converted through the built-in tools." },
  { n: 389, desk: "ai-convert-web", label: "AI Web & Code", about: "HTML, markdown and code conversions through the built-in tools." },
  { n: 390, desk: "ai-file-viewer", label: "AI File Viewer Link", about: "Any picked file is named by its type and handed to the All File Viewer (393) every page trusts." },
  { n: 391, desk: "ai-convert-delivery", label: "AI File Delivery", about: "Every finished tool run returns a download link for the result." },
  { n: 392, desk: "ai-tool-status", label: "AI Tool Status", about: "The run states - matched, running, done, failed - shown honestly on every tool run." },
  { n: 394, desk: "ai-clarification", label: "AI Clarification", about: "When a request is short, the AI asks one clear question instead of guessing." },
  { n: 395, desk: "ai-confirmation", label: "AI Confirmation", about: "One confirmation summary per action: the exact fields, amounts and targets, before anything saves." },
  { n: 400, desk: "ai-execute", label: "AI Executor", about: "The executor runs the confirmed action through the manual pages' own collections and validation." },
  { n: 401, desk: "ai-cancel", label: "AI Cancel & Discard", about: "Cancel at the confirmation card and nothing at all is written." },
  { n: 402, desk: "ai-feedback", label: "AI Feedback", about: "After completion the AI reports exactly what was written, where, and with which identity." },
  { n: 403, desk: "ai-errors", label: "AI Error Handling", about: "Failures say what failed, why, and what to do next - nothing is ever half-written." },
  { n: 404, ref: "grants", label: "AI Grants", about: "The AI only reaches the modules the logged-in user is permitted to open." },
  { n: 405, ref: "admin-controls", label: "AI Admin Controls", about: "The administrator controls: what the AI may do for the whole organisation." },
  { n: 406, ref: "wiring", label: "AI Wiring", about: "The AI connects through /502.js only - requireAuth, Google authentication, Firestore - exactly like every other page." },
  { n: 407, ref: "home-button", label: "AI Home Button", about: "The AI button on the Home Screen opens the hub at /ai/329." },
  { n: 408, ref: "sidebar", label: "AI Sidebar Entry", about: "The sidebar shows the AI family under the one AI folder, with the grant filter." },
  { n: 409, desk: "ai-queries", label: "AI Queries", about: "Questions are answered from the user's own data - read only, never written by a question." },
  { n: 410, desk: "ai-lab-radiology", label: "AI Lab & Radiology", about: "Laboratory and imaging requests run through the AI like the manual pages run them." },
  { n: 411, desk: "ai-batch-engine", label: "AI Batch Engine", about: "The shared batch engine extracts many items into one summary, for every desk." },
  { n: 412, ref: "collections", label: "AI Collection Map", about: "The map of every Firestore collection the AI may touch - and what it writes there." },
  { n: 413, ref: "validation", label: "AI Validation Wall", about: "The exact validation the manual pages use, applied to every AI write." },
  { n: 414, ref: "audit", label: "AI Audit Trail", about: "Every AI write carries the logged-in user's identity and the timestamp." },
  { n: 415, ref: "defaults", label: "AI Defaults", about: "The defaults used when the user does not say: Cash, type IN, the active user." },
  { n: 416, ref: "session", label: "AI Session", about: "The session the AI reads - the same one the Home Screen and the sidebar read." },
  { n: 417, ref: "history", label: "AI History", about: "Every finished action is retrievable through the aiHistory collection." },
  { n: 418, ref: "attachment-store", label: "AI Attachment Store", about: "Attachments stored without size or count limits; video and audio refused at the door." },
  { n: 419, ref: "cards", label: "AI Card Library", about: "The card library: intro, clarify, confirm, tool, answer, done, error, route, status." },
  { n: 420, ref: "mappings", label: "AI Example Mappings", about: "Example requests and the exact mappings they produce, shown openly." },
  { n: 421, ref: "module-map", label: "AI Module Map", about: "The map of the manual modules the AI may reach and their hub pages." },
  { n: 422, ref: "status", label: "AI Status Model", about: "Ready, Processing, Needs-confirmation - one status line, always honest." },
  { n: 423, ref: "help", label: "AI Help", about: "Help and the worked examples of what to type." },
];


/* child folder -> the folder whose grant opens it (the same inheritance the
 * sidebar and the Home Screen apply). */
const GRANT_PARENT = {
  "ward-registration": "ward-management", "bed-management": "ward-management",
  "ward-occupancy": "ward-management", "bed-assignment": "ward-management",
  "ward-bed-transfers": "ward-management", "cleaning-maintenance": "ward-management",
  "ward-register": "ward-management", "bed-transfer-history": "ward-management",
  "new-admission": "patient-admission", "admission-list": "patient-admission",
  "admission-details": "patient-admission", "start-discharge": "patient-discharge",
  "discharge-list": "patient-discharge", "discharge-details": "patient-discharge",
  "new-lab-request": "laboratory", "lab-request-list": "laboratory",
  "lab-workbench": "laboratory", "new-imaging-request": "radiology",
  "imaging-requests": "radiology", "imaging-workbench": "radiology", "tool": "convertor",
  "ai": "ai"
};

/* The collection map (412): every Firestore collection the AI may write,
 * the exact collections the manual forms write to and nothing else. */
const COLLECTION_MAP = [
  ["Business", ["transactions"]],
  ["Stock", ["stockItems", "stockChanges", "transactions"]],
  ["Health and the Medical Wing", ["healthRegistrations", "healthTriage", "healthNurseConsultations",
    "healthDoctorConsultations", "healthPrescriptions", "healthTreatmentOrders", "healthDestinations",
    "healthWards", "healthBeds", "healthBedAssignments", "healthBedTransfers", "healthBedMaintenance",
    "healthAdmissions", "healthDischarges", "healthLabRequests", "healthImagingRequests", "healthQueueConfig"]],
  ["AI", ["aiHistory"]]
];

/* The defaults table (415). */
const DEFAULTS = [
  ["Payment method", "Cash", "whenever a request mentions neither Credit nor Bank"],
  ["Money comes in", "type IN at Unit Selling Price", "stock movement with money flowing in (Sales, Purchases Returns)"],
  ["Money goes out", "type OUT at Buying Price", "stock movement with money flowing out (Purchases, Sales Returns)"],
  ["No money moves", "type NEUTRAL at Buying Price, no flow method", "stock movement without money (damage, expiry, theft, transfers and friends)"],
  ["Contra", "the bank name is required", "Cash Withdrawal and Cash Deposit move money between cash and bank"],
  ["Bank Charges", "its own separate record", "a withdrawal or a bank payment that carries charges saves the charge as its own record"]
];

/* Tool registry placeholder — the build fills it verbatim from /tool/64.js
 * so the AI matcher sees the same 255 tools the Convertor hub shows. */
var TOOL_FAMILIES = [
    ["Text Conversion Tools", "📄", [
      [1, "Text to PDF", "text-to-pdf", 65],
      [2, "PDF to Text", "pdf-to-text", 66],
      [3, "Text to Word", "text-to-word", 67],
      [4, "Word to Text", "word-to-text", 68],
      [5, "Text to HTML", "text-to-html", 69],
      [6, "HTML to Text", "html-to-text", 70],
      [7, "Text to Markdown", "text-to-markdown", 71],
      [8, "Markdown to Text", "markdown-to-text", 72],
      [9, "Markdown to PDF", "markdown-to-pdf", 73],
      [10, "PDF to Markdown", "pdf-to-markdown", 74],
      [11, "Text to RTF", "text-to-rtf", 75],
      [12, "RTF to Text", "rtf-to-text", 76],
      [13, "Text to CSV", "text-to-csv", 77],
      [14, "CSV to Text", "csv-to-text", 78],
      [15, "Text to XML", "text-to-xml", 79],
      [16, "XML to Text", "xml-to-text", 80],
      [17, "Text to JSON", "text-to-json", 81],
      [18, "JSON to Text", "json-to-text", 82],
      [19, "Text to YAML", "text-to-yaml", 83],
      [20, "YAML to Text", "yaml-to-text", 84],
    ]],
    ["PDF Tools", "📕", [
      [21, "Word to PDF", "word-to-pdf", 85],
      [22, "PDF to Word", "pdf-to-word", 86],
      [23, "Excel to PDF", "excel-to-pdf", 87],
      [24, "PDF to Excel", "pdf-to-excel", 88],
      [25, "PowerPoint to PDF", "powerpoint-to-pdf", 89],
      [26, "PDF to PowerPoint", "pdf-to-powerpoint", 90],
      [27, "Image to PDF", "image-to-pdf", 91],
      [28, "PDF to Image", "pdf-to-image", 92],
      [29, "HTML to PDF", "html-to-pdf", 93],
      [30, "PDF to HTML", "pdf-to-html", 94],
      [31, "PDF Merge", "pdf-merge", 95],
      [32, "PDF Split", "pdf-split", 96],
      [33, "PDF Compress", "pdf-compress", 97],
      [34, "PDF Rotate", "pdf-rotate", 98],
      [35, "PDF Crop", "pdf-crop", 99],
      [36, "PDF Delete Pages", "pdf-delete-pages", 100],
      [37, "PDF Extract Pages", "pdf-extract-pages", 101],
      [38, "PDF Reorder Pages", "pdf-reorder-pages", 102],
      [39, "PDF Add Page Numbers", "pdf-add-page-numbers", 103],
      [40, "PDF Add Watermark", "pdf-add-watermark", 104],
      [41, "PDF Protect", "pdf-protect", 105],
      [42, "PDF Unlock", "pdf-unlock", 106],
      [43, "PDF Sign", "pdf-sign", 107],
      [44, "PDF Fill Forms", "pdf-fill-forms", 108],
      [45, "PDF Flatten", "pdf-flatten", 109],
      [46, "PDF Compare", "pdf-compare", 110],
      [47, "PDF Repair", "pdf-repair", 111],
      [48, "PDF Metadata Editor", "pdf-metadata-editor", 112],
      [49, "PDF to PDF/A", "pdf-to-pdf-a", 113],
      [50, "OCR PDF", "ocr-pdf", 114],
    ]],
    ["Word and Document Tools", "📘", [
      [51, "DOC to DOCX", "doc-to-docx", 115],
      [52, "DOCX to DOC", "docx-to-doc", 116],
      [53, "DOCX to PDF", "docx-to-pdf", 117],
      [54, "PDF to DOCX", "pdf-to-docx", 118],
      [55, "DOCX to TXT", "docx-to-txt", 119],
      [56, "TXT to DOCX", "txt-to-docx", 120],
      [57, "DOCX to HTML", "docx-to-html", 121],
      [58, "HTML to DOCX", "html-to-docx", 122],
      [59, "DOCX to RTF", "docx-to-rtf", 123],
      [60, "RTF to DOCX", "rtf-to-docx", 124],
      [61, "DOCX to Markdown", "docx-to-markdown", 125],
      [62, "Markdown to DOCX", "markdown-to-docx", 126],
      [63, "DOCX to ODT", "docx-to-odt", 127],
      [64, "ODT to DOCX", "odt-to-docx", 128],
      [65, "DOCX to EPUB", "docx-to-epub", 129],
      [66, "EPUB to DOCX", "epub-to-docx", 130],
    ]],
    ["Spreadsheet and Data Tools", "📊", [
      [67, "Excel to CSV", "excel-to-csv", 131],
      [68, "CSV to Excel", "csv-to-excel", 132],
      [69, "PDF to Excel", "pdf-to-excel-2", 134],
      [70, "XLS to XLSX", "xls-to-xlsx", 135],
      [71, "XLSX to XLS", "xlsx-to-xls", 136],
      [72, "XLSX to ODS", "xlsx-to-ods", 137],
      [73, "ODS to XLSX", "ods-to-xlsx", 138],
      [74, "CSV to JSON", "csv-to-json", 139],
      [75, "JSON to CSV", "json-to-csv", 140],
      [76, "CSV to XML", "csv-to-xml", 141],
      [77, "XML to CSV", "xml-to-csv", 142],
      [78, "Excel to JSON", "excel-to-json", 143],
      [79, "JSON to Excel", "json-to-excel", 144],
      [80, "Excel to HTML", "excel-to-html", 145],
      [81, "HTML Table to Excel", "html-table-to-excel", 146],
      [82, "TSV to CSV", "tsv-to-csv", 147],
      [83, "CSV to TSV", "csv-to-tsv", 148],
      [84, "Excel to Text", "excel-to-text", 149],
      [85, "Text to Excel", "text-to-excel", 150],
    ]],
    ["Presentation Tools", "📽️", [
      [86, "PPT to PPTX", "ppt-to-pptx", 151],
      [87, "PPTX to PPT", "pptx-to-ppt", 152],
      [88, "PowerPoint to PDF", "powerpoint-to-pdf-2", 153],
      [89, "PDF to PowerPoint", "pdf-to-powerpoint-2", 154],
      [90, "PowerPoint to Images", "powerpoint-to-images", 155],
      [91, "Images to PowerPoint", "images-to-powerpoint", 156],
      [92, "PPTX to Video", "pptx-to-video", 157],
      [93, "PPTX to Text", "pptx-to-text", 158],
      [94, "Text to PowerPoint", "text-to-powerpoint", 159],
      [95, "PPTX to HTML", "pptx-to-html", 160],
    ]],
    ["Image Tools", "🖼️", [
      [96, "JPG to PNG", "jpg-to-png", 161],
      [97, "PNG to JPG", "png-to-jpg", 162],
      [98, "JPG to WebP", "jpg-to-webp", 163],
      [99, "WebP to JPG", "webp-to-jpg", 164],
      [100, "PNG to WebP", "png-to-webp", 165],
      [101, "WebP to PNG", "webp-to-png", 166],
      [102, "JPG to GIF", "jpg-to-gif", 167],
      [103, "GIF to JPG", "gif-to-jpg", 168],
      [104, "GIF to PNG", "gif-to-png", 169],
      [105, "BMP to JPG", "bmp-to-jpg", 170],
      [106, "JPG to BMP", "jpg-to-bmp", 171],
      [107, "TIFF to JPG", "tiff-to-jpg", 172],
      [108, "JPG to TIFF", "jpg-to-tiff", 173],
      [109, "SVG to PNG", "svg-to-png", 174],
      [110, "PNG to SVG", "png-to-svg", 175],
      [111, "SVG to JPG", "svg-to-jpg", 176],
      [112, "HEIC to JPG", "heic-to-jpg", 177],
      [113, "HEIC to PNG", "heic-to-png", 178],
      [114, "AVIF to JPG", "avif-to-jpg", 179],
      [115, "JPG to ICO", "jpg-to-ico", 180],
      [116, "ICO to PNG", "ico-to-png", 181],
      [117, "Image Compressor", "image-compressor", 182],
      [118, "Image Resizer", "image-resizer", 183],
      [119, "Image Cropper", "image-cropper", 184],
      [120, "Image Rotator", "image-rotator", 185],
      [121, "Image Flipper", "image-flipper", 186],
      [122, "Image Watermark", "image-watermark", 187],
      [123, "Image to Base64", "image-to-base64", 188],
      [124, "Base64 to Image", "base64-to-image", 189],
      [125, "Image Metadata Viewer", "image-metadata-viewer", 190],
      [126, "OCR Image to Text", "ocr-image-to-text", 191],
    ]],
    ["Audio Tools", "🎵", [
      [127, "MP3 to WAV", "mp3-to-wav", 192],
      [128, "WAV to MP3", "wav-to-mp3", 193],
      [129, "MP3 to AAC", "mp3-to-aac", 194],
      [130, "AAC to MP3", "aac-to-mp3", 195],
      [131, "MP3 to OGG", "mp3-to-ogg", 196],
      [132, "OGG to MP3", "ogg-to-mp3", 197],
      [133, "WAV to FLAC", "wav-to-flac", 198],
      [134, "FLAC to WAV", "flac-to-wav", 199],
      [135, "M4A to MP3", "m4a-to-mp3", 200],
      [136, "MP3 to M4A", "mp3-to-m4a", 201],
      [137, "Audio Compressor", "audio-compressor", 202],
      [138, "Audio Trimmer", "audio-trimmer", 203],
      [139, "Audio Merger", "audio-merger", 204],
      [140, "Audio to Text", "audio-to-text", 205],
      [141, "Text to Speech", "text-to-speech", 206],
      [142, "Audio Format Inspector", "audio-format-inspector", 207],
      [143, "Audio Speed Changer", "audio-speed-changer", 208],
      [144, "Audio Volume Adjuster", "audio-volume-adjuster", 209],
    ]],
    ["Video Tools", "🎬", [
      [145, "MP4 to AVI", "mp4-to-avi", 210],
      [146, "AVI to MP4", "avi-to-mp4", 211],
      [147, "MP4 to MOV", "mp4-to-mov", 212],
      [148, "MOV to MP4", "mov-to-mp4", 213],
      [149, "MP4 to WebM", "mp4-to-webm", 214],
      [150, "WebM to MP4", "webm-to-mp4", 215],
      [151, "MKV to MP4", "mkv-to-mp4", 216],
      [152, "MP4 to GIF", "mp4-to-gif", 217],
      [153, "Video to Images", "video-to-images", 218],
      [154, "Images to Video", "images-to-video", 219],
      [155, "Video Compressor", "video-compressor", 220],
      [156, "Video Trimmer", "video-trimmer", 221],
      [157, "Video Merger", "video-merger", 222],
      [158, "Video Resizer", "video-resizer", 223],
      [159, "Video Rotator", "video-rotator", 224],
      [160, "Video to Audio", "video-to-audio", 225],
      [161, "Video Subtitle Extractor", "video-subtitle-extractor", 226],
      [162, "SRT to VTT", "srt-to-vtt", 227],
      [163, "VTT to SRT", "vtt-to-srt", 228],
      [164, "Video Metadata Viewer", "video-metadata-viewer", 229],
    ]],
    ["Ebook and Publishing Tools", "📚", [
      [165, "EPUB to PDF", "epub-to-pdf", 230],
      [166, "PDF to EPUB", "pdf-to-epub", 231],
      [167, "EPUB to TXT", "epub-to-txt", 232],
      [168, "TXT to EPUB", "txt-to-epub", 233],
      [169, "EPUB to HTML", "epub-to-html", 234],
      [170, "HTML to EPUB", "html-to-epub", 235],
      [171, "MOBI to EPUB", "mobi-to-epub", 236],
      [172, "EPUB to MOBI", "epub-to-mobi", 237],
      [173, "Ebook Metadata Editor", "ebook-metadata-editor", 238],
    ]],
    ["Web and Code Tools", "🌐", [
      [174, "HTML to XHTML", "html-to-xhtml", 239],
      [175, "XHTML to HTML", "xhtml-to-html", 240],
      [176, "HTML to Markdown", "html-to-markdown", 241],
      [177, "Markdown to HTML", "markdown-to-html", 242],
      [178, "HTML to PDF", "html-to-pdf-2", 243],
      [179, "JSON Formatter", "json-formatter", 244],
      [180, "JSON Minifier", "json-minifier", 245],
      [181, "XML Formatter", "xml-formatter", 246],
      [182, "XML Minifier", "xml-minifier", 247],
      [183, "YAML to JSON", "yaml-to-json", 248],
      [184, "JSON to YAML", "json-to-yaml", 249],
      [185, "XML to JSON", "xml-to-json", 250],
      [186, "JSON to XML", "json-to-xml", 251],
      [187, "CSV to SQL", "csv-to-sql", 252],
      [188, "SQL to CSV", "sql-to-csv", 253],
      [189, "SQL Formatter", "sql-formatter", 254],
      [190, "CSS Minifier", "css-minifier", 255],
      [191, "CSS Beautifier", "css-beautifier", 256],
      [192, "JavaScript Minifier", "javascript-minifier", 257],
      [193, "JavaScript Beautifier", "javascript-beautifier", 258],
      [194, "HTML Minifier", "html-minifier", 259],
      [195, "HTML Beautifier", "html-beautifier", 260],
    ]],
    ["Archive and Compression Tools", "🗜️", [
      [196, "ZIP Extractor", "zip-extractor", 261],
      [197, "Create ZIP", "create-zip", 262],
      [198, "TAR Extractor", "tar-extractor", 263],
      [199, "Create TAR", "create-tar", 264],
      [200, "GZIP Compressor", "gzip-compressor", 265],
      [201, "GZIP Decompressor", "gzip-decompressor", 266],
      [202, "ZIP to TAR", "zip-to-tar", 267],
      [203, "TAR to ZIP", "tar-to-zip", 268],
      [204, "Archive Content Viewer", "archive-content-viewer", 269],
      [205, "File Compressor", "file-compressor", 270],
      [206, "File Extractor", "file-extractor", 271],
    ]],
    ["File Utilities", "🧰", [
      [207, "File Type Detector", "file-type-detector", 272],
      [208, "MIME Type Checker", "mime-type-checker", 273],
      [209, "File Size Converter", "file-size-converter", 274],
      [210, "File Checksum Generator", "file-checksum-generator", 275],
      [211, "Duplicate File Checker", "duplicate-file-checker", 276],
      [212, "File Renamer", "file-renamer", 277],
      [213, "Batch File Renamer", "batch-file-renamer", 278],
      [214, "File Metadata Viewer", "file-metadata-viewer", 279],
      [215, "Base64 Encoder", "base64-encoder", 280],
      [216, "Base64 Decoder", "base64-decoder", 281],
      [217, "URL Encoder", "url-encoder", 282],
      [218, "URL Decoder", "url-decoder", 283],
      [219, "QR Code Generator", "qr-code-generator", 284],
      [220, "QR Code Reader", "qr-code-reader", 285],
      [221, "Barcode Generator", "barcode-generator", 286],
      [222, "Barcode Reader", "barcode-reader", 287],
      [223, "UUID Generator", "uuid-generator", 288],
      [224, "Timestamp Converter", "timestamp-converter", 289],
    ]],
    ["Document and Office Utilities", "🗂️", [
      [225, "Word Counter", "word-counter", 290],
      [226, "Character Counter", "character-counter", 291],
      [227, "Line Counter", "line-counter", 292],
      [228, "Text Case Converter", "text-case-converter", 293],
      [229, "Find and Replace", "find-and-replace", 294],
      [230, "Text Diff Checker", "text-diff-checker", 295],
      [231, "Document Merger", "document-merger", 296],
      [232, "Document Splitter", "document-splitter", 297],
      [233, "Document Page Counter", "document-page-counter", 298],
      [234, "Document Metadata Editor", "document-metadata-editor", 299],
      [235, "Spell Checker", "spell-checker", 300],
      [236, "Grammar Checker", "grammar-checker", 301],
      [237, "Document Watermark", "document-watermark", 302],
      [238, "Page Numbering Tool", "page-numbering-tool", 303],
      [239, "Document Template Generator", "document-template-generator", 304],
    ]],
    ["Number and Data Formats", "🔢", [
      [240, "Date Format Converter", "date-format-converter", 305],
      [241, "Time Format Converter", "time-format-converter", 306],
      [242, "Unix Timestamp Converter", "unix-timestamp-converter", 307],
      [243, "Number to Words", "number-to-words", 308],
      [244, "Words to Number", "words-to-number", 309],
      [245, "Roman Numeral Converter", "roman-numeral-converter", 310],
      [246, "Decimal to Binary", "decimal-to-binary", 311],
      [247, "Binary to Decimal", "binary-to-decimal", 312],
      [248, "Decimal to Hexadecimal", "decimal-to-hexadecimal", 313],
      [249, "Hexadecimal to Decimal", "hexadecimal-to-decimal", 314],
      [250, "Decimal to Octal", "decimal-to-octal", 315],
      [251, "Octal to Decimal", "octal-to-decimal", 316],
      [252, "JSON Validator", "json-validator", 317],
      [253, "XML Validator", "xml-validator", 318],
      [254, "CSV Validator", "csv-validator", 319],
      [255, "Data Format Converter", "data-format-converter", 320],
    ]]
  ];

function flatTools() {
  const out = [];
  (TOOL_FAMILIES || []).forEach(function (f) {
    (f[2] || []).forEach(function (t) {
      out.push({ id: t[0], label: t[1], slug: t[2], n: t[3], family: f[0] });
    });
  });
  return out;
}

/* Tools that need parameters beyond the file itself: the AI names the tool
 * and hands the user to the tool page instead of guessing. */
const PARAM_TOOLS = ["image-resizer", "image-cropper", "image-rotator", "image-flipper",
  "image-watermark", "audio-compressor", "audio-trimmer", "audio-merger", "audio-speed-changer",
  "audio-volume-adjuster", "video-compressor", "video-trimmer", "video-merger", "video-resizer",
  "video-rotator", "pdf-rotate", "pdf-crop", "pdf-delete-pages", "pdf-extract-pages",
  "pdf-reorder-pages", "pdf-add-page-numbers", "pdf-add-watermark", "pdf-protect", "pdf-unlock",
  "pdf-sign", "pdf-fill-forms", "pdf-metadata-editor", "document-watermark", "page-numbering-tool",
  "document-metadata-editor", "document-splitter", "find-and-replace", "text-case-converter",
  "image-to-base64", "base64-to-image", "text-to-speech", "barcode-generator", "qr-code-generator"];

function esc(v) {
  return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}
function money(n) {
  return Number(n || 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
}

/* ---------- the Text-to-PDF tool, executed in the page (391) ----------
 *
 * A real PDF 1.4 document built from text with no library: Courier body,
 * Helvetica-Bold title, A4 pages, an exact xref table. Pure on purpose -
 * the Node test writes the same bytes to disk and re-opens them with
 * pdftotext, so what ships is what was proven. */
function textToPdf(title, content) {
  const latin = function (s) {
    let out = "";
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      if (c === 9) out += "    ";
      else out += (c >= 32 && c <= 126) || (c >= 160 && c <= 255) ? s[i] : "?";
    }
    return out;
  };
  const escS = function (s) {
    return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  };
  const PW = 595, PH = 842, MT = 64, MB = 56, LH = 14, WRAP = 86;
  const wrap = function (s) {
    const words = String(s || "").replace(/\t/g, "    ").split(/ +/);
    const out = [];
    let line = "";
    for (let i = 0; i < words.length; i++) {
      let w = words[i];
      if (w.length > WRAP) {
        if (line) { out.push(line); line = ""; }
        while (w.length > WRAP) { out.push(w.slice(0, WRAP)); w = w.slice(WRAP); }
        line = w;
        continue;
      }
      if (!line) line = w;
      else if (line.length + 1 + w.length <= WRAP) line += " " + w;
      else { out.push(line); line = w; }
    }
    if (line) out.push(line);
    if (!out.length) out.push("");
    return out;
  };
  const titleLine = latin(String(title || "Document")).slice(0, 90);
  /* every source line keeps its own row: split on the newlines first, wrap
   * each row, and a blank line stays a blank line */
  const body = [];
  String(content || "").replace(/\r\n?/g, "\n").split("\n").forEach(function (rl) {
    const ws = wrap(latin(rl));
    for (let i = 0; i < ws.length; i++) body.push(ws[i]);
  });
  const perPage = Math.floor((PH - MT - MB - 18) / LH);
  const pages = [];
  for (let i = 0; i < body.length; i += perPage) pages.push(body.slice(i, i + perPage));
  if (!pages.length) pages.push([""]);
  const objects = [];
  const kids = pages.map(function (_, k) { return String(6 + 2 * k) + " 0 R"; }).join(" ");
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = "<< /Type /Pages /Kids [" + kids + "] /Count " + pages.length + " >>";
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>";
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";
  pages.forEach(function (lines, k) {
    const ops = [];
    if (k === 0) ops.push("BT /F2 13 Tf 56 " + (PH - 48) + " Td (" + escS(titleLine) + ") Tj ET");
    ops.push("BT /F1 10 Tf 56 " + (PH - MT - (k === 0 ? 18 : 0)) + " Td " + LH + " TL");
    for (let j = 0; j < lines.length; j++) ops.push("(" + escS(lines[j]) + ") Tj T*");
    ops.push("ET");
    const data = ops.join("\n");
    const ci = 5 + 2 * k, pi = 6 + 2 * k;
    objects[ci] = "<< /Length " + data.length + " >>\nstream\n" + data + "\nendstream";
    objects[pi] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + PW + " " + PH + "] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents " + ci + " 0 R >>";
  });
  let out = "%PDF-1.4\n";
  const offsets = [];
  for (let i = 1; i < objects.length; i++) {
    offsets[i] = out.length; /* Latin-1 only: one char is one byte */
    out += i + " 0 obj\n" + objects[i] + "\nendobj\n";
  }
  const xref = out.length;
  out += "xref\n0 " + objects.length + "\n0000000000 65535 f \n";
  for (let i = 1; i < objects.length; i++) {
    out += ("0000000000" + String(offsets[i])).slice(-10) + " 00000 n \n";
  }
  out += "trailer\n<< /Size " + objects.length + " /Root 1 0 R >>\nstartxref\n" + xref + "\n%%EOF";
  return { pdf: out, pages: pages.length };
}

/* ---------- language: Swahili, English or a mix (349) ---------- */

/* [regex, transactionName, implied type]. Multi-word and more specific
 * patterns sit first so "purchase return" never lands on "Purchases". */
const LEX = [
  [/purchase returns?\b|reremji la kuinunua/, "Purchase Return", "IN"],
  [/sales returns?\b/, "Sales Return", "OUT"],
  [/debtors? recover|debtor paid|alipwa deni/, "Debtors Recover", "IN"],
  [/creditors? recover|creditor paid/, "Creditors Recover", "OUT"],
  [/bank charges|ada ya benki|tozati ya benki/, "Bank Charges", "OUT"],
  [/cash withdrawal|nimekutoa (pesa|cash|fedha)|nimetoa (benki|bank)|kutoa benki/, "Cash Withdrawal", "CONTRA"],
  [/cash deposit|nimekuweka|nimeweka (benki|bank)|kuweka benki|\bdeposit\b/, "Cash Deposit", "CONTRA"],
  [/rent received|nimepokea kodi/, "Rent Received", "IN"],
  [/interest received|nimepokea riba|\briba\b/, "Interest Received", "IN"],
  [/discount received|punguzo/, "Discount Received", "IN"],
  [/commission receivable/, "Commission Receivable", "IN"],
  [/commission received|kamisheni/, "Commission Received", "IN"],
  [/petty cash/, "Petty Cash", "IN"],
  [/petty expense|matumizi madogo/, "Petty Expense", "OUT"],
  [/capital|mtaji/, "Capital", "IN"],
  [/donation|mchango/, "Donation", "IN"],
  [/service income|malipo ya huduma/, "Service Income", "IN"],
  [/other income|ingizo lingine|kipato lingine/, "Other Income", "IN"],
  [/accounting fees/, "Accounting Fees", "OUT"],
  [/legal fees/, "Legal Fees", "OUT"],
  [/bad debts/, "Bad Debts", "OUT"],
  [/purchases?\b|bought|nimenunua|nunua/, "Purchases", "OUT"],
  [/sold\b|\bsell(?:s|ing)?\b|nimeuza|mauzo|kuuza|\bsales?\b/, "Sales", "IN"],
  [/rent paid|nimelipa kodi|kulipa kodi|\brent\b|\bkodi\b/, "Rent", "OUT"],
  [/wages|majira/, "Wages", "OUT"],
  [/salaries?|mshahara/, "Salary", "OUT"],
  [/electricity|stima|umeme/, "Electricity", "OUT"],
  [/\bwater\b|maji/, "Water", "OUT"],
  [/telephone|simu/, "Telephone", "OUT"],
  [/internet/, "Internet", "OUT"],
  [/repairs?|marekebisho/, "Repairs", "OUT"],
  [/insurance|bima/, "Insurance", "OUT"],
  [/advertising|tangazo/, "Advertising", "OUT"],
  [/stationery|vifaa vya ofisi/, "Stationery", "OUT"],
  [/postage|stampu/, "Postage", "OUT"],
  [/cleaning|usafi/, "Cleaning", "OUT"],
  [/security|usalama/, "Security", "OUT"],
  [/\bfuel\b|mafuta/, "Fuel", "OUT"],
  [/maintenance|matunzo/, "Maintenance", "OUT"],
  [/carriage/, "Carriage", "OUT"],
  [/customs|forodha/, "Customs", "OUT"],
  [/licen[cs]e|leseni/, "Licence", "OUT"],
  [/delivery|usafirishaji/, "Delivery", "OUT"],
  [/printing|kuchapisha/, "Printing", "OUT"],
  [/transport|usafiri/, "Transport", "OUT"],
  [/\bloan\b|mkopo/, "Loan", "NEUTRAL"],
  [/\bother\b|nyingine/, "Other", "NEUTRAL"]
];

function lexMatch(text) {
  const t = " " + String(text || "").toLowerCase() + " ";
  for (let i = 0; i < LEX.length; i++) {
    if (LEX[i][0].test(t)) return { name: LEX[i][1], type: LEX[i][2] };
  }
  return null;
}

/* "nimeuza 500" — the amount is the last plain number in the segment.
 * Links and mixed tokens never count as money: the 6 inside paste.rs/DDR6F
 * is part of an address, and a record amount is always a number of its own. */
function parseAmount(text) {
  const cleaned = String(text || "").replace(/https?:\/\/\S+|www\.\S+/gi, " ");
  const toks = cleaned.split(/\s+/);
  let last = null;
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i].replace(/^["'(\[]+/, "").replace(/[.,!?;:)"'\]]+$/, "");
    if (/^\d[\d,]*(?:\.\d+)?$/.test(t)) last = t;
  }
  if (last === null) return null;
  const v = Number(last.replace(/,/g, ""));
  return isFinite(v) && v > 0 ? Math.round(v * 100) / 100 : null;
}

function methodOf(text) {
  const t = String(text || "").toLowerCase();
  const bank = /\b(bank|benki|cheque|cheki|transfer|uhamisho)\b/.test(t);
  const credit = /\b(credit|deni|badaea|badaaye)\b/.test(t);
  if (bank && credit) return "both";
  if (bank) return "Bank";
  if (credit) return "Credit";
  return null; /* the Cash default (356) applies only when nothing is named */
}

/* A person or bank name: kwa / from / to / at followed by capitalised words. */
function nameAfter(text) {
  const m = String(text || "").match(/(?:\bkwa\b|\bfrom\b|\bto\b|\bat\b)\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)?)/);
  return m ? m[1].trim() : null;
}

/* Batch engine (411): the one extraction pass behind every multi-item
 * confirmation. Splits on new lines, semicolons and " and then ". */
function splitSegments(text) {
  const raw = String(text || "");
  let parts = raw.split(/\r?\n|;|(?:\band then\b)/g)
    .map(function (s) { return s.replace(/^\s*\d+[\.\)]\s*/, "").trim(); })
    .filter(function (s) { return s.length > 0; });
  if (parts.length <= 1) {
    /* a single line may still carry several "name 100, name 200" entries */
    const byComma = raw.split(",").map(function (s) { return s.trim(); })
      .filter(function (s) { return /\d/.test(s); });
    if (byComma.length > 1) parts = byComma;
  }
  return parts;
}

/* One business segment -> one candidate record (page 3's fields). */
function parseBusinessSegment(seg) {
  const hit = lexMatch(seg);
  const amount = parseAmount(seg);
  if (!hit) {
    /* owner consumption - "nimekula kashata 1", "eaten by business owner":
     * the closest page-3 record is Petty Expense OUT on Cash, and the item
     * the dictionaries do not know rides to the web search (webTerm) */
    if (guessOwnerUse(seg)) {
      if (amount == null) return { ok: false, need: "amount", seg: seg, hit: { name: "Petty Expense", type: "OUT" } };
      return { ok: true, seg: seg, kind: "plain", charges: null, webTerm: webTermFromSegment(seg),
        rec: { transactionName: "Petty Expense", transactionType: "OUT", flowMethod: "Cash", name: null, amount: amount } };
    }
    return { ok: false, need: "name", seg: seg };
  }
  if (amount == null) return { ok: false, need: "amount", seg: seg, hit: hit };
  let method = methodOf(seg);
  if (method === "both") return { ok: false, need: "method", seg: seg, hit: hit };
  const who = nameAfter(seg);
  let flowMethod = method || "Cash"; /* 356: the Cash default */
  let name = null, kind = "plain";
  if (hit.type === "CONTRA") {
    flowMethod = "Bank"; /* page 3's own contra shape */
    if (!who) return { ok: false, need: "bank", seg: seg, hit: hit, method: "Bank" };
    name = who; kind = "contra";
  } else if (hit.type === "NEUTRAL") {
    flowMethod = "N/A"; /* page 3's neutral shape */
    name = null;
  } else if (hit.name === "Debtors Recover" || hit.name === "Creditors Recover") {
    if (!who) return { ok: false, need: "person", seg: seg, hit: hit };
    name = who; kind = "recover";
    if (flowMethod === "Credit") return { ok: false, need: "recoverMethod", seg: seg, hit: hit };
  } else if (flowMethod === "Credit") {
    if (!who) return { ok: false, need: "person", seg: seg, hit: hit };
    name = who; kind = "credit";
  } else if (flowMethod === "Bank") {
    if (!who) return { ok: false, need: "bank", seg: seg, hit: hit, method: "Bank" };
    name = who; kind = "bank";
  }
  const charges = /\bcharges?\b|\bada\b/.test(seg.toLowerCase()) &&
    (flowMethod === "Bank" || hit.type === "CONTRA");
  return {
    ok: true, seg: seg, kind: kind, charges: charges ? "clarify" : null,
    rec: { transactionName: hit.name, transactionType: hit.type, flowMethod: flowMethod, name: name, amount: amount }
  };
}

/* Stock register segment (365): Name, Units Present, Buying Price per
 * Package, Units per Package, Unit Selling Price. */
function parseStockRegisterSegment(seg) {
  const nameM = String(seg).match(/(?:item|stock|bidhaa|named|called|ya|for)\s+([A-Za-z][A-Za-z0-9 ]{1,39}?)(?=\s*[:,;]|\s+with\b|\s+units\b|\s+buy\b|\s+package\b|\s+sell\b|$)/i);
  const itemName = nameM ? nameM[1].trim() : null;
  const grab = function (re) {
    const m = String(seg).match(re);
    return m ? Number(m[1].replace(/,/g, "")) : null;
  };
  const units = grab(/(\d[\d,]*)\s*(?:units?|pieces?|vipande)/i);
  const buy = grab(/(?:buy(?:ing)?|kununua)[^\d]*(\d[\d,]*)/i);
  const upp = grab(/package\s*(?:of|ya)?\s*(\d[\d,]*)/i) || grab(/(\d[\d,]*)\s*(?:units?|pieces?)\s*(?:per|kwa)\s*package/i);
  const sell = grab(/(?:sell(?:ing)?|kuuza)[^\d]*(\d[\d,]*)/i);
  if (!itemName) return { ok: false, need: "itemName", seg: seg };
  if (units == null || buy == null || upp == null || sell == null) {
    const missing = [];
    if (units == null) missing.push("Units Present");
    if (buy == null) missing.push("Buying Price per Package");
    if (upp == null) missing.push("Units per Package");
    if (sell == null) missing.push("Unit Selling Price");
    return { ok: false, need: "stockFields", missing: missing, seg: seg, partial: { name: itemName, units: units, buyPrice: buy, unitsPerPackage: upp, unitPrice: sell } };
  }
  return { ok: true, seg: seg, rec: { name: itemName, units: units, buyPrice: buy, unitsPerPackage: upp, unitPrice: sell } };
}

/* Stock movement segment (366, 367): cause, item, units or packages. */
function parseStockMovementSegment(seg) {
  const t = " " + String(seg).toLowerCase() + " ";
  let cause = null;
  for (let i = 0; i < STOCK_CAUSES.length; i++) {
    const c = STOCK_CAUSES[i].name.toLowerCase();
    if (t.indexOf(" " + c + " ") !== -1 ||
        (c === "purchases" && /\b(bought|nimenunua)\b/.test(t)) ||
        (c === "sales" && /\b(sold|nimeuza)\b/.test(t))) { cause = STOCK_CAUSES[i]; break; }
  }
  if (!cause) return { ok: false, need: "cause", seg: seg };
  const itemM = String(seg).match(/(?:\bfor\b|\bof\b|\bya\b|\bstock\b)\s+([A-Za-z][A-Za-z0-9 ]{1,39}?)(?=\s*(?:,|$|\d))/i);
  const itemName = itemM ? itemM[1].trim() : null;
  const unitsM = String(seg).match(/(\d[\d,]*)\s*(?:units?|pieces?|vipande)/i);
  const packsM = String(seg).match(/(\d[\d,]*)\s*(?:packages?|pakiti|packs?)\b/i);
  if (!itemName) return { ok: false, need: "stockName", seg: seg, cause: cause };
  if (unitsM == null && packsM == null) return { ok: false, need: "quantity", seg: seg, cause: cause, stockName: itemName };
  return {
    ok: true, seg: seg, cause: cause, stockName: itemName,
    units: unitsM ? Number(unitsM[1].replace(/,/g, "")) : null,
    packages: packsM ? Number(packsM[1].replace(/,/g, "")) : null
  };
}

/* The read-only question engine (409). */
function detectQuery(text) {
  const t = " " + String(text || "").toLowerCase() + " ";
  const regId = String(text || "").match(/\b\d{4}[A-HJ-NP-Z]{4}\b/);
  if (regId) return { kind: "patient-status", regId: regId[0] };
  if (/(cash|money|pesa).*(today|leo)|today.*(cash|sales)|how much.*(made|came in) today|paid out.*(today|leo)|today.*paid out|(bank|benki)\b.*(today|leo)/.test(t)) {
    if (/\bspent\b|expenses|matumizi|paid out/.test(t)) return { kind: "out-today" };
    if (/\bbank\b|benki/.test(t)) return { kind: "bank-today" };
    return { kind: "cash-today" };
  }
  if (/check stock|stock (for|of|level)|angalia (stoki|stock)/.test(t)) {
    const m = String(text).match(/(?:stock (?:for|of)|angalia stoki ya)\s+([A-Za-z][A-Za-z0-9 ]{1,39})/i);
    return { kind: "stock-check", name: m ? m[1].trim() : null };
  }
  return null;
}

/* ---------- files: kinds, the upload guard, tool matching (346, 382) ---------- */

const VIDEO_RE = /\.(mp4|mov|mkv|avi|webm|wmv|flv|m4v|3gp|mpg|mpeg|ts)$/i;
const AUDIO_RE = /\.(mp3|wav|m4a|aac|ogg|oga|flac|wma|opus|amr)$/i;

function isBlockedUpload(fileName, mime) {
  const m = String(mime || "").toLowerCase();
  if (m.indexOf("video/") === 0 || m.indexOf("audio/") === 0) return true;
  return VIDEO_RE.test(String(fileName || "")) || AUDIO_RE.test(String(fileName || ""));
}

function fileKindOf(fileName, mime) {
  const n = String(fileName || "").toLowerCase();
  const m = String(mime || "").toLowerCase();
  if (m.indexOf("image/") === 0 || /\.(png|jpe?g|gif|webp|bmp|tiff?|heic|avif|ico|svg)$/.test(n)) return "image";
  if (m === "application/pdf" || /\.pdf$/.test(n)) return "pdf";
  if (/\.(csv|tsv)$/.test(n)) return "csv";
  if (/\.(xlsx?|ods)$/.test(n)) return "excel";
  if (/\.(docx?|odt|rtf)$/.test(n)) return "word";
  if (/\.(txt|md|markdown|json|xml|ya?ml|html?|sql|css|js)$/.test(n)) return "text";
  if (/\.(zip|tar|gz|tgz|7z|rar)$/.test(n)) return "archive";
  if (/\.(epub|mobi)$/.test(n)) return "ebook";
  if (/\.(pptx?|ppt)$/.test(n)) return "presentation";
  if (m.indexOf("video/") === 0 || VIDEO_RE.test(n)) return "video";
  if (m.indexOf("audio/") === 0 || AUDIO_RE.test(n)) return "audio";
  return "other";
}

const NEEDS = [
  { re: /\bword\b|\bdocx?\b/, ext: "word", label: "Word" },
  { re: /excel|xlsx?\b|spreadsheet/, ext: "excel", label: "Excel" },
  { re: /powerpoint|pptx?\b|slides?/, ext: "powerpoint", label: "PowerPoint" },
  { re: /\bcsv\b/, ext: "csv", label: "CSV" },
  { re: /\bpdf\b/, ext: "pdf", label: "PDF" },
  { re: /\btext\b|\btxt\b/, ext: "text", label: "Text" },
  { re: /markdown|\bmd\b/, ext: "markdown", label: "Markdown" },
  { re: /\bhtml?\b|web page/, ext: "html", label: "HTML" },
  { re: /\bimage\b|\bpng\b|\bjpe?g\b|picture|photo/, ext: "image", label: "Image" },
  { re: /\bepub\b/, ext: "epub", label: "EPUB" },
  { re: /\bjson\b/, ext: "json", label: "JSON" },
  { re: /\bxml\b/, ext: "xml", label: "XML" },
  { re: /\byaml\b/, ext: "yaml", label: "YAML" },
  { re: /\bsql\b/, ext: "sql", label: "SQL" },
  { re: /\bzip\b/, ext: "zip", label: "ZIP" },
  { re: /compress|smaller|ndogo/, ext: "compress", label: "Compressed" },
  { re: /extract|unpack|open (the )?archive/, ext: "extract", label: "Extracted" }
];

function matchTool(fileKind, needText) {
  const tools = flatTools();
  const need = String(needText || "").toLowerCase();
  let targetExt = null;
  for (let i = 0; i < NEEDS.length; i++) {
    if (NEEDS[i].re.test(need)) { targetExt = NEEDS[i].ext; break; }
  }
  if (!targetExt) return null;
  const slash = fileKind + "-to-" + targetExt;
  let hit = tools.filter(function (t) { return t.slug === slash; })[0];
  if (!hit && targetExt === "word") hit = tools.filter(function (t) { return t.slug === fileKind + "-to-docx"; })[0];
  if (!hit && targetExt === "text") hit = tools.filter(function (t) { return t.slug === fileKind + "-to-txt"; })[0];
  if (!hit && targetExt === "compress") {
    const pref = { pdf: "pdf-compress", image: "image-compressor", video: "video-compressor", audio: "audio-compressor" };
    hit = tools.filter(function (t) { return t.slug === (pref[fileKind] || "file-compressor"); })[0];
  }
  if (!hit && targetExt === "extract") {
    const pref = { zip: "zip-extractor", archive: "file-extractor" };
    hit = tools.filter(function (t) { return t.slug === (pref[fileKind] || "file-extractor"); })[0];
  }
  if (!hit && targetExt === "image" && fileKind === "pdf") hit = tools.filter(function (t) { return t.slug === "pdf-to-image"; })[0];
  if (!hit) return null;
  return hit;
}

/* ---------- validation wall (413): the forms' own rules ---------- */

function validateBusinessItem(rec) {
  if (!rec.transactionName || ALL_TXN_NAMES.indexOf(rec.transactionName) === -1) return "Unknown transaction name.";
  if (!(rec.amount > 0)) return "The amount must be more than zero.";
  if (rec.transactionType === "CONTRA" && !rec.name) return "A contra entry needs the bank name.";
  if (rec.flowMethod === "Credit" &&
      (rec.transactionName === "Debtors Recover" || rec.transactionName === "Creditors Recover")) {
    return "A recovery takes Cash or Bank only - Credit is not available there (page 3's own rule).";
  }
  if (rec.flowMethod === "Credit" && rec.transactionType !== "NEUTRAL" && !rec.name) return "A Credit entry needs the person's name.";
  if (rec.flowMethod === "Bank" && rec.transactionType !== "NEUTRAL" && rec.transactionType !== "CONTRA" && !rec.name) return "A Bank entry needs the bank name.";
  if (rec.flowMethod === "N/A" && rec.transactionType !== "NEUTRAL") return "Only a NEUTRAL record carries no flow method.";
  return null;
}

function validateStockRegisterItem(rec) {
  if (!rec.name || !String(rec.name).trim()) return "The item name is required.";
  if (!(rec.buyPrice > 0)) return "Buying Price per Package must be more than zero.";
  if (!(rec.unitsPerPackage > 0)) return "Units per Package must be more than zero.";
  if (!(rec.unitPrice > 0)) return "Unit Selling Price must be more than zero.";
  if (!(rec.units >= 0)) return "Units Present cannot be negative.";
  return null;
}

function validateStockMovement(item, freshUnits) {
  if (!(item.units > 0)) return "The quantity must be more than zero.";
  if (item.cause.dir === "OUT" && item.units > freshUnits) {
    return "Only " + freshUnits + " unit(s) present - the stock balance never goes below zero (369).";
  }
  return null;
}

/* ---------- the reference generators ---------- */

function makeRegId(used) {
  const D = "0123456789", L = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  let id = "";
  for (let t = 0; t < 200; t++) {
    id = "";
    for (let i = 0; i < 4; i++) id += D[Math.floor(Math.random() * 10)];
    for (let i = 0; i < 4; i++) id += L[Math.floor(Math.random() * 24)];
    if (!used.has(id)) return id;
  }
  return id;
}

function makeCode(prefix, used) {
  const D = "0123456789", L = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const day = new Date();
  const ds = day.getFullYear() + String(day.getMonth() + 1).padStart(2, "0") + String(day.getDate()).padStart(2, "0");
  for (let t = 0; t < 5; t++) {
    let code = "";
    for (let i = 0; i < 4; i++) code += (i < 2 ? D[Math.floor(Math.random() * 10)] : L[Math.floor(Math.random() * 24)]);
    const cand = prefix + "-" + ds + "-" + code;
    if (!used.has(cand)) return cand;
  }
  return prefix + "-" + ds + "-" + Date.now().toString(36).toUpperCase().slice(-5);
}

/* The sixteen registration fields, page 322's own document shape. */
function patientDoc(f, regId) {
  return {
    regId: regId,
    isUnidentified: !!f.isUnidentified,
    fullName: f.fullName || "",
    dob: f.dob || "",
    age: f.age === "" || f.age == null ? "" : Number(f.age),
    sex: f.sex || "",
    phone: f.phone || "",
    address: f.address || "",
    emergencyContact: f.emergencyContact || "",
    arrivalAt: f.arrivalAt || "",
    savedAt: new Date().toISOString(),
    incidentType: f.incidentType || "",
    incidentDescription: f.incidentDescription || "",
    department: f.department || "",
    priority: f.priority || "",
    staff: f.staff || "",
    referral: f.referral || "No",
    referredBy: f.referral === "Yes" ? (f.referredBy || "") : "",
    payment: f.payment || ""
  };
}

/* Pages 341 / 351 / 361 / 371 document shapes. */
function admissionDoc(f, num) {
  return {
    admissionNumber: num, patientId: f.patientId, patientName: f.patientName,
    patientAge: f.patientAge == null ? "" : f.patientAge, patientSex: f.patientSex || "",
    admissionDate: f.admissionDate, admissionTime: f.admissionTime,
    admissionType: f.admissionType, reason: f.reason, diagnosis: f.diagnosis || "",
    doctorName: f.doctorName || "", clinicalNotes: f.clinicalNotes || "",
    status: f.confirm ? "Admitted" : "Pending",
    statusHistory: [{ status: f.confirm ? "Admitted" : "Pending", at: new Date().toISOString(), by: f.staff || "", note: f.confirm ? "Admission confirmed" : "Admission saved as pending" }],
    createdBy: f.staff || ""
  };
}
function dischargeDoc(f, num) {
  const decision = f.decision || "Awaiting Authorization";
  const status = decision === "Approved for Discharge" ? "Approved" : "Pending Authorization";
  const now = new Date().toISOString();
  return {
    dischargeNumber: num, patientId: String(f.patientId || ""), patientName: String(f.patientName || ""),
    patientAge: f.patientAge || "", patientSex: f.patientSex || "",
    admissionDocId: f.admissionDocId || "", admissionNumber: String(f.admissionNumber || ""),
    admissionDate: String(f.admissionDate || ""), admissionTime: String(f.admissionTime || ""),
    wardId: "", wardCode: "", bedId: "", bedNumber: "",
    decision: decision, status: status, reason: f.reason || "",
    clinician: f.clinician || "", notes: f.notes || "",
    checklist: [
      { key: "review", label: "Required clinical review completed", state: "Pending", by: "", at: "" },
      { key: "rx", label: "Prescriptions reviewed", state: "Pending", by: "", at: "" },
      { key: "meds", label: "Discharge medication arranged", state: "Pending", by: "", at: "" },
      { key: "instr", label: "Discharge instructions prepared", state: "Pending", by: "", at: "" },
      { key: "followup", label: "Follow-up appointment recorded", state: "Pending", by: "", at: "" },
      { key: "caregiver", label: "Patient or caregiver instructions documented", state: "Pending", by: "", at: "" },
      { key: "docs", label: "Relevant documents prepared", state: "Pending", by: "", at: "" },
      { key: "admin", label: "Required administrative steps completed", state: "Pending", by: "", at: "" }
    ],
    medicationNote: "",
    instructions: { general: "", medication: "", clinic: "", when: "", notes: "", provided: false, providedBy: "", providedAt: "" },
    recordedBy: f.staff || "",
    statusHistory: [{ status: status, at: now, by: f.staff || "", note: decision === "Approved for Discharge" ? "Discharge opened and authorized" : "Discharge opened - awaiting authorization" }],
    createdAt: now
  };
}
function labDoc(f, num) {
  return {
    requestNumber: num, patientId: String(f.patientId), patientName: f.patientName,
    patientAge: f.patientAge == null ? "" : f.patientAge, patientSex: f.patientSex || "",
    requestingDepartment: f.department, requestingClinician: f.clinician,
    clinicalInfo: f.clinicalInfo || "", priority: f.priority || "Routine",
    status: "Requested",
    specimen: { type: "", status: "Awaiting Collection", collectedAt: "", collectedBy: "", note: "" },
    tests: (f.tests || []).map(function (t) {
      return { name: t, status: "Pending", result: "", unit: "", refRange: "", abnormal: false, critical: false, enteredBy: "", enteredAt: "" };
    })
  };
}
function imagingDoc(f, num) {
  return {
    requestNumber: num, patientId: String(f.patientId), patientName: f.patientName,
    patientAge: f.patientAge == null ? "" : f.patientAge, patientSex: f.patientSex || "",
    requestingDepartment: f.department, requestingClinician: f.clinician,
    clinicalInfo: f.clinicalInfo || "", priority: f.priority || "Routine",
    status: "Requested",
    appointment: { date: "", time: "", room: "", status: "", reason: "" },
    procedures: (f.procedures || []).map(function (t) {
      return { name: t, status: "Pending", note: "", performedBy: "", performedAt: "" };
    })
  };
}

/* The example mappings (420). */
const EXAMPLE_MAPPINGS = [
  { request: "nimeuza 500", lands: "Business Add Transaction (3)", fields: "Sales, type IN, amount 500, method Cash (the Cash default)", rule: "356" },
  { request: "bought stock for Duka kwa 12000 bank", lands: "Business Add Transaction (3)", fields: "Purchases, type OUT, amount 12000, method Bank, bank Duka", rule: "354" },
  { request: "cash withdrawal 3000 from NBC, charges 500", lands: "Business Add Transaction (3)", fields: "Cash Withdrawal, CONTRA, bank NBC, 3000 + a separate Bank Charges record of 500", rule: "358" },
  { request: "register stock sugar: 50 units, buy 2000, package of 10, sell 5", lands: "Stock Register (397)", fields: "name Sugar, units 50, buyPrice 2000, unitsPerPackage 10, unitPrice 5", rule: "365" },
  { request: "sales 6 units of sugar", lands: "Stock Change (399)", fields: "Stock OUT with money: cause Sales, 6 units at Unit SP, stockItems units deducted, transaction + stockChanges saved", rule: "366" },
  { request: "register patient John Juma, 34, male", lands: "Registration (322)", fields: "the sixteen registration fields and a fresh Registration ID", rule: "375" },
  { request: "admit patient 4827ABCD emergency, chest pain", lands: "New Admission (341)", fields: "the admission record with number ADM-..., status Admitted or Pending", rule: "379" },
  { request: "how much cash did we make today?", lands: "the read-only question engine", fields: "live sums of today's Cash IN records - nothing is modified", rule: "409" },
  { request: "PDF + \"Convert to Word\"", lands: "PDF to Word (86)", fields: "the tool runs in the conversation and the file returns as a download link", rule: "381" }
];

/* The help card (423). */
const HELP_EXAMPLES = [
  ["Record a sale", "nimeuza 500"],
  ["Record an expense", "paid rent 20000 kwa Landlord"],
  ["Contra", "cash withdrawal 3000 from NBC"],
  ["Register stock", "register stock sugar: 50 units, buy 2000, package of 10, sell 5"],
  ["Move stock", "sales 6 units of sugar"],
  ["Check a balance", "check stock for sugar"],
  ["Register a patient", "register patient John Juma, 34, male"],
  ["Admit a patient", "admit patient 4827ABCD emergency chest pain"],
  ["Convert a file", "attach a PDF and write: convert to word"],
  ["Analyse an attachment", "attach it, then ask: what does this say? - the files, the system and the web answer in one card"],
  ["Ask the web", "maana ya kashata"],
  ["Say you are unwell", "naumwa malaria"]
];

/* ---------- the chat layer and the web search (pure, testable) ---------- */

/* Owner consumption - "nimekula kashata 1", "eaten by business owner": the
 * owner or staff ate or used the goods themselves. It is still a record:
 * page 3's closest name is Petty Expense, and the item word rides to the
 * web search so the answer comes back with real meaning. */
const OWNER_USE_RE = /nimekula|nimetumia|nilitumia|tulikula|umekula|amekula|tumika|\bkula\b|kulwa|eaten|consumed|\bate\b|personal use|used by (the )?(owner|boss|me)|owner (took|ate|used|eaten|consumed)|took for (himself|herself|personal)/i;
const WEB_STOP = ("the and for with from that this these those there here " +
  "kwa ya na wa za cha vya kya mpaka hadi pia then also very sana tafadhali please " +
  "owner boss business personal madam sir " +
  "cash pesa money benki bank account card " +
  "eaten consume consumed use used using took take taken kulwa kula tumika nimekula nimetumia nilitumia tulikula umekula amekula " +
  "record records write save saved enter " +
  "naumwa anaumwa tunaumwa umewa mgonjwa sick ill unwell feeling feels maumivu kikohozi kutapika harisha " +
  "nina una ana tuna mna nili uli ali tuli mli sasa hapa leo jana kesho hii hiyo ndiyo hapana labda").split(" ");

function guessOwnerUse(text) {
  return OWNER_USE_RE.test(String(text || ""));
}

/* the one word of a segment the dictionaries do not know - the web search
 * term ("kashata" out of "nimekula kashata 1") */
function webTermFromSegment(seg) {
  const words = String(seg || "").toLowerCase().replace(/[^a-z0-9\s'-]/g, " ").split(/\s+/)
    .filter(function (w) { return w.length > 2; })
    .filter(function (w) { return !/^\d/.test(w); })
    .filter(function (w) { return WEB_STOP.indexOf(w) === -1; })
    .filter(function (w) { return !LEX.some(function (e) { return e[0].test(" " + w + " "); }); });
  if (!words.length) return null;
  return words.sort(function (a, b) { return b.length - a.length; })[0];
}

/* The meaningful words of a request for the internal system search: the
 * same stop-word filter the web term uses, numbers kept out (the amount is
 * matched on its own), lower-cased and de-duplicated, capped at eight. */
function searchTermsOf(text) {
  const seen = {};
  const words = String(text || "").toLowerCase().replace(/[^a-z0-9\s'-]/g, " ").split(/\s+/)
    .filter(function (w) { return w.length > 2 && !/^\d/.test(w); })
    .filter(function (w) { return WEB_STOP.indexOf(w) === -1; })
    .filter(function (w) { return !LEX.some(function (e) { return e[0].test(" " + w + " "); }); });
  words.forEach(function (w) { seen[w] = true; });
  return Object.keys(seen).slice(0, 8);
}

/* Human file size for the previews and the chips. */
function bytesOf(n) {
  const v = Number(n || 0);
  if (v >= 1073741824) return (Math.round(v / 107374182.4) / 10) + " GB";
  if (v >= 1048576) return (Math.round(v / 104857.6) / 10) + " MB";
  if (v >= 1024) return Math.max(1, Math.round(v / 1024)) + " KB";
  return v + " B";
}

/* Friendly kind name for the previews and the chips. */
function kindLabel(kind) {
  const map = { image: "Image", pdf: "PDF document", csv: "CSV table", excel: "Spreadsheet",
    word: "Word document", text: "Text file", archive: "Archive", ebook: "Ebook",
    presentation: "Presentation", video: "Video", audio: "Audio", other: "File" };
  return map[kind] || "File";
}

/* "maana ya kashata" -> kashata; "what is cassava" -> cassava */
function termFromQuestion(text) {
  let t = String(text || "").toLowerCase().replace(/[?!.]+$/g, "").trim();
  t = t.replace(/^\s*(?:what|who)\s+(?:is|are|was|were)\s+/i, "")
    .replace(/^\s*nini\s+maana\s+ya\s+/i, "")
    .replace(/^\s*maana\s+(?:ya|za)\s+/i, "")
    .replace(/\s+(?:maana|meaning)\s+(?:ya|of)\s+/i, " ")
    .replace(/^\s*(?:explain|eleza|define|tafsiri)\s+(?:me\s+|kwa\s+kiswahili\s+)?/i, "")
    .replace(/^\s*(?:the|a|an)\s+/i, "")
    .replace(/\s+(?:nini|what)\s*$/i, "")
    .trim();
  if (!t) return null;
  return t.split(/\s+/).slice(0, 6).join(" ");
}

const GREET_RE = /\b(?:habari|mambo|jambo|shikamoo|salama|hello|hi|hey|niaje|sema|poa|good\s*(?:morning|afternoon|evening)|habari\s+za\s+(?:asubuhi|mchana|jioni))\b/i;
const THANKS_RE = /\b(?:asante|asanteni|shukrani|thanks?|thank\s+you)\b/i;
const CAPS_RE = /\b(?:who\s+are\s+you|what\s+can\s+you\s+do|what\s+do\s+you\s+do|unaweza\s+(?:kufanya\s+)?nini|nini\s+unaweza|msaada|what\s+is\s+this)\b/i;
const ASK_RE = /\b(?:what|who)\s+(?:is|are|was|were)\b|\bmeaning\s+of\b|\bmaana\s+ya\b|\bnini\s+maana\b|\bmaana\s+nini\b|\beleza\b|\bexplain\b|\bdefine\b|\btafsiri\b|\?\s*$/i;

/* the file request (381, 391): "naomba pdf ya <link>" / "make a pdf of
 * this" - a real Convertor run, not a record. A transaction always wins
 * first: a dictionary hit together with an amount, an owner-use sentence
 * or a standing question is never a file request. */
const FILE_REQ_RE = /(?:\b(?:naomba|tengeneza|nitengee|nipatie|nipe|nitake|umba|make|create|generate|give\s?me|produce|build)\b[\s\S]{0,30}\b(?:pdf|faili|file|hati|document|doc|nakala)\b)|(?:\b(?:pdf|faili|file|hati|document|doc|nakala)\b[\s\S]{0,20}\b(?:ya|la|wa|kwa|of|from)\b)|(?:\b(?:pdf|faili|file|hati)\s+(?:ya|of)\b)/i;

function parseFileRequest(text) {
  const t = String(text || "").trim();
  if (!t || !FILE_REQ_RE.test(t)) return null;
  if ((lexMatch(t) && parseAmount(t)) || guessOwnerUse(t) || detectQuery(t)) return null;
  const fmt = /\bpdf\b/i.test(t) ? "pdf" : "txt";
  const URL_RE = /https?:\/\/[^\s|"'<>]+|www\.[^\s|"'<>]+/i;
  const um = t.match(URL_RE);
  const url = um ? um[0].replace(/[.,)\]]+$/, "") : null;
  const inline = t.replace(URL_RE, " ")
    .replace(/\b(?:naomba|tengeneza|nitengee|nipatie|nipe|nitake|umba|please|kindly|make|create|generate|give|produce|build|me|a|the|one)\b/gi, " ")
    .replace(/\b(?:pdf|faili|file|hati|document|doc|nakala|txt|text)\b/gi, " ")
    .replace(/\b(?:ya|la|wa|kwa|of|from|out)\b/gi, " ")
    .replace(/\s+/g, " ").trim();
  return { fmt: fmt, url: url, inline: inline };
}

/* greetings, thanks, capabilities and open questions are chat - answered
 * directly or through the web search, never into a clarification loop.
 * A transaction always wins first: any dictionary hit or a money amount. */
function classifyChat(text) {
  const t = String(text || "").trim();
  if (!t) return null;
  if (lexMatch(t) || parseAmount(t)) return null;
  if (CAPS_RE.test(t)) return { kind: "caps" };
  if (THANKS_RE.test(t)) return { kind: "thanks" };
  if (GREET_RE.test(t) && t.length <= 40) return { kind: "greet" };
  if (ASK_RE.test(t)) return { kind: "ask", term: termFromQuestion(t) || t };
  return null;
}

function chatReply(kind) {
  if (kind === "greet") return "Habari! Ready - write below, Swahili or English.";
  if (kind === "thanks") return "Karibu! Ready for the next one.";
  return "I record business, stock and health actions, run the file tools and search the web. Try: nimeuza 500.";
}

/* wellbeing and open words (the world outside the desks): a person saying
 * they are unwell and the bare words nobody maps are never answered with
 * "which record is this?" - they are heard, looked up on the open web and
 * answered in relation to the system. The desk commands that must never be
 * intercepted sit in one place so the desks keep every real request. */
const SICK_RE = /\b(?:naumwa|anaumwa|tunaumwa|umewa|mgonjwa|magonjwa|homa|maradhi|maumivu|kikohozi|kutapika|harisha|kichwa\s+inauma|tumbo\s+inauma|sick|unwell|illness|fever|malaria|typhoid|cholera|tuberculosis|diarrho?ea|vomiting|headache|migraine|dengue|anaemia|anemia)\b/i;
const DESK_CMD_RE = /\b(?:register|sajili|admit|admission|discharge|ruhusa|triage|nurse|nursing|doctor|daktari|pharmacy|dawa|prescription|prescribe|treatment|matibabu|wards?|beds?|chumba|patient|mgonjwa\s+mpya|new\s+patient|lab|laboratory|maabara|imaging|radiology|x-?ray|ultrasound|stock|bidhaa|packages?|balance|movement|movements|damage|expiry|theft|samples?|transfers?)\b/i;

function isSickStatement(text) {
  const t = String(text || "");
  return SICK_RE.test(t) && !DESK_CMD_RE.test(t);
}

/* the open-text gate: no transaction word, no amount, no owner use, no desk
 * command - the words the desks do not parse belong to the conversation and
 * the web, never to the record question */
function isOpenText(text) {
  const t = String(text || "").trim();
  if (!t) return false;
  if (lexMatch(t) || parseAmount(t)) return false;
  if (guessOwnerUse(t)) return false;
  if (DESK_CMD_RE.test(t) || WANTS_CONVERT.test(t)) return false;
  return true;
}

function openReply() {
  return "I could not reach that on the open web just now, and it is not a record the system keeps. Write a record like nimeuza 500 - or ask the meaning of any word, for example maana ya kashata.";
}

/* ---------- the system's own knowledge (421) ----------
 * Questions pointed at JAMALI itself are answered from here, never from the
 * open web - on the web "Jamal Multisystem" is a cancelled video game
 * console, and the system is never explained by strangers. Everything in
 * this block is the system's own truth, the same words the README and the
 * module map (421) carry. */
const SYSTEM_KB = {
  name: "JAMALI - Jamal Multisystem Management",
  summary: "JAMALI is the system I live in: plain, honest bookkeeping for a small trading business, a Health desk that grew into a full medical wing, 256 file and data converter tools, stock management, and me - the AI. A static, zero-build web app, live at https://jamali-lime.vercel.app, signed in with Google, every record kept in the organisation's own Firestore through the same wiring every page uses (406).",
  families: [
    { label: "Bookkeeping (pages 1-61)", about: "sales, purchases, expenses, income, the cashbook, the creditors book (16), the debtors book (17), inventory valuation by FIFO and weighted average (46), aging and financial reports - the business books." },
    { label: "Computer - the 256 converters (hub 62, tools 65-320)", about: "one tool per page: PDF, Word, Excel, CSV, JSON, images, dates, times, text, numbers, archives and friends - and the AI runs the same tools from this conversation (381)." },
    { label: "Health and the medical wing (pages 321-393)", about: "the health hub (321), patient registration (322), triage (323), nurse and doctor consultations, pharmacy, treatment and procedures (327), wards and beds (330), admissions and discharges (340), laboratory (360), radiology (370), the All File Viewer (393)." },
    { label: "Stock management (pages 396-399)", about: "the stock register, movements under the fourteen causes, packages and units, and a balance that never goes below zero (369)." },
    { label: "AI (pages 329-423, this folder)", about: "one folder and one engine - this one: conversation with attachments, image and document reading, the business, stock, health and computer desks, one confirmation before anything saves, read-only queries (409), history, audit and grants (404)." }
  ],
  me: "I am JAMALI AI, built into this system. I read Swahili, English or both: write a record like nimeuza 500 and I map it to the exact transaction, show one confirmation, then save through the manual pages' own validation - or ask me anything, attach any file, or hand me a link to convert."
};

/* the system question (421): "do you know jamal multisystem", "who are you",
 * "what can you do", "hii app ni nini" - the words that point at the system
 * itself. The desk command words never reach here: the desks parse first,
 * so "register patient Jamal" stays a patient, not a system tour. */
const SYS_Q_RE = /\b(?:jamali|jamal\b|multisystem|multi\s*system|this\s+(?:system|app|site|page)|hii\s+(?:app|system|site|tovuti)|mfumo|hii\s+ni\s+nini|your\s+(?:name|system|features|abilities|skills|capabilities)|who\s+(?:are|made|built)\s+you|what\s+(?:are\s+you|can\s+you\s+do|do\s+you\s+do|is\s+(?:this|jamali|jamal))|unaweza\s+(?:kufanya\s+)?nini|nini\s+unaweza|msaada|jina\s+lako|wewe\s+ni\s+nani)\b/i;

function systemAnswer(text) {
  const t = String(text || "").trim();
  if (!t || !SYS_Q_RE.test(t)) return null;
  /* what remains after the system words and the small question words are
   * lifted out decides pure (answered from the knowledge alone) against
   * mixed (the knowledge rides along with the searches) */
  const rest = t.toLowerCase()
    .replace(/[?!.]+/g, " ")
    .replace(SYS_Q_RE, " ")
    .replace(/\b(?:see|do|does|did|you|know|what|is|are|was|the|a|an|about|tell|me|who|how|can|could|please|and|or|of|to|in|it|its|na|ya|wa|kwa|hii|hiyo|wee|wewe|ni)\b/g, " ")
    .replace(/\s+/g, " ").trim();
  const pure = rest.split(" ").filter(Boolean).length <= 2;
  const html = "<p><b>" + esc(SYSTEM_KB.name) + "</b> - " + esc(SYSTEM_KB.summary) + "</p>" +
    '<ul class="ai-help">' + SYSTEM_KB.families.map(function (f) {
      return "<li><b>" + esc(f.label) + ":</b> " + esc(f.about) + "</li>";
    }).join("") + "</ul>" +
    "<p>" + esc(SYSTEM_KB.me) + "</p>";
  const note = rest ? '<p class="ai-dim">You also wrote "' + esc(rest) + '" - send it on its own and I will take it to the desks or the web.</p>' : "";
  const brief = "<p><b>" + esc(SYSTEM_KB.name) + "</b> - " + esc(SYSTEM_KB.summary) + "</p><p>" + esc(SYSTEM_KB.me) + "</p>";
  return { html: html, brief: brief, note: note, pure: pure, rest: rest };
}

function cleanSnippet(html) {
  return String(html || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&#039;|&#x27;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstSentences(text, n) {
  const s = String(text || "").replace(/\s+/g, " ").trim();
  const parts = s.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [s];
  return (parts.slice(0, n || 2).map(function (p) { return p.trim(); }).join(" ") || s).slice(0, 320).trim();
}

/* the web answer, tied back to the system */
function relateToSystem(text) {
  const t = String(text || "").toLowerCase();
  if (/food|snack|dish|crop|fruit|vegetable|candy|sweet|beverage|drink|meal|grain|seed|flour|sugar|salt|cassava|rice|maize/.test(t))
    return "If you sell it, write: nimeuza <name> <amount>. If it went into stock, write: register stock <name>: units, buy, package, sell.";
  if (/disease|medicine|drug|hospital|clinic|patient|symptom|treatment|vaccine|health/.test(t))
    return "For health work, write: register patient <name>, <age>, <male|female> - or admit patient <ID> <details>.";
  if (/bank|currency|loan|interest|finance|tax|insurance|money/.test(t))
    return "For money records, write it like: nimeuza 500 - or paid rent 20000 kwa Landlord.";
  return "To record anything, write it like: nimeuza 500 - the AI reads Swahili, English or both.";
}

/* Export the pure core for the Node test harness (it imports a copy of this
 * file with the /502.js import line stripped). */
const PURE = {
  AI_VERSION, IN_NAMES, OUT_NAMES, NEUTRAL_NAMES, CONTRA_NAMES, ALL_TXN_NAMES,
  STOCK_GROUPS, STOCK_CAUSES, MODULE_MAP, GRANT_PARENT, COLLECTION_MAP, DEFAULTS,
  EXAMPLE_MAPPINGS, HELP_EXAMPLES, PARAM_TOOLS,
  flatTools, lexMatch, parseAmount, methodOf, nameAfter, splitSegments,
  parseBusinessSegment, parseStockRegisterSegment, parseStockMovementSegment,
  detectQuery, isBlockedUpload, fileKindOf, matchTool,
  validateBusinessItem, validateStockRegisterItem, validateStockMovement,
  makeRegId, makeCode, patientDoc, admissionDoc, dischargeDoc, labDoc, imagingDoc, esc, money,
  guessOwnerUse, webTermFromSegment, termFromQuestion, searchTermsOf, bytesOf, kindLabel, classifyChat, chatReply,
  cleanSnippet, firstSentences, relateToSystem, isSickStatement, isOpenText, openReply,
  SYSTEM_KB, SYS_Q_RE, systemAnswer,
  FILE_REQ_RE, parseFileRequest, textToPdf
};
export { PURE };

/* =====================================================================
 * BROWSER WIRING — everything below touches the DOM, Firestore or files.
 * ===================================================================== */

const S = {
  status: "ready",           /* ready | processing | needs-confirmation (422) */
  user: null, session: null, isAdmin: false, grants: [],
  attachments: [],           /* the attachment store (418) */
  pending: null,             /* the pending action awaiting confirmation (416) */
  pendingClarify: null,
  desk: null, n: null, deskLabel: null,
  els: {}, _libs: {}, _chargesAmt: null, _nameAsk: 0,
  lastRequest: null,         /* the retry (403): the exact last text + files */
  lastTerm: null,            /* conversation context: the last web term, for follow-ups */
  procEl: null,              /* the processing bubble with the spinner */
  _webCache: {},             /* web lookups already answered this session */
  _thumbs: {}                /* attachment preview thumbnails, by file identity */
};

const CDN = {
  pdf: "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js",
  xlsx: "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js",
  ocr: "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js",
  fflate: "https://cdn.jsdelivr.net/npm/fflate@0.8.2/umd/index.js"
};

function loadScriptOnce(key, url) {
  if (S._libs[key]) return S._libs[key];
  S._libs[key] = new Promise(function (resolve, reject) {
    const el = document.createElement("script");
    el.src = url; el.onload = function () { resolve(true); };
    el.onerror = function () { delete S._libs[key]; reject(new Error("The engine library " + key + " could not be reached.")); };
    document.head.appendChild(el);
  });
  return S._libs[key];
}

function grantAllows(folder) {
  if (S.isAdmin) return true;
  const g = S.grants || [];
  if (g.indexOf(folder) !== -1) return true;
  const par = GRANT_PARENT[folder];
  if (par && g.indexOf(par) !== -1) return true;
  return false;
}

/* ---------- the web search: keyless, CORS-open, no server needed ----------
 * The app is a static Vercel site, so the lookup runs in the browser against
 * open endpoints that answer cross-origin: Wikipedia (English and Swahili).
 * Google itself needs a paid key and blocks the browser - the moment a key
 * exists, its client goes exactly here, behind the same webLookup hand. */
function wikiFetch(url, tryAgain) {
  const c = new AbortController();
  const t = setTimeout(function () { c.abort(); }, 8000);
  const headers = { "Api-User-Agent": "JAMALI-AI/1.1 (web; contact through the app)" };
  return fetch(url, { signal: c.signal, headers: headers }).then(function (r) {
    clearTimeout(t);
    /* a busy open endpoint gets one quiet retry - batches of lookups can
     * trip the rate limit, and one 1.2s pause settles it */
    if (r.status === 429 && !tryAgain) return new Promise(function (res) { setTimeout(res, 1200); }).then(function () { return wikiFetch(url, true); });
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  }).catch(function (e) { clearTimeout(t); throw e; });
}

function wikiPageUrl(title, lang) {
  return "https://" + lang + ".wikipedia.org/wiki/" + encodeURIComponent(String(title || "").replace(/\s/g, "_"));
}

/* one term -> what the web says: the exact article, else the search whose
 * snippet carries the term, else the Swahili search. null means not found.
 * Successful answers are cached for the session, so the same term never
 * costs a second trip (8: no unnecessary repeated requests). */
async function webLookup(term) {
  const t0 = String(term || "").trim().slice(0, 80);
  if (!t0) return null;
  const key = t0.toLowerCase();
  if (S._webCache[key] !== undefined) return S._webCache[key];
  const got = await webLookupNet(t0);
  if (got) S._webCache[key] = got; /* a failed lookup is never cached - it retries */
  return got;
}

async function webLookupNet(term) {
  const t0 = String(term || "").trim().slice(0, 80);
  if (!t0) return null;
  try {
    const j = await wikiFetch("https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(t0) + "?redirect=true");
    if (j && j.extract) return { term: t0, title: j.title, text: firstSentences(j.extract, 3), url: wikiPageUrl(j.title, "en"), source: "Wikipedia" };
  } catch (e) {}
  try {
    const j = await wikiFetch("https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=" + encodeURIComponent(t0) + "&format=json&origin=*&srlimit=3");
    const hits = (j && j.query && j.query.search) ? j.query.search : [];
    for (let i = 0; i < hits.length; i++) {
      const sn = cleanSnippet(hits[i].snippet);
      if (sn && sn.toLowerCase().indexOf(t0.toLowerCase()) !== -1)
        return { term: t0, title: hits[i].title, text: firstSentences(sn, 2), url: wikiPageUrl(hits[i].title, "en"), source: "Wikipedia search" };
    }
    for (let i = 0; i < hits.length; i++) {
      try {
        const s = await wikiFetch("https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(hits[i].title) + "?redirect=true");
        if (s && s.extract) return { term: t0, title: s.title, text: firstSentences(s.extract, 3), url: wikiPageUrl(s.title, "en"), source: "Wikipedia" };
      } catch (e) {}
    }
  } catch (e) {}
  try {
    const j = await wikiFetch("https://sw.wikipedia.org/w/api.php?action=query&list=search&srsearch=" + encodeURIComponent(t0) + "&format=json&origin=*&srlimit=2");
    const hits = (j && j.query && j.query.search) ? j.query.search : [];
    for (let i = 0; i < hits.length; i++) {
      const sn = cleanSnippet(hits[i].snippet);
      if (sn && sn.toLowerCase().indexOf(t0.toLowerCase()) !== -1)
        return { term: t0, title: hits[i].title, text: firstSentences(sn, 2), url: wikiPageUrl(hits[i].title, "sw"), source: "Wikipedia (Swahili)" };
    }
  } catch (e) {}
  return null;
}

/* ---------- the card library (419) ---------- */

function cardShell(kind, title, bodyHtml, extra) {
  return '<div class="ai-card ai-' + kind + '"' + (extra || '') + '>' +
    '<div class="ai-card-title">' + esc(title) + '</div>' + bodyHtml + '</div>';
}
function fieldTable(rows) {
  return '<table class="ai-fields"><tbody>' + rows.map(function (r) {
    return '<tr><th>' + esc(r[0]) + '</th><td>' + esc(r[1]) + '</td></tr>';
  }).join('') + '</tbody></table>';
}

/* ---------- UI construction ---------- */

function ensureDom(root) {
  root.innerHTML =
    '<div class="ai-shell">' +
    '<div class="ai-head"><div class="ai-id">' +
    '<span class="ai-dot" id="ai-dot"></span>' +
    '<span class="ai-name">JAMALI AI</span>' +
    '<span class="ai-status" id="ai-status">Ready</span></div>' +
    '<span class="ai-user" id="ai-user"></span></div>' +
    '<div class="ai-stream" id="ai-stream"></div>' +
    '<div class="ai-chips" id="ai-chips"></div>' +
    '<div class="ai-bar">' +
    '<button class="ai-attach" id="ai-attach" title="Attach an image or a document">+</button>' +
    '<input type="file" id="ai-file" multiple hidden>' +
    '<textarea class="ai-input" id="ai-input" rows="1" placeholder="Write to the AI - Swahili, English or both"></textarea>' +
    '<button class="ai-send" id="ai-send" title="Send" disabled>&#8593;</button>' +
    '</div>' +
    '<div class="ai-foot" id="ai-foot">Ready</div>' +
    '</div>';
  S.els.stream = document.getElementById("ai-stream");
  S.els.chips = document.getElementById("ai-chips");
  S.els.input = document.getElementById("ai-input");
  S.els.send = document.getElementById("ai-send");
  S.els.file = document.getElementById("ai-file");
  S.els.status = document.getElementById("ai-status");
  S.els.dot = document.getElementById("ai-dot");
  S.els.foot = document.getElementById("ai-foot");
  S.els.user = document.getElementById("ai-user");
}

function setStatus(st) {
  S.status = st;
  const map = { ready: "Ready", processing: "Processing", "needs-confirmation": "Needs confirmation" };
  if (S.els.status) S.els.status.textContent = map[st] || st;
  if (S.els.dot) S.els.dot.className = "ai-dot st-" + st;
  if (st !== "processing") hideProcessing(); /* the spinner only lives while working */
  updateSend();
}

/* the processing indicator (6): an animated spinning circle with an honest
 * label, shown while the AI works and removed the moment the status leaves
 * processing - the send button stays locked by updateSend the whole time. */
function showProcessing(label) {
  hideProcessing();
  S.procEl = pushHtml('<div class="ai-processing"><span class="ai-spinner"></span><span>' +
    esc(label || "Working on your request") + "</span></div>", "ai-ai");
  scrollDown();
}
function hideProcessing() {
  if (S.procEl) { try { S.procEl.remove(); } catch (e) {} S.procEl = null; }
}

/* 344: the arrow stays deactivated while nothing is written and no file is
 * attached; blue the moment text is typed or a valid file is attached; a
 * filled circle while the AI works. */
function updateSend() {
  if (!S.els.send) return;
  const has = (S.els.input.value.trim().length > 0) || S.attachments.length > 0;
  S.els.send.classList.remove("is-blue", "is-busy", "is-off");
  if (S.status === "processing") { S.els.send.classList.add("is-busy"); S.els.send.disabled = true; }
  else if (!has) { S.els.send.classList.add("is-off"); S.els.send.disabled = true; }
  else { S.els.send.classList.add("is-blue"); S.els.send.disabled = false; }
  if (S.els.input) S.els.input.disabled = S.status === "processing";
}

function scrollDown() {
  if (S.els.stream) S.els.stream.scrollTop = S.els.stream.scrollHeight; /* 339 */
}

function pushHtml(html, cls) {
  const wrap = document.createElement("div");
  wrap.className = "ai-msg " + (cls || "ai-ai");
  wrap.innerHTML = html;
  /* the retry (9): every error card carries a Retry button that resends the
   * exact last request - text and files - unchanged; the upload guard's own
   * notice opts out, because there is no request to resend for it */
  const errCard = wrap.querySelector(".ai-card.ai-error");
  if (errCard && !errCard.hasAttribute("data-noretry") && S.lastRequest && !errCard.querySelector("[data-retry]")) {
    const row = document.createElement("div");
    row.className = "ai-actions ai-retry-row";
    row.innerHTML = '<button type="button" class="ai-btn ghost" data-retry="1">Retry the last request</button>';
    errCard.appendChild(row);
  }
  S.els.stream.appendChild(wrap);
  scrollDown();
  return wrap;
}

function userBubble(text, files) {
  let h = '<div class="ai-bubble">' + esc(text).replace(/\n/g, "<br>") + '</div>';
  if (files && files.length) {
    h += '<div class="ai-attach-list">' + files.map(function (f) {
      return '<span class="ai-chip">' + esc(f.name) +
        ' <span class="ai-file-size">' + esc(bytesOf(f.size)) + "</span></span>";
    }).join('') + '</div>';
  }
  pushHtml(h, "ai-user");
}

/* ---------- attachments (345, 346, 418) ---------- */

function addFiles(fileList) {
  const files = Array.prototype.slice.call(fileList || []);
  const rejected = [];
  files.forEach(function (f) {
    if (isBlockedUpload(f.name, f.type)) { rejected.push(f); return; } /* 346 */
    S.attachments.push(f);
  });
  renderChips();
  if (rejected.length) {
    pushHtml(cardShell("error", "Upload blocked (346)",
      "<p>Video and audio files are not allowed on the AI input." +
      " Refused: " + rejected.map(function (f) { return esc(f.name); }).join(", ") + ".</p>",
      ' data-noretry="1"'));
  }
  updateSend();
  return rejected.length;
}

/* the preview thumbnails: one object URL per picked image, reused across
 * renders, revoked the moment the file is removed from the store */
function thumbOf(f) {
  const key = f.name + "::" + f.size + "::" + f.lastModified;
  if (!(key in S._thumbs)) {
    if (fileKindOf(f.name, f.type) === "image") {
      try { S._thumbs[key] = URL.createObjectURL(f); } catch (e) { S._thumbs[key] = null; }
    } else S._thumbs[key] = null;
  }
  return S._thumbs[key];
}

function fileMeta(f) {
  return kindLabel(fileKindOf(f.name, f.type)) + (f.size ? " - " + bytesOf(f.size) : "");
}

/* the attachment previews (345): the picked files as cards ABOVE the input
 * field - name, type, size, a thumbnail where the kind supports it, a
 * reading progress bar once the AI starts on the file, and a remove button
 * per card. No count limit, no size limit - the store takes everything
 * except audio and video, which never reach this render (346). */
function renderChips() {
  if (!S.els.chips) return;
  if (!S.attachments.length) { S.els.chips.innerHTML = ""; return; }
  S.els.chips.innerHTML =
    '<div class="ai-preview-title">Attached files - they ride with the next message</div>' +
    '<div class="ai-preview-grid">' + S.attachments.map(function (f, i) {
      const th = thumbOf(f);
      const kind = fileKindOf(f.name, f.type);
      return '<div class="ai-file-card" data-i="' + i + '">' +
        (th ? '<img class="ai-file-thumb" src="' + th + '" alt="">'
            : '<div class="ai-file-thumb ai-file-icon">' + esc((kind[0] || "f").toUpperCase()) + "</div>") +
        '<div class="ai-file-info"><div class="ai-file-name">' + esc(f.name) + "</div>" +
        '<div class="ai-file-kind">' + esc(fileMeta(f)) + "</div>" +
        '<div class="ai-file-progress" data-pi="' + i + '"' + (f._pct ? "" : " hidden") + '><div class="ai-file-progress-bar" style="width:' + (f._pct || 0) + '%"></div></div>' +
        (f._err ? '<div class="ai-file-err">' + esc(f._err) + "</div>" : "") +
        '</div><button type="button" class="ai-chip-x ai-file-x" data-i="' + i + '" title="Remove">&times;</button></div>';
    }).join("") + "</div>";
}

/* live reading progress for one attachment (upload progress, 4C): the bar
 * in that file's own preview card moves, and the foot line carries the
 * label so the user always knows what the AI is holding */
function updateFileProgress(index, pct, label) {
  const f = S.attachments[index];
  if (!f) return;
  f._pct = Math.max(0, Math.min(100, Math.round(pct)));
  const bar = S.els.chips && S.els.chips.querySelector('.ai-file-progress[data-pi="' + index + '"]');
  if (bar) {
    bar.hidden = false;
    if (bar.firstElementChild) bar.firstElementChild.style.width = f._pct + "%";
  }
  if (S.els.foot && label) S.els.foot.textContent = label + " - " + f._pct + "%";
}

/* one file out of the store: its preview card goes, its thumbnail URL is
 * revoked, and the rest keep their order */
function removeFileAt(index) {
  const gone = S.attachments.splice(index, 1)[0];
  if (gone) {
    const key = gone.name + "::" + gone.size + "::" + gone.lastModified;
    if (S._thumbs[key]) { try { URL.revokeObjectURL(S._thumbs[key]); } catch (e) {} delete S._thumbs[key]; }
  }
  updateSend();
}

/* ---------- reading: images (347) and documents (348) ---------- */

async function readImageText(file, onProgress) {
  await loadScriptOnce("ocr", CDN.ocr);
  const res = await window.Tesseract.recognize(file, "eng", { logger: function (m) {
    /* the OCR engine's own progress, mapped onto the file's preview bar */
    if (m && m.status === "recognizing text" && onProgress) onProgress(15 + Math.round((m.progress || 0) * 80));
  } });
  return res && res.data ? (res.data.text || "") : "";
}

async function readPdfText(file, onProgress) {
  await loadScriptOnce("pdf", CDN.pdf);
  const lib = window.pdfjsLib;
  lib.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";
  const buf = await file.arrayBuffer();
  const pdf = await lib.getDocument({ data: new Uint8Array(buf) }).promise;
  let out = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    if (onProgress) onProgress(10 + Math.round((i / Math.max(1, pdf.numPages)) * 85));
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    let last = null, text = "";
    tc.items.forEach(function (it) {
      if (!it.str) return;
      if (last === -1) text += "\n";
      else if (text && !/\s$/.test(text)) text += " ";
      text += it.str;
      last = it.hasEOL ? -1 : 1;
    });
    out += text + "\n\n";
  }
  return out.trim();
}

async function readSheetRows(file) {
  await loadScriptOnce("xlsx", CDN.xlsx);
  const X = window.XLSX;
  const wb = /\.(csv|tsv)$/i.test(file.name)
    ? X.read(await file.text(), { type: "string" })
    : X.read(await file.arrayBuffer(), { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return X.utils.sheet_to_json(ws, { header: 1, raw: true });
}

async function readDocxText(file) {
  await loadScriptOnce("fflate", CDN.fflate);
  const u8 = new Uint8Array(await file.arrayBuffer());
  const zip = window.fflate.unzipSync(u8);
  const xml = zip["word/document.xml"];
  if (!xml) return "";
  let txt = new TextDecoder().decode(xml);
  txt = txt.replace(/<\/w:p>/g, "\n").replace(/<[^>]+>/g, "");
  return txt.replace(/\n{3,}/g, "\n\n").trim();
}

async function readAttachmentText(file, onProgress, cap) {
  const kind = fileKindOf(file.name, file.type);
  let out = "";
  if (kind === "image") out = await readImageText(file, onProgress);
  else if (kind === "pdf") out = await readPdfText(file, onProgress);
  else if (kind === "word" && /\.docx$/i.test(file.name)) out = await readDocxText(file);
  else if (kind === "excel" || kind === "csv") {
    if (onProgress) onProgress(30);
    const rows = await readSheetRows(file);
    out = rows.map(function (r) { return (r || []).join(" "); }).join("\n");
  }
  else if (kind === "text") out = await file.text();
  else out = ""; /* archives ride along but their contents are not read here */
  /* an honest cap only where the caller asks for one - the file delivery
   * keeps its own 400,000 guard, and the record desks read freely */
  if (cap && out.length > cap) out = out.slice(0, cap) + "\n\n(the text was cut at " + cap + " characters to keep the reading fast)";
  return out;
}

/* ---------- the computer desk: run a real tool (381, 391, 392) ---------- */

async function runTool(tool, file) {
  return new Promise(function (resolve) {
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;left:-9999px;width:900px;height:700px;";
    iframe.src = "/" + tool.slug + "/" + tool.n;
    let done = false;
    const finish = function (res) { if (!done) { done = true; iframe.remove(); resolve(res); } };
    const timer = setTimeout(function () {
      finish({ ok: false, msg: "The " + tool.label + " tool did not answer in time." });
    }, 180000);
    iframe.onload = function () {
      try {
        const w = iframe.contentWindow, d = iframe.contentDocument;
        const input = d.getElementById("file");
        const runBtn = d.getElementById("run");
        const msgEl = d.getElementById("t-msg");
        if (!input || !runBtn) {
          clearTimeout(timer);
          return finish({ ok: false, msg: "The " + tool.label + " page does not expose its file input - open it directly: /" + tool.slug + "/" + tool.n });
        }
        /* capture the tool's own result blob as a download link (391) */
        let captured = null;
        const origCreate = w.URL.createObjectURL.bind(w.URL);
        w.URL.createObjectURL = function (blob) {
          const u = origCreate(blob);
          if (blob && blob.size && !captured) captured = { url: u, size: blob.size };
          return u;
        };
        const dt = new w.DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        input.dispatchEvent(new w.Event("change", { bubbles: true }));
        runBtn.click();
        const t0 = Date.now();
        const poll = setInterval(function () {
          const cls = msgEl ? String(msgEl.className || "") : "";
          const txt = msgEl ? msgEl.textContent : "";
          if (/ok/.test(cls)) {
            clearInterval(poll); clearTimeout(timer);
            finish({ ok: true, msg: txt, link: captured ? captured.url : null });
          } else if (/err|warn/.test(cls)) {
            clearInterval(poll); clearTimeout(timer);
            finish({ ok: false, msg: txt });
          } else if (Date.now() - t0 > 175000) {
            clearInterval(poll); clearTimeout(timer);
            finish({ ok: false, msg: "Timed out waiting for the tool." });
          }
        }, 300);
      } catch (e) {
        clearTimeout(timer);
        finish({ ok: false, msg: "Could not drive the tool: " + e.message });
      }
    };
    document.body.appendChild(iframe);
  });
}

/* ---------- the file request (391): a link, text or attachments -> a file ---------- */

/* The page reads the source itself, through one guarded chain: the direct
 * fetch first (same-origin and CORS-open sites), then three keyless open
 * readers for the sites that refuse the cross-origin read. Every reader has
 * its own timeout and its own error-body guard; all of them failing is an
 * honest 403 that keeps the input - never a guessed file. */
async function fetchRemoteText(url) {
  const full = /^https?:\/\//i.test(url) ? url : "https://" + url.replace(/^\/+/, "");
  const readers = [
    full,
    "https://r.jina.ai/" + full,
    "https://api.allorigins.win/raw?url=" + encodeURIComponent(full),
    "https://api.codetabs.com/v1/proxy?quest=" + encodeURIComponent(full)
  ];
  for (let i = 0; i < readers.length; i++) {
    try {
      const ctl = new AbortController();
      const timer = setTimeout(function () { ctl.abort(); }, 20000);
      const r = await fetch(readers[i], { signal: ctl.signal });
      clearTimeout(timer);
      if (r.ok) {
        const t = await r.text();
        if (t && t.length && !/^\s*\{\s*"data"\s*:\s*null/.test(t) && !/error code: \d+/.test(t) && !/AuthenticationRequiredError/.test(t)) return t;
      }
    } catch (e) { /* this reader refused or timed out - the next one goes */ }
  }
  return null;
}

async function deliverFile(freq, text) {
  setStatus("processing");
  let content = "", source = "the text you wrote", pages = 0;
  try {
    if (S.attachments.length) {
      const parts = [];
      for (let fi = 0; fi < S.attachments.length; fi++) {
        const f = S.attachments[fi];
        updateFileProgress(fi, 8, "Reading " + f.name);
        try {
          const t = await readAttachmentText(f, function (p) { updateFileProgress(fi, p, "Reading " + f.name); });
          updateFileProgress(fi, 100, "Read " + f.name);
          parts.push("=== " + f.name + " ===\n" + (t || "(no text could be read from this file)"));
        }
        catch (e) { parts.push("=== " + f.name + " === (could not be read: " + e.message + ")"); }
      }
      content = parts.join("\n\n");
      source = S.attachments.map(function (f) { return f.name; }).join(", ");
    } else if (freq.url) {
      const got = await fetchRemoteText(freq.url);
      if (got === null) {
        pushHtml(cardShell("error", "The link could not be read (403)",
          "<p>I could not read <b>" + esc(freq.url) + "</b> from the browser - the site refused the cross-origin read and the open reader did not answer either.</p>" +
          "<p>Nothing was written anywhere and your input is preserved: paste the text itself and ask again, or attach the file - the PDF comes back at once.</p>"));
        resetToReady(true);
        return;
      }
      content = got;
      source = freq.url;
    } else if (freq.inline && freq.inline.length > 1) {
      content = freq.inline;
    } else {
      pushHtml(cardShell("clarify", "One question (394)",
        "<p>What should the " + (freq.fmt === "pdf" ? "PDF" : "text file") + " contain? Paste the text, attach a file, or give a link - for example: <b>naomba pdf ya https://paste.rs/xxxx</b> (355).</p>"));
      resetToReady(true);
      return;
    }
    if (content.length > 400000) content = content.slice(0, 400000) + "\n\n(the text was cut at 400,000 characters to keep the build safe)";
    const base = (freq.url ? (freq.url.replace(/\/+$/, "").split("/").pop() || "document") : "jamali-document")
      .replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "document";
    const fname = base + "." + freq.fmt;
    let blob, kb, toolNote;
    if (freq.fmt === "txt") {
      blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      kb = Math.max(1, Math.round(blob.size / 1024));
      toolNote = "the plain text save";
    } else {
      const firstLine = (String(content).split("\n").filter(function (l) { return l.trim().length; })[0] || "JAMALI AI document").trim();
      const made = textToPdf(firstLine.slice(0, 70), content);
      const bytes = new Uint8Array(made.pdf.length);
      for (let i = 0; i < made.pdf.length; i++) bytes[i] = made.pdf.charCodeAt(i) & 0xff;
      blob = new Blob([bytes], { type: "application/pdf" });
      kb = Math.max(1, Math.round(blob.size / 1024));
      pages = made.pages;
      toolNote = "the Text-to-PDF tool (tool #1, page 65)";
    }
    const url2 = URL.createObjectURL(blob);
    pushHtml(cardShell("done", "File ready (391)",
      "<p><b>" + esc(fname) + "</b> - " + kb + " KB" + (pages ? ", " + pages + " page" + (pages > 1 ? "s" : "") : "") + " - built from " + esc(source) + " with " + toolNote + ".</p>" +
      '<div class="ai-actions"><a class="ai-btn" href="' + url2 + '" download="' + esc(fname) + '">Save the file</a></div>' +
      '<p class="ai-dim">Every finished tool run returns a download link (391 AI File Delivery). The link stays alive in this conversation - save the file before you leave the page.</p>'));
    await writeHistory({ request: text, action: "File delivery: " + fname, status: "completed", detail: { source: source, format: freq.fmt, size: blob.size } });
  } catch (e) {
    pushHtml(cardShell("error", "The file could not be built (403)",
      "<p>" + esc(e.message || String(e)) + "</p><p>Nothing was written and your input is preserved - try a shorter text or another link.</p>"));
  }
  S.attachments = [];
  renderChips();
  resetToReady(true);
}

/* ---------- Firestore actions (400) and the audit trail (414, 417) ---------- */

function aiAudit() {
  return { viaAi: true, aiUid: S.user ? S.user.uid : "", aiEmail: S.user ? (S.user.email || "") : "", aiAt: serverTimestamp(), aiVersion: AI_VERSION };
}

async function writeHistory(entry) {
  try {
    await addDoc(collection(db, "aiHistory"), {
      uid: S.user ? S.user.uid : "", email: S.user ? (S.user.email || "") : "",
      desk: S.desk || "", page: S.n || 0, request: entry.request || "",
      action: entry.action || "", status: entry.status || "completed",
      detail: entry.detail || {}, createdAt: serverTimestamp()
    });
  } catch (e) { /* history must never break the action itself */ }
}

async function execBusiness(items, requestText) {
  /* items: the confirmation items, each carrying .rec and optional .extraCharges */
  const batch = writeBatch(db);
  const saved = [];
  items.forEach(function (item) {
    const r = item.rec;
    batch.set(doc(collection(db, "transactions")), Object.assign({
      transactionName: r.transactionName,
      dateTime: serverTimestamp(),
      flowMethod: r.flowMethod,
      transactionType: r.transactionType,
      name: r.name || null,
      amount: r.amount
    }, aiAudit()));
    saved.push(r);
    if (item.extraCharges) {
      batch.set(doc(collection(db, "transactions")), Object.assign({
        transactionName: "Bank Charges", dateTime: serverTimestamp(),
        flowMethod: "Bank", transactionType: r.transactionType,
        name: r.name || null, amount: item.extraCharges
      }, aiAudit()));
      saved.push({ transactionName: "Bank Charges", transactionType: r.transactionType, flowMethod: "Bank", name: r.name || null, amount: item.extraCharges });
    }
  });
  await batch.commit();
  await writeHistory({ request: requestText, action: "Business: " + saved.length + " record(s) saved to transactions", status: "completed", detail: { count: saved.length } });
  return saved;
}

async function execStockRegister(item, requestText) {
  const ref = await addDoc(collection(db, "stockItems"), Object.assign({}, item, { createdAt: serverTimestamp() }, aiAudit()));
  await writeHistory({ request: requestText, action: "Stock: registered " + item.name, status: "completed", detail: { item: item.name } });
  return ref;
}

async function execStockMovement(item, stock, requestText) {
  const fresh = await getDoc(doc(db, "stockItems", stock.id));
  if (!fresh.exists()) throw new Error("That stock item no longer exists.");
  const cur = Number(fresh.data().units || 0);
  const vErr = validateStockMovement(item, cur);
  if (vErr) throw new Error(vErr);
  const price = item.cause.money === "IN"
    ? Number(stock.unitPrice || 0)
    : (Number(stock.buyPrice || 0) / (Number(stock.unitsPerPackage || 0) || 1));
  const amount = Math.round(item.units * price * 100) / 100;
  const delta = item.cause.dir === "IN" ? item.units : -item.units;
  const txnType = item.cause.money || "NEUTRAL";
  const flowMethod = item.cause.money ? (item.flowMethod || "Cash") : "N/A";
  const name = flowMethod === "Credit" ? (item.person || null) : (flowMethod === "Bank" ? (item.bank || null) : null);
  const batch = writeBatch(db);
  batch.update(doc(db, "stockItems", stock.id), { units: increment(delta) });
  batch.set(doc(collection(db, "transactions")), Object.assign({
    transactionName: item.cause.name, dateTime: serverTimestamp(),
    flowMethod: flowMethod, transactionType: txnType, name: name, amount: amount
  }, aiAudit()));
  batch.set(doc(collection(db, "stockChanges")), Object.assign({
    stockId: stock.id, stockName: stock.name, cause: item.cause.name,
    direction: item.cause.dir, units: item.units, amount: amount,
    transactionType: txnType, flowMethod: flowMethod, name: name,
    createdAt: serverTimestamp()
  }, aiAudit()));
  await batch.commit();
  await writeHistory({ request: requestText, action: "Stock: " + item.cause.name + " " + item.units + " unit(s) of " + stock.name, status: "completed", detail: { from: cur, to: cur + delta } });
  return { from: cur, to: cur + delta, amount: amount };
}

async function execPatient(f, requestText) {
  const snap = await getDocs(collection(db, "healthRegistrations"));
  const used = new Set();
  snap.forEach(function (d) { if (d.data().regId) used.add(d.data().regId); });
  const regId = makeRegId(used);
  await addDoc(collection(db, "healthRegistrations"), Object.assign(patientDoc(f, regId), { createdAt: serverTimestamp() }, aiAudit()));
  await writeHistory({ request: requestText, action: "Health: registered patient " + (f.fullName || regId), status: "completed", detail: { regId: regId } });
  return regId;
}

async function execAdmission(f, requestText) {
  const snap = await getDocs(collection(db, "healthAdmissions"));
  const used = new Set();
  snap.forEach(function (d) { if (d.data().admissionNumber) used.add(d.data().admissionNumber); });
  const num = makeCode("ADM", used);
  await addDoc(collection(db, "healthAdmissions"), Object.assign(admissionDoc(f, num), { createdAt: serverTimestamp() }, aiAudit()));
  await writeHistory({ request: requestText, action: "Health: admission " + num + " for " + f.patientName, status: "completed", detail: { admissionNumber: num } });
  return num;
}

async function execDischarge(f, requestText) {
  const snap = await getDocs(collection(db, "healthDischarges"));
  const used = new Set();
  snap.forEach(function (d) { if (d.data().dischargeNumber) used.add(d.data().dischargeNumber); });
  const num = makeCode("DIS", used);
  await addDoc(collection(db, "healthDischarges"), Object.assign(dischargeDoc(f, num), aiAudit()));
  await writeHistory({ request: requestText, action: "Health: discharge " + num + " for " + f.patientName, status: "completed", detail: { dischargeNumber: num } });
  return num;
}

async function execLab(f, requestText) {
  const snap = await getDocs(collection(db, "healthLabRequests"));
  const used = new Set();
  snap.forEach(function (d) { if (d.data().requestNumber) used.add(d.data().requestNumber); });
  const num = makeCode("LAB", used);
  await addDoc(collection(db, "healthLabRequests"), Object.assign(labDoc(f, num), { createdAt: serverTimestamp() }, aiAudit()));
  await writeHistory({ request: requestText, action: "Health: laboratory request " + num + " for " + f.patientName, status: "completed", detail: { requestNumber: num } });
  return num;
}

async function execImaging(f, requestText) {
  const snap = await getDocs(collection(db, "healthImagingRequests"));
  const used = new Set();
  snap.forEach(function (d) { if (d.data().requestNumber) used.add(d.data().requestNumber); });
  const num = makeCode("IMG", used);
  await addDoc(collection(db, "healthImagingRequests"), Object.assign(imagingDoc(f, num), { createdAt: serverTimestamp() }, aiAudit()));
  await writeHistory({ request: requestText, action: "Health: imaging request " + num + " for " + f.patientName, status: "completed", detail: { requestNumber: num } });
  return num;
}

/* ---------- the read-only question engine (409) ---------- */

function sameDay(d) {
  if (!d) return false;
  const x = d.toDate ? d.toDate() : new Date(d);
  const now = new Date();
  return x.getFullYear() === now.getFullYear() && x.getMonth() === now.getMonth() && x.getDate() === now.getDate();
}

async function runQuery(q) {
  if (q.kind === "cash-today" || q.kind === "bank-today" || q.kind === "out-today") {
    const snap = await getDocs(query(collection(db, "transactions"), orderBy("dateTime", "desc"), limit(500)));
    let cash = 0, bank = 0, spent = 0;
    snap.forEach(function (d) {
      const t = d.data();
      if (!sameDay(t.dateTime)) return;
      const amt = Number(t.amount || 0);
      if (t.transactionType === "IN" && t.flowMethod === "Cash") cash += amt;
      if (t.transactionType === "IN" && t.flowMethod === "Bank") bank += amt;
      if (t.transactionType === "OUT" && (t.flowMethod === "Cash" || t.flowMethod === "Bank")) spent += amt;
    });
    if (q.kind === "cash-today") return "Cash received today: <b>K " + money(cash) + "</b> (read live from transactions - nothing was modified).";
    if (q.kind === "bank-today") return "Bank received today: <b>K " + money(bank) + "</b>.";
    return "Paid out today (Cash + Bank): <b>K " + money(spent) + "</b>.";
  }
  if (q.kind === "stock-check") {
    const snap = await getDocs(query(collection(db, "stockItems"), orderBy("name")));
    const want = String(q.name || "").toLowerCase();
    const rows = [];
    snap.forEach(function (d) {
      const t = d.data();
      if (want && String(t.name || "").toLowerCase().indexOf(want) === -1) return;
      rows.push(t.name + ": " + Number(t.units || 0).toLocaleString("en-US") + " units");
    });
    if (!rows.length) return "No stock item matches " + (want ? '"' + esc(want) + '"' : "the request") + " in stockItems.";
    return "<b>Live stock position</b><br>" + rows.map(esc).join("<br>");
  }
  if (q.kind === "patient-status") {
    const id = q.regId;
    const patient = await findPatient(id);
    if (!patient) return "No registration carries the Registration ID <b>" + esc(id || "") + "</b>.";
    let out = "<b>" + esc(id) + "</b> - " + esc(patient.fullName || "unidentified") +
      (patient.sex ? ", " + esc(patient.sex) : "") + (patient.age !== "" && patient.age != null ? ", " + esc(patient.age) : "");
    const stages = [
      ["healthTriage", "Triage"], ["healthNurseConsultations", "Nursing"],
      ["healthDoctorConsultations", "Doctor"], ["healthAdmissions", "Admission"],
      ["healthDischarges", "Discharge"], ["healthLabRequests", "Laboratory"],
      ["healthImagingRequests", "Imaging"]
    ];
    const found = [];
    for (const st of stages) {
      const s2 = await getDocs(query(collection(db, st[0]), limit(300)));
      s2.forEach(function (d) {
        const t = d.data();
        if (t.regId === id || t.patientId === id) found.push(st[1] + ": " + (t.status || "recorded"));
      });
    }
    out += "<br>" + (found.length ? found.map(esc).join("<br>") : "No triage, consultation, admission or request records yet.");
    return out;
  }
  return "That question is not one the read-only engine answers yet - try: cash today, bank today, paid out today, check stock for X, or a patient's Registration ID.";
}

/* ---------- the internal system search (5A) and the combined answer (5D) ---------- */

/* one guarded wait: any single source that hangs fails on its own after the
 * timeout and the rest of the answer carries on without it (9) */
function withTimeout(p, ms, label) {
  let t = null;
  return Promise.race([
    p,
    new Promise(function (_, rej) { t = setTimeout(function () { rej(new Error(label || "This step took too long.")); }, ms); })
  ]).finally(function () { if (t) clearTimeout(t); });
}

/* The internal system search: the user's own live records, read only,
 * module by module, and only where the account's grants allow (10, 404).
 * Each source is guarded twice - its own timeout AND its own catch - so one
 * failing collection never sinks the others (9: if one information source
 * fails, the answer continues with the rest). Terms, amounts and
 * Registration IDs found in the request and in the uploaded files decide
 * what counts as a match; with no criteria at all the sources report their
 * recent picture instead of flooding the answer. */
async function searchSystem(text) {
  const terms = searchTermsOf(text);
  const amt = parseAmount(text);
  const regHit = String(text || "").match(/\b\d{4}[A-HJ-NP-Z]{4}\b/);
  const regId = regHit ? regHit[0] : null;
  const jobs = [];
  if (grantAllows("add-transaction") || grantAllows("business")) jobs.push(searchTx(terms, amt));
  if (grantAllows("stock-register") || grantAllows("stock-change") || grantAllows("stock-progress")) jobs.push(searchStock(terms));
  if (grantAllows("victim-registration") || grantAllows("health")) jobs.push(searchPatients(terms, regId));
  const settled = await Promise.all(jobs.map(function (j) {
    return j.catch(function (e) { return { rows: [], error: e.message || String(e) }; });
  }));
  const out = { rows: [], errors: [] };
  settled.forEach(function (r) {
    if (!r) return;
    out.rows = out.rows.concat(r.rows || []);
    if (r.error) out.errors.push(r.error);
  });
  return out;
}

async function searchTx(terms, amt) {
  const targeted = terms.length > 0 || amt != null;
  const snap = await withTimeout(
    getDocs(query(collection(db, "transactions"), orderBy("dateTime", "desc"), limit(targeted ? 300 : 5))),
    8000, "The transaction search took too long.");
  const rows = [];
  snap.forEach(function (d) {
    const t = d.data();
    const hay = ((t.transactionName || "") + " " + (t.name || "")).toLowerCase();
    const hit = targeted
      ? ((amt != null && Number(t.amount) === amt) || terms.some(function (w) { return hay.indexOf(w) !== -1; }))
      : true; /* no criteria: the recent picture, newest first */
    if (!hit) return;
    const when = t.dateTime && t.dateTime.toDate ? t.dateTime.toDate().toLocaleDateString("en-GB") : "";
    rows.push({ source: "Business - transactions", label: (t.transactionName || "?") + " - K " + money(t.amount) +
      " - " + (t.transactionType || "") + (t.flowMethod && t.flowMethod !== "N/A" ? " on " + t.flowMethod : "") +
      (t.name ? " - " + t.name : "") + (when ? " - " + when : "") });
  });
  return { rows: rows.slice(0, 6), error: null };
}

async function searchStock(terms) {
  const targeted = terms.length > 0;
  const snap = await withTimeout(
    getDocs(query(collection(db, "stockItems"), orderBy("name"), limit(targeted ? 200 : 5))),
    8000, "The stock search took too long.");
  const rows = [];
  snap.forEach(function (d) {
    const t = d.data();
    const name = String(t.name || "");
    if (targeted && !terms.some(function (w) { return name.toLowerCase().indexOf(w) !== -1; })) return;
    rows.push({ source: "Stock - stockItems", label: (name || "?") + " - " + Number(t.units || 0).toLocaleString("en-US") + " units present" });
  });
  return { rows: rows.slice(0, 6), error: null };
}

async function searchPatients(terms, regId) {
  /* patients answer only to an exact Registration ID or a name term -
   * a patient list never floods an open answer */
  if (!regId && !terms.length) return { rows: [], error: null };
  const snap = await withTimeout(
    getDocs(query(collection(db, "healthRegistrations"), limit(200))),
    8000, "The patient search took too long.");
  const rows = [];
  snap.forEach(function (d) {
    const t = d.data();
    const hit = (regId && t.regId === regId) ||
      terms.some(function (w) { return String(t.fullName || "").toLowerCase().indexOf(w) !== -1; });
    if (!hit) return;
    rows.push({ source: "Health - registrations", label: (t.regId || "") + " - " + (t.fullName || "unidentified") +
      (t.age !== "" && t.age != null ? ", " + t.age : "") + (t.sex ? ", " + t.sex : "") });
  });
  return { rows: rows.slice(0, 4), error: null };
}

/* The combined answer (5D): ONE card built from the three sources - the
 * uploaded files first, then the internal system, then the open web - with
 * every source named, the connections pointed out, the differences shown
 * and the failures admitted honestly. Web is skipped when the system and
 * the files already answer the request, and a follow-up question with no
 * new term reuses the last one from the conversation context. */
async function respondCombined(text, fileSummaries) {
  setStatus("processing");
  /* the system's own knowledge (421): a question pointed at JAMALI itself
   * is answered from the system's own words alone - no records trip, no
   * web trip where "Jamal Multisystem" is somebody else's cancelled
   * console. A file riding along keeps the combined card. */
  const sa = systemAnswer(text);
  if (sa && sa.pure && !(fileSummaries && fileSummaries.length)) {
    return respondSystem(text, sa);
  }
  /* the two searches run TOGETHER, never one blocking the other (8): the
   * system search on one side, the web lookup on the other - and the web
   * side is skipped entirely when the request carries no unknown word and
   * no earlier term to follow up, so a direct answer costs no trip at all */
  const term = (webTermFromSegment(text) || termFromQuestion(text) || "").trim();
  const lookupTerm = term || S.lastTerm || "";
  /* the web is also skipped when the looked-up word IS the system's own
   * name (421): the system speaks for itself, strangers do not */
  const webTerm = (sa && /jamali|jamal|multisystem|multi\s*system|this\s+(?:system|app)|mfumo/i.test(lookupTerm)) ? "" : lookupTerm;
  const results = await Promise.all([
    searchSystem(text + " " + (fileSummaries || []).map(function (x) { return (x.text || "").slice(0, 1500); }).join(" "))
      .catch(function (e) { return { rows: [], errors: [e.message || String(e)] }; }),
    webTerm ? webLookup(webTerm).catch(function () { return null; }) : Promise.resolve(null)
  ]);
  const sys = results[0] || { rows: [], errors: [] };
  const info = results[1] || null;
  if (info) S.lastTerm = info.term;

  /* 3. the one combined card */
  hideProcessing();
  let h = "";
  if (sa) h += '<p class="ai-dim"><b>From JAMALI itself (421)</b></p>' + sa.brief;
  if (fileSummaries && fileSummaries.length) {
    h += '<p class="ai-dim"><b>From your files</b></p>';
    fileSummaries.forEach(function (s) {
      const t = String(s.text || "").trim();
      const amounts = [];
      String(t).split(/\n+/).slice(0, 200).forEach(function (line) {
        const a = parseAmount(line);
        if (a != null) amounts.push(a);
      });
      h += "<p><b>" + esc(s.name) + "</b> (" + esc(kindLabel(s.kind)) + "): " +
        (t ? esc(firstSentences(t, 2)) : "no readable text - the file rides along unopened") + "</p>" +
        (amounts.length ? '<p class="ai-dim">Amounts seen in it: ' + esc(amounts.slice(0, 8).map(money).join(", ")) + "</p>" : "");
    });
  }
  if (sys.rows.length) {
    h += '<p class="ai-dim"><b>From your system</b> - read live, read only</p><ul class="ai-help">' +
      sys.rows.map(function (r) { return "<li><b>" + esc(r.source) + ":</b> " + esc(r.label) + "</li>"; }).join("") + "</ul>";
  } else {
    h += '<p class="ai-dim"><b>From your system</b>: no matching records' +
      (grantAllows("add-transaction") || grantAllows("business") || grantAllows("stock-register") || grantAllows("stock-change") || grantAllows("victim-registration") || grantAllows("health") ? "" : " - the modules are not granted to this account (404)") + ".</p>";
  }
  if (info) {
    h += '<p class="ai-dim"><b>From the web</b></p><p><b>' + esc(info.title) + "</b> - " + esc(firstSentences(info.text, 3)) + "</p>" +
      '<p class="ai-dim">Source: ' + esc(info.source) + ' <a class="ai-page-link" href="' + esc(info.url) + '" target="_blank" rel="noopener">open</a></p>';
  }
  const connections = combineConnections(fileSummaries || [], sys.rows, info);
  if (connections) h += '<p class="ai-dim"><b>Connections and differences</b></p>' + connections;
  if (sys.errors.length) {
    h += '<p class="ai-dim">One source did not answer: ' + esc(sys.errors.join("; ")) + " - the rest of the answer stands (9).</p>";
  }
  if (!h) h = "<p>" + esc(openReply(text)) + "</p>";
  pushHtml(cardShell("answer", "Combined answer - files, system and web (409)", h));
  await writeHistory({ request: text, action: "Combined answer" +
    (sa ? " + system knowledge (421)" : "") +
    (fileSummaries && fileSummaries.length ? " (" + fileSummaries.length + " file(s))" : "") +
    (sys.rows.length ? " + " + sys.rows.length + " system record(s)" : "") +
    (info ? " + web: " + info.title : ""), status: "completed", detail: {} });
  resetToReady(true);
}

/* the connections pass: what the files and the records and the web page say
 * about each other - amounts that match books, words that match stock,
 * amounts that differ, and the web page's own tie-back to the system */
function combineConnections(files, rows, info) {
  const notes = [];
  files.forEach(function (s) {
    const t = String(s.text || "");
    const fileAmts = [];
    t.split(/\n+/).slice(0, 200).forEach(function (line) {
      const a = parseAmount(line);
      if (a != null) fileAmts.push(a);
    });
    rows.forEach(function (r) {
      const m = String(r.label || "").match(/K ([\d,]+(?:\.\d+)?)/);
      if (m) {
        const recAmt = Number(m[1].replace(/,/g, ""));
        if (fileAmts.some(function (a) { return a === recAmt; }))
          notes.push("The amount K " + money(recAmt) + " in <b>" + esc(s.name) + "</b> matches a record in your books (" + esc(r.source) + ").");
      }
      searchTermsOf(t).forEach(function (w) {
        if (r.source.indexOf("Stock") === 0 && String(r.label || "").toLowerCase().indexOf(w) !== -1)
          notes.push("The file mentions <b>" + esc(w) + "</b>, which is a registered stock item (" + esc(r.label) + ").");
      });
    });
    if (fileAmts.length > 1) {
      const min = Math.min.apply(null, fileAmts), max = Math.max.apply(null, fileAmts);
      if (max !== min) notes.push("The file carries amounts from K " + money(min) + " to K " + money(max) + " - a spread of K " + money(max - min) + ".");
    }
  });
  if (info) notes.push(esc(relateToSystem(info.text)));
  const seen = {}, uniq = [];
  notes.forEach(function (n) { if (!seen[n]) { seen[n] = true; uniq.push(n); } });
  return uniq.length ? "<ul class=\"ai-help\">" + uniq.slice(0, 6).map(function (n) { return "<li>" + n + "</li>"; }).join("") + "</ul>" : "";
}

/* the retry (9): the exact last request - text and files - goes back through
 * the normal send path, unchanged */
function retryLast() {
  if (S.status === "processing" || !S.lastRequest) return;
  S.attachments = (S.lastRequest.files || []).slice();
  renderChips();
  S.els.input.value = S.lastRequest.text || "";
  updateSend();
  onSend();
}

/* ---------- the understanding pipeline ---------- */

async function gatherText(text) {
  let all = String(text || "");
  for (let i = 0; i < S.attachments.length; i++) {
    const f = S.attachments[i];
    try {
      updateFileProgress(i, 5, "Reading " + f.name);
      const t = await readAttachmentText(f, function (p) { updateFileProgress(i, p, "Reading " + f.name); });
      updateFileProgress(i, 100, "Read " + f.name);
      if (t) all += "\n" + t;
    } catch (e) {
      f._err = e.message || String(e);
      renderChips();
      pushHtml(cardShell("error", "Attachment could not be read",
        "<p>" + esc(f.name) + ": " + esc(e.message) + "</p><p>The file stays attached - your input is preserved (403).</p>"));
    }
  }
  return all;
}

function deskScope() {
  /* which intents this desk accepts (the desk pages focus the AI) */
  const d = S.desk || "hub";
  if (["ai-business", "ai-add-transaction", "ai-cash-default", "ai-batch-business",
       "ai-contra", "ai-debtors-creditors"].indexOf(d) !== -1) return "business";
  if (["ai-stock", "ai-stock-register-write", "ai-stock-movement-write",
       "ai-packages-units", "ai-batch-stock", "ai-stock-balance"].indexOf(d) !== -1) return "stock";
  if (["ai-health", "ai-patient-registration", "ai-triage-consultation",
       "ai-pharmacy-treatment", "ai-wards-beds", "ai-admission-discharge",
       "ai-lab-radiology"].indexOf(d) !== -1) return "health";
  if (["ai-computer", "ai-tool-matcher", "ai-convert-documents", "ai-convert-data",
       "ai-convert-images", "ai-convert-audio-video", "ai-convert-archives",
       "ai-convert-ebooks", "ai-convert-web", "ai-file-viewer", "ai-convert-delivery",
       "ai-tool-status"].indexOf(d) !== -1) return "computer";
  return "all";
}

const WANTS_CONVERT = /\bconvert\b|to (word|docx?|pdf|excel|csv|text|markdown|html?|png|jpe?g|image|epub|json|xml|yaml|sql|zip)\b|compress|extract|unpack|viewer/i;

async function handleUserText(text) {
  const scope = deskScope();
  const files = S.attachments.slice();

  /* the computer desk: an attached file plus a stated need (381) */
  if (files.length && (scope === "computer" || WANTS_CONVERT.test(text))) {
    const f0 = files[0];
    const kind = fileKindOf(f0.name, f0.type);
    if (/\b(viewer|view this|what (file|type))\b/i.test(text) || /\b393\b/.test(text)) {
      pushHtml(cardShell("tool", "All File Viewer (390)",
        "<p>This file is handed to page 393, the viewer every page trusts.</p>" +
        fieldTable([["File", f0.name], ["Type", kind]]) +
        '<div class="ai-actions"><a class="ai-btn" href="/file-viewer/393">Open the File Viewer</a></div>'));
      S.attachments = []; renderChips(); resetToReady(true);
      return;
    }
    const tool = matchTool(kind, text || f0.name);
    if (tool) {
      if (PARAM_TOOLS.indexOf(tool.slug) !== -1) {
        pushHtml(cardShell("tool", "Tool matched: " + tool.label + " (382)",
          "<p>This tool needs its own settings (sizes, angles, text and friends)," +
          " so the AI hands you to the tool page with the file named.</p>" +
          fieldTable([["Matched tool", tool.label], ["Address", "/" + tool.slug + "/" + tool.n]]) +
          '<div class="ai-actions"><a class="ai-btn" href="/' + tool.slug + '/' + tool.n + '">Open ' + esc(tool.label) + '</a></div>'));
        S.attachments = []; renderChips(); resetToReady(true);
        return;
      }
      setStatus("processing");
      /* every attached file runs: the matched tool, file by file, each
       * result its own line - one file failing never stops the rest */
      const results = [];
      for (let fi = 0; fi < files.length; fi++) {
        const f1 = files[fi];
        const k1 = fileKindOf(f1.name, f1.type);
        const t1 = matchTool(k1, text || f1.name);
        if (!t1) { results.push({ ok: false, name: f1.name, msg: "no built-in tool matched this file's kind (" + k1 + ")" }); continue; }
        if (PARAM_TOOLS.indexOf(t1.slug) !== -1) {
          results.push({ ok: false, name: f1.name, msg: t1.label + " needs its own settings (sizes, angles, text and friends) - open it with the file named.", tool: t1.label, param: "/" + t1.slug + "/" + t1.n });
          continue;
        }
        pushHtml('<div class="ai-statusline">Running ' + esc(t1.label) + " on " + esc(f1.name) + " (file " + (fi + 1) + " of " + files.length + ")...</div>");
        const res = await runTool(t1, f1);
        results.push({ ok: res.ok, name: f1.name, msg: res.msg, link: res.link || null, tool: t1.label });
        await writeHistory({ request: text, action: "Computer: " + t1.label + " on " + f1.name, status: res.ok ? "completed" : "failed", detail: { tool: t1.slug } });
      }
      hideProcessing();
      const rowsHtml = results.map(function (r) {
        return '<tr><th>' + esc(r.name) + '</th><td>' +
          (r.ok ? "<b>done</b>" : "<b>failed</b>") + " - " + esc(r.msg) +
          (r.link ? '<br><a class="ai-btn" href="' + r.link + '" download>Save the converted file</a>' : "") +
          (r.param ? '<br><a class="ai-btn ghost" href="' + esc(r.param) + '">Open the tool page</a>' : "") +
          "</td></tr>";
      }).join("");
      const anyOK = results.some(function (r) { return r.ok; });
      pushHtml(cardShell(anyOK ? "tool" : "error", anyOK ? "Tool output (392)" : "Tool run failed (403)",
        '<table class="ai-fields">' + rowsHtml + "</table>" +
        (anyOK ? '<p class="ai-dim">The finished files come back as download links (391). The links stay alive in this conversation - save them before you leave the page.</p>' : "<p>Your input is preserved - Retry runs the same files again.</p>")));
      S.attachments = []; renderChips(); resetToReady(true);
      return;
    }
    pushHtml(cardShell("clarify", "No tool matched (394)",
      "<p>I could not match " + esc(f0.name) + " (" + esc(kind) + ") to a built-in tool from your wording." +
      " Say the target format plainly, for example <b>convert to word</b>, <b>convert to excel</b>, <b>to pdf</b>, <b>compress</b>.</p>"));
    resetToReady(true);
    return;
  }

  /* the file request (391): "naomba pdf ya <link>" / "make a pdf of this" -
   * the Convertor family executed on a link, on the typed text or on the
   * attachments, the finished file back as a download link; a real
   * transaction always wins first (parseFileRequest refuses it) */
  const freq = parseFileRequest(text);
  if (freq && (scope === "all" || scope === "computer")) return deliverFile(freq, text);

  /* the question engine (409) */
  const q = detectQuery(text);
  if (q && scope !== "computer") {
    setStatus("processing");
    try {
      const answer = await runQuery(q);
      hideProcessing();
      pushHtml(cardShell("answer", "Answer - read only (409)", "<p>" + answer + "</p>"));
      await writeHistory({ request: text, action: "Query: " + q.kind, status: "completed", detail: {} });
    } catch (e) {
      pushHtml(cardShell("error", "Query failed (403)", "<p>" + esc(e.message) + "</p>"));
    }
    resetToReady(true);
    return;
  }

  /* uploaded files on an open request: the files are read with live
   * progress, the system and the web are searched, and ONE combined answer
   * comes back naming every source (5A, 5B, 5C, 5D) */
  if (files.length && isOpenText(text)) {
    const summaries = [];
    for (let i = 0; i < S.attachments.length; i++) {
      const f = S.attachments[i];
      try {
        updateFileProgress(i, 4, "Reading " + f.name);
        const t = await readAttachmentText(f, function (p) { updateFileProgress(i, p, "Reading " + f.name); }, 12000);
        updateFileProgress(i, 100, "Read " + f.name);
        summaries.push({ name: f.name, kind: fileKindOf(f.name, f.type), text: String(t || "") });
      } catch (e) {
        f._err = e.message || String(e);
        renderChips();
        pushHtml(cardShell("error", "Attachment could not be read (403)",
          "<p>" + esc(f.name) + ": " + esc(e.message) + "</p><p>The other files carry on - Retry keeps every file attached.</p>"));
      }
    }
    return respondCombined(text, summaries);
  }

  /* the chat layer: greetings, thanks and open questions get real replies
   * instead of a clarification loop - anything that parses as a transaction
   * already went to the desks above through its own guards */
  const chat = classifyChat(text);
  if (chat) { await respondChat(chat, text); return; }

  /* wellbeing and open words: the world outside the desks - "naumwa
   * malaria" gets a web answer tied to the health wing, a bare word gets
   * the web, and only a real record reaches the clarification question */
  if (isOpenText(text)) {
    if (isSickStatement(text)) return respondWellbeing(text);
    return respondOpen(text);
  }

  /* the desks */
  if (scope === "business" || scope === "all") return handleBusiness(text, await gatherText(text));
  if (scope === "stock") return handleStock(text, await gatherText(text));
  if (scope === "health") return handleHealth(text, await gatherText(text));
  pushHtml(cardShell("clarify", "The Computer desk needs a file",
    "<p>Attach the file and say what it should become - <b>convert to word</b>, <b>convert to excel</b>, <b>to pdf</b>, <b>compress</b> (381).</p>"));
  resetToReady(true);
}

/* Business desk (354, 355, 356, 357, 358, 359) */
async function handleBusiness(text, combined, finalAsk) {
  const segs = splitSegments(combined || text);
  const items = [], missing = [];
  segs.forEach(function (seg, idx) {
    const p = parseBusinessSegment(seg);
    if (p.ok) {
      if (p.charges === "clarify") { items.push(Object.assign(p, { idx: idx })); return; }
      const vErr = validateBusinessItem(p.rec);
      if (vErr) missing.push({ seg: seg, idx: idx, question: vErr });
      else items.push(Object.assign(p, { idx: idx }));
    } else if (p.need === "name") {
      missing.push({ seg: seg, idx: idx, question: "Which record is this? Name the transaction - for example Sales, Purchases, Rent, Wages (355)." });
    } else if (p.need === "amount") {
      missing.push({ seg: seg, idx: idx, question: "How much is the " + p.hit.name + "?" });
    } else if (p.need === "method") {
      missing.push({ seg: seg, idx: idx, question: "You named both Bank and Credit - which one applies?" });
    } else if (p.need === "bank") {
      missing.push({ seg: seg, idx: idx, question: "Which bank? Name the bank for this entry - write it after kwa, from, to or at." });
    } else if (p.need === "person") {
      missing.push({ seg: seg, idx: idx, question: "Who is it for? Give the person's name after kwa, from, to or at." });
    } else if (p.need === "recoverMethod") {
      missing.push({ seg: seg, idx: idx, question: "A recovery takes Cash or Bank - Credit is not available there (page 3's own rule)." });
    }
  });
  if (S._chargesAmt != null) {
    items.forEach(function (p) {
      if (p.charges === "clarify") p.extraCharges = S._chargesAmt;
    });
    S._chargesAmt = null;
  }
  const stillCharges = items.some(function (p) { return p.charges === "clarify"; });
  if (!items.length && missing.length) {
    if (finalAsk) return finalBusinessGuess(text, missing[0]);
    S.pendingClarify = { kind: "business", text: text, fixSeg: missing[0].seg, fixIdx: missing[0].idx, asked: "name", question: missing[0].question };
    askClarification(missing[0].question);
    return;
  }
  if (stillCharges) {
    S.pendingClarify = { kind: "business-charges", text: text, question: "How much were the bank charges? They save as their own separate Bank Charges record (358). Write only the amount." };
    askClarification("How much were the bank charges? They save as their own separate Bank Charges record (358). Write only the amount.");
    return;
  }
  if (missing.length) {
    if (finalAsk) return finalBusinessGuess(text, missing[0]);
    S.pendingClarify = { kind: "business", text: text, fixSeg: missing[0].seg, fixIdx: missing[0].idx, asked: "name", question: missing[0].question };
    askClarification(missing[0].question + " The rest is ready to confirm.");
    return;
  }
  /* the unknown item word of an owner-use request rides to the web search,
   * so the confirmation card carries the real meaning of what was typed */
  for (const it of items) {
    if (it.webTerm && !it.webInfo) {
      try { it.webInfo = await webLookup(it.webTerm); } catch (e) { it.webInfo = null; }
    }
  }
  showBusinessConfirmation(items, text);
}

function showBusinessConfirmation(items, requestText) {
  S._nameAsk = 0;
  if (!(grantAllows("add-transaction") || grantAllows("business"))) {
    pushHtml(cardShell("error", "Not permitted (404)",
      "<p>Your account is not granted the Business module, so the AI may not save there (404).</p>"));
    resetToReady(true);
    return;
  }
  const rowsHtml = items.map(function (p) {
    return '<tr><td>' + esc(p.rec.transactionName) + '</td><td>' + esc(p.rec.transactionType) +
      '</td><td class="amt">' + money(p.rec.amount) + '</td><td>' + esc(p.rec.flowMethod) +
      '</td><td>' + esc(p.rec.name || "-") + '</td></tr>';
  }).join('');
  const webLines = items.filter(function (p) { return p.webInfo; }).map(function (p) {
    return 'From the web: ' + esc(p.webTerm) + ' - ' + esc(firstSentences(p.webInfo.text, 1)) + ' (' + esc(p.webInfo.source) + ')';
  }).join('<br>');
  const card = cardShell("confirm", "Confirmation summary (395)",
    '<p class="ai-dim">Business - Add Transaction</p>' +
    (webLines ? '<p class="ai-dim">' + webLines + '</p>' : "") +
    '<table class="ai-fields"><thead><tr><th>Name</th><th>Type</th><th>Amount</th><th>Method</th><th>Name on record</th></tr></thead><tbody>' +
    rowsHtml + '</tbody></table>' +
    '<div class="ai-actions">' +
    '<button class="ai-btn" data-act="allow">Allow / Confirm</button>' +
    '<button class="ai-btn ghost" data-act="edit">Edit</button>' +
    '<button class="ai-btn ghost" data-act="cancel">Cancel</button></div>');
  const el = pushHtml(card);
  S.pending = { kind: "business", items: items, requestText: requestText, el: el };
  setStatus("needs-confirmation");
  el.querySelectorAll("[data-act]").forEach(function (b) {
    b.addEventListener("click", function () { actOnPending(b.getAttribute("data-act"), b); });
  });
}

async function actOnPending(act, btn) {
  const p = S.pending;
  if (!p) return;
  if (act === "cancel") { /* 401 */
    S.pending = null; setStatus("ready");
    pushHtml(cardShell("status", "Cancelled (401)", "<p>Nothing was saved.</p>"));
    await writeHistory({ request: p.requestText, action: "Cancelled before saving", status: "cancelled", detail: {} });
    return;
  }
  if (act === "edit") { /* the Edit control of 395 */
    if (!p.el.querySelector("input.ai-edit")) {
      p.el.querySelectorAll("table.ai-fields tbody tr").forEach(function (tr, i) {
        const it = p.items[i] && p.items[i].rec;
        if (!it) return;
        const tds = tr.querySelectorAll("td");
        ["transactionName", "transactionType", "amount", "flowMethod", "name"].forEach(function (k, idx) {
          if (!tds[idx]) return;
          const inp = document.createElement("input");
          inp.className = "ai-edit"; inp.value = it[k] == null ? "" : it[k];
          inp.setAttribute("data-k", k); inp.setAttribute("data-i", i);
          tds[idx].innerHTML = ""; tds[idx].appendChild(inp);
        });
      });
      if (btn) btn.textContent = "Save edits";
      return;
    }
    p.el.querySelectorAll("input.ai-edit").forEach(function (inp) {
      const i = Number(inp.getAttribute("data-i")), k = inp.getAttribute("data-k");
      let v = inp.value;
      if (k === "amount") v = Number(String(v).replace(/,/g, "")) || 0;
      if (k === "name" && !String(v).trim()) v = null;
      p.items[i].rec[k] = v;
    });
    for (const it of p.items) {
      const vErr = validateBusinessItem(it.rec);
      if (vErr) { pushHtml(cardShell("error", "Validation wall (413)", "<p>" + esc(vErr) + "</p>")); return; }
    }
    const items = p.items, req = p.requestText;
    p.el.remove(); S.pending = null;
    showBusinessConfirmation(items, req);
    return;
  }
  if (act === "allow") { /* 400 */
    setStatus("processing");
    showProcessing("Saving through the manual form's own process...");
    try {
      const saved = await execBusiness(p.items, p.requestText);
      p.el.remove(); S.pending = null;
      hideProcessing();
      const lines = saved.map(function (r) {
        return esc(r.transactionName) + " - " + esc(r.transactionType) + " - " + money(r.amount) + " - " + esc(r.flowMethod) + (r.name ? " - " + esc(r.name) : "");
      }).join("<br>");
      pushHtml(cardShell("done", "Saved (400)",
        "<p>" + lines + "</p>" +
        '<div class="ai-actions"><a class="ai-btn" href="/add-transaction/3">Open Add Transaction</a> <a class="ai-btn ghost" href="/all-transactions/5">All Transactions</a></div>'));
    } catch (e) {
      pushHtml(cardShell("error", "Save failed (403)",
        "<p>" + esc(e.message) + "</p><p>Nothing was lost - your request and this card stay; you can try Allow again.</p>"));
      setStatus("needs-confirmation");
      return;
    }
    resetToReady(true);
  }
}

/* the second look (394 kept honest): one informed pass - the unknown word
 * goes to the web search, the question returns with that meaning on the
 * table, and after two passes the AI gives up cleanly. It never asks the
 * same bare question twice. */
async function finalBusinessGuess(text, miss) {
  const seg = miss.seg || text;
  const term = webTermFromSegment(seg);
  let info = null;
  setStatus("processing");
  if (term) { try { info = await webLookup(term); } catch (e) { info = null; } }
  S._nameAsk = (S._nameAsk || 0) + 1;
  if (S._nameAsk >= 2) {
    /* one bare question and one informed question are enough - a third
     * round would be the loop the AI promises never to run */
    S.pendingClarify = null;
    pushHtml(cardShell("error", "Not mapped (401)",
      "<p>I could not map that to a record - nothing was saved.</p><p>Write it like: <b>nimeuza 500</b> or <b>paid rent 20000 kwa Landlord</b>.</p>"));
    resetToReady(true);
    return;
  }
  if (info) {
    pushHtml(cardShell("answer", "From the web (409)",
      "<p><b>" + esc(info.title) + "</b> - " + esc(firstSentences(info.text, 2)) + "</p>" +
      '<p class="ai-dim">Source: ' + esc(info.source) + ' <a class="ai-page-link" href="' + esc(info.url) + '" target="_blank" rel="noopener">open</a></p>'));
  }
  S.pendingClarify = { kind: "business", text: text, fixSeg: miss.seg, fixIdx: miss.idx, asked: "name", question: miss.question };
  askClarification(term
    ? 'Which record is "' + term + '"? Sales, Purchases, Rent, Wages, Petty Expense, Other - or write it another way.'
    : "Which record is this? Sales, Purchases, Rent, Wages, Petty Expense, Other (355).");
}

/* the stock second look: same honesty, no guessing - one informed pass and
 * then a clean stop */
function unmappedStock() {
  S.pendingClarify = null;
  pushHtml(cardShell("error", "Not mapped (401)",
    "<p>I could not map that to a stock action - nothing was saved.</p><p>Try: <b>register stock sugar: 50 units, buy 2000, package of 10, sell 5</b> or <b>sales 6 units of sugar</b>.</p>"));
  resetToReady(true);
}

/* the chat answers: greetings, thanks, capabilities and open questions -
 * a question pointed at the system itself (421) is answered from the
 * system's own knowledge, an open question rides to the combined answer
 * (system first, then the web), the small words answer directly */
async function respondChat(chat, text) {
  const sa = systemAnswer(text);
  if (sa && sa.pure && chat.kind !== "greet" && chat.kind !== "thanks") return respondSystem(text, sa);
  if (chat.kind === "ask") return respondCombined(text, []);
  pushHtml(cardShell("answer", "AI", "<p>" + esc(chatReply(chat.kind)) + "</p>"));
  resetToReady(true);
}

/* the system answer (421): one card straight from the system's own words -
 * no web trip, no records trip, no stranger explaining JAMALI */
async function respondSystem(text, sa) {
  hideProcessing();
  pushHtml(cardShell("answer", "About JAMALI - the system I live in (421)", sa.html + sa.note +
    '<div class="ai-actions"><a class="ai-btn" href="/">Home</a> <a class="ai-btn ghost" href="/business/2">Business</a> <a class="ai-btn ghost" href="/health/321">Health</a> <a class="ai-btn ghost" href="/computer/62">Converters</a> <a class="ai-btn ghost" href="/stock-management/396">Stock</a></div>'));
  await writeHistory({ request: text, action: "System knowledge (421)" + (sa.rest ? ": " + sa.rest : ""), status: "completed", detail: {} });
  resetToReady(true);
}

/* the wellbeing answer (374): "naumwa malaria" is a person talking about
 * their health - the word rides to the web search, the answer comes back
 * tied to the health wing, and nothing is written anywhere */
async function respondWellbeing(text) {
  setStatus("processing");
  const term = webTermFromSegment(text);
  let info = null;
  if (term) { try { info = await webLookup(term); } catch (e) { info = null; } }
  hideProcessing();
  if (info) {
    pushHtml(cardShell("answer", "From the web (409)",
      "<p><b>" + esc(info.title) + "</b> - " + esc(firstSentences(info.text, 2)) + "</p>" +
      '<p class="ai-dim">Source: ' + esc(info.source) + ' <a class="ai-page-link" href="' + esc(info.url) + '" target="_blank" rel="noopener">open</a></p>' +
      "<p>If this is for the clinic: <b>register patient &lt;name&gt;, &lt;age&gt;, &lt;male|female&gt;</b> - or admit an existing patient with the Registration ID.</p>" +
      '<div class="ai-actions"><a class="ai-btn" href="/victim-registration/322">Patient Registration</a> <a class="ai-btn ghost" href="/health/321">Health hub</a></div>'));
    await writeHistory({ request: text, action: "Wellbeing: " + info.title, status: "completed", detail: { term: info.term, source: info.source } });
  } else {
    pushHtml(cardShell("answer", "AI",
      "<p>I heard you are not well - see a clinician. Nothing was written anywhere. When the clinic work starts: <b>register patient &lt;name&gt;, &lt;age&gt;, &lt;male|female&gt;</b>.</p>" +
      '<div class="ai-actions"><a class="ai-btn" href="/victim-registration/322">Patient Registration</a></div>'));
  }
  resetToReady(true);
}

/* the open answer (409): a word or phrase the desks do not parse goes to
 * the combined answer - the system first, then the open web, one card */
async function respondOpen(text) {
  return respondCombined(text, []);
}

function askClarification(question) { /* 394 */
  pushHtml(cardShell("clarify", "One question (394)", "<p>" + esc(question) + "</p>"));
  setStatus("needs-confirmation");
}

function resetToReady(keepAttachments) {
  if (!keepAttachments) { S.attachments = []; renderChips(); }
  S.pendingClarify = null;
  S._nameAsk = 0;
  setStatus("ready");
  if (S.els.foot) S.els.foot.textContent = "Ready";
}

/* Stock desk (364-369) */
async function handleStock(text, combined, finalAsk) {
  const segs = splitSegments(combined || text);
  const regs = [], movs = [], missing = [];
  segs.forEach(function (seg, idx) {
    const isReg = /register|sajili|new stock|new item/i.test(seg);
    if (isReg) {
      const p = parseStockRegisterSegment(seg);
      if (p.ok) {
        const vErr = validateStockRegisterItem(p.rec);
        if (vErr) missing.push({ seg: seg, idx: idx, question: vErr });
        else regs.push(Object.assign(p, { idx: idx }));
      } else if (p.need === "itemName") missing.push({ seg: seg, idx: idx, question: "What is the item called?" });
      else missing.push({ seg: seg, idx: idx, question: "Missing for " + (p.partial && p.partial.name ? p.partial.name : "the item") + ": " + p.missing.join(", ") + "." });
    } else {
      const p = parseStockMovementSegment(seg);
      if (!p.ok) {
        if (p.need === "cause") missing.push({ seg: seg, idx: idx, question: "Which of the fourteen causes is this? For example Sales, Purchases, Stock Damage, Free Samples." });
        else if (p.need === "stockName") missing.push({ seg: seg, idx: idx, question: "Which stock item does this movement concern?" });
        else missing.push({ seg: seg, idx: idx, question: "How many units or packages?" });
      } else movs.push(Object.assign(p, { idx: idx }));
    }
  });
  if (!regs.length && !movs.length) {
    const stockQ = missing.length ? missing[0].question : "Tell me the stock action - register an item, record a movement (one of the fourteen causes), or ask for a balance.";
    if (finalAsk) return unmappedStock();
    S.pendingClarify = { kind: "stock", text: text, fixSeg: missing.length ? missing[0].seg : null, fixIdx: missing.length ? missing[0].idx : null, asked: "stock", question: stockQ };
    askClarification(stockQ);
    return;
  }
  if (missing.length) {
    if (finalAsk) return unmappedStock();
    S.pendingClarify = { kind: "stock", text: text, fixSeg: missing[0].seg, fixIdx: missing[0].idx, asked: "stock", question: missing[0].question };
    askClarification(missing[0].question + " The rest is ready.");
    return;
  }
  setStatus("processing");
  const snap = await getDocs(query(collection(db, "stockItems"), orderBy("name")));
  const stocks = [];
  snap.forEach(function (d) { stocks.push(Object.assign({ id: d.id }, d.data())); });
  for (const m of movs) {
    const hit = stocks.filter(function (s) { return String(s.name || "").toLowerCase() === m.stockName.toLowerCase(); })[0] ||
      stocks.filter(function (s) { return String(s.name || "").toLowerCase().indexOf(m.stockName.toLowerCase()) !== -1; })[0];
    if (!hit) {
      resetToReady(true);
      askClarification('No registered stock matches "' + m.stockName + '" (394). Register it first, or name an existing item.');
      return;
    }
    const upp = Number(hit.unitsPerPackage || 0) || 1;
    let units = m.units;
    if (units == null && m.packages != null) units = Math.round(m.packages * upp * 10000) / 10000; /* 367 */
    if (units == null) { resetToReady(true); askClarification("How many units or packages?"); return; }
    m.stock = hit; m.units = units;
    m.flowMethod = methodOf(m.seg) || "Cash"; /* the Cash default (356) */
    m.person = nameAfter(m.seg); m.bank = nameAfter(m.seg);
  }
  if (!(grantAllows("stock-register") || grantAllows("stock-change") || grantAllows("stock-progress"))) {
    pushHtml(cardShell("error", "Not permitted (404)", "<p>Your account is not granted the Stock module (404).</p>"));
    resetToReady(true);
    return;
  }
  const rowsHtml =
    regs.map(function (p) { return '<tr><td>Register</td><td>' + esc(p.rec.name) + '</td><td>' + esc(p.rec.units) + ' units</td><td>buy ' + money(p.rec.buyPrice) + ' / pack of ' + esc(p.rec.unitsPerPackage) + '</td><td>sell ' + money(p.rec.unitPrice) + '</td></tr>'; }).join('') +
    movs.map(function (m) { return '<tr><td>' + esc(m.cause.name) + ' (' + esc(m.cause.dir) + (m.cause.money ? ", " + esc(m.cause.money) : ", no money") + ')</td><td>' + esc(m.stock.name) + '</td><td>' + esc(m.units) + ' units</td><td></td><td></td></tr>'; }).join('');
  const card = cardShell("confirm", "Confirmation summary (395)",
    "<p>Target module: <b>Stock Management (396)</b> - the register writes into stockItems (397), the movements run the fourteen causes into stockChanges and the transactions (399, 366). Nothing saves without this confirmation.</p>" +
    '<table class="ai-fields"><thead><tr><th>Action</th><th>Item</th><th>Quantity</th><th>Buy</th><th>Sell</th></tr></thead><tbody>' + rowsHtml + '</tbody></table>' +
    '<div class="ai-actions"><button class="ai-btn" data-act="allow">Allow / Confirm</button>' +
    '<button class="ai-btn ghost" data-act="cancel">Cancel</button></div>');
  const el = pushHtml(card);
  S.pending = { kind: "stock", regs: regs, movs: movs, requestText: text, el: el };
  setStatus("needs-confirmation");
  el.querySelectorAll("[data-act]").forEach(function (b) {
    b.addEventListener("click", function () { actOnStock(b.getAttribute("data-act")); });
  });
}

async function actOnStock(act) {
  const p = S.pending;
  if (!p) return;
  if (act === "cancel") {
    S.pending = null; setStatus("ready");
    pushHtml(cardShell("status", "Cancelled (401)", "<p>Nothing was saved. The AI is Ready.</p>"));
    await writeHistory({ request: p.requestText, action: "Cancelled before saving", status: "cancelled", detail: {} });
    return;
  }
  if (act !== "allow") return;
  setStatus("processing");
  showProcessing("Writing through the stock pages' own process...");
  const notes = [];
  try {
    for (const r of p.regs) { await execStockRegister(r.rec, p.requestText); notes.push("Registered " + esc(r.rec.name) + "."); }
    for (const m of p.movs) {
      const res = await execStockMovement(m, m.stock, p.requestText);
      notes.push(esc(m.cause.name) + " " + esc(m.stock.name) + ": " + esc(m.units) + " units, " + esc(res.from) + " -> " + esc(res.to) + ", transaction K " + money(res.amount) + ".");
    }
    p.el.remove(); S.pending = null;
    hideProcessing();
    pushHtml(cardShell("done", "Saved (400)",
      "<p>" + notes.join("<br>") + "</p><p>Units Present updated the moment the change saved (369) - the same audit trails as the manual forms (414).</p>" +
      '<div class="ai-actions"><a class="ai-btn" href="/stock-register/397">Stock Register</a> <a class="ai-btn ghost" href="/stock-change/399">Stock Change</a></div>'));
  } catch (e) {
    pushHtml(cardShell("error", "Save failed (403)", "<p>" + esc(e.message) + "</p><p>Your input is preserved.</p>"));
    setStatus("needs-confirmation");
    return;
  }
  resetToReady(true);
}

/* Health desk (374-379, 410) */
async function handleHealth(text, combined) {
  const source = combined || text;
  const t = String(source).toLowerCase();
  const grant = grantAllows("victim-registration") || grantAllows("health") || grantAllows("patient-admission") ||
    grantAllows("patient-discharge") || grantAllows("laboratory") || grantAllows("radiology") || grantAllows("triage");
  if (!grant) {
    pushHtml(cardShell("error", "Not permitted (404)", "<p>Your account is not granted the Health wing (404).</p>"));
    resetToReady(true);
    return;
  }
  /* registration (375) */
  if (/\bregister\b|sajili|mgonjwa mpya|new patient/.test(t)) {
    const f = {
      fullName: (String(source).match(/(?:patient|register|mgonjwa)[\s:]+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)?)/) || [])[1] || "",
      age: (String(source).match(/(\d{1,3})\s*(?:years?|yrs?|miaka)/i) || [])[1] || "",
      sex: /male|mwanaume|\bman\b/.test(t) ? "Male" : (/female|mwanamke|\bwoman\b/.test(t) ? "Female" : ""),
      phone: (String(source).match(/(?:phone|simu)[\s:]+(\+?\d[\d ]{6,14})/i) || [])[1] || "",
      isUnidentified: /unidentified|unknown patient/.test(t),
      referral: /\breferr?al\b/.test(t) ? "Yes" : "No",
      priority: /critical|urgent|dharura/.test(t) ? "Urgent" : "",
      staff: (S.user && S.user.email) || "AI"
    };
    if (!f.fullName && !f.isUnidentified) {
      S.pendingClarify = { kind: "health-register", fields: f, text: text, question: "What is the patient's full name? Or write \"unidentified\"." };
      askClarification("What is the patient's full name? Or write \"unidentified\".");
      return;
    }
    if (!(grantAllows("victim-registration") || grantAllows("health"))) {
      pushHtml(cardShell("error", "Not permitted (404)", "<p>Registration is not granted to this account (404).</p>"));
      resetToReady(true);
      return;
    }
    showHealthConfirmation("registration", f, text);
    return;
  }
  /* admission (379) */
  if (/\badmit\b|admission/.test(t)) {
    const regId = (String(source).match(/\b\d{4}[A-HJ-NP-Z]{4}\b/) || [])[0];
    if (!regId) {
      S.pendingClarify = { kind: "health-admission", text: text, question: "Which patient? Give the Registration ID - the patient is never re-registered (379)." };
      askClarification("Which patient? Give the Registration ID - the patient is never re-registered (379).");
      return;
    }
    setStatus("processing");
    const patient = await findPatient(regId);
    if (!patient) { resetToReady(true); askClarification("No registration carries " + regId + ". Check the ID on the Patient List."); return; }
    const type = /emergency|dharura/.test(t) ? "Emergency" : "Planned";
    const reason = (String(source).match(/(?:emergency|planned|admit)[\s,]*(?:for|kwa|reason)?\s*(.+)$/i) || [])[1] || "AI admission";
    const f = {
      patientId: regId, patientName: patient.fullName || regId, patientAge: patient.age, patientSex: patient.sex,
      admissionDate: new Date().toISOString().slice(0, 10),
      admissionTime: new Date().toTimeString().slice(0, 5),
      admissionType: type, reason: reason.trim(), diagnosis: "", doctorName: "",
      clinicalNotes: "Raised through the AI admission desk.", staff: (S.user && S.user.email) || "AI", confirm: type === "Emergency"
    };
    showHealthConfirmation("admission", f, text);
    return;
  }
  /* discharge (379) */
  if (/\bdischarge\b|ruhusa/.test(t)) {
    const regId = (String(source).match(/\b\d{4}[A-HJ-NP-Z]{4}\b/) || [])[0];
    if (!regId) { S.pendingClarify = { kind: "health-discharge", text: text, question: "Which patient? Give the Registration ID." }; askClarification("Which patient? Give the Registration ID."); return; }
    setStatus("processing");
    const adm = await findActiveAdmission(regId);
    if (!adm) { resetToReady(true); askClarification("No active admission (Admitted or Transferred) for " + regId + " - start one on New Admission first."); return; }
    const f = {
      patientId: regId, patientName: adm.patientName, patientAge: adm.patientAge, patientSex: adm.patientSex,
      admissionDocId: adm.__id, admissionNumber: adm.admissionNumber, admissionDate: adm.admissionDate, admissionTime: adm.admissionTime,
      decision: "Awaiting Authorization", reason: (String(source).match(/discharge[^.]*?(?:for|kwa)\s+(.+)$/i) || [])[1] || "",
      clinician: (S.user && S.user.email) || "AI", notes: "Raised through the AI discharge desk.", staff: (S.user && S.user.email) || "AI"
    };
    showHealthConfirmation("discharge", f, text);
    return;
  }
  /* laboratory and radiology (410) */
  if (/\blab\b|laboratory|maabara|\btest\b|imaging|radiology|x-?ray|ultrasound/.test(t)) {
    const regId = (String(source).match(/\b\d{4}[A-HJ-NP-Z]{4}\b/) || [])[0];
    const isImaging = /imaging|radiology|x-?ray|ultrasound|scan/.test(t);
    const collOK = isImaging ? (grantAllows("new-imaging-request") || grantAllows("radiology")) : (grantAllows("new-lab-request") || grantAllows("laboratory"));
    if (!collOK) { pushHtml(cardShell("error", "Not permitted (404)", "<p>This wing is not granted to this account (404).</p>")); resetToReady(true); return; }
    if (!regId) { S.pendingClarify = { kind: isImaging ? "health-imaging" : "health-lab", text: text, question: "Which patient? Give the Registration ID." }; askClarification("Which patient? Give the Registration ID."); return; }
    setStatus("processing");
    const patient = await findPatient(regId);
    if (!patient) { resetToReady(true); askClarification("No registration carries " + regId + "."); return; }
    const tests = (String(source).match(/(?:tests?|procedures?)[:\s]+([^.]+)/i) || [])[1];
    const list = tests ? tests.split(/,|\band\b/).map(function (s) { return s.trim(); }).filter(Boolean) : [];
    if (!list.length) {
      S.pendingClarify = { kind: isImaging ? "health-imaging" : "health-lab", patient: patient, text: text, question: isImaging ? "Which imaging procedures? Name them, comma separated." : "Which laboratory tests? Name them, comma separated." };
      askClarification(isImaging ? "Which imaging procedures? Name them, comma separated." : "Which laboratory tests? Name them, comma separated.");
      return;
    }
    const f = {
      patientId: regId, patientName: patient.fullName || regId, patientAge: patient.age, patientSex: patient.sex,
      department: "AI", clinician: (S.user && S.user.email) || "AI",
      clinicalInfo: "", priority: /urgent|critical|dharura/.test(t) ? "Urgent" : "Routine",
      tests: isImaging ? [] : list, procedures: isImaging ? list : []
    };
    showHealthConfirmation(isImaging ? "imaging" : "lab", f, text);
    return;
  }
  /* triage, consultations, pharmacy, treatments, wards and beds (376, 377, 378):
   * the AI maps the request to the exact desk and hands it over - these
   * stages run their own multi-step processes the AI does not shortcut. */
  pushHtml(cardShell("route", "Mapped to the medical wing (374)",
    "<p>This request belongs to a desk that runs its own process:</p>" +
    '<div class="ai-actions">' +
    (/triage/.test(t) ? '<a class="ai-btn" href="/triage/323">Triage (323)</a>' : "") +
    (/nurse|nursing/.test(t) ? '<a class="ai-btn" href="/nurse-consultation/324">Nurse Consultation (324)</a>' : "") +
    (/doctor|daktari/.test(t) ? '<a class="ai-btn" href="/doctor-consultation/325">Doctor Consultation (325)</a>' : "") +
    (/pharmacy|dawa|medicine|prescription/.test(t) ? '<a class="ai-btn" href="/pharmacy/326">Pharmacy (326)</a>' : "") +
    (/treatment|procedure|matibabu/.test(t) ? '<a class="ai-btn" href="/treatment-procedures/327">Treatment Procedures (327)</a>' : "") +
    (/ward|bed|chumba/.test(t) ? '<a class="ai-btn" href="/ward-registration/331">Wards and Beds</a>' : "") +
    (/patient list|patients/.test(t) ? '<a class="ai-btn" href="/patient-module/328">Patient List (328)</a>' : "") +
    '<a class="ai-btn ghost" href="/health/321">Health hub (321)</a></div>' +
    "<p class='ai-dim'>Registration, admissions, discharges, laboratory and imaging requests run through the AI; the consultation stages run on their own pages in the order the wing works (376, 377, 378).</p>"));
  resetToReady(true);
}

async function findPatient(regId) {
  const snap = await getDocs(query(collection(db, "healthRegistrations"), limit(500)));
  let patient = null;
  snap.forEach(function (d) { if (d.data().regId === regId) patient = Object.assign({ __id: d.id }, d.data()); });
  return patient;
}

async function findActiveAdmission(regId) {
  const snap = await getDocs(query(collection(db, "healthAdmissions"), limit(500)));
  let hit = null;
  snap.forEach(function (d) {
    const t = d.data();
    if (t.patientId === regId && (t.status === "Admitted" || t.status === "Transferred")) {
      hit = Object.assign({ __id: d.id }, t);
    }
  });
  return hit;
}

function showHealthConfirmation(kind, f, requestText) {
  const titles = {
    registration: ["Health - Registration (322)", [["Patient", f.fullName || "unidentified"], ["Age", f.age || "-"], ["Sex", f.sex || "-"], ["Referral", f.referral || "No"], ["Priority", f.priority || "-"], ["Registration ID", "generated at save time, deduplicated the same way (322)"]],
      "/victim-registration/322"],
    admission: ["Health - New Admission (341)", [["Patient", f.patientName + " (" + f.patientId + ")"], ["Type", f.admissionType], ["Date / time", f.admissionDate + " " + f.admissionTime], ["Reason", f.reason], ["Status", f.confirm ? "Admitted" : "Pending"]],
      "/new-admission/341"],
    discharge: ["Health - Start Discharge (351)", [["Patient", f.patientName + " (" + f.patientId + ")"], ["Admission", f.admissionNumber], ["Decision", f.decision], ["Status", "Pending Authorization"]],
      "/start-discharge/351"],
    lab: ["Health - New Lab Request (361)", [["Patient", f.patientName + " (" + f.patientId + ")"], ["Clinician", f.clinician], ["Priority", f.priority], ["Tests", (f.tests || []).join(", ")]],
      "/new-lab-request/361"],
    imaging: ["Health - New Imaging Request (371)", [["Patient", f.patientName + " (" + f.patientId + ")"], ["Clinician", f.clinician], ["Priority", f.priority], ["Procedures", (f.procedures || []).join(", ")]],
      "/new-imaging-request/371"]
  };
  const c = titles[kind];
  if (!c) return;
  const card = cardShell("confirm", "Confirmation summary (395)",
    "<p>Target module: <b>" + esc(c[0]) + "</b>. Nothing saves without this confirmation.</p>" +
    fieldTable(c[1]) +
    '<div class="ai-actions"><button class="ai-btn" data-act="allow">Allow / Confirm</button>' +
    '<button class="ai-btn ghost" data-act="cancel">Cancel</button></div>');
  const el = pushHtml(card);
  S.pending = { kind: "health-" + kind, f: f, requestText: requestText, el: el };
  setStatus("needs-confirmation");
  el.querySelectorAll("[data-act]").forEach(function (b) {
    b.addEventListener("click", function () { actOnHealth(b.getAttribute("data-act")); });
  });
}

async function actOnHealth(act) {
  const p = S.pending;
  if (!p) return;
  if (act === "cancel") {
    S.pending = null; setStatus("ready");
    pushHtml(cardShell("status", "Cancelled (401)", "<p>Nothing was saved. The AI is Ready.</p>"));
    await writeHistory({ request: p.requestText, action: "Cancelled before saving", status: "cancelled", detail: {} });
    return;
  }
  if (act !== "allow") return;
  setStatus("processing");
  showProcessing("Writing through the health wing's own process...");
  try {
    let msg = "", link = "";
    const k = p.kind.replace("health-", "");
    if (k === "registration") { const id = await execPatient(p.f, p.requestText); msg = "Patient registered with Registration ID <b>" + esc(id) + "</b>. Quote it at triage and at every next step."; link = "/victim-registration/322"; }
    if (k === "admission") { const n = await execAdmission(p.f, p.requestText); msg = "Admission <b>" + esc(n) + "</b> recorded (" + esc(p.f.admissionType) + ")."; link = "/new-admission/341"; }
    if (k === "discharge") { const n = await execDischarge(p.f, p.requestText); msg = "Discharge <b>" + esc(n) + "</b> opened for " + esc(p.f.patientName) + " - the checklist waits on Discharge List (352)."; link = "/start-discharge/351"; }
    if (k === "lab") { const n = await execLab(p.f, p.requestText); msg = "Laboratory request <b>" + esc(n) + "</b> raised for " + esc(p.f.patientName) + "."; link = "/new-lab-request/361"; }
    if (k === "imaging") { const n = await execImaging(p.f, p.requestText); msg = "Imaging request <b>" + esc(n) + "</b> raised for " + esc(p.f.patientName) + "."; link = "/new-imaging-request/371"; }
    p.el.remove(); S.pending = null;
    hideProcessing();
    pushHtml(cardShell("done", "Saved (400)", "<p>" + msg + "</p><div class='ai-actions'><a class='ai-btn' href='" + link + "'>Open the desk</a> <a class='ai-btn ghost' href='/patient-module/328'>Patient List</a></div>"));
  } catch (e) {
    pushHtml(cardShell("error", "Save failed (403)", "<p>" + esc(e.message) + "</p><p>Your input is preserved.</p>"));
    setStatus("needs-confirmation");
    return;
  }
  resetToReady(true);
}

/* ---------- send pipeline ---------- */

async function onSend() {
  const text = S.els.input.value.trim();
  if (S.status === "processing") return; /* no duplicate submissions (6, 8) */
  if (!text && !S.attachments.length) return;
  const files = S.attachments.slice();
  S.lastRequest = { text: text, files: files }; /* the retry keeps exactly this */
  userBubble(text, files);
  S.els.input.value = "";
  updateSend();
  setStatus("processing");
  showProcessing("Thinking about your request...");
  if (S.els.foot) S.els.foot.textContent = "Working...";
  try {
    if (S.pendingClarify) {
      /* a clarification answer continues the same action (394) */
      const saved = S.pendingClarify;
      S.pendingClarify = null;
      /* a greeting or a thank-you while a question is pending gets its own
       * reply and the question stays on the table */
      const small = classifyChat(text);
      if (small && (small.kind === "greet" || small.kind === "thanks" || small.kind === "caps")) {
        S.pendingClarify = saved;
        pushHtml(cardShell("answer", "AI", "<p>" + esc(chatReply(small.kind)) + "</p>"));
        askClarification(saved.question || "Still waiting on that one - answer in the input bar.");
        return;
      }
      if (saved.kind === "business-charges") {
        S._chargesAmt = parseAmount(text);
        if (S._chargesAmt == null) { S._chargesAmt = null; askClarification("Write the charges as a plain number - for example 500."); return; }
        return handleBusiness(saved.text, saved.text);
      }
      if (saved.kind === "business") {
        let combined = saved.text;
        if (saved.fixSeg && !S._chargesAmt) {
          const segs = splitSegments(saved.text);
          segs[saved.fixIdx] = segs[saved.fixIdx] + " " + text;
          combined = segs.join("\n");
        }
        return handleBusiness(combined, combined, saved.asked === "name");
      }
      if (saved.kind === "stock") {
        let combined = saved.text;
        if (saved.fixSeg) {
          const segs = splitSegments(saved.text);
          segs[saved.fixIdx] = segs[saved.fixIdx] + " " + text;
          combined = segs.join("\n");
        }
        return handleStock(combined, combined, !!saved.asked);
      }
      if (saved.kind === "health-register") {
        const f = saved.fields || {};
        if (/unidentified/i.test(text)) f.isUnidentified = true; else f.fullName = text.trim();
        return showHealthConfirmation("registration", f, saved.text || text);
      }
      if (saved.kind && saved.kind.indexOf("health-") === 0) {
        return handleHealth((saved.text ? saved.text + "\n" : "") + text, text);
      }
    }
    await handleUserText(text);
  } catch (e) {
    pushHtml(cardShell("error", "Error (403)",
      "<p>" + esc(e.message || e) + "</p><p>Your input was not lost - write again or try a different wording.</p>"));
    resetToReady(true);
  }
}

/* ---------- boot ---------- */

function introCard() {
  const scope = deskScope();
  const line = {
    all: "Ready. Write below - Swahili, English or both.",
    business: "Ready. Sales, purchases, expenses, contra entries - write below.",
    stock: "Ready. Registrations, movements, balances - write below.",
    health: "Ready. Registration, admissions, lab and imaging - write below.",
    computer: "Attach a file and say what it should become."
  };
  return cardShell("intro", "JAMALI AI - " + (S.deskLabel || "AI hub"), "<p>" + esc(line[scope] || line.all) + "</p>");
}

function hubLink() {
  if (S.desk === "hub" || !S.desk) return "";
  return "<p class='ai-dim ai-back'><span class='ai-page-link' data-n='329'>&#8592; AI hub</span></p>";
}

async function bootDesk(root) {
  await requireAuth();
  /* session and grants (404): the same session the Home Screen and the
   * sidebar read, and the same personal-mode rule. */
  let session = null;
  try { session = JSON.parse(sessionStorage.getItem("JAMALI_SYSTEM_SESSION") || "null"); } catch (e) { session = null; }
  S.session = session;
  S.isAdmin = !!(session && session.role === "admin");
  S.grants = session && Array.isArray(session.grants) ? session.grants.slice() : [];
  const mode = (sessionStorage.getItem("JAMALI_SYSTEM_MODE") || "organisation");
  if (!session && mode === "personal") S.isAdmin = true; /* personal use sees the whole system, like the administrator */
  S.user = auth.currentUser || S.user;
  ensureDom(root);
  if (S.els.user) S.els.user.textContent = S.user ? (S.user.email || "signed in") : "";
  wireDesk();
  pushHtml(introCard());
  setStatus("ready");
}

function wireDesk() {
  S.els.input.addEventListener("input", updateSend);
  S.els.input.addEventListener("keydown", function (e) {
    if (e.isComposing) return; /* the IME's own Enter never sends */
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } /* Shift+Enter keeps the newline (3) */
  });
  S.els.send.addEventListener("click", onSend);
  S.els.file.addEventListener("change", function (e) { addFiles(e.target.files); e.target.value = ""; });
  document.getElementById("ai-attach").addEventListener("click", function () { S.els.file.click(); });
  S.els.chips.addEventListener("click", function (e) {
    const x = e.target.closest(".ai-file-x");
    if (!x) return;
    e.preventDefault();
    removeFileAt(Number(x.getAttribute("data-i")));
    renderChips(); updateSend();
  });
  /* the pages guide and the hub link (329): one delegated listener opens
   * any page of the family inside this same window - nothing navigates away */
  S.els.stream.addEventListener("click", function (e) {
    const r = e.target.closest("[data-retry]");
    if (r) { e.preventDefault(); retryLast(); return; }
    const l = e.target.closest(".ai-page-link");
    if (!l) return;
    const p = AI_PAGES.find(function (x) { return x.n === Number(l.getAttribute("data-n")); });
    if (!p) return;
    if (p.desk) boot({ desk: p.desk, n: p.n, label: p.label });
    else if (p.ref) boot({ ref: p.ref, n: p.n, label: p.label });
    else boot({ desk: "hub", n: 329, label: "the AI hub" });
  });
  /* drag and drop rides with the whole shell (345) */
  const bar = document.querySelector(".ai-shell") || document.querySelector(".ai-bar");
  ["dragover", "dragleave", "drop"].forEach(function (ev) {
    bar.addEventListener(ev, function (e) {
      e.preventDefault();
      if (ev === "dragover") bar.classList.add("dragover");
      else bar.classList.remove("dragover");
      if (ev === "drop" && e.dataTransfer && e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
    });
  });
}

/* ---------- reference pages (no chat input) ---------- */

function refTable(headers, rows) {
  return '<table class="ai-fields wide"><thead><tr>' + headers.map(function (h) { return "<th>" + esc(h) + "</th>"; }).join('') +
    '</tr></thead><tbody>' + rows.map(function (r) {
      return "<tr>" + r.map(function (c) { return "<td>" + c + "</td>"; }).join('') + "</tr>";
    }).join('') + '</tbody></table>';
}

const REF_TITLES = {
  "collections": "Collection Map (412)", "module-map": "Module Map (421)", "defaults": "Defaults (415)",
  "mappings": "Example Mappings (420)", "validation": "Validation Wall (413)", "cards": "Card Library (419)",
  "help": "Help (423)", "wiring": "Wiring (406)", "admin-controls": "Administrator Controls (405)",
  "home-button": "The AI Button on the Home Screen (407)", "sidebar": "The Sidebar Entry (408)",
  "input-bar": "The Input Bar (344)", "attachments": "Attachment Rules (345)", "blocked-uploads": "The Upload Guard (346)",
  "image-reading": "Image Understanding (347)", "document-reading": "Document Understanding (348)",
  "languages": "Language Understanding (349)", "tool-status": "Tool Run Status (392)",
  "convert-delivery": "Converted File Delivery (391)", "file-viewer": "All File Viewer (390)",
  "batch-engine": "The Shared Batch Engine (411)", "execute": "The Executor (400)", "cancel": "Cancel and Discard (401)",
  "feedback": "Post-completion Feedback (402)", "errors": "Error Handling (403)", "clarification": "The Clarification Step (394)",
  "confirmation": "The Confirmation Summary (395)", "audit": "The Audit Trail (414)", "history": "The History (417)",
  "session": "The Session (416)", "attachment-store": "The Attachment Store (418)", "grants": "The Grant Filter (404)",
  "status": "The Status Model (422)", "queries": "The Question Engine (409)", "packages-units": "Packages and Units (367)",
  "stock-balance": "The Stock Balance Engine (369)", "triage-consultation": "Triage and Consultations (376)",
  "pharmacy-treatment": "Pharmacy and Treatments (377)", "wards-beds": "Wards and Beds (378)"
};

function renderRef(kind) {
  const H = '<h1>JAMALI AI - ' + esc(REF_TITLES[kind] || kind) + '</h1><p class="sub">Live from the shared engine, page ' + esc(String(S.n || "")) + '.</p>';
  if (kind === "collections") return H + '<p>Every Firestore collection the AI may write (412) - the exact collections the manual forms write to and nothing else:</p>' +
    COLLECTION_MAP.map(function (c) { return "<h3>" + esc(c[0]) + "</h3><p>" + c[1].map(esc).join(", ") + "</p>"; }).join('');
  if (kind === "module-map") return H + '<p>The modules the AI may reach and their hub pages (421):</p>' +
    refTable(["Module", "Hub", "Folders the grant opens"], MODULE_MAP.map(function (m) {
      return [esc(m.label), '<a href="/' + m.hubFolder + '/' + m.hub + '">' + esc(m.hubFolder) + ' / ' + m.hub + '</a>', m.folders.map(esc).join(", ")];
    }));
  if (kind === "defaults") return H + '<p>Every documented default in one place (415):</p>' + refTable(["Case", "Default", "When"], DEFAULTS.map(function (d) { return [esc(d[0]), esc(d[1]), esc(d[2])]; }));
  if (kind === "mappings") return H + '<p>How a request lands (420):</p>' + refTable(["Request", "Lands on", "Fields", "Rule"], EXAMPLE_MAPPINGS.map(function (m) {
    return [esc(m.request), esc(m.lands), esc(m.fields), esc(m.rule)];
  }));
  if (kind === "validation") return H + '<p>The validation wall (413): every extracted field passes the same rules as the manual forms before a confirmation is even shown.</p>' +
    "<ul class='ai-help'><li>Amount must be more than zero.</li><li>Names must be page 3's own transaction names.</li><li>Contra entries need the bank name.</li><li>Credit needs the person's name; Bank needs the bank's name.</li><li>Recoveries take Cash or Bank only.</li><li>Stock quantities never push the balance below zero.</li><li>Register prices must be more than zero.</li><li>Registrations need a name or the unidentified mark.</li></ul>";
  if (kind === "cards") return H + '<p>The card library (419) - one card shape per kind of answer:</p>' +
    cardShell("intro", "Intro card", "<p>What the AI can do, in examples (423).</p>") +
    cardShell("confirm", "Confirmation card (395)", "<p>Target module, fields, Allow / Edit / Cancel - nothing saves without it.</p>") +
    cardShell("clarify", "Clarification card (394)", "<p>One short, direct question when a critical detail is missing.</p>") +
    cardShell("tool", "Tool output card (392)", "<p>Which tool ran, what it produced, the download link (391).</p>") +
    cardShell("done", "Saved card (400)", "<p>What was written, with the module links.</p>") +
    cardShell("error", "Error card (403)", "<p>What failed, input preserved, Ready again.</p>") +
    cardShell("status", "Status card (401)", "<p>Cancelled and discarded - Ready.</p>") +
    cardShell("route", "Routing card (374)", "<p>The exact desk this request belongs to.</p>") +
    cardShell("answer", "Answer card (409)", "<p>Live data, read only.</p>");
  if (kind === "help") return H + '<p>What the AI can do, in examples (423):</p>' +
    '<ul class="ai-help">' + HELP_EXAMPLES.map(function (e) { return "<li><b>" + esc(e[0]) + "</b> - " + esc(e[1]) + "</li>"; }).join('') + '</ul>' +
    '<div class="ai-actions"><a class="ai-btn" href="/ai/329">Open the AI hub</a></div>';
  if (kind === "wiring") return H + '<p>The wiring (406): the AI connects exclusively through SERVER/server.js to SERVER/linker.js and public/502.js - requireAuth, Google authentication, Firestore and the centralized hosting configuration, exactly like every other page.</p>' +
    '<ul class="ai-help"><li>Every AI page imports its engine from <b>/ai/329.js</b>, which imports <b>/502.js</b> - the same module every page trusts.</li><li>requireAuth() bounces a signed-out visitor to the door, the same guard everywhere.</li><li>All writes go through the Firestore SDK instance 502.js carries - no second connection, no side door.</li><li>The engine file is <b>public/ai/329.js</b>; the settings source stays SERVER/server.js and the sync writes the generated files.</li></ul>';
  if (kind === "admin-controls") return H + '<p>The administrator controls (405): the AI pages are ordinary pages of the tree, so every element stays compatible with the live minus (hide) and plus controls of the sidebar - one click hides an AI area for every user at once, the closed branch shows red for the administrator, and the Hidden panel restores it. The AI pages add no private DOM contract of their own: they use the same main.wrap, card and table classes every other page uses.</p>';
  if (kind === "home-button") return H + '<p>The AI button on the Home Screen (407): the Home grid is built from menu.js, so the AI area appears beside the three square tiles, and the tile opens the AI hub (329) directly. The same door the left sidebar entry uses.</p><div class="ai-actions"><a class="ai-btn" href="/">Open Home</a></div>';
  if (kind === "sidebar") return H + '<p>The sidebar entry (408): the AI area is drawn from menu.js, filtered by the same grant rules as every other area and hideable by the administrator with the area minus. A user granted "ai" sees the whole AI tree; the child folders inherit the parent grant exactly like the medical wing\'s children do.</p>';
  if (kind === "input-bar") return H + '<p>The input bar and the up-arrow send button (344):</p>' +
    "<ul class='ai-help'><li>Deactivated arrow while nothing is written and no file is attached.</li><li>Blue the moment text is typed or a valid file or image is attached.</li><li>On send: the bar clears, the input locks while the AI works, the button becomes a filled circle.</li><li>Back to the deactivated arrow once the AI is Ready.</li></ul>" +
    '<p>Try it live on the hub: <a href="/ai/329">/ai/329</a>.</p>';
  if (kind === "attachments") return H + '<p>The attachment rules (345): images (receipts, invoices, photos, handwritten notes) and documents (PDF, Word, Excel, CSV, text, archives and friends) may ride with any message; no limit on storage or file size and no limit on how many times a user uploads. Every picked file shows as a preview card above the input - thumbnail for images, type and size for the rest - with a reading progress bar and a remove button per file, and the files are held in the session attachment store (418) for the AI to read.</p>';
  if (kind === "blocked-uploads") return H + '<p>The upload guard (346): video and audio files are strictly not allowed - any attempt to attach either is blocked immediately with a clear rejection notice, before the send button ever activates. The audio and video TOOLS stay reachable for work the system itself performs (386) - the guard is on the input side only.</p>';
  if (kind === "image-reading") return H + '<p>Image understanding (347): a photographed receipt, invoice, photo or handwritten note is read (OCR, the same engine the OCR Image tool loads) together with the typed text and turned into the exact fields, amounts and names the target module expects.</p>';
  if (kind === "document-reading") return H + '<p>Document understanding (348): PDF, Word, Excel, CSV and text files are read together with the typed text and turned into the exact fields, tables and entries the target module expects. PDF text is read with the same pdf.js the PDF tools load; spreadsheets with the same SheetJS; DOCX by reading the document XML directly.</p>';
  if (kind === "languages") return H + '<p>Language understanding (349): Swahili, English or a mix are read the same way - "nimeuza 500" lands exactly like "sales 500". The lexicon sits in the shared engine; unmapped words come back as one short clarification question instead of a guess.</p>' +
    refTable(["Say", "Lands as"], [["nimeuza 500", "Sales, IN, 500, Cash"], ["bought stock 12000 bank", "Purchases, OUT, 12000, Bank"], ["nimelipa kodi 20000", "Rent, OUT, 20000"], ["mchango 1000", "Donation, IN, 1000"]]);
  if (kind === "tool-status") return H + '<p>Tool run status (392): which tool ran, what it produced and what failed are reported back as structured tool output cards in the conversation. Failures keep the user\'s input and reset to Ready (403).</p>';
  if (kind === "convert-delivery") return H + '<p>The converted file delivery (391): the finished file comes back as a download link with clear status feedback, ready to save. The link is captured from the very blob the tool produced - the tool does the work, the AI carries the result back.</p>';
  if (kind === "file-viewer") return H + '<p>All File Viewer through the AI (390): pick any file from the device, the AI names its type and hands it to page 393, the viewer every page trusts.</p><div class="ai-actions"><a class="ai-btn" href="/file-viewer/393">Open the File Viewer (393)</a></div>';
  if (kind === "batch-engine") return H + '<p>The shared batch engine (411): the one extraction pass behind every multi-item confirmation - five sales from a receipt, ten stock items from a spreadsheet - all items shown in one summary before anything saves. Segments split on new lines, semicolons and "and then".</p>';
  if (kind === "execute") return H + '<p>The executor (400): a confirmed action completes with the logged-in user\'s identity and timestamp - the Firestore write through the exact collections and validation the manual page uses, or the convertor tool run. The write shape is the manual form\'s own shape, plus the AI audit fields (414).</p>';
  if (kind === "cancel") return H + '<p>Cancel and discard (401): a rejected action saves nothing - the pending action is discarded and the AI resets to Ready, the input bar unlocked.</p>';
  if (kind === "feedback") return H + '<p>Post-completion feedback (402): the saved record summary, the updated balance or stock count, or the converted file download link, then the status Ready and the send button back to the deactivated arrow.</p>';
  if (kind === "errors") return H + '<p>Error handling (403): a failed database write or a failed file conversion shows a clear error notice explaining what failed, without losing the user\'s input, and the AI resets to Ready.</p>';
  if (kind === "clarification") return H + '<p>The clarification step (394): when critical details are missing or ambiguous - a missing amount, an unregistered stock item - the AI asks one short, direct question before anything else happens. The answer continues the same action.</p>';
  if (kind === "confirmation") return H + '<p>The confirmation summary (395): before any record is saved or any action completes, the AI shows the target module, the extracted fields and values or the selected system tool, with Confirm / Allow and Cancel / Edit controls; nothing ever saves without it.</p>';
  if (kind === "audit") return H + '<div id="ai-audit-list"><div class="ai-loading">Reading the audit trail...</div></div><p class="sub">Every AI write carries the logged-in user\'s identity and timestamp (414); this page reads the aiHistory entries live.</p>';
  if (kind === "history") return H + '<div id="ai-history-list"><div class="ai-loading">Reading the history...</div></div><p class="sub">Past conversations and completed actions, kept retrievable - an earlier request can be read and undone by hand through its own page (417).</p>';
  if (kind === "session") return H + '<div id="ai-session-box"><div class="ai-loading">Reading the session...</div></div><p class="sub">The working memory of the current conversation (416): the pending action, the attached files and the last status, cleared when the action completes, cancels or fails.</p>';
  if (kind === "attachment-store") return H + '<div id="ai-store-box"><div class="ai-loading">Reading the store...</div></div><p class="sub">Every uploaded image and document held for the AI to read (418) - no storage or size limit, no limit on how many times a user uploads.</p>';
  if (kind === "grants") return H + '<div id="ai-grants-box"><div class="ai-loading">Reading the grants...</div></div>';
  if (kind === "status") return H + '<div id="ai-status-box"></div>';
  if (kind === "queries") return H + '<p>The read-only question engine (409) lives in the conversation - open the hub and ask:</p><ul class="ai-help"><li>How much cash did we make today?</li><li>Bank today?</li><li>What did we pay out today?</li><li>Check stock for sugar</li><li>Show patient 4827ABCD status</li></ul><p>Every answer is read live and modifies nothing.</p><div class="ai-actions"><a class="ai-btn" href="/ai/329">Open the AI hub</a></div>';
  if (kind === "packages-units") return H + '<p>The package bridge inside the AI (367): a quantity typed as Packages and a quantity typed as Units calculate each other from Units per Package, the same bridge the manual stock pages use - "sales 2 packages of sugar" becomes units = 2 x Units per Package at save time.</p>';
  if (kind === "stock-balance") return H + '<p>The stock balance engine (369): IN adds and OUT deducts, never below zero, and Units Present is updated the moment a change is saved, so the AI always reports the live position of every registered stock. Ask "check stock for sugar" on the hub.</p>';
  if (kind === "triage-consultation" || kind === "pharmacy-treatment" || kind === "wards-beds") {
    return H + '<p>The AI maps these requests to the exact desk and hands them over - these stages run their own multi-step processes (376, 377, 378):</p><div class="ai-actions">' +
      '<a class="ai-btn" href="/triage/323">Triage (323)</a><a class="ai-btn" href="/nurse-consultation/324">Nursing (324)</a>' +
      '<a class="ai-btn" href="/doctor-consultation/325">Doctor (325)</a><a class="ai-btn" href="/pharmacy/326">Pharmacy (326)</a>' +
      '<a class="ai-btn" href="/treatment-procedures/327">Treatments (327)</a><a class="ai-btn" href="/ward-registration/331">Wards and Beds</a></div>';
  }
  return H + '<p>This page renders live from the shared engine.</p>';
}

async function refHistory(box) {
  try {
    const snap = await getDocs(query(collection(db, "aiHistory"), orderBy("createdAt", "desc"), limit(100)));
    const rows = [];
    snap.forEach(function (d) {
      const t = d.data();
      if (!S.isAdmin && t.uid !== (S.user ? S.user.uid : "")) return;
      const when = t.createdAt && t.createdAt.toDate ? t.createdAt.toDate().toLocaleString("en-GB") : "";
      rows.push([esc(t.action || ""), esc(t.request || ""), esc(t.status || ""), esc(when), esc(t.email || "")]);
    });
    document.getElementById("ai-history-list").innerHTML =
      rows.length ? refTable(["Action", "Request", "Status", "When", "User"], rows) : "<p>No history yet - completed actions appear here (417).</p>";
  } catch (e) {
    document.getElementById("ai-history-list").innerHTML = "<p>Could not read the history: " + esc(e.message) + "</p>";
  }
}

async function refAudit(box) {
  try {
    const snap = await getDocs(query(collection(db, "aiHistory"), orderBy("createdAt", "desc"), limit(60)));
    const rows = [];
    snap.forEach(function (d) {
      const t = d.data();
      const when = t.createdAt && t.createdAt.toDate ? t.createdAt.toDate().toLocaleString("en-GB") : "";
      rows.push([esc(t.action || ""), esc(t.status || ""), esc(t.email || ""), esc(when)]);
    });
    const el = document.getElementById("ai-audit-list");
    if (el) el.innerHTML = rows.length ? refTable(["Action", "Status", "User", "When"], rows) : "<p>No AI writes recorded yet (414).</p>";
  } catch (e) { /* the page stays on its note */ }
}

async function refGrants(box) {
  const el = document.getElementById("ai-grants-box");
  if (!el) return;
  const rows = MODULE_MAP.map(function (m) {
    const ok = m.folders.some(function (f) { return grantAllows(f); });
    return [esc(m.label), ok ? "granted" : "not granted", '<a href="/' + m.hubFolder + '/' + m.hub + '">hub ' + m.hub + '</a>'];
  });
  el.innerHTML = refTable(["Module", "This account", "Hub"], rows) +
    "<p class='sub'>The AI grant filter (404): only the modules this account may open are reachable and executable by the AI.</p>";
}

function refStatus(box) {
  const el = document.getElementById("ai-status-box");
  if (el) el.innerHTML = refTable(["State", "What the user sees"], [
    ["Ready", "the deactivated arrow; typing or attaching turns it blue"],
    ["Processing", "the input locks and the button becomes a filled circle"],
    ["Needs-confirmation", "a confirmation card waits for Allow, Edit or Cancel"]
  ]);
}

async function refSession(box) {
  const el = document.getElementById("ai-session-box");
  if (!el) return;
  el.innerHTML = refTable(["Field", "Value"], [
    ["Status", esc(S.status)],
    ["Desk", esc(S.desk || "-")],
    ["Pending action", S.pending ? esc(S.pending.kind) : "none"],
    ["Attachments", String(S.attachments.length)]
  ]);
}

async function refStore(box) {
  const el = document.getElementById("ai-store-box");
  if (!el) return;
  el.innerHTML = "<p>" + (S.attachments.length ? S.attachments.map(function (f) { return esc(f.name); }).join("<br>") : "The store is empty on this page - attachments ride with the conversation on the desk pages (418).") + "</p>";
}

/* boot(opts): opts.desk = the chat desk key, opts.ref = the reference key,
 * opts.n = the page number, opts.label = the label shown on the intro. */
export async function boot(opts) {
  const o = opts || {};
  S.desk = o.desk || null;
  S.n = o.n || null;
  S.deskLabel = o.label || null;
  const root = document.getElementById("ai-app") || document.getElementById("ai-ref");
  if (!root) return;
  if (o.ref) {
    await requireAuth();
    let session = null;
    try { session = JSON.parse(sessionStorage.getItem("JAMALI_SYSTEM_SESSION") || "null"); } catch (e) { session = null; }
    S.isAdmin = !!(session && session.role === "admin");
    S.grants = session && Array.isArray(session.grants) ? session.grants.slice() : [];
    S.user = auth.currentUser || null;
    root.innerHTML = '<div class="ai-ref" id="ai-ref-body"></div>';
    const box = document.getElementById("ai-ref-body");
    box.innerHTML = renderRef(o.ref);
    if (o.ref === "history") await refHistory(box);
    if (o.ref === "audit") await refAudit(box);
    if (o.ref === "grants") await refGrants(box);
    if (o.ref === "session") await refSession(box);
    if (o.ref === "attachment-store") await refStore(box);
    if (o.ref === "status") refStatus(box);
  } else {
    await bootDesk(root);
  }
}

/* The hub self-boots when 329.html loads this file as its own module. */
if (typeof window !== "undefined" && typeof location !== "undefined") {
  const seg = location.pathname.split("/").filter(Boolean);
  if (seg[0] === "ai" && (seg[1] === "329" || seg[1] === "329/")) {
    /* ?m=<number> opens that page of the family directly - the sidebar and
     * the Home Screen AI tile build exactly these addresses (407, 408) */
    let target = null;
    const m = Number(new URLSearchParams(location.search).get("m") || "0");
    if (m) target = AI_PAGES.find(function (x) { return x.n === m; });
    const start = function () {
      if (target && target.desk) boot({ desk: target.desk, n: target.n, label: target.label });
      else if (target && target.ref) boot({ ref: target.ref, n: target.n, label: target.label });
      else boot({ desk: "hub", n: 329, label: "the AI hub" });
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
    else start();
  }
}
