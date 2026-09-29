/**
 * AutoContinue action for Claude Desktop's per-turn tool-use limit banner.
 * Paste AFTER setup.js.
 *
 * Detection: a "Continue" button inside an alert-role container, not just any
 * button anywhere named "continue" (avoids matching the word in chat history).
 *
 * Optional harness: set window.autoContinueHarnessMessage to a string before
 * pasting this file, and instead of clicking the button, it types that message
 * into the compose box and submits it. Leave unset for a plain click, which is
 * the more reliable default since the button already does the right thing on
 * its own.
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

  execute({ button }) {
    const harness = window.autoContinueHarnessMessage;

    if (!harness) {
      console.log("[AutoContinue] clicking Continue.");
      button.click();
      return;
    }

    const editableDiv = document.querySelector('div[contenteditable="true"].ProseMirror');
    if (!editableDiv) {
      console.warn("[AutoContinue] harness message set but compose box not found, falling back to plain click.");
      button.click();
      return;
    }

    console.log(`[AutoContinue] typing harness message: "${harness}"`);
    editableDiv.focus();
    editableDiv.textContent = harness;
    editableDiv.dispatchEvent(new Event("input", { bubbles: true }));
    editableDiv.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    editableDiv.dispatchEvent(new KeyboardEvent("keypress", { key: "Enter", bubbles: true }));
    editableDiv.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", bubbles: true }));
  }
}

if (!window.autoActionsRegistry.some((a) => a.name === "AutoContinue")) {
  window.autoActionsRegistry.push(new AutoContinueAction());
  console.log("Registered AutoContinue.");
}
