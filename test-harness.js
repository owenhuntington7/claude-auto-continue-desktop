/**
 * Smoke test for AutoContinueAction. Paste AFTER setup.js and
 * action-auto-continue.js.
 *
 * Builds fake DOM nodes shaped like the real "Continue" banner, compose box,
 * and send button, then calls check()/execute() directly (bypassing the
 * MutationObserver, which is just generic plumbing, not what this is
 * testing). Confirms the detection and action logic work against the assumed
 * DOM shape.
 *
 * This does NOT confirm the real banner selector matches Claude Desktop's
 * actual markup. That only gets confirmed live, the next time the real limit
 * banner shows up. If a real banner doesn't fire AutoContinue but this test
 * passes, the assumed shape in check() is wrong, not the test.
 *
 * The compose-box and send-button lookups are both pointed at fakes, so this
 * never types into or submits the real chat. Cleans up every node it
 * creates. Safe to paste multiple times.
 */
(async () => {
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
  if (typeof action.findComposer !== "function" || typeof action.findSendButton !== "function") {
    console.error("Registered AutoContinue is an old version without findComposer()/findSendButton(). Re-paste action-auto-continue.js first.");
    return;
  }

  const makeBanner = () => {
    const alert = document.createElement("div");
    alert.setAttribute("role", "alert");
    const btn = document.createElement("button");
    btn.textContent = "Continue";
    const state = { clicked: false };
    btn.addEventListener("click", () => { state.clicked = true; });
    alert.appendChild(btn);
    document.body.appendChild(alert);
    return { alert, btn, state };
  };

  const makeComposer = () => {
    const box = document.createElement("div");
    box.setAttribute("contenteditable", "true");
    box.classList.add("ProseMirror");
    document.body.appendChild(box);
    return box;
  };

  const makeSend = (disabled) => {
    const btn = document.createElement("button");
    btn.setAttribute("aria-label", "Send message");
    btn.disabled = !!disabled;
    const state = { clicked: false };
    btn.addEventListener("click", () => { state.clicked = true; });
    document.body.appendChild(btn);
    return { btn, state };
  };

  const savedHarness = window.autoContinueHarnessMessage;
  const originalFindComposer = action.findComposer;
  const originalFindSend = action.findSendButton;

  try {
    // --- Test 1: plain click path ---
    delete window.autoContinueHarnessMessage;
    const b1 = makeBanner();
    const d1 = action.check();
    assert("check() finds the fake banner", d1 && d1.button === b1.btn);
    if (d1) await action.execute(d1);
    assert("execute() clicks Continue when no harness message is set", b1.state.clicked);
    b1.alert.remove();

    // --- Test 2: harness path, send button enabled ---
    const b2 = makeBanner();
    const box2 = makeComposer();
    const s2 = makeSend(false);
    action.findComposer = () => box2;
    action.findSendButton = () => s2.btn;
    window.autoContinueHarnessMessage = "test harness message";
    const d2 = action.check();
    if (d2) await action.execute(d2);
    assert("execute() types the harness message", box2.textContent === "test harness message");
    assert("execute() clicks the send button", s2.state.clicked);
    assert("execute() does not click Continue when send succeeds", !b2.state.clicked);
    b2.alert.remove(); box2.remove(); s2.btn.remove();

    // --- Test 3: send button starts disabled, enables after insert ---
    const b3 = makeBanner();
    const box3 = makeComposer();
    const s3 = makeSend(true);
    action.findComposer = () => box3;
    action.findSendButton = () => s3.btn;
    setTimeout(() => { s3.btn.disabled = false; }, 200);
    const d3 = action.check();
    if (d3) await action.execute(d3);
    assert("execute() waits for a disabled send button to enable, then clicks it", s3.state.clicked);
    b3.alert.remove(); box3.remove(); s3.btn.remove();

    // --- Test 4: findSendButton prefers the button near the composer ---
    action.findSendButton = originalFindSend;
    const decoy = document.createElement("button");
    decoy.setAttribute("aria-label", "Send feedback");
    document.body.prepend(decoy);
    const wrap = document.createElement("div");
    const inner = document.createElement("div");
    const box4 = document.createElement("div");
    const near = document.createElement("button");
    near.setAttribute("aria-label", "Send message");
    inner.appendChild(box4);
    wrap.appendChild(inner);
    wrap.appendChild(near);
    document.body.appendChild(wrap);
    assert("findSendButton() picks the send button near the composer over a page-wide decoy", action.findSendButton(box4) === near);
    decoy.remove(); wrap.remove();

    // --- Test 5: no banner present ---
    delete window.autoContinueHarnessMessage;
    assert("check() returns null when no banner is present", action.check() === null);
  } finally {
    action.findComposer = originalFindComposer;
    action.findSendButton = originalFindSend;
    if (savedHarness === undefined) {
      delete window.autoContinueHarnessMessage;
    } else {
      window.autoContinueHarnessMessage = savedHarness;
    }
  }

  const failed = results.filter((r) => !r.pass).length;
  console.log(failed === 0 ? `All ${results.length} checks passed.` : `${failed} of ${results.length} checks failed.`);
})();
