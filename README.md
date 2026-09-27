# MDops — mdops.ai

Official website for **MDops — Intelligent Healthcare Operations** (عمليات رعاية صحية ذكية): an enterprise healthcare operations platform for hospital workforce scheduling, perioperative management, on-call planning, analytics, approvals, and communication.

## What's in this repo

| Path | Purpose |
|---|---|
| `index.html` | The full single-page website (bilingual English/Arabic with RTL toggle) |
| `styles.css` | Brand styling — Deep Navy `#0B1F3A`, Healthcare Blue `#2563EB`, Emerald `#10B981`, Signal Cyan `#22D3EE` |
| `script.js` | Language toggle, mobile nav, and contact-form submission |
| `assets/favicon.svg` | Site favicon (ascend-signal mark) |
| `docs/MDops-Brand-and-Portfolio.docx` | Original brand identity & corporate portfolio document (bilingual) |
| `docs/BRAND.md` | Quick-reference extract of the brand document |
| `CNAME` | Custom domain for GitHub Pages (`mdops.ai`) |

## Contact form

The form posts to [FormSubmit](https://formsubmit.co) and delivers submissions to **falfawwaz@mdops.ai** — no backend needed.

**One-time activation:** the first time someone submits the form, FormSubmit sends a confirmation email to `falfawwaz@mdops.ai`. Click the activation link in that email once, and all future submissions are delivered normally.

## Deploying to mdops.ai (GitHub Pages + GoDaddy)

1. In this GitHub repo: **Settings → Pages → Source: Deploy from a branch**, pick the branch and `/ (root)`.
2. Still in **Settings → Pages**, set **Custom domain** to `mdops.ai` and enable **Enforce HTTPS** (available after DNS propagates).
3. In GoDaddy DNS for `mdops.ai`, add:
   - Four **A** records, Name `@`, pointing to GitHub Pages IPs: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - One **CNAME** record, Name `www`, Value `<your-github-username>.github.io`
4. Wait for DNS to propagate (minutes up to an hour), then visit https://mdops.ai.

> These DNS records coexist with the Google Workspace records (TXT verification, MX `smtp.google.com`, DKIM `google._domainkey`) — do not remove those; email keeps working independently of the website.

## Local preview

No build step. Open `index.html` in a browser, or run:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```
