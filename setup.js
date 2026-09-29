/**
 * Auto-Actions Framework for Claude Desktop
 * Paste into Claude Desktop's Developer Tools console (Help -> Enable Developer Mode,
 * then reopen Developer Tools, Console tab, type "allow pasting", Enter).
 *
 * Lineage: RafalWilinski's original auto-approve gist -> rvanbaalen's registry framework.
 * This file is the framework only. Paste an action file (e.g. action-auto-continue.js)
 * after this one to register behavior.
 */
(() => {
  class BaseAction {
    constructor(name) {
      if (!name) throw new Error("Action must have a name.");
      this.name = name;
    }
    check() {
      console.warn(`Action "${this.name}" is missing check().`);
      return null;
    }
    execute(data) {
      console.warn(`Action "${this.name}" is missing execute().`);
    }
  }

  window.BaseAction = BaseAction;
  window.autoActionsRegistry = window.autoActionsRegistry || [];

  const GLOBAL_COOLDOWN_MS = 2000;
  let lastActionTime = 0;

  if (window.autoActionsObserver) {
    console.log("Disconnecting previous observer...");
    window.autoActionsObserver.disconnect();
  }

  const observer = new MutationObserver(() => {
    const now = Date.now();
    if (now - lastActionTime < GLOBAL_COOLDOWN_MS) return;

    for (const action of window.autoActionsRegistry) {
      try {
        const data = action.check();
        if (data) {
          console.log(`[${action.name}] conditions met, executing.`);
          action.execute(data);
          lastActionTime = now;
          break;
        }
      } catch (err) {
        console.error(`[${action.name}] error:`, err);
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  window.autoActionsObserver = observer;

  console.log("Auto-Actions Framework running. Registered:", window.autoActionsRegistry.map(a => a.name));
})();
