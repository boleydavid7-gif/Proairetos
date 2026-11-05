# Research and development

What the newest web platform lets Proairetos do, checked against the primary sources (Chrome for Developers, web.dev,
WebKit, MDN) and, where possible, against a real browser. Written Nov 5, 2026; Chrome 158 goes stable Nov 17, Safari 27.2 is
current. Statuses change monthly: re-check before building.

## Tested here (Chromium 153, headless)

Present on a secure origin: Prompt API (`LanguageModel`), `Summarizer`, `Translator`, `LanguageDetector`, WebGPU
(no adapter in headless), Storage Buckets, OPFS, File System Access, Document Picture-in-Picture, Badging, Background and
Periodic Sync, Web Locks, Idle Detection, Screen Wake Lock, Digital Credentials, WebTransport, Navigation API, scroll
timelines, anchor positioning, `field-sizing`, `sibling-index()`, `Element.setHTML`, window controls overlay.
The built-in AI APIs report `downloadable`: they need a supported computer and a one-time model download, so they could not
be run here. Behind `--enable-experimental-web-platform-features`: WebMCP (`document.modelContext`) and `streamHTML`.
Not present: Web Install (`navigator.install`, Chrome 158), `focusgroup`, element-scoped view transitions.

## Spike: WebMCP (works)

A prototype on the local branch `spike/webmcp` (not merged, not pushed) registers three tools from `src/app/webmcp.ts`:
`list_open_to_dos` (read only), `add_to_do` and `mark_to_do_done`, only when a device switch is on. In Chromium 153 with the
flag, `getTools()` listed them with their annotations and `executeTool` added a to-do, listed it and marked it done through
the real `lifeService`, with no errors. Chrome 153 wants the arguments as a JSON string; Chrome 155 deprecates that.
What it is: a page declares tools (name, description, JSON schema) and a browser assistant (Gemini in Chrome and others)
calls them, instead of reading the screen and clicking. Origin trial from Chrome 149; the standard is still moving.
What it would mean for us: voice or typed requests to the browser's assistant ("add milk, mark the dentist done") work
on the person's own data without us building an assistant. It also breaks the privacy promise if done carelessly: what a
tool returns goes to the assistant's model. So: off until the person turns it on, read tools say `untrustedContentHint`,
anything that deletes says `consequentialHint`, nothing from Reflect, Journal or health, and a plain line saying what the
assistant can see. Cost: low for the tools, medium for the settings and wording. Risk: a moving spec and Chrome only.

## Bets, in the order I would take them

1. **WebMCP, as above.** Smallest build that is new to the category: no competitor's web app offers it.
2. **On-device writing and summary help, opt in.** Chrome's Summarizer (stable since 138) and Prompt API (stable on the web in
   148, structured JSON output) run on the person's computer: nothing is sent anywhere. Fits "the system records life, it does
   not interpret life" only if it never advises. Safe uses: a plain-words summary of a person's own long note or a week's
   journal that the person asks for, and turning a typed sentence into a capture the person reviews (we already do that
   with rules). Not safe: anything that rates, advises or ranks. Needs a supported computer (iPhone Safari has none of
   these), so it can only be an extra. Worth a spike on real hardware, which cannot be done in this sandbox.
3. **Web Install API and `<install>` (Chrome 158).** Lets one site offer to install another app. Our Store adds "apps" that
   are separate installable web apps: a real way to install Askesis from the Store with one tap. Chrome only, desktop first.
4. **Service Worker static routing (Safari 27.0).** Lets the worker declare requests the browser can send straight to the
   network or cache without waking the worker: a speed gain for the Home Screen app on iPhone at almost no cost. Chromium has
   it too. Low effort, measurable with the speed check.
5. **WebAuthn PRF is in Safari 26.4.** We already rely on it for passkeys that open the data; the new Safari fixes should
   make "signs in only" passkeys rarer on iPhone. Worth re-testing on a real phone.
6. **Smaller wins:** `Element.setHTML` for any place we sanitize HTML; `field-sizing` for growing note fields without script;
   `sibling-index()` for staggered list motion without script (Baseline); name-only container queries for the Lamplight
   components; scroll anchoring in Safari 27 for live lists; Document Picture-in-Picture (already used in Praxis' timer).

## Not worth chasing now

Declarative partial updates (Chrome only, streaming HTML does not fit a client-rendered app), HTML-in-Canvas, WebNN
(still experimental), WebTransport, Device Posture (foldables), Digital Credentials, WebHID and Web Serial.

## Open questions only a real device can answer

Built-in AI on a supported laptop; WebMCP with Gemini in Chrome on Android; Home Screen behavior on iOS 26 and 27 (every
site now opens as a web app by default, so our install steps and screenshots may need a second look).

## Sources

Chrome I/O 2026 post, Chrome 158 release notes, WebMCP docs and Built-in AI status table (developer.chrome.com); web.dev
"New to the web platform" for May, June, August and September 2026; WebKit "Features for Safari" 26.4, 26.5, 27.0, 27.1, 27.2.
Several pages were read in part (the longest ones came back partly summarized), so treat single claims as leads.
