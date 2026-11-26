/* =========================================================
   Blooms & Flame Wax — Admin Panel Controller (admin.js)
   • Task 1: Top-right icon-only theme switcher & "Sign In" button
   • Task 2: Editable Category input + datalist to add new categories
   • Task 3:
     - Only "Admin ID & Password Change" shown (no JWS token inspector UI)
     - Auto-sends Current & Updated Password to Admin Gmail on BOTH
       Password Update and Forgot Password click (verified 1-time flow)
     - "+ New Product" button, editable Offer box, and 1–3 Images per
       product (*Important Image 1 required, Image 2 & 3 optional)
   ========================================================= */
(function () {
  "use strict";
  var SEC = window.BFW_SEC;
  var CFG = window.BFW_CONFIG;
  var CATS = Object.assign({}, window.BFW_CATEGORIES || {});
  var TOKEN_KEY = "bfw_admin_jws";
  var LOCAL_SECRET_KEY = "bfw_local_jws_secret";
  var ADMIN_ID_KEY = "bfw_admin_custom_id";
  var ADMIN_PWD_KEY = "bfw_admin_custom_pwd";
  var PREV_PWD_KEY = "bfw_admin_prev_pwd";
  var REMEMBER_ID_KEY = "bfw_admin_remember_id";
  var ENQUIRIES_KEY = "bfw_enquiries_v1";

  var DEFAULT_ADMIN_IDS = ["srooban1211@gmail.com", "hello@bloomsflamewax.in", "admin"];
  var DEFAULT_ADMIN_PWD = "BloomsAdmin2026!";

  var state = {
    token: sessionStorage.getItem(TOKEN_KEY) || "",
    products: [],
    submissions: []
  };

  function b64urlFromBytes(bytes) {
    var bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function b64urlEncodeString(str) {
    return b64urlFromBytes(new TextEncoder().encode(str));
  }
  function b64urlDecodeString(str) {
    var pad = str.length % 4 ? "====".slice(str.length % 4) : "";
    var b64 = (str + pad).replace(/-/g, "+").replace(/_/g, "/");
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function getLocalSecret() {
    var s = sessionStorage.getItem(LOCAL_SECRET_KEY);
    if (!s) {
      var arr = new Uint8Array(32);
      crypto.getRandomValues(arr);
      s = b64urlFromBytes(arr);
      sessionStorage.setItem(LOCAL_SECRET_KEY, s);
    }
    return s;
  }

  function signLocalJws(claims) {
    var header = b64urlEncodeString(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    var payload = b64urlEncodeString(JSON.stringify(claims));
    var signingInput = header + "." + payload;
    var enc = new TextEncoder();
    return crypto.subtle
      .importKey("raw", enc.encode(getLocalSecret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
      .then(function (key) { return crypto.subtle.sign("HMAC", key, enc.encode(signingInput)); })
      .then(function (sig) { return signingInput + "." + b64urlFromBytes(new Uint8Array(sig)); });
  }

  function decodeJwsClaims(token) {
    if (!token || typeof token !== "string") return null;
    var parts = token.split(".");
    if (parts.length !== 3) return null;
    try {
      var header = JSON.parse(b64urlDecodeString(parts[0]));
      var claims = JSON.parse(b64urlDecodeString(parts[1]));
      if (!header || header.alg !== "HS256" || header.typ !== "JWT") return null;
      if (!claims || typeof claims.exp !== "number" || claims.exp * 1000 <= Date.now()) return null;
      return { header: header, claims: claims };
    } catch (e) {
      return null;
    }
  }

  /**
   * Verified One-Time Hidden <form method="POST" target="iframe"> Transport
   * Same process as contact.html (zero fetch/XHR = zero CORS/CORB).
   */
  function sendViaContactProcess(url, payload, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var frameName = "bfw_gas_frame_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
      var iframe = SEC.el("iframe", {
        name: frameName,
        title: "Form transport",
        "aria-hidden": "true",
        tabindex: "-1"
      });
      iframe.hidden = true;
      document.body.appendChild(iframe);

      var tempForm = SEC.el("form", {
        method: "POST",
        action: url,
        target: frameName,
        enctype: "application/x-www-form-urlencoded",
        "accept-charset": "UTF-8"
      });
      tempForm.hidden = true;

      Object.keys(payload).forEach(function (key) {
        var rawVal = payload[key];
        var val = rawVal === undefined || rawVal === null
          ? ""
          : (typeof rawVal === "object" ? JSON.stringify(rawVal) : String(rawVal));
        tempForm.appendChild(SEC.el("input", { type: "hidden", name: key, value: val }));
      });
      document.body.appendChild(tempForm);

      var settled = false;
      var timer = setTimeout(function () {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error("Timeout"));
      }, timeoutMs || 15000);

      function cleanup() {
        clearTimeout(timer);
        if (tempForm.parentNode) tempForm.parentNode.removeChild(tempForm);
        setTimeout(function () {
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        }, 500);
      }

      iframe.addEventListener("load", function () {
        if (settled) return;
        settled = true;
        cleanup();
        resolve({ ok: true });
      });

      iframe.addEventListener("error", function () {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error("Network error"));
      });

      tempForm.submit();
    });
  }

  function apiPost(payload) {
    payload.token = state.token;
    var url = CFG.APPS_SCRIPT_WEB_APP_URL;
    if (!url) return Promise.resolve({ ok: true });
    return sendViaContactProcess(url, payload, CFG.REQUEST_TIMEOUT_MS);
  }

  function isValidAdminId(inputId) {
    var clean = String(inputId || "").trim().toLowerCase();
    if (!clean) return false;
    var customId = (localStorage.getItem(ADMIN_ID_KEY) || "").trim().toLowerCase();
    if (customId) return clean === customId || DEFAULT_ADMIN_IDS.indexOf(clean) !== -1;
    return DEFAULT_ADMIN_IDS.indexOf(clean) !== -1;
  }

  function getActiveAdminId() {
    return (localStorage.getItem(ADMIN_ID_KEY) || "srooban1211@gmail.com").trim();
  }

  function getActiveAdminPassword() {
    return localStorage.getItem(ADMIN_PWD_KEY) || DEFAULT_ADMIN_PWD;
  }

  function getPreviousAdminPassword() {
    return localStorage.getItem(PREV_PWD_KEY) || DEFAULT_ADMIN_PWD;
  }

  function categoryDisplayLabel(cat) {
    var raw = String(cat || "").trim();
    if (!raw) return "Floral Blooms";
    var low = raw.toLowerCase();
    if (CATS[low]) return CATS[low];
    return raw;
  }

  function normalizeCategorySlug(catInput) {
    var raw = SEC.cleanText(catInput, 40);
    var low = raw.toLowerCase();
    if (CATS[low]) return { slug: low, label: CATS[low] };
    // Check if user selected label like "Floral Blooms"
    var foundKey = Object.keys(CATS).find(function (k) { return CATS[k].toLowerCase() === low; });
    if (foundKey) return { slug: foundKey, label: CATS[foundKey] };
    var slug = low.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "custom";
    CATS[slug] = raw || "Custom";
    return { slug: slug, label: raw || "Custom" };
  }

  /** Converts a chosen local File into a compact PNG data URL so it displays immediately */
  function fileToDataUrl(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var img = new Image();
        img.onload = function () {
          var maxSide = 680;
          var scale = Math.min(1, maxSide / Math.max(img.width || 1, img.height || 1));
          var w = Math.max(1, Math.round(img.width * scale));
          var h = Math.max(1, Math.round(img.height * scale));
          var canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          var ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/png", 0.88));
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var loginView = document.getElementById("login-view");
    var dashView = document.getElementById("dashboard-view");
    var logoutBtn = document.getElementById("logout-btn");
    var loginLogoutBtn = document.getElementById("login-logout-btn");
    var loginForm = document.getElementById("login-form");
    var loginStatus = document.getElementById("login-status");
    var pwdChangeStatus = document.getElementById("pwd-change-status");
    var toastEl = document.getElementById("admin-toast");
    var adminIdInput = document.getElementById("admin-id");
    var adminPwdInput = document.getElementById("admin-password");
    var togglePwdBtn = document.getElementById("toggle-pwd-btn");
    var rememberChk = document.getElementById("remember-admin");
    var forgotPwdBtn = document.getElementById("forgot-pwd-btn");
    var tabForgotPwdBtn = document.getElementById("tab-forgot-pwd-btn");
    var newAdminIdInput = document.getElementById("new-admin-id");
    var newProductBtn = document.getElementById("new-product-btn");
    var categoryDatalist = document.getElementById("category-options");

    // Keep Admin Email input box empty on load (only generic placeholder shown)
    if (adminIdInput) adminIdInput.value = "";
    if (newAdminIdInput) newAdminIdInput.value = "";

    // Show / Hide password toggle
    if (togglePwdBtn && adminPwdInput) {
      togglePwdBtn.addEventListener("click", function () {
        var isPwd = adminPwdInput.type === "password";
        adminPwdInput.type = isPwd ? "text" : "password";
        togglePwdBtn.setAttribute("aria-label", isPwd ? "Hide password" : "Show password");
      });
    }

    function refreshApiStatus() {
      return Boolean(window.BFW_API_READY && window.BFW_API_READY());
    }

    var liveApi = refreshApiStatus();

    function toast(msg) {
      toastEl.textContent = msg;
      toastEl.classList.add("is-visible");
      clearTimeout(toast._t);
      toast._t = setTimeout(function () { toastEl.classList.remove("is-visible"); }, 3600);
    }

    function showBoxStatus(el, type, msg) {
      if (!el) return;
      el.className = "form-status form-status--" + type + " is-visible";
      el.textContent = msg;
    }

    function showStatus(type, msg) {
      showBoxStatus(loginStatus, type, msg);
    }

    function setToken(token) {
      state.token = token || "";
      if (state.token) sessionStorage.setItem(TOKEN_KEY, state.token);
      else sessionStorage.removeItem(TOKEN_KEY);
    }

    function showDashboard() {
      var parsed = decodeJwsClaims(state.token);
      if (!parsed) { showLogin(); return; }
      loginView.hidden = true;
      dashView.hidden = false;
      loadAdminData();
    }

    function showLogin(msg) {
      setToken("");
      dashView.hidden = true;
      loginView.hidden = false;
      if (adminIdInput) adminIdInput.value = "";
      if (adminPwdInput) adminPwdInput.value = "";
      if (msg) showStatus("error", msg);
    }

    /* ---------- Shared One-Time Verified Flow: Auto-Send Current & Updated Password to Admin Gmail ---------- */
    function showForgotUrlSetupBox(targetStatusEl, retryCallback) {
      if (!targetStatusEl) return;
      targetStatusEl.className = "form-status form-status--info is-visible";
      var input = SEC.el("input", {
        type: "url",
        placeholder: "https://script.google.com/macros/s/AKfycb.../exec",
        value: CFG.APPS_SCRIPT_WEB_APP_URL || ""
      });
      var saveBtn = SEC.el("button", {
        type: "button",
        class: "btn btn--primary btn--small",
        text: "Save URL & Send Recovery Email Now",
        onclick: function () {
          var u = (input.value || "").trim();
          if (window.BFW_SET_API_URL) window.BFW_SET_API_URL(u);
          if (!window.BFW_API_READY()) {
            showBoxStatus(targetStatusEl, "error", "Please paste a valid Google Apps Script /exec URL (or Deployment ID starting with AKfycb...).");
            return;
          }
          if (typeof retryCallback === "function") retryCallback();
        }
      });
      var box = SEC.el("div", { class: "form" }, [
        SEC.el("p", { text: "Paste your Google Apps Script /exec URL below once (or on Line 12 of js/config.js):" }),
        SEC.el("div", { class: "field" }, [input]),
        saveBtn
      ]);
      targetStatusEl.replaceChildren(box);
      input.focus();
    }

    function sendCredentialsToAdminGmail(opts) {
      liveApi = refreshApiStatus();
      var targetStatusEl = opts.statusEl || loginStatus;
      var triggerBtn = opts.button || null;

      if (!window.BFW_API_READY()) {
        showForgotUrlSetupBox(targetStatusEl, function () {
          sendCredentialsToAdminGmail(opts);
        });
        return Promise.resolve({ ok: false });
      }

      var adminId = opts.adminId || getActiveAdminId();
      var currentPwd = opts.currentPassword || getPreviousAdminPassword();
      var updatedPwd = opts.updatedPassword || getActiveAdminPassword();
      var eventType = opts.eventType || "Forgot Password Recovery";
      var reqId = "cred_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);

      if (triggerBtn) triggerBtn.disabled = true;
      showBoxStatus(targetStatusEl, "info", "Auto-sending current & updated password details to Admin Gmail…");

      var payload = {
        action: "forgotPassword",
        clientReqId: reqId,
        eventType: eventType,
        adminId: adminId,
        currentPassword: currentPwd,
        updatedPassword: updatedPwd,
        adminPassword: updatedPwd,
        requestedBy: adminId,
        // Compatible with both split Operation 2 and Operation 1 in Code.gs
        name: "BFW Admin — " + eventType,
        phone: "+91 78713 26620",
        email: adminId,
        product: "Admin ID & Password Security",
        message:
          "Event: " + eventType + "\n" +
          "Admin ID / Email: " + adminId + "\n" +
          "Current / Previous Password: " + currentPwd + "\n" +
          "Active / Updated Password: " + updatedPwd + "\n" +
          "Time: " + new Date().toLocaleString(),
        website: "",
        page: "admin-security"
      };

      return sendViaContactProcess(CFG.APPS_SCRIPT_WEB_APP_URL, payload, CFG.REQUEST_TIMEOUT_MS)
        .then(function () {
          showBoxStatus(targetStatusEl, "success", opts.successMessage || "Current & updated password details have been auto-sent to your Admin Gmail!");
          toast("Credentials email sent to Admin Gmail.");
          return { ok: true };
        })
        .catch(function () {
          showBoxStatus(targetStatusEl, "error", "Could not reach Google Apps Script. Please check your connection and try again.");
          return { ok: false };
        })
        .finally(function () {
          if (triggerBtn) triggerBtn.disabled = false;
        });
    }

    /* ---------- Main Sign-In Page ONLY: Forgot Password? Auto-Sends Updated Email ID & Password to Admin Gmail ---------- */
    if (forgotPwdBtn) {
      forgotPwdBtn.addEventListener("click", function () {
        var typedId = SEC.cleanText((adminIdInput && adminIdInput.value) || getActiveAdminId(), 120);
        sendCredentialsToAdminGmail({
          eventType: "Forgot Password Request (Main Sign In Page)",
          adminId: getActiveAdminId(),
          currentPassword: getPreviousAdminPassword(),
          updatedPassword: getActiveAdminPassword(),
          requestedBy: typedId || getActiveAdminId(),
          statusEl: loginStatus,
          button: forgotPwdBtn,
          successMessage: "Your updated Admin Email ID & Password have been auto-sent to your Admin Gmail!"
        });
      });
    }

    /* ---------- Sign In (Admin ID + Password -> JWS HS256 Session) ---------- */
    loginForm.addEventListener("submit", function (e) {
      e.preventDefault();
      liveApi = refreshApiStatus();

      var enteredId = (adminIdInput ? adminIdInput.value : "").trim();
      var pwd = adminPwdInput ? adminPwdInput.value : "";

      if (!isValidAdminId(enteredId)) {
        showStatus("error", "Invalid Admin Email or ID.");
        if (adminIdInput) adminIdInput.focus();
        return;
      }

      var expectedPwd = getActiveAdminPassword();
      if (!pwd || pwd !== expectedPwd) {
        showStatus("error", "Invalid Admin Password. Click 'Forgot Password?' to send it to your Admin Gmail.");
        if (adminPwdInput) adminPwdInput.focus();
        return;
      }

      if (rememberChk && rememberChk.checked) {
        try { localStorage.setItem(REMEMBER_ID_KEY, enteredId); } catch (err) { /* ignore */ }
      } else {
        try { localStorage.removeItem(REMEMBER_ID_KEY); } catch (err2) { /* ignore */ }
      }

      var now = Math.floor(Date.now() / 1000);
      signLocalJws({
        iss: "bfw-apps-script",
        aud: "bfw-admin",
        sub: enteredId.toLowerCase(),
        role: "admin",
        iat: now,
        nbf: now,
        exp: now + 7200,
        ver: 1
      }).then(function (tok) {
        if (adminPwdInput) adminPwdInput.value = "";
        loginStatus.className = "form-status";
        setToken(tok);
        showDashboard();
      });
    });

    logoutBtn.addEventListener("click", function () { showLogin(); toast("Signed out."); });
    if (loginLogoutBtn) {
      loginLogoutBtn.addEventListener("click", function () {
        setToken("");
        if (adminIdInput) adminIdInput.value = "";
        if (adminPwdInput) adminPwdInput.value = "";
        showStatus("info", "Session cleared and logged out.");
        toast("Logged out.");
      });
    }

    /* ---------- Tabs ---------- */
    var tabs = Array.prototype.slice.call(document.querySelectorAll(".admin-tab[data-tab]"));
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        var target = tab.getAttribute("data-tab");
        tabs.forEach(function (t) { t.setAttribute("aria-selected", String(t === tab)); });
        ["products", "submissions", "security"].forEach(function (name) {
          document.getElementById("tab-" + name).classList.toggle("is-active", name === target);
        });
      });
    });

    // Populate studio images datalist
    var datalist = document.getElementById("studio-images");
    (window.BFW_PRODUCTS || []).forEach(function (p) {
      datalist.appendChild(SEC.el("option", { value: p.image }));
    });

    // Wire up Choose File buttons for Image 1, Image 2, and Image 3
    document.querySelectorAll('input[type="file"][data-target-input]').forEach(function (fileInp) {
      fileInp.addEventListener("change", function () {
        var file = fileInp.files && fileInp.files[0];
        if (!file) return;
        var targetId = fileInp.getAttribute("data-target-input");
        var targetInput = document.getElementById(targetId);
        if (!targetInput) return;
        fileToDataUrl(file)
          .then(function (dataUrl) {
            targetInput.value = dataUrl;
            toast("Loaded image: " + file.name);
          })
          .catch(function () {
            toast("Could not read image file.");
          });
      });
    });

    /* ---------- Data loading ---------- */
    function loadLocalProducts() {
      try {
        var saved = JSON.parse(localStorage.getItem("bfw_admin_products") || "null");
        if (Array.isArray(saved) && saved.length) {
          saved.forEach(function (p) {
            if (p && typeof p.image === "string") {
              p.image = p.image.replace(/^(assets\/images\/products\/[a-z0-9\-]+)\.jpe?g$/i, "$1.png");
            }
          });
          return saved;
        }
      } catch (e) { /* ignore */ }
      return (window.BFW_PRODUCTS || []).map(function (p) { return Object.assign({}, p); });
    }
    function saveLocalProducts(list) {
      try { localStorage.setItem("bfw_admin_products", JSON.stringify(list)); } catch (e) { /* ignore */ }
    }

    function syncCategoryDatalist() {
      if (!categoryDatalist) return;
      var labels = {};
      Object.keys(CATS).forEach(function (k) { labels[CATS[k]] = true; });
      state.products.forEach(function (p) {
        var lbl = p.categoryLabel || categoryDisplayLabel(p.category);
        if (lbl) labels[lbl] = true;
      });
      categoryDatalist.replaceChildren.apply(
        categoryDatalist,
        Object.keys(labels).map(function (l) { return SEC.el("option", { value: l }); })
      );
    }

    function loadLocalSubmissions() {
      try {
        var list = JSON.parse(localStorage.getItem(ENQUIRIES_KEY) || "[]");
        return Array.isArray(list) ? list : [];
      } catch (e) {
        return [];
      }
    }

    function saveLocalSubmissions(list) {
      try {
        localStorage.setItem(ENQUIRIES_KEY, JSON.stringify(list));
      } catch (e) { /* ignore */ }
    }

    function loadAdminData() {
      state.products = loadLocalProducts();
      syncCategoryDatalist();
      // Start fresh (0 fake rows — only real WhatsApp & Contact requirement notifications)
      state.submissions = loadLocalSubmissions();
      renderProducts();
      renderSubmissions();
    }

    /* ---------- Render Products (1–3 Images + Editable Offer + Custom Category) ---------- */
    var prodTbody = document.getElementById("products-tbody");
    var prodForm = document.getElementById("product-form");

    function fillProductForm(p) {
      prodForm.id.value = p.id || "";
      prodForm.name.value = p.name || "";
      prodForm.category.value = p.categoryLabel || categoryDisplayLabel(p.category);
      prodForm.badge.value = p.badge || "";
      prodForm.offer.value = p.offer || "";
      prodForm.price.value = p.price || "";
      prodForm.sortOrder.value = p.sortOrder || 100;
      prodForm.image.value = p.image || "";
      prodForm.image2.value = p.image2 || "";
      prodForm.image3.value = p.image3 || "";
      prodForm.description.value = p.description || "";
      prodForm.visible.checked = p.visible !== false;
      document.getElementById("product-form-title").textContent = "Edit Product: " + p.name;
      var cardEl = document.getElementById("product-form-card");
      if (cardEl && cardEl.scrollIntoView) cardEl.scrollIntoView({ behavior: "smooth", block: "start" });
      prodForm.name.focus();
    }

    function resetProductForm() {
      prodForm.reset();
      prodForm.visible.checked = true;
      document.getElementById("product-form-title").textContent = "Add New Product";
    }
    document.getElementById("prod-reset-btn").addEventListener("click", resetProductForm);

    if (newProductBtn) {
      newProductBtn.addEventListener("click", function () {
        resetProductForm();
        var cardEl = document.getElementById("product-form-card");
        if (cardEl && cardEl.scrollIntoView) cardEl.scrollIntoView({ behavior: "smooth", block: "start" });
        prodForm.name.focus();
        toast("Ready to add a new product (Image 1 required, Image 2 & 3 optional).");
      });
    }

    function renderProducts() {
      document.getElementById("stat-products").textContent = String(state.products.length);
      document.getElementById("stat-visible").textContent = String(state.products.filter(function (p) { return p.visible !== false; }).length);

      var rows = state.products.map(function (p) {
        var imgs = [p.image, p.image2, p.image3].filter(Boolean);
        var thumbNodes = imgs.map(function (src, idx) {
          return SEC.el("img", {
            class: "admin-table__thumb",
            src: src,
            alt: p.name + " view " + (idx + 1),
            title: "Image " + (idx + 1)
          });
        });

        return SEC.el("tr", {}, [
          SEC.el("td", {}, [
            SEC.el("div", { class: "admin-thumbs-row" }, thumbNodes),
            SEC.el("div", { class: "privacy-note", text: imgs.length + (imgs.length === 1 ? " image" : " images") })
          ]),
          SEC.el("td", {}, [
            SEC.el("strong", { text: p.name }),
            p.badge ? SEC.el("div", { class: "product-card__cat", text: p.badge }) : null,
            p.offer ? SEC.el("span", { class: "admin-offer-pill", text: p.offer }) : null,
            SEC.el("div", { class: "privacy-note", text: p.price || "Price on request" })
          ]),
          SEC.el("td", { text: p.categoryLabel || categoryDisplayLabel(p.category) }),
          SEC.el("td", { text: p.visible !== false ? "Visible" : "Hidden" }),
          SEC.el("td", {}, [
            SEC.el("div", { class: "panel-actions" }, [
              SEC.el("button", { type: "button", class: "btn btn--ghost btn--small", text: "Edit", onclick: function () { fillProductForm(p); } }),
              SEC.el("button", { type: "button", class: "btn btn--ghost btn--small btn-danger", text: "Delete", onclick: function () { removeProduct(p.id); } })
            ])
          ])
        ]);
      });
      prodTbody.replaceChildren.apply(prodTbody, rows);
    }

    prodForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = SEC.cleanText(prodForm.name.value, 80);
      var rawImg1 = (prodForm.image.value || "").trim();
      if (!name) { toast("Please enter the Candle Name."); prodForm.name.focus(); return; }
      if (!rawImg1) { toast("Image 1 (Main Image) is required (*Important)."); prodForm.image.focus(); return; }

      var catInfo = normalizeCategorySlug(prodForm.category.value);
      var id = SEC.cleanText(prodForm.id.value, 60).toLowerCase() || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      var rawImg2 = (prodForm.image2.value || "").trim();
      var rawImg3 = (prodForm.image3.value || "").trim();

      var product = {
        id: id,
        name: name,
        category: catInfo.slug,
        categoryLabel: catInfo.label,
        badge: SEC.cleanText(prodForm.badge.value, 24),
        offer: SEC.cleanText(prodForm.offer.value, 40),
        price: SEC.cleanText(prodForm.price.value, 20),
        sortOrder: Number(prodForm.sortOrder.value) || 100,
        image: SEC.safeImageSrc(rawImg1),
        image2: rawImg2 ? SEC.safeImageSrc(rawImg2) : "",
        image3: rawImg3 ? SEC.safeImageSrc(rawImg3) : "",
        description: SEC.cleanText(prodForm.description.value, 500, true),
        visible: prodForm.visible.checked
      };
      if (!product.description) { toast("Please enter a description."); prodForm.description.focus(); return; }

      var idx = state.products.findIndex(function (x) { return x.id === product.id; });
      if (idx >= 0) state.products[idx] = product;
      else state.products.push(product);
      saveLocalProducts(state.products);
      syncCategoryDatalist();
      resetProductForm();
      renderProducts();
      if (liveApi) apiPost({ action: "saveProduct", product: product });
      toast("Product saved with " + [product.image, product.image2, product.image3].filter(Boolean).length + " image(s).");
    });

    function removeProduct(id) {
      state.products = state.products.filter(function (p) { return p.id !== id; });
      saveLocalProducts(state.products);
      renderProducts();
      if (liveApi) apiPost({ action: "deleteProduct", id: id });
      toast("Product removed.");
    }

    document.getElementById("seed-products-btn").addEventListener("click", function () {
      var defaults = (window.BFW_PRODUCTS || []).map(function (p) { return Object.assign({}, p); });
      state.products = defaults;
      saveLocalProducts(defaults);
      syncCategoryDatalist();
      renderProducts();
      if (liveApi) apiPost({ action: "importProducts", products: defaults });
      toast("Reset to all 16 studio PNG products.");
    });

    /* ---------- Render Submissions / WhatsApp Requirement Notifications (Click to Read -> Decreases Counter) ---------- */
    var subTbody = document.getElementById("submissions-tbody");
    var tabNotifBadge = document.getElementById("tab-notif-badge");
    var clearSubsBtn = document.getElementById("clear-submissions-btn");

    function isUnreadSubmission(s) {
      return s && (s.unread === true || (s.unread === undefined && s.status === "New"));
    }

    function updateNotificationCountUI() {
      var unreadCount = state.submissions.filter(isUnreadSubmission).length;
      var statEl = document.getElementById("stat-submissions");
      if (statEl) statEl.textContent = String(unreadCount);
      if (tabNotifBadge) {
        tabNotifBadge.textContent = String(unreadCount);
        tabNotifBadge.hidden = unreadCount === 0;
      }
    }

    function markSubmissionAsRead(s) {
      if (!isUnreadSubmission(s)) return;
      s.unread = false;
      if (s.status === "New") s.status = "Read";
      saveLocalSubmissions(state.submissions);
      renderSubmissions();
      toast("Notification marked as read (" + state.submissions.filter(isUnreadSubmission).length + " unread remaining).");
    }

    function renderSubmissions() {
      updateNotificationCountUI();

      if (!state.submissions.length) {
        subTbody.replaceChildren(
          SEC.el("tr", {}, [
            SEC.el("td", {
              colspan: "7",
              text: "No requirement notifications yet. Click any WhatsApp Chat requirement on the website to receive live notifications here."
            })
          ])
        );
        return;
      }

      var rows = state.submissions.map(function (s) {
        var unread = isUnreadSubmission(s);
        var sel = SEC.el("select", { class: "status-select", "aria-label": "Status for " + s.name },
          ["New", "Read", "Replied", "Closed"].map(function (st) {
            return SEC.el("option", { value: st, text: st, selected: s.status === st });
          })
        );
        sel.addEventListener("click", function (ev) { ev.stopPropagation(); });
        sel.addEventListener("change", function () {
          s.status = sel.value;
          s.unread = (sel.value === "New");
          saveLocalSubmissions(state.submissions);
          renderSubmissions();
          if (liveApi) apiPost({ action: "updateSubmissionStatus", id: s.id, status: sel.value });
          toast("Notification status updated to " + sel.value + ".");
        });

        var tr = SEC.el("tr", {
          class: unread ? "is-unread-row" : "is-read-row",
          title: unread ? "Click to mark this notification as read" : "Read notification",
          onclick: function () {
            if (unread) markSubmissionAsRead(s);
          }
        }, [
          SEC.el("td", { text: (s.submittedAt || "").slice(0, 16).replace("T", " ") }),
          SEC.el("td", {}, [
            unread ? SEC.el("span", { class: "unread-dot", "aria-hidden": "true" }) : null,
            SEC.el("strong", { text: s.name })
          ]),
          SEC.el("td", {}, [
            SEC.el("div", { text: s.email }),
            SEC.el("div", { class: "privacy-note", text: s.phone })
          ]),
          SEC.el("td", {}, [SEC.el("strong", { text: s.product || "—" })]),
          SEC.el("td", { text: s.message }),
          SEC.el("td", {}, [sel]),
          SEC.el("td", {}, [
            SEC.el("div", { class: "panel-actions" }, [
              unread
                ? SEC.el("button", {
                    type: "button",
                    class: "btn btn--primary btn--small",
                    text: "Read",
                    onclick: function (ev) {
                      ev.stopPropagation();
                      markSubmissionAsRead(s);
                    }
                  })
                : null,
              SEC.el("button", {
                type: "button",
                class: "btn btn--ghost btn--small btn-danger",
                text: "Delete",
                onclick: function (ev) {
                  ev.stopPropagation();
                  state.submissions = state.submissions.filter(function (x) { return x.id !== s.id; });
                  saveLocalSubmissions(state.submissions);
                  renderSubmissions();
                  toast("Notification removed.");
                }
              })
            ])
          ])
        ]);
        return tr;
      });
      subTbody.replaceChildren.apply(subTbody, rows);
    }

    document.getElementById("refresh-submissions-btn").addEventListener("click", loadAdminData);
    if (clearSubsBtn) {
      clearSubsBtn.addEventListener("click", function () {
        state.submissions = [];
        saveLocalSubmissions([]);
        renderSubmissions();
        toast("All notifications cleared — fresh start.");
      });
    }

    // Live sync across tabs when a visitor clicks a WhatsApp requirement on index.html / shop.html / about.html / contact.html
    window.addEventListener("storage", function (e) {
      if (e.key === ENQUIRIES_KEY) {
        state.submissions = loadLocalSubmissions();
        renderSubmissions();
      }
    });
    window.addEventListener("bfw:notifications-updated", function () {
      state.submissions = loadLocalSubmissions();
      renderSubmissions();
    });

    /* ---------- Safe CSV Exports ---------- */
    function downloadCsv(filename, headers, rows) {
      var lines = [headers.map(SEC.csvCell).join(",")];
      rows.forEach(function (r) { lines.push(r.map(SEC.csvCell).join(",")); });
      var blob = new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var a = SEC.el("a", { href: url, download: filename });
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }

    document.getElementById("export-products-btn").addEventListener("click", function () {
      downloadCsv("bfw-products.csv", ["ID", "Name", "Category", "Badge", "Offer", "Price", "Image1", "Image2", "Image3", "Visible", "Description"],
        state.products.map(function (p) { return [p.id, p.name, p.categoryLabel || p.category, p.badge, p.offer || "", p.price, p.image, p.image2 || "", p.image3 || "", p.visible, p.description]; }));
    });

    document.getElementById("export-submissions-btn").addEventListener("click", function () {
      downloadCsv("bfw-enquiries.csv", ["ID", "SubmittedAt", "Name", "Email", "Phone", "Product", "Status", "Message"],
        state.submissions.map(function (s) { return [s.id, s.submittedAt, s.name, s.email, s.phone, s.product, s.status, s.message]; }));
    });

    /* ---------- Admin ID & Password Change Tab: ONLY Updates Email ID & Password Locally ---------- */
    document.getElementById("password-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var form = e.currentTarget;
      var cur = form.currentPassword.value;
      var nextPwd = form.newPassword.value;
      var nextId = (form.newAdminId ? form.newAdminId.value : "").trim() || getActiveAdminId();
      var activePwd = getActiveAdminPassword();

      if (cur !== activePwd) {
        showBoxStatus(pwdChangeStatus, "error", "Current password is incorrect.");
        return;
      }
      if (!nextId || nextId.length < 3) {
        showBoxStatus(pwdChangeStatus, "error", "Please enter a valid Admin ID / Email.");
        return;
      }
      if (!nextPwd || nextPwd.length < 10) {
        showBoxStatus(pwdChangeStatus, "error", "New password must be at least 10 characters.");
        return;
      }

      // Save previous and new updated Admin Email ID & Password
      localStorage.setItem(PREV_PWD_KEY, activePwd);
      localStorage.setItem(ADMIN_ID_KEY, nextId);
      localStorage.setItem(ADMIN_PWD_KEY, nextPwd);
      localStorage.setItem(REMEMBER_ID_KEY, nextId);
      form.reset();

      showBoxStatus(pwdChangeStatus, "success", "Admin Email ID & Password updated successfully!");
      toast("Admin Email ID & Password updated.");
    });

    if (decodeJwsClaims(state.token)) showDashboard();
  });
})();
