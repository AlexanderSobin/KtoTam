/* Портреты гостей. Каждый персонаж описан набором параметров,
   а рисуется заново дрожащими линиями (3 кадра «кипения» + моргание). */
(function () {
  'use strict';
  const { Sketch, mix, shade, INK, applyGrain, vignette, hashStr } = SK;

  const DEF = {
    skin: '#d6a47c',
    head: { shape: 'egg', w: 100, h: 125, y: 215, squareness: 0, taper: 0, flatTop: 0, tilt: 0 },
    eyes: { size: 1, gap: 40, y: -6, droop: 0, bags: 0.3, lid: 0.15, iris: '#6b5a3a', look: 0, lookY: 0, asym: 0, white: '#eee2c4', lashes: 0 },
    brows: { style: 'normal', thick: 1, tilt: 0, y: -30, color: null },
    nose: { type: 'long', size: 1, y: 30, tip: 0 },
    mouth: { type: 'flat', w: 1, y: 70, lips: null },
    ears: { size: 1, stick: 0 },
    hair: { style: 'crew', color: '#3b2a1e', line: 0.42 },
    hat: { type: 'none', color: '#4c3b2a' },
    face: { mustache: 'none', beard: 'none', fcolor: null, wrinkles: 0.2, freckles: 0, blush: 0.25, moles: 0, stubble: 0, sweat: 0, pimples: 0, chin: 0, cheekbones: 0 },
    glasses: 'none',
    clothes: { type: 'coat', color: '#5b5040', color2: null, pattern: null },
    acc: [],
    neck: { w: 30, len: 1 },
    bg: '#2a221d',
    glow: '#e8b85a',
    tells: [], decoys: []
  };

  function deepMerge(a, b) {
    const o = Array.isArray(a) ? a.slice() : Object.assign({}, a);
    if (!b) return o;
    for (const k in b) {
      if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') o[k] = deepMerge(a[k], b[k]);
      else o[k] = b[k];
    }
    return o;
  }
  function norm(spec) {
    if (spec.__n) return spec;
    const s = deepMerge(DEF, spec);
    s.__n = true;
    s.seed = hashStr(spec.id || 'x');
    return s;
  }

  const has = (s, k) => s.acc.indexOf(k) >= 0;
  const tell = (s, k) => s.tells.indexOf(k) >= 0;
  const decoy = (s, k) => s.decoys.indexOf(k) >= 0;

  // ---------- Фон: дверной проём, свет фонаря ----------
  function background(k, s, W, H) {
    const c = k.ctx;
    c.fillStyle = s.bg; c.fillRect(0, 0, W, H);
    if (s.sunset) {
      // закат над пустыней и плоские столовые горы
      const gr = c.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, '#3a1a14'); gr.addColorStop(0.45, '#b4482a'); gr.addColorStop(0.7, '#e8923a'); gr.addColorStop(1, '#5a2a14');
      c.fillStyle = gr; c.fillRect(0, 0, W, H);
      k.scribble(0, 0, W, H * 0.5, { n: 20, color: '#2a0e08', alpha: 0.25, len: 70, w: 3 });
      k.shape([[0, 330], [60, 320], [70, 290], [130, 288], [140, 330], [260, 325], [275, 300], [320, 298], [330, 330], [400, 332], [400, 500], [0, 500]], '#3a1a10', { w: 2.5, hatch: { angle: 0.1, gap: 6, alpha: 0.3 } });
      return;
    }
    k.spot(W * 0.3, H * 0.05, W * 0.9, s.glow, 0.35);
    k.spot(W * 0.75, H * 0.25, W * 0.4, s.glow, 0.12);
    k.scribble(0, 0, W, H, { n: 40, color: '#0d0907', alpha: 0.25, len: 60, w: 3 });
    // косяки двери
    const fc = '#4a3422';
    const L = [[0, 0], [38, 0], [42, H], [0, H]];
    const R = [[W - 40, 0], [W, 0], [W, H], [W - 36, H]];
    k.shape(L, fc, { hatch: { angle: 1.45, gap: 6, alpha: 0.35 }, w: 3 });
    k.shape(R, fc, { hatch: { angle: 1.6, gap: 6, alpha: 0.35 }, w: 3 });
    k.line(18, 10, 20, H - 10, { w: 1.2, alpha: 0.5 });
    k.line(W - 18, 20, W - 20, H - 20, { w: 1.2, alpha: 0.5 });
  }

  // ---------- Тело ----------
  function body(k, s) {
    const hy = s.head.y, ry = s.head.h;
    const top = hy + ry * 0.92;
    const cl = s.clothes;
    const sw = 150 + (cl.wide || 0);
    // шея
    const nw = s.neck.w;
    const neck = [[200 - nw, hy + ry * 0.55], [200 + nw, hy + ry * 0.55], [200 + nw * 1.1, top + 30], [200 - nw * 1.1, top + 30]];
    k.shape(neck, shade(s.skin, -0.12), { w: 2.5, hatch: { angle: 0.4, gap: 4, alpha: 0.35, dash: true } });
    k.clip(neck, () => k.spot(200, hy + ry * 0.95, nw * 2.2, '#2a1810', 0.45));
    if (s.face.adam) k.curve && k.stroke(k.curve([[195, top - 5], [200, top - 12], [205, top - 5]]), { closed: false, w: 1.5 });
    // плечи
    const pts = k.curve([[200 - 40, top + 10], [200 - sw * 0.75, top + 40], [200 - sw, top + 95], [200 - sw - 15, 520]])
      .concat(k.curve([[200 + sw + 15, 520], [200 + sw, top + 95], [200 + sw * 0.75, top + 40], [200 + 40, top + 10]]));
    const col = cl.color;
    k.shape(pts, col, { w: 3.5, shadeSide: [1, 0.4], shadeAmt: 0.25, hatch: { angle: -0.6, gap: 5, alpha: 0.28, dash: true, cross: true, crossRegion: (x) => x > 200 + sw * 0.5 } });
    // детали одежды
    const t = cl.type;
    if (t === 'coat' || t === 'raincoat' || t === 'uniform') {
      const lap = shade(col, t === 'raincoat' ? 0.12 : -0.12);
      const l1 = [[200 - 40, top + 8], [200 - 70, top + 40], [200 - 30, top + 140], [200 - 4, top + 170], [200 - 10, top + 30]];
      const l2 = [[200 + 40, top + 8], [200 + 70, top + 40], [200 + 30, top + 140], [200 + 4, top + 170], [200 + 10, top + 30]];
      // рубашка под пальто
      const sh = [[200 - 38, top + 10], [200 + 38, top + 10], [200 + 6, top + 175], [200 - 6, top + 175]];
      k.shape(sh, cl.color2 || '#c9bfa6', { w: 2 });
      k.shape(l1, lap, { w: 3 });
      k.shape(l2, lap, { w: 3 });
      if (t === 'uniform' || t === 'coat') for (let i = 0; i < 3; i++) {
        const by = top + 150 + i * 32;
        k.shape(k.blob(200 + 52, by, 5, 5), t === 'uniform' ? '#c9a24a' : shade(col, -0.35), { w: 1.6 });
      }
      if (t === 'uniform') {
        k.shape([[200 - sw * 0.8, top + 52], [200 - sw * 0.35, top + 32], [200 - sw * 0.33, top + 48], [200 - sw * 0.8, top + 70]], shade(col, -0.2), { w: 2 });
        k.shape([[200 + sw * 0.8, top + 52], [200 + sw * 0.35, top + 32], [200 + sw * 0.33, top + 48], [200 + sw * 0.8, top + 70]], shade(col, -0.2), { w: 2 });
      }
      if (t === 'raincoat') {
        // блики на мокрой ткани
        for (let i = 0; i < 6; i++) {
          const x = 200 + k.srand(-sw, sw) * 0.85, y = top + k.srand(60, 160);
          k.line(x, y, x + k.srand(-6, 6), y + k.srand(15, 30), { w: 2, color: '#e9e3cf', alpha: 0.5 });
        }
      }
    }
    if (cl.stripes) {
      for (let i = 0; i < 2; i++) {
        const y = top + 100 + i * 50;
        k.clip(pts, () => { k.line(0, y, 400, y + 6, { w: 11, color: '#d8c040', alpha: 0.9, jit: 1.5 }); k.line(0, y, 400, y + 6, { w: 4, color: '#e8e8d8', alpha: 0.8 }); });
      }
    }
    if (t === 'sweater') {
      const coll = k.blob(200, top + 18, 48, 20, { irr: 0.04 });
      k.shape(coll, shade(col, -0.15), { w: 2.5, hatch: { angle: 1.57, gap: 4, alpha: 0.4 } });
      if (cl.pattern === 'stripes') for (let i = 0; i < 3; i++) {
        const y = top + 80 + i * 40;
        k.clip(pts, () => k.line(0, y, 400, y + 4, { w: 9, color: cl.color2 || '#c4b48c', alpha: 0.75, jit: 2 }));
      }
      if (cl.pattern === 'zigzag') {
        const zz = [];
        for (let x = 30; x <= 370; x += 18) zz.push([x, top + 110 + ((x / 18) % 2 ? -10 : 10)]);
        k.clip(pts, () => k.stroke(zz, { closed: false, w: 4, color: cl.color2 || '#d9c79a' }));
      }
    } else if (t === 'shirt') {
      k.shape([[200 - 34, top + 6], [200 - 4, top + 40], [200 - 40, top + 50]], cl.color2 || shade(col, 0.2), { w: 2.5 });
      k.shape([[200 + 34, top + 6], [200 + 4, top + 40], [200 + 40, top + 50]], cl.color2 || shade(col, 0.2), { w: 2.5 });
      for (let i = 0; i < 3; i++) k.shape(k.blob(200, top + 60 + i * 35, 3.5, 3.5), '#e7dcc2', { w: 1.2 });
    } else if (t === 'dress') {
      const neckl = k.curve([[200 - 55, top + 15], [200, top + 70], [200 + 55, top + 15]]);
      k.shape(neckl, shade(s.skin, -0.08), { closed: true, w: 2.5 });
      if (cl.pattern === 'dots') k.clip(pts, () => {
        for (let i = 0; i < 40; i++) k.shape(k.blob(k.srand(30, 370), k.srand(top + 50, 500), 5, 5), cl.color2 || '#e8d9b0', { w: 0 });
      });
    } else if (t === 'robe') {
      k.stroke(k.curve([[200 - 40, top + 10], [200 + 20, top + 120], [200 + 30, 500]]), { closed: false, w: 3 });
    } else if (t === 'hazmat') {
      k.shape([[200 - 60, top + 30], [200 + 60, top + 30], [200 + 55, top + 75], [200 - 55, top + 75]], '#2b2b2b', { w: 2.5 });
      for (let i = 0; i < 4; i++) k.line(200 - 50 + i * 30, top + 40, 200 - 40 + i * 30, top + 65, { w: 3, color: '#e0b23a' });
    }
  }

  // ---------- Голова ----------
  function headPts(k, s) {
    const h = s.head;
    const shapes = {
      egg: { taper: -0.25, squareness: 0 },
      pear: { taper: 0.4, squareness: 0.1 },
      round: { taper: 0, squareness: 0 },
      square: { taper: 0.1, squareness: 0.28 },
      long: { taper: -0.15, squareness: 0.15 },
      bean: { taper: -0.4, squareness: 0 },
      onion: { taper: -0.5, squareness: 0.05, flatTop: 0 }
    };
    const o = Object.assign({}, shapes[h.shape] || shapes.egg);
    if (h.taper) o.taper = h.taper;
    if (h.squareness) o.squareness = h.squareness;
    o.flatTop = h.flatTop;
    o.irr = 0.045; o.n = 56;
    let p = k.blob(200, h.y, h.w, h.h, o);
    if (s.face.chin) p = p.map(q => (q[1] > h.y + h.h * 0.6 ? [q[0] + (200 - q[0]) * 0.08 * s.face.chin, q[1] + s.face.chin * 14 * ((q[1] - h.y - h.h * 0.6) / (h.h * 0.4))] : q));
    return p;
  }

  function ears(k, s) {
    const h = s.head, es = s.ears.size;
    for (const side of [-1, 1]) {
      const x = 200 + side * (h.w * 0.95 + s.ears.stick * 12), y = h.y + 8;
      const e = k.blob(x, y, 15 * es + s.ears.stick * 4, 24 * es, { irr: 0.1, rot: side * (0.15 + s.ears.stick * 0.3) });
      k.shape(e, shade(s.skin, -0.05), { w: 3 });
      k.stroke(k.curve([[x + side * -2, y - 12 * es], [x + side * 5, y - 2], [x - side * 1, y + 12 * es]]), { closed: false, w: 1.6 });
      if (has(s, 'earrings')) {
        k.shape(k.blob(x, y + 26 * es, 5, 7), '#d8b84a', { w: 1.6 });
      }
    }
  }

  function headFill(k, s, hp) {
    const h = s.head;
    k.fill(hp, s.skin);
    // тёплый свет фонаря сверху слева, холодная тень справа
    k.clip(hp, () => {
      k.spot(200 - h.w * 0.35, h.y - h.h * 0.35, h.w * 1.1, '#fff0d0', 0.28);
      k.spot(200 + h.w * 0.9, h.y + h.h * 0.5, h.w * 1.0, '#3a2a40', 0.3);
    });
    k.shadeInside(hp, s.skin, [0.55, 0.25], 0.2);
    k.hatch(hp, { angle: -1.0, gap: 4.5, alpha: 0.3, dash: true, cross: true, region: (x, y) => x > 200 + h.w * 0.42 + (y - h.y) * 0.15,
      crossRegion: (x, y) => x > 200 + h.w * 0.7 });
    // глазницы
    for (const side of [-1, 1]) {
      const ex = 200 + side * s.eyes.gap, ey = h.y + s.eyes.y;
      k.spot(ex, ey - 2, 30 * s.eyes.size * (s.face.sockets ? 1.5 : 1), '#3a1a1a', 0.22 + s.eyes.bags * 0.12 + (s.face.sockets || 0));
    }
    // тень под носом и подбородком
    k.spot(206, h.y + s.nose.y + 26, 22, '#3a2018', 0.18);
    // румянец
    if (s.face.blush > 0) {
      for (const side of [-1, 1]) k.spot(200 + side * s.eyes.gap * 1.25, h.y + 38, 26, '#c8553f', s.face.blush * 0.5);
    }
    if (s.face.cheekbones) for (const side of [-1, 1]) {
      k.stroke(k.curve([[200 + side * (h.w * 0.75), h.y + 10], [200 + side * (h.w * 0.6), h.y + 45], [200 + side * h.w * 0.35, h.y + 60]]), { closed: false, w: 1.4, alpha: 0.6 });
    }
    if (s.face.stubble) k.clip(hp, () => k.dots(200, h.y + h.h * 0.72, h.w * 0.7, Math.round(140 * s.face.stubble), mix(s.skin, '#2a2018', 0.65), 0.9));
    if (s.face.freckles) k.clip(hp, () => {
      for (const side of [-1, 1]) k.dots(200 + side * 42, h.y + 32, 22, Math.round(18 * s.face.freckles), '#8a4f2a', 1.6);
    });
    if (s.face.soot) k.clip(hp, () => {
      for (let i = 0; i < 7; i++) k.spot(200 + k.srand(-h.w * 0.8, h.w * 0.8), h.y + k.srand(-h.h * 0.6, h.h * 0.7), k.srand(10, 22), '#2a1a10', 0.35 * s.face.soot);
    });
    for (let i = 0; i < s.face.moles; i++) {
      const x = 200 + k.srand(-h.w * 0.6, h.w * 0.6), y = h.y + k.srand(20, 70);
      k.shape(k.blob(x, y, 3.2, 3.2), '#4a2f20', { w: 0 });
    }
    for (let i = 0; i < s.face.pimples; i++) {
      const x = 200 + k.srand(-h.w * 0.65, h.w * 0.65), y = h.y + k.srand(-50, 60);
      k.shape(k.blob(x, y, 3, 3), '#c4614b', { w: 0.8, alpha: 0.6 });
    }
    k.stroke(hp, { w: 4.2, jit: 1.2 });
    // морщины
    const wr = s.face.wrinkles;
    if (wr > 0.3) for (let i = 0; i < Math.round(wr * 4); i++) {
      const y = h.y - h.h * 0.55 + i * 9;
      k.stroke(k.curve([[200 - 35 + i * 3, y], [200, y - 4], [200 + 35 - i * 3, y]]), { closed: false, w: 1.3, alpha: 0.55 });
    }
    if (wr > 0.15) for (const side of [-1, 1]) {
      // носогубные складки
      const x = 200 + side * 30;
      k.stroke(k.curve([[x, h.y + 38], [x + side * 10, h.y + 60], [x + side * 8, h.y + 78 + wr * 10]]), { closed: false, w: 1.5 * wr + 0.6, alpha: 0.7 });
    }
  }

  // ---------- Глаза ----------
  // Общая функция: и для портрета, и для крупного плана
  function eye(k, s, x, y, sc, side, o) {
    o = o || {};
    const E = s.eyes;
    const rx = 16.5 * E.size * sc * (1 + (side > 0 ? E.asym : -E.asym) * 0.25), ry = 11.8 * E.size * sc * (1 + (side > 0 ? E.asym : -E.asym) * 0.3);
    const droop = E.droop * side;
    const sclera = k.blob(x, y, rx, ry, { irr: 0.05, rot: droop * 0.25, taper: 0.1 });
    const skin = s.skin;
    if (o.blink) {
      k.shape(sclera, shade(skin, -0.08), { w: 0 });
      k.stroke(k.curve([[x - rx, y], [x, y + ry * 0.35], [x + rx, y]]), { closed: false, w: 3 * sc * 0.8 + 1 });
      return;
    }
    const red = decoy(s, 'redEyes');
    const glass = decoy(s, 'glassEye') && side < 0;
    k.fill(sclera, red ? '#ecc8b3' : E.white);
    k.clip(sclera, () => {
      if (red) {
        for (let i = 0; i < 6; i++) {
          const a = k.srand(0, 6.28), L = rx * k.srand(0.5, 0.9);
          k.line(x + Math.cos(a) * rx, y + Math.sin(a) * ry, x + Math.cos(a) * (rx - L), y + Math.sin(a) * (ry - L * 0.6), { w: 0.8 * sc, color: '#b3412e', alpha: 0.8, bend: k.srand(-3, 3) });
        }
      }
      const ix = x + (o.lookX != null ? o.lookX : E.look) * rx * 0.35, iy = y + (E.lookY || 0) * ry * 0.3;
      const ir = ry * 0.9;
      const iris = glass ? '#7a8fa0' : E.iris;
      const ip = k.blob(ix, iy, ir, ir, { irr: 0.03 });
      k.fill(ip, iris);
      k.clip(ip, () => {
        // радиальные волокна радужки
        for (let i = 0; i < 14; i++) {
          const a = i / 14 * 6.28 + k.srand(-0.1, 0.1);
          k.line(ix + Math.cos(a) * ir * 0.35, iy + Math.sin(a) * ir * 0.35, ix + Math.cos(a) * ir, iy + Math.sin(a) * ir, { w: 0.6 * sc, color: shade(iris, -0.35), alpha: 0.6 });
        }
        k.spot(ix, iy + ir * 0.4, ir, '#000000', 0.25);
      });
      k.stroke(ip, { w: 1.1 * sc + 0.5, color: shade(iris, -0.55) });
      const ps = glass ? 1 : (o.pupil != null ? o.pupil : 1);
      const pr = ir * 0.42 * ps;
      if (tell(s, 'eyes') && !o.portrait && !glass && !(s.oneEye && side < 0)) {
        // двойной зрачок — главный признак «Посетителя»
        if (s.subtle) {
          // слабый признак: обычный зрачок и маленький «нарост» сбоку
          k.shape(k.blob(ix, iy, pr * 0.92, pr * 0.92, { irr: 0.03 }), '#0e0906', { w: 0 });
          k.shape(k.blob(ix + pr * 0.85, iy + pr * 0.2, pr * 0.42, pr * 0.45, { irr: 0.05 }), '#0e0906', { w: 0 });
        } else {
          const off = pr * 0.55;
          k.shape(k.blob(ix - off, iy, pr * 0.78, pr * 0.85, { irr: 0.05 }), '#0e0906', { w: 0 });
          k.shape(k.blob(ix + off, iy + pr * 0.12, pr * 0.7, pr * 0.78, { irr: 0.05 }), '#0e0906', { w: 0 });
        }
      } else if (decoy(s, 'oddPupil') && side > 0 && !glass) {
        // человеческая «замочная скважина»: зрачок вытянут вниз, но он один
        k.shape(k.blob(ix, iy + pr * 0.15, pr * 0.8, pr * 1.2, { irr: 0.04 }), '#0e0906', { w: 0 });
        k.shape(k.blob(ix, iy + pr * 1.15, pr * 0.32, pr * 0.42, { irr: 0.05 }), '#0e0906', { w: 0 });
      } else {
        k.shape(k.blob(ix, iy, pr, pr, { irr: 0.03 }), '#0e0906', { w: 0 });
      }
      if (glass) {
        k.stroke(k.blob(ix, iy, ir * 0.7, ir * 0.7), { w: 0.6 * sc, color: '#ffffff', alpha: 0.4 });
      }
      // блик
      k.shape(k.blob(ix - ir * 0.35, iy - ir * 0.4, ir * 0.2, ir * 0.17), '#fffaf0', { w: 0 });
      if (sc > 2) k.shape(k.blob(ix + ir * 0.3, iy + ir * 0.35, ir * 0.08, ir * 0.08), '#fffaf0', { w: 0, alpha: 0.7 });
      // тяжёлое веко
      const lid = E.lid;
      if (lid > 0) {
        const ly = y - ry + lid * ry * 1.1;
        const lp = [[x - rx * 1.4, y - ry * 2], [x + rx * 1.4, y - ry * 2], [x + rx * 1.4, ly + droop * ry * 0.4], [x, ly + ry * 0.12], [x - rx * 1.4, ly - droop * ry * 0.4]];
        k.fill(lp, shade(skin, -0.04));
        k.stroke(k.curve([[x - rx * 1.1, ly - droop * ry * 0.3], [x, ly + ry * 0.12], [x + rx * 1.1, ly + droop * ry * 0.3]]), { closed: false, w: 1.8 * sc * 0.6 + 1 });
      }
      k.spot(x, y - ry, rx, '#3a2010', 0.18);
    });
    // верхнее веко — жирная линия
    k.stroke(k.curve([[x - rx * 1.05, y + ry * 0.15], [x - rx * 0.5, y - ry * 1.0], [x + rx * 0.5, y - ry * 1.02], [x + rx * 1.08, y + ry * 0.05]]), { closed: false, w: 3.6 * sc * 0.75 + 0.8, taperEnds: true });
    // нижнее веко
    k.stroke(k.curve([[x - rx * 0.9, y + ry * 0.4], [x, y + ry * 1.02], [x + rx * 0.9, y + ry * 0.35]]), { closed: false, w: 1.6 * sc * 0.6 + 0.5, alpha: 0.85, taperEnds: true });
    if (E.lashes) for (let i = 0; i < 4; i++) {
      const t = (i + 1) / 5, lx = x - rx + t * rx * 2, ly = y - ry * Math.sin(t * Math.PI) * 1.0;
      k.line(lx, ly, lx + side * 3 * sc + (t - 0.5) * 6 * sc, ly - 6 * sc, { w: 1.3 * sc * 0.7 + 0.4 });
    }
    // мешки под глазами
    const bags = E.bags;
    if (bags > 0) {
      for (let i = 0; i < (bags > 0.5 ? 2 : 1); i++) {
        const by = y + ry * (1.45 + i * 0.5);
        k.stroke(k.curve([[x - rx * 0.8, by - ry * 0.2], [x, by + ry * 0.3], [x + rx * 0.9, by - ry * 0.25]]), { closed: false, w: 1.2 * sc * 0.6 + 0.4, alpha: 0.4 + bags * 0.4, taperEnds: true });
      }
      k.spot(x, y + ry * 1.5, rx * 0.9, '#5a2f40', bags * 0.2);
    }
  }

  function eyesAndBrows(k, s, o) {
    const h = s.head, E = s.eyes;
    const y = h.y + E.y;
    for (const side of [-1, 1]) {
      eye(k, s, 200 + side * E.gap, y + side * E.asym * 4, 1, side, o);
    }
    brows(k, s, y, 1);
  }

  function brows(k, s, ey, sc, cx) {
    cx = cx || 200;
    const B = s.brows, E = s.eyes;
    if (B.style === 'none') return;
    const col = B.color || shade(s.hair.color, -0.15);
    const gap = E.gap * sc;
    for (const side of [-1, 1]) {
      const x0 = cx + side * gap * 0.35, x1 = cx + side * gap * 1.45;
      const by = ey + B.y * sc;
      const inner = by + B.tilt * 10 * sc * -1, outer = by + B.tilt * 6 * sc;
      if (B.style === 'uni' && side === 1) {
        k.stroke(k.curve([[cx - gap * 0.4, by + 2 * sc], [cx, by + 4 * sc], [cx + gap * 0.4, by + 2 * sc]]), { closed: false, w: 6 * B.thick * sc, color: col });
      }
      const mid = [(x0 + x1) / 2, Math.min(inner, outer) - 5 * sc];
      const pts = k.curve([[x0, inner], mid, [x1, outer]]);
      if (B.style === 'bushy') {
        for (let i = 0; i < 9; i++) {
          const t = i / 8, p = pts[Math.min(pts.length - 1, Math.round(t * (pts.length - 1)))];
          k.line(p[0] - side * 3 * sc, p[1] + 3 * sc, p[0] + side * 4 * sc, p[1] - 5 * sc * B.thick, { w: 2.2 * sc, color: col });
        }
      }
      k.stroke(pts, { closed: false, w: (B.style === 'thin' ? 2.4 : 5.5) * B.thick * sc, color: col, taperEnds: true });
    }
  }

  // ---------- Нос ----------
  function nose(k, s) {
    const h = s.head, N = s.nose, sz = N.size * 1.15;
    const x = 200, top = h.y + s.eyes.y + 4, y = h.y + N.y;
    const ns = shade(s.skin, -0.12);
    const t = N.type;
    if (t === 'bulb' || t === 'potato') {
      const b = k.blob(x + 2, y + 6 * sz, 22 * sz, 18 * sz, { irr: 0.12 });
      k.shape(b, mix(s.skin, '#c66b54', 0.25), { w: 3, shadeSide: [0.5, 0.6], shadeAmt: 0.15 });
      k.spot(x + 8, y - 2, 8 * sz, '#fff6e0', 0.35);
      k.stroke(k.curve([[x - 10, top + 10], [x - 8, y - 14 * sz]]), { closed: false, w: 2, alpha: 0.7 });
      for (const side of [-1, 1]) k.shape(k.blob(x + side * 8 * sz, y + 16 * sz, 4 * sz, 2.5 * sz), '#3a2418', { w: 0 });
    } else if (t === 'button') {
      k.shape(k.blob(x, y, 9 * sz, 7 * sz), ns, { w: 2.2 });
      for (const side of [-1, 1]) k.shape(k.blob(x + side * 4, y + 4, 2, 1.5), '#3a2418', { w: 0 });
    } else if (t === 'hook') {
      const p = k.curve([[x - 4, top], [x + 6, y - 20 * sz], [x + 24 * sz, y + 6 * sz], [x + 10 * sz, y + 18 * sz], [x - 6, y + 14 * sz]]);
      k.shape(p, ns, { closed: false, w: 3.2 });
      k.stroke(k.curve([[x - 18 * sz, y + 10 * sz], [x - 12 * sz, y + 18 * sz], [x - 4, y + 15 * sz]]), { closed: false, w: 2.2 });
    } else if (t === 'wide') {
      const bridge = [[x - 9, top + 6], [x + 9, top + 6], [x + 14 * sz, y], [x - 14 * sz, y]];
      k.fill(bridge, ns);
      k.stroke(k.curve([[x - 8, top + 8], [x - 13 * sz, y - 2]]), { closed: false, w: 2.2, alpha: 0.7 });
      k.stroke(k.curve([[x + 8, top + 8], [x + 13 * sz, y - 2]]), { closed: false, w: 1.4, alpha: 0.4 });
      const b = k.blob(x, y + 8 * sz, 28 * sz, 15 * sz, { irr: 0.1, taper: 0.3 });
      k.shape(b, mix(s.skin, '#c66b54', 0.2), { w: 3, shadeSide: [0.6, 0.5], shadeAmt: 0.15 });
      for (const side of [-1, 1]) k.shape(k.blob(x + side * 11 * sz, y + 14 * sz, 5.5 * sz, 3 * sz), '#3a2418', { w: 0 });
      k.spot(x - 6, y + 2, 7 * sz, '#fff6e0', 0.35);
    } else if (t === 'pointy') {
      const p = k.curve([[x - 4, top + 2], [x + 4, top + 10], [x + 18 * sz, y + 2], [x + 38 * sz, y + 16 * sz], [x + 10 * sz, y + 20 * sz], [x - 6, y + 18 * sz]]);
      k.shape(p, mix(s.skin, '#c66b54', 0.18), { w: 3, hatch: { angle: 0.5, gap: 3.5, alpha: 0.3, dash: true } });
      k.shape(k.blob(x + 2, y + 15 * sz, 3.5, 2.2), '#3a2418', { w: 0 });
    } else { // long
      const p = k.curve([[x - 3, top], [x + 4, y - 10 * sz], [x + 14 * sz, y + 12 * sz + N.tip * 8], [x + 2, y + 20 * sz + N.tip * 6], [x - 12 * sz, y + 16 * sz]]);
      k.fill(p.concat([[x - 6, top]]), ns);
      k.stroke(p, { closed: false, w: 3 });
      k.shape(k.blob(x - 4, y + 15 * sz, 3.5 * sz, 2.2 * sz), '#3a2418', { w: 0 });
    }
  }

  // ---------- Рот ----------
  function mouth(k, s, o) {
    const h = s.head, M = s.mouth;
    const x = 200, y = h.y + M.y, w = 30 * M.w;
    const lip = M.lips || mix(s.skin, '#9a4a3a', 0.45);
    const t = M.type;
    if (t === 'grin' || t === 'open' || t === 'teeth') {
      const up = t === 'grin' ? -6 : 0;
      const top = k.curve([[x - w, y + up], [x - w * 0.4, y - 4], [x + w * 0.4, y - 4], [x + w, y + up]]);
      const dep = (t === 'open' ? 22 : 16) * (M.tall || 1);
      const bot = k.curve([[x + w, y + up], [x + w * 0.5, y + dep], [x - w * 0.5, y + dep], [x - w, y + up]]);
      const m = top.concat(bot);
      k.fill(m, '#3a1712');
      k.clip(m, () => {
        // зубы
        const many = false; // в портрете зубы не выдают: смотрите вблизи
        const n = many ? 14 : (M.teethN || 7);
        const tw = (w * 2) / n;
        for (let i = 0; i < n; i++) {
          const tx = x - w + i * tw;
          const tc = decoy(s, 'yellowTeeth') ? '#d8c27a' : (decoy(s, 'goldTooth') && i === 2 ? '#d9a830' : '#efe6cf');
          if (decoy(s, 'missingTooth') && i === 4) continue;
          k.shape([[tx + 0.5, y - 8], [tx + tw - 0.5, y - 8], [tx + tw - 1, y + 4 * (M.tall || 1)], [tx + 1, y + 5 * (M.tall || 1)]], tc, { w: 1 });
          if (M.tall) k.shape([[tx + 1, y + dep - 2], [tx + tw - 1, y + dep - 2], [tx + tw - 1.5, y + dep - 12], [tx + 1.5, y + dep - 12]], tc, { w: 1 });
        }
        k.spot(x, y + 16, w * 0.7, '#a2453c', 0.6);
      });
      k.stroke(m, { w: 3 });
    } else {
      let pts;
      if (t === 'smile') pts = k.curve([[x - w, y - 6], [x - w * 0.4, y + 6], [x + w * 0.4, y + 6], [x + w, y - 7]]);
      else if (t === 'frown') pts = k.curve([[x - w, y + 6], [x - w * 0.4, y - 3], [x + w * 0.4, y - 3], [x + w, y + 7]]);
      else if (t === 'wavy') pts = k.curve([[x - w, y], [x - w * 0.5, y - 4], [x, y + 3], [x + w * 0.5, y - 3], [x + w, y + 2]]);
      else if (t === 'pursed') {
        const p = k.blob(x, y, 10, 7, { irr: 0.15 });
        k.shape(p, lip, { w: 2.5 });
        k.line(x - 4, y, x + 4, y, { w: 1.4 });
        return;
      } else if (t === 'smirk') pts = k.curve([[x - w, y + 2], [x, y + 2], [x + w * 0.7, y - 3], [x + w, y - 9]]);
      else pts = k.curve([[x - w, y], [x - w * 0.3, y + 2], [x + w * 0.3, y + 1], [x + w, y - 1]]);
      // нижняя губа
      k.fill(k.curve([[x - w * 0.6, y + 2], [x, y + 13], [x + w * 0.6, y + 2]]).concat([[x, y + 3]]), lip);
      k.stroke(pts, { closed: false, w: 3.4, taperEnds: true });
      k.stroke(k.curve([[x - w * 0.4, y + 11], [x, y + 14], [x + w * 0.4, y + 11]]), { closed: false, w: 1.3, alpha: 0.6, taperEnds: true });
      for (const side of [-1, 1]) k.line(x + side * w, y + (t === 'smile' ? -7 : 0), x + side * (w + 5), y + (t === 'smile' ? -10 : (t === 'frown' ? 6 : 0)), { w: 1.8 });
    }
  }

  function facialHair(k, s, part) {
    const h = s.head, F = s.face;
    const col = F.fcolor || s.hair.color;
    const my = h.y + s.mouth.y;
    if (part === 'beard' && (F.beard === 'full' || F.beard === 'long')) {
      const len = F.beard === 'long' ? 90 : 40;
      const p = k.curve([[200 - h.w * 0.92, h.y + 10], [200 - h.w * 0.85, my + 10], [200 - 40, my + len], [200, my + len + 14], [200 + 40, my + len], [200 + h.w * 0.85, my + 10], [200 + h.w * 0.92, h.y + 10]])
        .concat(k.curve([[200 + h.w * 0.7, h.y + 20], [200 + 40, my + 16], [200, my + 20], [200 - 40, my + 16], [200 - h.w * 0.7, h.y + 20]]));
      k.shape(p, col, { w: 3, hatch: { angle: 1.4, gap: 4, alpha: 0.45, color: shade(col, -0.5) } });
    } else if (part === 'beard' && F.beard === 'goatee') {
      const p = k.blob(200, my + 26, 16, 22, { irr: 0.15, taper: -0.4 });
      k.shape(p, col, { w: 2.5, hatch: { angle: 1.5, gap: 3, alpha: 0.4 } });
    }
    if (part === 'beard') return;
    if (F.mustache === 'walrus') {
      const p = k.curve([[200 - 46, my + 14], [200 - 36, my - 18], [200, my - 14], [200 + 36, my - 18], [200 + 46, my + 14], [200 + 24, my + 2], [200, my + 4], [200 - 24, my + 2]]);
      k.shape(p, col, { w: 3, hatch: { angle: 1.4, gap: 3.5, alpha: 0.5, color: shade(col, -0.5) } });
    } else if (F.mustache === 'thin') {
      k.stroke(k.curve([[200 - 30, my - 4], [200 - 12, my - 10], [200, my - 8], [200 + 12, my - 10], [200 + 30, my - 4]]), { closed: false, w: 4, color: col, taperEnds: true });
    } else if (F.mustache === 'curl') {
      k.stroke(k.curve([[200 - 40, my - 20], [200 - 34, my - 6], [200 - 14, my - 12], [200, my - 9], [200 + 14, my - 12], [200 + 34, my - 6], [200 + 40, my - 20]]), { closed: false, w: 5, color: col, taperEnds: true });
    }
  }

  // ---------- Волосы ----------
  function capShape(k, s, line, puff, opt) {
    const h = s.head;
    opt = opt || {};
    const pts = [];
    const n = 28;
    const a0 = Math.PI + (opt.side || 0.05), a1 = Math.PI * 2 - (opt.side || 0.05);
    for (let i = 0; i <= n; i++) {
      const a = a0 + (a1 - a0) * i / n;
      const bump = opt.spiky ? ((i % 2) ? 1.12 : 0.98) : (1 + k.srand(-0.02, 0.03));
      pts.push([200 + Math.cos(a) * h.w * (1.06 + puff) * bump, h.y + Math.sin(a) * h.h * (1.04 + puff) * bump + (opt.lift || 0)]);
    }
    const ly = h.y - h.h * line;
    const back = k.curve([[200 + h.w * (1.05 + puff), h.y + (opt.sideDrop || 0)], [200 + h.w * 0.6, ly + (opt.part ? -6 : 4)], [200 + (opt.part || 0), ly - (opt.fringe || 0)], [200 - h.w * 0.6, ly + 4], [200 - h.w * (1.05 + puff), h.y + (opt.sideDrop || 0)]]);
    return pts.concat(back);
  }

  function hairTexture(k, pts, col, ang) {
    k.hatch(pts, { angle: ang || 1.2, gap: 4, alpha: 0.35, color: shade(col, -0.55), w: 1.3 });
  }

  function hairBack(k, s) {
    const H = s.hair, h = s.head, col = H.color;
    if (H.style === 'bob' || H.style === 'long' || H.style === 'bun' || H.style === 'wild') {
      const len = H.style === 'long' ? 1.55 : (H.style === 'wild' ? 1.2 : (H.style === 'bun' ? 0.4 : 0.9));
      const p = k.curve([[200 - h.w * 1.15, h.y + h.h * len], [200 - h.w * 1.25, h.y - h.h * 0.2], [200 - h.w * 0.7, h.y - h.h * 1.1], [200, h.y - h.h * 1.2], [200 + h.w * 0.7, h.y - h.h * 1.1], [200 + h.w * 1.25, h.y - h.h * 0.2], [200 + h.w * 1.15, h.y + h.h * len]]);
      if (H.style === 'wild') for (let i = 0; i < p.length; i += 3) { p[i][0] += k.srand(-14, 14); p[i][1] += k.srand(-8, 8); }
      k.shape(p, shade(col, -0.1), { w: 3.5, hatch: { angle: 1.45, gap: 5, alpha: 0.4, color: shade(col, -0.6) } });
    }
  }

  function hairFront(k, s) {
    const H = s.hair, h = s.head, col = H.color;
    const st = H.style;
    if (st === 'bald') {
      k.spot(200 - h.w * 0.3, h.y - h.h * 0.7, 30, '#fff6e2', 0.35);
      return;
    }
    if (st === 'wisps') {
      for (const side of [-1, 1]) {
        const p = k.blob(200 + side * h.w * 0.95, h.y - h.h * 0.2, 18, 30, { irr: 0.3 });
        k.shape(p, col, { w: 2.5, hatch: { angle: 1.3, gap: 3, alpha: 0.4 } });
      }
      for (let i = 0; i < 4; i++) {
        const x = 200 + k.srand(-30, 30);
        k.stroke(k.curve([[x, h.y - h.h * 0.98], [x + k.srand(-10, 10), h.y - h.h * 1.25], [x + k.srand(-20, 20), h.y - h.h * 1.2]]), { closed: false, w: 1.4, color: shade(col, -0.3) });
      }
      k.spot(200 - h.w * 0.3, h.y - h.h * 0.7, 30, '#fff6e2', 0.3);
      return;
    }
    if (st === 'curly') {
      const n = 16;
      for (let i = 0; i < n; i++) {
        const a = Math.PI * 0.95 + i / (n - 1) * Math.PI * 1.1;
        const r = k.srand(18, 26);
        const x = 200 + Math.cos(a) * h.w * 0.98, y = h.y + Math.sin(a) * h.h * 0.95 - 6;
        k.shape(k.blob(x, y, r, r * 0.9, { irr: 0.15 }), shade(col, k.srand(-0.1, 0.1)), { w: 2.5 });
        k.stroke(k.blob(x + 2, y + 2, r * 0.5, r * 0.4), { w: 1.2, alpha: 0.5, color: shade(col, -0.6) });
      }
      return;
    }
    let opt = {};
    let line = H.line;
    if (st === 'crew') opt = { side: 0.12 };
    if (st === 'spiky') opt = { spiky: true, side: 0.1 };
    if (st === 'combover') { opt = { side: 0.25, part: -h.w * 0.6 }; line = 0.6; }
    if (st === 'bob') opt = { fringe: 22, sideDrop: h.h * 0.6 };
    if (st === 'long') opt = { part: 8, sideDrop: h.h * 0.3 };
    if (st === 'bun') opt = { part: 0, side: 0.05 };
    if (st === 'messy' || st === 'wild') opt = { fringe: 10, side: 0.05 };
    if (st === 'slick') { opt = { part: -h.w * 0.3, side: 0.15 }; }
    const puff = st === 'spiky' ? 0.08 : (st === 'messy' || st === 'wild' ? 0.07 : 0.03);
    const p = capShape(k, s, line, puff, opt);
    k.shape(p, col, { w: 3.5 });
    hairTexture(k, p, col, st === 'combover' ? 0.1 : (st === 'slick' ? 0.25 : 1.2));
    if (st === 'messy' || st === 'wild') {
      for (let i = 0; i < 10; i++) {
        const x = 200 + k.srand(-h.w, h.w), y = h.y - h.h * k.srand(0.7, 1.1);
        k.stroke(k.curve([[x, y + 10], [x + k.srand(-15, 15), y - 12], [x + k.srand(-25, 25), y - 20]]), { closed: false, w: 2.2, color: shade(col, -0.4) });
      }
    }
    if (st === 'bun') {
      const b = k.blob(200, h.y - h.h * 1.15, 34, 28, { irr: 0.1 });
      k.shape(b, col, { w: 3.2 });
      k.stroke(k.blob(200, h.y - h.h * 1.15, 22, 16), { w: 1.4, color: shade(col, -0.5) });
    }
    if (H.grey) k.hatch(p, { angle: 1.0, gap: 6, alpha: 0.45, color: '#e8e2d6', w: 1.2 });
  }

  // ---------- Головные уборы ----------
  function hazmatBack(k, s) {
    const h = s.head;
    const p = k.blob(200, h.y - 6, h.w * 1.42, h.h * 1.3, { irr: 0.04 });
    k.shape(p, s.hat.color, { w: 4, hatch: { angle: -0.9, gap: 6, alpha: 0.3, dash: true } });
    k.shape(k.blob(200, h.y + 6, h.w * 1.08, h.h * 0.98, { irr: 0.03 }), '#1c1a16', { w: 0 });
  }

  function hoodBack(k, s) {
    const h = s.head, col = s.hat.color;
    const p = k.curve([[200 - h.w * 1.7, 520], [200 - h.w * 1.5, h.y + h.h * 0.6], [200 - h.w * 1.35, h.y - h.h * 0.4], [200 - h.w * 0.8, h.y - h.h * 1.15], [200, h.y - h.h * 1.28], [200 + h.w * 0.8, h.y - h.h * 1.15], [200 + h.w * 1.35, h.y - h.h * 0.4], [200 + h.w * 1.5, h.y + h.h * 0.6], [200 + h.w * 1.7, 520]]);
    k.shape(p, col, { w: 3.5, shadeSide: [0.6, 0.2], shadeAmt: 0.25, hatch: { angle: -1.0, gap: 5, alpha: 0.3, dash: true } });
    // тёмная глубина капюшона за головой
    k.shape(k.blob(200, h.y + 10, h.w * 1.12, h.h * 1.08), '#151210', { w: 0 });
  }

  function hat(k, s) {
    const T = s.hat, h = s.head;
    if (T.type === 'none') return;
    const col = T.color;
    const topY = h.y - h.h;
    if (T.type === 'postcap') {
      const crown = [[200 - h.w * 1.02, topY + 40], [200 - h.w * 0.95, topY - 20], [200 + h.w * 0.95, topY - 26], [200 + h.w * 1.05, topY + 38]];
      k.shape(crown, col, { w: 3.5, hatch: { angle: -0.4, gap: 6, alpha: 0.25 } });
      k.shape([[200 - h.w * 1.03, topY + 30], [200 + h.w * 1.05, topY + 28], [200 + h.w * 1.04, topY + 44], [200 - h.w * 1.02, topY + 46]], shade(col, -0.3), { w: 2.5 });
      const visor = k.curve([[200 - h.w * 0.95, topY + 44], [200, topY + 72], [200 + h.w * 0.95, topY + 42]]);
      k.shape(visor.concat([[200, topY + 46]]), '#1d1712', { w: 3 });
      k.shape(k.blob(200, topY + 6, 12, 10), '#c9a24a', { w: 2 });
    } else if (T.type === 'beanie') {
      const d = k.curve([[200 - h.w * 1.08, topY + 52], [200 - h.w * 1.0, topY - 10], [200, topY - 34], [200 + h.w * 1.0, topY - 10], [200 + h.w * 1.08, topY + 52]]);
      k.shape(d, col, { w: 3.5 });
      k.hatch(d, { angle: 1.57, gap: 7, alpha: 0.3 });
      const band = [[200 - h.w * 1.1, topY + 30], [200 + h.w * 1.1, topY + 30], [200 + h.w * 1.12, topY + 62], [200 - h.w * 1.12, topY + 62]];
      k.shape(band, shade(col, -0.15), { w: 3, hatch: { angle: 1.57, gap: 4, alpha: 0.5 } });
      if (T.pom) k.shape(k.blob(200, topY - 40, 20, 18, { irr: 0.25 }), T.pom, { w: 2.5, hatch: { angle: 0.7, gap: 3, alpha: 0.3 } });
    } else if (T.type === 'scarf') {
      const p = k.curve([[200 - h.w * 0.9, h.y + h.h * 0.85], [200 - h.w * 1.25, h.y], [200 - h.w * 0.8, topY - 15], [200, topY - 28], [200 + h.w * 0.8, topY - 15], [200 + h.w * 1.25, h.y], [200 + h.w * 0.9, h.y + h.h * 0.85]])
        .concat(k.curve([[200 + h.w * 0.85, h.y + h.h * 0.5], [200 + h.w * 0.95, h.y - 20], [200 + h.w * 0.5, topY + 40], [200, topY + 34], [200 - h.w * 0.5, topY + 40], [200 - h.w * 0.95, h.y - 20], [200 - h.w * 0.85, h.y + h.h * 0.5]]));
      k.shape(p, col, { w: 3.5 });
      k.clip(p, () => { for (let i = 0; i < 26; i++) k.shape(k.blob(200 + k.srand(-130, 130), h.y + k.srand(-160, 120), 5, 5), T.dots || '#e9d7a8', { w: 1 }); });
      // узел
      k.shape(k.blob(200 + 20, h.y + h.h + 12, 18, 13, { irr: 0.2 }), col, { w: 3 });
      k.shape([[200 + 20, h.y + h.h + 18], [200 + 50, h.y + h.h + 60], [200 + 30, h.y + h.h + 66]], col, { w: 3 });
    } else if (T.type === 'fedora' || T.type === 'tophat') {
      const brimY = topY + 38;
      const brim = k.blob(200, brimY, h.w * 1.6, 18, { irr: 0.05 });
      k.shape(brim, shade(col, -0.1), { w: 3.5 });
      const ch = T.type === 'tophat' ? 120 : 62;
      const crown = [[200 - h.w * 0.85, brimY], [200 - h.w * 0.8, brimY - ch], [200 - 10, brimY - ch - (T.type === 'fedora' ? -10 : 6)], [200 + h.w * 0.8, brimY - ch], [200 + h.w * 0.85, brimY]];
      k.shape(crown, col, { w: 3.5, hatch: { angle: -0.3, gap: 6, alpha: 0.3 } });
      k.shape([[200 - h.w * 0.85, brimY - 22], [200 + h.w * 0.85, brimY - 22], [200 + h.w * 0.85, brimY - 4], [200 - h.w * 0.85, brimY - 4]], T.band || '#7a2a22', { w: 2 });
      if (T.wet) for (let i = 0; i < 5; i++) {
        const x = 200 + k.srand(-h.w * 1.4, h.w * 1.4);
        k.shape(k.blob(x, brimY + 22 + k.srand(0, 20), 3, 5), '#a9c2c9', { w: 1, alpha: 0.8 });
      }
    } else if (T.type === 'hood') {
      // передний край капюшона обрамляет лицо и скрывает волосы
      const outer = k.blob(200, h.y - 4, h.w * 1.26, h.h * 1.18, { irr: 0.05 });
      const inner = k.blob(200, h.y + 16, h.w * 0.94, h.h * 0.97, { irr: 0.04 });
      const c = k.ctx;
      c.save();
      c.beginPath(); c.rect(0, 0, 400, h.y + h.h * 0.55); c.clip();
      c.beginPath();
      [outer, inner].forEach(P => { c.moveTo(P[0][0], P[0][1]); for (let i = 1; i < P.length; i++) c.lineTo(P[i][0], P[i][1]); c.closePath(); });
      c.fillStyle = col; c.fill('evenodd');
      k.clip(outer, () => k.hatch(outer, { angle: -1.0, gap: 5, alpha: 0.35, dash: true, region: (x, y) => Math.hypot((x - 200) / (h.w * 0.94), (y - h.y - 16) / (h.h * 0.97)) > 1 }));
      k.stroke(outer, { w: 3.5 });
      k.stroke(inner, { w: 3 });
      // складки ткани
      for (const side of [-1, 1]) k.stroke(k.curve([[200 + side * h.w * 0.4, topY - 10], [200 + side * h.w * 0.9, h.y - h.h * 0.5], [200 + side * h.w * 1.05, h.y]]), { closed: false, w: 1.6, alpha: 0.5 });
      c.restore();
    } else if (T.type === 'beret') {
      const b = k.blob(200 - 15, topY + 4, h.w * 1.15, 34, { irr: 0.1, rot: -0.15 });
      k.shape(b, col, { w: 3.5, hatch: { angle: 0.6, gap: 6, alpha: 0.25 } });
      k.line(200 - 15, topY - 30, 200 - 10, topY - 44, { w: 4 });
    } else if (T.type === 'cap') {
      const d = k.curve([[200 - h.w * 1.05, topY + 46], [200 - h.w * 0.9, topY - 16], [200, topY - 30], [200 + h.w * 0.9, topY - 16], [200 + h.w * 1.05, topY + 46]]);
      k.shape(d, col, { w: 3.5, shadeSide: [0.6, 0], shadeAmt: 0.2 });
      const visor = k.curve([[200 - h.w * 0.6, topY + 40], [200 + h.w * 0.5, topY + 70], [200 + h.w * 1.5, topY + 58], [200 + h.w * 1.0, topY + 36]]);
      k.shape(visor, shade(col, -0.2), { w: 3 });
      k.shape(k.blob(200 - 20, topY + 10, 16, 12), T.logo || '#e2c35a', { w: 2 });
    } else if (T.type === 'aviator') {
      const p = k.curve([[200 - h.w * 1.08, h.y + 40], [200 - h.w * 1.08, topY + 20], [200, topY - 22], [200 + h.w * 1.08, topY + 20], [200 + h.w * 1.08, h.y + 40]])
        .concat(k.curve([[200 + h.w * 0.9, h.y + 30], [200 + h.w * 0.85, topY + 50], [200, topY + 40], [200 - h.w * 0.85, topY + 50], [200 - h.w * 0.9, h.y + 30]]));
      k.shape(p, col, { w: 3.5, hatch: { angle: 0.9, gap: 6, alpha: 0.3 } });
      for (const side of [-1, 1]) {
        k.shape(k.blob(200 + side * 38, topY + 40, 26, 22), '#8a6a3a', { w: 3 });
        k.shape(k.blob(200 + side * 38, topY + 40, 18, 15), '#9fb6b8', { w: 2 });
        k.line(200 + side * 22, topY + 28, 200 + side * 34, topY + 34, { w: 2, color: '#ffffff', alpha: 0.6 });
      }
      k.line(200 - 12, topY + 40, 200 + 12, topY + 40, { w: 4 });
    } else if (T.type === 'fireman') {
      // латунная пожарная каска с гребнем и козырьком
      const dome = k.curve([[200 - h.w * 1.08, topY + 52], [200 - h.w * 1.0, topY - 6], [200, topY - 36], [200 + h.w * 1.0, topY - 6], [200 + h.w * 1.08, topY + 52]]);
      k.shape(dome, col, { w: 3.5, shadeSide: [0.6, 0.2], shadeAmt: 0.3 });
      k.spot(200 - h.w * 0.4, topY, 30, '#fff2c8', 0.45);
      k.shape([[200 - 10, topY - 40], [200 + 10, topY - 40], [200 + 14, topY + 40], [200 - 14, topY + 40]], shade(col, -0.2), { w: 2.5 });
      const brim = k.blob(200, topY + 54, h.w * 1.35, 14, { irr: 0.04 });
      k.shape(brim, shade(col, -0.15), { w: 3 });
      k.shape(k.blob(200, topY + 22, 14, 14), '#a03a2a', { w: 2 });
    } else if (T.type === 'nurse') {
      const p = [[200 - 50, topY + 14], [200 - 40, topY - 26], [200 + 40, topY - 26], [200 + 50, topY + 14]];
      k.shape(p, '#efe9dc', { w: 3 });
      k.line(200, topY - 16, 200, topY + 4, { w: 4, color: '#b5402e' });
      k.line(200 - 10, topY - 6, 200 + 10, topY - 6, { w: 4, color: '#b5402e' });
    } else if (T.type === 'hazmat') {
      const visor = k.blob(200, h.y + 6, h.w * 1.08, h.h * 0.98, { irr: 0.03 });
      k.fill(visor, 'rgba(160,200,180,0.28)');
      k.stroke(visor, { w: 5 });
      k.line(200 - h.w * 0.6, h.y - h.h * 0.4, 200 - h.w * 0.25, h.y - h.h * 0.7, { w: 4, color: '#ffffff', alpha: 0.5 });
      // фильтр
      k.shape(k.blob(200, h.y + h.h * 0.95, 30, 22), '#3a3a3a', { w: 3, hatch: { angle: 0, gap: 4, alpha: 0.5, color: '#999' } });
    }
  }

  // ---------- Аксессуары ----------
  function accessories(k, s, layer) {
    const h = s.head, E = s.eyes;
    const ey = h.y + E.y;
    if (layer === 'back') {
      if (has(s, 'umbrella')) {
        const p = k.curve([[20, 110], [80, 20], [200, -5], [320, 20], [380, 110]]);
        const scal = [];
        for (let i = 0; i <= 6; i++) scal.push([380 - i * 60, 110 + (i % 2 ? 0 : -14) + 14]);
        k.shape(p.concat(scal), s.umbrella || '#8d2f28', { w: 3.5, hatch: { angle: -0.8, gap: 7, alpha: 0.3 } });
        for (let i = 1; i < 6; i++) k.line(200, 0, 380 - i * 60, 115, { w: 1.6, alpha: 0.7 });
        for (let i = 0; i < 8; i++) {
          const x = k.srand(20, 380);
          k.line(x, 140 + k.srand(0, 40), x - 4, 175 + k.srand(0, 60), { w: 1.3, color: '#b7cfd6', alpha: 0.6 });
        }
      }
      if (has(s, 'telescope')) {
        k.shape([[300, 360], [395, 250], [410, 270], [320, 380]], '#7a5a2e', { w: 3, hatch: { angle: 0.8, gap: 5, alpha: 0.3 } });
        k.shape(k.blob(398, 258, 12, 16, { rot: 0.8 }), '#c9a24a', { w: 2.5 });
      }
      return;
    }
    if (s.glasses !== 'none') {
      for (const side of [-1, 1]) {
        const x = 200 + side * E.gap, y = ey + 2;
        const g = s.glasses === 'square' ? k.blob(x, y, 26, 20, { squareness: 0.6 }) : k.blob(x, y, 24, 23);
        k.fill(g, 'rgba(230,240,235,0.18)');
        k.stroke(g, { w: s.glasses === 'thick' ? 5.5 : 3 });
        k.line(x - 12, y - 12, x - 4, y - 16, { w: 2, color: '#ffffff', alpha: 0.6 });
      }
      k.line(200 - E.gap + 24, ey - 2, 200 + E.gap - 24, ey - 2, { w: 2.5, bend: -3 });
      if (has(s, 'crackedGlass')) k.stroke([[200 + E.gap - 10, ey - 18], [200 + E.gap, ey + 2], [200 + E.gap + 8, ey - 4], [200 + E.gap + 2, ey + 20]], { closed: false, w: 1.2, alpha: 0.8 });
    }
    if (has(s, 'monocle')) {
      const x = 200 + E.gap, y = ey + 1;
      k.stroke(k.blob(x, y, 24, 24), { w: 3, color: '#b08a35' });
      k.stroke(k.curve([[x + 20, y + 14], [x + 30, y + 80], [x + 10, y + 150]]), { closed: false, w: 1.2, color: '#b08a35' });
    }
    const top = h.y + h.h * 0.92;
    if (has(s, 'tie')) {
      k.shape([[195, top + 22], [205, top + 22], [212, top + 34], [216, top + 140], [200, top + 158], [184, top + 140], [188, top + 34]], s.tieColor || '#7a2a22', { w: 2.5, hatch: { angle: 0.8, gap: 6, alpha: 0.4 } });
    }
    if (has(s, 'bowtie')) {
      k.shape([[200, top + 30], [170, top + 16], [172, top + 48]], s.tieColor || '#2c4a5a', { w: 2.5 });
      k.shape([[200, top + 30], [230, top + 16], [228, top + 48]], s.tieColor || '#2c4a5a', { w: 2.5 });
      k.shape(k.blob(200, top + 31, 7, 8), shade(s.tieColor || '#2c4a5a', -0.2), { w: 2 });
    }
    if (has(s, 'scarfNeck')) {
      const p = k.curve([[200 - 80, top + 4], [200, top + 40], [200 + 80, top + 4], [200 + 90, top + 34], [200, top + 70], [200 - 90, top + 34]]);
      k.shape(p, s.scarfColor || '#8a6a2e', { w: 3, hatch: { angle: 1.57, gap: 8, alpha: 0.35 } });
      k.shape([[200 + 30, top + 50], [200 + 55, top + 50], [200 + 60, top + 150], [200 + 30, top + 145]], s.scarfColor || '#8a6a2e', { w: 3, hatch: { angle: 0, gap: 8, alpha: 0.35 } });
    }
    if (has(s, 'pearls')) {
      for (let i = 0; i < 13; i++) {
        const t = i / 12, x = 200 - 55 + t * 110, y = top + 20 + Math.sin(t * Math.PI) * 30;
        k.shape(k.blob(x, y, 6, 6), '#efe6d2', { w: 1.5 });
      }
    }
    if (has(s, 'stethoscope')) {
      k.stroke(k.curve([[200 - 50, top + 6], [200 - 58, top + 80], [200 - 20, top + 130], [200 + 10, top + 120]]), { closed: false, w: 4, color: '#2a2a2a' });
      k.stroke(k.curve([[200 + 50, top + 6], [200 + 52, top + 70], [200 + 30, top + 110]]), { closed: false, w: 4, color: '#2a2a2a' });
      k.shape(k.blob(200 + 14, top + 124, 13, 13), '#a8a8a0', { w: 2.5 });
    }
    if (has(s, 'headphones')) {
      const top = h.y - h.h - (s.hat.type === 'beanie' ? 30 : 8);
      k.stroke(k.curve([[200 - h.w * 1.08, h.y + 2], [200 - h.w * 1.12, h.y - h.h * 0.6], [200 - h.w * 0.6, top + 8], [200, top], [200 + h.w * 0.6, top + 8], [200 + h.w * 1.12, h.y - h.h * 0.6], [200 + h.w * 1.08, h.y + 2]]), { closed: false, w: 8, color: '#2a2a2a' });
      for (const side of [-1, 1]) {
        const cx = 200 + side * h.w * 1.04, cy = h.y + 10;
        k.shape(k.blob(cx, cy, 17, 27, { squareness: 0.3 }), '#3d3d3d', { w: 3, shadeSide: [side * 0.5, 0.3], shadeAmt: 0.25 });
        k.shape(k.blob(cx - side * 7, cy, 6, 19), '#565650', { w: 1.5 });
      }
    }
    if (has(s, 'bandage')) {
      const x = 200 - E.gap - 6, y = h.y + 44;
      k.shape(k.blob(x, y, 20, 8, { squareness: 0.6, rot: -0.4 }), '#e2c9a0', { w: 2 });
      k.line(x - 6, y + 2, x + 6, y - 4, { w: 1, alpha: 0.6 });
    }
    if (has(s, 'badge')) {
      k.shape(k.blob(200 - 85, top + 90, 18, 22, { squareness: 0.4 }), '#c9a24a', { w: 2.5 });
      k.line(200 - 92, top + 86, 200 - 78, top + 86, { w: 1.5 });
    }
    if (has(s, 'flower')) {
      const x = 200 - 80, y = top + 70;
      for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; k.shape(k.blob(x + Math.cos(a) * 10, y + Math.sin(a) * 10, 8, 8), '#c45a6a', { w: 1.6 }); }
      k.shape(k.blob(x, y, 6, 6), '#e2c35a', { w: 1.5 });
    }
    if (has(s, 'cigarette')) {
      const my = h.y + s.mouth.y;
      k.shape([[200 + 18, my + 2], [200 + 64, my + 10], [200 + 63, my + 16], [200 + 17, my + 8]], '#efe9dc', { w: 2 });
      k.shape(k.blob(200 + 65, my + 13, 4, 4), '#d4632a', { w: 0 });
      k.stroke(k.curve([[200 + 68, my + 6], [200 + 60, my - 20], [200 + 76, my - 50], [200 + 66, my - 80]]), { closed: false, w: 2, color: '#c9c3b5', alpha: 0.5 });
    }
    if (has(s, 'doll')) {
      const x = 92, y = 440;
      k.shape(k.blob(x, y + 40, 30, 40), '#8f5a78', { w: 3 });
      k.shape(k.blob(x, y - 10, 26, 26), '#e6cfae', { w: 3 });
      k.shape(k.blob(x - 8, y - 12, 4, 5), '#1a120c', { w: 0 });
      k.shape(k.blob(x + 9, y - 13, 4, 5), '#1a120c', { w: 0 });
      k.stroke(k.curve([[x - 6, y + 2], [x, y + 5], [x + 6, y + 1]]), { closed: false, w: 1.6 });
      k.stroke([[x - 14, y + 4], [x - 4, y + 12]], { closed: false, w: 1.4 }); // шов
      for (let i = 0; i < 6; i++) k.line(x - 22 + i * 8, y - 34, x - 25 + i * 9, y - 8, { w: 3, color: '#c9a24a' });
    }
    if (has(s, 'jar')) {
      const x = 300, y = 440;
      const j = k.blob(x, y, 38, 46, { squareness: 0.3 });
      k.shape(j, '#8a2f3a', { w: 3, shadeSide: [0.6, 0], shadeAmt: 0.2 });
      k.shape([[x - 34, y - 46], [x + 34, y - 46], [x + 32, y - 60], [x - 32, y - 60]], '#c9b48a', { w: 2.5, hatch: { angle: 0.6, gap: 4, alpha: 0.4 } });
      k.line(x - 20, y - 20, x - 16, y + 20, { w: 3, color: '#ffffff', alpha: 0.4 });
      k.shape(k.blob(x, y + 4, 20, 14, { squareness: 0.5 }), '#efe3c0', { w: 1.5 });
    }
    if (has(s, 'bag')) {
      k.shape(k.blob(320, 450, 60, 50, { squareness: 0.5 }), '#6b4a2a', { w: 3, hatch: { angle: -0.6, gap: 6, alpha: 0.3 } });
      k.stroke(k.curve([[280, 410], [300, 320], [340, 410]]), { closed: false, w: 5, color: '#4a3220' });
    }
    if (has(s, 'parcel')) {
      k.shape([[250, 400], [380, 390], [385, 500], [255, 500]], '#b48a52', { w: 3, hatch: { angle: 0.3, gap: 7, alpha: 0.25 } });
      k.line(255, 445, 383, 440, { w: 4, color: '#6b4a2a' });
      k.line(318, 393, 320, 500, { w: 4, color: '#6b4a2a' });
    }
    if (has(s, 'lantern')) {
      k.spot(310, 420, 90, '#f2c15a', 0.45);
      k.shape([[285, 380], [335, 380], [340, 470], [280, 470]], 'rgba(242,193,90,0.7)', { w: 3 });
      k.stroke(k.curve([[290, 380], [310, 345], [330, 380]]), { closed: false, w: 3 });
    }
    if (has(s, 'cards')) {
      for (let i = 0; i < 3; i++) {
        const c = k.blob(80 + i * 22, 440 - i * 6, 22, 32, { squareness: 0.7, rot: -0.4 + i * 0.3 });
        k.shape(c, '#efe9dc', { w: 2.5 });
        k.shape(k.blob(80 + i * 22, 440 - i * 6, 6, 7, { rot: 0.785 }), i === 1 ? '#1a120c' : '#a3352a', { w: 0 });
      }
    }
    if (has(s, 'mic')) {
      k.shape([[300, 500], [312, 500], [318, 400], [306, 400]], '#3d3d3d', { w: 2.5 });
      k.shape(k.blob(312, 385, 22, 22), '#7a7a72', { w: 3, hatch: { angle: 0.8, gap: 3, alpha: 0.5 } });
    }
    if (has(s, 'clipboard')) {
      k.shape([[270, 380], [370, 375], [375, 500], [272, 500]], '#8a6a3a', { w: 3 });
      k.shape([[280, 395], [362, 392], [365, 500], [282, 500]], '#efe9dc', { w: 2 });
      for (let i = 0; i < 5; i++) k.line(292, 412 + i * 16, 350, 410 + i * 16, { w: 1.3, alpha: 0.6 });
    }
    if (has(s, 'camera')) {
      // видеокамера на плече
      k.shape([[262, 300], [380, 290], [392, 372], [270, 384]], '#3a3a38', { w: 3.5, shadeSide: [0.4, 0.6], shadeAmt: 0.25, hatch: { angle: 0.2, gap: 5, alpha: 0.3, dash: true } });
      k.shape(k.blob(262, 340, 24, 30), '#2a2a28', { w: 3 });
      k.shape(k.blob(258, 340, 15, 20), '#5a7a8a', { w: 2 });
      k.line(250, 328, 256, 336, { w: 2, color: '#ffffff', alpha: 0.6 });
      k.shape([[300, 270], [360, 266], [362, 292], [302, 296]], '#2a2a28', { w: 2.5 });
      k.shape(k.blob(372, 306, 5, 5), '#d83a2a', { w: 0 });
    }
    if (has(s, 'broom')) {
      k.shape([[52, 500], [62, 500], [104, 250], [96, 248]], '#8a6a3a', { w: 2.5 });
      const br = k.curve([[70, 270], [110, 270], [140, 160], [100, 120], [60, 140], [40, 190]]);
      k.shape(br, '#b8964a', { w: 3, hatch: { angle: 1.3, gap: 3.5, alpha: 0.55 } });
      k.line(66, 262, 110, 258, { w: 4, color: '#6a4a2a' });
    }
    if (has(s, 'canister')) {
      const cn = k.blob(310, 440, 58, 62, { squareness: 0.7 });
      k.shape(cn, '#7a8a5a', { w: 3, shadeSide: [0.6, 0.2], shadeAmt: 0.25, hatch: { angle: 0.4, gap: 6, alpha: 0.25, dash: true } });
      k.shape([[285, 372], [305, 372], [305, 390], [285, 390]], '#4a4a3a', { w: 2.5 });
      k.stroke(k.curve([[320, 380], [340, 350], [360, 382]]), { closed: false, w: 5, color: '#4a5a3a' });
      k.line(280, 420, 340, 470, { w: 2, alpha: 0.5 });
      k.line(340, 420, 280, 470, { w: 2, alpha: 0.5 });
    }
    if (has(s, 'wrench')) {
      k.shape([[60, 500], [74, 500], [96, 390], [82, 388]], '#8a8a84', { w: 2.5 });
      k.shape(k.blob(92, 380, 18, 14), '#8a8a84', { w: 2.5 });
      k.shape(k.blob(96, 372, 7, 7), s.bg, { w: 1.5 });
    }
  }

  function sweat(k, s) {
    if (!s.face.sweat) return;
    const h = s.head;
    for (let i = 0; i < Math.round(s.face.sweat * 4); i++) {
      const x = 200 + (i % 2 ? 1 : -1) * k.srand(50, h.w * 0.9), y = h.y - k.srand(20, 70);
      const p = [[x, y - 9], [x + 5, y + 2], [x, y + 6], [x - 5, y + 2]];
      k.shape(p, '#bcd4d8', { w: 1.6 });
    }
  }

  // ---------- Сборка портрета ----------
  function draw(ctx, spec, W, H, frame, o) {
    o = o || {};
    const s = norm(spec);
    const k = new Sketch(ctx, s.seed * 31 + frame * 7919 + 1, { structSeed: s.seed, wobble: 1 });
    ctx.save();
    ctx.scale(W / 400, H / 500);
    background(k, s, 400, 500);
    ctx.save();
    ctx.translate(200, 330); ctx.scale(1.1, 1.1); ctx.translate(-200, -330);
    accessories(k, s, 'back');
    hairBack(k, s);
    body(k, s);
    const hooded = s.hat.type === 'hood';
    if (hooded) hoodBack(k, s);
    if (s.hat.type === 'hazmat') hazmatBack(k, s); else if (!hooded) ears(k, s);
    const hp = headPts(k, s);
    headFill(k, s, hp);
    eyesAndBrows(k, s, { blink: o.blink, portrait: true });
    nose(k, s);
    facialHair(k, s, 'beard');
    mouth(k, s, o);
    facialHair(k, s, 'mustache');
    if (!hooded) hairFront(k, s);
    sweat(k, s);
    hat(k, s);
    accessories(k, s, 'front');
    ctx.restore();
    ctx.restore();
    applyGrain(ctx, W, H, 0.5);
    vignette(ctx, W, H, 0.5);
  }

  // Кэш кадров и анимация «кипения» линий
  function renderFrames(spec, W, H) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const frames = [];
    for (let f = 0; f < 4; f++) {
      const cv = document.createElement('canvas');
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      draw(cv.getContext('2d'), spec, cv.width, cv.height, f % 3, { blink: f === 3 });
      frames.push(cv);
    }
    return frames;
  }

  const animators = new Set();
  function animate(canvas, frames, opts) {
    opts = opts || {};
    const ctx = canvas.getContext('2d');
    canvas.width = frames[0].width; canvas.height = frames[0].height;
    let f = 0, alive = true, nextBlink = performance.now() + 1500 + Math.random() * 2500, blinkUntil = 0;
    const st = { stop() { alive = false; animators.delete(st); }, frames };
    function tick() {
      if (!alive) return;
      const now = performance.now();
      let idx = f % 3;
      if (opts.blink !== false) {
        if (now > nextBlink) { blinkUntil = now + 140; nextBlink = now + 2500 + Math.random() * 3500; }
        if (now < blinkUntil) idx = 3;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(frames[idx], 0, 0);
      if (opts.overlay) opts.overlay(ctx, canvas.width, canvas.height, now);
      f++;
      st.t = setTimeout(tick, idx === 3 ? 140 : 170);
    }
    tick();
    animators.add(st);
    return st;
  }
  function stopAll() { animators.forEach(a => { a.stop(); clearTimeout(a.t); }); }

  window.Portrait = { draw, renderFrames, animate, stopAll, norm, eye, brows, has, tell, decoy };
})();
