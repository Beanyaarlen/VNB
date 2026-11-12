/* UI bersama: progres gulir, cahaya sorot kartu, animasi masuk, dan transisi antar halaman */
(function () {
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* progres gulir di bawah navbar */
  var bar = document.querySelector('.nav-prog i');
  if (bar) {
    var tick = false;
    var upd = function () { tick = false; var h = document.documentElement.scrollHeight - innerHeight; bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, scrollY / h) : 0) + ')'; };
    addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(upd); } }, { passive: true }); upd();
  }

  /* cahaya sorot kartu mengikuti kursor */
  if (!matchMedia('(hover: none)').matches) {
    document.addEventListener('pointermove', function (e) {
      var c = e.target.closest && e.target.closest('.sw-teaser,.line,.swcard,.tw-panel'); if (!c) return;
      var r = c.getBoundingClientRect(); c.style.setProperty('--mx', (e.clientX - r.left) + 'px'); c.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });
  }

  /* animasi masuk: elemen naik dan fokus saat terlihat */
  var sel = '.lines-head,.sw-teaser,.l-tower,.l-floor,.l-track,.line-cta,.proof-copy,.proof-img,.facts>div,.pg-hero,.swcard,.tw-seg,.tw-stage,.tw-panel,.pg-note';
  var els = [].slice.call(document.querySelectorAll(sel));
  els.forEach(function (el) {
    el.setAttribute('data-lit', '');
    var sib = el.parentElement ? [].indexOf.call(el.parentElement.children, el) : 0;
    el.style.setProperty('--d', (Math.min(sib, 5) * 110) + 'ms');
  });
  if (reduce || !('IntersectionObserver' in window)) {
    els.forEach(function (e) { e.classList.add('is-lit'); });
  } else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-lit'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -10% 0px', threshold: .06 });
    /* tunggu tirai halaman terbuka dulu */
    setTimeout(function () { els.forEach(function (e) { io.observe(e); }); }, 520);
  }

  /* transisi antar halaman */
  var pt = document.querySelector('.pt');
  if (!pt || reduce) return;
  addEventListener('pageshow', function (e) { if (e.persisted) { pt.classList.remove('is-out'); pt.classList.add('is-done'); } });
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    var u; try { u = new URL(a.href, location.href); } catch (_) { return; }
    if (u.protocol !== location.protocol || u.host !== location.host) return;
    if (u.pathname === location.pathname) return;           /* tautan jangkar di halaman yang sama */
    e.preventDefault();
    pt.classList.remove('is-done'); pt.classList.add('is-out');
    setTimeout(function () { location.href = u.href; }, 560);
  });
})();
