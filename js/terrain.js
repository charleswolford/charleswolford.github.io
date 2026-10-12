/* ──────────────────────────────────────────────────────────────────────
   Terrain behind the notebook.
   A seeded height field (fractal Perlin noise) contoured with marching
   squares, white hairlines on the notebook's black. The canvas is fixed to
   the viewport but the field is anchored to the document, so the terrain
   scrolls with the page: full strength behind the profile cell, faint below.
   The cursor raises a hill that eases in, follows, and settles when it
   leaves; its spot height hides while the cursor is over text.
   ────────────────────────────────────────────────────────────────────── */
(function () {
  "use strict";

  const canvas = document.querySelector("[data-terrain]");
  if (!canvas || !canvas.getContext) return;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches || /[?&]instant\b/.test(location.search);
  const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const BG = "#0a0a0a", INK = "255,255,255";
  const FAINT = 0.26;            // strength of the terrain below the first screen
  const TEXTY = "p, h1, h2, h3, h4, li, a, button, code, pre, td, th, dt, dd, img, figure, .tags, .chip, .contact-email";

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a += 0x6D2B79F5;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function perlin(seed) {
    const r = rng(seed), perm = Array.from({ length: 256 }, (_, i) => i);
    for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
    const p = new Uint8Array(512);
    for (let i = 0; i < 512; i++) p[i] = perm[i & 255];
    const grad = (h, x, y) => { switch (h & 7) { case 0: return x + y; case 1: return -x + y; case 2: return x - y; case 3: return -x - y; case 4: return x; case 5: return -x; case 6: return y; default: return -y; } };
    const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
    return function (x, y) {
      const fx = Math.floor(x), fy = Math.floor(y), X = fx & 255, Y = fy & 255;
      x -= fx; y -= fy;
      const u = fade(x), v = fade(y);
      const aa = p[p[X] + Y], ab = p[p[X] + Y + 1], ba = p[p[X + 1] + Y], bb = p[p[X + 1] + Y + 1];
      const l1 = grad(aa, x, y) + u * (grad(ba, x - 1, y) - grad(aa, x, y));
      const l2 = grad(ab, x, y - 1) + u * (grad(bb, x - 1, y - 1) - grad(ab, x, y - 1));
      return l1 + v * (l2 - l1);
    };
  }

  const small = () => window.innerWidth < 768;
  const o = { cell: 9, interval: 10, index: 5, base: 150, relief: 260, bumpH: 110, bumpR: 110, drift: 0.000012 };
  const noise = perlin(62031);
  const g = canvas.getContext("2d");
  let w = 0, h = 0, cols = 0, rows = 0, V = null, scale = 1 / 440, heroBottom = 900;
  let t = 0, last = 0, raf = 0, lastDraw = 0, dirty = true;
  // Hill position in document coordinates.
  let bx = -1e4, by = -1e4, tx = -1e4, ty = -1e4, ba = 0, ta = 0;
  let cx = -1, cy = -1, overText = false, pointerIn = false;

  function height(x, y) {
    const s = scale, d = t;
    const f = 0.62 * noise(x * s + d, y * s + d * 0.55) + 0.28 * noise(x * s * 2.1 + 5.3, y * s * 2.1 - d * 0.4) + 0.12 * noise(x * s * 4.3 - 2.1, y * s * 4.3 + 7.7);
    let v = o.base + o.relief * f;
    if (ba > 0.001) {
      const dx = x - bx, dy = y - by, R = o.bumpR;
      v += o.bumpH * ba * Math.exp(-(dx * dx + dy * dy) / (2 * R * R));
    }
    return v;
  }

  function size() {
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = Math.round(w * DPR); canvas.height = Math.round(h * DPR);
    const sm = small();
    o.cell = sm ? 8 : 9; scale = sm ? 1 / 300 : 1 / 440; o.bumpH = sm ? 80 : 110; o.bumpR = sm ? 70 : 110;
    cols = Math.ceil(w / o.cell) + 1; rows = Math.ceil(h / o.cell) + 2;
    V = new Float32Array((cols + 1) * (rows + 1));
    const profile = document.getElementById("profile");
    heroBottom = profile ? profile.getBoundingClientRect().bottom + window.scrollY + 48 : h;
    dirty = true; draw();
  }

  function draw() {
    if (!w) return;
    dirty = false;
    const cell = o.cell, W = cols + 1, sy = window.scrollY;
    const y0 = Math.floor(sy / cell) * cell;     // grid snapped to the document so lines don't shimmer
    const off = sy - y0;
    for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) V[j * W + i] = height(i * cell, y0 + j * cell);

    const iv = o.interval, idxStep = iv * o.index;
    const minor = new Path2D(), major = new Path2D();
    // Elevation labels live in open ground on the right of the first screen only.
    const anchors = (small() ? [[w * 0.78, h * 0.16, 110]] : [[w * 0.86, h * 0.22, 170], [w * 0.92, h * 0.62, 160]])
      .map(([x, y, r]) => [x, y + off, r]).filter(([, y]) => y0 + y < heroBottom - 120);
    const best = new Map();

    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const a = V[j * W + i], b = V[j * W + i + 1], c = V[(j + 1) * W + i + 1], d = V[(j + 1) * W + i];
        const lo = Math.min(a, b, c, d), hi = Math.max(a, b, c, d);
        const x0 = i * cell, yy = j * cell;
        for (let L = Math.ceil(lo / iv) * iv; L <= hi; L += iv) {
          const code = (a > L ? 8 : 0) | (b > L ? 4 : 0) | (c > L ? 2 : 0) | (d > L ? 1 : 0);
          if (code === 0 || code === 15) continue;
          const isMajor = Math.round(L) % idxStep === 0;
          const path = isMajor ? major : minor;
          const T = () => [x0 + cell * (L - a) / (b - a), yy];
          const R = () => [x0 + cell, yy + cell * (L - b) / (c - b)];
          const B = () => [x0 + cell * (L - d) / (c - d), yy + cell];
          const Lf = () => [x0, yy + cell * (L - a) / (d - a)];
          let segs;
          switch (code) {
            case 1: case 14: segs = [[Lf(), B()]]; break;
            case 2: case 13: segs = [[B(), R()]]; break;
            case 3: case 12: segs = [[Lf(), R()]]; break;
            case 4: case 11: segs = [[T(), R()]]; break;
            case 5: segs = [[Lf(), B()], [T(), R()]]; break;
            case 6: case 9: segs = [[T(), B()]]; break;
            case 7: case 8: segs = [[T(), Lf()]]; break;
            case 10: segs = [[T(), Lf()], [R(), B()]]; break;
          }
          for (const [p, q] of segs) {
            path.moveTo(p[0], p[1]); path.lineTo(q[0], q[1]);
            if (isMajor && anchors.length) {
              const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
              for (const an of anchors) {
                const dd = (mx - an[0]) ** 2 + (my - an[1]) ** 2;
                const cur = best.get(L);
                if (dd < an[2] * an[2] && (!cur || dd < cur.d)) best.set(L, { d: dd, x: mx, y: my, a: Math.atan2(q[1] - p[1], q[0] - p[0]) });
              }
            }
          }
        }
      }
    }

    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    g.globalCompositeOperation = "source-over";
    g.clearRect(0, 0, w, h);
    g.save();
    g.translate(0, -off);
    g.lineCap = "round"; g.lineJoin = "round";
    g.strokeStyle = `rgba(${INK},0.1)`; g.lineWidth = 0.8; g.stroke(minor);
    g.strokeStyle = `rgba(${INK},0.24)`; g.lineWidth = 1.3; g.stroke(major);

    g.font = '400 10px "Geist Mono", ui-monospace, monospace';
    g.textBaseline = "middle";
    g.textAlign = "center";
    const placed = [];
    best.forEach((v, L) => {
      if (placed.some((p) => (p[0] - v.x) ** 2 + (p[1] - v.y) ** 2 < 70 * 70)) return;
      placed.push([v.x, v.y]);
      let ang = v.a;
      if (ang > Math.PI / 2) ang -= Math.PI; else if (ang < -Math.PI / 2) ang += Math.PI;
      g.save(); g.translate(v.x, v.y); g.rotate(ang);
      g.lineWidth = 4; g.strokeStyle = BG; g.strokeText(String(Math.round(L)), 0, 0);
      g.fillStyle = `rgba(${INK},0.5)`; g.fillText(String(Math.round(L)), 0, 0);
      g.restore();
    });
    // Spot height where the cursor has raised the ground, but never on top of text.
    if (ba > 0.5 && !overText) {
      const hx = bx, hy = by - y0, hh = Math.round(height(bx, by));
      g.fillStyle = `rgba(${INK},0.85)`;
      g.beginPath(); g.moveTo(hx, hy - 4.5); g.lineTo(hx + 4, hy + 2.5); g.lineTo(hx - 4, hy + 2.5); g.closePath(); g.fill();
      g.textAlign = "left";
      g.lineWidth = 4; g.strokeStyle = BG; g.strokeText(String(hh), hx + 8, hy - 1);
      g.fillText(String(hh), hx + 8, hy - 1);
    }
    g.restore();

    // Full strength over the first screen, easing to a faint field below it.
    const top = heroBottom - 260 - sy, bot = heroBottom + 80 - sy;
    g.globalCompositeOperation = "destination-in";
    const grad = g.createLinearGradient(0, top, 0, bot);
    grad.addColorStop(0, "rgba(0,0,0,1)");
    grad.addColorStop(1, `rgba(0,0,0,${FAINT})`);
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = "source-over";
  }

  // Drift only while the first screen is in view; elsewhere draw on demand.
  const drifting = () => !reduced && window.scrollY < heroBottom;
  function kick() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); } }
  function tick(now) {
    raf = 0;
    const dt = Math.min(64, now - last); last = now;
    const k = 1 - Math.pow(0.001, dt / 1000 * 2.2);
    bx += (tx - bx) * k; by += (ty - by) * k;
    ba += (ta - ba) * (1 - Math.pow(0.001, dt / 1000 * (ta ? 1.6 : 1.1)));
    const settling = Math.abs(ta - ba) > 0.002 || Math.abs(tx - bx) + Math.abs(ty - by) > 0.3;
    if (drifting()) t += dt * o.drift;
    if (dirty || settling || drifting()) {
      if (now - lastDraw > 30 || dirty) { lastDraw = now; draw(); }
    }
    if (!document.hidden && (settling || drifting() || dirty)) raf = requestAnimationFrame(tick);
  }

  function point(docX, docY, on) {
    tx = docX; ty = docY; ta = on ? 1 : 0;
    if (bx < -1e3) { bx = docX; by = docY; }
    if (reduced) { bx = docX; by = docY; ba = ta; draw(); return; }
    kick();
  }

  // Content sits above the canvas, so listen on the window and map into the field.
  function isOverText(target) {
    return !!(target && target.closest && target.closest(TEXTY));
  }
  window.addEventListener("pointermove", (e) => {
    if (e.pointerType === "touch") return;
    cx = e.clientX; cy = e.clientY; pointerIn = true;
    const was = overText; overText = isOverText(e.target);
    if (was !== overText) dirty = true;
    point(cx, cy + window.scrollY, true);
  }, { passive: true });
  document.documentElement.addEventListener("pointerleave", () => { pointerIn = false; point(tx, ty, false); });
  window.addEventListener("scroll", () => {
    dirty = true;
    // The cursor stays put on screen while the page moves under it.
    if (pointerIn && fine) {
      const el = document.elementFromPoint(cx, cy);
      overText = isOverText(el);
      point(cx, cy + window.scrollY, true);
    }
    kick();
  }, { passive: true });
  if (!fine) {
    // Touch screens: a hill stands in open ground; a tap moves it.
    window.addEventListener("pointerdown", (e) => {
      overText = isOverText(e.target);
      point(e.clientX, e.clientY + window.scrollY, true);
    }, { passive: true });
  }
  document.addEventListener("visibilitychange", () => { if (!document.hidden) { dirty = true; kick(); } });

  let rt = 0, lastW = window.innerWidth;
  window.addEventListener("resize", () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      // Phone URL bars change height constantly; rebuild fully only when the width changed.
      if (Math.abs(window.innerWidth - lastW) < 2) { h = window.innerHeight; canvas.height = Math.round(h * DPR); rows = Math.ceil(h / o.cell) + 2; V = new Float32Array((cols + 1) * (rows + 1)); dirty = true; kick(); return; }
      lastW = window.innerWidth; size(); kick();
    }, 160);
  });

  function start() {
    size();
    if (!fine) point(w * (small() ? 0.8 : 0.82), h * (small() ? 0.12 : 0.3), true);
    kick();
    // If animation frames are withheld (a background tab), still paint once.
    setTimeout(() => { if (dirty || !lastDraw) draw(); }, 2500);
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start, start); else start();
})();
