# MDops — mdops.ai

Official website for **MDops — Intelligent Healthcare Operations** (عمليات رعاية صحية ذكية): an enterprise healthcare operations platform for hospital workforce scheduling, perioperative management, on-call planning, analytics, approvals, and communication.

## What's in this repo

| Path | Purpose |
|---|---|
| `index.html` | The full single-page website (bilingual English/Arabic with RTL toggle) |
| `styles.css` | Brand styling: Deep Navy `#0B1F3A`, Healthcare Blue `#2563EB`, Emerald `#10B981`, Signal Cyan `#22D3EE` |
| `script.js` | Language toggle, live OR board, ECG sweep, story rota, product explorer, security diagram, journey map, contact form |
| `assets/favicon.svg` | Site favicon (ascend-signal mark) |
| `docs/MDops-Brand-and-Portfolio.docx` | Original brand identity & corporate portfolio document (bilingual) |
| `docs/BRAND.md` | Quick-reference extract of the brand document |
| `CNAME` | Only used if the site is ever hosted on GitHub Pages; ignored by GoDaddy |

The website itself is just four files: `index.html`, `styles.css`, `script.js`, and `assets/favicon.svg`. There is no build step.

## Hosting on GoDaddy (mdops.ai)

**Plan required:** a GoDaddy **Web Hosting** plan (cPanel, e.g. Economy). GoDaddy's *Website Builder* / *Websites + Marketing* product cannot host custom HTML files, so it will not work for this site.

1. **Buy or open Web Hosting** in your GoDaddy account and, when asked, choose `mdops.ai` as the primary domain. Because the domain is also registered at GoDaddy, it connects the domain to the hosting automatically.
2. **Open cPanel:** GoDaddy → My Products → Web Hosting → **Manage** → **cPanel Admin**.
3. **Upload the files:** cPanel → **File Manager** → open the `public_html` folder → delete any placeholder `index.html` / `default.html` GoDaddy put there → **Upload** the four website files, keeping the `assets` folder:

   ```
   public_html/
   ├── index.html
   ├── styles.css
   ├── script.js
   └── assets/
       └── favicon.svg
   ```

   (Or upload `mdops-website.zip`, then right-click it → **Extract** into `public_html`, then delete the zip.)
4. **Turn on HTTPS:** cPanel → **SSL/TLS Status** (or GoDaddy → My Products → SSL) and make sure `mdops.ai` and `www.mdops.ai` have an active certificate.
5. Visit **https://mdops.ai**. DNS changes can take from a few minutes up to an hour.

**Updating the site later:** re-upload the changed file(s) into `public_html` and overwrite.

> **Keep the email records.** Connecting hosting only changes the website's **A** record (`@`) and the `www` record. Do **not** delete the Google Workspace records in GoDaddy DNS: the TXT verification record, the MX record `smtp.google.com`, and the DKIM record `google._domainkey`. After hosting is connected, check DNS once to confirm the MX record still points to `smtp.google.com` and that GoDaddy did not add its own MX records back.

## Contact form

The form sends submissions to **falfawwaz@mdops.ai** through [FormSubmit](https://formsubmit.co), so no server code is needed and it works on any host.

**One-time activation:** the first time the form is submitted on the live site, FormSubmit sends a confirmation email to `falfawwaz@mdops.ai`. Click the activation link in that email once; after that, every submission is delivered.

## Local preview

Open `index.html` in a browser, or run:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```
