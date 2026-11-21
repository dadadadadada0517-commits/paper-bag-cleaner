// ===== 觸控手把：左邊蘑菇頭（浮動搖桿）＋右邊 SFC 式按鍵 =====
(() => {
  const T = document.getElementById('touch'); if (!T) return;
  const jz = T.querySelector('.jz'), joy = T.querySelector('.joy'), knob = T.querySelector('.knob');
  const R = 46; // 搖桿最大位移（px）
  let jid = null, ox = 0, oy = 0;
  const home = () => { joy.style.left = joy.style.top = ''; const r = joy.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  function place(x, y) { joy.style.left = x + 'px'; joy.style.top = y + 'px'; }
  function setDir(dx, dy) {
    held.left = dx < -16; held.right = dx > 16;
    held.up = dy < -26 && Math.abs(dy) > Math.abs(dx) * 0.6; held.down = dy > 26 && Math.abs(dy) > Math.abs(dx) * 0.6;
  }
  function reset() { jid = null; knob.style.transform = ''; joy.classList.remove('act'); setDir(0, 0); joy.style.left = joy.style.top = ''; }
  jz.addEventListener('pointerdown', e => {
    e.preventDefault(); Audio8.init(); if (jid !== null) return;
    jid = e.pointerId; try { jz.setPointerCapture(e.pointerId); } catch (_) {}
    const [hx, hy] = home();
    // 在原位附近按就用原位，太遠就把搖桿移到手指下（浮動搖桿）
    if (Math.hypot(e.clientX - hx, e.clientY - hy) < 70) { ox = hx; oy = hy; } else { ox = e.clientX; oy = e.clientY; }
    place(ox, oy); joy.classList.add('act'); move(e);
  });
  function move(e) {
    if (e.pointerId !== jid) return;
    let dx = e.clientX - ox, dy = e.clientY - oy; const d = Math.hypot(dx, dy);
    if (d > R) { dx *= R / d; dy *= R / d; }
    knob.style.transform = `translate(${dx}px,${dy}px)`; setDir(dx, dy);
  }
  jz.addEventListener('pointermove', move);
  const end = e => { if (e.pointerId === jid) reset(); };
  jz.addEventListener('pointerup', end); jz.addEventListener('pointercancel', end);

  // 按鍵
  T.querySelectorAll('[data-k]').forEach(b => {
    const k = b.dataset.k;
    b.addEventListener('pointerdown', e => { e.preventDefault(); held[k] = true; b.classList.add('down'); Audio8.init(); try { b.setPointerCapture(e.pointerId); } catch (_) {} if (G.mode === 'boot') { held.start = true; setTimeout(() => held.start = false, 80); } });
    const up = () => { held[k] = false; b.classList.remove('down'); };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('lostpointercapture', up);
  });
  addEventListener('resize', () => { if (jid === null) reset(); });
  // iPhone：連點不會放大畫面（Safari 會忽略 user-scalable=no，要自己擋）
  const stop = e => { if (e.cancelable) e.preventDefault(); };
  T.addEventListener('touchstart', stop, { passive: false }); T.addEventListener('touchend', stop, { passive: false });
  screen.addEventListener('touchend', stop, { passive: false });
  document.addEventListener('dblclick', stop, { passive: false });
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(n => document.addEventListener(n, stop, { passive: false }));
  let lastEnd = 0; document.addEventListener('touchend', e => { const now = Date.now(); if (now - lastEnd < 350) stop(e); lastEnd = now; }, { passive: false });
  reset();

  // 絕招能用時變色發光；「換」顯示目前武器顏色
  const bU = document.getElementById('bUlt'), bS = document.getElementById('bSwap');
  let lastU = null, lastW = null;
  (function tick() {
    const ready = G.ultra >= 100 && (G.mode === 'play' || G.mode === 'boss');
    if (ready !== lastU) { lastU = ready; bU.classList.toggle('off', !ready); bU.classList.toggle('ready', ready); bU.style.setProperty('--c', ready ? '#ffd65c' : '#ff9de2'); bU.querySelector('small').textContent = ready ? 'OK!' : '絕招'; }
    const w = G.weapon || 'water';
    if (w !== lastW) { lastW = w; bS.style.setProperty('--c', (WEAPONS[w] && WEAPONS[w].color) || '#7ff3ff'); bS.style.display = G.weapons && G.weapons.length > 1 ? '' : 'none'; }
    if (G.weapons && (G.weapons.length > 1) !== (bS.style.display !== 'none')) lastW = null;
    setTimeout(tick, 120);
  })();
})();
