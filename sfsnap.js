/* VNB: auto-scroll berkelanjutan untuk cerita 3D (beranda, Switch, Tower).
   - Gulir sekali: animasi berjalan sendiri sampai ujung cerita (atau awal, kalau ke atas).
   - Kecepatan dasar ±1 detik per produk, disesuaikan dengan kecepatan gulir pengunjung.
   - Gulir ke arah sebaliknya: berhenti perlahan. Di HP/tablet: sentuh layar = berhenti.
   - Usap lagi: jalan lagi sesuai arah dan kecepatan usapan. */
(() => {
  const sec = document.querySelector('.sf[data-scene]');
  if (!sec || matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Jumlah "produk" per cerita: dasar kecepatan 1 detik per produk.
  const PARTS = { home: 5, switch: 4, tower: 3 };
  const SEC_PER_PART = 1.0;

  let ready = false;
  let v = 0;            // kecepatan sekarang (px/detik, + = ke bawah)
  let vt = 0;           // kecepatan tujuan
  let running = false;
  let lastT = 0;
  let quietUntil = 0;   // abaikan sisa inersia touchpad setelah berhenti
  let lastWheel = 0;

  const top = () => sec.getBoundingClientRect().top + scrollY;
  const len = () => Math.max(1, sec.offsetHeight - innerHeight);
  const minY = () => top();
  const maxY = () => top() + len();
  const inside = () => scrollY > minY() - 2 && scrollY < maxY() + 2;
  const base = () => len() / ((PARTS[sec.dataset.scene] || 4) * SEC_PER_PART);
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

  const enable = () => { ready = true; };
  if (window.__sfStages) enable(); else addEventListener('sfstages', enable, { once: true });

  let y = 0; // posisi gulir pecahan, supaya gerak tidak patah per piksel
  function loop(now) {
    const dt = clamp((now - lastT) / 1000, 0.001, 0.05); // stempel rAF bisa lebih awal dari start
    lastT = now;
    // Percepat/perlambat dengan halus menuju kecepatan tujuan.
    const k = vt === 0 ? 7 : 4;
    v += (vt - v) * (1 - Math.exp(-dt * k));
    // Rem lembut menjelang ujung cerita supaya berhenti pelan, bukan menabrak.
    const dirNow = v !== 0 ? Math.sign(v) : Math.sign(vt);
    const room = dirNow > 0 ? maxY() - y : y - minY();
    const vMax = Math.sqrt(2 * 2.2 * base() * Math.max(0, room)) + 1;
    if (Math.abs(v) > vMax) v = Math.sign(v) * vMax;
    y = clamp(y + v * dt, minY(), maxY());
    scrollTo({ top: y, behavior: 'instant' });
    if ((vt === 0 && Math.abs(v) < 4) || room <= 0.5) {
      stopNow();
      return;
    }
    requestAnimationFrame(loop);
  }

  function start(dir, factor) {
    if (!running) { y = scrollY; v = 0; running = true; lastT = performance.now(); requestAnimationFrame(loop); }
    vt = dir * base() * clamp(factor, 0.6, 2);
    window.__sfSnap = true;
  }
  function softStop() { vt = 0; }
  function stopNow() { running = false; v = 0; vt = 0; window.__sfSnap = false; }

  const atEnd = dir => (dir > 0 ? scrollY >= maxY() - 1 : scrollY <= minY() + 1);

  // ---------- Mouse / touchpad ----------
  addEventListener('wheel', e => {
    if (!ready || e.ctrlKey || Math.abs(e.deltaY) < 1 || !inside()) return;
    const now = performance.now();
    const gap = now - lastWheel;
    lastWheel = now;
    const dir = e.deltaY > 0 ? 1 : -1;

    if (running && vt !== 0) {
      e.preventDefault();
      if (Math.sign(vt) !== dir) { softStop(); quietUntil = now + 260; } // arah dibalik: berhenti perlahan
      return;                                                           // searah: tetap jalan
    }
    if (now < quietUntil || (running && gap < 200)) { // sisa inersia: jangan langsung jalan lagi
      e.preventDefault();
      quietUntil = now + 260;
      return;
    }
    if (atEnd(dir)) return; // di ujung: lepas ke gulir biasa
    e.preventDefault();
    start(dir, Math.abs(e.deltaY) / 100);
  }, { passive: false });

  // ---------- Keyboard ----------
  addEventListener('keydown', e => {
    if (!ready || !inside()) return;
    if (e.target.closest && e.target.closest('input,textarea,select,button,[contenteditable]')) return;
    const k = e.key;
    const dir = (k === 'ArrowDown' || k === 'PageDown' || (k === ' ' && !e.shiftKey)) ? 1
      : (k === 'ArrowUp' || k === 'PageUp' || (k === ' ' && e.shiftKey)) ? -1 : 0;
    if (!dir) return;
    if (running && vt !== 0) { e.preventDefault(); if (Math.sign(vt) !== dir) softStop(); return; }
    if (atEnd(dir)) return;
    e.preventDefault();
    start(dir, 1);
  });

  // ---------- HP / tablet ----------
  let tY = null, tLastY = 0, tLastT = 0, tVel = 0, dragging = false, released = false;
  addEventListener('touchstart', e => {
    if (!ready) return;
    if (running) stopNow();              // disentuh = langsung berhenti
    tY = tLastY = e.touches[0].clientY;
    tLastT = performance.now();
    tVel = 0; dragging = false; released = false;
  }, { passive: true });

  addEventListener('touchmove', e => {
    if (tY === null || !ready || released) return;
    const cy = e.touches[0].clientY, now = performance.now();
    const dy = tLastY - cy; // + = jari ke atas = halaman turun
    if (!inside() || (dy !== 0 && atEnd(Math.sign(dy)) && !dragging)) { released = true; return; }
    e.cancelable && e.preventDefault();
    dragging = true;
    window.__sfSnap = false;
    scrollTo({ top: clamp(scrollY + dy, minY(), maxY()), behavior: 'instant' }); // ikuti jari
    const dtm = Math.max(1, now - tLastT);
    tVel = tVel * 0.6 + (dy / dtm * 1000) * 0.4; // px/detik, dihaluskan
    tLastY = cy; tLastT = now;
  }, { passive: false });

  addEventListener('touchend', () => {
    if (tY !== null && dragging && !released) {
      const fresh = performance.now() - tLastT < 120; // jari dilepas sambil bergerak = usapan
      if (fresh && Math.abs(tVel) > 150) {
        const dir = Math.sign(tVel);
        if (!atEnd(dir)) start(dir, Math.abs(tVel) / base());
      }
    }
    tY = null; dragging = false;
  }, { passive: true });

  // Seret scrollbar = berhenti.
  addEventListener('mousedown', e => {
    if (running && e.clientX >= document.documentElement.clientWidth) stopNow();
  });
})();
