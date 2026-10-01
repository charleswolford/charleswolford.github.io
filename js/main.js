/* ──────────────────────────────────────────────────────────────────────
   Notebook engine: cells execute as they enter the viewport, project
   cards render from js/projects.js, figures are drawn from seeded data.
   ────────────────────────────────────────────────────────────────────── */
(function () {
  "use strict";

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const instant = reduced || /[?&]instant\b/.test(location.search);
  if (instant) document.documentElement.classList.add("instant");

  const cells = Array.from(document.querySelectorAll("[data-cell]"));
  const dot = document.querySelector("[data-dot]");
  const statusEl = document.querySelector("[data-status]");
  const footStatus = document.querySelector("[data-foot-status]");
  const countEl = document.querySelector("[data-cell-count]");
  const totalEl = document.querySelector("[data-cell-total]");
  let counter = 0;
  let queue = Promise.resolve();

  const FIG_H = 200;           // every card figure is this tall; wide cards are twice as wide

  function svgEl(inner, w) {
    const ns = "http://www.w3.org/2000/svg";
    const s = document.createElementNS(ns, "svg");
    s.setAttribute("viewBox", `0 0 ${w} ${FIG_H}`);
    s.setAttribute("preserveAspectRatio", "xMidYMid slice");
    s.setAttribute("aria-hidden", "true");
    s.innerHTML = inner;
    Array.prototype.forEach.call(s.children, (el, i) => { el.style.setProperty("--i", i); });
    return s;
  }

  /* ── Projects ─────────────────────────────────────────────────── */
  function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
  function hashSeed(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  // Each figure is drawn at its card's real proportions (fixed height, width to match),
  // so wide cards and cards stretched by a taller neighbour are filled, not letterboxed.
  function drawFigures(list) {
    const FIGS = window.PROJECT_FIGURES || {};
    if (!Object.keys(FIGS).length) return;
    list.querySelectorAll(".project[data-seed]").forEach((li) => {
      const fig = li.querySelector(".figure");
      const r = fig.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const w = Math.max(360, Math.min(1600, Math.round(FIG_H * r.width / r.height)));
      if (fig.dataset.w === String(w)) return;
      fig.dataset.w = String(w);
      const kind = FIGS[li.dataset.figure] ? li.dataset.figure : "twin";
      const old = fig.querySelector("svg");
      if (old) old.remove();
      fig.prepend(svgEl(FIGS[kind](Number(li.dataset.seed), w, FIG_H), w));
    });
  }
  let figTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(figTimer);
    figTimer = setTimeout(() => { const list = document.querySelector("[data-projects]"); if (list) drawFigures(list); }, 200);
  });

  /* ── Card hover: the figure plays, and a soft glow follows the cursor ── */
  function playFigure(li) {
    if (instant) return;
    const clock = li.querySelector(".figure [data-fx-clock]");
    const now = performance.now();
    if (!clock || typeof clock.beginElement !== "function" || now - (li._played || 0) < 1200) return;
    li._played = now;
    clock.beginElement();
  }
  function wireCards(list) {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const cards = Array.from(list.querySelectorAll(".project"));
    if (fine) {
      cards.forEach((li) => {
        li.addEventListener("pointerenter", () => playFigure(li));
        li.addEventListener("focusin", () => playFigure(li));
        li.addEventListener("pointermove", (e) => {
          const r = li.getBoundingClientRect();
          li.style.setProperty("--mx", `${e.clientX - r.left}px`);
          li.style.setProperty("--my", `${e.clientY - r.top}px`);
        }, { passive: true });
      });
    } else if ("IntersectionObserver" in window) {
      // Touch screens: each figure plays once as its card comes into view.
      const io = new IntersectionObserver((entries) => entries.forEach((e) => {
        if (e.isIntersecting) { setTimeout(() => playFigure(e.target), 500); io.unobserve(e.target); }
      }), { threshold: 0.6 });
      cards.forEach((li) => io.observe(li));
    }
  }

  function renderProjects() {
    const list = document.querySelector("[data-projects]");
    if (!list || !Array.isArray(window.PROJECTS)) return;
    list.innerHTML = "";
    window.PROJECTS.forEach((p, i) => {
      const li = document.createElement("li");
      li.className = "project" + (p.featured ? " is-featured" : "") + (p.featured === false ? " is-single" : "");
      const isImage = p.figure && /[./]/.test(p.figure);
      const figHTML = isImage
        ? `<img src="${esc(p.figure)}" alt="" loading="lazy" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover">`
        : "";
      const tag = p.href ? "a" : "div";
      const attrs = p.href ? ` href="${esc(p.href)}"${/^https?:/.test(p.href) ? ' target="_blank" rel="noopener"' : ""}` : "";
      li.innerHTML = `
        <${tag} class="project-link"${attrs}>
          <figure class="figure">${figHTML}</figure>
          <div class="project-body">
            <p class="project-meta mono-sm">${p.example ? '<span class="chip">Example</span>' : ""}<span>${esc(p.org)} · ${esc(p.period)}</span></p>
            <h3>${esc(p.title)}</h3>
            <p>${esc(p.summary)}</p>
            <div class="project-foot">
              <ul class="tags">${(p.tags || []).map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
              ${p.href ? '<span class="project-more">Read more <svg class="icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M4.5 11.5l7-7M6 4.5h5.5V10"/></svg></span>' : ""}
            </div>
          </div>
        </${tag}>`;
      if (!isImage) { li.dataset.figure = p.figure || ""; li.dataset.seed = hashSeed(p.title + i); }
      list.appendChild(li);
    });
    drawFigures(list);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => drawFigures(list));
    wireCards(list);
  }

  /* ── Kernel status ────────────────────────────────────────────── */
  function setStatus(busy, text) {
    if (dot) dot.classList.toggle("is-busy", busy);
    if (statusEl) statusEl.textContent = text;
    if (footStatus) footStatus.firstChild.nodeValue = (busy ? "kernel busy" : "kernel idle") + " · ";
    if (countEl) countEl.textContent = String(Math.min(counter, cells.length));
    if (totalEl) totalEl.textContent = String(cells.length);
  }

  /* ── Cell execution ───────────────────────────────────────────── */
  const started = new WeakSet();

  function execute(cell, quick) {
    if (cell.dataset.state === "running") return Promise.resolve();
    started.add(cell);
    const code = cell.querySelector("[data-typed]");
    const text = cell.dataset.code || code.textContent;
    const n = cell.querySelector("[data-n]");
    const stamp = cell.querySelector("[data-stamp]");
    cell.dataset.state = "running";
    cell.classList.remove("is-run");
    n.textContent = "*";
    setStatus(true, "kernel busy");
    const t0 = performance.now();

    return new Promise((resolve) => {
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        counter += 1;
        n.textContent = String(counter);
        cell.dataset.state = "run";
        cell.classList.add("is-run");
        code.textContent = text;
        const ms = performance.now() - t0;
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, "0"), mm = String(now.getMinutes()).padStart(2, "0"), ss = String(now.getSeconds()).padStart(2, "0");
        if (stamp) stamp.textContent = `executed in ${(ms / 1000).toFixed(2)}s · ${hh}:${mm}:${ss}`;
        setStatus(false, "kernel idle");
        cell.dispatchEvent(new CustomEvent("cell:run", { bubbles: true }));
        resolve();
      };
      if (quick || instant || document.hidden) { finish(); return; }
      code.textContent = "";
      // Fallback: if the browser withholds animation frames (background tab), finish anyway.
      setTimeout(finish, 2200);
      const perChar = cell === cells[0] ? 14 : 22;
      const start = performance.now() + 80;
      const frame = (now) => {
        if (done) return;
        const i = Math.max(0, Math.min(text.length, Math.floor((now - start) / perChar)));
        code.textContent = text.slice(0, i);
        if (i < text.length && now - start < 2000) requestAnimationFrame(frame);
        else setTimeout(finish, 160);
      };
      requestAnimationFrame(frame);
    });
  }

  function enqueue(cell, quick) {
    queue = queue.then(() => execute(cell, quick));
    return queue;
  }

  /* ── Observe cells ────────────────────────────────────────────── */
  if (!("IntersectionObserver" in window) || instant) {
    cells.forEach((c) => enqueue(c, true));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !started.has(e.target)) { enqueue(e.target, false); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -18% 0px", threshold: 0.05 });
    cells.forEach((c) => io.observe(c));
  }

  /* ── Run all ──────────────────────────────────────────────────── */
  const runAll = document.querySelector("[data-run-all]");
  if (runAll) runAll.addEventListener("click", () => {
    counter = 0;
    cells.forEach((c) => { c.classList.remove("is-run"); c.dataset.state = ""; started.add(c); });
    window.scrollTo({ top: 0, behavior: instant ? "auto" : "smooth" });
    cells.forEach((c) => enqueue(c, false));
  });

  /* ── Mobile menu ──────────────────────────────────────────────── */
  const menuBtn = document.querySelector(".kernel-menu");
  const mobileNav = document.getElementById("mobile-nav");
  if (menuBtn && mobileNav) {
    menuBtn.addEventListener("click", () => {
      const open = menuBtn.getAttribute("aria-expanded") === "true";
      menuBtn.setAttribute("aria-expanded", String(!open));
      mobileNav.hidden = open;
      menuBtn.textContent = open ? "Cells" : "Close";
    });
    mobileNav.addEventListener("click", (e) => {
      if (e.target.tagName === "A") { mobileNav.hidden = true; menuBtn.setAttribute("aria-expanded", "false"); menuBtn.textContent = "Cells"; }
    });
  }

  /* ── Current section in nav ───────────────────────────────────── */
  const navLinks = Array.from(document.querySelectorAll(".kernel-nav a"));
  if (navLinks.length && "IntersectionObserver" in window) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) navLinks.forEach((a) => a.setAttribute("aria-current", a.getAttribute("href") === "#" + e.target.id ? "true" : "false"));
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    cells.forEach((c) => spy.observe(c));
  }

  /* ── Email links ──────────────────────────────────────────────── */
  // The address is assembled here so it never appears in the page source,
  // which keeps it away from scrapers that read HTML without running scripts.
  const mail = ["charles", "wolford"].join(".") + String.fromCharCode(64) + ["icloud", "com"].join(".");
  document.querySelectorAll("[data-email]").forEach((a) => { a.href = "mailto:" + mail; });

  renderProjects();
})();
