<<<<<<< HEAD
# Blooms & Flame Wax — Candle Showcase Website (v1.0.0)

A complete, responsive, vanilla **HTML5 / CSS3 / JavaScript** candle showcase website and **JWS-secured Studio Admin Panel** backed by **Google Sheets + Google Apps Script + Gmail** (no third-party API keys or paid databases required).

---

## Folder Structure

```text
blooms-flame-wax/
├── index.html                  # Page 1: Home (Hero + Shop Now smooth scroll + Featured 8)
├── shop.html                   # Page 2: Shop / Product Showcase (All 16 D:\data candles, filter, search, quick-view modal)
├── about.html                  # Page 3: About (Brand story, process, values, FAQ & policies)
├── contact.html                # Page 4: Contact (Validated enquiry form + honeypot + time-gate)
├── admin.html                  # Task 1 & 3: JWS (HS256) protected Studio Admin Panel
├── assets/
│   ├── images/
│   │   ├── logo-bfw.png        # Circular BFW seal extracted from your studio sticker
│   │   ├── hero-video-fallback.jpg
│   │   └── products/           # 16 optimised candle images from D:\data + placeholder.svg
│   └── videos/
│       └── candle-bg.mp4       # Supplied fixed background video
├── css/
│   ├── style.css               # Design tokens, glass overlays, cards, Version 1 footer
│   ├── animations.css          # Scroll reveal, flame flicker, marquee, prefers-reduced-motion
│   ├── responsive.css          # Desktop (>1024px), Tablet (641–1024px), Mobile (≤640px)
│   └── admin.css               # Studio Admin panel layout & tables
├── js/
│   ├── config.js               # Public configuration (paste APPS_SCRIPT_WEB_APP_URL here)
│   ├── security.js             # Safe DOM builder el(), URL/image whitelist, CSV formula guard
│   ├── products-data.js        # Default catalogue of 16 real products from D:\data
│   ├── layout.js               # Shared navigation & Version 1 footer
│   ├── main.js                 # Fixed video controller, ember particles, scroll reveal, featured grid
│   ├── shop.js                 # Category filter chips, search, quick-view dialog
│   ├── contact.js              # Client validation & fetch POST to Apps Script
│   └── admin.js                # JWS login, product CRUD, enquiry status & safe CSV export
├── google-apps-script/
│   ├── Code.gs                 # Complete Google Apps Script backend (Sheets + Gmail + JWS + Auto-reply)
│   └── appsscript.json         # Apps Script V8 manifest
├── tests/
│   └── verify-security.js      # Automated JWS & Injection Protection verification suite
└── README.md
```

---

## Quick Start (Local Preview)

1. Serve the `blooms-flame-wax` folder over any static HTTP server:
   ```powershell
   cd d:\blwwebsite\blooms-flame-wax
   npx --yes serve -l 8080
   ```
2. Open:
   - `http://localhost:8080/index.html` — Home
   - `http://localhost:8080/shop.html` — Full 16-candle showcase
   - `http://localhost:8080/about.html` — Story & FAQ
   - `http://localhost:8080/contact.html` — Contact form
   - `http://localhost:8080/admin.html` — Studio Admin Panel (works immediately in local JWS preview mode before you connect Google Apps Script)

---

## Connecting Google Sheets & Apps Script (Step-by-Step)

### 1. Create the Google Sheet
1. Go to [sheets.new](https://sheets.new) while signed into your Google account.
2. Name the spreadsheet **`Blooms Flame Wax Database`**.

### 2. Open Google Apps Script & Paste `Code.gs`
1. Inside the spreadsheet, click **Extensions → Apps Script**.
2. Delete any starter code in `Code.gs` and paste the entire contents of [`google-apps-script/Code.gs`](./google-apps-script/Code.gs).
3. Click the **Save** icon (`Ctrl+S`).

### 3. Configure `ADMIN_EMAIL` and `ADMIN_PASSWORD` in Script Properties
1. In the left sidebar of Apps Script, click **Project Settings** (the gear icon ⚙️).
2. Scroll down to **Script Properties** and click **Add script property**:
   - Property: `ADMIN_EMAIL` → Value: *your studio email address* (where enquiries should arrive).
   - Property: `ADMIN_PASSWORD` → Value: *a strong password of at least 10 characters* (for `admin.html`).
3. Click **Save script properties**.

### 4. Run `setup()` Once
1. Return to the **Editor** (`< >` icon in the left sidebar).
2. In the top toolbar dropdown (next to **Debug**), select **`setup`** and click **Run**.
3. Grant permissions when Google prompts you (*Review permissions → Choose your Google account → Advanced → Go to project → Allow*).
4. `setup()` automatically:
   - Creates the **`Submissions`**, **`Products`**, and **`AuditLog`** tabs with frozen headers.
   - Generates a random 96-hex-character `JWT_SECRET` for signing JWS tokens.
   - Hashes your `ADMIN_PASSWORD` with 2,000 rounds of salted HMAC-SHA256 and **deletes** the plain-text `ADMIN_PASSWORD` property.

### 5. Deploy as a Web App
1. Click **Deploy → New deployment** (top right).
2. Click the gear icon next to *Select type* and choose **Web app**.
3. Set:
   - **Description**: `Blooms & Flame Wax v1.0`
   - **Execute as**: **Me**
   - **Who has access**: **Anyone**
4. Click **Deploy** and copy the **Web app URL** (it ends with `/exec`).

### 6. Paste the `/exec` URL into `js/config.js`
Open [`js/config.js`](./js/config.js) and replace `PASTE_YOUR_WEB_APP_URL_HERE`:
```js
APPS_SCRIPT_WEB_APP_URL: "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec",
```

---

## Verifying Security & Injection Protection

Run the automated test suite with Node.js:

```powershell
node d:\blwwebsite\blooms-flame-wax\tests\verify-security.js
```

It verifies:
- **JWS / JWT (RFC 7515 HS256)**: valid signature verification, tamper rejection, `alg: "none"` rejection, expired token rejection, and `TOKEN_VERSION` session revocation.
- **Spreadsheet Formula Injection Protection**: prefixes `=`, `+`, `-`, `@`, `\t`, `\r`, and full-width variants (`＝`, `＋`, `－`, `＠`) with `'`.
- **HTML / XSS & Email Header Injection Protection**: neutralises `<script>`, `<svg onload>`, event attributes, `javascript:` / `data:` URLs, and `\r\n` (`BCC:`) header injection.
=======
# v001
>>>>>>> 3d2f8abfd033afb806f3edcf24a8b850d9f177be
