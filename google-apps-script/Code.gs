/**
 * =====================================================================
 *  Blooms & Flame Wax — Google Apps Script backend (v1.0)
 * =====================================================================
 *  Website  →  Apps Script Web App  →  Google Sheets  →  Gmail
 *
 *  Features
 *   • Contact form: validation, spam protection, Sheets storage,
 *     admin notification e-mail + automatic reply to the visitor.
 *   • Admin panel API secured with JWS / JWT (HS256) tokens.
 *   • Product catalogue stored in Google Sheets (managed from admin.html).
 *   • Injection protection: Sheets formula injection, HTML/e-mail
 *     injection, header injection, strict input whitelists.
 *
 *  NO API KEYS. Only built-in services are used:
 *   SpreadsheetApp, MailApp, PropertiesService, CacheService,
 *   LockService, Utilities, ContentService.
 *
 *  Private configuration lives ONLY in
 *   Project Settings → Script Properties:
 *     ADMIN_EMAIL      (required) where notifications are sent
 *     ADMIN_PASSWORD   (first time only) admin panel password —
 *                      run setup() once; it is hashed and removed.
 *     SPREADSHEET_ID   (optional) only if the script is NOT bound
 *                      to the spreadsheet (standalone script).
 *   Generated automatically by setup():
 *     JWT_SECRET, ADMIN_PASSWORD_HASH, ADMIN_PASSWORD_SALT, TOKEN_VERSION
 * =====================================================================
 */

/* ----------------------------- CONFIG ------------------------------ */
var CONFIG = {
  VERSION: '1.0.0',
  BRAND_NAME: 'Blooms & Flame Wax',
  SUBMISSIONS_SHEET: 'contextdetails',
  PRODUCTS_SHEET: 'Products',
  AUDIT_SHEET: 'AuditLog',

  SEND_AUTO_REPLY: true,          // Task 2: automatic e-mail to the visitor
  TOKEN_TTL_SECONDS: 2 * 60 * 60, // admin session length (2 hours)
  JWT_ISSUER: 'bfw-apps-script',
  JWT_AUDIENCE: 'bfw-admin',

  MAX_LOGIN_ATTEMPTS: 5,          // failed logins before lock-out
  LOCKOUT_SECONDS: 15 * 60,
  PASSWORD_ITERATIONS: 2000,      // key-stretching rounds
  MIN_PASSWORD_LENGTH: 10,

  RATE_WINDOW_SECONDS: 10 * 60,
  RATE_LIMIT_PER_EMAIL: 3,        // submissions per e-mail per window
  RATE_LIMIT_GLOBAL: 40,          // submissions overall per window
  MIN_FILL_MS: 3000,              // humans need > 3 s to fill the form
  MAX_BODY_BYTES: 20000,
  MAX_URLS_IN_MESSAGE: 3,

  LIMITS: { name: 80, email: 254, phone: 20, message: 2000, product: 80 },
  PRODUCT_CATEGORIES: ['floral', 'love', 'sculpted', 'festive'],
  SUBMISSION_STATUSES: ['New', 'Read', 'Replied', 'Closed']
};

var SUBMISSION_HEADERS = ['ID', 'Submitted At', 'Name', 'Email', 'Phone', 'Message', 'Product', 'Status', 'Page'];
var PRODUCT_HEADERS = ['ID', 'Name', 'Category', 'Description', 'Image', 'Price', 'Badge', 'Visible', 'Sort Order', 'Updated At'];
var AUDIT_HEADERS = ['Time', 'Event', 'Detail'];

/* ============================ 1. ONE-TIME SETUP (DEFAULT RUN) ====== */

/**
 * FIRST FUNCTION IN FILE (selected by default when you click ▶ Run).
 * Run this in the Apps Script editor (Run ▶ setup).
 * - Automatically binds to your Google Sheet (or creates one if standalone).
 * - Creates Submissions, Products, and AuditLog tabs.
 * - Creates JWT_SECRET and hashes ADMIN_PASSWORD.
 */
function setup() {
  var props = PropertiesService.getScriptProperties();
  var ss = getSpreadsheet_();
  getSheet_(CONFIG.SUBMISSIONS_SHEET, SUBMISSION_HEADERS);
  getSheet_(CONFIG.PRODUCTS_SHEET, PRODUCT_HEADERS);
  getSheet_(CONFIG.AUDIT_SHEET, AUDIT_HEADERS);

  if (!props.getProperty('JWT_SECRET')) props.setProperty('JWT_SECRET', randomSecret_());
  if (!props.getProperty('TOKEN_VERSION')) props.setProperty('TOKEN_VERSION', '1');

  var plain = props.getProperty('ADMIN_PASSWORD');
  if (plain) {
    storePassword_(plain);
    props.deleteProperty('ADMIN_PASSWORD'); // never keep the plain password
    console.log('Admin password hashed and stored. Plain ADMIN_PASSWORD removed.');
  } else if (!props.getProperty('ADMIN_PASSWORD_HASH')) {
    storePassword_('BloomsAdmin2026!');
    console.log('Default admin password set to: BloomsAdmin2026! (change it anytime in Admin Panel or Script Properties).');
  }

  var adminEmail = getAdminEmail_();
  if (ss && typeof ss.getUrl === 'function') {
    console.log('Connected Google Sheet URL: ' + ss.getUrl());
  }
  console.log('Admin notifications will be sent to: ' + (adminEmail || 'NOT SET — add ADMIN_EMAIL in Project Settings → Script Properties'));
  console.log('Setup complete ✔ — Now click Deploy → New deployment → Web app.');
  return { ok: true };
}

/** Ensures JWT_SECRET and sheet tabs exist even if setup() was not run manually. */
function ensureSetup_() {
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('JWT_SECRET') || !props.getProperty('ADMIN_PASSWORD_HASH')) {
    setup();
  }
}

/* ============================ 2. WEB APP ENTRY POINTS ============== */

/** GET  ?action=products  → public, visible products
 *  GET  ?action=health    → { ok, version } */
function doGet(e) {
  try {
    ensureSetup_();
    var action = (e && e.parameter && e.parameter.action) || 'health';
    if (action === 'products') return json_({ ok: true, products: getPublicProducts_() });
    return json_({ ok: true, service: CONFIG.BRAND_NAME, version: CONFIG.VERSION });
  } catch (err) {
    return fail_(err);
  }
}

/** POST body (sent as text/plain JSON to avoid CORS pre-flight):
 *  { action: 'contact' | 'login' | 'listSubmissions' | ... , ... } */
function doPost(e) {
  try {
    ensureSetup_();
    // If someone clicks "Run ▶ doPost" directly in the Apps Script editor (where e is undefined),
    // run setup() cleanly instead of failing with an error.
    if (!e || !e.postData) {
      return json_(setup());
    }
    var data = parseBody_(e);
    switch (data.action) {
      case 'contact':                return json_(handleContact_(data));
      case 'forgotPassword':         return json_(handleForgotPassword_(data));
      case 'login':                  return json_(handleLogin_(data));
      case 'verify':                 requireAdmin_(data); return json_({ ok: true });
      case 'listSubmissions':        requireAdmin_(data); return json_(listSubmissions_());
      case 'updateSubmissionStatus': requireAdmin_(data); return json_(updateSubmissionStatus_(data));
      case 'deleteSubmission':       requireAdmin_(data); return json_(deleteSubmission_(data));
      case 'listProducts':           requireAdmin_(data); return json_({ ok: true, products: readProducts_(true) });
      case 'saveProduct':            requireAdmin_(data); return json_(saveProduct_(data));
      case 'deleteProduct':          requireAdmin_(data); return json_(deleteProduct_(data));
      case 'importProducts':         requireAdmin_(data); return json_(importProducts_(data));
      case 'changePassword':         requireAdmin_(data); return json_(changePassword_(data));
      case 'logoutAll':              requireAdmin_(data); return json_(logoutAll_());
      default: throw clientError_('Unknown action.', 'BAD_ACTION');
    }
  } catch (err) {
    return fail_(err);
  }
}

/** Optional: run from the editor to send yourself a test e-mail. */
function testEmail() {
  ensureSetup_();
  var to = getAdminEmail_();
  if (!to) {
    console.log('Please add ADMIN_EMAIL in Project Settings → Script Properties first.');
    return;
  }
  MailApp.sendEmail({ to: to, subject: CONFIG.BRAND_NAME + ' — test e-mail', body: 'Apps Script can send e-mail. ✔' });
  console.log('Test e-mail sent to: ' + to);
}

/* ============================ CONTACT FORM ========================= */

function handleContact_(data) {
  // 1. Bot honeypot trap (pretend success if hidden field is filled).
  if (data.website) { audit_('BOT_HONEYPOT', ''); return { ok: true, message: 'Thank you!' }; }

  // 1b. Deduplicate if browser retried with no-cors after a CORS redirect warning.
  var reqId = cleanText_(data.clientReqId, 64);
  if (reqId) {
    var cache = CacheService.getScriptCache();
    if (cache.get('req_' + reqId)) {
      return { ok: true, deduplicated: true, message: 'Thank you! Your message has been sent.' };
    }
    cache.put('req_' + reqId, '1', 600);
  }

  // 2. Server-side validation (Name, Phone, Message required; Email is optional).
  var v = validateContact_(data);
  if (!v.ok) throw clientError_(v.errors.join(' '), 'VALIDATION', v.fields);
  var c = v.clean;

  // 3. Rate limiting (per phone/e-mail + global).
  var rateKey = 'rl_user_' + digestHex_((c.email || c.phone).toLowerCase());
  if (!rateLimit_(rateKey, CONFIG.RATE_LIMIT_PER_EMAIL, CONFIG.RATE_WINDOW_SECONDS) ||
      !rateLimit_('rl_global', CONFIG.RATE_LIMIT_GLOBAL, CONFIG.RATE_WINDOW_SECONDS)) {
    throw clientError_('Too many messages. Please try again in a few minutes.', 'RATE_LIMIT');
  }

  // 4. Store in Google Sheets (formula-injection safe).
  var id = Utilities.getUuid();
  var now = new Date();
  withLock_(function () {
    var sheet = getSheet_(CONFIG.SUBMISSIONS_SHEET, SUBMISSION_HEADERS);
    sheet.appendRow([id, now, safeCell_(c.name), safeCell_(c.email || '—'), safeCell_(c.phone),
                     safeCell_(c.message), safeCell_(c.product), 'New', safeCell_(c.page)]);
  });

  // 5. Auto-send Gmail notification to Admin (+ optional auto-reply if visitor entered email).
  var mailWarning = false;
  try { sendAdminNotification_(c, id, now); } catch (err) { mailWarning = true; console.error('Admin mail failed: ' + err); }
  if (CONFIG.SEND_AUTO_REPLY && c.email) {
    try { sendAutoReply_(c); } catch (err2) { console.error('Auto-reply failed: ' + err2); }
  }

  return { ok: true, id: id, message: 'Thank you, ' + c.name.split(' ')[0] + '! Your message has been sent.', mailWarning: mailWarning };
}

/**
 * Split Operation 2: Admin Forgot Password Auto-Email (handleForgotPassword_)
 * Triggered when "Forgot Password?" is clicked on admin.html.
 * Uses the exact same hidden <form method="POST" target="iframe"> process as contact.html.
 */
function handleForgotPassword_(data) {
  if (data.website) return { ok: true };

  var reqId = cleanText_(data.clientReqId, 64);
  if (reqId) {
    var cache = CacheService.getScriptCache();
    if (cache.get('req_' + reqId)) return { ok: true, deduplicated: true };
    cache.put('req_' + reqId, '1', 600);
  }

  var eventType = cleanText_(data.eventType, 80) || 'Admin Password Recovery / Update';
  var adminId = cleanText_(data.adminId || data.email, 120) || 'srooban1211@gmail.com';
  var currentPwd = cleanText_(data.currentPassword || data.adminPassword, 120) || 'BloomsAdmin2026!';
  var updatedPwd = cleanText_(data.updatedPassword || data.adminPassword, 120) || currentPwd;
  var requestedBy = cleanText_(data.requestedBy || data.email, 120) || adminId;
  var now = new Date();
  var id = Utilities.getUuid();

  // 1. Log recovery / password change request in Google Sheet (contextdetails)
  withLock_(function () {
    var sheet = getSheet_(CONFIG.SUBMISSIONS_SHEET, SUBMISSION_HEADERS);
    sheet.appendRow([
      id,
      now,
      safeCell_('BFW Admin — ' + eventType),
      safeCell_(requestedBy),
      safeCell_('+91 78713 26620'),
      safeCell_('Admin ID: ' + adminId + ' | Current & Updated password emailed to Admin Gmail.'),
      safeCell_('Admin ID & Password Security'),
      'Credentials Sent',
      'admin-security'
    ]);
  });

  // 2. Auto-send Current & Updated Admin Password Email to Admin Gmail
  var toEmail = getAdminEmail_() || adminId;
  if (toEmail) {
    var tz = Session.getScriptTimeZone() || 'Asia/Kolkata';
    var stamp = Utilities.formatDate(now, tz, 'dd MMM yyyy, HH:mm') + ' (' + tz + ')';
    var subject = headerSafe_(CONFIG.BRAND_NAME + ' — ' + eventType);
    var html = '<div style="font-family:Arial,sans-serif;color:#2a1d22;max-width:560px">' +
      '<h2 style="color:#b5733b">' + escapeHtml_(eventType) + '</h2>' +
      '<p>Your current and updated Admin credentials from <strong>admin.html</strong>:</p>' +
      '<table style="border-collapse:collapse;background:#faf5ef;padding:12px;border-radius:8px;width:100%">' +
      '<tr><td style="padding:8px 12px;font-weight:600;color:#8a6d5a">Admin ID / Email</td><td style="padding:8px 12px">' + escapeHtml_(adminId) + '</td></tr>' +
      '<tr><td style="padding:8px 12px;font-weight:600;color:#8a6d5a">Current / Previous Password</td><td style="padding:8px 12px"><code>' + escapeHtml_(currentPwd) + '</code></td></tr>' +
      '<tr><td style="padding:8px 12px;font-weight:600;color:#8a6d5a">Active / Updated Password</td><td style="padding:8px 12px"><code>' + escapeHtml_(updatedPwd) + '</code></td></tr>' +
      '<tr><td style="padding:8px 12px;font-weight:600;color:#8a6d5a">Time</td><td style="padding:8px 12px">' + escapeHtml_(stamp) + '</td></tr>' +
      '<tr><td style="padding:8px 12px;font-weight:600;color:#8a6d5a">Reference ID</td><td style="padding:8px 12px">' + escapeHtml_(id) + '</td></tr>' +
      '</table></div>';
    var text =
      'Blooms & Flame Wax — ' + eventType + '\n\n' +
      'Admin ID / Email:            ' + adminId + '\n' +
      'Current / Previous Password: ' + currentPwd + '\n' +
      'Active / Updated Password:   ' + updatedPwd + '\n' +
      'Time:                        ' + stamp + '\n' +
      'Reference ID:                ' + id + '\n';
    MailApp.sendEmail({
      to: toEmail,
      subject: subject,
      body: text,
      htmlBody: html,
      name: CONFIG.BRAND_NAME + ' Admin Security'
    });
  }

  return { ok: true, id: id, message: 'Current & updated Admin credentials emailed to Admin Gmail.' };
}

function validateContact_(d) {
  var errors = [], fields = {};
  var name = cleanText_(d.name, CONFIG.LIMITS.name);
  var email = cleanText_(d.email, CONFIG.LIMITS.email).toLowerCase();
  var phone = cleanText_(d.phone, CONFIG.LIMITS.phone);
  var message = cleanText_(d.message, CONFIG.LIMITS.message, true);
  var product = cleanText_(d.product, CONFIG.LIMITS.product);
  var page = cleanText_(d.page, 40);

  if (!/^[\p{L}\p{M}][\p{L}\p{M} .'\-]{1,79}$/u.test(name)) { errors.push('Please enter a valid name.'); fields.name = true; }
  if (!/^\+?[0-9][0-9 ()\-]{6,19}$/.test(phone) || phone.replace(/\D/g, '').length < 7) { errors.push('Please enter a valid phone number.'); fields.phone = true; }
  // Email is optional — validate only if provided
  if (email && !isValidEmail_(email)) { errors.push('Please enter a valid e-mail address or leave it empty.'); fields.email = true; }
  if (message.length < 2) { errors.push('Please enter a message.'); fields.message = true; }
  if ((message.match(/https?:\/\/|www\./gi) || []).length > CONFIG.MAX_URLS_IN_MESSAGE) { errors.push('Message contains too many links.'); fields.message = true; }
  if (/<\s*\/?\s*(script|iframe|object|embed|svg|img|style|link|meta)\b/i.test(message)) { errors.push('HTML tags are not allowed in the message.'); fields.message = true; }
  if (product && !/^[\p{L}\p{N} &'\-()]{1,80}$/u.test(product)) product = '';
  if (!/^[a-z\-]{0,40}$/.test(page)) page = '';

  return { ok: errors.length === 0, errors: errors, fields: fields,
           clean: { name: name, email: email, phone: phone, message: message, product: product, page: page } };
}

function sendAdminNotification_(c, id, when) {
  var subject = headerSafe_(CONFIG.BRAND_NAME + ' — New enquiry from ' + c.name + ' (' + c.phone + ')');
  var tz = Session.getScriptTimeZone() || 'Asia/Kolkata';
  var stamp = Utilities.formatDate(when, tz, 'dd MMM yyyy, HH:mm') + ' (' + tz + ')';
  var rows = [['Name', c.name], ['Phone', c.phone], ['E-mail', c.email || 'Not provided'], ['Product', c.product || '—'], ['Received', stamp], ['Reference', id]];
  var table = rows.map(function (r) {
    return '<tr><td style="padding:6px 12px;color:#8a6d5a;font-weight:600">' + escapeHtml_(r[0]) +
           '</td><td style="padding:6px 12px">' + escapeHtml_(r[1]) + '</td></tr>';
  }).join('');
  var html = '<div style="font-family:Arial,sans-serif;color:#2a1d22;max-width:600px">' +
    '<h2 style="color:#b5733b">New website enquiry</h2><table style="border-collapse:collapse">' + table + '</table>' +
    '<h3 style="margin-top:20px">Message</h3><div style="white-space:pre-wrap;background:#faf5ef;padding:14px;border-radius:8px">' +
    escapeHtml_(c.message) + '</div></div>';
  var text = rows.map(function (r) { return r[0] + ': ' + r[1]; }).join('\n') + '\n\nMessage:\n' + c.message;
  var toEmail = getAdminEmail_();
  if (!toEmail) { console.warn('Admin email not set — skipping notification.'); return; }
  var mailOpts = { to: toEmail, subject: subject, body: text, htmlBody: html, name: CONFIG.BRAND_NAME + ' Website' };
  if (c.email) mailOpts.replyTo = c.email;
  MailApp.sendEmail(mailOpts);
}

/** Automatic reply to the visitor. Deliberately does NOT echo the visitor's
 *  message, so the form cannot be abused to send spam to third parties. */
function sendAutoReply_(c) {
  var first = c.name.split(' ')[0].slice(0, 40);
  var subject = headerSafe_('We received your message — ' + CONFIG.BRAND_NAME);
  var html = '<div style="font-family:Georgia,serif;color:#2a1d22;max-width:560px;line-height:1.6">' +
    '<h2 style="color:#b5733b;font-weight:normal">Thank you, ' + escapeHtml_(first) + ' 🕯️</h2>' +
    '<p>We have received your message and our studio team will get back to you within 1–2 working days.</p>' +
    (c.product ? '<p>Product of interest: <strong>' + escapeHtml_(c.product) + '</strong></p>' : '') +
    '<p>Warm regards,<br>' + escapeHtml_(CONFIG.BRAND_NAME) + '<br><em>Light up your moments</em></p>' +
    '<p style="color:#999;font-size:12px">This is an automatic reply. If you did not contact us, please ignore this e-mail.</p></div>';
  var text = 'Thank you, ' + first + '!\n\nWe have received your message and will reply within 1–2 working days.\n\n— ' + CONFIG.BRAND_NAME;
  MailApp.sendEmail({ to: c.email, subject: subject, body: text, htmlBody: html, name: CONFIG.BRAND_NAME, replyTo: getAdminEmail_() });
}

/* ============================ AUTH (JWS / JWT) ===================== */

function handleLogin_(data) {
  var cache = CacheService.getScriptCache();
  var fails = Number(cache.get('login_fails') || 0);
  if (fails >= CONFIG.MAX_LOGIN_ATTEMPTS) {
    audit_('LOGIN_LOCKED', '');
    throw clientError_('Too many failed attempts. Try again in 15 minutes.', 'LOCKED');
  }
  var password = typeof data.password === 'string' ? data.password : '';
  if (!password || password.length > 200 || !checkPassword_(password)) {
    cache.put('login_fails', String(fails + 1), CONFIG.LOCKOUT_SECONDS);
    Utilities.sleep(400 + Math.floor(Math.random() * 400)); // slow down brute force
    audit_('LOGIN_FAILED', 'attempt ' + (fails + 1));
    throw clientError_('Invalid password.', 'AUTH');
  }
  cache.remove('login_fails');
  var now = Math.floor(Date.now() / 1000);
  var token = signJwt_({
    iss: CONFIG.JWT_ISSUER, aud: CONFIG.JWT_AUDIENCE, sub: 'admin', role: 'admin',
    iat: now, nbf: now, exp: now + CONFIG.TOKEN_TTL_SECONDS,
    jti: Utilities.getUuid(), ver: getTokenVersion_()
  });
  audit_('LOGIN_OK', '');
  return { ok: true, token: token, expiresAt: (now + CONFIG.TOKEN_TTL_SECONDS) * 1000 };
}

function requireAdmin_(data) {
  var claims = verifyJwt_(data && data.token);
  if (!claims) throw clientError_('Session expired or invalid. Please log in again.', 'AUTH');
  return claims;
}

/** JWS compact serialisation: base64url(header).base64url(payload).base64url(HMAC-SHA256) */
function signJwt_(payload) {
  var header = b64url_(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  var body = b64url_(JSON.stringify(payload));
  var input = header + '.' + body;
  return input + '.' + hmac_(input);
}

/** Returns the claims if the token is authentic and valid, otherwise null. */
function verifyJwt_(token) {
  if (typeof token !== 'string' || token.length > 2048) return null;
  var parts = token.split('.');
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return null;
  var header, claims;
  try {
    header = JSON.parse(b64urlDecode_(parts[0]));
    claims = JSON.parse(b64urlDecode_(parts[1]));
  } catch (e) { return null; }
  // Algorithm pinning: reject "none", RS256 confusion, etc.
  if (!header || header.alg !== 'HS256' || header.typ !== 'JWT') return null;
  if (!safeEqual_(hmac_(parts[0] + '.' + parts[1]), parts[2])) return null;
  var now = Math.floor(Date.now() / 1000);
  if (!claims || claims.iss !== CONFIG.JWT_ISSUER || claims.aud !== CONFIG.JWT_AUDIENCE) return null;
  if (claims.role !== 'admin' || typeof claims.exp !== 'number' || claims.exp <= now) return null;
  if (typeof claims.nbf === 'number' && claims.nbf > now + 30) return null;
  if (claims.ver !== getTokenVersion_()) return null; // revoked by logoutAll / password change
  return claims;
}

function hmac_(input) {
  var secret = PropertiesService.getScriptProperties().getProperty('JWT_SECRET');
  if (!secret) throw new Error('JWT_SECRET missing — run setup() first.');
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(input, secret)).replace(/=+$/, '');
}

function b64url_(str) {
  return Utilities.base64EncodeWebSafe(Utilities.newBlob(str).getBytes()).replace(/=+$/, '');
}
function b64urlDecode_(str) {
  if (!/^[A-Za-z0-9_\-]+$/.test(str)) throw new Error('bad b64');
  var pad = str.length % 4 ? '===='.slice(str.length % 4) : '';
  return Utilities.newBlob(Utilities.base64DecodeWebSafe(str + pad)).getDataAsString();
}

/** Constant-time string comparison (prevents timing attacks). */
function safeEqual_(a, b) {
  a = String(a); b = String(b);
  var len = Math.max(a.length, b.length);
  var diff = a.length ^ b.length;
  for (var i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

function hashPassword_(password, salt) {
  var h = salt + ':' + password;
  for (var i = 0; i < CONFIG.PASSWORD_ITERATIONS; i++) {
    h = Utilities.base64Encode(Utilities.computeHmacSha256Signature(h + password, salt));
  }
  return h;
}
function storePassword_(plain) {
  var props = PropertiesService.getScriptProperties();
  var salt = randomSecret_();
  props.setProperties({ ADMIN_PASSWORD_SALT: salt, ADMIN_PASSWORD_HASH: hashPassword_(plain, salt) });
}
function checkPassword_(password) {
  var props = PropertiesService.getScriptProperties();
  var salt = props.getProperty('ADMIN_PASSWORD_SALT'), hash = props.getProperty('ADMIN_PASSWORD_HASH');
  if (!salt || !hash) throw clientError_('Admin password not configured. Run setup() in Apps Script.', 'NOT_CONFIGURED');
  return safeEqual_(hashPassword_(password, salt), hash);
}
function changePassword_(data) {
  if (!checkPassword_(String(data.currentPassword || ''))) throw clientError_('Current password is incorrect.', 'AUTH');
  var next = String(data.newPassword || '');
  if (next.length < CONFIG.MIN_PASSWORD_LENGTH || next.length > 200) throw clientError_('New password must be at least ' + CONFIG.MIN_PASSWORD_LENGTH + ' characters.', 'VALIDATION');
  storePassword_(next);
  logoutAll_();
  audit_('PASSWORD_CHANGED', '');
  return { ok: true, message: 'Password changed. Please log in again.' };
}
function logoutAll_() {
  var props = PropertiesService.getScriptProperties();
  props.setProperty('TOKEN_VERSION', String(Number(props.getProperty('TOKEN_VERSION') || 1) + 1));
  audit_('LOGOUT_ALL', '');
  return { ok: true };
}
function getTokenVersion_() {
  return Number(PropertiesService.getScriptProperties().getProperty('TOKEN_VERSION') || 1);
}
function randomSecret_() {
  return (Utilities.getUuid() + Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
}

/* ============================ ADMIN: SUBMISSIONS =================== */

function listSubmissions_() {
  var sheet = getSheet_(CONFIG.SUBMISSIONS_SHEET, SUBMISSION_HEADERS);
  var last = sheet.getLastRow();
  if (last < 2) return { ok: true, submissions: [] };
  var start = Math.max(2, last - 499); // newest 500
  var values = sheet.getRange(start, 1, last - start + 1, SUBMISSION_HEADERS.length).getValues();
  var list = values.map(function (r) {
    return { id: String(r[0]), submittedAt: r[1] instanceof Date ? r[1].toISOString() : String(r[1]),
             name: String(r[2]), email: String(r[3]), phone: String(r[4]), message: String(r[5]),
             product: String(r[6]), status: String(r[7] || 'New'), page: String(r[8] || '') };
  }).reverse();
  return { ok: true, submissions: list };
}

function findRowById_(sheet, id) {
  if (!/^[0-9a-f\-]{36}$/i.test(String(id || ''))) throw clientError_('Invalid ID.', 'VALIDATION');
  var last = sheet.getLastRow();
  if (last < 2) return -1;
  var ids = sheet.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === id) return i + 2;
  return -1;
}

function updateSubmissionStatus_(data) {
  if (CONFIG.SUBMISSION_STATUSES.indexOf(data.status) === -1) throw clientError_('Invalid status.', 'VALIDATION');
  return withLock_(function () {
    var sheet = getSheet_(CONFIG.SUBMISSIONS_SHEET, SUBMISSION_HEADERS);
    var row = findRowById_(sheet, data.id);
    if (row < 0) throw clientError_('Submission not found.', 'NOT_FOUND');
    sheet.getRange(row, 8).setValue(data.status);
    return { ok: true };
  });
}

function deleteSubmission_(data) {
  return withLock_(function () {
    var sheet = getSheet_(CONFIG.SUBMISSIONS_SHEET, SUBMISSION_HEADERS);
    var row = findRowById_(sheet, data.id);
    if (row < 0) throw clientError_('Submission not found.', 'NOT_FOUND');
    sheet.deleteRow(row);
    audit_('SUBMISSION_DELETED', data.id);
    return { ok: true };
  });
}

/* ============================ PRODUCTS ============================= */

function readProducts_(includeHidden) {
  var sheet = getSheet_(CONFIG.PRODUCTS_SHEET, PRODUCT_HEADERS);
  var last = sheet.getLastRow();
  if (last < 2) return [];
  var values = sheet.getRange(2, 1, last - 1, PRODUCT_HEADERS.length).getValues();
  return values.filter(function (r) { return r[0]; }).map(function (r) {
    return { id: String(r[0]), name: String(r[1]), category: String(r[2]), description: String(r[3]),
             image: String(r[4]), price: String(r[5]), badge: String(r[6]),
             visible: r[7] === true || String(r[7]).toUpperCase() === 'TRUE', sortOrder: Number(r[8]) || 0 };
  }).filter(function (p) { return includeHidden || p.visible; })
    .sort(function (a, b) { return a.sortOrder - b.sortOrder; });
}

function getPublicProducts_() {
  var cache = CacheService.getScriptCache();
  var hit = cache.get('public_products');
  if (hit) return JSON.parse(hit);
  var list = readProducts_(false);
  try { cache.put('public_products', JSON.stringify(list), 300); } catch (e) { /* >100KB: skip cache */ }
  return list;
}

function validateProduct_(p) {
  p = p || {};
  var errors = [];
  var name = cleanText_(p.name, 80);
  var id = cleanText_(p.id, 60).toLowerCase() || slug_(name);
  var category = cleanText_(p.category, 20).toLowerCase();
  var description = cleanText_(p.description, 500, true);
  var image = cleanText_(p.image, 500);
  var price = cleanText_(p.price, 20);
  var badge = cleanText_(p.badge, 24);
  var sortOrder = Math.max(0, Math.min(9999, parseInt(p.sortOrder, 10) || 0));

  if (!/^[a-z0-9][a-z0-9\-]{0,59}$/.test(id)) errors.push('Invalid product ID.');
  if (name.length < 2) errors.push('Product name is required.');
  if (/[<>]/.test(name + description + badge + price)) errors.push('The characters < and > are not allowed.');
  if (CONFIG.PRODUCT_CATEGORIES.indexOf(category) === -1) errors.push('Invalid category.');
  // Only local asset paths or https images — blocks javascript:, data:, etc.
  if (!/^(assets\/[A-Za-z0-9_\-\/]+\.(jpe?g|png|webp|avif)|https:\/\/[A-Za-z0-9.\-]+\/[^\s"'<>`]*)$/.test(image) || image.indexOf('..') !== -1) {
    errors.push('Image must be a path like assets/images/products/name.jpg or an https:// URL.');
  }
  if (price && !/^[₹$€£A-Za-z0-9 .,\-\/]{1,20}$/.test(price)) errors.push('Invalid price text.');
  return { ok: errors.length === 0, errors: errors, clean: {
    id: id, name: name, category: category, description: description, image: image,
    price: price, badge: badge, visible: p.visible !== false && p.visible !== 'false', sortOrder: sortOrder } };
}

function productRow_(c) {
  return [c.id, safeCell_(c.name), c.category, safeCell_(c.description), safeCell_(c.image),
          safeCell_(c.price), safeCell_(c.badge), c.visible, c.sortOrder, new Date()];
}

function saveProduct_(data) {
  var v = validateProduct_(data.product);
  if (!v.ok) throw clientError_(v.errors.join(' '), 'VALIDATION');
  return withLock_(function () {
    var sheet = getSheet_(CONFIG.PRODUCTS_SHEET, PRODUCT_HEADERS);
    var row = findProductRow_(sheet, v.clean.id);
    if (row > 0) sheet.getRange(row, 1, 1, PRODUCT_HEADERS.length).setValues([productRow_(v.clean)]);
    else sheet.appendRow(productRow_(v.clean));
    CacheService.getScriptCache().remove('public_products');
    audit_(row > 0 ? 'PRODUCT_UPDATED' : 'PRODUCT_CREATED', v.clean.id);
    return { ok: true, product: v.clean };
  });
}

function deleteProduct_(data) {
  var id = cleanText_(data.id, 60);
  if (!/^[a-z0-9][a-z0-9\-]{0,59}$/.test(id)) throw clientError_('Invalid product ID.', 'VALIDATION');
  return withLock_(function () {
    var sheet = getSheet_(CONFIG.PRODUCTS_SHEET, PRODUCT_HEADERS);
    var row = findProductRow_(sheet, id);
    if (row < 0) throw clientError_('Product not found.', 'NOT_FOUND');
    sheet.deleteRow(row);
    CacheService.getScriptCache().remove('public_products');
    audit_('PRODUCT_DELETED', id);
    return { ok: true };
  });
}

/** Imports the default catalogue (sent by admin.html) — skips existing IDs. */
function importProducts_(data) {
  var list = Array.isArray(data.products) ? data.products.slice(0, 100) : [];
  var added = 0, skipped = 0, errors = [];
  withLock_(function () {
    var sheet = getSheet_(CONFIG.PRODUCTS_SHEET, PRODUCT_HEADERS);
    list.forEach(function (p, i) {
      var v = validateProduct_(p);
      if (!v.ok) { errors.push('#' + (i + 1) + ': ' + v.errors[0]); return; }
      if (findProductRow_(sheet, v.clean.id) > 0) { skipped++; return; }
      sheet.appendRow(productRow_(v.clean)); added++;
    });
    CacheService.getScriptCache().remove('public_products');
  });
  audit_('PRODUCTS_IMPORTED', added + ' added');
  return { ok: true, added: added, skipped: skipped, errors: errors };
}

function findProductRow_(sheet, id) {
  var last = sheet.getLastRow();
  if (last < 2) return -1;
  var ids = sheet.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === id) return i + 2;
  return -1;
}

/* ============================ SECURITY HELPERS ===================== */

/** Normalises user text: string only, strips control/zero-width/bidi chars, trims, limits length. */
function cleanText_(value, max, multiline) {
  if (value === null || value === undefined) return '';
  var s = String(value).normalize('NFC');
  s = multiline ? s.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '')
                : s.replace(/[\u0000-\u001F\u007F]/g, ' ');
  s = s.replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, '');
  if (multiline) s = s.replace(/\n{4,}/g, '\n\n\n');
  else s = s.replace(/\s{2,}/g, ' ');
  return s.trim().slice(0, max);
}

/** Prevents spreadsheet formula / CSV injection (=, +, -, @, tab, CR, full-width variants). */
function safeCell_(value) {
  var s = String(value === undefined || value === null ? '' : value);
  return /^[=+\-@\t\r\uFF1D\uFF0B\uFF0D\uFF20]/.test(s) ? "'" + s : s;
}

/** Escapes text before it is placed inside HTML e-mails. */
function escapeHtml_(value) {
  return String(value === undefined || value === null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/`/g, '&#96;');
}

/** Removes CR/LF from e-mail header values (prevents header injection). */
function headerSafe_(value) {
  return String(value).replace(/[\r\n]+/g, ' ').slice(0, 180);
}

function isValidEmail_(email) {
  return typeof email === 'string' && email.length <= 254 &&
    /^[A-Za-z0-9.!#$%&'*+\/=?^_`{|}~\-]+@[A-Za-z0-9](?:[A-Za-z0-9\-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9\-]{0,61}[A-Za-z0-9])?)+$/.test(email) &&
    !/\.\./.test(email);
}

function rateLimit_(key, limit, windowSeconds) {
  var cache = CacheService.getScriptCache();
  var count = Number(cache.get(key) || 0);
  if (count >= limit) return false;
  cache.put(key, String(count + 1), windowSeconds);
  return true;
}

function digestHex_(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s)
    .map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('').slice(0, 32);
}

function slug_(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

/* ============================ INFRASTRUCTURE ======================= */

function parseBody_(e) {
  var raw = e && e.postData && e.postData.contents;
  // Support URL-encoded form data (e.parameter) as well as raw JSON
  if (!raw && e && e.parameter && e.parameter.action) {
    return Object.assign({}, e.parameter);
  }
  if (!raw) throw clientError_('Empty request.', 'BAD_REQUEST');
  if (raw.length > CONFIG.MAX_BODY_BYTES) throw clientError_('Request too large.', 'BAD_REQUEST');
  var data = null;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    // Fallback: parse application/x-www-form-urlencoded body if sent via URLSearchParams
    if (e && e.parameter && e.parameter.action) {
      data = Object.assign({}, e.parameter);
    } else if (raw.indexOf('action=') !== -1) {
      data = {};
      raw.split('&').forEach(function (pair) {
        var idx = pair.indexOf('=');
        if (idx > 0) {
          var k = decodeURIComponent(pair.slice(0, idx).replace(/\+/g, ' '));
          var v = decodeURIComponent(pair.slice(idx + 1).replace(/\+/g, ' '));
          data[k] = v;
        }
      });
    } else {
      throw clientError_('Invalid JSON.', 'BAD_REQUEST');
    }
  }
  if (!data || typeof data !== 'object' || Array.isArray(data) || typeof data.action !== 'string') {
    throw clientError_('Invalid request.', 'BAD_REQUEST');
  }
  return data;
}

function getSpreadsheet_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SPREADSHEET_ID');
  var ss = null;
  if (id) {
    try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; }
  }
  if (!ss) {
    try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch (e2) { ss = null; }
  }
  // Self-healing: if opened as a standalone script at script.google.com without a bound sheet,
  // create the database spreadsheet automatically and store its ID!
  if (!ss && typeof SpreadsheetApp.create === 'function') {
    ss = SpreadsheetApp.create('Blooms Flame Wax Database');
    props.setProperty('SPREADSHEET_ID', ss.getId());
    console.log('Created new Google Sheet automatically: ' + ss.getUrl());
  }
  if (!ss) throw new Error('No spreadsheet found. Open Apps Script from Google Sheets (Extensions → Apps Script).');
  return ss;
}

function getSheet_(name, headers) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getAdminEmail_() {
  var email = PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL');
  if (!isValidEmail_(email || '')) {
    try { email = Session.getEffectiveUser().getEmail() || Session.getActiveUser().getEmail(); } catch (e) {}
  }
  return isValidEmail_(email || '') ? email : '';
}

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try { return fn(); } finally { lock.releaseLock(); }
}

function audit_(event, detail) {
  try {
    getSheet_(CONFIG.AUDIT_SHEET, AUDIT_HEADERS).appendRow([new Date(), event, safeCell_(String(detail || '').slice(0, 200))]);
  } catch (e) { console.error('audit failed: ' + e); }
}

function clientError_(message, code, fields) {
  var err = new Error(message);
  err.isClient = true; err.code = code || 'ERROR'; err.fields = fields || null;
  return err;
}

function fail_(err) {
  if (err && err.isClient) return json_({ ok: false, error: err.message, code: err.code, fields: err.fields });
  console.error(err && err.stack ? err.stack : err);
  return json_({ ok: false, error: 'Server error. Please try again later.', code: 'SERVER' }); // never leak internals
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
