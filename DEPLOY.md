# Deploying the site to Cloudflare

The site is hosted free on Cloudflare as uploaded static files. There is no automatic deploy from GitHub: you build a zip on the Mac and upload it. That way `backend/`, the notes and anything else in this folder never reach the website.

Current test address: the `velocity-travels` project on your Cloudflare account (`*.workers.dev`).

## 1. Build the zip

From the project folder in Terminal:

```bash
python3 tools/build_zip.py
```

It prints where the zip went, normally `../Velocity-Travels-Preview.zip` (next to the project folder), and how many files it holds (17 for the test site).

What the script does:
- Copies **only** the site: `index.html`, `privacy.html`, `site.webmanifest`, `css/`, `js/`, `assets/`.
- Adds a "don't list this site" tag to both pages and a `_headers` file that says the same for every file, so Google doesn't show the test site to customers.
- Stops if `index.html` and `privacy.html` load different `?v=` versions, and warns if the form has no Google endpoint.

## 2. Upload a new version

1. Sign in at **dash.cloudflare.com** → **Workers & Pages** → open **velocity-travels**.
2. Choose the option to upload a new version of the static files (the button is labelled along the lines of **Upload** / **Create deployment** / **Deploy**; Cloudflare renames it from time to time).
3. Drop in the zip and deploy. The address stays the same.
4. Open the site in a **new Incognito tab** and check: the page loads, the fonts look right, and one test enquiry reaches the Sheet. Delete the test row afterwards.

A new address needs a few minutes before `https` works. Addresses ending in `.dev` only open over `https`, so "can't provide a secure connection" right after creating a project just means: wait 15–30 minutes.

## 3. Undo a bad upload

Open the project → **Deployments** (or **Versions**) → pick the previous one → **Rollback** / **Deploy**. Or rebuild an older commit and upload it again.

## 4. Going live (real customers)

Before:
- Replace the placeholder phone, WhatsApp and email in `index.html`, `privacy.html` and `js/app.js`, and in the Sheet's Settings tab.
- Confirm the FAQ answers and the privacy page's retention period with the partners.
- Buy a domain (for example a `.in`) and set the real address in `index.html` (canonical and social tags), `sitemap.xml` and `robots.txt`.

Then:

```bash
python3 tools/build_zip.py --live
```

This builds `../Velocity-Travels-Live.zip` without the noindex tags and with `sitemap.xml` and `robots.txt`. It stops if the form endpoint is missing and warns about placeholders. Upload it, then add the domain under the project's **Settings → Domains & Routes** (custom domain). Afterwards, add the site to Google Search Console and Google Business Profile.

## Every time you change the site

1. Edit, and bump `?v=` in **both** `index.html` and `privacy.html` after CSS or JS changes.
2. Test locally (see README).
3. `python3 tools/build_zip.py` (or `--live`), upload, check in Incognito.
4. Commit and push to GitHub so the others have the same version.

## Notes
- The free plan is plenty for this site. No card is needed.
- Your Cloudflare sub-address is visible to everyone who gets the link. Change it under **Workers & Pages → Account details → Subdomain** if it contains a personal name. A renamed address needs a few minutes for `https`.
- Never upload the project folder itself or connect the GitHub repo to Cloudflare: both would publish `backend/` and these notes.
