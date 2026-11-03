

// Stock Register - the Package and Unit link.
//
// Package and Unit are two representations of the same stock quantity,
// joined by Units per Package:
//
//     packages x unitsPerPackage = units
//
// Type the Package quantity and the Unit quantity calculates itself;
// type the Unit quantity and the Package quantity calculates itself.
// Clearing one side clears the other, so the pair always describes one
// and the same quantity. Dependency-free on purpose: the page imports
// it straight from Firestore-free land and the tests can too.

export function wirePackageUnitLink(form) {
  const inp = (k) => form.querySelector('[data-f="' + k + '"]');
  const upp = inp("unitsPerPackage");
  const pk = inp("packages");
  const un = inp("units");
  if (!upp || !pk || !un) return { reset() { } };

  const round = (n) => Math.round(n * 10000) / 10000;
  let last = "";

  let hint = form.querySelector(".r-link-hint");
  if (!hint) {
    hint = document.createElement("p");
    hint.className = "r-link-hint";
    const grid = form.querySelector(".form-grid");
    grid.parentNode.insertBefore(hint, grid.nextSibling);
  }

  function updateHint() {
    const uppN = Number(upp.value);
    if (!uppN || uppN <= 0) {
      hint.textContent = "Enter Units per Package first \u2014 the Package and Unit boxes fill each other from it.";
      hint.classList.add("is-wait");
      return false;
    }
    hint.textContent = "1 package = " + round(uppN) + " units \u2014 type the Package or the Unit quantity and the other box calculates itself.";
    hint.classList.remove("is-wait");
    return true;
  }

  function calc() {
    if (!updateHint()) return;
    const uppN = Number(upp.value);
    if (last === "pk") {
      un.value = pk.value === "" ? "" : (round(Number(pk.value) * uppN) || "");
    } else if (last === "un") {
      pk.value = un.value === "" ? "" : (round(Number(un.value) / uppN) || "");
    }
  }

  form.addEventListener("input", (ev) => {
    if (ev.target === pk) { last = "pk"; calc(); }
    else if (ev.target === un) { last = "un"; calc(); }
    else if (ev.target === upp) calc();
  });

  updateHint();
  return {
    reset() { last = ""; updateHint(); }
  };
}
