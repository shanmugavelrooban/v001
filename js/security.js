/* =========================================================
   Blooms & Flame Wax — client-side security helpers (security.js)
   • Never render untrusted data with innerHTML — use el()/textContent.
   • safeImageSrc / safeUrl block javascript:, data:, vbscript: URLs.
   • csvCell neutralises spreadsheet formula injection in exports.
   Works in the browser and in Node (for automated tests).
   ========================================================= */
(function (root) {
  "use strict";
  var ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;", "`": "&#96;" };
  var PLACEHOLDER = "assets/images/products/placeholder.svg";
  var LOCAL_IMG = /^assets\/[A-Za-z0-9_\-\/]+\.(jpe?g|png|webp|avif|svg)$/i;

  function escapeHtml(value) {
    return String(value === null || value === undefined ? "" : value).replace(/[&<>"'`]/g, function (c) { return ESC[c]; });
  }

  function cleanText(value, max, multiline) {
    if (value === null || value === undefined) return "";
    var s = String(value);
    s = multiline ? s.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, "")
                  : s.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s{2,}/g, " ");
    s = s.replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, "");
    return s.trim().slice(0, max || 500);
  }

  function safeUrl(value) {
    var s = String(value || "").trim();
    var probe = s.replace(/[\s\u0000-\u001F]/g, "").toLowerCase();
    if (/^(javascript|data|vbscript|file):/.test(probe)) return "#";
    return s;
  }

  function safeImageSrc(value) {
    var s = String(value || "").trim();
    if (LOCAL_IMG.test(s) && s.indexOf("..") === -1) return s;
    if (/^https:\/\/[A-Za-z0-9.\-]+\/[^\s"'<>`]*$/.test(s)) return s;
    if (/^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+\/=]+$/i.test(s)) return s;
    return PLACEHOLDER;
  }

  function csvCell(value) {
    var s = String(value === null || value === undefined ? "" : value);
    if (/^[=+\-@\t\r\uFF1D\uFF0B\uFF0D\uFF20]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  }

  /** Safe DOM builder: el('a', {href:'x', text:'Hi', class:'btn'}, [children]) */
  function el(tag, props, children) {
    var node = document.createElement(tag);
    props = props || {};
    Object.keys(props).forEach(function (key) {
      var v = props[key];
      if (v === null || v === undefined || v === false) return;
      if (key === "text") node.textContent = String(v);
      else if (key === "class") node.className = v;
      else if (key === "dataset") Object.keys(v).forEach(function (d) { node.dataset[d] = String(v[d]); });
      else if (key.indexOf("on") === 0 && typeof v === "function") node.addEventListener(key.slice(2), v);
      else if (key === "src") node.setAttribute("src", safeImageSrc(v));
      else if (key === "href") node.setAttribute("href", safeUrl(v));
      else if (key === "style" || key === "innerHTML") throw new Error("el(): '" + key + "' is not allowed");
      else node.setAttribute(key, v === true ? "" : String(v));
    });
    (children || []).forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      node.appendChild(typeof c === "object" && c.nodeType ? c : document.createTextNode(String(c)));
    });
    return node;
  }

  var api = { escapeHtml: escapeHtml, cleanText: cleanText, safeUrl: safeUrl, safeImageSrc: safeImageSrc, csvCell: csvCell, el: el, PLACEHOLDER: PLACEHOLDER };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.BFW_SEC = Object.freeze(api);
})(typeof window !== "undefined" ? window : this);
