/* ──────────────────────────────────────────────────────────────────────
   Project figures.
   One drawing per project, in the notebook's figure language: breeze-blue
   linework on black, a faint white graticule, white for the thing that
   matters. Each returns SVG markup for a W x H viewBox (H is fixed; wide
   cards pass twice the width so every figure keeps the same height).
   Lines with pathLength="1" draw themselves in when their cell runs.
   ────────────────────────────────────────────────────────────────────── */
(function () {
  "use strict";

  const INK = [160, 195, 236];   // #a0c3ec
  const BG = [10, 10, 10];       // #0a0a0a
  const INKS = "#a0c3ec", WHITE = "#ffffff", BGS = "#0a0a0a";

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
  const f1 = (n) => Math.round(n * 10) / 10;
  const pts = (a) => a.map((p) => `${f1(p[0])},${f1(p[1])}`).join(" ");
  // Opaque ink mixed over the black, so stacked shapes occlude cleanly.
  const mix = (a) => `rgb(${INK.map((c, i) => Math.round(BG[i] + (c - BG[i]) * a)).join(",")})`;

  function grat(W, H, step, op) {
    let out = "";
    for (let x = 0; x <= W; x += step) out += `<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="${WHITE}" stroke-opacity="${op}"/>`;
    for (let y = 0; y <= H; y += step) out += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${WHITE}" stroke-opacity="${op}"/>`;
    return out;
  }
  // Isometric projection: ground plane (x, y), height z, scale s, origin (ox, oy).
  function iso(ox, oy, s) {
    const c = Math.cos(Math.PI / 6) * s, h = 0.5 * s;
    return (x, y, z = 0) => [ox + (x - y) * c, oy + (x + y) * h - z * s];
  }
  const line = (a, b, attrs) => `<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" ${attrs}/>`;

  /* Play layer: SVG animations that wait for a clock, started from js/main.js
     on hover (or once on scroll into view on touch screens). Everything here
     is invisible at rest, so the still drawing is unchanged. */
  function fxKit(seed) {
    const id = "fx" + (seed >>> 0).toString(36);
    const at = (t) => `${id}.begin+${f1(t)}s`;
    return {
      at,
      clock: (dur) => `<rect width="0" height="0" opacity="0"><animate id="${id}" data-fx-clock attributeName="x" from="0" to="0" dur="${dur}s" begin="indefinite"/></rect>`,
      // A dot that travels along a path.
      travel: (d, t, dur, rad = 2.6, fill = WHITE) => `<circle r="${rad}" fill="${fill}" opacity="0"><animateMotion path="${d}" begin="${at(t)}" dur="${dur}s" calcMode="spline" keyTimes="0;1" keySplines="0.45 0 0.2 1"/><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.8;1" begin="${at(t)}" dur="${dur}s"/></circle>`,
      // A ring that expands and fades.
      ping: (x, y, r0, r1, t, dur = 0.9, stroke = INKS) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${r0}" fill="none" stroke="${stroke}" stroke-width="1.2" opacity="0"><animate attributeName="r" values="${f1(r0)};${f1(r1)}" begin="${at(t)}" dur="${dur}s" calcMode="spline" keyTimes="0;1" keySplines="0.2 0 0.2 1"/><animate attributeName="opacity" values="0.95;0" begin="${at(t)}" dur="${dur}s"/></circle>`,
      // A shape that brightens and fades.
      flash: (tag, attrs, t, dur, peak) => `<${tag} ${attrs} opacity="0"><animate attributeName="opacity" values="0;${peak};0" begin="${at(t)}" dur="${dur}s"/></${tag}>`,
      // Hide a still element while its moving copy is on stage.
      hide: (t, dur) => `<set attributeName="visibility" to="hidden" begin="${at(t)}" dur="${dur}s"/>`
    };
  }

  const FIGURES = {
    /* Estate digital twins: massed buildings with floor lines on a ground grid,
       georeferenced to a survey control mark. */
    twin(seed, W, H) {
      const r = rng(seed);
      let out = grat(W, H, 40, 0.045);
      const cx = W / 2, spread = Math.max(150, W / 2 - 64);

      // The twin: one building model on a ground patch, centred.
      const s = 14, c = Math.cos(Math.PI / 6) * s, hh = 0.5 * s;
      const bw = 4, bd = 3, bh = 4.2;
      const ox = cx - (bw - bd) * c / 2, oy = 128 - (bw + bd) * hh / 2;
      const P = (x, y, z = 0) => [ox + (x - y) * c, oy + (x + y) * hh - z * s];
      for (let i = -1; i <= 5; i++) {
        out += line(P(i, -1), P(i, 4), `stroke="${WHITE}" stroke-opacity="0.1" stroke-width="0.8"`);
        out += line(P(-1, i < 5 ? i : 4), P(5, i < 5 ? i : 4), `stroke="${WHITE}" stroke-opacity="0.1" stroke-width="0.8"`);
      }
      const target = P(bw / 2, bd / 2, bh * 0.55);

      // Inputs, each tied into the model.
      const inputs = [
        { key: "cad", x: cx - spread, y: 62 },
        { key: "data", x: cx - spread, y: 146 },
        { key: "drone", x: cx + spread, y: 52 },
        { key: "3d", x: cx + spread, y: 144 }
      ];
      const feeds = [];
      for (const inp of inputs) {
        const side = inp.x < cx ? 1 : -1, sx = inp.x + side * 42, sy = inp.y;
        const tx = target[0] - side * 30, ty = target[1] + (inp.y < 100 ? -14 : 14);
        const d = `M${f1(sx)},${f1(sy)} C${f1((sx + tx) / 2)},${f1(sy)} ${f1((sx + tx) / 2)},${f1(ty)} ${f1(tx)},${f1(ty)}`;
        feeds.push(d);
        out += `<path d="${d}" pathLength="1" fill="none" stroke="${INKS}" stroke-opacity="0.6" stroke-width="0.9"/>`;
        out += `<circle cx="${f1(tx)}" cy="${f1(ty)}" r="2" fill="${INKS}"/>`;
      }

      // CAD: a floor plan with walls, partitions and door swings.
      {
        const x = cx - spread - 36, y = 62 - 26, w = 72, h = 50;
        out += `<rect x="${f1(x)}" y="${f1(y)}" width="${w}" height="${h}" fill="${mix(0.05)}" stroke="${WHITE}" stroke-opacity="0.8" stroke-width="1.4"/>`;
        out += line([x + 30, y], [x + 30, y + h - 14], `stroke="${WHITE}" stroke-opacity="0.6"`);
        out += line([x + 30, y + 26], [x + w, y + 26], `stroke="${WHITE}" stroke-opacity="0.6"`);
        out += `<path d="M${f1(x + 30)},${f1(y + h - 14)} A14,14 0 0 0 ${f1(x + 16)},${f1(y + h)}" fill="none" stroke="${INKS}" stroke-opacity="0.8" stroke-dasharray="2 2"/>`;
        out += `<path d="M${f1(x + 46)},${f1(y + 26)} A12,12 0 0 1 ${f1(x + 58)},${f1(y + 38)}" fill="none" stroke="${INKS}" stroke-opacity="0.8" stroke-dasharray="2 2"/>`;
      }
      // Data: an asset register.
      {
        const x = cx - spread - 36, y = 146 - 22, w = 72, rows = 4;
        out += `<rect x="${f1(x)}" y="${f1(y)}" width="${w}" height="8" fill="${INKS}" fill-opacity="0.7"/>`;
        for (let i = 0; i < rows; i++) {
          const yy = y + 11 + i * 8;
          out += `<rect x="${f1(x)}" y="${f1(yy)}" width="18" height="5" fill="${WHITE}" fill-opacity="0.35"/>`;
          out += `<rect x="${f1(x + 22)}" y="${f1(yy)}" width="${f1(20 + r() * 16)}" height="5" fill="${WHITE}" fill-opacity="0.18"/>`;
          out += `<circle cx="${f1(x + w - 4)}" cy="${f1(yy + 2.5)}" r="2" fill="${i === 1 ? INKS : WHITE}" fill-opacity="${i === 1 ? 1 : 0.3}"/>`;
        }
      }
      // Drone: the aircraft, its camera footprint and the photos it takes.
      {
        const x = cx + spread, y = 34;
        out += `<polygon points="${pts([[x, y + 6], [x - 26, y + 44], [x + 26, y + 44]])}" fill="${INKS}" fill-opacity="0.07" stroke="${INKS}" stroke-opacity="0.5" stroke-dasharray="2 3"/>`;
        for (let i = 0; i < 3; i++) out += `<rect x="${f1(x - 24 + i * 16)}" y="${f1(y + 38)}" width="15" height="11" fill="${mix(0.1 + i * 0.06)}" stroke="${WHITE}" stroke-opacity="0.6" stroke-width="0.8"/>`;
        for (const [dx, dy] of [[-6, -4], [6, -4], [-6, 4], [6, 4]]) out += `<circle cx="${f1(x + dx)}" cy="${f1(y + dy)}" r="3.2" fill="none" stroke="${WHITE}" stroke-width="0.9"/>`;
        out += `<circle cx="${f1(x)}" cy="${f1(y)}" r="2" fill="${WHITE}"/>`;
      }
      // 3D: a point-cloud scan of a small structure.
      {
        const x = cx + spread, y = 146;
        for (let i = 0; i < 150; i++) {
          const u = r() * 2 - 1, v = r();
          const px = x + u * 34, roof = 34 - Math.abs(u) * 16, py = y + 10 - v * roof * (r() < 0.6 ? 1 : 0.55);
          out += `<circle cx="${f1(px)}" cy="${f1(py)}" r="0.9" fill="${v > 0.85 ? INKS : WHITE}" fill-opacity="${f1(0.35 + r() * 0.5)}"/>`;
        }
        out += line([x - 36, y + 11], [x + 36, y + 11], `stroke="${WHITE}" stroke-opacity="0.25"`);
      }

      // The building model, drawn last so it sits on top.
      const stroke = `stroke="${INKS}" stroke-opacity="0.9" stroke-width="1" stroke-linejoin="round"`;
      out += `<polygon points="${pts([P(bw, 0), P(bw, bd), P(bw, bd, bh), P(bw, 0, bh)])}" fill="${mix(0.14)}" ${stroke}/>`;
      out += `<polygon points="${pts([P(0, bd), P(bw, bd), P(bw, bd, bh), P(0, bd, bh)])}" fill="${mix(0.24)}" ${stroke}/>`;
      out += `<polygon points="${pts([P(0, 0, bh), P(bw, 0, bh), P(bw, bd, bh), P(0, bd, bh)])}" fill="${mix(0.4)}" ${stroke}/>`;
      for (let z = 0.7; z < bh - 0.2; z += 0.7) {
        out += line(P(0, bd, z), P(bw, bd, z), `stroke="${INKS}" stroke-opacity="0.4" stroke-width="0.6"`);
        out += line(P(bw, 0, z), P(bw, bd, z), `stroke="${INKS}" stroke-opacity="0.32" stroke-width="0.6"`);
      }
      // Asset points on the model: the data, placed.
      const assets = [[1, 1.4], [2.6, 2.8], [3.4, 0.7]].map(([ax, az]) => P(ax, bd, az));
      for (const p of assets) out += `<circle cx="${f1(p[0])}" cy="${f1(p[1])}" r="2.4" fill="${WHITE}"/>`;

      const fx = fxKit(seed);
      let g = fx.clock(2.6);
      feeds.forEach((d, i) => { g += fx.travel(d, i * 0.14, 1.1); g += fx.travel(d, 0.35 + i * 0.14, 1.1, 1.6, INKS); });
      g += fx.flash("polygon", `points="${pts([P(0, 0, bh), P(bw, 0, bh), P(bw, bd, bh), P(0, bd, bh)])}" fill="${INKS}"`, 1.2, 0.9, 0.5);
      g += fx.flash("polygon", `points="${pts([P(0, bd), P(bw, bd), P(bw, bd, bh), P(0, bd, bh)])}" fill="${INKS}"`, 1.3, 0.9, 0.3);
      assets.forEach((p, k) => { g += fx.ping(p[0], p[1], 2.4, 12, 1.4 + k * 0.15, 0.8, WHITE); });
      out += `<g class="fx">${g}</g>`;
      return out;
    },

    /* Drone condition survey: imagery tiles over a roof plan, the drone's
       lawnmower flight lines, and defects marked on the roof. */
    drone(seed, W, H) {
      const r = rng(seed);
      let out = grat(W, H, 40, 0.045);
      const fw = Math.min(W * 0.62, 560), fh = 112, x0 = (W - fw) / 2, y0 = (H - fh) / 2;
      // Orthomosaic tiles: captured image footprints, faintly varied in tone.
      for (let y = y0 - 18; y < y0 + fh + 18; y += 18) {
        for (let x = x0 - 24; x < x0 + fw + 24; x += 24) {
          out += `<rect x="${f1(x)}" y="${f1(y)}" width="23" height="17" fill="${WHITE}" fill-opacity="${f1((0.015 + r() * 0.04) * 100) / 100}"/>`;
        }
      }
      const notchX = x0 + fw * 0.68, notchY = y0 + fh * 0.6;
      const outline = [[x0, y0], [x0 + fw, y0], [x0 + fw, notchY], [notchX, notchY], [notchX, y0 + fh], [x0, y0 + fh]];
      out += `<polygon points="${pts(outline)}" fill="${mix(0.08)}" stroke="${INKS}" stroke-opacity="0.85" stroke-width="1.1" stroke-linejoin="round"/>`;
      // Hipped roof over the main range.
      const hy = (y0 + notchY) / 2, inset = (notchY - y0) / 2;
      const roof = `stroke="${INKS}" stroke-opacity="0.4" stroke-width="0.7"`;
      out += line([x0 + inset, hy], [x0 + fw - inset, hy], roof);
      out += line([x0, y0], [x0 + inset, hy], roof) + line([x0, notchY], [x0 + inset, hy], roof);
      out += line([x0 + fw, y0], [x0 + fw - inset, hy], roof) + line([x0 + fw, notchY], [x0 + fw - inset, hy], roof);
      // Wing ridge.
      const wx = (x0 + notchX) / 2;
      out += line([wx, notchY], [wx, y0 + fh - 10], roof);
      // Flight lines: a serpentine over the whole roof.
      const left = x0 - 14, right = x0 + fw + 14, step = 20;
      let d = `M${f1(left)},${f1(y0 - 8)}`, dir = 1, y = y0 - 8;
      while (y + step <= y0 + fh + 10) {
        const xEnd = dir > 0 ? right : left;
        d += ` L${f1(xEnd)},${f1(y)} A${step / 2},${step / 2} 0 0 ${dir > 0 ? 1 : 0} ${f1(xEnd)},${f1(y + step)}`;
        y += step; dir = -dir;
      }
      d += ` L${f1(dir > 0 ? right : left)},${f1(y)}`;
      out += `<path d="${d}" pathLength="1" fill="none" stroke="${INKS}" stroke-width="1.2" stroke-opacity="0.9" stroke-linecap="round"/>`;
      // Drone at the start of the flight.
      const dx = left, dy = y0 - 8, fx = fxKit(seed), flight = 3.4;
      const rotors = (x0r, y0r) => [[-4, -4], [4, -4], [-4, 4], [4, 4]].map(([ox, oy]) => `<circle cx="${f1(x0r + ox)}" cy="${f1(y0r + oy)}" r="2.6" fill="none" stroke="${WHITE}" stroke-width="0.9"/>`).join("") + `<circle cx="${f1(x0r)}" cy="${f1(y0r)}" r="1.6" fill="${WHITE}"/>`;
      out += `<g>${rotors(dx, dy)}${fx.hide(0, flight)}</g>`;
      // Defects found in the imagery.
      let g = fx.clock(flight + 0.4);
      g += `<g opacity="0">${rotors(0, 0)}<animateMotion path="${d}" begin="${fx.at(0)}" dur="${flight}s"/><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.03;0.97;1" begin="${fx.at(0)}" dur="${flight}s"/></g>`;
      for (let i = 0; i < 5; i++) {
        const px = x0 + 14 + r() * (fw - 28), py = y0 + 10 + r() * (notchY - y0 - 20);
        g += fx.ping(px, py, 4.5, 16, 0.5 + ((py - y0) / fh) * (flight - 1.2), 0.9, WHITE);
        out += `<circle cx="${f1(px)}" cy="${f1(py)}" r="4.5" fill="none" stroke="${WHITE}" stroke-opacity="0.9"/>`;
        out += `<circle cx="${f1(px)}" cy="${f1(py)}" r="1.3" fill="${WHITE}"/>`;
        if (i === 0) out += `<circle cx="${f1(px)}" cy="${f1(py)}" r="10" fill="none" stroke="${INKS}" stroke-opacity="0.75"/>`;
      }
      out += `<g class="fx">${g}</g>`;
      return out;
    },

    /* Web and mobile GIS: floor-aware mapping (stacked floors, rooms shaded by
       occupancy) beside the phone and browser apps that use it. */
    floors(seed, W, H) {
      const r = rng(seed);
      let out = grat(W, H, 40, 0.045);
      const wide = W > 600, s = 10.5, N = 8, M = 6, gap = 3.1;
      const stackX = wide ? W * 0.5 : W * 0.4;
      const P = iso(stackX - (N - M) * Math.cos(Math.PI / 6) * s / 2, 90, s);
      const xs = [0, 3, 5, 8], ys = [0, 3, 6];
      const hi = { f: 1, i: 1, j: 0 };
      for (let f = 0; f < 3; f++) {
        const z = f * gap;
        for (let i = 0; i < xs.length - 1; i++) {
          for (let j = 0; j < ys.length - 1; j++) {
            const lit = f === hi.f && i === hi.i && j === hi.j;
            const occ = lit ? 0.62 : 0.06 + r() * 0.34;
            const poly = [P(xs[i], ys[j], z), P(xs[i + 1], ys[j], z), P(xs[i + 1], ys[j + 1], z), P(xs[i], ys[j + 1], z)];
            out += `<polygon points="${pts(poly)}" fill="${mix(occ)}" stroke="${lit ? WHITE : INKS}" stroke-opacity="${lit ? 0.95 : 0.4}" stroke-width="${lit ? 1.1 : 0.6}" stroke-linejoin="round"/>`;
          }
        }
        out += `<polygon points="${pts([P(0, 0, z), P(N, 0, z), P(N, M, z), P(0, M, z)])}" fill="none" stroke="${INKS}" stroke-opacity="0.85" stroke-width="0.9" stroke-linejoin="round"/>`;
        if (f < 2) for (const [cx, cy] of [[0, M], [N, M], [N, 0]]) out += line(P(cx, cy, z), P(cx, cy, z + gap), `stroke="${WHITE}" stroke-opacity="0.18" stroke-dasharray="2 3"`);
      }
      const fx = fxKit(seed);
      let g = fx.clock(2.4);
      for (let f = 0; f < 3; f++) g += fx.flash("polygon", `points="${pts([P(0, 0, f * gap), P(N, 0, f * gap), P(N, M, f * gap), P(0, M, f * gap)])}" fill="${INKS}" stroke="${WHITE}" stroke-width="1"`, f * 0.28, 0.75, 0.32);
      const room = [P(xs[hi.i], ys[hi.j], hi.f * gap), P(xs[hi.i + 1], ys[hi.j], hi.f * gap), P(xs[hi.i + 1], ys[hi.j + 1], hi.f * gap), P(xs[hi.i], ys[hi.j + 1], hi.f * gap)];
      g += fx.flash("polygon", `points="${pts(room)}" fill="${WHITE}"`, 0.95, 0.9, 0.55);
      // Pin over the selected room.
      const pc = P((xs[hi.i] + xs[hi.i + 1]) / 2, (ys[hi.j] + ys[hi.j + 1]) / 2, hi.f * gap);
      g += fx.ping(pc[0], pc[1] - 23, 3.2, 14, 1.1, 0.8, WHITE);
      out += line(pc, [pc[0], pc[1] - 20], `stroke="${WHITE}" stroke-opacity="0.9" pathLength="1"`);
      out += `<circle cx="${f1(pc[0])}" cy="${f1(pc[1] - 23)}" r="3.2" fill="${WHITE}"/>`;
      // Phone: a field form.
      const phx = wide ? W * 0.8 : W * 0.83, phy = H / 2;
      out += `<rect x="${f1(phx - 27)}" y="${f1(phy - 50)}" width="54" height="100" rx="8" fill="${mix(0.04)}" stroke="${WHITE}" stroke-opacity="0.7"/>`;
      for (let i = 0; i < 4; i++) {
        out += `<rect x="${f1(phx - 18)}" y="${f1(phy - 34 + i * 15)}" width="${f1(14 + r() * 20)}" height="2.4" rx="1.2" fill="${WHITE}" fill-opacity="0.3"/>`;
        out += `<rect x="${f1(phx - 18)}" y="${f1(phy - 29 + i * 15)}" width="36" height="5" rx="1.5" fill="none" stroke="${INKS}" stroke-opacity="0.45" stroke-width="0.7"/>`;
      }
      out += `<rect x="${f1(phx - 18)}" y="${f1(phy + 30)}" width="36" height="8" rx="2" fill="${INKS}" fill-opacity="0.7"/>`;
      g += fx.flash("rect", `x="${f1(phx - 18)}" y="${f1(phy + 30)}" width="36" height="8" rx="2" fill="${WHITE}"`, 1.35, 0.7, 0.9);
      g += fx.ping(phx, phy, 10, 46, 1.4, 0.9, INKS);
      // Browser: a web map, on wide cards.
      if (wide) {
        const bx = W * 0.14, by = H / 2 - 52, bw = 170, bh = 104;
        out += `<rect x="${f1(bx)}" y="${f1(by)}" width="${bw}" height="${bh}" rx="5" fill="${mix(0.04)}" stroke="${WHITE}" stroke-opacity="0.7"/>`;
        out += line([bx, by + 13], [bx + bw, by + 13], `stroke="${WHITE}" stroke-opacity="0.3"`);
        for (let i = 0; i < 3; i++) out += `<circle cx="${f1(bx + 9 + i * 7)}" cy="${f1(by + 6.5)}" r="1.8" fill="${WHITE}" fill-opacity="0.4"/>`;
        for (let i = 1; i <= 4; i++) out += `<ellipse cx="${f1(bx + bw * 0.55)}" cy="${f1(by + 60)}" rx="${f1(i * 16)}" ry="${f1(i * 9)}" fill="none" stroke="${INKS}" stroke-opacity="${f1(0.7 - i * 0.12)}" pathLength="1"/>`;
        out += `<rect x="${f1(bx + 8)}" y="${f1(by + 22)}" width="34" height="74" fill="${WHITE}" fill-opacity="0.05"/>`;
        g += fx.ping(bx + bw * 0.55, by + 60, 6, 40, 1.4, 0.9, INKS);
      }
      out += `<g class="fx">${g}</g>`;
      return out;
    },

    /* ArcGIS Enterprise on AWS: infrastructure as code into a cloud boundary of
       servers, a portal hub and storage, feeding a small machine learning network
       and an alert broadcast. */
    cloud(seed, W, H) {
      const r = rng(seed);
      let out = grat(W, H, 40, 0.045);
      const u = W / 480, cy = H / 2;
      // Infrastructure as code.
      const cx0 = 26 * u;
      for (let i = 0; i < 8; i++) {
        const indent = [0, 8, 8, 16, 16, 8, 0, 0][i];
        out += `<rect x="${f1(cx0 + indent)}" y="${f1(cy - 44 + i * 11)}" width="${f1(18 + r() * 34)}" height="3" rx="1.5" fill="${i === 3 ? INKS : WHITE}" fill-opacity="${i === 3 ? 0.9 : 0.28}"/>`;
      }
      // Cloud boundary.
      const vx = 118 * u, vw = 210 * u, vy = cy - 74, vh = 148;
      out += `<rect x="${f1(vx)}" y="${f1(vy)}" width="${f1(vw)}" height="${vh}" rx="8" fill="none" stroke="${INKS}" stroke-opacity="0.45" stroke-dasharray="4 4"/>`;
      const deploy = `M${f1(cx0 + 74)},${f1(cy)} L${f1(vx - 6)},${f1(cy)}`;
      out += `<path d="${deploy}" pathLength="1" fill="none" stroke="${INKS}" stroke-opacity="0.75" stroke-width="1.1"/>`;
      out += `<polygon points="${pts([[vx - 6, cy - 3.5], [vx, cy], [vx - 6, cy + 3.5]])}" fill="${INKS}"/>`;
      // Servers.
      const hub = [vx + vw * 0.68, cy - 12];
      const servers = [-40, -6, 28].map((dy) => [vx + 22, cy + dy - 8]);
      const links = [];
      for (const [sx, sy] of servers) {
        links.push(`M${f1(sx + 54)},${f1(sy + 8)} C${f1((sx + 54 + hub[0]) / 2)},${f1(sy + 8)} ${f1((sx + 54 + hub[0]) / 2)},${f1(hub[1])} ${f1(hub[0] - 12)},${f1(hub[1])}`);
        out += `<path d="M${f1(sx + 54)},${f1(sy + 8)} C${f1((sx + 54 + hub[0]) / 2)},${f1(sy + 8)} ${f1((sx + 54 + hub[0]) / 2)},${f1(hub[1])} ${f1(hub[0] - 12)},${f1(hub[1])}" pathLength="1" fill="none" stroke="${INKS}" stroke-opacity="0.55" stroke-width="0.9"/>`;
      }
      for (const [sx, sy] of servers) {
        out += `<rect x="${f1(sx)}" y="${f1(sy)}" width="54" height="16" rx="2" fill="${mix(0.14)}" stroke="${INKS}" stroke-opacity="0.85" stroke-width="0.9"/>`;
        for (let k = 0; k < 3; k++) out += `<circle cx="${f1(sx + 7 + k * 5)}" cy="${f1(sy + 8)}" r="1.3" fill="${WHITE}" fill-opacity="${k === 0 ? 0.95 : 0.4}"/>`;
        out += line([sx + 28, sy + 8], [sx + 48, sy + 8], `stroke="${WHITE}" stroke-opacity="0.25"`);
      }
      // Portal hub.
      out += `<circle cx="${f1(hub[0])}" cy="${f1(hub[1])}" r="12" fill="${mix(0.28)}" stroke="${WHITE}" stroke-opacity="0.9"/>`;
      out += `<circle cx="${f1(hub[0])}" cy="${f1(hub[1])}" r="4" fill="${WHITE}"/>`;
      // Storage.
      const st = [hub[0], cy + 44];
      out += line([hub[0], hub[1] + 12], [st[0], st[1] - 12], `stroke="${INKS}" stroke-opacity="0.55" pathLength="1"`);
      out += `<path d="M${f1(st[0] - 14)},${f1(st[1] - 8)} L${f1(st[0] - 14)},${f1(st[1] + 10)} A14,4 0 0 0 ${f1(st[0] + 14)},${f1(st[1] + 10)} L${f1(st[0] + 14)},${f1(st[1] - 8)}" fill="${mix(0.14)}" stroke="${INKS}" stroke-opacity="0.85" stroke-width="0.9"/>`;
      out += `<ellipse cx="${f1(st[0])}" cy="${f1(st[1] - 8)}" rx="14" ry="4" fill="${mix(0.3)}" stroke="${INKS}" stroke-opacity="0.85" stroke-width="0.9"/>`;
      // Machine learning network.
      const nx = vx + vw + 34 * u, layers = [3, 4, 2], gapX = 26 * Math.min(1.6, u);
      const nodes = layers.map((n, li) => Array.from({ length: n }, (_, k) => [nx + li * gapX, cy - 12 + (k - (n - 1) / 2) * 20]));
      out += `<path d="M${f1(hub[0] + 12)},${f1(hub[1])} L${f1(nodes[0][1][0] - 4)},${f1(nodes[0][1][1])}" pathLength="1" fill="none" stroke="${INKS}" stroke-opacity="0.6"/>`;
      for (let li = 0; li < nodes.length - 1; li++) for (const a of nodes[li]) for (const b of nodes[li + 1]) out += line(a, b, `stroke="${INKS}" stroke-opacity="0.25" stroke-width="0.7"`);
      nodes.forEach((layer, li) => layer.forEach(([x, y]) => {
        out += `<circle cx="${f1(x)}" cy="${f1(y)}" r="3.4" fill="${li === nodes.length - 1 ? WHITE : mix(0.2)}" stroke="${INKS}" stroke-opacity="0.9" stroke-width="0.9"/>`;
      }));
      // Alert broadcast from the output.
      const out0 = nodes[2][0];
      for (let k = 1; k <= 3; k++) out += `<path d="M${f1(out0[0] + 8 + k * 5)},${f1(out0[1] - k * 5)} A${k * 7},${k * 7} 0 0 1 ${f1(out0[0] + 8 + k * 5)},${f1(out0[1] + k * 5)}" fill="none" stroke="${WHITE}" stroke-opacity="${f1(0.8 - k * 0.2)}"/>`;

      const fx = fxKit(seed);
      let g = fx.clock(3.4);
      g += fx.travel(deploy, 0, 0.6, 2.6, INKS);
      links.forEach((d, k) => { g += fx.travel(d, 0.55 + k * 0.12, 0.8); });
      g += fx.ping(hub[0], hub[1], 12, 28, 1.35, 0.8, WHITE);
      g += fx.travel(`M${f1(hub[0])},${f1(hub[1] + 12)} L${f1(st[0])},${f1(st[1] - 12)}`, 1.45, 0.5);
      g += fx.travel(`M${f1(hub[0] + 12)},${f1(hub[1])} L${f1(nodes[0][1][0] - 4)},${f1(nodes[0][1][1])}`, 1.45, 0.6);
      nodes.forEach((layer, li) => layer.forEach(([x, y]) => { g += fx.ping(x, y, 3.4, 11, 2.0 + li * 0.2, 0.6, li === nodes.length - 1 ? WHITE : INKS); }));
      for (let k = 1; k <= 3; k++) g += fx.flash("path", `d="M${f1(out0[0] + 8 + k * 5)},${f1(out0[1] - k * 5)} A${k * 7},${k * 7} 0 0 1 ${f1(out0[0] + 8 + k * 5)},${f1(out0[1] + k * 5)}" fill="none" stroke="${WHITE}" stroke-width="1.6"`, 2.6 + k * 0.12, 0.6, 1);
      out += `<g class="fx">${g}</g>`;
      return out;
    },

    /* Standing up a GIS programme: company sites with proximity buffers; events
       that fall inside a buffer are flagged and linked to the site. */
    proximity(seed, W, H) {
      const r = rng(seed);
      let out = grat(W, H, 40, 0.045);
      const n = Math.max(3, Math.round(W / 120));
      const sites = Array.from({ length: n }, (_, i) => ({ x: (i + 0.5) * W / n + (r() - 0.5) * 30, y: H * (0.32 + r() * 0.36), rad: 26 + r() * 10 }));
      for (const s of sites) {
        out += `<circle cx="${f1(s.x)}" cy="${f1(s.y)}" r="${f1(s.rad * 1.7)}" fill="none" stroke="${INKS}" stroke-opacity="0.2" stroke-dasharray="2 4"/>`;
        out += `<circle cx="${f1(s.x)}" cy="${f1(s.y)}" r="${f1(s.rad)}" fill="${INKS}" fill-opacity="0.05" stroke="${INKS}" stroke-opacity="0.6" stroke-dasharray="3 3"/>`;
      }
      const events = Array.from({ length: Math.round(W / 11) }, () => [r() * W, 10 + r() * (H - 20)]);
      // Make sure a few events land inside the buffers.
      sites.forEach((s, i) => { if (i % 2 === 0) { const a = r() * Math.PI * 2, d = s.rad * (0.35 + r() * 0.5); events.push([s.x + Math.cos(a) * d, s.y + Math.sin(a) * d]); } });
      let hits = "", rest = "";
      const fx = fxKit(seed);
      let g = fx.clock(2.4);
      sites.forEach((s, i) => { g += fx.ping(s.x, s.y, s.rad, s.rad * 1.9, i * 0.18, 1.1, INKS); });
      let hitN = 0;
      for (const [ex, ey] of events) {
        const near = sites.find((s) => Math.hypot(ex - s.x, ey - s.y) < s.rad);
        if (near) {
          g += fx.ping(ex, ey, 2.5, 12, 0.7 + hitN * 0.2, 0.7, INKS);
          g += fx.travel(`M${f1(ex)},${f1(ey)} L${f1(near.x)},${f1(near.y)}`, 0.95 + hitN * 0.2, 0.6, 2.2);
          hitN++;
          hits += line([near.x, near.y], [ex, ey], `stroke="${INKS}" stroke-opacity="0.8" stroke-width="0.9" pathLength="1"`);
          hits += `<circle cx="${f1(ex)}" cy="${f1(ey)}" r="6.5" fill="none" stroke="${INKS}" stroke-opacity="0.6"/>`;
          hits += `<circle cx="${f1(ex)}" cy="${f1(ey)}" r="2.5" fill="${INKS}"/>`;
        } else {
          rest += `<circle cx="${f1(ex)}" cy="${f1(ey)}" r="1.6" fill="${WHITE}" fill-opacity="0.3"/>`;
        }
      }
      out += rest + hits;
      for (const s of sites) out += `<rect x="${f1(s.x - 3.5)}" y="${f1(s.y - 3.5)}" width="7" height="7" fill="${WHITE}"/>`;
      out += `<g class="fx">${g}</g>`;
      return out;
    },

    /* Incident dashboards: a road network with hatched high-risk zones; a cargo
       truck's route runs along the roads, and a warning marks where it enters a zone. */
    cargo(seed, W, H) {
      const r = rng(seed);
      const id = "hz" + (seed % 100000);
      let out = `<defs><pattern id="${id}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="${INKS}" stroke-opacity="0.4" stroke-width="1"/></pattern></defs>`;
      out += grat(W, H, 40, 0.045);
      // Road network: straight segments on a loose grid.
      const cols = Array.from({ length: Math.round(W / 90) + 1 }, (_, i) => i * W / Math.round(W / 90) + (r() - 0.5) * 20);
      const rowsY = [H * 0.24, H * 0.52, H * 0.8].map((y) => y + (r() - 0.5) * 12);
      const road = `stroke="${WHITE}" stroke-opacity="0.07" stroke-width="2"`;
      for (const y of rowsY) out += line([0, y], [W, y + (r() - 0.5) * 16], road);
      for (const x of cols) out += line([x, 0], [x + (r() - 0.5) * 30, H], road);
      // High-risk zones.
      const blob = (cx, cy, rad) => {
        const p = [];
        for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2, rr = rad * (0.78 + r() * 0.35); p.push([cx + Math.cos(a) * rr * 1.3, cy + Math.sin(a) * rr]); }
        return p;
      };
      const zone = { x: W * 0.62, y: rowsY[1], rad: 46 };
      const zones = [zone, { x: W * 0.22, y: rowsY[0] - 4, rad: 20 }, { x: W * 0.86, y: rowsY[2], rad: 20 }];
      if (W > 600) zones.push({ x: W * 0.38, y: rowsY[2] + 6, rad: 22 });
      for (const z of zones) out += `<polygon points="${pts(blob(z.x, z.y, z.rad))}" fill="url(#${id})" stroke="${INKS}" stroke-opacity="0.65" stroke-width="0.9" stroke-linejoin="round"/>`;
      // The route: along the top road, down a cross street, then along the middle road through the zone.
      const turnX = cols[Math.max(1, Math.floor(cols.length * 0.35))];
      const route = [[0, rowsY[0]], [turnX, rowsY[0]], [turnX, rowsY[1]], [W, rowsY[1]]];
      out += `<polyline points="${pts(route)}" pathLength="1" fill="none" stroke="${INKS}" stroke-width="1.6" stroke-linejoin="round"/>`;
      // Trucks along the route; the one entering the zone is highlighted.
      const entryX = zone.x - zone.rad * 1.3 * 0.85, ey = rowsY[1];
      const truck = (x, y, hot) => `<rect x="${f1(x - 8)}" y="${f1(y - 4.5)}" width="16" height="9" rx="1.5" fill="${hot ? WHITE : mix(0.35)}" stroke="${hot ? WHITE : INKS}" stroke-opacity="0.9" stroke-width="0.8"/>`;
      const fx = fxKit(seed), drive = 2.3;
      out += truck(turnX * 0.45, rowsY[0], false);
      out += `<g>${truck(entryX, ey, true)}${fx.hide(0, drive)}</g>`;
      // Warning at the zone boundary, with the alert going out.
      const wx = entryX, wy = ey - 30;
      out += line([wx, ey - 5], [wx, wy + 4], `stroke="${WHITE}" stroke-opacity="0.6" stroke-dasharray="2 2"`);
      out += `<polygon points="${pts([[wx, wy - 12], [wx + 12, wy + 8], [wx - 12, wy + 8]])}" fill="${BGS}" stroke="${WHITE}" stroke-width="1.4" stroke-linejoin="round"/>`;
      out += line([wx, wy - 5], [wx, wy + 1.5], `stroke="${WHITE}" stroke-width="1.8" stroke-linecap="round"`);
      out += `<circle cx="${f1(wx)}" cy="${f1(wy + 4.8)}" r="1.1" fill="${WHITE}"/>`;
      out += `<path d="M${f1(wx + 15)},${f1(wy - 4)} L${f1(wx + 26)},${f1(wy - 10)}" pathLength="1" fill="none" stroke="${INKS}" stroke-opacity="0.8"/>`;
      out += `<rect x="${f1(wx + 26)}" y="${f1(wy - 18)}" width="30" height="16" rx="2" fill="${BGS}" stroke="${INKS}" stroke-opacity="0.8" stroke-width="0.8"/>`;
      out += line([wx + 31, wy - 12], [wx + 51, wy - 12], `stroke="${WHITE}" stroke-opacity="0.6"`);
      out += line([wx + 31, wy - 7], [wx + 43, wy - 7], `stroke="${WHITE}" stroke-opacity="0.35"`);

      let g = fx.clock(drive + 1.3);
      const path = `M0,${f1(rowsY[0])} L${f1(turnX)},${f1(rowsY[0])} L${f1(turnX)},${f1(rowsY[1])} L${f1(entryX)},${f1(ey)}`;
      g += `<g opacity="0"><rect x="-8" y="-4.5" width="16" height="9" rx="1.5" fill="${WHITE}"/><animateMotion path="${path}" begin="${fx.at(0)}" dur="${drive}s" calcMode="spline" keyTimes="0;1" keySplines="0.4 0 0.25 1"/><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.05;0.98;1" begin="${fx.at(0)}" dur="${drive}s"/></g>`;
      g += fx.ping(entryX, ey, 8, 38, drive, 0.9, WHITE);
      g += fx.ping(entryX, ey, 8, 30, drive + 0.25, 0.9, INKS);
      g += fx.flash("polygon", `points="${pts([[wx, wy - 12], [wx + 12, wy + 8], [wx - 12, wy + 8]])}" fill="${WHITE}"`, drive + 0.1, 0.8, 0.55);
      g += fx.flash("rect", `x="${f1(wx + 26)}" y="${f1(wy - 18)}" width="30" height="16" rx="2" fill="${INKS}"`, drive + 0.35, 0.8, 0.45);
      out += `<g class="fx">${g}</g>`;
      return out;
    }
  };

  window.PROJECT_FIGURES = FIGURES;
})();
