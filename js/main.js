/* =========================================================
   Blooms & Flame Wax — main.js
   Fixed background video · particles · scroll reveal ·
   smooth scrolling · product rendering (home + shop)
   ========================================================= */
(function () {
  "use strict";
  var SEC = window.BFW_SEC;
  var CFG = window.BFW_CONFIG;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------------- 1. Fixed background video ---------------- */
  function initVideo() {
    var wrap = document.querySelector(".bg-video");
    if (!wrap) return;
    var video = wrap.querySelector("video");
    var source = video && video.querySelector("source[data-src]");
    if (!video || !source) return;

    var conn = navigator.connection || {};
    if (reduceMotion.matches || conn.saveData) { wrap.classList.add("is-static"); return; } // fallback image only

    var fallback = function () { wrap.classList.remove("is-playing"); wrap.classList.add("is-static"); };
    var tryPlay = function () {
      if (document.hidden || reduceMotion.matches) return;
      var p = video.play();
      if (p && p.catch) p.catch(function () { /* autoplay blocked → fallback image stays visible */ });
    };

    video.muted = true; // required for autoplay on iOS / Chrome
    video.addEventListener("playing", function () { wrap.classList.add("is-playing"); });
    video.addEventListener("error", fallback);
    source.addEventListener("error", fallback);
    video.addEventListener("canplay", tryPlay, { once: true });

    source.src = source.getAttribute("data-src"); // load once; never re-assigned → no restarts
    video.load();

    // Pause when tab hidden (saves battery) and resume from the same frame.
    document.addEventListener("visibilitychange", function () { if (document.hidden) video.pause(); else tryPlay(); });
    reduceMotion.addEventListener("change", function (e) {
      if (e.matches) { video.pause(); wrap.classList.remove("is-playing"); } else tryPlay();
    });
  }

  /* ---------------- 2. Adaptive Monochrome + Color Side-Wave & Particle Animation ---------------- */
  function initParticles() {
    var canvas = document.querySelector(".particles");
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    var w = 0, h = 0, parts = [], tick = 0, raf = 0, running = false;

    function isLight() {
      return document.documentElement.getAttribute("data-theme") === "light";
    }

    function resize() {
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var target = Math.round(Math.min(64, Math.max(24, w / 22)));
      while (parts.length < target) parts.push(spawn(true));
      parts.length = target;
    }

    function spawn(anywhere) {
      // Cluster 65% of particles along the left & right side columns ("side to show off")
      var sideBias = Math.random() < 0.65;
      var xPos;
      if (sideBias) {
        var sideW = Math.max(90, w * 0.18);
        xPos = Math.random() < 0.5 ? Math.random() * sideW : w - Math.random() * sideW;
      } else {
        xPos = Math.random() * w;
      }
      var kindRoll = Math.random();
      var kind = kindRoll < 0.45 ? "mono" : (kindRoll < 0.8 ? "gold" : "accent");
      return {
        x: xPos,
        y: anywhere ? Math.random() * h : h + 14,
        r: Math.random() * 2.6 + 1.0,
        vy: Math.random() * 0.55 + 0.2,
        vx: (Math.random() - 0.5) * 0.25,
        life: Math.random() * Math.PI * 2,
        kind: kind
      };
    }

    function drawSideRibbon(side, lightMode, t) {
      var baseX = side === "left" ? 36 : w - 36;
      var dir = side === "left" ? 1 : -1;
      ctx.save();
      for (var b = 0; b < 2; b++) {
        ctx.beginPath();
        for (var y = 0; y <= h; y += 24) {
          var wave = Math.sin(y * 0.008 + t * (1.2 + b * 0.4) + (side === "left" ? 0 : 2.1)) * (22 + b * 14);
          var px = baseX + dir * (18 + b * 22 + wave);
          if (y === 0) ctx.moveTo(px, y);
          else ctx.lineTo(px, y);
        }
        if (lightMode) {
          ctx.strokeStyle = b === 0 ? "rgba(25, 18, 22, 0.24)" : "rgba(195, 118, 38, 0.32)";
        } else {
          ctx.strokeStyle = b === 0 ? "rgba(255, 255, 255, 0.24)" : "rgba(240, 194, 123, 0.34)";
        }
        ctx.lineWidth = b === 0 ? 1.6 : 2.2;
        ctx.stroke();
      }
      ctx.restore();
    }

    function frame() {
      ctx.clearRect(0, 0, w, h);
      var light = isLight();

      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.y -= p.vy;
        p.x += p.vx + Math.sin(p.life) * 0.22;
        p.life += 0.028;
        if (p.y < -16) parts[i] = p = spawn(false);

        var a = 0.48 + Math.sin(p.life * 2) * 0.28;
        var rgb;
        if (light) {
          // Light mode: crisp monochrome charcoal/black + rich amber & rose-gold so particles are clearly visible
          rgb = p.kind === "mono" ? "24,18,22" : (p.kind === "gold" ? "188,108,28" : "150,52,84");
        } else {
          // Dark mode: crisp monochrome silver/white + glowing gold & ember
          rgb = p.kind === "mono" ? "255,255,255" : (p.kind === "gold" ? "245,196,115" : "235,125,65");
        }

        var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4.5);
        g.addColorStop(0, "rgba(" + rgb + "," + Math.min(0.95, a + 0.2) + ")");
        g.addColorStop(0.45, "rgba(" + rgb + "," + (a * 0.55) + ")");
        g.addColorStop(1, "rgba(" + rgb + ",0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    }

    function start() { if (!running && !reduceMotion.matches && !document.hidden) { running = true; raf = requestAnimationFrame(frame); } }
    function stop() { running = false; cancelAnimationFrame(raf); }

    var t;
    window.addEventListener("resize", function () { clearTimeout(t); t = setTimeout(resize, 150); }, { passive: true });
    document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else start(); });
    reduceMotion.addEventListener("change", function (e) { if (e.matches) { stop(); ctx.clearRect(0, 0, w, h); } else start(); });
    resize(); start();
  }

  /* ---------------- 3. Scroll reveal ---------------- */
  var revealObserver = null;
  function observeReveal(scope) {
    var items = (scope || document).querySelectorAll("[data-reveal]:not(.is-visible)");
    if (!("IntersectionObserver" in window) || reduceMotion.matches) {
      items.forEach(function (n) { n.classList.add("is-visible"); });
      return;
    }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { entry.target.classList.add("is-visible"); revealObserver.unobserve(entry.target); }
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    }
    items.forEach(function (n) { revealObserver.observe(n); });
  }

  /* ---------------- 4. Smooth scrolling (e.g. Shop Now → showcase) ---------------- */
  function initSmoothScroll() {
    document.addEventListener("click", function (e) {
      var link = e.target.closest('a[href^="#"]');
      if (!link) return;
      var id = link.getAttribute("href").slice(1);
      if (!id) return;
      var target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: reduceMotion.matches ? "auto" : "smooth", block: "start" });
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
      history.replaceState(null, "", "#" + id);
    });
  }

  /* ---------------- 5. Products ---------------- */
  var CATS = window.BFW_CATEGORIES || {};

  function sanitizeProduct(p) {
    if (!p || typeof p !== "object") return null;
    var rawCat = SEC.cleanText(p.category, 40);
    var catSlug = rawCat.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "floral";
    var catLabel = SEC.cleanText(p.categoryLabel, 40) || CATS[catSlug] || rawCat || "Floral Blooms";
    var id = SEC.cleanText(p.id, 60).toLowerCase() || SEC.cleanText(p.name, 60).toLowerCase().replace(/[^a-z0-9]+/g, "-");
    if (!/^[a-z0-9][a-z0-9\-]{0,59}$/.test(id)) return null;
    var fixExt = function (u) {
      return String(u || "").replace(/^(assets\/images\/products\/[a-z0-9\-]+)\.jpe?g$/i, "$1.png");
    };
    var img1 = SEC.safeImageSrc(fixExt(p.image));
    var img2 = p.image2 ? SEC.safeImageSrc(fixExt(p.image2)) : "";
    var img3 = p.image3 ? SEC.safeImageSrc(fixExt(p.image3)) : "";
    if (img2 === SEC.PLACEHOLDER) img2 = "";
    if (img3 === SEC.PLACEHOLDER) img3 = "";
    return {
      id: id,
      category: catSlug,
      categoryLabel: catLabel,
      name: SEC.cleanText(p.name, 80) || "Candle",
      description: SEC.cleanText(p.description, 500),
      image: img1,
      image2: img2,
      image3: img3,
      offer: SEC.cleanText(p.offer, 40),
      price: SEC.cleanText(p.price, 20),
      badge: SEC.cleanText(p.badge, 24),
      featured: !!p.featured,
      visible: p.visible !== false,
      sortOrder: Number(p.sortOrder) || 0
    };
  }

  function localProducts() {
    try {
      var saved = JSON.parse(localStorage.getItem("bfw_admin_products") || "null");
      if (Array.isArray(saved) && saved.length) {
        var cleanSaved = saved.map(sanitizeProduct).filter(function (p) { return p && p.visible; });
        if (cleanSaved.length) return cleanSaved;
      }
    } catch (e) { /* ignore */ }
    return (window.BFW_PRODUCTS || []).map(sanitizeProduct).filter(Boolean);
  }

  /** Loads the catalogue from local studio data (plus any Admin Panel edits) without cross-origin CORS requests. */
  function loadProducts() {
    return Promise.resolve(localProducts());
  }

  function enquiryHref(p) {
    var waNum = (window.BFW_CONFIG && window.BFW_CONFIG.WHATSAPP_NUMBER) || "917871326620";
    var text = "Hello Blooms & Flame Wax! I have a requirement for the candle: " + p.name;
    return "https://wa.me/" + waNum + "?text=" + encodeURIComponent(text);
  }

  /** Builds a product card using safe DOM APIs only (supports 1–3 images + editable offer badge). */
  function productCard(p, index, onQuickView) {
    var el = SEC.el;
    var images = [p.image, p.image2, p.image3].filter(Boolean);
    var img = el("img", { src: images[0], alt: p.name + " — handmade candle", loading: "lazy", decoding: "async", width: "400", height: "500" });
    img.addEventListener("error", function () { if (img.getAttribute("src") !== SEC.PLACEHOLDER) img.setAttribute("src", SEC.PLACEHOLDER); }, { once: true });

    var thumbsBar = null;
    if (images.length > 1) {
      var thumbBtns = images.map(function (src, idx) {
        var btn = el("button", {
          type: "button",
          class: "product-card__thumb" + (idx === 0 ? " is-active" : ""),
          "aria-label": p.name + " view " + (idx + 1),
          onclick: function (ev) {
            ev.stopPropagation();
            img.setAttribute("src", SEC.safeImageSrc(src));
            thumbBtns.forEach(function (b) { b.classList.toggle("is-active", b === btn); });
          }
        }, [el("img", { src: src, alt: "" })]);
        return btn;
      });
      thumbsBar = el("div", { class: "product-card__thumbs" }, thumbBtns);
    }

    var action = onQuickView
      ? el("button", { type: "button", class: "product-card__link", text: "Quick view", "aria-label": "Quick view: " + p.name, onclick: function () { onQuickView(p); } })
      : el("a", { class: "product-card__link", href: enquiryHref(p), target: "_blank", rel: "noopener noreferrer", text: "WhatsApp Chat", "aria-label": "Chat on WhatsApp about " + p.name });

    var card = el("article", { class: "product-card", "data-reveal": "up", "data-category": p.category }, [
      el("div", { class: "product-card__media" }, [
        img,
        p.badge ? el("span", { class: "product-card__badge", text: p.badge }) : null,
        p.offer ? el("span", { class: "product-card__offer", text: p.offer }) : null,
        thumbsBar
      ]),
      el("div", { class: "product-card__body" }, [
        el("span", { class: "product-card__cat", text: p.categoryLabel || CATS[p.category] || p.category }),
        el("h3", { class: "product-card__name", text: p.name }),
        el("p", { class: "product-card__desc", text: p.description }),
        el("div", { class: "product-card__foot" }, [
          el("span", { class: "product-card__price", text: p.price || "Price on request" }),
          action
        ])
      ])
    ]);
    card.style.setProperty("--delay", (Math.min(index, 7) * 0.07) + "s");
    return card;
  }

  /* Home page: featured showcase */
  function initFeatured() {
    var grid = document.getElementById("featured-grid");
    if (!grid) return;
    loadProducts().then(function (list) {
      var featured = list.filter(function (p) { return p.featured; }).slice(0, 8);
      if (!featured.length) featured = list.slice(0, 8);
      grid.replaceChildren.apply(grid, featured.map(function (p, i) { return productCard(p, i); }));
      observeReveal(grid);
    });
  }

  window.BFW = { loadProducts: loadProducts, productCard: productCard, observeReveal: observeReveal, enquiryHref: enquiryHref, sanitizeProduct: sanitizeProduct };

  document.addEventListener("DOMContentLoaded", function () {
    initVideo();
    initParticles();
    initSmoothScroll();
    observeReveal(document);
    initFeatured();
  });
})();
