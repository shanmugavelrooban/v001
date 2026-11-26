/* =========================================================
   Blooms & Flame Wax — public configuration & Theme Engine (config.js)
   ========================================================= */
(function () {
  "use strict";

  // =========================================================================
  // ★ STEP 1: PASTE YOUR GOOGLE APPS SCRIPT /exec URL RIGHT BELOW ON LINE 12 ★
  // Example: "https://script.google.com/macros/s/AKfycbx.../exec"
  // =========================================================================
  var CONFIG_DATA = {
    APPS_SCRIPT_WEB_APP_URL: "https://script.google.com/macros/s/AKfycbw27wj_rQuP4n4WSeb48MjzVCpoZKsYuN56ACGDUdNdijJXACbdq_N3pMMclNq_lIrv/exec",
    VERSION: "1.0.0",
    WHATSAPP_NUMBER: "917871326620",
    REQUEST_TIMEOUT_MS: 15000,
    PRODUCT_CACHE_MINUTES: 5
  };

  var rootEl = document.documentElement;
  rootEl.classList.add("js");

  var STORAGE_KEY = "bfw_apps_script_url";
  var THEME_KEY = "bfw_theme_mode_v2"; // "dark" | "auto" | "light"

  function getThemeMode() {
    var saved = "";
    try { saved = localStorage.getItem(THEME_KEY) || ""; } catch (e) { saved = ""; }
    return (saved === "dark" || saved === "light" || saved === "auto") ? saved : "auto";
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

  function applyTheme(mode) {
    var cleanMode = (mode === "dark" || mode === "light" || mode === "auto") ? mode : getThemeMode();
    var effective = resolveEffectiveTheme(cleanMode);
    rootEl.setAttribute("data-theme-mode", cleanMode);
    rootEl.setAttribute("data-theme", effective);
    try { localStorage.setItem(THEME_KEY, cleanMode); } catch (e) { /* ignore */ }
    document.querySelectorAll("[data-set-theme]").forEach(function (btn) {
      var isCur = btn.getAttribute("data-set-theme") === cleanMode;
      btn.setAttribute("aria-pressed", String(isCur));
      btn.classList.toggle("is-active", isCur);
    });
    window.dispatchEvent(new CustomEvent("bfw:themechange", {
      detail: { mode: cleanMode, theme: effective, isDaytime: isDaytimeNow() }
    }));
    return effective;
  }

  // Apply theme immediately in <head> before body paints
  applyTheme(getThemeMode());

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
    setMode: applyTheme
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
      // Also persist to localStorage so contact.html and admin.html always share it
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
