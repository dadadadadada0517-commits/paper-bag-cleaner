// ===== 像素美術：所有角色／敵人／圖塊都以程式逐點繪製，並自動加黑色描邊 =====
const PX = (() => {
  const OUT = '#16111f';
  function G(w, h) { return { w, h, d: new Array(w * h).fill(null) }; }
  function set(g, x, y, c) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < g.w && y < g.h) g.d[y * g.w + x] = c; }
  function get(g, x, y) { return (x >= 0 && y >= 0 && x < g.w && y < g.h) ? g.d[y * g.w + x] : null; }
  function rect(g, x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(g, x + i, y + j, typeof c === 'function' ? c(x + i, y + j) : c); }
  function ell(g, cx, cy, rx, ry, c) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x - cx) / (rx + 0.35), dy = (y - cy) / (ry + 0.35);
      if (dx * dx + dy * dy <= 1) set(g, x, y, typeof c === 'function' ? c(x, y) : c);
    }
  }
  function line(g, x0, y0, x1, y1, c, t = 1) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n; rect(g, Math.round(x - (t - 1) / 2), Math.round(y - (t - 1) / 2), t, t, c); }
  }
  function pat(g, x, y, rows, map) { rows.forEach((r, j) => [...r].forEach((ch, i) => { if (map[ch]) set(g, x + i, y + j, map[ch]); })); }
  function outline(g, col = OUT) {
    const add = [];
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
      if (g.d[y * g.w + x]) continue;
      if (get(g, x - 1, y) || get(g, x + 1, y) || get(g, x, y - 1) || get(g, x, y + 1)) add.push([x, y]);
    }
    for (const [x, y] of add) g.d[y * g.w + x] = col;
    return g;
  }
  const cache = {};
  function hex(c) { if (cache[c]) return cache[c]; let h = c.slice(1); if (h.length === 3) h = [...h].map(x => x + x).join(''); const v = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), h.length === 8 ? parseInt(h.slice(6, 8), 16) : 255]; return (cache[c] = v); }
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function toCanvas(g, tint) {
    const c = canvas(g.w, g.h), x = c.getContext('2d'), im = x.createImageData(g.w, g.h);
    for (let i = 0; i < g.d.length; i++) { const col = g.d[i]; if (!col) continue; const v = hex(tint && col !== OUT ? tint : col); im.data.set(v, i * 4); }
    x.putImageData(im, 0, 0); return c;
  }
  function make(w, h, fn, noOutline) { const g = G(w, h); fn(g); if (!noOutline) outline(g); return g; }
  function whiteOf(g) { return toCanvas(g, '#ffffff'); }
  function hash(x, y, s = 0) { let h = (x * 374761393 + y * 668265263 + s * 982451653) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }

  // ------------------------------------------------------------------ 主角：紙袋大叔
  const H = {
    bag: '#cfa468', bagL: '#e2c08a', bagD: '#a77d47', bagC: '#b98e55', bagB: '#94703f',
    glass: '#121216', glint: '#ffffff', glyph: '#2a1b10',
    skin: '#e9b38b', skinD: '#c7875f', shorts: '#c9ae80', shortsD: '#a2895d', croc: '#f4f1e9', crocD: '#c8c2b4',
    gun: '#2f86ff', gunD: '#1d5bc4', tank: '#6ad8ff', tankL: '#c8f4ff', nozzle: '#ff8a1f', grip: '#ffd23f',
  };
  function plaid(x, y) {
    const a = x % 4 === 0, b = y % 4 === 1;
    if (a && b) return '#3d4862'; if (a || b) return '#5b6a87';
    if (x % 4 === 2 && y % 4 === 3) return '#d9dee7';
    return '#8f9cb2';
  }
  const plaidD = (x, y) => { const c = plaid(x, y); return c === '#8f9cb2' ? '#6f7c94' : c === '#d9dee7' ? '#aab3c2' : c; };
  const GLYPH = ['X.XXXXX', '.X.X..X', 'X.XXXXX', '.XXX.X.', 'X.X.XXX'];
  function bag(g, ox, oy, back) {
    rect(g, ox, oy + 1, 14, 14, H.bag);
    for (let i = 0; i < 14; i++) if (i % 3 !== 1) set(g, ox + i, oy, H.bagL);
    rect(g, ox, oy + 1, 14, 1, H.bagL);
    rect(g, ox + 12, oy + 2, 2, 12, H.bagD);
    rect(g, ox, oy + 14, 14, 1, H.bagB);
    for (let y = 3; y < 13; y++) set(g, ox + 6, oy + y, H.bagC);
    set(g, ox + 2, oy + 4, H.bagL); set(g, ox + 3, oy + 11, H.bagC); set(g, ox + 9, oy + 12, H.bagC);
    if (back) { rect(g, ox + 1, oy + 7, 12, 1, H.bagC); return; }
    rect(g, ox, oy + 5, 14, 1, H.glass);
    rect(g, ox + 4, oy + 5, 4, 3, H.glass); rect(g, ox + 9, oy + 5, 4, 3, H.glass);
    set(g, ox + 5, oy + 6, '#3a3a48'); set(g, ox + 10, oy + 6, '#3a3a48');
    set(g, ox + 4, oy + 5, H.glint); set(g, ox + 9, oy + 5, H.glint);
    pat(g, ox + 5, oy + 9, GLYPH, { X: H.glyph });
  }
  function leg(g, hx, fx, fy, dark) {
    rect(g, hx, 27, 4, 3, dark ? H.shortsD : H.shorts);
    const top = 30, bot = fy - 3;
    for (let y = top; y <= bot; y++) { const t = bot === top ? 1 : (y - top) / (bot - top); rect(g, Math.round(hx + (fx - hx) * t), y, 3, 1, dark ? H.skinD : H.skin); }
    rect(g, fx - 1, fy - 2, 5, 3, dark ? H.crocD : H.croc);
    set(g, fx + 1, fy - 2, H.crocD); set(g, fx + 3, fy - 1, H.crocD); rect(g, fx - 1, fy, 5, 1, '#a9a395');
  }
  const LEGS = {
    stand: [[12, 12, 35], [17, 17, 35]], r0: [[12, 7, 35], [16, 21, 34]], r1: [[12, 13, 32], [16, 16, 35]],
    r2: [[12, 18, 34], [16, 10, 35]], r3: [[12, 12, 35], [16, 17, 32]], jump: [[12, 9, 34], [16, 20, 31]],
    dash: [[12, 5, 34], [16, 22, 35]], hurt: [[11, 8, 35], [17, 21, 34]], climb0: [[12, 12, 35], [17, 17, 31]], climb1: [[12, 12, 31], [17, 17, 35]],
  };
  function hero(pose) {
    const { legs = 'stand', arm = 'idle', back = false, dy = 0 } = pose;
    return make(34, 37, g => {
      const L = LEGS[legs];
      // 後手
      if (!back) {
        if (arm === 'up2') { rect(g, 8, 10 + dy, 2, 6, H.skinD); rect(g, 8, 15 + dy, 3, 3, plaidD); }
        else if (arm === 'swingB') { rect(g, 9, 16 + dy, 2, 3, plaidD); rect(g, 7, 19 + dy, 2, 3, H.skinD); }
        else { rect(g, 8, 16 + dy, 2, 3, plaidD); rect(g, 8, 19 + dy, 2, 4, H.skinD); }
      }
      leg(g, L[0][0], L[0][1], L[0][2], true);
      // 身體
      rect(g, 10, 15 + dy, 12, 10, plaid);
      rect(g, 10, 25 + dy, 12, 3, H.shorts); rect(g, 20, 25 + dy, 2, 3, H.shortsD); rect(g, 10, 25 + dy, 12, 1, '#b39566');
      if (!back) {
        rect(g, 11, 15 + dy, 3, 1, '#eef1f6'); rect(g, 18, 15 + dy, 3, 1, '#eef1f6');
        set(g, 16, 18 + dy, '#f5f5f5'); set(g, 16, 21 + dy, '#f5f5f5'); set(g, 16, 24 + dy, '#f5f5f5');
        rect(g, 18, 17 + dy, 3, 1, '#4b5874');
      }
      leg(g, L[1][0], L[1][1], L[1][2], false);
      bag(g, 9, dy, back);
      // 前手＋水槍
      if (back) {
        if (legs === 'climb0') { rect(g, 9, 6, 2, 9, H.skin); rect(g, 21, 15, 2, 7, H.skin); }
        else { rect(g, 21, 6, 2, 9, H.skin); rect(g, 9, 15, 2, 7, H.skin); }
        return;
      }
      if (arm === 'shoot') {
        rect(g, 21, 16 + dy, 3, 3, plaid); rect(g, 24, 17 + dy, 2, 2, H.skin);
        rect(g, 25, 14 + dy, 7, 3, H.gun); rect(g, 25, 16 + dy, 7, 1, H.gunD);
        rect(g, 25, 11 + dy, 5, 3, H.tank); set(g, 26, 11 + dy, H.tankL); set(g, 27, 11 + dy, H.tankL);
        rect(g, 32, 14 + dy, 2, 2, H.nozzle); rect(g, 26, 17 + dy, 2, 3, H.grip);
      } else if (arm === 'up' || arm === 'up2') {
        rect(g, 21, 10 + dy, 2, 6, H.skin); rect(g, 20, 15 + dy, 3, 3, plaid);
        rect(g, 20, 3 + dy, 3, 7, H.gun); rect(g, 23, 4 + dy, 3, 4, H.tank); rect(g, 20, 1 + dy, 2, 2, H.nozzle);
      } else {
        const fwd = arm === 'swingF' ? 2 : arm === 'swingB' ? -1 : 0;
        rect(g, 21, 16 + dy, 2, 3, plaid); rect(g, 21 + Math.max(0, fwd), 19 + dy, 2, 3, H.skin);
        const gx = 21 + Math.max(0, fwd), gy = 21 + dy;
        rect(g, gx, gy, 6, 2, H.gun); rect(g, gx + 1, gy - 2, 4, 2, H.tank); set(g, gx + 6, gy, H.nozzle); rect(g, gx + 1, gy + 2, 2, 2, H.grip);
      }
    });
  }

  // ------------------------------------------------------------------ 狗
  function dog(o) {
    const { body = '#c8955a', dark = '#8f6234', light = '#f0d6ac', collar = '#e23b3b', frame = 0, mode = 'walk', s = 1 } = o;
    const W = Math.round(28 * s), Hh = Math.round(20 * s);
    return make(W, Hh, g => {
      const S = v => Math.round(v * s);
      const by = mode === 'poop' ? 2 : mode === 'jump' ? -1 : 0;
      const wag = frame % 2 ? 1 : -1;
      // 尾巴
      if (mode === 'poop') line(g, S(5), S(9), S(2), S(3), dark, Math.max(2, S(2)));
      else line(g, S(6), S(10 + by), S(2), S(5 + wag), dark, Math.max(2, S(2)));
      // 腳
      const lp = mode === 'walk' || mode === 'run' ? [[0, 0], [1, -1], [0, 0], [-1, -1]][frame % 4] : [0, 0];
      const lp2 = mode === 'walk' || mode === 'run' ? [[0, 0], [-1, -1], [0, 0], [1, -1]][frame % 4] : [0, 0];
      const legY = S(14 + by), legH = S(5 - by) + 1;
      if (mode === 'jump') { line(g, S(7), S(14), S(4), S(17), dark, S(2)); line(g, S(19), S(13), S(23), S(15), dark, S(2)); }
      else {
        rect(g, S(7) + lp2[0], legY, S(2), legH + lp2[1], dark); rect(g, S(19) + lp[0], legY, S(2), legH + lp[1], dark);
        rect(g, S(9) + lp[0], legY, S(2), legH + lp[1], body); rect(g, S(21) + lp2[0], legY, S(2), legH + lp2[1], body);
      }
      // 身體
      ell(g, S(14), S(11 + by), S(8.5), S(4.5), body);
      rect(g, S(8), S(13 + by), S(13), S(2), light);
      // 頭
      const hy = mode === 'poop' ? 1 : 0;
      ell(g, S(22), S(7 + hy), S(4.5), S(4), body);
      rect(g, S(24), S(7 + hy), S(4), S(3), light);
      set(g, S(27), S(7 + hy), '#1c1414'); if (s > 1.2) set(g, S(27) - 1, S(7 + hy), '#1c1414');
      rect(g, S(18), S(3 + hy), S(3), S(5), dark);
      if (mode === 'happy') { rect(g, S(22), S(6 + hy), S(2), 1, '#1c1414'); rect(g, S(25), S(10 + hy), S(1), S(2), '#ff7a9c'); }
      else if (mode === 'angry') { set(g, S(23), S(5 + hy), '#ff3030'); set(g, S(22), S(4 + hy), '#1c1414'); set(g, S(23), S(4 + hy), '#1c1414'); }
      else { set(g, S(23), S(6 + hy), '#1c1414'); set(g, S(23), S(5 + hy), '#ffffff'); }
      if (mode === 'bark') { rect(g, S(25), S(10 + hy), S(3), S(2), '#6a1d1d'); }
      rect(g, S(18), S(10 + hy), S(2), S(3), collar);
    });
  }
  function chihuahua(frame) {
    return make(14, 11, g => {
      const c = '#e6b67a', d = '#b5834a';
      line(g, 2, 4, 1, 1, d, 1);
      const f = frame % 2;
      rect(g, 3 + f, 8, 1, 3, d); rect(g, 9 - f, 8, 1, 3, d); rect(g, 5 - f, 8, 1, 3, c); rect(g, 10 + f, 8, 1, 3, c);
      ell(g, 6.5, 6, 4, 2.3, c);
      ell(g, 10, 4, 2.6, 2.4, c); pat(g, 8, 0, ['X..X', 'XX.XX'], { X: d });
      set(g, 13, 4, '#1c1414'); set(g, 11, 3, '#c01818'); rect(g, 8, 6, 2, 1, '#9b59ff');
    });
  }

  // ------------------------------------------------------------------ 小東西
  function poop(big, frame = 0) {
    const w = big ? 22 : 12, h = big ? 16 : 10;
    return make(w, h, g => {
      const a = '#7a4a22', b = '#9b6332', c = '#c48a4f', d = '#5b3416';
      if (big) {
        ell(g, 11, 12, 10, 3.3, a); ell(g, 11, 8.5, 7.5, 2.8, b); ell(g, 11, 5, 5, 2.4, a); ell(g, 11, 2.2, 2.6, 1.6, b); set(g, 12, 0, b);
        rect(g, 4, 11, 6, 1, c); rect(g, 7, 7, 5, 1, c); rect(g, 9, 4, 3, 1, c); rect(g, 3, 14, 16, 1, d);
        set(g, 8, 8 + (frame % 2), '#2a1a0c'); set(g, 14, 8 + (frame % 2), '#2a1a0c');
      } else {
        ell(g, 6, 7.5, 5.2, 2, a); ell(g, 6, 4.8, 3.6, 1.7, b); ell(g, 6, 2.4, 2, 1.3, a); set(g, 7, 0, a);
        rect(g, 3, 7, 3, 1, c); rect(g, 5, 4, 2, 1, c); rect(g, 2, 9, 8, 1, d);
      }
    });
  }
  function fly(frame) { return make(9, 7, g => { const w = frame % 2 ? 0 : 1; rect(g, 1, 1 - w + 1, 3, 2, '#d6f1ff'); rect(g, 5, 1 - w + 1, 3, 2, '#d6f1ff'); ell(g, 4, 4.5, 2.4, 1.6, '#2a3a2a'); set(g, 6, 4, '#ff3b3b'); set(g, 3, 5, '#4f6f3f'); }); }
  function trash(kind) {
    if (kind === 0) return make(8, 10, g => { rect(g, 1, 1, 6, 9, '#d8322e'); rect(g, 1, 1, 6, 1, '#cfcfcf'); rect(g, 2, 3, 1, 5, '#ff8a80'); rect(g, 1, 5, 6, 2, '#f4f4f4'); });
    if (kind === 1) return make(7, 12, g => { rect(g, 2, 0, 3, 3, '#3db35b'); rect(g, 1, 3, 5, 9, '#5fd17c'); rect(g, 2, 4, 1, 6, '#c2ffd0'); rect(g, 1, 7, 5, 2, '#ffe066'); });
    return make(10, 8, g => { ell(g, 5, 4, 4.3, 3.2, '#f2efe6'); set(g, 3, 3, '#bdb8a8'); set(g, 6, 5, '#bdb8a8'); set(g, 5, 2, '#bdb8a8'); rect(g, 2, 4, 2, 1, '#d6d0c0'); });
  }
  function bagMonster(frame) {
    return make(20, 20, g => {
      const sq = frame % 2;
      ell(g, 10, 12 + sq, 8.5 + sq, 7 - sq, '#2c2f3a');
      ell(g, 10, 11 + sq, 6, 4.5 - sq, '#3d4252');
      rect(g, 8, 2 + sq * 2, 4, 3, '#2c2f3a'); set(g, 6, 2 + sq * 2, '#2c2f3a'); set(g, 13, 1 + sq * 2, '#2c2f3a'); set(g, 14, 2 + sq * 2, '#2c2f3a');
      rect(g, 6, 9 + sq, 3, 2, '#ffe14a'); rect(g, 12, 9 + sq, 3, 2, '#ffe14a'); set(g, 7, 9 + sq, '#111'); set(g, 13, 9 + sq, '#111');
      rect(g, 6, 8 + sq, 3, 1, '#111'); rect(g, 12, 8 + sq, 3, 1, '#111');
      rect(g, 7, 14 + sq, 7, 1, '#111'); set(g, 8, 15 + sq, '#fff'); set(g, 12, 15 + sq, '#fff');
      set(g, 5, 7 + sq, '#7c8396'); set(g, 4, 9 + sq, '#7c8396');
      set(g, 16, 16, '#a33'); rect(g, 15, 15, 2, 1, '#e8d36b');
    });
  }
  function slime(frame) {
    return make(18, 14, g => {
      const sq = frame % 2;
      ell(g, 9, 9 + sq, 8 + sq, 4.5 - sq, '#7a4a22'); ell(g, 9, 5 + sq * 1.5, 5, 3 - sq * 0.5, '#9b6332'); ell(g, 9, 2 + sq * 2, 2, 1.5, '#7a4a22');
      rect(g, 5, 7 + sq, 2, 2, '#fff'); rect(g, 11, 7 + sq, 2, 2, '#fff'); set(g, 6, 8 + sq, '#111'); set(g, 12, 8 + sq, '#111');
      rect(g, 7, 11 + sq, 4, 1, '#3a1d0a'); set(g, 3, 10, '#c48a4f'); set(g, 14, 9, '#c48a4f');
    });
  }
  // 便便怪：會走路的便便
  function poopMan(frame, mode) {
    return make(18, 20, g => {
      const f = frame % 4, a = '#7a4a22', b = '#9b6332', c = '#c48a4f', d = '#5b3416';
      const lg = [[0, 0], [1, -1], [0, 0], [-1, -1]][f];
      rect(g, 5 + lg[0], 16, 2, 3 + lg[1], d); rect(g, 11 - lg[0], 16, 2, 3 - lg[1] - 1, d);
      rect(g, 4 + lg[0], 18 + lg[1], 3, 1, '#2a1a0c'); rect(g, 10 - lg[0], 18, 3, 1, '#2a1a0c');
      ell(g, 9, 13, 7.5, 3.4, a); ell(g, 9, 9, 5.8, 2.8, b); ell(g, 9, 5.4, 4, 2.3, a); ell(g, 9, 2.4, 2, 1.5, b); set(g, 10, 0, b);
      rect(g, 4, 12, 4, 1, c); rect(g, 6, 8, 3, 1, c); rect(g, 7, 5, 2, 1, c);
      rect(g, 6, 8, 3, 3, '#fff'); rect(g, 10, 8, 3, 3, '#fff'); set(g, 7 + (mode === 'angry' ? 1 : 0), 9, '#111'); set(g, 11 + (mode === 'angry' ? 1 : 0), 9, '#111');
      if (mode === 'angry') { line(g, 6, 7, 8, 8, '#111'); line(g, 12, 8, 14, 7, '#111'); }
      rect(g, 7, 13, 5, 1, '#3a1d0a'); set(g, 8, 14, '#fff');
      line(g, 2, 11, 0, 9 - (f % 2), d, 1); line(g, 16, 11, 18, 9 - ((f + 1) % 2), d, 1);
    });
  }
  // 失控掃地機器人
  function roboVac(frame) {
    return make(22, 12, g => {
      const f = frame % 2;
      ell(g, 11, 7, 10, 4, '#c9ced8'); ell(g, 11, 6, 8.5, 3, '#eef1f6'); rect(g, 2, 8, 19, 2, '#7d8596');
      rect(g, 8, 4, 6, 2, '#2b2f3a'); rect(g, 12, 4, 2, 2, f ? '#ff2b2b' : '#ff9a2b'); set(g, 9, 4, '#5fd0ff');
      rect(g, 3, 10, 3, 2, '#333'); rect(g, 16, 10, 3, 2, '#333');
      line(g, 20, 9, 21 + f, 11, '#9aa', 1); line(g, 1, 9, 0 - f, 11, '#9aa', 1);
      set(g, 5, 5, '#fff');
    });
  }
  // 便便砲機器人
  function mech(frame, mode) {
    return make(24, 26, g => {
      const f = frame % 2, m = '#5a6b8c', mL = '#8ea3c9', mD = '#3a4660';
      rect(g, 6 + f, 18, 3, 6, mD); rect(g, 14 - f, 18, 3, 6, mD); rect(g, 5 + f, 23, 5, 2, '#22283a'); rect(g, 13 - f, 23, 5, 2, '#22283a');
      rect(g, 4, 8, 15, 11, m); rect(g, 5, 9, 13, 2, mL); rect(g, 7, 12, 9, 5, mD);
      rect(g, 8, 13, 2, 2, '#ffd23f'); rect(g, 13, 13, 2, 2, '#ffd23f');
      rect(g, 6, 2, 11, 7, mL); rect(g, 8, 4, 7, 3, '#151a28'); rect(g, 12 + (mode === 'fire' ? 1 : 0), 5, 2, 1, '#ff3b3b');
      rect(g, 11, 0, 1, 2, '#9aa'); set(g, 11, 0, f ? '#ff3b3b' : '#fff');
      const cy = mode === 'fire' ? 9 : 10;
      rect(g, 17, cy, 6, 4, '#7a4a22'); rect(g, 21, cy - 1, 3, 6, '#5b3416'); set(g, 18, cy + 1, '#c48a4f');
      rect(g, 2, 10, 3, 6, mD);
    });
  }
  function rat(frame) {
    return make(18, 10, g => {
      const f = frame % 2;
      line(g, 0, 7 - f, 4, 6, '#d48aa0', 1);
      ell(g, 8, 6, 5, 2.6, '#7d7a86'); ell(g, 13, 5, 3, 2.2, '#8f8c98');
      set(g, 11, 2, '#d48aa0'); set(g, 12, 2, '#d48aa0'); set(g, 16, 5, '#ff7aa0'); set(g, 14, 4, '#ff2b2b');
      rect(g, 5 + f, 8, 1, 2, '#d48aa0'); rect(g, 11 - f, 8, 1, 2, '#d48aa0');
    });
  }
  function cat(frame, mode) {
    return make(20, 14, g => {
      const f = frame % 2, k = '#1d1b2b', l = '#33304a';
      line(g, 3, 7, 1, 1 + f, k, 2);
      if (mode === 'pounce') { line(g, 6, 10, 2, 12, k, 2); line(g, 14, 10, 18, 12, k, 2); }
      else { rect(g, 5 + f, 10, 2, 4, k); rect(g, 13 - f, 10, 2, 4, k); rect(g, 8 - f, 10, 2, 4, l); rect(g, 16 + f, 10, 2, 4, l); }
      ell(g, 10, 8, 6, 3, k);
      ell(g, 15, 5, 3.5, 3, k); set(g, 13, 1, k); set(g, 13, 2, k); set(g, 17, 1, k); set(g, 17, 2, k);
      set(g, 16, 4, '#ffe14a'); set(g, 14, 4, '#ffe14a'); rect(g, 11, 6, 3, 1, '#ff5c8a');
    });
  }
  function broom(frame) {
    return make(28, 12, g => {
      line(g, 9, 6, 27, 4, '#b07a3a', 2); set(g, 26, 3, '#8a5a24');
      const f = frame % 2;
      for (let i = 0; i < 6; i++) line(g, 10, 5 + (i % 3) - 1, 0, i * 2 + f, i % 2 ? '#d6a75a' : '#b78a3e', 1);
      rect(g, 9, 4, 2, 4, '#c92f2f');
      rect(g, 17, 2 + f, 2, 2, '#ffe14a'); rect(g, 21, 1 + f, 2, 2, '#ffe14a'); set(g, 17, 2 + f, '#111'); set(g, 21, 1 + f, '#111');
    });
  }
  function paper(frame) {
    return make(12, 14, g => {
      const sk = frame % 2;
      rect(g, 1 + sk, 1, 10 - sk, 12, '#f7f5ee'); rect(g, 2 + sk, 3, 7, 1, '#9aa'); rect(g, 2 + sk, 5, 6, 1, '#9aa'); rect(g, 2 + sk, 7, 7, 1, '#9aa');
      pat(g, 5, 8, ['XXX.X', 'X.X.X', 'XXX.X'], { X: '#e42626' });
      set(g, 10, 1, '#d8d4c5');
    });
  }
  function teaEgg() { return make(9, 10, g => { ell(g, 4, 5, 3.5, 4.3, '#8a5a2b'); rect(g, 2, 3, 1, 3, '#c48a4f'); set(g, 5, 4, '#5a3412'); set(g, 4, 6, '#5a3412'); set(g, 6, 7, '#5a3412'); set(g, 3, 2, '#e3b27a'); }); }
  function boba() {
    return make(12, 18, g => {
      rect(g, 6, 0, 1, 4, '#ff6fa8'); rect(g, 1, 3, 10, 2, '#e8f1ff');
      for (let y = 5; y < 17; y++) { const inset = Math.floor((y - 5) / 6); rect(g, 2 + inset, y, 8 - inset * 2, 1, y < 7 ? '#fff7ec' : '#d9a970'); }
      [[3, 14], [5, 15], [7, 14], [4, 16], [6, 13], [8, 15]].forEach(([x, y]) => set(g, x, y, '#2b1a10'));
      rect(g, 3, 7, 1, 6, '#f6d7aa');
    });
  }
  function star(size, c1, c2) { return make(size, size, g => { const m = (size - 1) / 2; line(g, m, 0, m, size - 1, c1); line(g, 0, m, size - 1, m, c1); line(g, 2, 2, size - 3, size - 3, c2); line(g, size - 3, 2, 2, size - 3, c2); set(g, m, m, '#fff'); }, true); }
  function heart() { return make(9, 8, g => pat(g, 1, 1, ['XX.XX', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'].map((r, i) => i === 0 ? '.XX.XX.' : r), { X: '#ff4f7b' })); }
  function poopBag() { return make(10, 10, g => { ell(g, 5, 6, 4, 3.4, '#4fa0ff'); rect(g, 4, 1, 2, 2, '#4fa0ff'); set(g, 3, 0, '#4fa0ff'); set(g, 6, 0, '#4fa0ff'); ell(g, 5, 7, 2, 1.5, '#7a4a22'); set(g, 3, 5, '#c5e0ff'); }); }
  function handbag(frame) { return make(14, 12, g => { line(g, 4, 4, 7, 0, '#d4af37', 1); line(g, 7, 0, 10, 4, '#d4af37', 1); rect(g, 1, 4, 12, 8, frame % 2 ? '#e2408f' : '#c22f78'); rect(g, 5, 7, 4, 2, '#ffd94a'); }); }

  // ------------------------------------------------------------------ 一般人物（NPC／路人／阿伯／貴婦）
  function person(o) {
    const { skin = '#e9b38b', hair = '#2a2020', style = 'short', shirt = '#ffffff', shirt2 = null, pants = '#2d3e66', shoes = '#3a2a20', frame = 0, arm = 'idle', extra, skirt = false, legs = 'stand', w = 22, h = 34 } = o;
    return make(w, h, g => {
      const ox = Math.floor((w - 22) / 2);
      const X = v => v + ox;
      const lw = legs === 'walk' ? [[0, 0], [1, 0], [0, 0], [-1, 0]][frame % 4] : [0, 0];
      // 腳
      if (skirt) {
        for (let y = 19; y < h - 3; y++) { const sp = Math.floor((y - 19) / 3); rect(g, X(7) - sp, y, 9 + sp * 2, 1, pants); }
        rect(g, X(8) + lw[0], h - 3, 3, 2, shoes); rect(g, X(12) - lw[0], h - 3, 3, 2, shoes);
      } else {
        rect(g, X(8) + lw[0], 22, 3, h - 25, pants); rect(g, X(12) - lw[0], 22, 3, h - 25, pants);
        rect(g, X(7) + lw[0], h - 3, 4, 2, shoes); rect(g, X(12) - lw[0], h - 3, 4, 2, shoes);
      }
      // 身體
      rect(g, X(6), 11, 10, 11, typeof shirt === 'function' ? shirt : shirt);
      if (shirt2) rect(g, X(6), 11, 10, 2, shirt2);
      // 手
      if (arm === 'up') { rect(g, X(16), 4, 2, 8, skin); rect(g, X(4), 12, 2, 7, skin); }
      else if (arm === 'throw') { rect(g, X(16), 6, 2, 6, skin); rect(g, X(17), 3, 3, 3, skin); rect(g, X(4), 12, 2, 7, skin); }
      else if (arm === 'hold') { rect(g, X(16), 12, 2, 5, skin); rect(g, X(16), 16, 4, 2, skin); rect(g, X(4), 12, 2, 7, skin); }
      else { rect(g, X(16), 12, 2, 7 + (frame % 2), skin); rect(g, X(4), 12, 2, 7, skin); }
      // 頭
      rect(g, X(7), 2, 8, 9, skin);
      set(g, X(12), 6, '#1a1414'); set(g, X(14), 6, '#1a1414'); rect(g, X(12), 9, 3, 1, '#b5523e');
      if (style === 'short') { rect(g, X(6), 0, 10, 3, hair); rect(g, X(6), 2, 2, 5, hair); }
      else if (style === 'bald') { rect(g, X(6), 4, 2, 4, hair); set(g, X(9), 3, '#fff3dd'); set(g, X(10), 3, '#fff3dd'); }
      else if (style === 'perm') { ell(g, X(11), 3, 6, 3.5, hair); rect(g, X(5), 3, 3, 5, hair); [[7, 0], [10, -1], [13, 0]].forEach(([a, b]) => set(g, X(a), b + 1, '#fff')); }
      else if (style === 'curly') { ell(g, X(10), 3, 8, 5, hair); ell(g, X(5), 8, 3, 4, hair); [[6, 1], [10, 0], [14, 2], [4, 6]].forEach(([a, b]) => set(g, X(a), b, '#e3a6ff')); }
      else if (style === 'bob') { rect(g, X(6), 0, 10, 3, hair); rect(g, X(5), 2, 3, 9, hair); rect(g, X(14), 2, 2, 3, hair); rect(g, X(8), 3, 6, 1, hair); }
      else if (style === 'cap') { rect(g, X(6), 0, 10, 3, hair); rect(g, X(14), 2, 4, 1, hair); }
      if (extra) extra(g, X);
    });
  }
  // 年輕里長：白 polo＋深藍背心＋紅臂章＋大聲公
  function chief(frame) { return person({ hair: '#1c1820', style: 'short', shirt: (x, y) => (x <= 8 || x >= 13) && y > 12 ? '#2b3d6e' : '#f4f6fa', pants: '#3a3f4a', shoes: '#222', frame, arm: frame % 4 === 3 ? 'up' : 'idle', extra: (g, X) => { rect(g, X(4), 13, 2, 3, '#e03030'); set(g, X(13), 0, '#3a3440'); rect(g, X(16), frame % 4 === 3 ? 1 : 17, 5, 4, '#ffd23f'); rect(g, X(20), frame % 4 === 3 ? 0 : 16, 2, 6, '#ff8a1f'); } }); }
  function kid(frame) { return person({ h: 28, hair: '#ffd23f', style: 'cap', shirt: '#ffffff', pants: '#253a74', shoes: '#333', frame, extra: (g, X) => { rect(g, X(2), 12, 4, 7, '#e54848'); rect(g, X(12), 8, 3, 2, '#ffffff'); } }); }
  function walker(frame, c) { return person({ hair: c.hair, style: c.style, shirt: c.shirt, pants: c.pants, shoes: '#2a2a2a', frame, legs: 'walk', arm: 'hold' }); }
  function abo(frame, arm = 'idle') {
    return person({ w: 24, h: 34, hair: '#a9a9b3', style: 'bald', shirt: (x, y) => y > 18 ? '#f6f6f2' : '#ffffff', pants: '#3b5fb0', shoes: '#4fb3ff', frame, arm, legs: frame >= 0 ? 'walk' : 'stand',
      extra: (g, X) => { ell(g, X(11), 18, 6, 4, '#f3efe6'); rect(g, X(15), 9, 3, 1, '#d4b07a'); rect(g, X(7), 11, 2, 2, '#e9b38b'); rect(g, X(13), 11, 2, 2, '#e9b38b'); } });
  }
  function lady(frame, arm = 'idle') {
    return person({ w: 26, h: 36, hair: '#9b4dff', style: 'curly', shirt: '#ff7ab8', pants: '#7a2fb8', skirt: true, shoes: '#ff2f6a', frame, arm,
      extra: (g, X) => { rect(g, X(11), 5, 6, 2, '#ffffff'); set(g, X(12), 5, '#9ff'); rect(g, X(5), 11, 12, 3, '#ffc0dd'); for (let i = 0; i < 5; i++) set(g, X(7 + i * 2), 14, '#fff'); } });
  }

  // ------------------------------------------------------------------ 小魔女
  function witch(frame, mode = 'fly') {
    return make(40, 36, g => {
      const f = frame % 2;
      const hair = '#15121c', dress = '#1d1a26', dressL = '#3a3550', skin = '#f1c7a8', red = '#e3262f', redL = '#ff6a6f';
      if (mode === 'stand') {
        // 站姿
        for (let y = 16; y < 33; y++) { const sp = Math.floor((y - 16) / 4); rect(g, 14 - sp, y, 12 + sp * 2, 1, dress); }
        rect(g, 16, 33, 3, 2, red); rect(g, 21, 33, 3, 2, red);
        rect(g, 15, 15, 10, 8, dress); rect(g, 18, 15, 4, 3, dressL);
        rect(g, 25, 16, 2, 8, skin); rect(g, 13, 16, 2, 8, skin);
        line(g, 28, 4, 28, 34, '#b07a3a', 1); for (let i = 0; i < 5; i++) line(g, 28, 28, 25 + i * 1.5, 35, '#d6a75a', 1);
      } else {
        // 掃把
        line(g, 6, 25, 39, 22, '#b07a3a', 2); rect(g, 37, 21, 2, 2, '#8a5a24');
        for (let i = 0; i < 7; i++) line(g, 8, 24 + (i % 3) - 1, 0, 19 + i * 2 + (f && i % 2), i % 2 ? '#d6a75a' : '#b78a3e', 1);
        rect(g, 7, 22, 3, 5, red);
        // 裙子垂下（飄動）
        for (let y = 20; y < 32; y++) { const sp = Math.floor((y - 20) / 3); rect(g, 15 - sp - (f && y > 26 ? 1 : 0), y, 11 + sp, 1, dress); }
        rect(g, 13 + f, 31, 4, 1, dressL);
        rect(g, 20, 32, 3, 2, red); rect(g, 24 - f, 31, 3, 2, red); set(g, 21, 32, redL);
        // 上身
        rect(g, 17, 13, 9, 9, dress); rect(g, 19, 13, 4, 3, dressL);
        if (mode === 'cast') { rect(g, 25, 7, 2, 7, skin); rect(g, 24, 4, 4, 3, '#fff3a8'); }
        else { rect(g, 25, 15, 6, 2, skin); }
        rect(g, 16, 15, 2, 6, skin);
      }
      // 頭（共用）
      const hx = mode === 'stand' ? 15 : 17, hy = mode === 'stand' ? 4 : 2;
      rect(g, hx + 1, hy + 2, 9, 9, skin);
      rect(g, hx, hy, 11, 4, hair); rect(g, hx - 1, hy + 2, 3, 10, hair); rect(g, hx + 8, hy + 2, 3, 3, hair); rect(g, hx + 3, hy + 3, 6, 1, hair);
      set(g, hx + 6, hy + 6, '#1a1414'); set(g, hx + 9, hy + 6, '#1a1414'); rect(g, hx + 6, hy + 9, 3, 1, mode === 'hurt' ? '#1a1414' : '#d33a4a');
      set(g, hx + 10, hy + 8, '#ff9fb0');
      set(g, hx + 2, hy + 9, '#e8e8f4');
      // 紅色大蝴蝶結
      rect(g, hx, hy - 1, 11, 1, red);
      pat(g, hx - 1, hy - 7, ['XX.....XX', 'XXXX.XXXX', 'XXXXXXXXX', 'XXXXXXXXX', 'XXXX.XXXX', 'XX.....XX'].map(r => r), { X: red });
      rect(g, hx + 3, hy - 5, 3, 2, '#b3121c'); set(g, hx, hy - 6, redL); set(g, hx + 7, hy - 6, redL);
    });
  }

  // ------------------------------------------------------------------ 狗魔王
  function dogKing(frame, mode = 'idle') {
    return make(64, 64, g => {
      const fur = '#7b4a2a', furL = '#a36a3f', furD = '#55301a', cape = '#b3172b', capeD = '#7c0d1d', gold = '#ffcc33';
      const br = mode === 'idle' ? frame % 2 : 0;
      const jy = mode === 'jump' ? -2 : mode === 'stomp' ? 3 : 0;
      // 披風
      for (let y = 18; y < 60; y++) { const sp = Math.floor((y - 18) / 3); rect(g, 10 - sp + (frame % 2 && y > 50 ? 1 : 0), y + jy, 10 + sp, 1, (y + frame) % 7 === 0 ? capeD : cape); }
      // 腳
      if (mode === 'jump') { rect(g, 20, 48 + jy, 8, 10, furD); rect(g, 36, 48 + jy, 8, 10, fur); }
      else { rect(g, 20, 48, 9, 13, furD); rect(g, 36, 48, 9, 13, fur); rect(g, 18, 59, 12, 4, furD); rect(g, 35, 59, 12, 4, furL); }
      [[19, 62], [22, 62], [37, 62], [40, 62]].forEach(([x, y]) => set(g, x, y + jy, '#f4ead8'));
      // 身體
      ell(g, 32, 38 + jy + br, 15, 14, fur); ell(g, 35, 40 + jy + br, 9, 10, furL);
      rect(g, 20, 26 + jy, 24, 3, '#6d6d7d'); for (let i = 0; i < 6; i++) rect(g, 21 + i * 4, 25 + jy, 3, 2, '#9d9db0');
      ell(g, 32, 31 + jy, 3, 3, gold); rect(g, 31, 30 + jy, 3, 2, '#fff8e0');
      // 手
      if (mode === 'roar' || mode === 'jump') { rect(g, 13, 22 + jy, 6, 14, fur); rect(g, 45, 22 + jy, 6, 14, fur); rect(g, 11, 18 + jy, 9, 6, furL); rect(g, 44, 18 + jy, 9, 6, furL); }
      else { rect(g, 14, 32 + jy, 6, 16, furD); rect(g, 44, 32 + jy, 6, 16, fur); rect(g, 13, 46 + jy, 8, 5, furD); rect(g, 43, 46 + jy, 8, 5, furL); }
      // 頭
      ell(g, 34, 15 + jy, 13, 11, fur);
      ell(g, 25, 14 + jy, 5, 9, furD); ell(g, 44, 14 + jy, 5, 9, furD);
      ell(g, 37, 20 + jy, 8, 5, furL);
      rect(g, 40, 15 + jy, 6, 4, '#2a1a1a'); set(g, 42, 15 + jy, '#6a5a6a');
      rect(g, 29, 11 + jy, 4, 3, '#ff2a2a'); rect(g, 37, 11 + jy, 4, 3, '#ff2a2a'); set(g, 30, 12 + jy, '#ffee88'); set(g, 38, 12 + jy, '#ffee88');
      rect(g, 28, 9 + jy, 6, 1, furD); rect(g, 36, 9 + jy, 6, 1, furD);
      if (mode === 'roar') { rect(g, 31, 21 + jy, 12, 6, '#5a0d14'); rect(g, 33, 24 + jy, 7, 3, '#e05a74'); rect(g, 31, 21 + jy, 2, 2, '#fff'); rect(g, 41, 21 + jy, 2, 2, '#fff'); }
      else { rect(g, 31, 23 + jy, 12, 2, '#3a1010'); set(g, 32, 25 + jy, '#fff'); set(g, 41, 25 + jy, '#fff'); }
      // 皇冠
      rect(g, 25, 2 + jy, 18, 4, gold); pat(g, 25, -3 + jy, ['X....X....X.....X', 'X....X....X.....X', 'XX..XXX..XXX...XX', 'XXX.XXX.XXXXX.XXX'], { X: gold });
      set(g, 34, 3 + jy, '#ff2a40'); set(g, 29, 3 + jy, '#3fd0ff'); set(g, 39, 3 + jy, '#3fd0ff');
    });
  }

  // ------------------------------------------------------------------ 圖塊（每關主題）
  const THEMES = {
    1: { top: ['#5cc85a', '#3f9e45', '#89e06a'], dirt: ['#a8743f', '#8a5b2f', '#c08850'], brick: ['#c4573a', '#9c3f2a', '#e07b55'], wood: ['#c58a4a', '#8a5a2a'], ladder: '#e0a052', spike: '#4a7a3a' },
    2: { top: ['#d4523c', '#a8392b', '#ef8064'], dirt: ['#4b4b58', '#393944', '#5d5d6c'], brick: ['#6d6f80', '#4f5160', '#8e91a6'], wood: ['#ff5a5a', '#f4f4f4'], ladder: '#c9ced8', spike: '#ff7a2a' },
    3: { top: ['#5f8a4a', '#466b37', '#7fb060'], dirt: ['#4b3f38', '#372e29', '#5d4f46'], brick: ['#6b5a4f', '#4c3f37', '#86725f'], wood: ['#7d8a96', '#545f69'], ladder: '#9a7a5a', spike: '#e8dcc0' },
    4: { top: ['#a7b3c9', '#7c879e', '#d1daea'], dirt: ['#5a5f78', '#464b62', '#6e7491'], brick: ['#7e62c9', '#5b45a0', '#a98cf0'], wood: ['#b9a7ff', '#7d6be0'], ladder: '#c9ced8', spike: '#c66bff' },
  };
  function tile(theme, kind, v) {
    const T = THEMES[theme];
    return make(16, 16, g => {
      if (kind === 'ground' || kind === 'fill') {
        const [a, b, c] = T.dirt;
        rect(g, 0, 0, 16, 16, (x, y) => { const h = hash(x, y, v); return h < 0.12 ? b : h > 0.92 ? c : a; });
        if (theme === 3 || theme === 2 || theme === 4) { // 磚縫
          for (let y = 0; y < 16; y += 8) { rect(g, 0, y + 7, 16, 1, b); const off = (y / 8 + v) % 2 ? 4 : 12; rect(g, off, y, 1, 7, b); }
          if (theme === 4) { rect(g, 3, 3, 4, 3, (v % 3 === 0) ? '#ffe59a' : '#2b2f45'); rect(g, 10, 10, 4, 3, (v % 4 === 1) ? '#ffe59a' : '#2b2f45'); }
        } else { [[3, 5], [10, 11], [12, 3]].forEach(([x, y]) => { if (hash(x, y, v) > 0.4) { rect(g, x, y, 2, 2, c); set(g, x + 1, y + 1, b); } }); }
        if (kind === 'ground') {
          const [ta, tb, tc] = T.top;
          rect(g, 0, 0, 16, 4, ta); rect(g, 0, 4, 16, 1, tb);
          for (let x = 0; x < 16; x++) { if (hash(x, 9, v) > 0.6) set(g, x, 5, tb); if (hash(x, 3, v) > 0.7) set(g, x, 0, tc); }
          if (theme === 1) for (let x = 0; x < 16; x += 3) if (hash(x, 1, v) > 0.5) set(g, x, -1 + 1, tc);
          if (theme === 2) { for (let x = 0; x < 16; x += 4) rect(g, x, 0, 1, 4, tb); }
          if (theme === 3) { set(g, (v * 5) % 16, 5, '#9fdc6a'); set(g, (v * 5 + 1) % 16, 6, '#9fdc6a'); }
        }
      } else if (kind === 'block') {
        const [a, b, c] = T.brick;
        rect(g, 0, 0, 16, 16, a); rect(g, 0, 0, 16, 1, c); rect(g, 0, 0, 1, 16, c); rect(g, 15, 0, 1, 16, b); rect(g, 0, 15, 16, 1, b);
        rect(g, 1, 7, 14, 1, b); rect(g, 7, 1, 1, 6, b); rect(g, 3, 8, 1, 7, b); rect(g, 11, 8, 1, 7, b);
        if (theme === 4) { rect(g, 5, 5, 6, 6, c); rect(g, 6, 6, 4, 4, '#f0e2ff'); }
      } else if (kind === 'oneway') {
        const [a, b] = T.wood;
        if (theme === 2) { for (let x = 0; x < 16; x++) rect(g, x, 0, 1, 5, Math.floor(x / 4) % 2 ? b : a); for (let x = 0; x < 16; x += 4) rect(g, x, 5, 2, 2, a); }
        else if (theme === 4) { ell(g, 8, 3, 8, 3, '#e4dcff'); rect(g, 0, 3, 16, 2, '#b9a7ff'); set(g, 4, 1, '#fff'); }
        else { rect(g, 0, 0, 16, 3, a); rect(g, 0, 3, 16, 1, b); rect(g, 2, 4, 2, 4, b); rect(g, 12, 4, 2, 4, b); }
      } else if (kind === 'ladder') {
        rect(g, 2, 0, 2, 16, T.ladder); rect(g, 12, 0, 2, 16, T.ladder); rect(g, 4, 3, 8, 2, T.ladder); rect(g, 4, 11, 8, 2, T.ladder);
      } else if (kind === 'spike') {
        for (let i = 0; i < 4; i++) for (let y = 0; y < 8; y++) rect(g, i * 4 + Math.floor(y / 2.7), 8 + y, Math.max(1, 4 - Math.floor(y / 2.7) * 2 + Math.floor(y / 2.7)), 1, y < 2 ? '#fff' : T.spike);
        rect(g, 0, 14, 16, 2, T.spike);
      } else if (kind === 'yoku') {
        rect(g, 0, 0, 16, 16, '#3fd0c9'); rect(g, 1, 1, 14, 14, '#1f8f9e'); rect(g, 3, 3, 10, 10, '#56f0e0'); rect(g, 5, 5, 6, 6, '#1f8f9e');
      } else if (kind === 'moving') {
        rect(g, 0, 0, 16, 6, '#ffd23f'); rect(g, 0, 5, 16, 1, '#b8901f'); for (let x = 0; x < 16; x += 4) rect(g, x, 1, 2, 3, '#2b2b2b');
      }
    }, kind === 'fill' || kind === 'ground');
  }

  // ------------------------------------------------------------------ 打包
  const S = {};
  function build() {
    const hp = (name, pose) => { const g = hero(pose); S['hero_' + name] = toCanvas(g); S['heroW_' + name] = whiteOf(g); };
    hp('stand', {}); hp('stand2', { dy: 1 }); hp('standS', { arm: 'shoot' });
    ['r0', 'r1', 'r2', 'r3'].forEach((r, i) => { const dy = i % 2 ? -1 : 0; hp('run' + i, { legs: r, arm: i < 2 ? 'swingF' : 'swingB', dy }); hp('run' + i + 'S', { legs: r, arm: 'shoot', dy }); });
    hp('jump', { legs: 'jump', arm: 'up2' }); hp('jumpS', { legs: 'jump', arm: 'shoot' });
    hp('climb0', { legs: 'climb0', back: true }); hp('climb1', { legs: 'climb1', back: true }); hp('climbS', { legs: 'climb0', arm: 'shoot' });
    hp('hurt', { legs: 'hurt', arm: 'up2', dy: 1 }); hp('dash', { legs: 'dash', arm: 'swingB', dy: 2 }); hp('dashS', { legs: 'dash', arm: 'shoot', dy: 2 });
    hp('win', { arm: 'up' });
    const add = (k, g) => { S[k] = toCanvas(g); S[k + '_w'] = whiteOf(g); };
    for (let f = 0; f < 4; f++) {
      add('dog' + f, dog({ frame: f }));
      add('dogB' + f, dog({ frame: f, body: '#e8e2d6', dark: '#a9a090', light: '#ffffff', collar: '#3a7bff' }));
      add('dogK' + f, dog({ frame: f, body: '#3a3440', dark: '#1f1a24', light: '#6a6272', collar: '#ffcc33', s: 1.6, mode: 'run' }));
    }
    add('dogPoop', dog({ mode: 'poop' })); add('dogBPoop', dog({ mode: 'poop', body: '#e8e2d6', dark: '#a9a090', light: '#ffffff', collar: '#3a7bff' }));
    add('dogHappy', dog({ mode: 'happy', frame: 1 })); add('dogBHappy', dog({ mode: 'happy', frame: 1, body: '#e8e2d6', dark: '#a9a090', light: '#ffffff', collar: '#3a7bff' }));
    add('dogBark', dog({ mode: 'bark' })); add('dogBBark', dog({ mode: 'bark', body: '#e8e2d6', dark: '#a9a090', light: '#ffffff', collar: '#3a7bff' }));
    add('dogKangry', dog({ mode: 'angry', body: '#3a3440', dark: '#1f1a24', light: '#6a6272', collar: '#ffcc33', s: 1.6 }));
    add('dogKjump', dog({ mode: 'jump', body: '#3a3440', dark: '#1f1a24', light: '#6a6272', collar: '#ffcc33', s: 1.6 }));
    add('dogKhappy', dog({ mode: 'happy', body: '#3a3440', dark: '#1f1a24', light: '#6a6272', collar: '#ffcc33', s: 1.6 }));
    for (let f = 0; f < 2; f++) {
      add('chi' + f, chihuahua(f)); add('fly' + f, fly(f)); add('bagm' + f, bagMonster(f)); add('slime' + f, slime(f)); add('rat' + f, rat(f));
      add('cat' + f, cat(f)); add('broom' + f, broom(f)); add('paper' + f, paper(f)); add('handbag' + f, handbag(f)); add('poopBig' + f, poop(true, f));
    }
    add('catP', cat(0, 'pounce'));
    for (let f = 0; f < 4; f++) add('poopman' + f, poopMan(f));
    add('poopmanA', poopMan(0, 'angry'));
    for (let f = 0; f < 2; f++) { add('robo' + f, roboVac(f)); add('mech' + f, mech(f)); }
    add('mechF', mech(0, 'fire'));
    add('poop', poop(false)); add('trash0', trash(0)); add('trash1', trash(1)); add('trash2', trash(2));
    add('egg', teaEgg()); add('boba', boba()); add('heart', heart()); add('poopBag', poopBag());
    S.starY = toCanvas(star(7, '#ffe14a', '#fff6b0')); S.starP = toCanvas(star(7, '#ff7ad9', '#ffd0f2')); S.starB = toCanvas(star(9, '#7ad7ff', '#e0f7ff'));
    for (let f = 0; f < 4; f++) { add('chief' + f, chief(f)); add('kid' + f, kid(f)); }
    const walkers = [{ hair: '#3a2a20', style: 'short', shirt: '#4fa96a', pants: '#333a55' }, { hair: '#5a2a10', style: 'bob', shirt: '#ffb340', pants: '#5a3a7a' }, { hair: '#222', style: 'cap', shirt: '#e84a4a', pants: '#2a2a2a' }];
    walkers.forEach((c, i) => { for (let f = 0; f < 4; f++) add('walker' + i + '_' + f, walker(f, c)); add('walker' + i + '_t', person({ ...c, arm: 'throw', shoes: '#2a2a2a' })); add('walker' + i + '_sorry', person({ ...c, arm: 'up', shoes: '#2a2a2a' })); });
    for (let f = 0; f < 4; f++) add('abo' + f, abo(f));
    add('aboT', abo(0, 'throw')); add('aboUp', abo(0, 'up'));
    for (let f = 0; f < 4; f++) add('lady' + f, lady(f));
    add('ladyT', lady(0, 'throw')); add('ladyH', lady(0, 'hold')); add('ladyUp', lady(0, 'up'));
    for (let f = 0; f < 2; f++) { add('witch' + f, witch(f)); add('dk' + f, dogKing(f)); }
    add('witchC', witch(0, 'cast')); add('witchH', witch(0, 'hurt')); add('witchS', witch(0, 'stand'));
    add('dkRoar', dogKing(0, 'roar')); add('dkJump', dogKing(0, 'jump')); add('dkStomp', dogKing(0, 'stomp'));
    for (const th of [1, 2, 3, 4]) {
      for (let v = 0; v < 4; v++) { S[`t${th}_ground_${v}`] = toCanvas(tile(th, 'ground', v)); S[`t${th}_fill_${v}`] = toCanvas(tile(th, 'fill', v)); }
      for (const k of ['block', 'oneway', 'ladder', 'spike', 'yoku', 'moving']) S[`t${th}_${k}`] = toCanvas(tile(th, k, 0));
    }
  }
  return { S, build, hash, make, rect, set, ell, line, toCanvas, canvas };
})();
