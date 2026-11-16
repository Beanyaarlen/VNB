/* VNB: auto-scroll per tahap untuk cerita 3D halaman Switch & Tower.
   Satu gerakan gulir ke bawah memutar animasi sampai tahap berikutnya
   dengan sendirinya; gulir ke atas memutarnya mundur ke tahap sebelumnya. */
(() => {
  const sec = document.querySelector('.sf[data-scene="switch"], .sf[data-scene="tower"]');
  if (!sec || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let stops = null;       // titik berhenti, dalam progres 0..1
  let anim = null;        // animasi gulir yang sedang berjalan
  let lastInput = 0;      // waktu input gulir terakhir (untuk meredam inersia touchpad)
  let touchY = null, touchFired = false;

  const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const top = () => sec.getBoundingClientRect().top + scrollY;
  const len = () => Math.max(1, sec.offsetHeight - innerHeight);
  const toY = p => top() + p * len();
  const prog = () => (scrollY - top()) / len();

  function setStops() {
    const st = window.__sfStages;
    if (!st || !st.length) return;
    // Berhenti tepat setelah tiap teks tahap berganti, lalu di akhir cerita.
    const s = st.map((v, i) => (i === 0 ? 0 : Math.min(1, v + 0.006)));
    s.push(1);
    stops = s.filter((v, i) => i === 0 || v - s[i - 1] > 0.02);
  }
  if (window.__sfStages) setStops(); else addEventListener('sfstages', setStops, { once: true });

  // Hanya aktif saat bagian 3D sedang menempel di layar.
  const inside = () => {
    const p = prog();
    return p > -0.002 && p < 1.002;
  };

  function target(dir) {
    const p = prog(), eps = 0.004;
    if (dir > 0) { for (const v of stops) if (v > p + eps) return v; }
    else { for (let i = stops.length - 1; i >= 0; i--) if (stops[i] < p - eps) return stops[i]; }
    return null; // sudah di ujung: biarkan halaman bergulir normal
  }

  function go(p) {
    const from = scrollY, to = toY(p), dist = to - from;
    // Kecepatan normal: sekitar 0,9 detik per layar, 1,1–2,8 detik per tahap.
    const dur = Math.min(2800, Math.max(1100, Math.abs(dist) / innerHeight * 900));
    const t0 = performance.now();
    window.__sfSnap = true;
    anim = { cancel: false };
    const me = anim;
    const step = now => {
      if (me.cancel) return;
      const t = Math.min(1, (now - t0) / dur);
      scrollTo({ top: from + dist * ease(t), behavior: 'instant' });
      if (t < 1) requestAnimationFrame(step);
      else { anim = null; window.__sfSnap = false; }
    };
    requestAnimationFrame(step);
  }

  const busy = now => anim || now - lastInput < 220; // inersia touchpad masih jalan

  function request(dir, e) {
    if (!stops || !inside()) return false;
    const now = performance.now();
    if (busy(now)) { lastInput = now; e && e.cancelable && e.preventDefault(); return true; }
    lastInput = now;
    const p = target(dir);
    if (p === null) return false;
    e && e.cancelable && e.preventDefault();
    go(p);
    return true;
  }

  addEventListener('wheel', e => {
    if (Math.abs(e.deltaY) < 2 || e.ctrlKey) return;
    request(e.deltaY > 0 ? 1 : -1, e);
  }, { passive: false });

  addEventListener('keydown', e => {
    if (e.target.closest && e.target.closest('input,textarea,select,button,[contenteditable]')) return;
    const k = e.key;
    const dir = (k === 'ArrowDown' || k === 'PageDown' || (k === ' ' && !e.shiftKey)) ? 1
      : (k === 'ArrowUp' || k === 'PageUp' || (k === ' ' && e.shiftKey)) ? -1 : 0;
    if (dir) request(dir, e);
  });

  addEventListener('touchstart', e => { touchY = e.touches[0].clientY; touchFired = false; }, { passive: true });
  addEventListener('touchmove', e => {
    if (touchY === null || !stops || !inside()) return;
    const dy = touchY - e.touches[0].clientY;
    if (touchFired || anim) { e.cancelable && e.preventDefault(); return; }
    if (Math.abs(dy) < 24) { e.cancelable && e.preventDefault(); return; }
    const dir = dy > 0 ? 1 : -1;
    if (target(dir) === null) return; // di ujung: lepas ke gulir biasa
    touchFired = true;
    lastInput = 0;
    request(dir, e);
  }, { passive: false });
  addEventListener('touchend', () => { touchY = null; }, { passive: true });

  // Kalau pengunjung menyeret scrollbar di tengah animasi, hentikan animasinya.
  addEventListener('mousedown', e => {
    if (e.clientX < document.documentElement.clientWidth) return; // bukan scrollbar
    if (anim) { anim.cancel = true; anim = null; window.__sfSnap = false; }
  });
})();
