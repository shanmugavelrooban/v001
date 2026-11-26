/**
 * BLOOMS FLAME WAX — Model 3 Perfume-Split Showcase Renderer
 */
(() => {
  "use strict";

  const data = window.BFW_DATA;
  if (!data) return;

  const esc = (s) =>
    String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const cardHtml = (item, i = 0) => `
    <article class="candle-card reveal is-visible" data-perfume="${esc(item.perfumeId)}" data-delay="${(i % 3) + 1}">
      <div class="candle-card__media">
        <span class="candle-card__badge">${esc(item.perfumeBadge)}</span>
        <img src="${esc(item.image)}" alt="${esc(item.name)} candle" loading="lazy" />
      </div>
      <div class="candle-card__body">
        <span class="candle-card__meta">${esc(item.vessel)}</span>
        <h3 class="candle-card__title">${esc(item.name)}</h3>
        <p class="candle-card__notes">${esc(item.summary)}</p>
        <div class="candle-card__footer">
          <span class="candle-card__burn">${esc(item.burnTime)}</span>
          <button type="button" class="candle-card__link" data-product-id="${esc(item.id)}">
            Perfume Notes &rarr;
          </button>
        </div>
      </div>
    </article>
  `;

  const homeGrid = document.getElementById("homeFeaturedGrid");
  if (homeGrid) {
    homeGrid.innerHTML = data.products
      .filter((p) => p.featured)
      .slice(0, 3)
      .map((item, i) => cardHtml(item, i))
      .join("");
  }

  const homePerfumes = document.getElementById("homePerfumeFamilies");
  if (homePerfumes) {
    homePerfumes.innerHTML = data.perfumeFamilies
      .map(
        (fam) => `
        <a href="shop.html#perfume-${esc(fam.id)}" class="glass-panel feature-card perfume-family-link">
          <span class="eyebrow">${esc(fam.label)}</span>
          <h3 class="feature-card__title">${esc(fam.title)}</h3>
          <p class="feature-card__text">${esc(fam.description)}</p>
          <span class="candle-card__link" style="margin-top:auto;">Explore Perfume Group &rarr;</span>
        </a>`
      )
      .join("");
  }

  const filterBar = document.getElementById("perfumeFilterBar");
  const splitContainer = document.getElementById("perfumeSplitShowcase");

  if (filterBar && splitContainer) {
    filterBar.innerHTML = [
      `<button type="button" class="filter-pill is-active" data-perfume-filter="all">All Perfumes (${data.products.length})</button>`,
      ...data.perfumeFamilies.map((fam) => {
        const count = data.products.filter((p) => p.perfumeId === fam.id).length;
        return `<button type="button" class="filter-pill" data-perfume-filter="${esc(fam.id)}">${esc(fam.label)} (${count})</button>`;
      }),
    ].join("");

    splitContainer.innerHTML = data.perfumeFamilies
      .map((fam) => {
        const items = data.products.filter((p) => p.perfumeId === fam.id);
        if (!items.length) return "";
        return `
          <section class="perfume-group" id="perfume-${esc(fam.id)}" data-perfume-section="${esc(fam.id)}">
            <div class="perfume-group__header glass-panel">
              <div>
                <span class="eyebrow">${esc(fam.eyebrow)}</span>
                <h2 class="section-title perfume-group__title">${esc(fam.title)}</h2>
                <p class="section-lead">${esc(fam.description)}</p>
              </div>
              <span class="perfume-group__count">${items.length} ${items.length === 1 ? "Edition" : "Editions"}</span>
            </div>
            <div class="product-grid">${items.map((it, idx) => cardHtml(it, idx)).join("")}</div>
          </section>`;
      })
      .join("");

    const applyFilter = (id) => {
      filterBar.querySelectorAll(".filter-pill").forEach((b) => {
        b.classList.toggle("is-active", b.dataset.perfumeFilter === id);
      });
      splitContainer.querySelectorAll("[data-perfume-section]").forEach((sec) => {
        sec.hidden = !(id === "all" || sec.dataset.perfumeSection === id);
      });
    };

    filterBar.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-perfume-filter]");
      if (btn) applyFilter(btn.dataset.perfumeFilter);
    });

    if (window.location.hash.startsWith("#perfume-")) {
      const target = window.location.hash.replace("#perfume-", "");
      if (data.perfumeFamilies.some((f) => f.id === target)) applyFilter(target);
    }
  }

  const modal = document.getElementById("scentModal");
  if (modal) {
    const closeBtn = document.getElementById("modalClose");
    const closeModal = () => {
      modal.classList.remove("is-open");
      window.setTimeout(() => {
        modal.hidden = true;
      }, 220);
    };

    document.addEventListener("click", (e) => {
      const trigger = e.target.closest("[data-product-id]");
      if (trigger) {
        const item = data.products.find((p) => p.id === trigger.dataset.productId);
        if (!item) return;
        document.getElementById("modalImg").src = item.image;
        document.getElementById("modalImg").alt = item.name;
        document.getElementById("modalCategory").textContent = item.perfumeBadge;
        document.getElementById("modalTitle").textContent = item.name;
        document.getElementById("modalDesc").textContent = item.summary;
        document.getElementById("modalTop").textContent = item.notes.top;
        document.getElementById("modalHeart").textContent = item.notes.heart;
        document.getElementById("modalBase").textContent = item.notes.base;
        document.getElementById("modalBurn").textContent = `${item.burnTime} · ${item.vessel}`;
        document.getElementById("modalInquireLink").href = `contact.html?scent=${encodeURIComponent(item.name)}`;
        modal.hidden = false;
        requestAnimationFrame(() => modal.classList.add("is-open"));
        closeBtn.focus();
      } else if (e.target === modal) {
        closeModal();
      }
    });

    closeBtn.addEventListener("click", closeModal);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !modal.hidden) closeModal();
    });
  }
})();