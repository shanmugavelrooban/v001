/* =========================================================
   Blooms & Flame Wax — shared header, theme switcher & footer (layout.js)
   • Removed SHOP column & Shipping Policy from footer
   • Added Help Center where every requirement opens WhatsApp chat
   • Added Footer Theme Switcher (Dark / Auto / Light) + theme-adaptive footer
   • Added Live Calendar & Year-Wise Auto-Update engine
   ========================================================= */
(function () {
  "use strict";
  var page = document.body.getAttribute("data-page") || "";
  var cfg = window.BFW_CONFIG || {};
  var waNum = cfg.WHATSAPP_NUMBER || "917871326620";
  var ENQUIRIES_KEY = "bfw_enquiries_v1";
  var SITE_IMAGES_KEY = "bfw_site_images_v1";

  function applyCustomSiteImages() {
    var map = {};
    try { map = JSON.parse(localStorage.getItem(SITE_IMAGES_KEY) || "{}") || {}; } catch (e) { map = {}; }
    var SEC = window.BFW_SEC;
    if (map["site-logo"]) {
      var safeLogo = SEC ? SEC.safeImageSrc(map["site-logo"]) : map["site-logo"];
      document.querySelectorAll(".brand__logo, .footer__brand-name img, .auth-box__crest img").forEach(function (img) {
        img.setAttribute("src", safeLogo);
      });
    }
    document.querySelectorAll("[data-site-img]").forEach(function (img) {
      var key = img.getAttribute("data-site-img");
      if (key && map[key]) {
        var safeSrc = SEC ? SEC.safeImageSrc(map[key]) : map[key];
        img.setAttribute("src", safeSrc);
      }
    });
  }

  window.BFW_SITE_IMAGES = {
    KEY: SITE_IMAGES_KEY,
    apply: applyCustomSiteImages
  };

  function waLink(text) {
    return "https://wa.me/" + waNum + "?text=" + encodeURIComponent(text);
  }

  /** Appends a new unread requirement notification to localStorage so admin.html sees it immediately */
  function recordRequirementNotification(entry) {
    try {
      var list = JSON.parse(localStorage.getItem(ENQUIRIES_KEY) || "[]");
      if (!Array.isArray(list)) list = [];
      list.unshift({
        id: "notif_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 7),
        submittedAt: new Date().toISOString(),
        name: entry.name || "WhatsApp Chat Visitor",
        email: entry.email || "WhatsApp Requirement",
        phone: entry.phone || "+" + waNum,
        product: entry.product || "Studio Requirement",
        message: entry.message || "Clicked WhatsApp Chat requirement.",
        status: "New",
        unread: true,
        page: entry.page || page || "website"
      });
      localStorage.setItem(ENQUIRIES_KEY, JSON.stringify(list.slice(0, 300)));
      window.dispatchEvent(new CustomEvent("bfw:notifications-updated"));
    } catch (e) { /* ignore storage errors */ }
  }

  window.BFW_NOTIFY = {
    record: recordRequirementNotification,
    KEY: ENQUIRIES_KEY
  };

  // Global listener: every click on ANY WhatsApp link across the website records an unread requirement notification
  document.addEventListener("click", function (e) {
    var waAnchor = e.target.closest('a[href*="wa.me"]');
    if (!waAnchor) return;
    var href = waAnchor.getAttribute("href") || "";
    var msgText = "";
    try {
      var u = new URL(href);
      msgText = u.searchParams.get("text") || "";
    } catch (err) {
      var idx = href.indexOf("text=");
      if (idx !== -1) {
        try { msgText = decodeURIComponent(href.slice(idx + 5)); } catch (e2) { msgText = href.slice(idx + 5); }
      }
    }

    var reqTitle = "";
    var card = waAnchor.closest(".product-card");
    var modal = waAnchor.closest(".modal");
    var faqCard = waAnchor.closest(".value");
    if (card) {
      var nameEl = card.querySelector(".product-card__name");
      reqTitle = nameEl ? nameEl.textContent.trim() : "Product Requirement";
    } else if (modal) {
      var mName = modal.querySelector("[data-modal-name]");
      reqTitle = mName ? mName.textContent.trim() : "Product Quick-View Requirement";
    } else if (faqCard) {
      var h3 = faqCard.querySelector("h3");
      reqTitle = h3 ? h3.textContent.trim() : "Help Center Requirement";
    } else {
      reqTitle = (waAnchor.textContent || "").trim() || "WhatsApp Studio Requirement";
    }

    recordRequirementNotification({
      name: "WhatsApp Chat",
      email: "Page: " + (page || "home"),
      phone: "+" + waNum,
      product: reqTitle,
      message: msgText || ("Visitor clicked WhatsApp chat for: " + reqTitle),
      page: page || "home"
    });
  });

  var curMode = (window.BFW_THEME && window.BFW_THEME.getMode()) || "dark";

  var ICON = {
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
    auto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3v18"/><path d="M12 7v5l3 2"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M2 12h2.5M19.5 12H22M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3a.5.5 0 0 0 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7a2.8 2.8 0 0 0 1.8-1.3 2.3 2.3 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3z"/></svg>'
  };

  var links = [
    { href: "index.html", label: "Home", key: "home" },
    { href: "shop.html", label: "Shop", key: "shop" },
    { href: "about.html", label: "About", key: "about" },
    { href: "contact.html", label: "Contact", key: "contact" }
  ];

  function themeSwitchHtml(mode, labelText) {
    var modes = [
      { id: "dark", title: "Dark Mode", icon: ICON.moon },
      { id: "auto", title: "Auto Mode (Morning 6 AM–6 PM Light · Night 6 PM–6 AM Dark)", icon: ICON.auto },
      { id: "light", title: "Light Mode", icon: ICON.sun }
    ];
    return '<div class="theme-switch" role="group" aria-label="' + (labelText || "Color theme") + '">' +
      modes.map(function (m) {
        var active = m.id === mode;
        return '<button type="button" class="theme-switch__btn' + (active ? " is-active" : "") + '" data-set-theme="' + m.id + '" aria-pressed="' + active + '" aria-label="' + m.title + '" title="' + m.title + '">' +
          m.icon + "</button>";
      }).join("") +
    "</div>";
  }

  /* ---------- All-Time Calendar Year Scheduler (Auto-Updates Copyright Year Forever) ---------- */
  var yearFormatter = null;
  try {
    yearFormatter = new Intl.DateTimeFormat("en-IN", {
      calendar: "gregory",
      timeZone: "Asia/Kolkata",
      year: "numeric"
    });
  } catch (e) {
    yearFormatter = null;
  }

  function getCalendarYear(dateObj) {
    var d = dateObj || new Date();
    if (yearFormatter) {
      try {
        var y = yearFormatter.format(d).replace(/\D/g, "");
        if (y.length === 4) return y;
      } catch (e) { /* fallback below */ }
    }
    return String(d.getFullYear());
  }

  function updateCopyrightYear() {
    var now = new Date();
    var year = getCalendarYear(now);
    document.querySelectorAll("[data-year]").forEach(function (el) {
      if (el.textContent !== year) el.textContent = year;
      if (el.tagName === "TIME") el.setAttribute("datetime", year);
    });
  }

  function scheduleNextDayTick() {
    var now = new Date();
    var nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
    var msUntilMidnight = Math.max(1000, nextMidnight.getTime() - now.getTime());
    setTimeout(function () {
      updateCopyrightYear();
      scheduleNextDayTick();
    }, msUntilMidnight);
  }

  /* ---------- Header ---------- */
  var header = document.getElementById("site-header");
  if (header) {
    header.className = "site-header";
    header.innerHTML =
      '<nav class="container nav" aria-label="Main">' +
        '<a class="brand" href="index.html" aria-label="Blooms and Flame Wax — home">' +
          '<img class="brand__logo" src="assets/images/logo-bfw.png" alt="" width="46" height="46">' +
          '<span class="brand__name">Blooms <span>&amp;</span> Flame Wax</span>' +
        "</a>" +
        '<ul class="nav__links" id="nav-links">' +
          links.map(function (l) {
            return '<li><a class="nav__link" href="' + l.href + '"' + (l.key === page ? ' aria-current="page"' : "") + ">" + l.label + "</a></li>";
          }).join("") +
        "</ul>" +
        '<div class="nav__controls">' +
          themeSwitchHtml(curMode, "Header color theme") +
          '<button class="nav__toggle" type="button" aria-expanded="false" aria-controls="nav-links" aria-label="Open menu"><span></span></button>' +
        "</div>" +
      "</nav>";

    var toggle = header.querySelector(".nav__toggle");
    var menu = header.querySelector(".nav__links");
    var setOpen = function (open) {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      menu.classList.toggle("is-open", open);
      document.body.classList.toggle("nav-open", open);
    };
    toggle.addEventListener("click", function () { setOpen(toggle.getAttribute("aria-expanded") !== "true"); });
    menu.addEventListener("click", function (e) { if (e.target.closest("a")) setOpen(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setOpen(false); });
    window.matchMedia("(min-width: 861px)").addEventListener("change", function () { setOpen(false); });

    var onScroll = function () { header.classList.toggle("is-scrolled", window.scrollY > 24); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // Also inject theme switcher into Admin header if present
  var adminActions = document.querySelector(".admin-header .panel-actions");
  if (adminActions && !adminActions.querySelector(".theme-switch")) {
    var wrap = document.createElement("div");
    wrap.innerHTML = themeSwitchHtml(curMode, "Admin color theme");
    adminActions.insertBefore(wrap.firstChild, adminActions.firstChild);
  }

  // Delegate clicks on any [data-set-theme] button
  document.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-set-theme]");
    if (!btn || !window.BFW_THEME) return;
    window.BFW_THEME.setMode(btn.getAttribute("data-set-theme"));
  });

  /* ---------- Footer (Theme-adaptive Dark/Auto/Light, No Shop column, Help Center -> WhatsApp) ---------- */
  var footer = document.getElementById("site-footer");
  if (footer) {
    footer.className = "site-footer";
    footer.innerHTML =
      '<div class="container footer__grid">' +
        "<div>" +
          '<p class="footer__brand-name"><img src="assets/images/logo-bfw.png" alt="" width="40" height="40" loading="lazy">Blooms <span class="amp">&amp;</span> Flame Wax</p>' +
          '<p class="footer__about">Hand-poured soy wax candles with crackling wooden wicks — poured slowly in Kattangudi, Tamil Nadu since 1999. A candle should smell like a memory, not a mall.</p>' +
        "</div>" +
        "<div>" +
          '<h2 class="footer__title">Studio</h2>' +
          '<ul class="footer__list footer__contact">' +
            "<li>" + ICON.pin + "<span>317 South Street, Kattangudi, Aruppukottai, Virudhunagar, Tamil Nadu</span></li>" +
            "<li>" + ICON.phone + '<a href="tel:+917871326620">+91 78713 26620</a></li>' +
            "<li>" + ICON.mail + '<a href="contact.html">bloomsflamewax</a></li>' +
            "<li>" + ICON.clock + "<span>Tue–Sat · 10:00–18:00 IST</span></li>" +
          "</ul>" +
          '<a class="btn btn--whatsapp footer__whatsapp" href="' + waLink("Hello Blooms & Flame Wax Studio! I would like to enquire about your candles.") + '" target="_blank" rel="noopener noreferrer">' + ICON.whatsapp + "Chat with Studio</a>" +
        "</div>" +
        "<div>" +
          '<h2 class="footer__title">Help Center (WhatsApp)</h2>' +
          '<ul class="footer__list footer__wa-links">' +
            '<li><a href="' + waLink("Hello Blooms & Flame Wax Help Center! I need help with a requirement:") + '" target="_blank" rel="noopener noreferrer">' + ICON.whatsapp + "<span>Help Center</span></a></li>" +
            '<li><a href="' + waLink("Hello Blooms & Flame Wax! I need Help & Support regarding:") + '" target="_blank" rel="noopener noreferrer">' + ICON.whatsapp + "<span>Help &amp; Support</span></a></li>" +
            '<li><a href="' + waLink("Hello Blooms & Flame Wax! I have a Custom Candle requirement:") + '" target="_blank" rel="noopener noreferrer">' + ICON.whatsapp + "<span>Custom Candle Requirement</span></a></li>" +
            '<li><a href="' + waLink("Hello Blooms & Flame Wax! I have a Wedding / Bulk Gifting requirement:") + '" target="_blank" rel="noopener noreferrer">' + ICON.whatsapp + "<span>Bulk &amp; Event Requirement</span></a></li>" +
            '<li><a href="' + waLink("Hello Blooms & Flame Wax! I have a question about Policies & FAQ:") + '" target="_blank" rel="noopener noreferrer">' + ICON.whatsapp + "<span>Policies &amp; FAQ Chat</span></a></li>" +
            '<li><a href="' + waLink("Hello Blooms & Flame Wax! I would like to contact the studio:") + '" target="_blank" rel="noopener noreferrer">' + ICON.whatsapp + "<span>Contact Us on WhatsApp</span></a></li>" +
          "</ul>" +
          '<p class="footer__support">Every requirement connects directly to Studio WhatsApp (9:00–21:00 IST)</p>' +
        "</div>" +
      "</div>" +
      '<div class="footer__bottom container">' +
        '<span>© <time data-year datetime="' + getCalendarYear() + '">' + getCalendarYear() + '</time> Blooms &amp; Flame Wax — Hand-poured candles. Poured with 🕯️ in Kattangudi, Tamil Nadu.</span>' +
        '<span>Crafted by <strong>BackMoonDevs</strong> · Made in India 🇮🇳<span class="footer__version" title="Website version">v' + (cfg.VERSION || "1.0.0").replace(/[^0-9.]/g, "") + "</span></span>" +
      "</div>";
  }

  // Run all-time calendar year schedule (immediate + every 1s + exact midnight rollover + tab focus)
  updateCopyrightYear();
  setInterval(updateCopyrightYear, 1000);
  scheduleNextDayTick();
  window.addEventListener("focus", updateCopyrightYear);
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) updateCopyrightYear();
  });

  // Apply any custom website images configured in Admin Controls and sync across tabs in real time
  applyCustomSiteImages();
  window.addEventListener("storage", function (e) {
    if (e.key === SITE_IMAGES_KEY) applyCustomSiteImages();
  });
})();
