/**
 * BLOOMS FLAME WAX — Model 3 Fixed Background Video, Embers & UI Controller
 */
(() => {
  "use strict";

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  const yearEl = document.getElementById("currentYear");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  const header = document.getElementById("siteHeader");
  if (header) {
    const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  const navToggle = document.getElementById("navToggle");
  const navLinks = document.getElementById("navLinks");
  if (navToggle && navLinks) {
    const closeNav = () => {
      navLinks.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    };
    navToggle.addEventListener("click", () => {
      const open = navLinks.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(open));
    });
    navLinks.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeNav));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeNav();
    });
  }

  document.querySelectorAll('a[data-smooth-scroll], a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (e) => {
      const id = anchor.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: reduced.matches ? "auto" : "smooth", block: "start" });
    });
  });

  const bgVideo = document.getElementById("bgCandleVideo");
  const soundToggle = document.getElementById("soundToggle");

  if (bgVideo) {
    const fallback = () => {
      bgVideo.pause();
      bgVideo.classList.remove("is-ready");
    };
    const playSafe = () => {
      if (reduced.matches) return fallback();
      const p = bgVideo.play();
      if (p && typeof p.catch === "function") p.catch(fallback);
    };

    bgVideo.addEventListener("canplay", () => {
      if (!reduced.matches) {
        bgVideo.classList.add("is-ready");
        playSafe();
      }
    });
    bgVideo.addEventListener("error", fallback);

    document.addEventListener("visibilitychange", () => {
      if (reduced.matches) return;
      if (document.hidden) bgVideo.pause();
      else if (bgVideo.classList.contains("is-ready")) playSafe();
    });

    if (bgVideo.readyState >= 2 && !reduced.matches) {
      bgVideo.classList.add("is-ready");
      playSafe();
    }

    if (soundToggle) {
      soundToggle.addEventListener("click", () => {
        bgVideo.muted = !bgVideo.muted;
        const on = !bgVideo.muted;
        soundToggle.setAttribute("aria-pressed", String(on));
        soundToggle.textContent = on ? "Sound: On" : "Sound: Off";
        if (on) playSafe();
      });
    }
  }

  const canvas = document.getElementById("emberParticles");
  if (canvas && !reduced.matches) {
    const ctx = canvas.getContext("2d");
    let rafId = null;
    let pts = [];

    const setup = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const count = window.innerWidth < 640 ? 14 : 28;
      pts = Array.from({ length: count }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.8 + 0.7,
        vy: -(Math.random() * 0.36 + 0.12),
        vx: (Math.random() - 0.5) * 0.2,
        a: Math.random() * 0.5 + 0.18,
        p: Math.random() * Math.PI * 2,
      }));
    };

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const m of pts) {
        m.y += m.vy;
        m.p += 0.015;
        m.x += m.vx + Math.sin(m.p) * 0.15;
        if (m.y < -10) m.y = canvas.height + 10;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(232, 168, 85, ${m.a.toFixed(2)})`;
        ctx.fill();
      }
      rafId = requestAnimationFrame(tick);
    };

    setup();
    tick();
    window.addEventListener("resize", setup);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      } else if (!document.hidden && !rafId) {
        rafId = requestAnimationFrame(tick);
      }
    });
  }

  const reveals = document.querySelectorAll(".reveal");
  if (reveals.length && !reduced.matches && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            obs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add("is-visible"));
  }
})();