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
  // 按鍵只放在遊戲畫面兩側的黑邊裡，依空間大小自動縮放
  const pad = T.querySelector('.pad');
  pad.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%';
  const B = k => T.querySelector('.b[data-k="' + k + '"]');
  function put(k, x, y, d, small) {
    const b = B(k); if (!b) return;
    b.style.left = x + 'px'; b.style.top = y + 'px'; b.style.width = b.style.height = d + 'px'; b.style.margin = (-d / 2) + 'px 0 0 ' + (-d / 2) + 'px';
    b.style.borderWidth = Math.max(3, Math.round(d * 0.07)) + 'px';
    b.querySelector('b').style.fontSize = Math.round(d * (small ? 0.4 : 0.42)) + 'px'; b.querySelector('small').style.fontSize = Math.max(8, Math.round(d * 0.14)) + 'px';
  }
  function layout() {
    const r = screen.getBoundingClientRect(), W = innerWidth, H = innerHeight;
    const rc = Math.max(0, W - r.right), lc = Math.max(0, r.left);
    if (rc >= 200) { // 寬：SFC 菱形（射左、跳下、衝右三顆靠近；絕、換在上方較遠）
      const u = Math.min(1.25, rc / 250, H / 300), cx = W - rc / 2, cy = H - 14 - 37 * u - 54 * u;
      put('shoot', cx - 70 * u, cy, 74 * u); put('dash', cx + 70 * u, cy, 74 * u); put('jump', cx, cy + 54 * u, 74 * u);
      put('ult', cx - 48 * u, cy - 108 * u, 58 * u, true); put('swap', cx + 52 * u, cy - 108 * u, 58 * u, true);
    } else { // 窄：兩欄交錯，全部在黑邊裡
      let d = Math.max(40, Math.min(74, rc * 0.46)); d = Math.max(36, Math.min(d, (H - 60) * 0.27));
      const xa = W - rc * 0.70, xb = W - rc * 0.30, top = Math.max(60 + d * 0.4, H * 0.3);
      put('ult', xb, top, d * 0.8, true); put('swap', xa, top, d * 0.8, true);
      put('dash', xb, top + (H - top) * 0.3, d); put('shoot', xa, top + (H - top) * 0.55, d); put('jump', xb, top + (H - top) * 0.8, d);
    }
    const js = Math.max(0.6, Math.min(1.25, (lc - 12) / 124));
    joy.style.setProperty('--js', js); joy.style.transform = `scale(${js})`;
    joy.style.left = joy.style.left || ''; jz.style.width = Math.max(lc, W * 0.3) + 'px';
    T.style.setProperty('--lc', lc + 'px');
  }
  addEventListener('resize', () => { if (jid === null) reset(); setTimeout(layout, 50); });
  setTimeout(layout, 100); setTimeout(layout, 800);
  let lastWH = ''; setInterval(() => { const k = innerWidth + 'x' + innerHeight; if (k !== lastWH) { lastWH = k; resize(); layout(); } }, 500); // 轉向、網址列收合時重新排
  // iPhone：連點不會放大畫面（Safari 會忽略 user-scalable=no，要自己擋）
  const stop = e => { if (e.cancelable) e.preventDefault(); };
  T.addEventListener('touchstart', stop, { passive: false }); T.addEventListener('touchend', stop, { passive: false });
  screen.addEventListener('touchend', stop, { passive: false });
  document.addEventListener('dblclick', stop, { passive: false });
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(n => document.addEventListener(n, stop, { passive: false }));
  let lastEnd = 0; document.addEventListener('touchend', e => { const now = Date.now(); if (now - lastEnd < 350) stop(e); lastEnd = now; }, { passive: false });
  reset();

  // 加入主畫面教學：開始畫面左上角按鈕；第一次自動跳出
  const hs = document.getElementById('hs'), hsBtn = document.getElementById('hsBtn');
  const standalone = navigator.standalone || matchMedia('(display-mode: fullscreen)').matches || matchMedia('(display-mode: standalone)').matches;
  const openHs = () => { hs.style.display = 'flex'; };
  if (hs && hsBtn) {
    hsBtn.addEventListener('click', openHs);
    document.getElementById('hsOk').addEventListener('click', () => { hs.style.display = 'none'; try { localStorage.setItem('pbh_hs', '1'); } catch (e) {} });
    ['touchstart', 'touchend', 'pointerdown'].forEach(n => { hs.addEventListener(n, e => e.stopPropagation(), { passive: true }); hsBtn.addEventListener(n, e => e.stopPropagation(), { passive: true }); });
  }
  let hsAuto = false;
  // 絕招能用時變色發光；「換」顯示目前武器顏色
  const bU = document.getElementById('bUlt'), bS = document.getElementById('bSwap');
  let lastU = null, lastW = null;
  (function tick() {
    const ready = G.ultra >= 100 && (G.mode === 'play' || G.mode === 'boss');
    if (ready !== lastU) { lastU = ready; bU.classList.toggle('off', !ready); bU.classList.toggle('ready', ready); bU.style.setProperty('--c', ready ? '#ffd65c' : '#ff9de2'); bU.querySelector('small').textContent = ready ? 'OK!' : '絕招'; }
    const w = G.weapon || 'water';
    if (w !== lastW) { lastW = w; bS.style.setProperty('--c', (WEAPONS[w] && WEAPONS[w].color) || '#7ff3ff'); bS.style.display = G.weapons && G.weapons.length > 1 ? '' : 'none'; }
    if (G.weapons && (G.weapons.length > 1) !== (bS.style.display !== 'none')) lastW = null;
    if (hsBtn) { const show = G.mode === 'title' && !standalone && IS_TOUCH; hsBtn.style.display = show ? 'block' : 'none';
      if (show && !hsAuto) { hsAuto = true; let seen = false; try { seen = localStorage.getItem('pbh_hs') === '1'; } catch (e) {} if (!seen) setTimeout(openHs, 600); } }
    setTimeout(tick, 120);
  })();
})();
