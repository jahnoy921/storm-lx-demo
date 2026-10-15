# Storm-LX — Live Web Demo

A free, browser-based demo that lets a visitor **actually use** Storm-LX before
paying. No install, no signup, no email capture. It sits between a social post
and your Gumroad checkout.

Everything runs client-side. There is no backend, no API key and no data leaves
the visitor's browser.

---

## Source of truth for the content

Everything below was taken from your two live Gumroad pages
(`fdxcube.gumroad.com`), read on 14 October 2026:

| Fact | Value used in this demo |
|---|---|
| Price (Windows) | **€400** |
| Price (Linux / Android) | **€400** |
| Seller | Naturban Prodject |
| Internal version | storm-lx v23 |
| Interface languages (product) | 14 |
| Research query languages | 17+ |
| Modules | 5 |
| Platforms | Windows, Linux, Android (Termux) |
| Delivered as | Compiled, obfuscated build — **no source code** |
| Extended with | Your own plugins (plugin API) and your own interface (interface builder) |
| Checkout | `l/zqgijq` (Windows) · `l/dtcjyf` (Linux/Android) |

If you change any of these, change them in `index.html` — there is no other
place where a price is written.

> **The product ships compiled and obfuscated. Source code is NOT included.**
> Both the demo site and the Gumroad listings must say so. Advertising source
> code you do not deliver is the fastest route to a chargeback.

---

## The five modules (matching your listing)

1. **Dynamic Deep Research** — auto domain classification, query expansion,
   17+ language queries, recursive crawling, authority scoring, cited synthesis
2. **The AI Council** — 3-round dialectical debate (proposals → devil's
   advocate → executive arbitration), live human intervention
3. **Multimedia Forensics** — local Whisper transcription, transcript Q&A,
   multi-video contradiction mapping, vision-ready OCR
4. **Tool & Skill Forge** — writes, tests, repairs and registers its own tools
5. **Security Suite** — EICAR validation, static audit, authorised adversary
   simulation

---

## What the demo actually does

| Tab | Real or simulated |
|---|---|
| **AI Council** | Simulated run, clearly labelled. Shows the real 3-round format with agent seats and a live log. |
| **Deep research** | Simulated pipeline, clearly labelled as fictional data. |
| **Media analysis** | **REAL.** Word count, sentence length, filler-word rate, question count, speaker count, estimated duration and vocabulary diversity — all computed on the pasted text in the browser. The read-aloud button uses the browser's own speech engine. |
| **Tool forge** | Simulated, clearly labelled. |
| **Security suite** | **REAL.** EICAR SHA-256 and MD5 computed live (WebCrypto, with a pure-JS fallback so it also works on `file://`). Plus a **real** static audit: hard-coded secrets, `eval`/`exec`, shell injection, disabled TLS, predictable temp files. |

Verified against known-good values: 68 bytes,
SHA-256 `275a021b…651fd0f`, MD5 `44d88612…8abb02f`.

---

## Languages

**9 languages are translated in the web demo:** English, Français, Español,
Deutsch, Italiano, Português, Nederlands, Русский, 中文 — 245 interface strings
each, zero missing keys.

**Your product ships 14.** The language menu says so explicitly rather than
letting a visitor count the buttons and feel misled.

### Adding the 6 missing ones (ja, ko, ar, he, hi, id)

1. Copy the `en: { … }` block in `assets/js/i18n.js`.
2. Paste it as `ja: { … }` (or `ko`, `ar`, `he`, `hi`, `id`).
3. Replace `html.lang`, `html.dir` (`ar` and `he` are `rtl`) and translate the
   values.
4. Add the entry to `window.LANG_META` at the top of the same file:

   ```js
   ja: { name: "日本語", short: "JA", flag: "🇯🇵", speech: "ja-JP", dir: "ltr" },
   ar: { name: "العربية", short: "AR", flag: "🇸🇦", speech: "ar-SA", dir: "rtl" },
   ```

That is all — the menu, the URL parameter and the speech synthesis pick it up
automatically.

---

## Deploy to GitHub Pages (free, 5 minutes)

```bash
cd demo-stormlx
git init
git add .
git commit -m "Storm-LX live demo"
git branch -M main
git remote add origin https://github.com/<ton-compte>/storm-lx-demo.git
git push -u origin main
```

Then on GitHub: **Settings → Pages → Source: Deploy from a branch** →
branch `main`, folder `/ (root)` → **Save**.

Live at `https://<ton-compte>.github.io/storm-lx-demo/`.

Local preview:

```bash
python -m http.server 8000   # then open http://localhost:8000
```

---

## Editing

**Prices and links** — all in `index.html`:
- `fdxcube.gumroad.com/l/zqgijq` → Windows checkout
- `fdxcube.gumroad.com/l/dtcjyf` → Linux / Android checkout
- `€400` → both prices

**Copy** — everything else is in `assets/js/i18n.js`, one block per language.

**Colours** — CSS variables at the top of `assets/css/style.css`:

```css
:root{
  --brand:#38bdf8;   /* primary gradient start */
  --brand-2:#5eead4; /* primary gradient end   */
  --accent:#a78bfa;  /* secondary accent       */
  --bg:#070b14;      /* page background        */
}
```

---

## Before you publish

- [ ] Confirm €400 matches your live Gumroad pages (it does as of 14 Oct 2026).
- [ ] Add a real support address — `lic.contact` no longer exists, but you may
      want one in the footer.
- [ ] Update `canonical`, `og:url` and `hreflang` to your real domain.
- [ ] Review `LEGAL.refund` in `app.js`. **It no longer promises 7 days** — it
      now says only that refunds are handled by email and that platform fees
      may not be recoverable. Set your actual policy.
- [ ] Review `LEGAL.use`. It restricts the suite to systems you own or have
      written authorisation for. Keep it.
- [ ] Check that both Gumroad pages are reachable from your target countries
      before driving traffic.

---

## Legal positioning

The demo shows the five commercial modules from your listing and **deliberately
shows no offensive-security tooling**. It frames the security suite as
authorised auditing and adversary simulation, which is what your own Gumroad
copy does.

Keep it that way. A demo centred on evasion, injection or credential attacks
gets you removed from ad platforms and payment processors. The "Authorised use"
page in the footer is linked from every language — leave it in place.