/* Рисовальный движок: дрожащие линии, штриховка, бумажное зерно.
   Всё рисуется процедурно на canvas — никаких картинок. */
(function () {
  'use strict';

  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  // Цвет: смешивание и затемнение для теней
  function hex(c) {
    c = c.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const n = parseInt(c, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function toHex(r, g, b) {
    return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  }
  function mix(a, b, t) {
    const A = hex(a), B = hex(b);
    return toHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
  }
  function shade(c, t) { return t < 0 ? mix(c, '#1a120c', -t) : mix(c, '#fff3dc', t); }

  const INK = '#22170f';

  class Sketch {
    constructor(ctx, seed, opts) {
      this.ctx = ctx;
      this.r = rng(seed);
      // структурный генератор: одинаков для всех кадров «дрожания»
      this.s = rng((opts && opts.structSeed != null) ? opts.structSeed : seed + 99);
      this.wob = (opts && opts.wobble != null) ? opts.wobble : 1;
    }
    rand(a, b) { return a + (b - a) * this.r(); }
    srand(a, b) { return a + (b - a) * this.s(); }

    // Сглаженная случайная функция для неровности контура
    noise1(n) {
      const pts = [];
      for (let i = 0; i < n; i++) pts.push(this.r() * 2 - 1);
      return function (t) {
        const x = ((t % 1) + 1) % 1 * n;
        const i = Math.floor(x), f = x - i;
        const a = pts[i % n], b = pts[(i + 1) % n];
        const s = f * f * (3 - 2 * f);
        return a + (b - a) * s;
      };
    }

    // Эллипс-клякса с гармониками: основа для голов, носов, глаз
    blob(cx, cy, rx, ry, o) {
      o = o || {};
      const n = o.n || 48;
      const irr = (o.irr != null ? o.irr : 0.06) * this.wob;
      const ph = [this.s() * 6.28, this.s() * 6.28, this.s() * 6.28];
      const pts = [];
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2;
        let k = 1 + irr * (Math.sin(a * 2 + ph[0]) * 0.5 + Math.sin(a * 3 + ph[1]) * 0.35 + Math.sin(a * 5 + ph[2]) * 0.2);
        let x = Math.cos(a), y = Math.sin(a);
        if (o.squareness) { // скругленный квадрат
          const p = 2 + o.squareness * 6;
          x = Math.sign(x) * Math.pow(Math.abs(x), 2 / p);
          y = Math.sign(y) * Math.pow(Math.abs(y), 2 / p);
        }
        if (o.taper) { // сужение книзу (груша) или кверху
          const t = (y + 1) / 2;
          x *= 1 + o.taper * (t - 0.5);
        }
        if (o.flatTop && y < 0) y *= 1 - o.flatTop;
        pts.push([cx + x * rx * k, cy + y * ry * k]);
      }
      if (o.rot) return rotatePts(pts, cx, cy, o.rot);
      return pts;
    }

    // Дрожание точек: смещает каждую точку немного
    jitter(pts, amt) {
      amt = (amt == null ? 1.2 : amt) * this.wob;
      return pts.map(p => [p[0] + (this.r() - 0.5) * amt * 2, p[1] + (this.r() - 0.5) * amt * 2]);
    }

    trace(pts, closed) {
      const c = this.ctx;
      const n = pts.length;
      if (n < 2) return;
      c.beginPath();
      if (closed) {
        const m0 = mid(pts[n - 1], pts[0]);
        c.moveTo(m0[0], m0[1]);
        for (let i = 0; i < n; i++) {
          const p = pts[i], m = mid(p, pts[(i + 1) % n]);
          c.quadraticCurveTo(p[0], p[1], m[0], m[1]);
        }
        c.closePath();
      } else {
        c.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < n - 1; i++) {
          const m = mid(pts[i], pts[i + 1]);
          c.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]);
        }
        c.lineTo(pts[n - 1][0], pts[n - 1][1]);
      }
    }

    fill(pts, color, closed) {
      const c = this.ctx;
      this.trace(this.jitter(densify(pts, closed !== false, 12), 0.6), closed !== false);
      c.fillStyle = color;
      c.fill();
    }

    // Неровный «живой» контур: несколько проходов с разной толщиной
    stroke(pts, o) {
      o = o || {};
      const c = this.ctx;
      const closed = o.closed !== false;
      const w = o.w || 3;
      const color = o.color || INK;
      const passes = o.passes || 2;
      pts = densify(pts, closed, 9);
      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.strokeStyle = color;
      for (let p = 0; p < passes; p++) {
        let P = this.jitter(pts, (o.jit || 1.3) * (p ? 1.6 : 1));
        if (closed && p > 0) {
          // второй проход не замыкается полностью: заходит дальше и обрывается
          const start = Math.floor(this.r() * P.length);
          const len = Math.floor(P.length * this.rand(0.55, 0.95));
          const Q = [];
          for (let i = 0; i < len; i++) Q.push(P[(start + i) % P.length]);
          P = Q;
          c.globalAlpha = (o.alpha || 1) * 0.55;
          c.lineWidth = w * this.rand(0.35, 0.6);
          this.trace(P, false);
          c.stroke();
        } else {
          c.globalAlpha = o.alpha || 1;
          this.varStroke(P, closed, w, o.taperEnds);
        }
      }
      c.globalAlpha = 1;
    }

    // Линия переменной толщины: разбиваем на куски
    varStroke(P, closed, w, taperEnds) {
      const c = this.ctx;
      const n = P.length;
      const segs = closed ? n : n - 1;
      const thick = this.noise1(5);
      const pts = closed ? P.concat([P[0]]) : P;
      // сглаженные промежуточные точки
      const sm = [];
      for (let i = 0; i < pts.length; i++) {
        if (i === 0 || i === pts.length - 1) { sm.push(pts[i]); continue; }
        const a = pts[i - 1], b = pts[i], d = pts[i + 1];
        sm.push([(a[0] + b[0] * 2 + d[0]) / 4, (a[1] + b[1] * 2 + d[1]) / 4]);
      }
      for (let i = 0; i < segs; i++) {
        const t = i / segs;
        let ww = w * (0.75 + 0.45 * thick(t));
        if (taperEnds && !closed) ww *= Math.min(1, 0.25 + Math.sin(t * Math.PI) * 1.4);
        c.lineWidth = Math.max(0.4, ww);
        c.beginPath();
        c.moveTo(sm[i][0], sm[i][1]);
        c.lineTo(sm[i + 1][0], sm[i + 1][1]);
        c.stroke();
      }
    }

    line(x1, y1, x2, y2, o) {
      o = Object.assign({ closed: false }, o || {});
      const n = Math.max(3, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 10));
      const pts = [];
      const bend = (o.bend || 0);
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const b = Math.sin(t * Math.PI) * bend;
        const nx = -(y2 - y1), ny = (x2 - x1), L = Math.hypot(nx, ny) || 1;
        pts.push([x1 + (x2 - x1) * t + nx / L * b, y1 + (y2 - y1) * t + ny / L * b]);
      }
      this.stroke(pts, o);
    }

    curve(pts, o) {
      // pts — опорные точки, сглаживаем Катмулл-Ромом
      const out = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
        const steps = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 8));
        for (let s = 0; s < steps; s++) {
          const t = s / steps, t2 = t * t, t3 = t2 * t;
          out.push([
            0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
            0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
          ]);
        }
      }
      out.push(pts[pts.length - 1]);
      return out;
    }

    // Залить и обвести
    shape(pts, fillColor, o) {
      o = o || {};
      if (fillColor) this.fill(pts, fillColor, o.closed);
      if (o.shadeSide) this.shadeInside(pts, fillColor, o.shadeSide, o.shadeAmt || 0.25);
      if (o.hatch) this.hatch(pts, o.hatch);
      if (o.w !== 0) this.stroke(pts, o);
    }

    clip(pts, fn) {
      const c = this.ctx;
      c.save();
      this.trace(pts, true);
      c.clip();
      fn();
      c.restore();
    }

    // Тень внутри формы: смещённая тёмная копия
    shadeInside(pts, base, side, amt) {
      const bb = bbox(pts);
      const dx = side[0] * (bb.w * 0.22), dy = side[1] * (bb.h * 0.22);
      this.clip(pts, () => {
        const c = this.ctx;
        c.save();
        c.translate(-dx, -dy);
        c.globalAlpha = 0.85;
        // инвертированная маска: всё вне смещённой формы — тень
        c.beginPath();
        c.rect(bb.x - bb.w - Math.abs(dx), bb.y - bb.h - Math.abs(dy), bb.w * 3 + Math.abs(dx) * 2, bb.h * 3 + Math.abs(dy) * 2);
        const P = pts.map(p => [p[0] + this.rand(-1, 1), p[1] + this.rand(-1, 1)]);
        // путь против часовой для «дырки»
        const rev = P.slice().reverse();
        c.moveTo(rev[0][0], rev[0][1]);
        for (let i = 1; i < rev.length; i++) c.lineTo(rev[i][0], rev[i][1]);
        c.closePath();
        c.fillStyle = shade(base || '#888888', -amt);
        c.fill('evenodd');
        c.restore();
      });
    }

    // Штриховка внутри формы
    hatch(pts, o) {
      o = o || {};
      const bb = bbox(pts);
      const ang = (o.angle != null ? o.angle : -0.9) + this.rand(-0.08, 0.08);
      const gap = o.gap || 5;
      const c = this.ctx;
      const region = o.region; // функция (x,y)=>bool — только часть формы
      this.clip(pts, () => {
        c.strokeStyle = o.color || INK;
        c.lineCap = 'round';
        const cx = bb.x + bb.w / 2, cy = bb.y + bb.h / 2;
        const R = Math.hypot(bb.w, bb.h) / 2 + 4;
        const ca = Math.cos(ang), sa = Math.sin(ang);
        for (let d = -R; d < R; d += gap * this.rand(0.8, 1.25)) {
          const L = R * this.rand(0.85, 1);
          let x1 = cx + ca * -L - sa * d, y1 = cy + sa * -L + ca * d;
          let x2 = cx + ca * L - sa * d, y2 = cy + sa * L + ca * d;
          if (region) {
            // режем линию на участки, где region истинна
            const steps = 24;
            let on = false, sx = 0, sy = 0;
            for (let s = 0; s <= steps; s++) {
              const t = s / steps, x = x1 + (x2 - x1) * t, y = y1 + (y2 - y1) * t;
              const ok = region(x, y, this.r);
              if (ok && !on) { on = true; sx = x; sy = y; }
              if ((!ok || s === steps) && on) {
                on = false;
                this.hline(sx, sy, x, y, o);
              }
            }
          } else this.hline(x1, y1, x2, y2, o);
        }
      });
      if (o.cross && !o._x) this.hatch(pts, Object.assign({}, o, { angle: ang + 1.25, _x: true, alpha: (o.alpha || 0.5) * 0.8, region: o.crossRegion || o.region }));
    }
    hline(x1, y1, x2, y2, o) {
      const c = this.ctx;
      if (o.dash) {
        // карандашные штрихи: линия рвётся на куски
        const L = Math.hypot(x2 - x1, y2 - y1);
        let t = 0;
        while (t < L) {
          const seg = this.rand(8, 22), gap = this.rand(2, 9);
          const t2 = Math.min(L, t + seg);
          this.hline(x1 + (x2 - x1) * t / L, y1 + (y2 - y1) * t / L, x1 + (x2 - x1) * t2 / L, y1 + (y2 - y1) * t2 / L, Object.assign({}, o, { dash: false }));
          t = t2 + gap;
        }
        return;
      }
      c.globalAlpha = (o.alpha || 0.5) * this.rand(0.6, 1);
      c.lineWidth = (o.w || 1.2) * this.rand(0.7, 1.3);
      const mx = (x1 + x2) / 2 + this.rand(-1.5, 1.5), my = (y1 + y2) / 2 + this.rand(-1.5, 1.5);
      c.beginPath();
      c.moveTo(x1 + this.rand(-1, 1), y1 + this.rand(-1, 1));
      c.quadraticCurveTo(mx, my, x2 + this.rand(-1, 1), y2 + this.rand(-1, 1));
      c.stroke();
      c.globalAlpha = 1;
    }

    // Мягкое пятно (румянец, свечение)
    spot(x, y, r, color, alpha) {
      const c = this.ctx;
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      const [R, G, B] = hex(color);
      g.addColorStop(0, `rgba(${R},${G},${B},${alpha})`);
      g.addColorStop(1, `rgba(${R},${G},${B},0)`);
      c.fillStyle = g;
      c.fillRect(x - r, y - r, r * 2, r * 2);
    }

    dots(x, y, r, count, color, size) {
      const c = this.ctx;
      c.fillStyle = color;
      for (let i = 0; i < count; i++) {
        const a = this.s() * 6.28, d = Math.sqrt(this.s()) * r, al = this.srand(0.3, 0.8), sz = this.srand(0.6, 1.3);
        c.globalAlpha = al;
        c.beginPath();
        c.arc(x + Math.cos(a) * d + this.rand(-0.4, 0.4), y + Math.sin(a) * d * 0.8, (size || 1.2) * sz, 0, 6.28);
        c.fill();
      }
      c.globalAlpha = 1;
    }

    // Каракули — тёмный фон, волосы
    scribble(x, y, w, h, o) {
      o = o || {};
      const c = this.ctx;
      const n = o.n || 30;
      c.strokeStyle = o.color || INK;
      c.lineCap = 'round';
      for (let i = 0; i < n; i++) {
        c.globalAlpha = (o.alpha || 0.25) * this.srand(0.5, 1);
        c.lineWidth = (o.w || 1.5) * this.srand(0.6, 1.4);
        const x0 = x + this.s() * w, y0 = y + this.s() * h;
        c.beginPath();
        c.moveTo(x0, y0);
        let px = x0, py = y0;
        for (let k = 0; k < 4; k++) {
          const nx = px + this.srand(-1, 1) * (o.len || 30), ny = py + this.srand(-1, 1) * (o.len || 30) * 0.6;
          c.quadraticCurveTo(px + this.srand(-10, 10) + this.rand(-1.5, 1.5), py + this.srand(-10, 10), nx, ny);
          px = nx; py = ny;
        }
        c.stroke();
      }
      c.globalAlpha = 1;
    }
  }

  // Разбиваем длинные рёбра, чтобы контур дрожал равномерно
  function densify(pts, closed, step) {
    const out = [];
    const n = pts.length, m = closed ? n : n - 1;
    for (let i = 0; i < m; i++) {
      const a = pts[i], b = pts[(i + 1) % n];
      const k = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
      for (let j = 0; j < k; j++) out.push([a[0] + (b[0] - a[0]) * j / k, a[1] + (b[1] - a[1]) * j / k]);
    }
    if (!closed) out.push(pts[n - 1]);
    return out;
  }
  function mid(a, b) { return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; }
  function bbox(pts) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const p of pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }
  function rotatePts(pts, cx, cy, a) {
    const ca = Math.cos(a), sa = Math.sin(a);
    return pts.map(p => [cx + (p[0] - cx) * ca - (p[1] - cy) * sa, cy + (p[0] - cx) * sa + (p[1] - cy) * ca]);
  }

  // Бумажная текстура: волокна + зерно. Генерируется один раз.
  let grainCache = null;
  function grainCanvas() {
    if (grainCache) return grainCache;
    const S = 256;
    const cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const c = cv.getContext('2d');
    const img = c.createImageData(S, S);
    const r = rng(1234);
    for (let i = 0; i < S * S; i++) {
      const v = 128 + (r() - 0.5) * 90;
      img.data[i * 4] = v; img.data[i * 4 + 1] = v * 0.97; img.data[i * 4 + 2] = v * 0.9;
      img.data[i * 4 + 3] = 255;
    }
    c.putImageData(img, 0, 0);
    // волокна
    c.strokeStyle = 'rgba(60,40,20,0.12)';
    for (let i = 0; i < 160; i++) {
      c.lineWidth = r() * 1.2;
      const x = r() * S, y = r() * S, a = r() * 6.28, l = 4 + r() * 14;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke();
    }
    grainCache = cv;
    return cv;
  }

  function applyGrain(ctx, w, h, strength) {
    const g = grainCanvas();
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = strength == null ? 0.45 : strength;
    const pat = ctx.createPattern(g, 'repeat');
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, w, h);
    // крапины туши
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 0.35;
    const r = rng(Math.round(w * 7 + h));
    ctx.fillStyle = '#3a2614';
    for (let i = 0; i < (w * h) / 9000; i++) {
      ctx.beginPath();
      ctx.arc(r() * w, r() * h, r() * 1.4 + 0.3, 0, 6.28);
      ctx.fill();
    }
    ctx.restore();
  }

  function vignette(ctx, w, h, a) {
    const g = ctx.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
    g.addColorStop(0, 'rgba(20,12,6,0)');
    g.addColorStop(1, `rgba(20,12,6,${a == null ? 0.55 : a})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  // Бумага для фона страницы (CSS)
  function paperDataURL(base) {
    const S = 300;
    const cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const c = cv.getContext('2d');
    c.fillStyle = base || '#d9c7a3';
    c.fillRect(0, 0, S, S);
    applyGrain(c, S, S, 0.5);
    const r = rng(77);
    for (let i = 0; i < 14; i++) {
      const x = r() * S, y = r() * S, rad = 20 + r() * 60;
      const g = c.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, 'rgba(120,80,40,0.06)');
      g.addColorStop(1, 'rgba(120,80,40,0)');
      c.fillStyle = g; c.fillRect(0, 0, S, S);
    }
    try { return cv.toDataURL('image/png'); } catch (e) { return ''; }
  }

  window.SK = { rng, hashStr, mix, shade, hex, Sketch, INK, applyGrain, vignette, paperDataURL, bbox, rotatePts };
})();
