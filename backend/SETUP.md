# Go live: Google Sheet + email (about 15 minutes)

Use your **personal** Google account for the trial, never your work account.

## 1. Create the Sheet
1. Open https://sheets.new while signed in to your personal account.
2. Name it **Velocity Travels Leads**.

## 2. Add the script
1. In the Sheet: **Extensions → Apps Script**. Name the project **Velocity backend**.
2. Delete what is in `Code.gs`, paste everything from `backend/Code.gs`, and save.
3. Click the gear (**Project Settings**) and tick **Show "appsscript.json" manifest file in editor**.
4. Open `appsscript.json` in the editor, replace it with `backend/appsscript.json`, and save.

## 3. Run setup
1. Open the `Code.gs`, select the function **setup**, and click run.
2. Click **Review permissions** and pick your account. Google says the app isn't verified, because it's your own private script: **Advanced → Go to Velocity backend → Allow**. It asks to use this Sheet, send email as you, run on a schedule, and show a menu.
3. Back in the Sheet you should see **Leads, Dashboard, Settings, Log**.

## 4. Settings tab
- **Team emails**: start with just yours. Each address counts toward about 100 emails a day.
- **Owners**: your three names, then **Velocity → Set up / repair** (reload the Sheet if the menu is missing).
- Leave phone, WhatsApp, email and website as they are until you have real ones; placeholders are left out of emails.

## 5. Test
**Velocity → Send test lead.** Check the new row and your inbox (and Spam). Delete the row afterwards.

## 6. Deploy
1. In Apps Script: **Deploy → New deployment → gear → Web app**.
2. **Execute as: Me**. **Who has access: Anyone** (not "Anyone with Google account").
3. **Deploy**, then copy the **Web app URL** ending in `/exec`.
4. Paste the URL to Claude, who adds it to `js/app.js` and tests it.

## Changing the code later
Paste the new code, save, then **Deploy → Manage deployments → pencil → Version: New version → Deploy**. This keeps the same URL. "New deployment" would change it.

## Everyday use
- Work from **Leads**: set Status, Owner, Follow-up and Quote (gold headers). Red means a new lead is over 2 hours old or a follow-up is due.
- You can sort, filter, move or add columns. Don't rename the headers or delete the hidden columns.
- Share the Sheet only with your partners. Turn on 2-step sign-in for the account.
- Track adverts with links like `https://your-site/?utm_source=instagram&utm_campaign=onam` (see below).

## Where leads come from (Source, Campaign, Landing page)
These columns show how the customer found the site, so you can see which promotion brings bookings.
- **Source**: where the visitor came from. Taken from a tagged link (`utm_source`), otherwise from the site that sent them. Well-known names are tidied up (Instagram, Facebook, WhatsApp, Google, YouTube, Justdial); anything else is shown as it came; **Direct** means they typed the address or came from an app that doesn't say.
- **Campaign**: the promotion name from a tagged link (`utm_campaign`). Empty for visitors who didn't use one.
- **Landing page**: the first page they opened, such as `/`. Useful once the site has more pages.

Give each poster, post, advert, WhatsApp broadcast or business card its own link, for example `?utm_source=card`, `?utm_source=instagram&utm_campaign=bio`, `?utm_source=whatsapp&utm_campaign=sabarimala`. Keep the labels short and lowercase. After a few weeks, filter Leads by Source or Campaign and compare how many reached **Booked**.

A tagged link overrides an earlier visit in the same tab. Nothing is stored after the tab is closed, and no cookies are used.

## Moving to a business account
Make a copy of the Sheet there, run **setup**, check Settings, deploy, and give Claude the new URL. Then in the old script remove the deployment (**Manage deployments → Archive**) and both triggers (clock icon), so nobody gets two emails.

## If something goes wrong
- **No email**: check Spam, the Settings tab, and the **Team email** column (Pending is retried every 10 minutes, Failed means 5 tries). The **Log** tab says why.
- **"Limited" or "Quota" under Receipt**: a safety cap held back the customer copy. The lead is still saved.
- **Form says it couldn't send**: open the `/exec` URL in a private window. It should show `"service":"velocity-enquiries"`. If it asks you to sign in, redo step 6.2.
