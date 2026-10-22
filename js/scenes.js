/* Сцены: дверь, дом, телевизор, кот Тапок. */
(function () {
  'use strict';
  const { Sketch, mix, shade, INK, applyGrain, vignette } = SK;

  function begin(ctx, W, H, seed, frame, LW, LH) {
    const k = new Sketch(ctx, seed * 17 + frame * 7717, { structSeed: seed });
    ctx.save();
    ctx.scale(W / LW, H / LH);
    return k;
  }
  function end(ctx, W, H, g, v) {
    ctx.restore();
    applyGrain(ctx, W, H, g == null ? 0.5 : g);
    vignette(ctx, W, H, v == null ? 0.55 : v);
  }

  // ---------- Дверь изнутри ----------
  function door(ctx, W, H, frame, o) {
    o = o || {};
    const k = begin(ctx, W, H, 501, frame, 400, 500);
    const c = ctx;
    // обои
    c.fillStyle = '#3a2c22'; c.fillRect(0, 0, 400, 500);
    for (let x = 0; x < 400; x += 34) k.line(x + 6, 0, x + 8, 500, { w: 6, color: '#45352a', alpha: 0.8, jit: 1 });
    for (let x = 0; x < 400; x += 34) for (let y = 20; y < 500; y += 60) k.shape(k.blob(x + 23, y, 5, 8), '#5a4232', { w: 0 });
    k.spot(200, 250, 260, '#e8a850', o.lamp == null ? 0.18 : o.lamp);
    // наличник
    const fr = [[70, 30], [330, 30], [336, 470], [64, 470]];
    k.shape(fr, '#4a3020', { w: 4, hatch: { angle: 1.5, gap: 6, alpha: 0.35, dash: true } });
    // полотно
    const d = [[92, 52], [308, 52], [312, 470], [88, 470]];
    k.shape(d, '#6b4a2e', { w: 4, shadeSide: [0.8, 0], shadeAmt: 0.25 });
    for (let x = 130; x < 300; x += 44) k.line(x, 56, x + 2, 466, { w: 2, alpha: 0.6 });
    k.hatch(d, { angle: 1.52, gap: 5, alpha: 0.25, dash: true });
    // филёнки
    k.stroke([[118, 90], [282, 90], [284, 230], [116, 230]], { w: 2.5, alpha: 0.7 });
    k.stroke([[116, 270], [284, 270], [286, 440], [114, 440]], { w: 2.5, alpha: 0.7 });
    // глазок
    const gl = o.peep == null ? 0.5 : o.peep;
    k.spot(200, 160, 40, '#f2d088', gl);
    k.shape(k.blob(200, 160, 13, 13), '#b08a35', { w: 3 });
    k.shape(k.blob(200, 160, 6, 6), mix('#1a120c', '#f2d088', gl), { w: 1.5 });
    // цепочка и задвижка
    k.shape([[268, 200], [292, 200], [292, 216], [268, 216]], '#8a8a80', { w: 2 });
    for (let i = 0; i < 6; i++) k.stroke(k.blob(262 - i * 9, 212 + i * 6, 6, 4, { rot: 0.5 }), { w: 2, color: '#9a9a90' });
    k.shape([[100, 300], [128, 300], [128, 318], [100, 318]], '#8a8a80', { w: 2 });
    // ручка
    k.shape(k.blob(272, 300, 12, 12), '#b08a35', { w: 3 });
    k.shape([[262, 320], [282, 320], [282, 350], [262, 350]], '#8a6a2a', { w: 2 });
    // свет из-под двери
    k.shape([[92, 462], [308, 462], [312, 472], [88, 472]], '#f2c878', { w: 0 });
    k.spot(200, 480, 160, '#f2c878', 0.35 * (o.under == null ? 1 : o.under));
    // тени ног снаружи
    if (o.feet) {
      c.fillStyle = 'rgba(15,10,6,0.9)';
      c.fillRect(165, 462, 26, 10); c.fillRect(212, 462, 26, 10);
    }
    // пол
    k.shape([[0, 470], [400, 470], [400, 500], [0, 500]], '#2a1c12', { w: 3, hatch: { angle: 0.05, gap: 5, alpha: 0.4 } });
    end(ctx, W, H, 0.5, 0.6);
  }

  // ---------- Дом снаружи (титул и концовки) ----------
  function house(ctx, W, H, frame, mood) {
    mood = mood || 'title';
    const k = begin(ctx, W, H, 777, frame, 400, 500);
    const c = ctx;
    const sun = mood === 'sun';
    const sky = c.createLinearGradient(0, 0, 0, 340);
    if (sun) { sky.addColorStop(0, '#e8b878'); sky.addColorStop(1, '#f2d8a0'); }
    else { sky.addColorStop(0, '#141c24'); sky.addColorStop(1, '#3a3030'); }
    c.fillStyle = sky; c.fillRect(0, 0, 400, 500);
    k.scribble(0, 0, 400, 300, { n: 30, color: sun ? '#c88a50' : '#0a0e14', alpha: 0.25, len: 60, w: 3 });
    if (sun) {
      k.spot(300, 110, 160, '#fff2c8', 0.8);
      k.shape(k.blob(300, 110, 46, 46), '#fff0c0', { w: 3, color: '#c88a40' });
      for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28; k.line(300 + Math.cos(a) * 58, 110 + Math.sin(a) * 58, 300 + Math.cos(a) * 80, 110 + Math.sin(a) * 80, { w: 3, color: '#c88a40' }); }
    } else {
      k.spot(310, 80, 90, '#d8d0b0', 0.35);
      const moon = k.blob(310, 80, 30, 30);
      k.shape(moon, '#e0d8bc', { w: 3 });
      k.clip(moon, () => k.shape(k.blob(326, 72, 28, 30), '#b8ae90', { w: 0 }));
      for (let i = 0; i < 18; i++) k.shape(k.blob(k.srand(10, 390), k.srand(10, 200), 1.6, 1.6), '#e8e0c8', { w: 0, alpha: 0.7 });
    }
    // холмы
    k.shape(k.curve([[-10, 330], [80, 300], [200, 318], [320, 296], [410, 320], [410, 500], [-10, 500]]), sun ? '#7a7a4a' : '#1c1a16', { w: 3, hatch: { angle: -0.3, gap: 6, alpha: 0.3, dash: true } });
    // дом
    const wall = [[90, 210], [310, 210], [316, 420], [84, 420]];
    k.shape(wall, sun ? '#a87a52' : '#4a3628', { w: 4, shadeSide: [0.7, 0], shadeAmt: 0.3, hatch: { angle: 0.05, gap: 9, alpha: 0.35, dash: true } });
    const roof = [[66, 216], [200, 110], [334, 216]];
    k.shape(roof, sun ? '#7a3a2a' : '#2a1c16', { w: 4, hatch: { angle: 0.6, gap: 6, alpha: 0.4, cross: true } });
    k.shape([[250, 160], [272, 160], [272, 120], [250, 120]], sun ? '#6a3a2a' : '#241812', { w: 3 });
    if (!sun) for (let i = 0; i < 3; i++) k.stroke(k.curve([[262, 112 - i * 22], [270 + i * 4, 100 - i * 22], [258, 88 - i * 22]]), { closed: false, w: 2, color: '#6a6458', alpha: 0.4 });
    // окна
    const lit = mood === 'title' || mood === 'hunter' ? [1, 0] : (mood === 'together' || mood === 'sun' ? [1, 1] : (mood === 'family' ? [1, 1] : (mood === 'taken' ? [0, 0] : [1, 0])));
    [[130, 260], [270, 260]].forEach(([x, y], i) => {
      const win = [[x - 32, y - 30], [x + 32, y - 30], [x + 32, y + 34], [x - 32, y + 34]];
      const on = lit[i];
      k.shape(win, on ? '#f2c060' : '#1a140e', { w: 3.5 });
      if (on && !sun) k.spot(x, y, 70, '#f2c060', 0.35);
      if (mood === 'family' && on) {
        // силуэты с улыбками
        for (let j = 0; j < 2; j++) {
          const fx = x - 12 + j * 24;
          k.shape(k.blob(fx, y + 14, 10, 13), '#2a1a12', { w: 0 });
          k.shape(k.blob(fx, y + 34, 13, 8), '#2a1a12', { w: 0 });
          k.shape(k.blob(fx - 4, y + 10, 1.6, 1.6), '#f2e0b0', { w: 0 });
          k.shape(k.blob(fx + 4, y + 10, 1.6, 1.6), '#f2e0b0', { w: 0 });
          k.stroke(k.curve([[fx - 7, y + 16], [fx, y + 21], [fx + 7, y + 16]]), { closed: false, w: 1.4, color: '#f2e0b0' });
        }
      }
      if (mood === 'alone' && on) {
        k.shape(k.blob(x, y + 22, 12, 10), '#1a120c', { w: 0 });
        k.shape([[x - 9, y + 14], [x - 6, y + 4], [x - 2, y + 13]], '#1a120c', { w: 0 });
        k.shape([[x + 2, y + 13], [x + 6, y + 4], [x + 9, y + 14]], '#1a120c', { w: 0 });
      }
      k.line(x, y - 30, x, y + 34, { w: 2.5 });
      k.line(x - 32, y + 2, x + 32, y + 2, { w: 2.5 });
      // ставни
      if (!on || mood === 'title') {
        const sh = mood === 'title' && on ? 0.45 : 1;
        k.shape([[x - 32 - 30 * sh, y - 32], [x - 32, y - 32], [x - 32, y + 36], [x - 32 - 30 * sh, y + 36]], sun ? '#4a6a6a' : '#2c3a3a', { w: 3, hatch: { angle: 0, gap: 6, alpha: 0.5 } });
        k.shape([[x + 32, y - 32], [x + 32 + 30, y - 32], [x + 32 + 30, y + 36], [x + 32, y + 36]], sun ? '#4a6a6a' : '#2c3a3a', { w: 3, hatch: { angle: 0, gap: 6, alpha: 0.5 } });
      }
    });
    // дверь
    const dr = [[178, 320], [222, 320], [224, 420], [176, 420]];
    k.shape(dr, sun ? '#6a4a2e' : '#2a1c12', { w: 3.5 });
    k.spot(200, 330, 14, '#f2c060', mood === 'title' ? 0.6 : 0.2);
    k.shape(k.blob(200, 344, 3, 3), '#f2c060', { w: 0 });
    // крыльцо
    k.shape([[160, 420], [240, 420], [248, 436], [152, 436]], sun ? '#8a6a4a' : '#3a2a1e', { w: 3 });
    // забор
    for (let x = 0; x < 400; x += 26) {
      if (x > 140 && x < 260) continue;
      const h = 60 + (x * 7) % 15;
      k.shape([[x, 470], [x + 14, 470], [x + 14, 470 - h], [x + 7, 462 - h], [x, 470 - h]], sun ? '#8a6a3a' : '#2a221a', { w: 2.5 });
    }
    k.line(0, 430, 140, 432, { w: 4, color: sun ? '#6a4a2a' : '#1a140e' });
    k.line(260, 432, 400, 430, { w: 4, color: sun ? '#6a4a2a' : '#1a140e' });
    if (mood === 'title') {
      // гость у двери — длинная фигура
      const g = k.curve([[236, 436], [240, 380], [244, 320], [250, 300], [262, 296], [270, 306], [268, 330], [272, 380], [276, 436]]);
      k.shape(g, '#0e0a08', { w: 2.5 });
      k.shape(k.blob(258, 290, 12, 15), '#0e0a08', { w: 2.5 });
      k.line(246, 330, 230, 334, { w: 5, color: '#0e0a08' }); // рука тянется к двери
      k.shape(k.blob(254, 287, 2, 1.5), '#f2e0b0', { w: 0 });
      k.shape(k.blob(262, 287, 2, 1.5), '#f2e0b0', { w: 0 });
    }
    if (mood === 'hunter') {
      // жёлтый костюм патруля у двери и фонарик
      const g = k.curve([[236, 436], [238, 370], [244, 320], [270, 312], [278, 340], [276, 436]]);
      k.shape(g, '#c8a030', { w: 3 });
      k.shape(k.blob(258, 300, 18, 20), '#c8a030', { w: 3 });
      k.shape(k.blob(258, 302, 11, 12), '#6a8a7a', { w: 2 });
      c.save(); c.globalAlpha = 0.35; c.fillStyle = '#f2e0a0';
      c.beginPath(); c.moveTo(232, 350); c.lineTo(120, 300); c.lineTo(130, 400); c.closePath(); c.fill(); c.restore();
    }
    if (mood === 'together' || mood === 'sun') {
      k.spot(200, 430, 120, '#f2c060', 0.25);
    }
    end(ctx, W, H, 0.5, 0.55);
  }

  // ---------- Телевизор ----------
  function tvBody(ctx, W, H, frame) {
    const k = begin(ctx, W, H, 333, frame, 400, 400);
    const c = ctx;
    c.fillStyle = '#2a1e16'; c.fillRect(0, 0, 400, 400);
    k.spot(200, 180, 260, '#7a9a9a', 0.18);
    // столик
    k.shape([[30, 340], [370, 340], [380, 400], [20, 400]], '#4a3020', { w: 3, hatch: { angle: 0.05, gap: 6, alpha: 0.4, dash: true } });
    // корпус
    const body = k.blob(200, 190, 175, 150, { squareness: 0.75, irr: 0.03 });
    k.shape(body, '#6b4a2a', { w: 4.5, shadeSide: [0.7, 0.5], shadeAmt: 0.25, hatch: { angle: 0.1, gap: 6, alpha: 0.3, dash: true } });
    // рамка экрана
    const fr = k.blob(170, 185, 128, 112, { squareness: 0.6, irr: 0.03 });
    k.shape(fr, '#1a1410', { w: 4 });
    // ручки
    for (let i = 0; i < 2; i++) {
      k.shape(k.blob(338, 120 + i * 60, 16, 16), '#c9b48a', { w: 3 });
      k.line(338, 108 + i * 60, 338 + (i ? 8 : -6), 122 + i * 60, { w: 3 });
    }
    k.shape([[322, 240], [354, 240], [354, 300], [322, 300]], '#3a2a1a', { w: 2.5, hatch: { angle: 0, gap: 4, alpha: 0.7, color: '#000' } });
    // антенна
    k.line(200, 42, 140, -20, { w: 3.5 });
    k.line(200, 42, 270, -16, { w: 3.5 });
    k.shape(k.blob(200, 44, 22, 10), '#3a2a1a', { w: 3 });
    // ножки
    k.line(90, 330, 80, 345, { w: 6 });
    k.line(310, 330, 320, 345, { w: 6 });
    end(ctx, W, H, 0.45, 0.5);
    return { x: 170 - 112, y: 185 - 98, w: 224, h: 196 }; // область экрана в логических единицах
  }

  // Экран телевизора: ведущая + помехи (рисуется каждый кадр)
  function tvScreen(ctx, W, H, anchorCanvas, t, on) {
    const sx = W / 400, sy = H / 400;
    const r = { x: 62 * sx, y: 92 * sy, w: 216 * sx, h: 186 * sy };
    ctx.save();
    ctx.beginPath();
    const rr = 26 * sx;
    ctx.moveTo(r.x + rr, r.y); ctx.lineTo(r.x + r.w - rr, r.y); ctx.quadraticCurveTo(r.x + r.w, r.y, r.x + r.w, r.y + rr);
    ctx.lineTo(r.x + r.w, r.y + r.h - rr); ctx.quadraticCurveTo(r.x + r.w, r.y + r.h, r.x + r.w - rr, r.y + r.h);
    ctx.lineTo(r.x + rr, r.y + r.h); ctx.quadraticCurveTo(r.x, r.y + r.h, r.x, r.y + r.h - rr);
    ctx.lineTo(r.x, r.y + rr); ctx.quadraticCurveTo(r.x, r.y, r.x + rr, r.y);
    ctx.clip();
    ctx.fillStyle = '#101814'; ctx.fillRect(r.x, r.y, r.w, r.h);
    if (on && anchorCanvas) {
      const jx = (Math.random() < 0.08 ? (Math.random() - 0.5) * 10 * sx : 0);
      ctx.globalAlpha = 0.92;
      ctx.filter = 'saturate(0.55) sepia(0.25) hue-rotate(110deg) brightness(1.05)';
      const aw = r.w * 1.05, ah = aw * 1.25;
      ctx.drawImage(anchorCanvas, r.x - (aw - r.w) / 2 + jx, r.y - ah * 0.12, aw, ah);
      ctx.filter = 'none';
      ctx.globalAlpha = 1;
    }
    // строки развёртки
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    for (let y = r.y; y < r.y + r.h; y += 3 * sy) ctx.fillRect(r.x, y, r.w, 1.2 * sy);
    // бегущая полоса
    const by = r.y + ((t / 30) % 1) * r.h;
    ctx.fillStyle = 'rgba(200,255,230,0.07)';
    ctx.fillRect(r.x, by, r.w, 24 * sy);
    // снег
    const n = on ? 260 : 1800;
    for (let i = 0; i < n; i++) {
      const v = Math.random() * 255 | 0;
      ctx.fillStyle = `rgba(${v},${v},${v},${on ? 0.35 : 0.8})`;
      ctx.fillRect(r.x + Math.random() * r.w, r.y + Math.random() * r.h, 2 * sx, 1.5 * sy);
    }
    // блик стекла
    const g = ctx.createRadialGradient(r.x + r.w * 0.3, r.y + r.h * 0.2, 0, r.x + r.w * 0.3, r.y + r.h * 0.2, r.w * 0.6);
    g.addColorStop(0, 'rgba(255,255,255,0.14)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.restore();
  }

  // ---------- Кот Тапок ----------
  function cat(ctx, W, H, frame, o) {
    o = o || {};
    const k = begin(ctx, W, H, 909, frame, 400, 500);
    const c = ctx;
    c.fillStyle = '#2a221d'; c.fillRect(0, 0, 400, 500);
    k.spot(120, 40, 360, '#e8b85a', 0.3);
    const fur = '#8a6a4a';
    // тело
    k.shape(k.blob(200, 430, 150, 110), fur, { w: 4, hatch: { angle: -0.5, gap: 6, alpha: 0.35, dash: true } });
    // уши
    k.shape([[100, 190], [116, 80], [180, 160]], fur, { w: 4 });
    k.shape([[300, 190], [284, 80], [220, 160]], fur, { w: 4 });
    k.shape([[118, 172], [124, 108], [162, 160]], '#c48a7a', { w: 2 });
    k.shape([[282, 172], [276, 108], [238, 160]], '#c48a7a', { w: 2 });
    // голова
    const hd = k.blob(200, 250, 125, 105, { irr: 0.06, taper: 0.25 });
    k.shape(hd, fur, { w: 4.5, shadeSide: [0.6, 0.4], shadeAmt: 0.2 });
    // полоски
    for (let i = 0; i < 4; i++) k.clip(hd, () => k.stroke(k.curve([[150 + i * 30, 150], [155 + i * 30, 185], [148 + i * 30, 205]]), { closed: false, w: 7, color: '#5a3e28' }));
    k.clip(hd, () => { for (const side of [-1, 1]) for (let i = 0; i < 3; i++) k.line(200 + side * 125, 250 + i * 20, 200 + side * 85, 245 + i * 18, { w: 5, color: '#5a3e28' }); });
    // морда
    k.shape(k.blob(200, 300, 60, 40), '#e8d6b8', { w: 0 });
    // глаза
    for (const side of [-1, 1]) {
      const x = 200 + side * 50, y = 245;
      if (o.blink) { k.stroke(k.curve([[x - 26, y], [x, y + 8], [x + 26, y]]), { closed: false, w: 4 }); continue; }
      k.shape(k.blob(x, y, 28, 24), '#d8b830', { w: 4 });
      k.shape(k.blob(x + (o.look || 0) * 6, y, 6, 20), '#0e0906', { w: 0 });
      k.shape(k.blob(x - 8, y - 9, 5, 4), '#fffaf0', { w: 0 });
    }
    // нос и рот
    k.shape([[188, 282], [212, 282], [200, 296]], '#c46a6a', { w: 2.5 });
    k.stroke(k.curve([[200, 296], [196, 308], [184, 312]]), { closed: false, w: 2.5 });
    k.stroke(k.curve([[200, 296], [204, 308], [216, 312]]), { closed: false, w: 2.5 });
    // усы
    for (const side of [-1, 1]) for (let i = 0; i < 3; i++) k.line(200 + side * 40, 300 + i * 8, 200 + side * 140, 285 + i * 18, { w: 1.6, bend: side * 6, alpha: 0.85 });
    end(ctx, W, H, 0.5, 0.5);
  }

  window.Scenes = { door, house, tvBody, tvScreen, cat };
})();
