/* JAMALI — page 62 · Computer
   Quick maths for the books: keypad + keyboard, memory keys and a
   persistent tape. Pure tool — nothing here touches the books. */
(function () {

  var TAPE_KEY = "jamali_computer_tape";
  var MEM_KEY = "jamali_computer_mem";

  // ---- state -----------------------------------------------------------
  var cur = "0";      // entry as typed (plain digits)
  var acc = null;     // accumulator
  var op = null;      // pending operation: + - * /
  var fresh = false;  // next digit starts a new entry
  var err = "";       // error state ("Error")
  var exprText = "";  // shows the finished sum after "="
  var mem = 0;
  var tape = [];

  try { mem = parseFloat(localStorage.getItem(MEM_KEY)) || 0; } catch (e) {}
  try { tape = JSON.parse(localStorage.getItem(TAPE_KEY) || "[]"); } catch (e) { tape = []; }
  if (!Array.isArray(tape)) tape = [];

  var OPD = { "+": "+", "-": "\u2212", "*": "\u00d7", "/": "\u00f7" };

  // ---- helpers ---------------------------------------------------------
  function fmt(s) {
    if (typeof s === "number") s = String(s);
    if (s === "" || s === undefined) return "0";
    var neg = s.charAt(0) === "-";
    var body = neg ? s.slice(1) : s;
    var parts = body.split(".");
    if (/^\d+$/.test(parts[0])) parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return (neg ? "-" : "") + (parts.length > 1 ? parts[0] + "." + parts[1] : parts[0]);
  }

  function clean(n) { return parseFloat(n.toPrecision(12)); }

  function calc(a, b, o) {
    var r = o === "+" ? a + b : o === "-" ? a - b : o === "*" ? a * b : (b === 0 ? NaN : a / b);
    return (typeof r !== "number" || isNaN(r) || !isFinite(r)) ? null : clean(r);
  }

  // ---- dom -------------------------------------------------------------
  var app = document.getElementById("app");
  app.innerHTML =
    '<div class="card comp-card">' +
      '<div class="comp-top"><span class="comp-expr" id="c62-expr">&nbsp;</span><span class="comp-mem" id="c62-mem" hidden>M</span></div>' +
      '<div class="comp-disp" id="c62-disp">0</div>' +
    '</div>' +
    '<div class="card comp-pad-card">' +
      '<div class="comp-memrow">' +
        '<button type="button" data-m="MC">MC</button>' +
        '<button type="button" data-m="MR">MR</button>' +
        '<button type="button" data-m="M+">M+</button>' +
        '<button type="button" data-m="M-">M&#8722;</button>' +
      '</div>' +
      '<div class="comp-pad" id="c62-pad">' +
        '<button type="button" class="k-fn" data-k="C">C</button>' +
        '<button type="button" class="k-fn" data-k="back">&#9003;</button>' +
        '<button type="button" class="k-fn" data-k="%">%</button>' +
        '<button type="button" class="k-op" data-k="/">&#247;</button>' +
        '<button type="button" data-k="7">7</button>' +
        '<button type="button" data-k="8">8</button>' +
        '<button type="button" data-k="9">9</button>' +
        '<button type="button" class="k-op" data-k="*">&#215;</button>' +
        '<button type="button" data-k="4">4</button>' +
        '<button type="button" data-k="5">5</button>' +
        '<button type="button" data-k="6">6</button>' +
        '<button type="button" class="k-op" data-k="-">&#8722;</button>' +
        '<button type="button" data-k="1">1</button>' +
        '<button type="button" data-k="2">2</button>' +
        '<button type="button" data-k="3">3</button>' +
        '<button type="button" class="k-op" data-k="+">+</button>' +
        '<button type="button" class="k-fn" data-k="pm">&#177;</button>' +
        '<button type="button" data-k="0">0</button>' +
        '<button type="button" data-k=".">.</button>' +
        '<button type="button" class="k-eq" data-k="=">=</button>' +
      '</div>' +
    '</div>' +
    '<div class="card comp-tape-card">' +
      '<div class="comp-tape-head"><h2>Tape</h2><button type="button" class="tape-clear" id="c62-clear">Clear tape</button></div>' +
      '<div class="comp-tape" id="c62-tape"></div>' +
      '<p class="count-line" id="c62-count"></p>' +
    '</div>';

  var disp = document.getElementById("c62-disp");
  var expr = document.getElementById("c62-expr");
  var memEl = document.getElementById("c62-mem");
  var tapeEl = document.getElementById("c62-tape");
  var countEl = document.getElementById("c62-count");

  // ---- tape ------------------------------------------------------------
  function saveTape() { try { localStorage.setItem(TAPE_KEY, JSON.stringify(tape)); } catch (e) {} }

  function addTape(a, o, b, r) {
    tape.unshift({ a: a, o: o, b: b, r: r });
    if (tape.length > 50) tape.length = 50;
    saveTape();
    renderTape();
  }

  function renderTape() {
    if (!tape.length) {
      tapeEl.innerHTML = '<p class="tape-empty">No calculations yet. Every sum lands here.</p>';
      countEl.textContent = "";
      return;
    }
    tapeEl.innerHTML = tape.map(function (t) {
      return '<button type="button" class="tape-row" data-r="' + t.r + '">' +
        '<span class="e">' + fmt(String(t.a)) + " " + OPD[t.o] + " " + fmt(String(t.b)) + '</span>' +
        '<span class="r">' + fmt(String(t.r)) + '</span></button>';
    }).join("");
    countEl.textContent = tape.length + (tape.length === 1 ? " calculation" : " calculations") + " on the tape. Tap a line to reuse its result.";
  }

  // ---- render ----------------------------------------------------------
  function render() {
    disp.textContent = err ? err : fmt(cur);
    expr.innerHTML = err ? "&nbsp;" : (op !== null ? fmt(String(acc)) + " " + OPD[op] : (exprText || "&nbsp;"));
    memEl.hidden = mem === 0;
    memEl.title = "Memory: " + fmt(String(mem));
  }

  // ---- keys ------------------------------------------------------------
  function input(k) {
    if (err) {
      if (k !== "C" && !/^[0-9.]$/.test(k)) return;
      err = ""; cur = "0"; acc = null; op = null; fresh = false; exprText = "";
      if (k === "C") { render(); return; }
    }
    if (/^[0-9]$/.test(k)) {
      if (fresh) { cur = "0"; fresh = false; exprText = ""; }
      if (cur.replace(/[-.]/g, "").length >= 14) return;
      cur = cur === "0" ? k : (cur === "-0" ? "-" + k : cur + k);
    } else if (k === ".") {
      if (fresh) { cur = "0"; fresh = false; exprText = ""; }
      if (cur.indexOf(".") < 0) cur += ".";
    } else if (k === "C") {
      cur = "0"; acc = null; op = null; fresh = false; exprText = "";
    } else if (k === "back") {
      if (fresh) fresh = false;
      cur = cur.length > 1 ? cur.slice(0, -1) : "0";
      if (cur === "-" || cur === "") cur = "0";
      exprText = "";
    } else if (k === "pm") {
      if (cur !== "0") cur = cur.charAt(0) === "-" ? cur.slice(1) : "-" + cur;
    } else if (k === "%") {
      var v = parseFloat(cur);
      if (!isNaN(v)) { cur = String(clean(v / 100)); fresh = true; }
    } else if (k === "=") {
      if (op !== null && acc !== null) {
        var b = parseFloat(cur);
        var r = calc(acc, b, op);
        if (r === null) { err = "Error"; cur = "0"; acc = null; op = null; }
        else {
          exprText = fmt(String(acc)) + " " + OPD[op] + " " + fmt(String(b)) + " =";
          addTape(acc, op, b, r);
          cur = String(r); acc = null; op = null; fresh = true;
        }
      }
    } else if (k === "+" || k === "-" || k === "*" || k === "/") {
      if (op !== null && acc !== null && !fresh) {
        var b2 = parseFloat(cur);
        var r2 = calc(acc, b2, op);
        if (r2 === null) { err = "Error"; cur = "0"; acc = null; op = null; render(); return; }
        acc = r2; cur = String(r2);
      } else {
        acc = parseFloat(cur);
      }
      op = k; fresh = true; exprText = "";
    }
    render();
  }

  function memory(k) {
    var v = parseFloat(cur) || 0;
    if (k === "MC") mem = 0;
    else if (k === "MR") { cur = String(clean(mem)); fresh = true; exprText = ""; }
    else if (k === "M+") { mem = clean(mem + v); }
    else if (k === "M-") { mem = clean(mem - v); }
    try { localStorage.setItem(MEM_KEY, String(mem)); } catch (e) {}
    render();
  }

  // ---- wiring ----------------------------------------------------------
  document.getElementById("c62-pad").addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-k]");
    if (btn) input(btn.getAttribute("data-k"));
  });
  document.querySelector(".comp-memrow").addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-m]");
    if (btn) memory(btn.getAttribute("data-m"));
  });
  tapeEl.addEventListener("click", function (e) {
    var row = e.target.closest(".tape-row");
    if (!row) return;
    cur = String(parseFloat(row.getAttribute("data-r")));
    fresh = true; exprText = "";
    render();
  });
  document.getElementById("c62-clear").addEventListener("click", function () {
    tape = []; saveTape(); renderTape();
  });

  window.addEventListener("keydown", function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var k = null;
    if (/^[0-9]$/.test(e.key)) k = e.key;
    else if (e.key === "." || e.key === ",") k = ".";
    else if (e.key === "+") k = "+";
    else if (e.key === "-") k = "-";
    else if (e.key === "*" || e.key.toLowerCase() === "x") k = "*";
    else if (e.key === "/") k = "/";
    else if (e.key === "Enter" || e.key === "=") k = "=";
    else if (e.key === "Backspace") k = "back";
    else if (e.key === "Escape" || e.key === "Delete") k = "C";
    else if (e.key === "%") k = "%";
    if (k) { e.preventDefault(); input(k); }
  });

  renderTape();
  render();
})();
