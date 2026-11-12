/* Lapisan gerak UI: judul per kata, marquee, parallax gambar, kartu miring, tombol magnetik, kursor, navbar sembunyi, angka naik, wordmark footer */
(function () {
  'use strict';
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var doc = document, fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $$ = function (s, r) { return [].slice.call((r || doc).querySelectorAll(s)); };
  doc.documentElement.classList.add('mo');

  /* 1. judul muncul kata demi kata dari balik garis */
  function split(el) {
    var i = 0;
    (function walk(n) {
      [].slice.call(n.childNodes).forEach(function (c) {
        if (c.nodeType === 3) {
          var f = doc.createDocumentFragment();
          c.textContent.split(/(\s+)/).forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { f.appendChild(doc.createTextNode(' ')); return; }
            var w = doc.createElement('span'), wi = doc.createElement('span');
            w.className = 'w'; wi.className = 'wi'; wi.style.setProperty('--i', i++); wi.textContent = p; w.appendChild(wi); f.appendChild(w);
          });
          n.replaceChild(f, c);
        } else if (c.nodeType === 1 && c.tagName.toLowerCase() !== 'svg') walk(c);
      });
    })(el);
    el.classList.add('is-split');
  }
  $$('.lines-head h2,.proof h2,.pg-hero h1').forEach(split);

  /* 2. marquee yang mengikuti kecepatan dan arah gulir */
  var mq = doc.querySelector('.mq-t');
  if (mq) {
    mq.innerHTML += mq.innerHTML;
    var x = 0, lastS = scrollY, vel = 0, dir = -1, vis = false, raf = 0;
    var step = function () {
      raf = 0;
      var period = (mq.scrollWidth + (parseFloat(getComputedStyle(mq).columnGap) || 0)) / 2, sy = scrollY, d = sy - lastS; lastS = sy;
      vel += (d - vel) * .1; if (Math.abs(d) > .5) dir = d > 0 ? -1 : 1;
      x += dir * (.7 + Math.min(Math.abs(vel), 40) * .35);
      if (x <= -period) x += period; if (x > 0) x -= period;
      mq.style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,0) skewX(' + Math.max(-7, Math.min(7, vel * -.22)).toFixed(2) + 'deg)';
      if (vis) raf = requestAnimationFrame(step);
    };
    new IntersectionObserver(function (e) { vis = e[0].isIntersecting; if (vis && !raf) raf = requestAnimationFrame(step); }).observe(mq.parentNode);
  }

  /* 3. parallax gambar + navbar sembunyi saat gulir turun, muncul saat gulir naik */
  var pars = $$('.line figure img,.proof-img img,.sw-teaser>img'); pars.forEach(function (el) { el.classList.add('par'); });
  var nav = doc.getElementById('nav'), lastY = scrollY, ticking = false;
  var onScroll = function () {
    ticking = false; var y = scrollY, vh = innerHeight;
    pars.forEach(function (el) {
      var r = el.parentNode.getBoundingClientRect(); if (r.bottom < -60 || r.top > vh + 60) return;
      el.style.setProperty('--py', ((((r.top + r.height / 2) - vh / 2) / vh) * -7).toFixed(2) + '%');
    });
    if (nav) { var d = y - lastY; if (y < 160) { nav.classList.remove('nav--hide'); lastY = y; } else if (Math.abs(d) > 8) { nav.classList.toggle('nav--hide', d > 0); lastY = y; } }
  };
  addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', onScroll); onScroll();

  /* 4. angka naik saat kartu fakta terlihat */
  $$('.facts dt').forEach(function (dt) {
    var m = dt.textContent.match(/^(\D*)(\d+)(.*)$/); if (!m) return;
    var n = +m[2], host = dt.closest('[data-lit]') || dt, done = false;
    var run = function () {
      if (done) return; done = true; var t0 = performance.now();
      (function f(now) { var k = Math.min(1, (now - t0) / 1400), e = 1 - Math.pow(1 - k, 3); dt.textContent = m[1] + Math.round(n * e) + m[3]; if (k < 1) requestAnimationFrame(f); })(t0);
    };
    if (host.classList.contains('is-lit')) return;
    dt.textContent = m[1] + '0' + m[3];
    var ob = new MutationObserver(function () { if (host.classList.contains('is-lit')) { ob.disconnect(); setTimeout(run, 300); } });
    ob.observe(host, { attributes: true, attributeFilter: ['class'] });
  });

  /* 5. wordmark besar di atas footer */
  var foot = doc.querySelector('.foot');
  if (foot && 'IntersectionObserver' in window) {
    var big = doc.createElement('div'); big.className = 'foot-big'; big.setAttribute('aria-hidden', 'true');
    'VNB'.split('').forEach(function (ch, i) { var s = doc.createElement('span'); s.textContent = ch; s.style.setProperty('--i', i); big.appendChild(s); });
    foot.parentNode.insertBefore(big, foot);
    new IntersectionObserver(function (es, o) { if (es[0].isIntersecting) { big.classList.add('in'); o.disconnect(); } }, { threshold: .3 }).observe(big);
  }

  if (!fine) return;

  /* 6. kartu miring mengikuti kursor */
  $$('.line,.sw-teaser').forEach(function (c) {
    c.classList.add('tilt');
    c.addEventListener('pointermove', function (e) {
      var r = c.getBoundingClientRect(), k = r.width > 700 ? 2.2 : 4.5;
      c.style.setProperty('--ry', (((e.clientX - r.left) / r.width - .5) * k).toFixed(2) + 'deg');
      c.style.setProperty('--rx', (((e.clientY - r.top) / r.height - .5) * -k).toFixed(2) + 'deg');
    });
    c.addEventListener('pointerleave', function () { c.style.setProperty('--ry', '0deg'); c.style.setProperty('--rx', '0deg'); });
  });

  /* 7. tombol magnetik */
  $$('.btn-cta,.btn-solid,.btn-catalog,.nav-back,.btn3d').forEach(function (b) {
    b.classList.add('mag');
    b.addEventListener('pointermove', function (e) { var r = b.getBoundingClientRect(); b.style.translate = ((e.clientX - r.left - r.width / 2) * .22).toFixed(1) + 'px ' + ((e.clientY - r.top - r.height / 2) * .32).toFixed(1) + 'px'; });
    b.addEventListener('pointerleave', function () { b.style.translate = '0px 0px'; });
  });

  /* 8. kursor cincin */
  var cur = doc.createElement('div'); cur.className = 'cur'; cur.setAttribute('aria-hidden', 'true'); cur.innerHTML = '<i></i><b>Lihat</b>'; doc.body.appendChild(cur);
  var cx = -100, cy = -100, tx = -100, ty = -100, craf = 0;
  var cstep = function () { craf = 0; cx += (tx - cx) * .2; cy += (ty - cy) * .2; cur.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)'; if (Math.abs(tx - cx) + Math.abs(ty - cy) > .3) craf = requestAnimationFrame(cstep); };
  doc.addEventListener('pointermove', function (e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    tx = e.clientX; ty = e.clientY; if (!cur.classList.contains('on')) { cx = tx; cy = ty; cur.classList.add('on'); }
    var t = e.target, card = t.closest && t.closest('.sw-teaser,.l-duo'), act = t.closest && t.closest('a,button,canvas[tabindex]');
    cur.classList.toggle('is-card', !!card); cur.classList.toggle('is-act', !!act && !card);
    if (!craf) craf = requestAnimationFrame(cstep);
  }, { passive: true });
  doc.documentElement.addEventListener('mouseleave', function () { cur.classList.remove('on'); });
})();
