/**
 * Smoke test for AutoContinueAction. Paste AFTER setup.js and
 * action-auto-continue.js.
 *
 * Builds fake DOM nodes shaped like the real "Continue" banner and compose
 * box, then calls check()/execute() directly (bypassing the MutationObserver,
 * which is just generic plumbing, not what this is testing). Confirms the
 * detection and action logic work against the assumed DOM shape.
 *
 * This does NOT confirm the real selectors match Claude Desktop's actual
 * markup. That only gets confirmed live, the next time the real limit banner
 * shows up. If a real banner doesn't fire AutoContinue but this test passes,
 * the assumed shape in check()/execute() is wrong, not the test.
 *
 * Cleans up every node it creates. Safe to paste multiple times.
 */
(() => {
  const results = [];
  const assert = (label, condition) => {
    results.push({ label, pass: !!condition });
    console.log(condition ? `[PASS] ${label}` : `[FAIL] ${label}`);
  };

  const action = window.autoActionsRegistry?.find((a) => a.name === "AutoContinue");
  if (!action) {
    console.error("AutoContinue not registered. Paste setup.js then action-auto-continue.js first.");
    return;
  }
  if (typeof action.findComposer !== "function") {
    console.error("Registered AutoContinue is an old version without findComposer(). Re-paste action-auto-continue.js first.");
    return;
  }

  // --- Test 1: plain click path ---
  const fakeAlert = document.createElement("div");
  fakeAlert.setAttribute("role", "alert");
  const fakeButton = document.createElement("button");
  fakeButton.textContent = "Continue";
  let clicked = false;
  fakeButton.addEventListener("click", () => { clicked = true; });
  fakeAlert.appendChild(fakeButton);
  document.body.appendChild(fakeAlert);

  const savedHarness = window.autoContinueHarnessMessage;
  delete window.autoContinueHarnessMessage;

  const detected1 = action.check();
  assert("check() finds the fake banner", detected1 && detected1.button === fakeButton);
  if (detected1) action.execute(detected1);
  assert("execute() clicks the button when no harness message is set", clicked);

  document.body.removeChild(fakeAlert);

  // --- Test 2: harness message path ---
  const fakeAlert2 = document.createElement("div");
  fakeAlert2.setAttribute("role", "alert");
  const fakeButton2 = document.createElement("button");
  fakeButton2.textContent = "Continue";
  let clicked2 = false;
  fakeButton2.addEventListener("click", () => { clicked2 = true; });
  fakeAlert2.appendChild(fakeButton2);
  document.body.appendChild(fakeAlert2);

  const fakeEditable = document.createElement("div");
  fakeEditable.setAttribute("contenteditable", "true");
  fakeEditable.classList.add("ProseMirror");
  let enterDispatched = false;
  fakeEditable.addEventListener("keydown", (e) => { if (e.key === "Enter") enterDispatched = true; });
  document.body.appendChild(fakeEditable);

  window.autoContinueHarnessMessage = "test harness message";
  // Point the composer lookup at the fake box so the test never touches the
  // real compose box. Restored in finally, even if execute() throws.
  const originalFindComposer = action.findComposer;
  action.findComposer = () => fakeEditable;
  try {
    const detected2 = action.check();
    if (detected2) action.execute(detected2);
  } finally {
    action.findComposer = originalFindComposer;
  }

  assert("execute() types the harness message instead of clicking", fakeEditable.textContent === "test harness message");
  assert("execute() does not click the button when a harness message is set", !clicked2);
  assert("execute() dispatches Enter on the compose box", enterDispatched);

  document.body.removeChild(fakeAlert2);
  document.body.removeChild(fakeEditable);

  // --- Test 3: no banner present ---
  delete window.autoContinueHarnessMessage;
  assert("check() returns null when no banner is present", action.check() === null);

  // restore whatever harness message was set before this test ran
  if (savedHarness === undefined) {
    delete window.autoContinueHarnessMessage;
  } else {
    window.autoContinueHarnessMessage = savedHarness;
  }

  const failed = results.filter((r) => !r.pass).length;
  console.log(failed === 0 ? `All ${results.length} checks passed.` : `${failed} of ${results.length} checks failed.`);
})();
