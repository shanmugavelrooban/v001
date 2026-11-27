/* =========================================================
   Blooms & Flame Wax — shared header, theme cycle button,
   regional language switcher & highlighted footer (layout.js)
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
        product: entry.product || "Handmade Requirement",
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

  // Global listener: every click on ANY WhatsApp link or product enquiry button records an unread requirement notification
  document.addEventListener("click", function (e) {
    var waAnchor = e.target.closest('a[href*="wa.me"], a[data-notify-product]');
    if (!waAnchor) return;
    var prodAttr = waAnchor.getAttribute("data-notify-product");
    if (prodAttr) {
      recordRequirementNotification({
        name: "Product Enquiry Click",
        email: "Page: " + (page || "shop"),
        phone: "+" + waNum,
        product: prodAttr,
        message: "Visitor clicked Enquire / Contact for candle: " + prodAttr,
        page: page || "shop"
      });
      return;
    }
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
      reqTitle = (waAnchor.textContent || "").trim() || "WhatsApp Handmade Requirement";
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

  var curMode = (window.BFW_THEME && window.BFW_THEME.getMode()) || "auto";

  var ICON = {
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3.6 9h16.8M3.6 15h16.8M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3a.5.5 0 0 0 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7a2.8 2.8 0 0 0 1.8-1.3 2.3 2.3 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3z"/></svg>'
  };

  var links = [
    { href: "index.html", label: "Home", key: "home", i18n: "nav_home" },
    { href: "shop.html", label: "Shop", key: "shop", i18n: "nav_shop" },
    { href: "about.html", label: "About", key: "about", i18n: "nav_about" },
    { href: "contact.html", label: "Contact", key: "contact", i18n: "nav_contact" }
  ];

  /** Task 3: Single small circular button that cycles Light -> Auto -> Dark on click */
  function singleThemeButtonHtml(mode) {
    var meta = (window.BFW_THEME && window.BFW_THEME.getMeta(mode)) || {
      label: "Change Theme (Light / Auto / Dark)",
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3v18"/><path d="M12 7v5l3 2"/></svg>'
    };
    return '<button type="button" class="theme-cycle-btn" data-cycle-theme data-mode="' + mode + '" aria-label="' + meta.label + '" title="' + meta.label + '">' +
      meta.svg + "</button>";
  }

  /** Task 5: Compact Regional Indian Languages Switcher (EN, தமிழ், हिन्दी, తెలుగు, മലയാളം, ಕನ್ನಡ) */
  function langSwitcherHtml() {
    var curLang = (window.BFW_I18N && window.BFW_I18N.getLang()) || "en";
    var langs = (window.BFW_I18N && window.BFW_I18N.LANGUAGES) || [
      { code: "en", short: "EN", label: "English" },
      { code: "ta", short: "தமிழ்", label: "தமிழ் (Tamil)" },
      { code: "hi", short: "हिन्दी", label: "हिन्दी (Hindi)" },
      { code: "te", short: "తెలుగు", label: "తెలుగు (Telugu)" },
      { code: "ml", short: "മലയാളം", label: "മലയാളം (Malayalam)" },
      { code: "kn", short: "ಕನ್ನಡ", label: "ಕನ್ನಡ (Kannada)" }
    ];
    return '<label class="lang-switch" title="Choose language (English / தமிழ் / हिन्दी / తెలుగు / മലയാളം / ಕನ್ನಡ)">' +
      '<svg class="lang-switch__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3.6 9h16.8M3.6 15h16.8M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>' +
      '<select class="lang-switch__select" data-lang-switcher aria-label="Select regional language">' +
        langs.map(function (l) {
          return '<option value="' + l.code + '"' + (l.code === curLang ? " selected" : "") + ">" + l.short + "</option>";
        }).join("") +
      "</select>" +
    "</label>";
  }

  /* ---------- All-Time Calendar Year Scheduler ---------- */
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
          '<img class="brand__logo" src="assets/images/logo-bfw.png" alt="" width="44" height="44">' +
          '<span class="brand__name">Blooms <span>&amp;</span> Flame Wax</span>' +
        "</a>" +
        '<ul class="nav__links" id="nav-links">' +
          links.map(function (l) {
            return '<li><a class="nav__link" data-i18n="' + l.i18n + '" href="' + l.href + '"' + (l.key === page ? ' aria-current="page"' : "") + ">" + l.label + "</a></li>";
          }).join("") +
        "</ul>" +
        '<div class="nav__controls">' +
          langSwitcherHtml() +
          singleThemeButtonHtml(curMode) +
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

  // Handle single cycle theme button clicks (Light -> Auto -> Dark) and legacy set-theme clicks
  document.addEventListener("click", function (e) {
    var cycleBtn = e.target.closest("[data-cycle-theme]");
    if (cycleBtn && window.BFW_THEME && typeof window.BFW_THEME.cycleMode === "function") {
      window.BFW_THEME.cycleMode();
      return;
    }
    var setBtn = e.target.closest("[data-set-theme]");
    if (setBtn && window.BFW_THEME) {
      window.BFW_THEME.setMode(setBtn.getAttribute("data-set-theme"));
    }
  });

  // Handle regional language switcher changes
  document.addEventListener("change", function (e) {
    var sel = e.target.closest("select[data-lang-switcher]");
    if (sel && window.BFW_I18N) {
      window.BFW_I18N.setLang(sel.value);
    }
  });

  /* ---------- Redesigned Clean Editorial Monochrome Handmade Footer ---------- */
  var footer = document.getElementById("site-footer");
  if (footer) {
    footer.className = "site-footer";
    footer.innerHTML =
      '<div class="footer__top-strip">' +
        '<div class="container footer__top-inner">' +
          '<div class="footer__verified">' +
            ICON.shield +
            '<span data-i18n="footer_trust_badge">Verified Handmade · 317 South Street, Kattangudi, Tamil Nadu — 626101</span>' +
          "</div>" +
          '<div class="footer__top-tags">' +
            '<span class="footer__tag">Est. 1999 · 25+ Years</span>' +
            '<span class="footer__tag">100% Real Handmade Photos</span>' +
            '<span class="footer__tag">Wedding &amp; Festival Bulk Orders</span>' +
          "</div>" +
        "</div>" +
      "</div>" +
      '<div class="container">' +
        '<div class="footer__grid">' +
          '<div class="footer__col footer__col--brand">' +
            '<a class="footer__brand-name" href="index.html">' +
              '<img src="assets/images/logo-bfw.png" alt="" width="44" height="44" loading="lazy">' +
              '<span>Blooms <span class="amp">&amp;</span> Flame Wax</span>' +
            "</a>" +
            '<p class="footer__about">Hand-poured soy &amp; artisanal wax candles with crackling wooden and cotton wicks — poured slowly in small batches at our family handmade workshop in Kattangudi, Virudhunagar District, Tamil Nadu since 1999.</p>' +
          "</div>" +
          '<div class="footer__col">' +
            '<h2 class="footer__title" data-i18n="footer_studio_title">Kattangudi Handmade (Est. 1999)</h2>' +
            '<ul class="footer__list footer__contact">' +
              "<li>" + ICON.pin + "<span>317 South Street, Kattangudi, Aruppukottai Taluk, Virudhunagar District, Tamil Nadu — 626101</span></li>" +
              "<li>" + ICON.phone + '<a href="tel:+917871326620">+91 78713 26620</a></li>' +
              "<li>" + ICON.mail + '<a href="contact.html">bloomsflamewax · Send Enquiry</a></li>' +
              "<li>" + ICON.clock + "<span>Tue–Sat · 10:00 AM – 6:00 PM IST</span></li>" +
            "</ul>" +
            '<div class="footer__cta-row">' +
              '<a class="btn btn--whatsapp btn--small" href="' + waLink("Hello Blooms & Flame Wax! I would like to enquire about your handmade candles.") + '" target="_blank" rel="noopener noreferrer">' + ICON.whatsapp + '<span data-i18n="footer_chat_btn">Chat on WhatsApp</span></a>' +
            "</div>" +
          "</div>" +
          '<div class="footer__col">' +
            '<h2 class="footer__title" data-i18n="footer_help_title">Help Center &amp; Direct Support</h2>' +
            '<ul class="footer__list footer__wa-links">' +
              '<li><a href="' + waLink("Hello Blooms & Flame Wax Help Center! I need help with a requirement:") + '" target="_blank" rel="noopener noreferrer">' + ICON.whatsapp + "<span>Help Center &amp; Product Guidance</span></a></li>" +
              '<li><a href="' + waLink("Hello Blooms & Flame Wax! I have a Custom Candle requirement:") + '" target="_blank" rel="noopener noreferrer">' + ICON.whatsapp + "<span>Custom Colour &amp; Fragrance Orders</span></a></li>" +
              '<li><a href="' + waLink("Hello Blooms & Flame Wax! I have a Wedding / Bulk Gifting requirement:") + '" target="_blank" rel="noopener noreferrer">' + ICON.whatsapp + "<span>Wedding Tamboolam &amp; Event Bulk Gifts</span></a></li>" +
              '<li><a href="' + waLink("Hello Blooms & Flame Wax! I have a question about Policies & FAQ:") + '" target="_blank" rel="noopener noreferrer">' + ICON.whatsapp + "<span>Candle Care &amp; FAQ Support</span></a></li>" +
              '<li><a href="contact.html">' + ICON.mail + "<span>Direct Handmade Contact Form</span></a></li>" +
            "</ul>" +
            '<p class="footer__support">WhatsApp support: 9:00 AM – 9:00 PM IST · Pan-India delivery inquiry available</p>' +
          "</div>" +
        "</div>" +
        '<div class="footer__bottom">' +
          '<span>© <time data-year datetime="' + getCalendarYear() + '">' + getCalendarYear() + '</time> Blooms &amp; Flame Wax — Authentic Handmade Candles in Kattangudi, Tamil Nadu.</span>' +
          '<span>Crafted by <strong>BackMoonDevs</strong> · Made in India<span class="footer__version" title="Website version">v' + (cfg.VERSION || "1.1.0").replace(/[^0-9.]/g, "") + "</span></span>" +
        "</div>" +
      "</div>";
  }

  updateCopyrightYear();
  setInterval(updateCopyrightYear, 1000);
  scheduleNextDayTick();
  window.addEventListener("focus", updateCopyrightYear);
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) updateCopyrightYear();
  });

  applyCustomSiteImages();
  window.addEventListener("storage", function (e) {
    if (e.key === SITE_IMAGES_KEY) applyCustomSiteImages();
  });
  if (window.BFW_I18N && typeof window.BFW_I18N.apply === "function") {
    window.BFW_I18N.apply();
  }
})();
