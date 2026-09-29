# claude-auto-continue-desktop

Auto-clicks the "Continue" button Claude Desktop shows when it hits its
per-turn tool-use limit, so a long tool-call chain doesn't stall waiting on a
click. Runs inside Claude Desktop itself via its own Developer Tools console.
No screen automation, no Accessibility permission, no background process.

Optional: instead of a plain click, type a custom message into the chat box
before continuing. Useful if you want to nudge the model rather than just
resume silently.

## Install

1. Claude Desktop -> Help -> Enable Developer Mode
2. Reopen Developer Tools (the "Developer Tools - https://claude.ai" window) -> Console tab
3. Type `allow pasting` and hit Enter
4. Paste `setup.js`, hit Enter
5. Paste `action-auto-continue.js`, hit Enter

Repeat steps 2 through 5 each time Claude Desktop restarts. Developer Tools
state doesn't persist across app restarts.

To use a harness message instead of a plain click, paste this before step 5:

```js
window.autoContinueHarnessMessage = "Continue. Stay focused on the current step.";
```

## Status

Unverified against the live Claude Desktop DOM. The detection logic (a
"Continue" button inside a `[role="alert"]` container) is a best guess based
on how the equivalent Chrome extension and prior forks describe the banner.
If it doesn't fire, open the Elements tab while the banner is showing, find
the real button and its container, and update `check()` in
`action-auto-continue.js` to match. Selectors breaking on Anthropic UI
updates is the normal failure mode for every project in this lineage, not a
sign something else is wrong.

## Lineage

RafalWilinski's original auto-approve gist -> rvanbaalen's registry framework
-> this fork, swapping tool-approval detection for the continue banner and
adding the optional harness message.

## License

MIT
