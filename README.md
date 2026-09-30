# claude-auto-continue-desktop

Auto-clicks the "Continue" button Claude Desktop shows when it hits its
per-turn tool-use limit, so a long tool-call chain doesn't stall waiting on a
click. Runs inside Claude Desktop itself via its own Developer Tools console.
No screen automation, no Accessibility permission, no background process.

Optional, experimental: instead of a plain click, type a custom message into
the chat box before continuing. Text insertion was rewritten after the first
version failed live, and whether the message actually submits is untested.
Use the plain click unless you're testing this.

## Install

1. Claude Desktop -> Help -> Troubleshooting -> Enable Developer Mode
2. Open Developer Tools (Cmd+Option+I with the chat window focused) -> Console tab
3. Paste `setup.js`, hit Enter. If Chrome shows a paste warning instead of
   running it, type `allow pasting`, hit Enter, and paste again. (Typing
   `allow pasting` before any paste attempt just throws a harmless
   SyntaxError.)
4. Paste `action-auto-continue.js`, hit Enter

Repeat steps 2 through 4 each time Claude Desktop restarts. Developer Tools
state doesn't persist across app restarts. Re-pasting an updated
`action-auto-continue.js` replaces the running version; no restart needed.

To try the experimental harness message instead of a plain click, paste this
before step 4:

```js
window.autoContinueHarnessMessage = "Continue. Stay focused on the current step.";
```

## Testing

`test-harness.js` fabricates a fake banner and a fake compose box in the
console and confirms `check()`/`execute()` catch and act on them correctly.
Paste it after `action-auto-continue.js`:

1. Paste `setup.js`, hit Enter
2. Paste `action-auto-continue.js`, hit Enter
3. Paste `test-harness.js`, hit Enter
4. Check the console for `[PASS]` / `[FAIL]` lines

This proves the detection and action logic work against the *assumed* DOM
shape. It does not prove the real selectors match Claude Desktop's actual
markup, since it never touches the real banner. The only thing that confirms
the selectors are right is watching the console the next time the real
per-turn limit banner actually shows up.

The test points the compose-box lookup at its own fake box, so it never types
into the real one. An earlier version didn't, and typed into the live compose
box instead; that's how the textContent insertion bug was found.

## Status

As of 2026-09-30:

1. `test-harness.js` passes 6/6
2. The compose-box selector (`div[contenteditable="true"].ProseMirror`)
   matched the live compose box
3. Writing the compose box via `textContent` failed live (ProseMirror
   discarded it); replaced with `execCommand("insertText")`, which passes the
   mock but hasn't been seen submitting a real message
4. 30 consecutive lightweight tool calls in one turn did **not** trigger the
   limit banner. The banner does still appear in practice on long,
   read-heavy runs, so the trigger is likely something other than a raw call
   count. Don't try to force it with a cheap loop; wait for a real long run
5. The banner selector in `check()` is still unverified against the real banner

The detection logic (a "Continue" button inside a `[role="alert"]`
container) is a best guess based on how the equivalent Chrome extension and
prior forks describe the banner. If it doesn't fire, open the Elements tab
while the banner is showing, find the real button and its container, and
update `check()` in `action-auto-continue.js` to match. Selectors breaking on
Anthropic UI updates is the normal failure mode for every project in this
lineage, not a sign something else is wrong. If `test-harness.js` passes but
a real banner still doesn't trigger it, that's the confirmation: the assumed
shape is wrong, not the framework.

## Lineage

RafalWilinski's original auto-approve gist -> rvanbaalen's registry framework
-> this fork, swapping tool-approval detection for the continue banner and
adding the optional harness message.

## License

MIT
