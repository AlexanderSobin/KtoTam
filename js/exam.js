/* Крупные планы для осмотра: глаза, свет, зубы, руки, подмышки. */
(function () {
  'use strict';
  const { Sketch, mix, shade, INK, applyGrain, vignette } = SK;
  const P = Portrait;

  function skinBg(k, s, W, H) {
    const c = k.ctx;
    c.fillStyle = s.skin; c.fillRect(0, 0, W, H);
    k.spot(W * 0.3, H * 0.25, W * 0.8, '#fff0d0', 0.25);
    k.spot(W * 0.95, H * 0.9, W * 0.8, '#2a1a20', 0.4);
    k.hatch([[0, 0], [W, 0], [W, H], [0, H]], { angle: -1.0, gap: 5, alpha: 0.18, dash: true, region: (x, y) => x + y * 0.5 > W * 0.95 });
  }

  // ---------- Глаза ----------
  function eyes(k, s, W, H, st) {
    skinBg(k, s, W, H);
    const E = s.eyes;
    const sc = 105 / E.gap;
    const ey = H * 0.55;
    // переносица
    k.stroke(k.curve([[200 - 22, ey - 40], [200 - 18, ey + 30], [200 - 30, ey + 120]]), { closed: false, w: 3, alpha: 0.6 });
    k.spot(200 + 10, ey + 40, 40, '#3a2018', 0.15);
    for (const side of [-1, 1]) {
      const x = 200 + side * E.gap * sc;
      k.spot(x, ey, 80, '#4a2a2a', 0.25 + E.bags * 0.15);
    }
    for (const side of [-1, 1]) {
      const x = 200 + side * E.gap * sc;
      const pu = st.pupil ? st.pupil(side) : 1;
      P.eye(k, s, x, ey + side * E.asym * 8, 3 / Math.sqrt(E.size), side, { pupil: pu, lookX: 0 });
      if (s.face.wrinkles > 0.45) for (let i = 0; i < 3; i++) {
        const ox = x + side * 70;
        k.line(ox, ey - 10 + i * 12, ox + side * 30, ey - 22 + i * 18, { w: 1.6, alpha: 0.5 });
      }
    }
    P.brows(k, s, ey, sc);
    if (st.flash) {
      const f = st.flash;
      k.spot(200, ey - 60, 300, '#fff8d8', 0.32 * f);
      k.spot(200, ey - 120, 90, '#ffffff', 0.3 * f);
    }
  }

  // ---------- Зубы ----------
  function teeth(k, s, W, H) {
    skinBg(k, s, W, H);
    const many = P.tell(s, 'teeth');
    const lip = s.mouth.lips || mix(s.skin, '#9a4a3a', 0.45);
    const cx = 200, cy = 210;
    // губы
    const outer = k.blob(cx, cy, 170, 105, { irr: 0.05 });
    k.shape(outer, lip, { w: 4, shadeSide: [0.4, 0.6], shadeAmt: 0.2 });
    const inner = k.blob(cx, cy + 4, 145, 78, { irr: 0.04 });
    k.fill(inner, '#2a0e0c');
    k.clip(inner, () => {
      // язык и нёбо
      k.shape(k.blob(cx, cy + 70, 110, 50), '#a2453c', { w: 2.5, alpha: 0.8 });
      k.spot(cx, cy, 120, '#000000', 0.4);
      const gum = '#c46a6a';
      k.fill([[0, cy - 110], [400, cy - 110], [400, cy - 52], [0, cy - 52]], gum);
      k.fill([[0, cy + 46], [400, cy + 46], [400, cy + 120], [0, cy + 120]], gum);
      const yellow = P.decoy(s, 'yellowTeeth');
      const baseCol = yellow ? '#d6be78' : '#efe7d2';
      if (many && s.subtle) {
        // слабый признак: второй ряд виден только в глубине, у центра
        row(k, cx, cy - 26, 6, 42, 16, '#a9a496', -1, 0.5);
      } else if (many) {
        // второй ряд в глубине
        row(k, cx, cy - 22, 18, 120, 22, '#b9b4a6', -1, 0.6);
        row(k, cx, cy + 22, 18, 120, 20, '#b9b4a6', 1, 0.6);
      }
      const n = many ? (s.subtle ? 11 : 16) : (P.decoy(s, 'crowdedTeeth') ? 12 : 8);
      row(k, cx, cy - 52, n, 140, many ? 34 : 46, baseCol, -1, 1, s);
      row(k, cx, cy + 48, n, 130, many ? 28 : 36, baseCol, 1, 1, s);
    });
    k.stroke(inner, { w: 3 });
    // уголки, складки
    for (const side of [-1, 1]) k.stroke(k.curve([[cx + side * 165, cy - 10], [cx + side * 190, cy + 20], [cx + side * 175, cy + 80]]), { closed: false, w: 2, alpha: 0.6 });
    if (s.face.mustache !== 'none') {
      const col = s.face.fcolor || s.hair.color;
      const m = k.curve([[cx - 190, cy - 70], [cx - 120, cy - 150], [cx, cy - 130], [cx + 120, cy - 150], [cx + 190, cy - 70], [cx + 100, cy - 100], [cx, cy - 96], [cx - 100, cy - 100]]);
      k.shape(m, col, { w: 3, hatch: { angle: 1.4, gap: 4, alpha: 0.5, color: shade(col, -0.5) } });
    }
  }
  function row(k, cx, y, n, half, th, col, dir, alpha, s) {
    const tw = half * 2 / n;
    for (let i = 0; i < n; i++) {
      if (s && P.decoy(s, 'missingTooth') && i === Math.floor(n * 0.3)) continue;
      const x = cx - half + i * tw;
      // кривые, налезающие друг на друга зубы — но в один ряд
      const crowd = s && alpha === 1 && P.decoy(s, 'crowdedTeeth') && !P.tell(s, 'teeth') ? k.srand(-7, 7) : 0;
      const curve = Math.pow((x + tw / 2 - cx) / half, 2) * 18 * dir + crowd;
      const t0 = y - curve, t1 = y + dir * th - curve;
      const pts = dir < 0
        ? [[x + 1, t0], [x + tw - 1, t0], [x + tw - 2, t1 - 5], [x + tw / 2, t1 + 2], [x + 2, t1 - 5]]
        : [[x + 1, t0], [x + tw - 1, t0], [x + tw - 2, t1 + 5], [x + tw / 2, t1 - 2], [x + 2, t1 + 5]];
      let c = col;
      if (s && P.decoy(s, 'goldTooth') && i === Math.floor(n * 0.65) && dir < 0) c = '#d9a830';
      k.ctx.globalAlpha = alpha;
      k.shape(pts, c, { w: 1.8, alpha });
      k.ctx.globalAlpha = 1;
      if (alpha === 1) k.line(x + tw * 0.3, t0 + dir * 4, x + tw * 0.35, t1 - dir * 8, { w: 1.2, color: '#ffffff', alpha: 0.5 });
    }
  }

  // ---------- Руки ----------
  function hands(k, s, W, H) {
    const c = k.ctx;
    c.fillStyle = '#2a201a'; c.fillRect(0, 0, W, H);
    k.spot(W * 0.4, H * 0.3, W * 0.8, '#e8b85a', 0.25);
    // стол
    k.shape([[0, 300], [400, 280], [400, 400], [0, 400]], '#5a3a22', { w: 3, hatch: { angle: 0.05, gap: 6, alpha: 0.35, dash: true } });
    const v = P.tell(s, 'hands');
    const skin = s.skin;
    const fl = v ? (s.subtle ? 1.06 : 1.2) : 1;
    // слабый признак: странные только безымянный и указательный
    const odd = (i) => v && (!s.subtle || i === 0 || i === 2);
    // рукав
    const cuff = [[110, 400], [120, 330], [290, 330], [300, 400]];
    const palm = k.blob(205, 305, 86, 70, { irr: 0.06, taper: -0.2 });
    // пальцы: [x основания, длина, угол]
    const fingers = [[150, 112, -0.22], [190, 130, -0.06], [230, 124, 0.08], [266, 96, 0.24]];
    const fpts = [];
    for (const [fx, len, ang] of fingers) {
      const L = len * fl;
      const bx = fx, by = 240;
      const tx = bx + Math.sin(ang) * L, ty = by - Math.cos(ang) * L;
      fpts.push({ bx, by, tx, ty, ang, L });
    }
    // большой палец
    const thumb = k.curve([[120, 300], [80, 260], [62, 220], [74, 206], [100, 222], [140, 262]]);
    k.shape(thumb.concat([[150, 300]]), shade(skin, -0.03), { w: 3.5 });
    fpts.forEach((f, fi) => {
      const w = 17;
      const nx = Math.cos(f.ang) * w, ny = Math.sin(f.ang) * w;
      const pts = k.curve([[f.bx - nx, f.by - ny + 20], [f.tx - nx * 0.9, f.ty - ny * 0.9 + 10], [f.tx, f.ty - 6], [f.tx + nx * 0.9, f.ty + ny * 0.9 + 10], [f.bx + nx, f.by + ny + 20]]);
      k.shape(pts, skin, { w: 3.5, shadeSide: [0.6, 0], shadeAmt: 0.12 });
      // суставы
      const joints = odd(fi) ? [0.3, 0.52, 0.72] : [0.38, 0.65];
      for (const t of joints) {
        const jx = f.bx + (f.tx - f.bx) * t, jy = f.by + (f.ty - f.by) * t + 10;
        k.stroke(k.curve([[jx - nx * 0.6, jy - ny * 0.6], [jx, jy + 3], [jx + nx * 0.6, jy + ny * 0.6]]), { closed: false, w: 1.5, alpha: 0.6 });
        k.stroke(k.curve([[jx - nx * 0.4, jy - ny * 0.4 + 5], [jx, jy + 7], [jx + nx * 0.4, jy + ny * 0.4 + 5]]), { closed: false, w: 1, alpha: 0.4 });
      }
      nail(k, s, f, nx, ny, odd(fi));
    });
    // ноготь большого пальца
    nail(k, s, { tx: 72, ty: 214, bx: 120, by: 270, ang: -0.9, L: 60 }, 12, -9, v && !s.subtle, 0.8);
    k.shape(palm, skin, { w: 3.5, shadeSide: [0.5, 0.4], shadeAmt: 0.15 });
    for (let i = 0; i < 4; i++) k.stroke(k.curve([[150 + i * 38, 248], [160 + i * 38, 272], [156 + i * 38, 300]]), { closed: false, w: 1.3, alpha: 0.3 });
    k.shape(cuff, s.clothes.color, { w: 3.5, hatch: { angle: 1.4, gap: 5, alpha: 0.3 } });
    k.line(118, 345, 292, 345, { w: 2, alpha: 0.6 });
  }
  function nail(k, s, f, nx, ny, v, scale) {
    scale = scale || 1;
    const t = 1 - 26 * scale / f.L;
    const cx = f.bx + (f.tx - f.bx) * t, cy = f.by + (f.ty - f.by) * t + 6;
    const nl = k.blob(cx, cy, 11 * scale, 15 * scale, { irr: 0.05, rot: f.ang, squareness: 0.2 });
    let col = mix(s.skin, '#f2c8c0', 0.5);
    if (v) col = '#56677a';
    if (P.decoy(s, 'polish')) col = '#b0283a';
    else if (!v && P.decoy(s, 'sunNails')) col = '#7f8e9e'; // солнечный ожог: серо-синие, но с лункой
    k.fill(nl, col);
    k.clip(nl, () => {
      if (!v) {
        // лунка
        const lx = cx - Math.sin(f.ang) * -12 * scale, ly = cy + 12 * scale;
        k.shape(k.blob(lx, ly, 9 * scale, 6 * scale, { rot: f.ang }), P.decoy(s, 'polish') ? '#e8b0b0' : '#f8ece0', { w: 0 });
      } else {
        k.line(cx - 4, cy - 8, cx - 3, cy + 8, { w: 2.5, color: '#a8c0d0', alpha: 0.7 });
      }
      if (P.decoy(s, 'dirtyNails')) {
        k.fill(k.blob(cx, cy - 13 * scale, 12 * scale, 5 * scale, { rot: f.ang }), '#2a1a0a');
      }
    });
    k.stroke(nl, { w: 2.2 });
    if (P.decoy(s, 'dirtyNails')) k.dots(cx, cy + 30 * scale, 10, 6, '#3a2a1a', 1.4);
  }

  // ---------- Подмышки ----------
  function armpits(k, s, W, H) {
    const c = k.ctx;
    c.fillStyle = '#241c16'; c.fillRect(0, 0, W, H);
    const v = P.tell(s, 'armpits');
    const skin = v ? mix(s.skin, '#8a9098', 0.35) : s.skin;
    // поднятая рука (сверху слева), бок и грудь (справа снизу)
    const arm = k.curve([[-30, 40], [60, -10], [200, -30], [330, -20], [320, 60], [270, 150], [210, 230], [120, 250], [20, 230], [-30, 200]]);
    k.shape(arm, skin, { w: 4, shadeSide: [0, 0.6], shadeAmt: 0.18 });
    k.hatch(arm, { angle: 0.5, gap: 4.5, alpha: 0.28, dash: true, region: (x, y) => y > 150 - x * 0.1 && y < 260 });
    // мышца предплечья и локтевой изгиб
    k.stroke(k.curve([[0, 120], [90, 80], [190, 60], [300, 70]]), { closed: false, w: 1.6, alpha: 0.4 });
    // рубашка: бок
    const shirt = k.curve([[40, 420], [90, 300], [170, 260], [250, 200], [330, 150], [420, 120], [420, 420]]);
    k.shape(shirt, s.clothes.color, { w: 4, shadeSide: [-0.4, 0.4], shadeAmt: 0.2, hatch: { angle: -0.5, gap: 6, alpha: 0.3, dash: true } });
    k.stroke(k.curve([[150, 330], [220, 290], [300, 270], [380, 280]]), { closed: false, w: 2, alpha: 0.5 });
    // закатанный рукав
    const sleeve = k.curve([[250, -30], [280, 40], [320, 110], [400, 90], [410, -30]]);
    k.shape(sleeve, shade(s.clothes.color, 0.1), { w: 4, hatch: { angle: 1.2, gap: 6, alpha: 0.35 } });
    k.stroke(k.curve([[268, 10], [300, 60], [330, 100]]), { closed: false, w: 2, alpha: 0.6 });
    // складка
    const cx = 175, cy = 175;
    k.spot(cx, cy, 70, v ? '#5a6068' : '#4a2a20', 0.35);
    k.stroke(k.curve([[100, 200], [150, 190], [200, 170], [250, 120]]), { closed: false, w: 2.5, alpha: 0.7 });
    k.stroke(k.curve([[120, 225], [180, 215], [230, 190]]), { closed: false, w: 1.5, alpha: 0.5 });
    if (v) {
      // узор изморози
      const seeds = [[150, 170], [200, 150], [180, 200], [120, 190], [225, 175]];
      (s.subtle ? seeds.slice(1, 3) : seeds).forEach(sd => frost(k, sd[0], sd[1], k.srand(0, 6.28), s.subtle ? 17 : 26, s.subtle ? 3 : 4));
      if (!s.subtle) k.spot(cx, cy, 60, '#dce8f0', 0.2);
    } else {
      const shaved = P.decoy(s, 'shavedPits') && !P.decoy(s, 'hairyPits');
      const sweatOnly = s.f && !P.decoy(s, 'hairyPits') && !shaved;
      const dense = P.decoy(s, 'hairyPits') ? 90 : (sweatOnly || shaved ? 0 : 34);
      if (shaved) {
        // бритая кожа: гладко, но с точками щетины и раздражением
        k.spot(cx, cy, 60, '#8a9098', 0.18);
        k.dots(cx, cy, 46, 120, mix(s.skin, '#2a1a10', 0.6), 0.8);
        for (let i = 0; i < 5; i++) k.spot(cx + k.srand(-40, 40), cy + k.srand(-15, 20), 8, '#c4503a', 0.35);
      }
      const hx = SK.hex(s.hair.color);
      const hc = (hx[0] + hx[1] + hx[2] > 420) ? '#4a3c2e' : shade(s.hair.color, -0.25);
      for (let i = 0; i < dense; i++) {
        const a = k.srand(0, 6.28), d = Math.sqrt(k.s()) * 48;
        const x = cx + Math.cos(a) * d * 1.3, y = cy + Math.sin(a) * d * 0.7;
        const L = k.srand(10, 22);
        k.stroke(k.curve([[x, y], [x + k.srand(-6, 6), y - L * 0.5], [x + k.srand(-10, 10), y - L]]), { closed: false, w: 1.4, color: hc, alpha: 0.85 });
      }
      if (sweatOnly) k.dots(cx, cy, 40, 50, mix(s.skin, '#2a1a10', 0.5), 0.9);
      if (P.decoy(s, 'sweaty') || sweatOnly) {
        k.spot(cx + 10, cy + 10, 60, '#c8dce0', 0.35);
        for (let i = 0; i < 4; i++) {
          const x = cx + k.srand(-50, 50), y = cy + k.srand(-10, 40);
          k.shape([[x, y - 10], [x + 6, y + 3], [x, y + 8], [x - 6, y + 3]], '#d0e2e6', { w: 1.6 });
        }
      }
    }
  }
  function frost(k, x, y, a, len, depth) {
    if (depth <= 0 || len < 4) return;
    const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
    k.line(x, y, x2, y2, { w: depth * 0.5 + 0.4, color: '#f4f8fa', alpha: 0.9, jit: 0.4 });
    k.ctx.globalAlpha = 1;
    frost(k, x2, y2, a + 0.6 + k.srand(-0.2, 0.2), len * 0.68, depth - 1);
    frost(k, x2, y2, a - 0.6 + k.srand(-0.2, 0.2), len * 0.68, depth - 1);
    if (depth > 2) frost(k, (x + x2) / 2, (y + y2) / 2, a + 1.3, len * 0.45, depth - 2);
  }

  function draw(ctx, spec, type, W, H, frame, st) {
    st = st || {};
    const s = P.norm(spec);
    const k = new Sketch(ctx, s.seed * 13 + frame * 4441 + 7, { structSeed: s.seed + 17 });
    ctx.save();
    ctx.scale(W / 400, H / 400);
    if (type === 'eyes' || type === 'light') eyes(k, s, 400, 400, st);
    else if (type === 'teeth') teeth(k, s, 400, 400);
    else if (type === 'hands') hands(k, s, 400, 400);
    else if (type === 'armpits') armpits(k, s, 400, 400);
    ctx.restore();
    applyGrain(ctx, W, H, 0.5);
    vignette(ctx, W, H, 0.6);
  }

  // Описание того, что видит игрок. Текст нейтральный и одинаковый для всех:
  // признаки нужно разглядеть на рисунке самому.
  const LINES = {
    eyes: ['Вы подносите свечу ближе и всматриваетесь в глаза гостя.', 'Гость послушно смотрит на вас. Не моргает. Вы тоже.', 'Вы просите гостя замереть и смотрите ему в глаза.'],
    light: ['Вы щёлкаете фонариком и светите гостю прямо в глаза.', 'Луч фонарика бьёт в лицо. Следите за зрачками.', 'Вы светите в глаза. Гость не отворачивается.'],
    teeth: ['«Улыбнитесь, пожалуйста. Шире». Гость открывает рот.', 'Гость скалится, как на приёме у стоматолога.', 'Вы светите свечой в открытый рот.'],
    hands: ['Гость кладёт руку на подоконник, ладонью вниз.', '«Руки покажите». Гость медленно протягивает ладонь.', 'Вы разглядываете пальцы и ногти гостя.'],
    armpits: ['Гость неловко закатывает рукав и поднимает руку.', '«Руку вверх». Гость краснеет, но слушается.', 'Вы светите свечой под поднятую руку.']
  };
  function describe(c, type) {
    const arr = LINES[type] || [''];
    return arr[SK.hashStr(c.id + type) % arr.length];
  }

  window.Exam = { draw, describe };
})();
