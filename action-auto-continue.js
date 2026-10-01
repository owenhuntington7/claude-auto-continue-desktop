/**
 * AutoContinue action for Claude Desktop's per-turn tool-use limit banner.
 * Paste AFTER setup.js.
 *
 * Detection: a "Continue" button inside an alert-role container, not just any
 * button anywhere named "continue" (avoids matching the word in chat history).
 *
 * Optional harness: set window.autoContinueHarnessMessage to a string before
 * pasting this file, and instead of clicking the button, it types that message
 * into the compose box and submits it by clicking the send button. Leave unset
 * for a plain click, which is the reliable default since the button already
 * does the right thing on its own.
 *
 * Verified live in Desktop's page, 2026-09-30: the compose box selector,
 * execCommand("insertText") for insertion, and clicking the button whose
 * aria-label matches /send/i for submission. A synthetic Enter keydown was
 * also tested and does NOT submit (untrusted key events are ignored), which is
 * why this file no longer dispatches one.
 *
 * Still UNVERIFIED: the banner selector in check(), since the real banner has
 * not been inspected. Every fork in this lineage (RafalWilinski -> rvanbaalen
 * -> zudsniper) needed its selectors patched when Anthropic changed the UI.
 * If nothing fires when the banner is visible, open Developer Tools' Elements
 * tab, inspect the actual button and its ancestor, and adjust check().
 */
class AutoContinueAction extends BaseAction {
  constructor() {
    super("AutoContinue");
    // True while a harness submit is waiting on the send button, so a second
    // mutation can't start a second submit if setup.js's cooldown expires.
    this.busy = false;
  }

  check() {
    if (this.busy) return null;
    const alertContainers = Array.from(document.querySelectorAll('[role="alert"]'));
    for (const container of alertContainers) {
      const button = Array.from(container.querySelectorAll("button")).find(
        (b) => b.textContent.trim().toLowerCase() === "continue"
      );
      if (button) return { button };
    }
    return null;
  }

  // Separate methods so test-harness.js can point them at fake nodes. Without
  // this, the test's lookups hit the real page first, since querySelector
  // returns the first match.
  findComposer() {
    return document.querySelector('div[contenteditable="true"].ProseMirror');
  }

  // Searches outward from the compose box first, so a "Send feedback" button
  // or similar elsewhere on the page can't win over the real send button.
  // Falls back to a page-wide search only if nothing matches nearby.
  findSendButton(composer) {
    const isSend = (b) => /send/i.test(b.getAttribute("aria-label") || "");
    let node = composer ? composer.parentElement : null;
    for (let depth = 0; node && depth < 8; depth++, node = node.parentElement) {
      const match = Array.from(node.querySelectorAll("button")).find(isSend);
      if (match) return match;
    }
    return Array.from(document.querySelectorAll("button")).find(isSend) || null;
  }

  // ProseMirror updates its state after insertText, and the send button can
  // stay disabled for a moment until it does. Poll briefly rather than click
  // a disabled button and silently do nothing.
  async waitForEnabledSend(composer, timeoutMs = 1500, stepMs = 50) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const button = this.findSendButton(composer);
      if (button && !button.disabled && button.getAttribute("aria-disabled") !== "true") {
        return button;
      }
      await new Promise((r) => setTimeout(r, stepMs));
    }
    return null;
  }

  async execute({ button }) {
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

    this.busy = true;
    try {
      console.log(`[AutoContinue] typing harness message: "${harness}"`);
      editableDiv.focus();
      // Not textContent: writing the DOM directly bypasses ProseMirror's
      // state, and ProseMirror discards the change. Verified live 2026-09-30.
      // execCommand goes through the browser's input pipeline, which
      // ProseMirror does listen to. Deprecated but still supported in
      // Chromium, which is all this targets.
      document.execCommand("selectAll", false, null);
      document.execCommand("insertText", false, harness);

      const send = await this.waitForEnabledSend(editableDiv);
      if (send) {
        console.log("[AutoContinue] clicking send.");
        send.click();
      } else {
        // The typed text stays in the compose box and would go out with the
        // next message, so say so loudly rather than stalling silently.
        console.warn("[AutoContinue] send button not found or never enabled; harness text left in the compose box. Falling back to plain Continue click.");
        button.click();
      }
    } catch (err) {
      console.error("[AutoContinue] harness submit failed:", err);
    } finally {
      this.busy = false;
    }
  }
}

// Replace any previously registered instance, so re-pasting an updated
// version takes effect without restarting Claude Desktop.
window.autoActionsRegistry = window.autoActionsRegistry.filter((a) => a.name !== "AutoContinue");
window.autoActionsRegistry.push(new AutoContinueAction());
console.log("Registered AutoContinue.");
