/* =========================================================
   Blooms & Flame Wax — public configuration & Theme Engine (config.js)
   Single Small Icon Cycle Button: Light -> Auto -> Dark -> Light
   • Light Mode: Crisp alabaster theme + clear background video
   • Auto Mode:  Morning/Day (06:00–17:59) -> Light Mode
                 Night       (18:00–05:59) -> Dark Mode
   • Dark Mode:  Deep plum-obsidian theme + clear background video
   ========================================================= */
(function () {
  "use strict";

  // =========================================================================
  // ★ STEP 1: PASTE YOUR GOOGLE APPS SCRIPT /exec URL RIGHT BELOW ON LINE 14 ★
  // Example: "https://script.google.com/macros/s/AKfycbx.../exec"
  // =========================================================================
  var CONFIG_DATA = {
    APPS_SCRIPT_WEB_APP_URL: "",
    VERSION: "1.1.0",
    WHATSAPP_NUMBER: "917871326620",
    REQUEST_TIMEOUT_MS: 15000,
    PRODUCT_CACHE_MINUTES: 5
  };

  var rootEl = document.documentElement;
  rootEl.classList.add("js");

  var STORAGE_KEY = "bfw_apps_script_url";
  var THEME_KEY = "bfw_theme_mode_v3"; // "light" | "auto" | "dark"
  var ORDER = ["light", "auto", "dark"];

  function getThemeMode() {
    var saved = "";
    try { saved = localStorage.getItem(THEME_KEY) || ""; } catch (e) { saved = ""; }
    return (saved === "light" || saved === "auto" || saved === "dark") ? saved : "auto";
  }

  /** Morning/Day (06:00–17:59) -> Light Mode | Night (18:00–05:59) -> Dark Mode */
  function isDaytimeNow() {
    var hr = new Date().getHours();
    return hr >= 6 && hr < 18;
  }

  function resolveEffectiveTheme(mode) {
    if (mode === "auto") return isDaytimeNow() ? "light" : "dark";
    return mode === "light" ? "light" : "dark";
  }

  var MODE_META = {
    light: {
      label: "Light Mode (Click for Auto Mode)",
      short: "Light",
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M2 12h2.5M19.5 12H22M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg>'
    },
    auto: {
      label: "Auto Mode: Day Light / Night Dark (Click for Dark Mode)",
      short: "Auto",
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3v18"/><path d="M12 7v5l3 2"/></svg>'
    },
    dark: {
      label: "Dark Mode (Click for Light Mode)",
      short: "Dark",
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>'
    }
  };

  function updateThemeButtonsDOM(cleanMode) {
    var meta = MODE_META[cleanMode] || MODE_META.auto;
    // Update single cycle buttons [data-cycle-theme]
    document.querySelectorAll("[data-cycle-theme]").forEach(function (btn) {
      btn.setAttribute("data-mode", cleanMode);
      btn.setAttribute("title", meta.label);
      btn.setAttribute("aria-label", meta.label);
      btn.innerHTML = meta.svg;
    });
    // Also support any legacy [data-set-theme] buttons if present
    document.querySelectorAll("[data-set-theme]").forEach(function (btn) {
      var isCur = btn.getAttribute("data-set-theme") === cleanMode;
      btn.setAttribute("aria-pressed", String(isCur));
      btn.classList.toggle("is-active", isCur);
    });
  }

  function applyTheme(mode) {
    var cleanMode = (mode === "light" || mode === "auto" || mode === "dark") ? mode : getThemeMode();
    var effective = resolveEffectiveTheme(cleanMode);
    rootEl.setAttribute("data-theme-mode", cleanMode);
    rootEl.setAttribute("data-theme", effective);
    try { localStorage.setItem(THEME_KEY, cleanMode); } catch (e) { /* ignore */ }
    updateThemeButtonsDOM(cleanMode);
    window.dispatchEvent(new CustomEvent("bfw:themechange", {
      detail: { mode: cleanMode, theme: effective, isDaytime: isDaytimeNow() }
    }));
    return effective;
  }

  /** Cycles Light -> Auto -> Dark -> Light on each click */
  function cycleThemeMode() {
    var cur = getThemeMode();
    var nextIdx = (ORDER.indexOf(cur) + 1) % ORDER.length;
    var nextMode = ORDER[nextIdx];
    applyTheme(nextMode);
    return nextMode;
  }

  // Apply theme immediately in <head> before body paints
  applyTheme(getThemeMode());
  document.addEventListener("DOMContentLoaded", function () {
    updateThemeButtonsDOM(getThemeMode());
  });

  // Re-check time schedule every 15 seconds and on tab focus so Auto mode switches at 6 AM / 6 PM automatically
  setInterval(function () {
    if (getThemeMode() === "auto") applyTheme("auto");
  }, 15000);
  window.addEventListener("focus", function () {
    if (getThemeMode() === "auto") applyTheme("auto");
  });
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden && getThemeMode() === "auto") applyTheme("auto");
  });

  window.BFW_THEME = {
    getMode: getThemeMode,
    getEffective: function () { return rootEl.getAttribute("data-theme") || "dark"; },
    isDaytime: isDaytimeNow,
    setMode: applyTheme,
    cycleMode: cycleThemeMode,
    getMeta: function (m) { return MODE_META[m || getThemeMode()] || MODE_META.auto; }
  };

  function normalizeAppsScriptUrl(input) {
    var s = String(input || "").trim();
    if (!s || s === "PASTE_YOUR_WEB_APP_URL_HERE") return "";
    if (/^AKfyc[A-Za-z0-9_\-]{20,}$/.test(s)) {
      return "https://script.google.com/macros/s/" + s + "/exec";
    }
    var m = s.match(/^https:\/\/script\.google\.com\/(?:a\/macros\/[^\/]+\/)?macros\/s\/([A-Za-z0-9_\-]+)/);
    if (m && !/\/(?:exec|dev)(?:\?.*)?$/.test(s)) {
      return "https://script.google.com/macros/s/" + m[1] + "/exec";
    }
    return s;
  }

  function resolveActiveUrl() {
    var fromFile = normalizeAppsScriptUrl(CONFIG_DATA.APPS_SCRIPT_WEB_APP_URL);
    if (fromFile) {
      try { localStorage.setItem(STORAGE_KEY, fromFile); } catch (e) { /* ignore */ }
      return fromFile;
    }
    try {
      return normalizeAppsScriptUrl(localStorage.getItem(STORAGE_KEY) || "");
    } catch (e) {
      return "";
    }
  }

  window.BFW_CONFIG = {
    VERSION: CONFIG_DATA.VERSION,
    get APPS_SCRIPT_WEB_APP_URL() { return resolveActiveUrl(); },
    set APPS_SCRIPT_WEB_APP_URL(val) { CONFIG_DATA.APPS_SCRIPT_WEB_APP_URL = val; },
    WHATSAPP_NUMBER: CONFIG_DATA.WHATSAPP_NUMBER,
    REQUEST_TIMEOUT_MS: CONFIG_DATA.REQUEST_TIMEOUT_MS,
    PRODUCT_CACHE_MINUTES: CONFIG_DATA.PRODUCT_CACHE_MINUTES
  };

  window.BFW_SET_API_URL = function (urlOrId) {
    var clean = normalizeAppsScriptUrl(urlOrId);
    CONFIG_DATA.APPS_SCRIPT_WEB_APP_URL = clean;
    try {
      if (clean) localStorage.setItem(STORAGE_KEY, clean);
      else localStorage.removeItem(STORAGE_KEY);
    } catch (e) { /* ignore */ }
    return clean;
  };

  window.BFW_API_READY = function () {
    var url = resolveActiveUrl();
    return /^https:\/\/script\.google\.com\/(?:a\/macros\/[^\/]+\/)?macros\/s\/[A-Za-z0-9_\-]+\/(?:exec|dev)(?:\?.*)?$/.test(url);
  };
})();
