# claude-auto-continue-desktop

Auto-clicks the "Continue" button Claude Desktop shows when it hits its
per-turn tool-use limit, so a long tool-call chain doesn't stall waiting on a
click. Runs inside Claude Desktop itself via its own Developer Tools console.
No screen automation, no Accessibility permission, no background process.

Optional: instead of a plain click, type a custom message into the chat box
and submit it. Insertion and submission are each verified live in Desktop's
page; the end-to-end path (real banner, then harness submit) has not run yet.
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

To try the harness message instead of a plain click, paste this before
step 4:

```js
window.autoContinueHarnessMessage = "Continue. Stay focused on the current step.";
```

## Testing

`test-harness.js` fabricates a fake banner, compose box, and send button in
the console and confirms `check()`/`execute()` catch and act on them
correctly. Paste it after `action-auto-continue.js`:

1. Paste `setup.js`, hit Enter
2. Paste `action-auto-continue.js`, hit Enter
3. Paste `test-harness.js`, hit Enter
4. Check the console for `[PASS]` / `[FAIL]` lines (8 checks)

This proves the detection and action logic work against the *assumed* DOM
shape. It does not prove the banner selector matches Claude Desktop's actual
markup, since it never touches the real banner. The only thing that confirms
that is watching the console the next time the real per-turn limit banner
actually shows up.

The test points both the compose-box and send-button lookups at its own
fakes, so it never types into or submits the real chat. An earlier version
didn't redirect the compose box, and typed into the live one instead; that's
how the textContent insertion bug was found.

## Status

As of 2026-09-30:

1. Compose box: `div[contenteditable="true"].ProseMirror` matches the live
   compose box. Verified
2. Insertion: `execCommand("insertText")` lands text ProseMirror keeps.
   `textContent` does not (ProseMirror discards it). Verified
3. Submission: clicking the button whose `aria-label` matches `/send/i`
   submits. A synthetic Enter keydown/keypress/keyup does **not** (untrusted
   key events are ignored). Verified both ways; the action file now clicks
   send and no longer dispatches Enter
4. Send lookup searches outward from the compose box before falling back to
   a page-wide search, and waits up to 1.5s for the button to enable after
   insertion. If it never enables, the harness text stays in the compose box
   and the plain Continue click runs instead, with a console warning
5. `test-harness.js` was rewritten for the send-button path (8 checks). The
   previous version passed 6/6; the new one has not been run in Desktop yet
6. 30 consecutive lightweight tool calls in one turn did **not** trigger the
   limit banner. The banner does still appear in practice on long,
   read-heavy runs, so the trigger is likely something other than a raw call
   count. Don't try to force it with a cheap loop; wait for a real long run
7. The banner selector in `check()` is still unverified against the real banner

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
