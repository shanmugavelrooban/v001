/* =========================================================
   Blooms & Flame Wax — contact.js
   Submits to Google Apps Script via a hidden <form method="POST"
   target="bfw_post_frame"> + hidden <iframe>.
   Why: Standard HTML form POSTs into an iframe are navigation
   requests (not fetch/XHR subresources), so Chrome NEVER triggers
   CORS ("Access-Control-Allow-Origin") or CORB warnings.
   ========================================================= */
(function () {
  "use strict";
  var SEC = window.BFW_SEC;
  var CFG = window.BFW_CONFIG;

  var RULES = {
    name: { test: function (v) { return /^[\p{L}\p{M}][\p{L}\p{M} .'\-]{1,79}$/u.test(v); }, msg: "Please enter your name (2–80 characters)." },
    phone: { test: function (v) { return /^\+?[0-9][0-9 ()\-]{6,19}$/.test(v) && v.replace(/\D/g, "").length >= 7; }, msg: "Please enter a valid phone number (e.g. +91 98765 43210)." },
    email: { test: function (v) { return !v || (v.length <= 254 && /^[^\s@<>()]+@[A-Za-z0-9](?:[A-Za-z0-9\-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9\-]{0,61}[A-Za-z0-9])?)+$/.test(v) && v.indexOf("..") === -1); }, msg: "Please enter a valid e-mail address or leave it blank." },
    message: { test: function (v) { return v.length >= 2 && v.length <= 2000 && !/<\s*\/?\s*(script|iframe|object|embed|svg|img|style|link|meta)\b/i.test(v); }, msg: "Please enter your message (no HTML tags)." }
  };

  function makeReqId() {
    return "req_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
  }

  /**
   * Sends payload to Google Apps Script using a hidden <form target="iframe"> POST.
   * Zero fetch/XHR = Zero CORS errors and Zero CORB warnings in Chrome DevTools.
   */
  function sendToAppsScript(url, payload, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var frameName = "bfw_gas_frame_" + Date.now();
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
        var val = payload[key] === undefined || payload[key] === null ? "" : String(payload[key]);
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
        var firstName = String(payload.name || "").split(" ")[0] || "friend";
        resolve({
          ok: true,
          message: "Thank you, " + firstName + "! Your message has been sent."
        });
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

  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("contact-form");
    if (!form) return;
    var status = document.getElementById("form-status");
    var button = form.querySelector('button[type="submit"]');
    var counter = document.getElementById("message-count");
    var loadedAt = Date.now();
    var busy = false;

    // Pre-fill product of interest from ?product=
    var params = new URLSearchParams(location.search);
    var product = SEC.cleanText(params.get("product"), 80);
    if (product && form.product) form.product.value = product;
    if (params.get("topic") === "order" && form.message && !form.message.value) {
      form.message.value = "Hello, I would like an update on my enquiry/order: ";
    }

    function value(name) {
      return SEC.cleanText(form[name].value, name === "message" ? 2000 : 254, name === "message");
    }
    function setError(name, msg) {
      var field = form[name].closest(".field");
      var err = field.querySelector(".field__error");
      field.classList.toggle("is-invalid", !!msg);
      form[name].setAttribute("aria-invalid", msg ? "true" : "false");
      err.textContent = msg || "";
    }
    function validateField(name) {
      var ok = RULES[name].test(value(name));
      setError(name, ok ? "" : RULES[name].msg);
      return ok;
    }
    function showStatus(type, text) {
      status.className = "form-status form-status--" + type + " is-visible";
      status.replaceChildren(document.createTextNode(text));
    }
    function setBusy(on) {
      busy = on;
      button.disabled = on;
      button.classList.toggle("is-loading", on);
      button.querySelector("[data-label]").textContent = on ? "Sending…" : "Message Email";
    }

    /** If js/config.js has an empty APPS_SCRIPT_WEB_APP_URL, let the user paste it directly once */
    function showUrlSetupBox() {
      status.className = "form-status form-status--info is-visible";
      var input = SEC.el("input", {
        type: "url",
        placeholder: "https://script.google.com/macros/s/.../exec or AKfycb...",
        value: CFG.APPS_SCRIPT_WEB_APP_URL || ""
      });
      var saveBtn = SEC.el("button", {
        type: "button",
        class: "btn btn--primary btn--small",
        text: "Save & Send Now",
        onclick: function () {
          var u = (input.value || "").trim();
          window.BFW_SET_API_URL(u);
          if (!window.BFW_API_READY()) {
            showStatus("error", "Please paste a valid Google Apps Script Web App URL (/exec) or Deployment ID (AKfycb...).");
            return;
          }
          form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event("submit", { cancelable: true }));
        }
      });
      var box = SEC.el("div", { class: "form" }, [
        SEC.el("p", { text: "Paste your Google Apps Script Web App URL (/exec) or Deployment ID below once (or in js/config.js line 21):" }),
        SEC.el("div", { class: "field" }, [input]),
        saveBtn
      ]);
      status.replaceChildren(box);
    }

    Object.keys(RULES).forEach(function (name) {
      form[name].addEventListener("blur", function () { if (form[name].value) validateField(name); });
      form[name].addEventListener("input", function () { if (form[name].closest(".field").classList.contains("is-invalid")) validateField(name); });
    });
    if (counter) form.message.addEventListener("input", function () { counter.textContent = form.message.value.length + " / 2000"; });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (busy) return;

      var names = Object.keys(RULES);
      var results = names.map(validateField);
      var firstBad = names[results.indexOf(false)];
      if (firstBad) { form[firstBad].focus(); showStatus("error", "Please correct the highlighted fields."); return; }

      if (!window.BFW_API_READY()) {
        showUrlSetupBox();
        return;
      }

      var payload = {
        action: "contact",
        clientReqId: makeReqId(),
        name: value("name"),
        email: value("email").toLowerCase(),
        phone: value("phone"),
        message: value("message"),
        product: SEC.cleanText(form.product.value, 80),
        website: form.website.value,
        elapsedMs: Date.now() - loadedAt,
        page: "contact"
      };

      setBusy(true);
      showStatus("info", "Sending your message…");

      sendToAppsScript(CFG.APPS_SCRIPT_WEB_APP_URL, payload, CFG.REQUEST_TIMEOUT_MS)
        .then(function (data) {
          if (data && data.ok) {
            if (window.BFW_NOTIFY && typeof window.BFW_NOTIFY.record === "function") {
              window.BFW_NOTIFY.record({
                name: payload.name,
                email: payload.email || "Not provided",
                phone: payload.phone,
                product: payload.product || "Contact Message",
                message: payload.message,
                page: "contact"
              });
            }
            form.reset();
            if (counter) counter.textContent = "0 / 2000";
            loadedAt = Date.now();
            showStatus("success", SEC.cleanText(data.message, 200) || "Thank you! Your message has been sent.");
          } else {
            showStatus("error", SEC.cleanText(data && data.error, 300) || "Sorry, something went wrong. Please try again.");
          }
        })
        .catch(function () {
          showStatus("error", "The request timed out. Please check your internet connection and try again.");
        })
        .finally(function () { setBusy(false); });
    });
  });
})();
