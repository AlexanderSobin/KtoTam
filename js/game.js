/* «Кто там?» — логика игры, экраны, сохранение. */
(function () {
  'use strict';
  const D = DATA;
  const app = document.getElementById('app');
  const SAVE_KEY = 'ktotam.save.v1';
  const META_KEY = 'ktotam.meta.v1';
  const NIGHTS_TOTAL = D.NIGHTS.length;
  const DOOR_CHECKS = 3;
  const MORNING_CHECKS = 2;

  // ---------- Хранилище с защитой от ошибок ----------
  const store = {
    get(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* нет доступа — не страшно */ } }
  };
  let meta = store.get(META_KEY);
  if (!meta || typeof meta !== 'object') meta = { endings: [], muted: false };
  if (!Array.isArray(meta.endings)) meta.endings = [];
  const saveMeta = () => store.set(META_KEY, meta);
  Sound.setMuted(!!meta.muted);

  let S = null;
  function newState() {
    return {
      v: 2, night: 0, phase: 'intro', gi: 0,
      roll: rollCast(),
      house: [], // {id, since}
      away: [],  // id прогнанных
      gone: [],  // id погибших/исчезнувших
      pending: [], // строки для утреннего отчёта
      morningLeft: 0, bonus: 0,
      rules: [], myths: [],
      stats: { inH: 0, inV: 0, awayH: 0, awayV: 0, takenH: 0, expH: 0, expV: 0, patrolV: 0 },
      flags: {}
    };
  }
  function save() { if (S) store.set(SAVE_KEY, S); }
  function validSave(x) {
    return x && x.v === 2 && x.roll && Array.isArray(x.roll.order) && typeof x.night === 'number' && Array.isArray(x.house) && x.stats && typeof x.phase === 'string';
  }

  // ---------- Случайный расклад на прохождение ----------
  // Кто из «сомнительных» гостей окажется Посетителем, какие признаки
  // у кого видны, кто когда стучит — всё решается заново в каждой игре.
  const DECOY_POOL = ['redEyes', 'yellowTeeth', 'missingTooth', 'goldTooth', 'dirtyNails', 'sweaty', 'hairyPits'];
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function rollCast() {
    const ids = Object.keys(D.C);
    const maybe = ids.filter(id => D.C[id].visitor === 'maybe');
    let v;
    do {
      v = {};
      maybe.forEach(id => { v[id] = Math.random() < 0.42; });
    } while (maybe.filter(id => v[id]).length < 3 || maybe.filter(id => v[id]).length > 6);
    ids.forEach(id => { if (D.C[id].visitor !== 'maybe') v[id] = !!D.C[id].visitor; });
    const nightOf = {};
    D.NIGHTS.forEach((n, i) => n.guests.forEach(id => { nightOf[id] = i; }));
    const known = [];
    const unlockedBy = D.NEWS.map(n => { known.push(...(n.rules || [])); return known.slice(); });
    const t = {}, d = {}, o = {};
    ids.forEach(id => {
      const c = D.C[id], n = nightOf[id] || 0;
      const base = (c.decoys || []).slice();
      if (v[id]) {
        const pool = shuffle(unlockedBy[n].slice());
        const cnt = n === 0 ? (Math.random() < 0.5 ? 1 : 2) : n <= 4 ? (Math.random() < 0.65 ? 1 : 2) : 1;
        t[id] = pool.slice(0, cnt);
        o[id] = t[id].includes('eyes') && n >= 3 && Math.random() < 0.6;
        if (Math.random() < 0.3) base.push(rnd(DECOY_POOL));
      } else {
        t[id] = [];
        const r = Math.random();
        const extra = r < 0.15 ? 2 : r < 0.6 ? 1 : 0;
        shuffle(DECOY_POOL.slice()).slice(0, extra).forEach(x => base.push(x));
      }
      d[id] = Array.from(new Set(base));
    });
    // порядок стуков и ночь патруля
    const order = D.NIGHTS.map(n => {
      const l = shuffle(n.guests.filter(id => id !== 'liza2'));
      if (n.guests.includes('liza2')) l.push('liza2');
      return l;
    });
    const pn = 3 + Math.floor(Math.random() * 3);
    order[pn].splice(Math.floor(Math.random() * (order[pn].length + 1)), 0, 'patrol');
    return { v, t, d, o, order, patrolNight: pn };
  }

  // ---------- Утилиты ----------
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function btn(label, cls, fn, sub) {
    const b = el('button', 'btn ' + (cls || ''));
    b.innerHTML = label + (sub ? `<span class="sub">${sub}</span>` : '');
    b.addEventListener('click', (ev) => { ev.stopPropagation(); Sound.init(); Sound.click(); fn(ev); });
    return b;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  const g = (c, m, f) => (c && c.f ? f : m);
  let castFor = null, cast = {};
  function C(id) {
    if (id === 'patrol') return D.PATROL;
    if (!S || !S.roll) return D.C[id];
    if (castFor !== S) { castFor = S; cast = {}; }
    if (!cast[id]) {
      const R = S.roll;
      cast[id] = Object.assign({}, D.C[id], { visitor: !!R.v[id], tells: R.t[id] || [], decoys: R.d[id] || [], oneEye: !!R.o[id], maybe: D.C[id].visitor === 'maybe' });
    }
    return cast[id];
  }
  function rnd(a) { return a[Math.floor(Math.random() * a.length)]; }
  function specOf(c) { return Object.assign({ id: c.id, tells: c.tells || [], decoys: c.decoys || [], f: c.f, oneEye: c.oneEye }, c.look); }
  // Утренняя реплика: у «переодетого» Посетителя — свои странности
  function morningLine(c, i) {
    if (c.visitor && c.maybe) {
      return D.VMORNING[i % D.VMORNING.length].replace('{name}', c.name).replace('{sat}', g(c, 'сидел', 'сидела')).replace('{said}', g(c, 'сказал', 'сказала')).replace(/\{a\}/g, g(c, '', 'а'));
    }
    return c.morning ? c.morning[i % c.morning.length] : '';
  }
  const humansIn = () => S.house.filter(h => !C(h.id).visitor);
  const visitorsIn = () => S.house.filter(h => C(h.id).visitor);
  const inHouse = id => S.house.some(h => h.id === id);

  let cleanups = [];
  function cleanup() { cleanups.forEach(f => { try { f(); } catch (e) {} }); cleanups = []; Portrait.stopAll(); }
  function screen(cls) {
    cleanup();
    app.innerHTML = '';
    const s = el('div', 'screen ' + (cls || ''));
    app.appendChild(s);
    return s;
  }
  function overlay(cls) {
    const o = el('div', 'overlay ' + (cls || ''));
    app.appendChild(o);
    return o;
  }
  function closeOverlays() { app.querySelectorAll('.overlay').forEach(o => o.remove()); }

  // Печатная машинка
  function typeText(node, text, speed) {
    node.textContent = '';
    let i = 0, done = false;
    const t = setInterval(() => {
      i += 2;
      node.textContent = text.slice(0, i);
      if (i >= text.length) finish();
    }, speed || 22);
    function finish() { if (done) return; done = true; clearInterval(t); node.textContent = text; }
    cleanups.push(finish);
    node.addEventListener('click', finish, { once: true });
    return finish;
  }

  // Кэш кадров портретов
  const frameCache = new Map();
  function portraitFrames(c, w, h) {
    const key = c.id + ':' + w + 'x' + h + ':' + (c.tells || []).join() + (c.decoys || []).join() + (c.oneEye ? 1 : 0);
    if (!frameCache.has(key)) frameCache.set(key, Portrait.renderFrames(specOf(c), w, h));
    return frameCache.get(key);
  }
  function portraitCanvas(c, opts) {
    const cv = el('canvas');
    const frames = portraitFrames(c, 360, 450);
    Portrait.animate(cv, frames, opts);
    return cv;
  }
  function miniCanvas(c) {
    const cv = el('canvas');
    const frames = portraitFrames(c, 120, 150);
    cv.width = frames[0].width; cv.height = frames[0].height;
    cv.getContext('2d').drawImage(frames[0], 0, 0);
    return cv;
  }
  function staticScene(fn, w, h, arg) {
    const cv = el('canvas');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    // три кадра «кипения» линий
    const frames = [0, 1, 2].map(f => {
      const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height;
      fn(c.getContext('2d'), c.width, c.height, f, arg);
      return c;
    });
    const ctx = cv.getContext('2d');
    let f = 0;
    ctx.drawImage(frames[0], 0, 0);
    const t = setInterval(() => { f = (f + 1) % 3; ctx.clearRect(0, 0, cv.width, cv.height); ctx.drawImage(frames[f], 0, 0); }, 180);
    cleanups.push(() => clearInterval(t));
    return cv;
  }

  function topbar(title, extra) {
    const t = el('div', 'topbar');
    t.appendChild(el('div', '', title));
    const grow = el('div', 'grow pill', extra || '');
    t.appendChild(grow);
    const j = el('button', 'iconbtn', '📓');
    j.setAttribute('aria-label', 'Журнал');
    j.addEventListener('click', () => { Sound.init(); Sound.page(); showJournal(); });
    const m = el('button', 'iconbtn', meta.muted ? '🔇' : '🔊');
    m.setAttribute('aria-label', 'Звук');
    m.addEventListener('click', () => {
      meta.muted = !meta.muted; saveMeta(); Sound.setMuted(meta.muted); Sound.init();
      m.textContent = meta.muted ? '🔇' : '🔊';
    });
    t.appendChild(j); t.appendChild(m);
    return t;
  }

  // ---------- Титул ----------
  function showTitle() {
    const s = screen('title-screen');
    const saved = store.get(SAVE_KEY);
    const stage = el('div', 'stage');
    const fr = el('div', 'frame');
    fr.appendChild(staticScene(Scenes.house, 360, 450, 'title'));
    stage.appendChild(fr);
    const head = el('div', 'center-text');
    head.appendChild(el('h1', 'big-title', 'Кто там?'));
    head.appendChild(el('div', 'subtitle', 'семь ночей · одна дверь · один кот'));
    s.appendChild(head);
    s.appendChild(stage);
    const col = el('div', 'col');
    if (validSave(saved) && saved.phase !== 'ending') {
      col.appendChild(btn('Продолжить', 'green', () => { S = saved; resume(); }, `ночь ${saved.night + 1} из ${NIGHTS_TOTAL}`));
    }
    col.appendChild(btn('Новая игра', '', () => {
      S = newState(); save();
      Sound.startAmbient('night');
      showIntro(0);
    }));
    const r = el('div', 'row');
    r.appendChild(btn(meta.muted ? 'Звук: выкл' : 'Звук: вкл', 'dark small', (e) => {
      meta.muted = !meta.muted; saveMeta(); Sound.setMuted(meta.muted);
      e.currentTarget.firstChild.textContent = meta.muted ? 'Звук: выкл' : 'Звук: вкл';
    }));
    r.firstChild.style.flex = '1';
    if (meta.endings.length) {
      r.appendChild(btn(`Концовки: ${meta.endings.length}/${Object.keys(D.ENDINGS).length}`, 'dark small', showEndingsList));
      r.lastChild.style.flex = '1';
    }
    col.appendChild(r);
    s.appendChild(col);
  }

  function showEndingsList() {
    const o = overlay('center');
    const c = el('div', 'card');
    c.appendChild(el('div', 'sheet-title', 'Найденные концовки'));
    const l = el('div', 'endings-list');
    for (const k in D.ENDINGS) {
      const got = meta.endings.includes(k);
      l.appendChild(el('span', got ? 'got' : '', got ? esc(D.ENDINGS[k].title) : '???'));
    }
    c.appendChild(l);
    c.appendChild(el('div', 'fine', '<br>Разные решения ведут к разным рассветам.'));
    const r = el('div', 'row'); r.style.marginTop = '10px';
    r.appendChild(btn('Закрыть', '', () => o.remove()));
    c.appendChild(r);
    o.appendChild(c);
  }

  function resume() {
    Sound.init();
    if (S.phase === 'intro') { Sound.startAmbient('night'); showIntro(0); }
    else if (S.phase === 'news') showNews();
    else if (S.phase === 'night') { Sound.startAmbient('night'); nextGuest(); }
    else if (S.phase === 'morning') { Sound.startAmbient('morning'); showMorning(); }
    else showTitle();
  }

  // ---------- Пролог ----------
  function showIntro(i) {
    const s = screen();
    s.appendChild(topbar('Пролог'));
    const stage = el('div', 'stage');
    const fr = el('div', 'frame');
    fr.appendChild(i < 3 ? staticScene(Scenes.house, 360, 450, i === 2 ? 'alone' : 'title') : staticScene(Scenes.cat, 360, 450));
    if (i === 2 || i === 3) fr.appendChild(el('div', 'tag', i === 3 ? 'Тапок' : 'ваш дом'));
    stage.appendChild(fr);
    s.appendChild(stage);
    const card = el('div', 'card dialog tilt');
    const p = el('div');
    card.appendChild(p);
    s.appendChild(card);
    typeText(p, D.INTRO[i]);
    const r = el('div', 'row');
    if (i < D.INTRO.length - 1) r.appendChild(btn('Дальше', '', () => showIntro(i + 1)));
    else r.appendChild(btn('Включить телевизор', 'green', () => { S.phase = 'news'; save(); showNews(); }));
    s.appendChild(r);
  }

  // ---------- Новости ----------
  function showNews() {
    Sound.stopAmbient();
    const n = D.NEWS[S.night];
    const s = screen();
    s.appendChild(topbar(`Перед ночью ${S.night + 1}`));
    const stage = el('div', 'stage');
    const fr = el('div', 'frame square');
    const cv = el('canvas');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = cv.height = Math.round(360 * dpr);
    fr.appendChild(cv);
    stage.appendChild(fr);
    s.appendChild(stage);
    const bodies = [0, 1, 2].map(f => {
      const c = document.createElement('canvas'); c.width = c.height = cv.width;
      Scenes.tvBody(c.getContext('2d'), c.width, c.height, f);
      return c;
    });
    const anchor = Portrait.renderFrames(D.ANCHOR, 240, 300);
    const ctx = cv.getContext('2d');
    let f = 0, on = false;
    const t0 = performance.now();
    const tick = setInterval(() => {
      f++;
      ctx.drawImage(bodies[Math.floor(f / 2) % 3], 0, 0);
      const blink = (f % 37) < 1;
      Scenes.tvScreen(ctx, cv.width, cv.height, anchor[blink ? 3 : Math.floor(f / 2) % 3], (performance.now() - t0) / 100, on);
    }, 90);
    cleanups.push(() => clearInterval(tick));
    Sound.tvOn();
    setTimeout(() => { on = true; Sound.tvQuiet(true); }, 700);
    cleanups.push(() => Sound.tvOff());

    const card = el('div', 'card tv-text tilt scroll');
    card.style.maxHeight = '42%';
    card.appendChild(el('div', 'sheet-title', esc(n.title)));
    const body = el('div');
    card.appendChild(body);
    s.appendChild(card);
    const r = el('div', 'row'); r.style.marginTop = '8px';
    s.appendChild(r);
    let i = 0;
    function next() {
      if (i < n.text.length) {
        const p = el('p');
        body.appendChild(p);
        typeText(p, n.text[i], 16);
        p.scrollIntoView({ block: 'end' });
        i++;
        r.innerHTML = '';
        r.appendChild(btn(i < n.text.length ? 'Дальше' : 'Записать в журнал', '', next));
      } else {
        (n.rules || []).forEach(k => { if (!S.rules.includes(k)) S.rules.push(k); });
        (n.myths || []).forEach(k => { if (!S.myths.includes(k)) S.myths.push(k); });
        S.phase = 'night'; S.gi = 0; S.nightChecks = null;
        save();
        r.innerHTML = '';
        showJournal(true, () => {
          Sound.startAmbient('night');
          nightIntro();
        });
      }
    }
    next();
  }

  // ---------- Журнал ----------
  function showJournal(fresh, after) {
    const o = overlay();
    const c = el('div', 'card');
    c.appendChild(el('div', 'sheet-title', 'Журнал'));
    const n = D.NEWS[S ? S.night : 0];
    if (!S || !S.rules.length) c.appendChild(el('p', '', 'Пока пусто. Слушайте новости.'));
    else {
      c.appendChild(el('div', 'fine', 'Признаки Посетителей:'));
      S.rules.forEach(k => c.appendChild(el('div', 'rule' + (fresh && n.rules && n.rules.includes(k) ? ' new' : ''), esc(D.RULES[k]))));
      if (S.myths.length) {
        c.appendChild(el('div', 'fine', 'Это НЕ признаки:'));
        S.myths.forEach(k => c.appendChild(el('div', 'rule myth' + (fresh && n.myths && n.myths.includes(k) ? ' new' : ''), esc(D.MYTHS[k]))));
      }
    }
    if (S) {
      c.appendChild(el('div', 'fine', `<br>На двери — до ${DOOR_CHECKS} осмотров на гостя. Утром — ${MORNING_CHECKS + morningBonus()} осмотра на всех жильцов. Посетитель в доме нападает со второй ночи.`));
      if (S.house.length) c.appendChild(el('div', 'fine', 'В доме: ' + S.house.map(h => esc(C(h.id).name)).join(', ') + ', кот Тапок.'));
    }
    const r = el('div', 'row'); r.style.marginTop = '10px';
    r.appendChild(btn(after ? 'Понятно. Ждать ночи' : 'Закрыть', after ? 'green' : '', () => { o.remove(); if (after) after(); }));
    c.appendChild(r);
    o.appendChild(c);
  }
  function morningBonus() {
    return (S.house.some(h => C(h.id).perk === 'doctor') ? 1 : 0) + (S.bonus || 0);
  }

  // ---------- Ночь ----------
  function guestsTonight() {
    return S.roll.order[S.night].filter(id => {
      if (id === 'liza2') return S.away.includes('liza');
      return true;
    });
  }

  function nightIntro() {
    const s = screen();
    s.appendChild(topbar(`Ночь ${S.night + 1}`, `из ${NIGHTS_TOTAL}`));
    const stage = el('div', 'stage');
    const fr = el('div', 'frame');
    fr.appendChild(staticScene(Scenes.door, 360, 450, { lamp: 0.12, under: 0.3, peep: 0.2 }));
    stage.appendChild(fr);
    s.appendChild(stage);
    const card = el('div', 'card dialog tilt');
    const lines = [
      'Солнце село. Ставни закрыты. Тапок занял пост на тумбочке у двери.',
      'Вторая ночь. Чайник остыл. Где-то вдалеке хлопнула калитка.',
      'Третья ночь. Ветер принёс запах горелой травы.',
      'Четвёртая ночь. Половицы скрипят сами по себе. Наверное, сами.',
      'Пятая ночь. Где-то далеко лает собака. Значит, собаки ещё есть.',
      'Шестая ночь. Луна такая яркая, что хочется закрыть и её.',
      'Седьмая ночь. Последняя, говорят по телевизору. Последняя — в каком смысле?'
    ];
    const p = el('div'); card.appendChild(p);
    s.appendChild(card);
    typeText(p, lines[S.night] || lines[0]);
    const r = el('div', 'row');
    r.appendChild(btn('Ждать стука', '', () => nextGuest()));
    s.appendChild(r);
  }

  function nextGuest() {
    const list = guestsTonight();
    if (S.gi >= list.length) return nightEnd();
    const id = list[S.gi];
    showKnock(C(id), list);
  }

  function showKnock(c, list) {
    const s = screen();
    s.appendChild(topbar(`Ночь ${S.night + 1}`, `стук ${S.gi + 1} из ${list.length}`));
    const stage = el('div', 'stage');
    const fr = el('div', 'frame');
    fr.appendChild(staticScene(Scenes.door, 360, 450, { lamp: 0.18, under: 1, peep: 0.6, feet: true }));
    stage.appendChild(fr);
    s.appendChild(stage);
    const card = el('div', 'card dialog tilt');
    card.innerHTML = '<div>…</div>';
    s.appendChild(card);
    const r = el('div', 'row');
    s.appendChild(r);
    const tm = setTimeout(() => {
      const heavy = c.id === 'patrol' || c.id === 'gleb';
      Sound.knock(heavy ? 4 : 3, heavy);
      fr.classList.add('shake');
      const kt = el('div', 'knock-text', heavy ? 'БАМ! БАМ!' : 'Тук. Тук. Тук.');
      stage.appendChild(kt);
      card.innerHTML = '';
      const p = el('div'); card.appendChild(p);
      typeText(p, heavy ? 'В дверь колотят. Уверенно, по-хозяйски.' : rnd(['В дверь стучат. Осторожно, будто боятся, что вы откроете.', 'Стук. Пауза. Снова стук.', 'Кто-то скребётся, потом стучит костяшками.', 'Тихий, вежливый стук.']));
      r.appendChild(btn('Посмотреть в глазок', 'green', () => {
        Sound.creak();
        if (c.id === 'patrol') showPatrol();
        else showGuest(c, { left: DOOR_CHECKS, used: {}, asked: {} });
      }));
    }, 900);
    cleanups.push(() => clearTimeout(tm));
  }

  function doorHints(c) {
    const h = [];
    if (c.id === 'semyon2' && inHouse('semyon')) h.push('Из кухни выглядывает Семён Палыч — с чашкой, в тапках. Он смотрит в глазок и бледнеет: «Это… это же я».');
    if (c.id === 'semyon2' && S.away.includes('semyon')) h.push('Вы же не пустили Семёна Палыча в первую ночь. А он снова на пороге — точно такой же.');
    else if (c.id === 'semyon2' && S.gone.includes('semyon')) h.push('Семёна Палыча больше нет в вашем доме. А он — на пороге.');
    if (c.id === 'olga' && inHouse('sonya')) h.push('Соня прячется за вашей спиной и шепчет: «У мамы голос не такой… Мама бы спросила про Клёпу».');
    if (c.id === 'zoya' && inHouse('tamara')) h.push('Тамара Ильинична роняет ложку: «Зойка?! Живая! Это она, это её вредный голос!»');
    if (c.id === 'gleb' && S.flags.patrolSeen) h.push('Вы помните: настоящий патруль ходит группой и в жёлтых костюмах.');
    if (c.id === 'petr' && inHouse('gosha')) h.push(C('gosha').visitor ? 'Гоша смотрит в глазок и молчит. Долго. Потом говорит ровным голосом: «Не знаю этого человека».' : 'Гоша прилипает к глазку: «Батя?.. Голос его. Уши его. Но я же… я же не знаю, как они это делают».');
    if (c.id === 'liza2') h.push('Шесть ночей назад вы ей не открыли. Она стоит ровно там же.');
    return h;
  }

  function guestHeader(c) {
    return `<div class="who">${esc(c.name)} <span class="fine">— ${esc(c.who)}</span></div>`;
  }

  function showGuest(c, st, opts) {
    opts = opts || {};
    const list = guestsTonight();
    const s = screen();
    s.appendChild(topbar(`Ночь ${S.night + 1}`, `гость ${S.gi + 1} из ${list.length}`));
    const stage = el('div', 'stage');
    const fr = el('div', 'frame' + (opts.noReveal ? '' : ' reveal'));
    fr.appendChild(portraitCanvas(c));
    fr.appendChild(el('div', 'tag', esc(c.who)));
    stage.appendChild(fr);
    s.appendChild(stage);
    const card = el('div', 'card dialog tilt');
    card.innerHTML = guestHeader(c);
    const p = el('div'); card.appendChild(p);
    s.appendChild(card);
    const line = st.line || ('«' + c.intro + '»');
    typeText(p, line);
    if (!st.line) {
      const hints = doorHints(c);
      if (hints.length) hints.forEach(t => card.appendChild(el('span', 'hint', esc(t))));
    }
    const r1 = el('div', 'row');
    const asked = Object.keys(st.asked).length;
    r1.appendChild(btn('Поговорить', '', () => talkSheet(c, st), `вопросов: ${c.talk.length - asked}`));
    r1.appendChild(btn('Осмотреть', '', () => checkSheet(c, st, 'door'), `<span class="dots">${'●'.repeat(st.left)}${'○'.repeat(DOOR_CHECKS - st.left)}</span>`));
    const r2 = el('div', 'row');
    r2.appendChild(btn('Прогнать', 'red', () => decide(c, false)));
    r2.appendChild(btn('Впустить', 'green', () => decide(c, true)));
    s.appendChild(r1); s.appendChild(r2);
  }

  function talkSheet(c, st) {
    const o = overlay();
    const card = el('div', 'card');
    card.appendChild(el('div', 'sheet-title', 'Спросить'));
    const col = el('div', 'col');
    c.talk.forEach(([q, a], i) => {
      const b = btn(esc(q), '', () => {
        o.remove();
        st.asked[i] = true;
        st.line = 'Вы: «' + q + '»\n— ' + a;
        showGuest(c, st, { noReveal: true });
      });
      if (st.asked[i]) b.disabled = true;
      col.appendChild(b);
    });
    col.appendChild(btn('Молча смотреть', 'dark', () => o.remove()));
    card.appendChild(col);
    o.appendChild(card);
  }

  function checkSheet(c, st, ctx, back) {
    const o = overlay();
    const card = el('div', 'card');
    const left = ctx === 'door' ? st.left : S.morningLeft;
    card.appendChild(el('div', 'sheet-title', 'Осмотр'));
    card.appendChild(el('div', 'fine', ctx === 'door' ? `Гость терпит ещё ${left} ${plural(left, 'осмотр', 'осмотра', 'осмотров')}.` : `Утренних осмотров осталось: ${left}.`));
    const grid = el('div', 'checks');
    grid.style.marginTop = '8px';
    const avail = S.rules.length ? S.rules : [];
    Object.keys(D.CHECKS).forEach(k => {
      const ch = D.CHECKS[k];
      const unlocked = avail.includes(k);
      const b = btn(`<span class="ico">${ch.icon}</span>${ch.name}`, '', () => {
        o.remove();
        if (ctx === 'door') { st.left--; st.used[k] = true; }
        else { S.morningLeft--; st.used[k] = true; save(); }
        showExam(c, k, st, ctx, back);
      }, unlocked ? '' : 'ещё не знаете, что искать');
      if (!unlocked || st.used[k] || left <= 0) b.disabled = true;
      grid.appendChild(b);
    });
    card.appendChild(grid);
    const r = el('div', 'row'); r.style.marginTop = '8px';
    r.appendChild(btn('Назад', 'dark', () => o.remove()));
    card.appendChild(r);
    o.appendChild(card);
  }
  function plural(n, a, b, c) {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return a;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return b;
    return c;
  }

  // Экран крупного плана
  function showExam(c, type, st, ctx, back) {
    const s = screen();
    s.appendChild(topbar(ctx === 'door' ? `Ночь ${S.night + 1}` : 'Утро', esc(D.CHECKS[type].name)));
    const stage = el('div', 'stage');
    const fr = el('div', 'frame square reveal');
    const cv = el('canvas');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = cv.height = Math.round(360 * dpr);
    fr.appendChild(cv);
    stage.appendChild(fr);
    s.appendChild(stage);
    const spec = specOf(c);
    const cx = cv.getContext('2d');
    if (type === 'light') {
      Sound.flash();
      const v = (c.tells || []).includes('light');
      const target = v ? 1.75 : 0.35;
      const t0 = performance.now();
      let f = 0;
      const tm = setInterval(() => {
        const t = Math.min(1, (performance.now() - t0) / 1400);
        const e = 1 - Math.pow(1 - t, 3);
        const pu = 1 + (target - 1) * e;
        cx.clearRect(0, 0, cv.width, cv.height);
        Exam.draw(cx, spec, 'light', cv.width, cv.height, (f++ >> 1) % 3, { flash: 0.4 + 0.6 * (1 - t * 0.4), pupil: () => pu });
      }, 70);
      cleanups.push(() => clearInterval(tm));
    } else {
      const frames = [0, 1, 2].map(f => {
        const k = document.createElement('canvas'); k.width = cv.width; k.height = cv.height;
        Exam.draw(k.getContext('2d'), spec, type, k.width, k.height, f);
        return k;
      });
      let f = 0;
      cx.drawImage(frames[0], 0, 0);
      const tm = setInterval(() => { f = (f + 1) % 3; cx.clearRect(0, 0, cv.width, cv.height); cx.drawImage(frames[f], 0, 0); }, 180);
      cleanups.push(() => clearInterval(tm));
    }
    const card = el('div', 'card dialog tilt');
    card.innerHTML = guestHeader(c);
    const p = el('div'); card.appendChild(p);
    s.appendChild(card);
    typeText(p, Exam.describe(c, type));
    const r = el('div', 'row');
    r.appendChild(btn('Назад', '', () => {
      if (ctx === 'door') { st.line = '«Ну что? Можно мне войти?»'; showGuest(c, st, { noReveal: true }); }
      else back();
    }));
    if (ctx === 'door' && st.left > 0) r.appendChild(btn('Ещё осмотр', '', () => { showGuest(c, st, { noReveal: true }); checkSheet(c, st, 'door'); }));
    if (ctx === 'morning' && S.morningLeft > 0) r.appendChild(btn('Ещё осмотр', '', () => { back(); }));
    s.appendChild(r);
  }

  function decide(c, admit) {
    const list = guestsTonight();
    if (admit) {
      S.house.push({ id: c.id, since: S.night });
      if (c.visitor) S.stats.inV++; else S.stats.inH++;
      Sound.door(true);
    } else {
      S.away.push(c.id);
      if (c.visitor) {
        S.stats.awayV++;
        if (Math.random() < 0.5 && !S.pending.some(x => x.k === 'steps')) S.pending.push({ t: 'Под окном до рассвета кто-то ходил кругами. Шаги были слишком лёгкие для человека.', cls: '', k: 'steps' });
      } else {
        S.stats.awayH++;
        if (c.lost && Math.random() < 0.75) S.pending.push({ t: 'Утром вы выглянули в щель: ' + c.lost + '.', cls: 'bad' });
        S.gone.push(c.id);
      }
      Sound.door(false);
    }
    S.gi++;
    save();
    const s = screen();
    s.appendChild(topbar(`Ночь ${S.night + 1}`, `гость ${S.gi} из ${list.length}`));
    const stage = el('div', 'stage');
    const fr = el('div', 'frame');
    if (admit) fr.appendChild(portraitCanvas(c));
    else fr.appendChild(staticScene(Scenes.door, 360, 450, { lamp: 0.15, under: 0.6, peep: 0.3, feet: true }));
    stage.appendChild(fr);
    s.appendChild(stage);
    const card = el('div', 'card dialog tilt');
    card.innerHTML = guestHeader(c);
    const p = el('div'); card.appendChild(p);
    s.appendChild(card);
    typeText(p, (admit ? 'Вы снимаете цепочку. ' : 'Вы задвигаете засов. ') + '«' + (admit ? c.in : c.out) + '»');
    const r = el('div', 'row');
    r.appendChild(btn(S.gi < list.length ? 'Ждать следующего' : 'Погасить свет', '', () => nextGuest()));
    s.appendChild(r);
  }

  // ---------- Патруль ----------
  function showPatrol() {
    const c = D.PATROL;
    S.flags.patrolSeen = true;
    const s = screen();
    s.appendChild(topbar(`Ночь ${S.night + 1}`, 'патруль'));
    const stage = el('div', 'stage');
    const fr = el('div', 'frame reveal');
    fr.appendChild(portraitCanvas(c, { blink: false }));
    fr.appendChild(el('div', 'tag', 'жёлтые костюмы, рация'));
    stage.appendChild(fr);
    s.appendChild(stage);
    const card = el('div', 'card dialog tilt');
    card.innerHTML = `<div class="who">${esc(c.name)}</div>`;
    const p = el('div'); card.appendChild(p);
    s.appendChild(card);
    typeText(p, '«' + c.intro + '»');
    const r = el('div', 'row');
    r.appendChild(btn('Не открывать', 'red', () => patrolResult(false)));
    r.appendChild(btn('Впустить патруль', 'green', () => patrolResult(true)));
    s.appendChild(r);
  }
  function patrolResult(open) {
    const lines = [];
    if (open) {
      Sound.door(true);
      const vis = visitorsIn();
      if (vis.length) {
        vis.forEach(h => { S.gone.push(h.id); S.stats.patrolV++; });
        S.house = S.house.filter(h => !C(h.id).visitor);
        lines.push('Сканер пищит. Патрульные молча уводят: ' + vis.map(h => C(h.id).name).join(', ') + '. За дверью — короткая вспышка и запах озона.');
        if (humansIn().length >= 4) {
          const q = rnd(humansIn());
          S.house = S.house.filter(h => h !== q);
          S.gone.push(q.id);
          S.stats.takenH++;
          lines.push('«По протоколу», — говорит старший и забирает на карантин ещё и ' + C(q.id).name + '. Обещают вернуть. Не уточняют когда.');
        }
        Sound.sting();
      } else {
        S.bonus = (S.bonus || 0) + 1;
        lines.push('Сканер молчит. «Чисто». Старший оставляет вам пачку батареек для фонарика: утром можно будет осмотреть на одного жильца больше.');
      }
    } else {
      Sound.door(false);
      lines.push('Вы не открываете. Рация шипит, шаги удаляются к соседнему дому.');
    }
    S.gi++;
    save();
    const s = screen();
    s.appendChild(topbar(`Ночь ${S.night + 1}`, 'патруль'));
    const stage = el('div', 'stage');
    const fr = el('div', 'frame');
    fr.appendChild(staticScene(Scenes.door, 360, 450, { lamp: 0.15, under: 0.8, peep: 0.4 }));
    stage.appendChild(fr);
    s.appendChild(stage);
    const card = el('div', 'card dialog tilt log');
    lines.forEach(t => card.appendChild(el('p', '', esc(t))));
    s.appendChild(card);
    const r = el('div', 'row');
    r.appendChild(btn('Дальше', '', () => nextGuest()));
    s.appendChild(r);
  }

  // ---------- Конец ночи ----------
  function nightEnd() {
    const s = screen();
    s.appendChild(topbar(`Ночь ${S.night + 1}`, 'тишина'));
    const stage = el('div', 'stage');
    const fr = el('div', 'frame');
    fr.appendChild(staticScene(Scenes.door, 360, 450, { lamp: 0.05, under: 0.15, peep: 0.05 }));
    stage.appendChild(fr);
    s.appendChild(stage);
    const card = el('div', 'card dialog tilt');
    const p = el('div'); card.appendChild(p);
    s.appendChild(card);
    const n = S.house.length;
    typeText(p, n ? `Больше никто не стучит. В доме ${n + 1} ${plural(n + 1, 'спящий', 'спящих', 'спящих')}, если считать вас. И кот. Вы гасите лампу.` : 'Больше никто не стучит. Вы с Тапком одни. Вы гасите лампу.');
    const r = el('div', 'row');
    r.appendChild(btn('Дождаться утра', '', resolveNight));
    s.appendChild(r);
  }

  function resolveNight() {
    const log = [];
    const attackers = S.house.filter(h => C(h.id).visitor && h.since < S.night);
    attackers.forEach(a => {
      const hs = humansIn();
      if (!hs.length) return;
      const victim = rnd(hs);
      S.house = S.house.filter(h => h !== victim);
      S.gone.push(victim.id);
      S.stats.takenH++;
      const vc = C(victim.id);
      log.push({ t: `${vc.name}: постель пуста и застелена так ровно, как люди не застилают. На подушке — горсть сухой земли.`, cls: 'bad' });
    });
    if (attackers.length) Sound.sting();
    // Посетителей слишком много или людей не осталось — пришли за вами
    const vNow = visitorsIn();
    if (attackers.length && (humansIn().length === 0 || vNow.length >= 3)) {
      return showEnding('taken');
    }
    S.pending.forEach(x => log.push(x));
    S.pending = [];
    // кот
    const seer = S.house.find(h => C(h.id).perk === 'seer');
    if (seer) {
      const sc = C(seer.id);
      let target = null;
      if (!sc.visitor && vNow.length && Math.random() < 0.65) target = rnd(vNow);
      else { const pool = S.house.filter(h => h !== seer && !C(h.id).visitor); if (pool.length) target = rnd(pool); }
      if (target) log.push({ t: `Мадам Розалия раскинула карты и долго молчала. Потом ткнула пальцем: «Пиковая дама ложится на ${C(target.id).name}. Берегитесь». Карты, говорят, иногда врут.`, cls: '' });
    }
    if (vNow.length && Math.random() < 0.55) {
      log.push({ t: `Тапок всю ночь не сводил глаз с того угла, где спит ${C(rnd(vNow).id).name}. Шерсть дыбом, хвост трубой.`, cls: '' });
    } else if (S.house.length && Math.random() < 0.35) {
      log.push({ t: `Тапок долго смотрел туда, где спит ${C(rnd(S.house).id).name}, потом зевнул и ушёл. Кто знает, что у кота на уме.`, cls: '' });
    } else {
      log.push({ t: 'Тапок спал на подоконнике, свернувшись бубликом.', cls: '' });
    }
    // жильцы
    const mates = S.house.slice().sort(() => Math.random() - 0.5).slice(0, 2);
    mates.forEach(h => { const mc = C(h.id); const t = morningLine(mc, S.night + h.since); if (t) log.push({ t, cls: '' }); });
    S.morningLog = log;
    S.morningLeft = MORNING_CHECKS + morningBonus();
    S.phase = 'morning';
    S.mChecks = {};
    save();
    Sound.startAmbient('morning');
    Sound.bell();
    showMorning();
  }

  // ---------- Утро ----------
  function showMorning() {
    const s = screen();
    const last = S.night >= NIGHTS_TOTAL - 1;
    s.appendChild(topbar(`Утро ${S.night + 1}`, `осмотров: ${S.morningLeft}`));
    const card = el('div', 'card log tilt scroll');
    card.style.maxHeight = '38%';
    (S.morningLog || []).forEach(x => card.appendChild(el('p', x.cls, esc(x.t))));
    s.appendChild(card);
    s.appendChild(el('div', 'fine', '<br>Нажмите на жильца, чтобы осмотреть его или выставить за дверь.'));
    const grid = el('div', 'house');
    grid.style.flex = '1';
    const catTile = el('div', 'mate cat');
    catTile.appendChild(staticScene(Scenes.cat, 120, 150));
    catTile.appendChild(el('div', 'nm', 'Тапок'));
    catTile.addEventListener('click', () => { Sound.init(); Sound.click(); toast('Тапок мурчит. Тапок вне подозрений.'); });
    grid.appendChild(catTile);
    S.house.forEach(h => {
      const c = C(h.id);
      const t = el('div', 'mate');
      t.appendChild(miniCanvas(c));
      t.appendChild(el('div', 'nm', esc(c.name)));
      t.addEventListener('click', () => { Sound.init(); Sound.click(); showMate(c); });
      grid.appendChild(t);
    });
    s.appendChild(grid);
    const r = el('div', 'row');
    r.appendChild(btn(last ? 'Встретить восьмой рассвет' : 'Включить телевизор', 'green', () => {
      if (last) return finalEnding();
      S.night++;
      S.phase = 'news';
      save();
      showNews();
    }));
    s.appendChild(r);
  }

  function toast(text) {
    const o = overlay('center');
    const c = el('div', 'card');
    c.appendChild(el('p', '', esc(text)));
    const r = el('div', 'row'); r.appendChild(btn('Хорошо', '', () => o.remove()));
    c.appendChild(r);
    o.appendChild(c);
  }

  function showMate(c) {
    const st = S.mChecks[c.id] || (S.mChecks[c.id] = { used: {} });
    const s = screen();
    s.appendChild(topbar(`Утро ${S.night + 1}`, `осмотров: ${S.morningLeft}`));
    const stage = el('div', 'stage');
    const fr = el('div', 'frame');
    fr.appendChild(portraitCanvas(c));
    fr.appendChild(el('div', 'tag', esc(c.who)));
    stage.appendChild(fr);
    s.appendChild(stage);
    const card = el('div', 'card dialog tilt');
    card.innerHTML = guestHeader(c);
    const h = S.house.find(x => x.id === c.id);
    const nights = S.night - h.since + 1;
    const p = el('div'); card.appendChild(p);
    s.appendChild(card);
    typeText(p, `В доме ${nights} ${plural(nights, 'ночь', 'ночи', 'ночей')}. ` + morningLine(c, S.night + 1));
    const r1 = el('div', 'row');
    const b = btn('Осмотреть', '', () => checkSheet(c, st, 'morning', () => showMate(c)), `осталось: ${S.morningLeft}`);
    if (S.morningLeft <= 0) b.disabled = true;
    r1.appendChild(b);
    r1.appendChild(btn('Выставить за дверь', 'red', () => confirmExpel(c)));
    const r2 = el('div', 'row');
    r2.appendChild(btn('Назад', 'dark', showMorning));
    s.appendChild(r1); s.appendChild(r2);
  }

  function confirmExpel(c) {
    const o = overlay('center');
    const card = el('div', 'card');
    card.appendChild(el('div', 'sheet-title', 'Выставить на солнце?'));
    card.appendChild(el('p', '', `За дверью белый полдень. Если ${esc(c.name)} — человек, ${g(c, 'он', 'она')} может не успеть добежать до укрытия.`));
    const r = el('div', 'row');
    r.appendChild(btn('Нет', '', () => o.remove()));
    r.appendChild(btn('Да, открыть дверь', 'red', () => { o.remove(); expel(c); }));
    card.appendChild(r);
    o.appendChild(card);
  }

  function expel(c) {
    S.house = S.house.filter(h => h.id !== c.id);
    S.gone.push(c.id);
    let text;
    if (c.visitor) {
      S.stats.expV++;
      text = `${c.name} ${g(c, 'шагнул', 'шагнула')} за порог и на миг ${g(c, 'вытянулся', 'вытянулась')} выше двери. Потом осыпался серым пеплом, как старая газета. Это был Посетитель.`;
      Sound.sting();
    } else {
      S.stats.expH++;
      text = `${c.name} ${g(c, 'обернулся', 'обернулась')} на пороге — ${g(c, 'растерянный', 'растерянная')}, ${g(c, 'обиженный', 'обиженная')}, совершенно человеческий взгляд. Потом ${g(c, 'побежал', 'побежала')} к соседнему дому, закрывая голову руками. Добежал${g(c, '', 'а')} ли — вы не знаете.`;
      Sound.door(false);
    }
    save();
    const s = screen();
    s.appendChild(topbar(`Утро ${S.night + 1}`));
    const stage = el('div', 'stage');
    const fr = el('div', 'frame');
    fr.appendChild(staticScene(Scenes.house, 360, 450, 'sun'));
    stage.appendChild(fr);
    s.appendChild(stage);
    const card = el('div', 'card dialog tilt');
    const p = el('div'); card.appendChild(p);
    s.appendChild(card);
    typeText(p, text);
    const r = el('div', 'row');
    r.appendChild(btn('Закрыть дверь', '', showMorning));
    s.appendChild(r);
  }

  // ---------- Концовки ----------
  function finalEnding() {
    const vis = visitorsIn().length, hum = humansIn().length;
    let key;
    if (vis > 0) key = 'family';
    else if (inHouse('veniamin') && hum >= 3) key = 'sun';
    else if (S.stats.expV + S.stats.awayV >= 7 && S.stats.expV >= 2 && hum >= 2) key = 'hunter';
    else if (hum >= 3) key = 'together';
    else if (S.stats.awayH >= 5) key = 'watchman';
    else key = 'alone';
    showEnding(key);
  }

  function showEnding(key) {
    const E = D.ENDINGS[key];
    S.phase = 'ending';
    store.del(SAVE_KEY);
    if (!meta.endings.includes(key)) { meta.endings.push(key); saveMeta(); }
    Sound.stopAmbient();
    if (E.tone === 'bad') Sound.sting(); else Sound.bell();
    const s = screen('ending-tone-' + E.tone);
    const stage = el('div', 'stage');
    const fr = el('div', 'frame reveal');
    fr.appendChild(staticScene(Scenes.house, 360, 450, key));
    stage.appendChild(fr);
    s.appendChild(el('h2', 'center-text big-title', esc(E.title)));
    s.appendChild(stage);
    const card = el('div', 'card log tilt scroll');
    card.style.maxHeight = '40%';
    E.text.forEach(t => card.appendChild(el('p', '', esc(t))));
    const st = S.stats;
    const totalV = st.inV + st.awayV;
    const caught = st.awayV + st.expV + st.patrolV;
    card.appendChild(el('p', 'fine', `Впущено людей: ${st.inH}. Впущено Посетителей: ${st.inV}. Прогнано людей: ${st.awayH}. Прогнано Посетителей: ${st.awayV}. Выставлено на солнце: ${st.expH + st.expV} (из них Посетителей: ${st.expV}). Пропало жильцов: ${st.takenH}.`));
    card.appendChild(el('p', 'fine', `Распознано Посетителей: ${Math.min(caught, totalV)} из ${totalV}.`));
    const l = el('div', 'endings-list');
    for (const k in D.ENDINGS) {
      const got = meta.endings.includes(k);
      l.appendChild(el('span', got ? 'got' : '', got ? esc(D.ENDINGS[k].title) : '???'));
    }
    card.appendChild(el('div', 'fine', 'Концовки:'));
    card.appendChild(l);
    s.appendChild(card);
    const r = el('div', 'row'); r.style.marginTop = '8px';
    r.appendChild(btn('В начало', '', () => { S = null; showTitle(); }));
    s.appendChild(r);
  }

  // ---------- Запуск ----------
  function boot() {
    try { document.documentElement.style.setProperty('--paper-img', `url(${SK.paperDataURL('#d9c7a3')})`); } catch (e) {}
    // «дыхание» нарисованных рамок
    const turb = document.getElementById('wobble-turb');
    if (turb) {
      let seed = 1;
      setInterval(() => { seed = (seed % 3) + 1; turb.setAttribute('seed', String(seed)); }, 260);
    }
    document.addEventListener('visibilitychange', () => { if (document.hidden) Sound.stopAmbient(); else if (S && (S.phase === 'night' || S.phase === 'morning')) Sound.startAmbient(S.phase === 'morning' ? 'morning' : 'night'); });
    showTitle();
  }
  boot();
  window.__game = { get state() { return S; }, set state(v) { S = v; }, resume, showTitle };
})();
