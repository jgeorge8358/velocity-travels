# Velocity Travels: enquiry backend (Google Sheets + email)

## Context
The website is built, but form submissions go nowhere: `VT_CONFIG.formEndpoint` is empty and the confirmation screen shows "Preview only". The goal is to win clients, so every enquiry must reach the three partners quickly, never be lost, and be trackable from new to booked.

## Decisions made
- Account: **the user's personal Google account for the trial** (about 100 email recipients/day), then a new business Gmail before launch. Never the work account.
- Emails: **team alert + customer receipt** (receipt only if they gave an email). Prices stay manual.
- Sheet: **mini CRM** with a dashboard and a daily morning email.

## Step 0 – Save this plan in the project
Copy this plan to `backend/PLAN.md` (the `backend/` folder is never uploaded to the website).

## Personal account: what it means for the trial
- The Sheet lives in the user's own Drive; share it only with the two partners.
- Emails show the name "Velocity Travels" but come **from the personal address**, and customers could see it. Trial emails go only to the user and people they choose; "receipts" can be switched off in Settings.
- Nothing personal goes in code or the website: addresses live in the Settings tab, and the script runs as the user without exposing their password.
- **Moving later (about 15 minutes):** copy the Sheet to the business account, run `setup` there, deploy, replace one URL in `js/app.js`, then remove the old deployment and triggers so there are no duplicate emails.

## Architecture
```
Website form ──POST──> Google Apps Script web app ──> 1. check  2. save row (Google Sheet)
      ^                                                   3. email team  4. email customer
      └──── { ok, reference } ────────────────────────────┘
```
Apps Script bound to the Sheet: free, no server, no database, owned by the Google account that deploys it. The site only knows a URL, so this can be replaced by a real backend later without redesigning the form.

**Rule: save first, email second.** Once the row is saved the customer sees success; a failed email is marked in the Sheet and retried, so an email problem never loses a lead.

## Part 1 – Backend: new folder `backend/` (pasted into Apps Script, never uploaded to the website)
Files: `backend/Code.gs`, `backend/appsscript.json` (timezone Asia/Kolkata, V8, execute as owner, access anyone, least scopes: bound spreadsheet, send mail, triggers), `backend/SETUP.md` (click-by-click guide).

**`doPost`**
1. Parse JSON (body is `text/plain`; size cap 20 KB); reply always JSON `{ ok, reference }` or `{ ok:false, error }`.
2. Reject bots: honeypot `website`, submitted under 3 s after the form loaded, rate limits via CacheService (overall per minute; per phone per hour).
3. Validate on the server with the same rules as the form (name, phone by country code, email, known trip type); accept only known fields, trim and cap lengths.
4. Lock (LockService), skip if `requestId` already saved (retry-safe), append row.
5. After saving, send emails inside try/catch and record `Email status`.

**`doGet`**: `?check=<requestId>` says only whether it was saved, so the site can confirm after a dropped connection; otherwise a health message. Never returns lead data.

**Safety**: values starting with `= + - @` stored as text (no formula injection, keeps +91); all values HTML-escaped in emails; newlines stripped from subjects; no secrets or personal emails in code (they live in the Settings tab). Per-address and daily caps on customer receipts, always reserving quota (`MailApp.getRemainingDailyQuota()`) for team alerts. The receipt does not echo free-text notes, so the form can't be used to send strangers messages.

**Triggers**: every 10 min retry unsent team emails (max 5 tries); daily 8 AM IST digest, sent only when something needs attention.

**Menu "Velocity" in the Sheet**: Set up / repair, Send test lead, Retry emails. `setup()` is safe to re-run and never deletes data.

## Part 2 – Google Sheet (built by `setup()`)
| Tab | Contents |
|---|---|
| **Leads** | Team columns first: Status (New, Contacted, Quoted, Booked, Completed, Lost, Spam), Owner, Follow-up date, Quote ₹, Team notes. Then Received (IST), Reference, Name, Phone, WhatsApp link, Email, Contact by, Best time, Trip type, Pickup, Destination, dates, time, people, vehicle, details, customer notes, Source, Landing page, Email status, Request ID. Dropdowns, frozen header, filters, colours by status; New over 2 hours and overdue follow-ups highlighted; system columns protected with a warning |
| **Dashboard** | New today, needs attention, this week/month, conversion rate, booked value, leads by status, trip type and source |
| **Settings** | Team emails, owner names, business phone/WhatsApp/email, site URL, receipts on/off, digest on/off |
| **Log** | Errors and blocked attempts (no personal details), last 500 |

## Part 3 – Emails
- **Team alert**: subject like `New lead: Sabarimala · Anu Mathew · 20 Dec · 2 adults (VT-261124-2349)`. Mobile-first: WhatsApp customer (prefilled greeting), Call, Open Sheet, then all details. Reply-To is the customer when they gave an email. Goes to one address list; all three partners count toward the daily limit (3 + 1 receipt = about 25 leads/day), noted in setup with a Google Group as the fix when needed.
- **Customer receipt**: navy/gold ticket matching the website, reference, trip summary, what happens next, how to contact you. No response-time promise.
- **Daily digest**: new leads not contacted, follow-ups due or overdue, quotes awaiting an answer.

## Part 4 – Website changes (`js/app.js`, `privacy.html`)
- Send `Content-Type: text/plain;charset=utf-8`, `credentials:'omit'`, no custom headers. Today's `application/json` would be blocked by the browser's cross-site check.
- Replace the summary payload with structured fields, reusing `get()`, `multi()`, `rows()`, `makeRef()`, `phoneDigits()`; add `requestId` (kept across retries), form-loaded time and honeypot.
- Success only when the reply says `ok:true`; timeout 15 s → 30 s; on a network failure call `?check=` once before showing the existing failure box.
- **Lead source**: record first-visit `utm_*`, referrer and landing page in sessionStorage, so you can see whether Instagram, Google or WhatsApp brought the booking. No cookies.
- The "Preview only" note disappears once the URL is set (already built).
- Privacy page: Google Sheets and Gmail storage, confirmation email, source tracking. Keep `[12 months]` for the partners to confirm.
- Bump `?v=`; exclude `backend/` from every preview/upload copy.

## Part 5 – Going live (about 15 minutes; user signs in and authorises, Claude guides)
1. User creates a blank Sheet in their personal Google account, opens Extensions → Apps Script.
2. Paste the two files, run `setup`, approve access (Google shows an "unverified app" notice for private scripts).
3. Fill Settings, run Send test lead.
4. Deploy as web app (execute as me, access anyone), copy the URL.
5. Claude puts the URL in `VT_CONFIG.formEndpoint`, tests, refreshes the preview copies.
Later code changes: Manage deployments → Edit → New version, which keeps the URL.

## Not in the MVP
Automatic pricing or emailed quotes, payments, customer login, WhatsApp Business API, admin website, bot challenge (Turnstile), automatic deletion of old leads. Move to a proper backend when you outgrow about 25 leads/day or need several staff roles.

## Risks
- The endpoint URL is public, as with any form; limits and caps reduce abuse but can't stop a determined attacker. Turnstile is the next step if spam appears.
- First response after idle can take a few seconds; the bus animation covers it.
- There are reports of Apps Script requests failing in some mobile browsers, so test early on iPhone Chrome/Safari and Android. If it happens, add a small relay on the site host; the form code stays the same.
- The least-privilege spreadsheet scope needs confirming in the live test; fall back to the standard spreadsheet scope if the web app can't write.

## Verification
1. **Offline**: run `Code.gs` in macOS JavaScriptCore with mocked Google services: every trip type, bad input, formula injection, HTML in names, duplicate requestId, rate limits, email failure and retry, quota reserve.
2. **Website**: local Ruby stub on another port imitating Google's redirect and cross-site rules; check success, duplicate retry, timeout then `?check=`, server rejection, failure box and draft kept; confirm no preflight is sent. Phone and desktop widths, no console errors.
3. **Live**: health URL; test lead; one real submission per trip type; check the row, dropdowns, dashboard, team email, receipt, digest. Test data uses the user's own addresses, with their OK before anything is sent.
4. **Devices**: iPhone Chrome and Safari, one Android, one Windows computer.
5. Confirm `backend/` and `FilesFromWork/` are absent from the uploaded copy.
