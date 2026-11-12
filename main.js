(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const seg = (a, b, p) => clamp((p - a) / (b - a));
  const ease = t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Posisi plat saklar pada gambar (pecahan lebar/tinggi gambar). Atur bila gambar diganti. */
  const IMG = { w: 2752, h: 1536 };
  const PLATE = { cx: .600, cy: .465, w: .1, h: .18 };

  const story = $('#story');
  const photo = $('#photo');
  const nav = $('#nav');
  const caption = $('.caption');
  const capTitle = $('#capTitle');
  const capSub = $('#capSub');
  const railFill = $('#railFill');
  const railItems = $$('#rail li');
  const cue = $('#cue');
  const l2 = $('#l2'), l3 = $('#l3'), l4 = $('#l4');
  const edge = $('#edge');
  const veil = $('#veil');
  const hit = $('#hit');
  const wireDots = $('.w-dots');
  const wires = $$('#wires path.w').map(path => ({ path, len: path.getTotalLength() }));
  wires.forEach(w => { w.path.style.strokeDasharray = w.len; w.path.style.strokeDashoffset = w.len; });

  /* ---------- gambar menutupi layar (cover), fokus ke saklar di layar potret ---------- */
  function layout() {
    const cw = photo.clientWidth, ch = photo.clientHeight;
    const s = Math.max(cw / IMG.w, ch / IMG.h);
    const w = IMG.w * s, h = IMG.h * s;
    const portrait = cw / ch < .95;
    let x = (cw - w) / 2;
    if (portrait) x = clamp(cw / 2 - PLATE.cx * w, cw - w, 0);
    const y = (ch - h) / 2;
    photo.style.setProperty('--x', x.toFixed(1) + 'px');
    photo.style.setProperty('--y', y.toFixed(1) + 'px');
    photo.style.setProperty('--w', w.toFixed(1) + 'px');
    photo.style.setProperty('--h', h.toFixed(1) + 'px');
    const hw = PLATE.w * w, hh = PLATE.h * h;
    hit.style.left = (x + PLATE.cx * w - hw / 2).toFixed(1) + 'px';
    hit.style.top = (y + PLATE.cy * h - hh / 2).toFixed(1) + 'px';
    hit.style.width = hw.toFixed(1) + 'px';
    hit.style.height = hh.toFixed(1) + 'px';
  }

  /* ---------- keterangan per tahap ---------- */
  const STAGES = [0, .10, .38, .66, .86];
  const TEXT = [
    ['Dinding yang masih kosong.', 'Dari satu titik di dinding ini, ruangan akan dinyalakan.'],
    ['Semua dimulai dari balik dinding.', 'Kabel ditarik ke satu titik, tempat saklar akan berdiri.'],
    ['Dinding selesai. Saklarnya belum.', 'Lubangnya masih terbuka. Plat logam akan menutupnya.'],
    ['Plat logam setebal 3 mm.', 'Logam solid tanpa bingkai, hampir rata dengan dinding.'],
    ['Tekan saklarnya.', 'Satu sentuhan, dan ruangan ini hidup.'],
    ['Sekarang ruangan ini menyala.', 'Tekan lagi untuk mematikannya.']
  ];
  let capKey = -1, capTimer = 0;
  function setCaption(key) {
    if (key === capKey) return;
    capKey = key;
    clearTimeout(capTimer);
    if (reduce) { capTitle.textContent = TEXT[key][0]; capSub.textContent = TEXT[key][1]; return; }
    caption.classList.add('swap');
    capTimer = setTimeout(() => {
      capTitle.textContent = TEXT[key][0];
      capSub.textContent = TEXT[key][1];
      caption.classList.remove('swap');
    }, 240);
  }

  /* ---------- keadaan ---------- */
  let cur = 0, lamp = 0;
  let manual = null;
  let canToggle = false;
  let lampTarget = 0;
  let raf = 0;

  const targetProgress = () => {
    const r = story.getBoundingClientRect();
    return clamp(-r.top / (story.offsetHeight - innerHeight));
  };

  function render(p) {
    /* kabel tampak tembus */
    veil.setAttribute('opacity', (Math.max(seg(.08, .16, p) - seg(.34, .42, p), 0) * .55).toFixed(3));
    const dr = ease(seg(.10, .30, p));
    wires.forEach(w => { w.path.style.strokeDashoffset = w.len * (1 - dr); });
    wireDots.style.opacity = seg(.2, .3, p);

    /* dinding jadi menyapu dari kiri */
    const rv = ease(seg(.38, .62, p));
    l2.style.clipPath = 'inset(0 ' + ((1 - rv) * 100).toFixed(2) + '% 0 0)';
    edge.style.left = (rv * 100).toFixed(2) + '%';
    edge.style.opacity = rv > 0 && rv < 1 ? .9 : 0;

    /* plat terpasang (senja) */
    const t = ease(seg(.64, .80, p));
    l3.style.opacity = t.toFixed(3);
    canToggle = t > .98;
    if (p < .66) manual = null;

    /* lampu menyala */
    lampTarget = canToggle ? (manual === null ? (p > .9 ? 1 : 0) : (manual ? 1 : 0)) : 0;
    lamp += (lampTarget - lamp) * (reduce ? 1 : .07);
    if (Math.abs(lampTarget - lamp) < .004) lamp = lampTarget;
    l4.style.opacity = lamp.toFixed(3);

    /* kontrol */
    hit.classList.toggle('on', canToggle);
    hit.classList.toggle('hint', canToggle && manual === null && lampTarget === 0);
    hit.tabIndex = canToggle ? 0 : -1;
    hit.setAttribute('aria-pressed', lampTarget ? 'true' : 'false');
    hit.setAttribute('aria-label', lampTarget ? 'Saklar lampu: tekan untuk mematikan' : 'Saklar lampu: tekan untuk menyalakan');

    /* teks, rel, penunjuk */
    let stage = 0;
    STAGES.forEach((v, i) => { if (p >= v) stage = i; });
    setCaption(stage === 4 && lampTarget ? 5 : stage);
    railFill.style.width = (p * 100).toFixed(2) + '%';
    railItems.forEach((li, i) => li.classList.toggle('on', i <= stage));
    cue.classList.toggle('gone', p > .015);
  }

  function tick() {
    const tg = targetProgress();
    cur = reduce ? tg : cur + (tg - cur) * .14;
    if (Math.abs(tg - cur) < .0004) cur = tg;
    render(cur);
    raf = (cur === tg && lamp === lampTarget) ? 0 : requestAnimationFrame(tick);
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };

  function toggleLamp() {
    if (!canToggle) return;
    manual = !lampTarget;
    kick();
  }
  hit.addEventListener('click', toggleLamp);

  addEventListener('scroll', () => {
    nav.classList.toggle('is-solid', story.getBoundingClientRect().bottom < innerHeight * .6);
    kick();
  }, { passive: true });
  addEventListener('resize', () => { layout(); kick(); });

  layout();
  cur = targetProgress();
  render(cur);
  nav.classList.toggle('is-solid', story.getBoundingClientRect().bottom < innerHeight * .6);
})();
