# Velocity Travels website

Website and quote-request form for Velocity Travels, a travel business based in Kottayam and Ernakulam, Kerala. Plain HTML, CSS and JavaScript: no framework, no build step.

**Status:** website built and previewable. The enquiry backend is written but **not connected yet**, so form submissions are not delivered. Contact details are placeholders.

## What's inside

| Path | What it is |
|---|---|
| `index.html` | The whole home page |
| `privacy.html` | Privacy policy (draft) |
| `css/styles.css` | All styling; the phone layout is the block at the end |
| `js/app.js` | Intro, menu, form and confirmation. Settings are at the top in `VT_CONFIG` |
| `assets/` | Fonts (with licences), icons, sharing image, logo |
| `backend/` | Google Sheets and email script, setup guide, plan, tests. **Not part of the website** |

## See it on your Mac

```bash
/usr/bin/ruby -run -e httpd . -p 8765 -b 127.0.0.1
```

Then open http://localhost:8765. Press Ctrl + C to stop.

## See it on your phone

Same Wi-Fi as the Mac:

```bash
rsync -a --delete --delete-excluded --exclude backend --exclude tools --exclude '*.md' --exclude '.*' ./ /tmp/velocity-preview/ && /usr/bin/ruby -run -e httpd /tmp/velocity-preview -p 8080 -b 0.0.0.0
```

Find the Mac's address with `ipconfig getifaddr en0`, then open `http://THAT-ADDRESS:8080` on the phone. Run the command again after changes.

## Share a preview online

Build a zip of only the site files (hidden from Google) and upload it to Cloudflare. Step by step, including going live, is in DEPLOY.md. **Never upload this project folder itself.**

```bash
python3 tools/build_zip.py
```

## Connect the form

Follow `backend/SETUP.md` (about 15 minutes with a Google account), then put the web app URL in `formEndpoint` at the top of `js/app.js`. Until then the confirmation screen shows "Preview only".

## Before launch

- [ ] Connect the backend and send a real test for each trip type
- [ ] Replace the placeholders below
- [ ] Confirm the general FAQ answers: booking and advance, how to pay, Sabarimala season, night airport pickup
- [ ] Confirm claims: verified drivers, vehicles checked before every trip, driver languages, GST invoices, vehicle seat numbers
- [ ] Review the privacy policy and fill in its brackets
- [ ] Move to a business email account
- [ ] Try it on an iPhone, an Android phone and a Windows computer

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

After editing CSS or JavaScript, change the `?v=` number in `index.html` and `privacy.html` so visitors get the new version.

Run the backend tests with:

```bash
osascript -l JavaScript backend/tests/gs_test.js "$PWD/backend/Code.gs" /tmp
```

## Licences

Inter and Plus Jakarta Sans are under the SIL Open Font License; the licence files are in `assets/fonts`.

## Working together

1. `git clone` the repository, then start the local site as above. It needs only Ruby, or any simple web server.
2. Make a branch for each change: `git checkout -b your-change`.
3. Commit, push the branch, and open a pull request for someone else to look at before it joins `main`.

The copy commands and backend tests above are for macOS. Never commit customer data, passwords, or the Google Sheet's contents.
