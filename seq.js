/* VNB — pemutar rangkaian gambar 3D (pra-render) mengikuti gulir. Tanpa WebGL. */
(function () {
  var root = document.querySelector('.sf[data-seq]'); if (!root) return;
  var cv = root.querySelector('.sf-cv'), ctx = cv.getContext('2d', { alpha: false });
  var caps = [].slice.call(root.querySelectorAll('.sf-cap')), items = [].slice.call(root.querySelectorAll('.sf-rail li'));
  var fill = root.querySelector('.sf-fill'), cue = root.querySelector('.sf-cue'), nav = document.querySelector('.nav');
  var STAGES = JSON.parse(root.dataset.stages), base = root.dataset.seq;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var S = null, gen = 0;             // set aktif: {dir,N,W,H,img[],ok[],bmp{}}
  var cur = 0, raf = 0, visible = true, last = 0, stage = -1, drawn = '', dir = 1, vel = 0;

  function pick() {
    var m = innerWidth / innerHeight < .8;
    return m ? { k: 'm', N: +root.dataset.nm, W: 540, H: 960 } : { k: 'd', N: +root.dataset.n, W: 1600, H: 900 };
  }
  function url(i) { return base + '-' + S.k + '/' + ('000' + i).slice(-4) + '.webp'; }

  /* ---- muat bertahap: kasar dulu (tiap 32), lalu makin rapat; yang dekat posisi sekarang didahulukan ---- */
  function start() {
    var c = pick(); if (S && S.k === c.k) return;
    if (S) for (var b in S.bmp) if (S.bmp[b] && S.bmp[b].close) S.bmp[b].close();
    S = c; S.img = new Array(S.N); S.ok = new Uint8Array(S.N); S.bmp = {}; S.lv = 32; S.busy = 0; gen++; drawn = '';
    cv.width = S.W; cv.height = S.H;
    load(Math.round(target() * (S.N - 1)), gen); pump();
  }
  function load(i, g) {
    if (S.img[i]) return; var im = new Image(); S.img[i] = im; S.busy++; im.decoding = 'async';
    im.onload = im.onerror = function (e) { if (g !== gen) return; S.busy--; if (e.type === 'load') { S.ok[i] = 1; kick(); } pump(); };
    im.src = url(i);
  }
  function pump() {
    var g = gen, c = Math.round(cur * (S.N - 1));
    while (S.busy < 6 && S.lv >= 1) {
      var best = -1, bd = 1e9;
      for (var i = 0; i < S.N; i += S.lv) if (!S.img[i]) { var d = Math.abs(i - c); if (d < bd) { bd = d; best = i; } }
      if (best < 0 && S.lv === 1 || best < 0 && !(S.lv >>= 1)) break;
      if (best >= 0) load(best, g);
    }
    if (!S.img[S.N - 1]) load(S.N - 1, g);
  }
  /* ---- jendela bitmap siap-gambar di sekitar frame sekarang agar tidak tersendat saat decode ---- */
  function warm(c) {
    if (!window.createImageBitmap) return;
    var g = gen, a = c - (dir > 0 ? 6 : 18), b = c + (dir > 0 ? 18 : 6);
    for (var k in S.bmp) if (k < a - 4 || k > b + 4) { if (S.bmp[k] && S.bmp[k].close) S.bmp[k].close(); delete S.bmp[k]; }
    for (var i = Math.max(0, a); i <= Math.min(S.N - 1, b); i++) if (S.ok[i] && S.bmp[i] === undefined) (function (i) {
      S.bmp[i] = null;
      try { createImageBitmap(S.img[i]).then(function (bm) { if (g !== gen || !(i in S.bmp)) { bm.close(); return; } S.bmp[i] = bm; }, function () { S.bmp[i] = 0; }); } catch (e) { S.bmp[i] = 0; }
    })(i);
  }
  function src(i) { return S.bmp[i] || S.img[i]; }
  function near(i) { for (var d = 0; d < S.N; d++) { if (i - d >= 0 && S.ok[i - d]) return i - d; if (i + d < S.N && S.ok[i + d]) return i + d; } return -1; }

  function draw(p) {   // selalu satu frame utuh (tanpa campuran dua frame, supaya tidak berbayang)
    var c = Math.round(p * (S.N - 1)), a = S.ok[c] ? c : near(c);
    if (a < 0) return false;
    var key = a + (S.bmp[a] ? 'b' : 'i');
    if (key !== drawn) { drawn = key; ctx.drawImage(src(a), 0, 0, S.W, S.H); }
    warm(c); return true;
  }
  function ui(p) {
    if (fill) fill.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    var s = 0; for (var i = 0; i < STAGES.length; i++) if (p >= STAGES[i]) s = i;
    if (s !== stage) { stage = s; caps.forEach(function (c, i) { c.classList.toggle('is-on', i === s); c.setAttribute('aria-hidden', i === s ? 'false' : 'true'); }); items.forEach(function (li, i) { li.classList.toggle('on', i <= s); }); }
    if (cue) cue.classList.toggle('gone', p > .02);
  }
  function target() { var r = root.getBoundingClientRect(), t = clamp(-r.top / (root.offsetHeight - innerHeight), 0, 1); return S ? Math.round(t * (S.N - 1)) / (S.N - 1) : t; }  // berhenti tepat di satu frame
  function tick(now) {
    var dt = Math.min(.05, last ? (now - last) / 1000 : .016); last = now;
    var t = target(), prev = cur;
    if (reduce) cur = t; else {   // pegas teredam kritis: awal dan akhir gerak sama-sama halus
      var om = 2 / .2, x = om * dt, ex = 1 / (1 + x + .48 * x * x + .235 * x * x * x), ch = cur - t, tmp = (vel + om * ch) * dt;
      vel = (vel - om * tmp) * ex; cur = t + (ch + tmp) * ex;
      if (Math.abs(t - cur) < .3 / (S.N - 1) && Math.abs(vel) < .5 / (S.N - 1)) { cur = t; vel = 0; }
    }
    if (cur !== prev) dir = cur > prev ? 1 : -1;
    if (draw(cur) && !root.classList.contains('is-ready')) root.classList.add('is-ready');
    ui(cur);
    raf = visible && !document.hidden && cur !== t ? requestAnimationFrame(tick) : 0;
  }
  function kick() { if (!raf && visible) { last = 0; raf = requestAnimationFrame(tick); } }
  if (root.dataset.scene === 'home' && nav) { var ns = function () { nav.classList.toggle('is-solid', root.getBoundingClientRect().bottom < innerHeight * .6); }; addEventListener('scroll', ns, { passive: true }); ns(); }
  new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) kick(); }, { rootMargin: '100px' }).observe(root);
  addEventListener('scroll', kick, { passive: true }); document.addEventListener('visibilitychange', kick);
  addEventListener('resize', function () { start(); drawn = ''; kick(); });
  cur = target(); start(); kick();
  window.__seq = { get p() { return cur; }, get S() { return S; } };
})();
