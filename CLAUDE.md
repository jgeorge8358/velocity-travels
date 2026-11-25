# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Marketing site and enquiry form for Velocity Travels, a travel business in Kottayam and Ernakulam, Kerala. Its purpose is to win clients, so the quote form is the most important thing on it. See README.md for launch status and placeholders, backend/PLAN.md for the backend design, backend/SETUP.md for deployment.

## Commands

There is no build step, framework, package manager or linter. On the owner's Mac `node` and `npm` don't run (Intel binary, no Rosetta), so the tooling uses system Ruby, Perl and `osascript` (macOS only).

```bash
# Local site (the "velocity" entry in .claude/launch.json)
/usr/bin/ruby -run -e httpd . -p 8765 -b 127.0.0.1

# Syntax check a script
osascript -l JavaScript -e 'ObjC.import("Foundation");const s=ObjC.unwrap($.NSString.stringWithContentsOfFileEncodingError("js/app.js",4,null));try{new Function(s);"ok"}catch(e){e.message}'

# Backend tests (one file, all checks; prints "N passed, M failed"). Writes team.html / receipt.html previews to the last argument.
osascript -l JavaScript backend/tests/gs_test.js "$PWD/backend/Code.gs" /tmp

# Fake Google endpoint for testing the form (modes are listed in the file)
/usr/bin/ruby backend/tests/stub.rb

# Phone preview over Wi-Fi: http://<Mac IP>:8080
rsync -a --delete --delete-excluded --exclude FilesFromWork --exclude backend --exclude '*.md' --exclude '.*' ./ /tmp/velocity-preview/ && /usr/bin/ruby -run -e httpd /tmp/velocity-preview -p 8080 -b 0.0.0.0

# Shareable preview folder (no-index); upload this one, never the repo root
OUT=../Velocity-Travels-Preview; rsync -a --exclude FilesFromWork --exclude backend --exclude '*.md' --exclude '.*' --exclude sitemap.xml --exclude robots.txt ./ $OUT/ && perl -pi -e 's#<meta name="theme-color"#<meta name="robots" content="noindex, nofollow">\n$&#' $OUT/index.html $OUT/privacy.html
```

After changing CSS or JS, bump `?v=` in **both** index.html and privacy.html, or browsers keep the old file.

## Never publish

`FilesFromWork/` holds private reference files and is git-ignored; `backend/` and `*.md` are internal. Every copy or upload must exclude them. Don't put anything personal from `FilesFromWork/` in the site or docs.

## Architecture

**Pages.** index.html holds all content plus one inline SVG sprite (`#i-*` icons, `#logo`, `#bus`, `#palm`) used through `<use>`. privacy.html has its own header and repeats the logo and bus SVG because it has no sprite.

**CSS is three layers, in order:** base and desktop rules (breakpoints by `min-width`), reduced motion, then the phone block `@media(max-width:639px)` at the end of css/styles.css. The phone layout is deliberately different (2×2 service tiles built with `.svc{display:contents}` and `order`, "Add more details" in the form, trimmed footer). Phone changes go in that block so desktop stays untouched; the owner is happy with desktop.

**Typography.** Self-hosted variable Inter (text, nav, form) and Plus Jakarta Sans (brand, headings, buttons). The in-between weights (450, 580, 680, 780) are intentional, and `-webkit-font-smoothing:antialiased` was removed on purpose because it made text too thin on Macs. Other display fonts were tried and rejected by the owner.

**js/app.js** is one IIFE after `window.VT_CONFIG`. Head script in index.html adds `js`, `intro-pending`, `announce-dismissed` classes before first paint; app.js plays the intro and owns everything else.

**Enquiry form** (the second half of app.js):
- `data-for="tour pilgrimage ..."` decides which fields each trip type shows. `applyTrip()` hides **and disables** the rest, and `get(name)` returns '' for disabled fields, so `rows()` (human summary) and `payload()` (what is sent) never include hidden answers. Adding a field means: markup with `data-for`, `rows()`, `payload()`, and `clean_()` plus `details_()` or a column in Code.gs.
- Pills are generated from `data-pills="radio|checkbox:name"` with `Label~small|Label` text.
- Blur validation waits (`afterBlur`) until the pointer is up. Validating immediately inserted an error that moved the button mid-tap and lost taps on phones. Don't undo this.
- All `a[href="#plan"]` and `[data-trip]` clicks go through one handler and `goToCard()`, which corrects interrupted smooth scrolling.
- Drafts autosave to localStorage `vt-enquiry-draft` (14 days); visit source to sessionStorage `vt-source`.
- `formEndpoint` empty means preview mode: the success ticket shows a visible "Preview only" notice because nothing was delivered. Keep that notice until a real endpoint is set.

**Backend** (backend/Code.gs, pasted by hand into Apps Script bound to a Google Sheet; not deployed from here). Contract with the form:
- Request must stay a "simple" cross-site POST: `text/plain`, no custom headers, `credentials:'omit'`. `application/json` triggers a preflight that Apps Script can't answer.
- Google always answers 200 after a redirect, so success is only `{ok:true}` in the body. On a network error the form asks `?check=<requestId>` once before showing failure.
- `requestId` is kept across retries and makes saving idempotent. `elapsed` under 2.5 s is treated as a bot; the client waits to 3 s.
- Save first, email second: after `saveLead_` nothing may turn into an error for the customer.
- Columns are found by header text, so the team may move columns but not rename headers. Rows are found again by request ID before status writes, since someone may sort the sheet.
- Free text passes through `safe_()` (no formulas) and `h_()` (HTML). Customer receipts contain only whitelisted choices, never free text, so the form can't send strangers messages.
- `str_`/`text_` strip control characters but must keep U+200C/U+200D, which Malayalam names need. Write such characters as `\u` escapes; literal ones have broken the script before.
- Emails and phone numbers live in the Sheet's Settings tab, never in code.

## Content rules

Location copy always says Kottayam and Ernakulam. Don't invent business facts (prices, advance, cancellation, response times, fleet); four FAQ answers are deliberately general until the owners confirm them.
