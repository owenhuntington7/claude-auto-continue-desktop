/**
 * AutoContinue action for Claude Desktop's per-turn tool-use limit banner.
 * Paste AFTER setup.js.
 *
 * Detection: a "Continue" button inside an alert-role container, not just any
 * button anywhere named "continue" (avoids matching the word in chat history).
 *
 * Optional harness: set window.autoContinueHarnessMessage to a string before
 * pasting this file, and instead of clicking the button, it types that message
 * into the compose box and submits it. EXPERIMENTAL: text insertion was
 * rewritten 2026-09-30 after the first version failed live, and submission is
 * still untested. Leave unset for a plain click, which is the reliable default
 * since the button already does the right thing on its own.
 *
 * UNVERIFIED against the current Claude Desktop DOM as of this writing. Every
 * fork in this lineage (RafalWilinski -> rvanbaalen -> zudsniper) needed its
 * selectors patched when Anthropic changed the UI. Check the console log after
 * pasting: if nothing fires when the banner is visible, open Developer Tools'
 * Elements tab, inspect the actual button and its ancestor, and adjust the
 * selectors in check() below to match.
 */
class AutoContinueAction extends BaseAction {
  constructor() {
    super("AutoContinue");
  }

  check() {
    const alertContainers = Array.from(document.querySelectorAll('[role="alert"]'));
    for (const container of alertContainers) {
      const button = Array.from(container.querySelectorAll("button")).find(
        (b) => b.textContent.trim().toLowerCase() === "continue"
      );
      if (button) return { button };
    }
    return null;
  }

  // Separate method so test-harness.js can point it at a fake compose box.
  // Without this, the test's lookup hits the real compose box first, since
  // querySelector returns the first match in the page.
  // 2026-09-30: this selector matched a live element ahead of the test's fake
  // box, so it almost certainly finds the real compose box. Inferred, not
  // inspected in Elements.
  findComposer() {
    return document.querySelector('div[contenteditable="true"].ProseMirror');
  }

  execute({ button }) {
    const harness = window.autoContinueHarnessMessage;

    if (!harness) {
      console.log("[AutoContinue] clicking Continue.");
      button.click();
      return;
    }

    const editableDiv = this.findComposer();
    if (!editableDiv) {
      console.warn("[AutoContinue] harness message set but compose box not found, falling back to plain click.");
      button.click();
      return;
    }

    console.log(`[AutoContinue] typing harness message: "${harness}"`);
    editableDiv.focus();
    // Not textContent: writing the DOM directly bypasses ProseMirror's state,
    // and ProseMirror discards the change. Verified live 2026-09-30, where a
    // textContent write left the real compose box empty. execCommand goes
    // through the browser's input pipeline, which ProseMirror does listen to.
    // Deprecated but still supported in Chromium, which is all this targets.
    document.execCommand("selectAll", false, null);
    document.execCommand("insertText", false, harness);
    // UNVERIFIED: whether a synthetic Enter actually submits. Untrusted key
    // events may be ignored by the app's submit handler. If the text lands
    // but never sends, the fix is clicking the send button instead.
    editableDiv.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    editableDiv.dispatchEvent(new KeyboardEvent("keypress", { key: "Enter", bubbles: true }));
    editableDiv.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", bubbles: true }));
  }
}

// Replace any previously registered instance, so re-pasting an updated
// version takes effect without restarting Claude Desktop.
window.autoActionsRegistry = window.autoActionsRegistry.filter((a) => a.name !== "AutoContinue");
window.autoActionsRegistry.push(new AutoContinueAction());
console.log("Registered AutoContinue.");
