/* =========================================================
   Blooms & Flame Wax — shop.js (filters, search, quick view)
   ========================================================= */
(function () {
  "use strict";
  var SEC = window.BFW_SEC;
  var CATS = window.BFW_CATEGORIES || {};

  document.addEventListener("DOMContentLoaded", function () {
    var grid = document.getElementById("showcase-grid");
    if (!grid) return;
    var chips = Array.prototype.slice.call(document.querySelectorAll(".chip[data-filter]"));
    var search = document.getElementById("product-search");
    var count = document.getElementById("result-count");
    var modal = document.getElementById("product-modal");
    var all = [];

    var params = new URLSearchParams(location.search);
    var state = { cat: CATS[params.get("cat")] ? params.get("cat") : "all", q: "" };

    function openModal(p) {
      if (!modal) return;
      var images = [p.image, p.image2, p.image3].filter(Boolean);
      var img = modal.querySelector("[data-modal-img]");
      img.setAttribute("src", SEC.safeImageSrc(images[0]));
      img.setAttribute("alt", p.name);
      modal.querySelector("[data-modal-cat]").textContent = p.categoryLabel || CATS[p.category] || p.category || "";
      modal.querySelector("[data-modal-name]").textContent = p.name;
      modal.querySelector("[data-modal-desc]").textContent = p.description;
      modal.querySelector("[data-modal-price]").textContent = (p.offer ? p.offer + " · " : "") + (p.price || "Price on request");
      modal.querySelector("[data-modal-enquire]").setAttribute("href", window.BFW.enquiryHref(p));

      var mediaBox = modal.querySelector(".modal__media");
      var oldThumbs = mediaBox.querySelector(".product-card__thumbs");
      if (oldThumbs) oldThumbs.remove();
      if (images.length > 1) {
        var btns = images.map(function (src, idx) {
          var b = SEC.el("button", {
            type: "button",
            class: "product-card__thumb" + (idx === 0 ? " is-active" : ""),
            "aria-label": "View " + (idx + 1),
            onclick: function () {
              img.setAttribute("src", SEC.safeImageSrc(src));
              btns.forEach(function (x) { x.classList.toggle("is-active", x === b); });
            }
          }, [SEC.el("img", { src: src, alt: "" })]);
          return b;
        });
        mediaBox.appendChild(SEC.el("div", { class: "product-card__thumbs" }, btns));
      }
      if (typeof modal.showModal === "function") modal.showModal(); else location.href = window.BFW.enquiryHref(p);
    }
    if (modal) {
      modal.querySelector(".modal__close").addEventListener("click", function () { modal.close(); });
      modal.addEventListener("click", function (e) { if (e.target === modal) modal.close(); });
    }

    function render() {
      var q = state.q.toLowerCase();
      var list = all.filter(function (p) {
        return (state.cat === "all" || p.category === state.cat) &&
               (!q || (p.name + " " + p.description + " " + (CATS[p.category] || "")).toLowerCase().indexOf(q) !== -1);
      });
      chips.forEach(function (c) { c.setAttribute("aria-pressed", String(c.getAttribute("data-filter") === state.cat)); });
      if (!list.length) {
        grid.replaceChildren(SEC.el("p", { class: "empty-state", text: "No candles match your search. Try another word or category." }));
      } else {
        grid.replaceChildren.apply(grid, list.map(function (p, i) { return window.BFW.productCard(p, i, openModal); }));
      }
      if (count) count.textContent = list.length + (list.length === 1 ? " candle" : " candles");
      window.BFW.observeReveal(grid);
    }

    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        state.cat = chip.getAttribute("data-filter");
        var url = new URL(location.href);
        if (state.cat === "all") url.searchParams.delete("cat"); else url.searchParams.set("cat", state.cat);
        history.replaceState(null, "", url.pathname + url.search + url.hash);
        render();
      });
    });
    var t;
    if (search) search.addEventListener("input", function () {
      clearTimeout(t);
      t = setTimeout(function () { state.q = SEC.cleanText(search.value, 60); render(); }, 120);
    });

    window.BFW.loadProducts().then(function (list) {
      all = list;
      // Dynamically add filter chips for any new custom categories added in Admin Panel
      var chipsWrap = document.querySelector(".chips");
      if (chipsWrap) {
        var existing = {};
        chips.forEach(function (c) { existing[c.getAttribute("data-filter")] = true; });
        all.forEach(function (p) {
          if (p.category && !existing[p.category]) {
            existing[p.category] = true;
            var newChip = SEC.el("button", {
              class: "chip",
              type: "button",
              "data-filter": p.category,
              "aria-pressed": "false",
              text: p.categoryLabel || p.category,
              onclick: function () {
                state.cat = p.category;
                render();
              }
            });
            chipsWrap.appendChild(newChip);
            chips.push(newChip);
          }
        });
      }
      render();
    });
  });
})();
