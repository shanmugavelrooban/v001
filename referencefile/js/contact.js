/**
 * BLOOMS FLAME WAX — Model 3 Contact Validation & Apps Script Submission
 */
(() => {
  "use strict";

  // Paste your deployed Google Apps Script Web App (/exec) URL here:
  const APPS_SCRIPT_WEB_APP_URL = "PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE";

  const form = document.getElementById("contactForm");
  if (!form) return;

  const fields = {
    name: document.getElementById("visitorName"),
    email: document.getElementById("visitorEmail"),
    phone: document.getElementById("visitorPhone"),
    message: document.getElementById("visitorMessage"),
    honeypot: document.getElementById("websiteUrl"),
  };

  const errors = {
    name: document.getElementById("nameError"),
    email: document.getElementById("emailError"),
    phone: document.getElementById("phoneError"),
    message: document.getElementById("messageError"),
  };

  const submitBtn = document.getElementById("submitBtn");
  const submitBtnText = document.getElementById("submitBtnText");
  const statusBanner = document.getElementById("formStatus");

  const params = new URLSearchParams(window.location.search);
  const scent = params.get("scent");
  if (scent && fields.message && !fields.message.value.trim()) {
    fields.message.value = `Hello Blooms Flame Wax, I would like to inquire about the "${scent.replace(/[<>]/g, "").slice(0, 80)}" candle edition.`;
  }

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const PHONE_RE = /^[+\d][\d\s().-]{6,24}$/;

  const setErr = (k, msg) => {
    errors[k].textContent = msg;
    fields[k].setAttribute("aria-invalid", msg ? "true" : "false");
  };

  const showStatus = (type, msg) => {
    statusBanner.className = `form-status is-visible form-status--${type}`;
    statusBanner.textContent = msg;
  };

  const validate = () => {
    let ok = true;
    const n = fields.name.value.trim();
    const em = fields.email.value.trim();
    const ph = fields.phone.value.trim();
    const m = fields.message.value.trim();

    if (n.length < 2 || n.length > 100) {
      setErr("name", "Please enter your name (2–100 characters).");
      ok = false;
    } else setErr("name", "");

    if (!EMAIL_RE.test(em)) {
      setErr("email", "Please enter a valid email address.");
      ok = false;
    } else setErr("email", "");

    if (ph && !PHONE_RE.test(ph)) {
      setErr("phone", "Please enter a valid phone number or leave blank.");
      ok = false;
    } else setErr("phone", "");

    if (m.length < 10 || m.length > 2000) {
      setErr("message", "Please enter a message between 10 and 2,000 characters.");
      ok = false;
    } else setErr("message", "");

    return ok;
  };

  ["name", "email", "phone", "message"].forEach((k) => {
    fields[k].addEventListener("input", () => {
      if (errors[k].textContent) setErr(k, "");
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    statusBanner.className = "form-status";
    statusBanner.textContent = "";

    if (!validate()) {
      showStatus("error", "Please fix the highlighted fields above.");
      return;
    }

    if (!APPS_SCRIPT_WEB_APP_URL || APPS_SCRIPT_WEB_APP_URL.includes("PASTE_YOUR_GOOGLE_APPS_SCRIPT")) {
      showStatus(
        "error",
        "Apps Script endpoint not linked yet — paste your deployed /exec URL into APPS_SCRIPT_WEB_APP_URL inside js/contact.js."
      );
      return;
    }

    submitBtn.disabled = true;
    submitBtnText.textContent = "Sending Inquiry...";

    try {
      const res = await fetch(APPS_SCRIPT_WEB_APP_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({
          name: fields.name.value.trim(),
          email: fields.email.value.trim(),
          phone: fields.phone.value.trim(),
          message: fields.message.value.trim(),
          websiteUrl: fields.honeypot.value.trim(),
        }),
        redirect: "follow",
      });

      const json = await res.json();
      if (json.status === "success") {
        form.reset();
        showStatus("success", json.message || "Thank you! Your inquiry has been saved and our studio notified.");
      } else {
        showStatus("error", json.message || "Submission could not be completed. Please try again.");
      }
    } catch (err) {
      showStatus("error", "Network error while sending inquiry. Please check your connection and retry.");
    } finally {
      submitBtn.disabled = false;
      submitBtnText.textContent = "Send Inquiry";
    }
  });
})();