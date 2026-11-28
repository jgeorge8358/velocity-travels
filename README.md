# Velocity Travels website

Website and quote-request form for Velocity Travels, a travel business based in Kottayam and Ernakulam, Kerala. Plain HTML, CSS and JavaScript: no framework, no build step.

**Status:** the test site is online on Cloudflare and the form delivers enquiries to the Google Sheet. Contact details are still placeholders, so it is not launched to customers yet.

Several people work on this on macOS, Windows and Linux. Everything you need day to day runs with **Git** and **Python 3.9+**, nothing else to install.

## What's inside

| Path | What it is |
|---|---|
| `index.html` | The whole home page |
| `privacy.html` | Privacy policy (draft) |
| `css/styles.css` | All styling; the phone layout is the block at the end |
| `js/app.js` | Intro, menu, form and confirmation. Settings are at the top in `VT_CONFIG` |
| `assets/` | Fonts (with licences), icons, sharing image, logo |
| `tools/` | `serve.py` (local site) and `build_zip.py` (Cloudflare upload). **Not part of the website** |
| `backend/` | Google Sheets and email script, setup guide, plan, tests. **Not part of the website** |
| `DEPLOY.md` | How to put the site on Cloudflare and go live |

## Commands on each system

Run these from the project folder. `python3` on macOS and Linux; on Windows use `py` (or `python`) and backslashes, for example `py tools\serve.py`.

| What | macOS / Linux | Windows |
|---|---|---|
| See the site on this computer | `python3 tools/serve.py` | `py tools\serve.py` |
| See it on a phone (same Wi-Fi) | `python3 tools/serve.py --phone` | `py tools\serve.py --phone` |
| Build the Cloudflare zip | `python3 tools/build_zip.py` | `py tools\build_zip.py` |

- `serve.py` opens the site at http://localhost:8765. With `--phone` it prints the address to open on the phone (port 8080). Edits show up on reload; press Ctrl+C to stop. It serves only the website files, so `backend/` and the notes can't be opened from another device. If the phone can't connect, allow Python through the computer's firewall (Windows asks the first time; tick **Private networks**).
- `build_zip.py` is explained in DEPLOY.md. **Never upload this project folder itself.**
- Windows: if `py` or `python` opens the Microsoft Store, install Python from python.org and tick **Add python.exe to PATH**.

## Connect the form

Already done for the test site. To set it up again or move accounts, follow `backend/SETUP.md` (about 15 minutes with a Google account), then put the web app URL in `formEndpoint` at the top of `js/app.js`. With an empty URL the confirmation screen shows "Preview only".

## Before launch

- [x] Connect the backend and send a real test
- [ ] Send a test for each trip type, from an iPhone, an Android phone and a Windows computer
- [ ] Replace the placeholders below
- [ ] Confirm the general FAQ answers: booking and advance, how to pay, Sabarimala season, night airport pickup
- [ ] Confirm claims: verified drivers, vehicles checked before every trip, driver languages, GST invoices, vehicle seat numbers
- [ ] Review the privacy policy and fill in its brackets
- [ ] Move to a business email account
- [ ] Buy a domain and go live (DEPLOY.md)

| Placeholder | Where |
|---|---|
| `+91 00000 00000`, `+910000000000` | index.html, privacy.html |
| `910000000000` (WhatsApp) | `VT_CONFIG` in js/app.js updates every WhatsApp link |
| `hello@yourdomain.in` | index.html, privacy.html |
| `www.yourdomain.in` | index.html, privacy.html, sitemap.xml, robots.txt |
| `your-handle`, `your-page` (Instagram, Facebook) | index.html |
| `[Street address]`, `[PIN code]` | index.html, privacy.html |
| `[date]`, `[12 months]`, `[Name]`, analytics note | privacy.html |

Phone, email and WhatsApp for emails are set separately in the Google Sheet's **Settings** tab.

## Making changes

- After editing CSS or JavaScript, change the `?v=` number in **both** `index.html` and `privacy.html` so visitors get the new version. `build_zip.py` stops if they differ.
- The phone layout is the `@media(max-width:639px)` block at the end of `css/styles.css`; keep phone-only changes there so desktop stays the same.
- Backend tests (`backend/tests/gs_test.js`) currently run on macOS only:

  ```bash
  osascript -l JavaScript backend/tests/gs_test.js "$PWD/backend/Code.gs" /tmp
  ```

  On Windows or Linux, ask the person with the Mac to run them after changing `backend/Code.gs`.

## Working together

1. `git clone` the repository (not a downloaded zip, so line endings stay consistent), then run `serve.py` as above.
2. Make a branch for each change: `git checkout -b your-change`.
3. Commit, push the branch, and open a pull request for someone else to look at before it joins `main`.
4. `git pull` before starting work, so you build and upload the latest version.

Never commit customer data, passwords, screenshots with personal details, or the Google Sheet's contents.

## Licences

Inter and Plus Jakarta Sans are under the SIL Open Font License; the licence files are in `assets/fonts`.
