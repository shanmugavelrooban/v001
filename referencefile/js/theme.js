/**
 * BLOOMS FLAME WAX — Model 3 Light / Dark / Auto Theme Controller
 */
(() => {
  "use strict";

  const STORAGE_KEY = "bfw_theme_preference";
  const VALID_MODES = ["light", "dark", "auto"];
  const systemDarkQuery = window.matchMedia("(prefers-color-scheme: dark)");

  const getSaved = () => {
    const val = window.localStorage.getItem(STORAGE_KEY);
    return VALID_MODES.includes(val) ? val : "auto";
  };

  const applyTheme = (pref) => {
    const safePref = VALID_MODES.includes(pref) ? pref : "auto";
    const resolved =
      safePref === "auto" ? (systemDarkQuery.matches ? "dark" : "light") : safePref;

    document.documentElement.setAttribute("data-theme-pref", safePref);
    document.documentElement.setAttribute("data-theme", resolved);
    document.documentElement.style.colorScheme = resolved;

    document.querySelectorAll("[data-theme-btn]").forEach((btn) => {
      const active = btn.getAttribute("data-theme-btn") === safePref;
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
  };

  applyTheme(getSaved());

  systemDarkQuery.addEventListener("change", () => {
    if (getSaved() === "auto") applyTheme("auto");
  });

  document.addEventListener("DOMContentLoaded", () => {
    applyTheme(getSaved());
    document.querySelectorAll("[data-theme-btn]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const next = btn.getAttribute("data-theme-btn");
        window.localStorage.setItem(STORAGE_KEY, next);
        applyTheme(next);
      });
    });
  });
})();