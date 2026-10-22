/* Звук: всё синтезируется через Web Audio, без файлов. */
(function () {
  'use strict';
  let ac = null, master = null, amb = null, tv = null;
  let muted = false;

  // iOS Safari: Web Audio по умолчанию идёт в «фоновый» канал и молчит,
  // когда на iPhone включён беззвучный режим. Просим канал «воспроизведение»
  // (Safari 16.4+), а на старых версиях держим тихий <audio> — он делает то же.
  let silentEl = null;
  function silentWavURL() {
    const n = 800, rate = 8000;
    const b = new Uint8Array(44 + n);
    const v = new DataView(b.buffer);
    const str = (o, t) => { for (let i = 0; i < t.length; i++) b[o + i] = t.charCodeAt(i); };
    str(0, 'RIFF'); v.setUint32(4, 36 + n, true); str(8, 'WAVE'); str(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, rate, true); v.setUint32(28, rate, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
    str(36, 'data'); v.setUint32(40, n, true);
    b.fill(128, 44);
    let bin = '';
    for (let i = 0; i < b.length; i++) bin += String.fromCharCode(b[i]);
    return 'data:audio/wav;base64,' + btoa(bin);
  }
  function iosPlayback() {
    try {
      if (navigator.audioSession && navigator.audioSession.type !== 'playback') { navigator.audioSession.type = 'playback'; return; }
    } catch (e) { /* нет API — идём дальше */ }
    if (navigator.audioSession) return;
    const iOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (!iOS) return;
    try {
      if (!silentEl) {
        silentEl = document.createElement('audio');
        silentEl.setAttribute('x-webkit-airplay', 'deny');
        silentEl.setAttribute('playsinline', '');
        silentEl.preload = 'auto';
        silentEl.loop = true;
        silentEl.src = silentWavURL();
      }
      const p = silentEl.play();
      if (p && p.catch) p.catch(() => {});
    } catch (e) { /* не вышло — значит, без этого */ }
  }

  function resume() {
    try { const r = ac.resume(); if (r && r.catch) r.catch(() => {}); } catch (e) { /* старый Safari */ }
  }

  function init() {
    if (ac) {
      // на iOS контекст бывает «interrupted» после звонка или сворачивания
      if (ac.state !== 'running') resume();
      return true;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      iosPlayback();
      ac = new AC();
      master = ac.createGain();
      master.gain.value = muted ? 0 : 0.8;
      master.connect(ac.destination);
      // короткий пустой буфер внутри жеста «разблокирует» звук в Safari
      const b = ac.createBuffer(1, 1, 22050);
      const src = ac.createBufferSource();
      src.buffer = b; src.connect(ac.destination); src.start(0);
      if (ac.state !== 'running') resume();
      return true;
    } catch (e) { ac = null; return false; }
  }
  // Разблокируем на любом касании, а не только на кнопках
  function unlock() { iosPlayback(); init(); }
  ['touchend', 'pointerup', 'click', 'keydown'].forEach(ev => document.addEventListener(ev, unlock, { capture: true, passive: true }));
  document.addEventListener('visibilitychange', () => { if (!document.hidden && ac && ac.state !== 'running') resume(); });

  function noiseBuffer(sec, brown) {
    const len = Math.floor(ac.sampleRate * sec);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
    }
    return buf;
  }
  let whiteBuf = null, brownBuf = null;
  function white() { return whiteBuf || (whiteBuf = noiseBuffer(2, false)); }
  function brown() { return brownBuf || (brownBuf = noiseBuffer(4, true)); }

  function env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  // ---------- Эмбиент: гул, ветер, скрипы ----------
  function startAmbient(mood) {
    if (!init()) return;
    stopAmbient();
    const out = ac.createGain();
    out.gain.value = 0;
    out.gain.linearRampToValueAtTime(mood === 'morning' ? 0.22 : 0.35, ac.currentTime + 3);
    out.connect(master);
    const nodes = [];
    // низкий гул из расстроенных синусов
    const base = mood === 'morning' ? 73.4 : 55;
    [1, 1.007, 1.5, 2.01].forEach((m, i) => {
      const o = ac.createOscillator();
      o.type = i === 2 ? 'triangle' : 'sine';
      o.frequency.value = base * m;
      const g = ac.createGain();
      g.gain.value = [0.22, 0.18, 0.05, 0.04][i];
      o.connect(g); g.connect(out); o.start();
      nodes.push(o);
    });
    // ветер
    const n = ac.createBufferSource();
    n.buffer = brown(); n.loop = true;
    const f = ac.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 400; f.Q.value = 3;
    const lfo = ac.createOscillator();
    lfo.frequency.value = 0.07;
    const lg = ac.createGain(); lg.gain.value = 260;
    lfo.connect(lg); lg.connect(f.frequency); lfo.start();
    const ng = ac.createGain(); ng.gain.value = mood === 'morning' ? 0.25 : 0.5;
    n.connect(f); f.connect(ng); ng.connect(out); n.start();
    nodes.push(n, lfo);
    // случайные скрипы и тиканье
    let alive = true;
    function creakLoop() {
      if (!alive) return;
      if (!muted && Math.random() < 0.6) creak(0.06 + Math.random() * 0.05);
      setTimeout(creakLoop, 6000 + Math.random() * 9000);
    }
    setTimeout(creakLoop, 4000);
    amb = { out, nodes, stop() { alive = false; } };
  }
  function stopAmbient() {
    if (!amb || !ac) return;
    const a = amb; amb = null;
    a.stop();
    a.out.gain.cancelScheduledValues(ac.currentTime);
    a.out.gain.setValueAtTime(a.out.gain.value, ac.currentTime);
    a.out.gain.linearRampToValueAtTime(0, ac.currentTime + 1.2);
    setTimeout(() => { a.nodes.forEach(n => { try { n.stop(); } catch (e) {} }); a.out.disconnect(); }, 1400);
  }

  function creak(vol) {
    if (!ac) return;
    const t = ac.currentTime;
    const o = ac.createOscillator();
    o.type = 'sawtooth';
    const f0 = 180 + Math.random() * 200;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.linearRampToValueAtTime(f0 * (0.7 + Math.random() * 0.6), t + 0.8);
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 8;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.2);
    g.gain.linearRampToValueAtTime(vol * 0.6, t + 0.5);
    g.gain.linearRampToValueAtTime(0.0001, t + 0.9);
    // дрожание — частая модуляция громкости
    const am = ac.createOscillator(); am.frequency.value = 23;
    const amg = ac.createGain(); amg.gain.value = vol * 0.5;
    am.connect(amg); amg.connect(g.gain);
    o.connect(bp); bp.connect(g); g.connect(master);
    o.start(t); am.start(t); o.stop(t + 1); am.stop(t + 1);
  }

  // ---------- Стук в дверь ----------
  function knock(times, heavy) {
    if (!init()) return;
    times = times || 3;
    const t0 = ac.currentTime + 0.05;
    for (let i = 0; i < times; i++) {
      const t = t0 + i * (0.26 + Math.random() * 0.05);
      const v = (heavy ? 1 : 0.75) * (1 - i * 0.08);
      // удар дерева: низкий синус + шум
      const o = ac.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(140, t);
      o.frequency.exponentialRampToValueAtTime(55, t + 0.12);
      const g = ac.createGain(); env(g, t, 0.004, 0.9 * v, 0.2);
      o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.3);
      const n = ac.createBufferSource(); n.buffer = white();
      const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
      const f2 = ac.createBiquadFilter(); f2.type = 'peaking'; f2.frequency.value = 320; f2.gain.value = 12;
      const ng = ac.createGain(); env(ng, t, 0.002, 0.7 * v, 0.09);
      n.connect(f); f.connect(f2); f2.connect(ng); ng.connect(master);
      n.start(t, Math.random()); n.stop(t + 0.15);
    }
  }

  // ---------- Телевизор ----------
  function tvOn() {
    if (!init()) return;
    tvOff();
    const out = ac.createGain(); out.gain.value = 0.0001;
    out.gain.exponentialRampToValueAtTime(0.18, ac.currentTime + 0.1);
    out.connect(master);
    const n = ac.createBufferSource(); n.buffer = white(); n.loop = true;
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2800; bp.Q.value = 0.6;
    const ng = ac.createGain(); ng.gain.value = 0.35;
    n.connect(bp); bp.connect(ng); ng.connect(out); n.start();
    // гул кинескопа
    const h = ac.createOscillator(); h.type = 'square'; h.frequency.value = 50;
    const hf = ac.createBiquadFilter(); hf.type = 'lowpass'; hf.frequency.value = 200;
    const hg = ac.createGain(); hg.gain.value = 0.15;
    h.connect(hf); hf.connect(hg); hg.connect(out); h.start();
    const whine = ac.createOscillator(); whine.frequency.value = 15625 / 2;
    const wg = ac.createGain(); wg.gain.value = 0.006;
    whine.connect(wg); wg.connect(out); whine.start();
    // треск: скачки громкости шума
    let alive = true;
    function crackle() {
      if (!alive) return;
      const t = ac.currentTime;
      ng.gain.setValueAtTime(0.35 + Math.random() * 0.6, t);
      ng.gain.linearRampToValueAtTime(0.25, t + 0.08);
      setTimeout(crackle, 80 + Math.random() * 400);
    }
    crackle();
    tv = { out, ng, nodes: [n, h, whine], stop() { alive = false; } };
  }
  function tvQuiet(on) { if (tv && ac) tv.out.gain.setTargetAtTime(on ? 0.05 : 0.18, ac.currentTime, 0.2); }
  function tvOff() {
    if (!tv || !ac) return;
    const x = tv; tv = null; x.stop();
    x.out.gain.setTargetAtTime(0.0001, ac.currentTime, 0.05);
    setTimeout(() => { x.nodes.forEach(n => { try { n.stop(); } catch (e) {} }); x.out.disconnect(); }, 400);
    blip(1200, 0.08, 0.06);
  }

  // ---------- Мелкие звуки ----------
  function blip(freq, vol, dur, type) {
    if (!init()) return;
    const t = ac.currentTime;
    const o = ac.createOscillator(); o.type = type || 'triangle';
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(freq * 0.7, t + dur);
    const g = ac.createGain(); env(g, t, 0.005, vol, dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  function click() { blip(700, 0.05, 0.05, 'square'); }
  function page() {
    if (!init()) return;
    const t = ac.currentTime;
    const n = ac.createBufferSource(); n.buffer = white();
    const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2500;
    const g = ac.createGain(); env(g, t, 0.02, 0.08, 0.18);
    n.connect(f); f.connect(g); g.connect(master); n.start(t, Math.random()); n.stop(t + 0.25);
  }
  function flash() {
    click();
    setTimeout(() => blip(2400, 0.03, 0.3, 'sine'), 60);
  }
  function door(open) {
    if (!init()) return;
    creak(0.12);
    const t = ac.currentTime + (open ? 0.6 : 0.05);
    const o = ac.createOscillator(); o.frequency.setValueAtTime(open ? 90 : 70, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.2);
    const g = ac.createGain(); env(g, t, 0.005, open ? 0.3 : 0.7, 0.25);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.4);
  }
  function sting() {
    if (!init()) return;
    const t = ac.currentTime;
    [220, 233, 311].forEach((f, i) => {
      const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(300, t); lp.frequency.linearRampToValueAtTime(1600, t + 1.5);
      const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + 0.4 + i * 0.1); g.gain.linearRampToValueAtTime(0.0001, t + 2.6);
      o.connect(lp); lp.connect(g); g.connect(master); o.start(t); o.stop(t + 2.7);
    });
  }
  function bell() {
    if (!init()) return;
    const t = ac.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      const o = ac.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const g = ac.createGain(); env(g, t + i * 0.18, 0.01, 0.06, 2.2);
      o.connect(g); g.connect(master); o.start(t + i * 0.18); o.stop(t + i * 0.18 + 2.4);
    });
  }

  function setMuted(m) {
    muted = m;
    if (master && ac) master.gain.setTargetAtTime(m ? 0 : 0.8, ac.currentTime, 0.05);
  }

  window.Sound = { init, startAmbient, stopAmbient, knock, tvOn, tvOff, tvQuiet, click, page, flash, door, sting, bell, creak: () => creak(0.08), setMuted, get muted() { return muted; } };
})();
