// ===== GPT 精靈圖自動切格（與「登革熱防治大作戰」同規格）=====
// 洋紅 #FF00FF 去背 → 找列 → 找格 → 整列共用腳底基準線 → 以身體下 3/4 平均 x 為中心 → 縮成遊戲像素
const RS = 2; // 解析度倍率：精靈圖以 2 倍細節儲存
const SPR = (() => {
  const R8 = n => Array.from({ length: 8 }, (_, i) => n + i);
  // 檔名: { rows: [[格名...], ...], h: 參考格高度 或 每列[數字|每格陣列], ref:[列,格], left: 原圖朝左 }
  const MANIFEST = {
    h1: { rows: [['h_idleGun', ...R8('h_run')], ['h_j0', 'h_j1', 'h_j2', 'h_j3', 'h_j4', 'h_shoot', 'h_charge', 'h_dash', 'h_win']], h: 44 },
    fx_beam: { tight: true, dir: 'art', rows: [['fx_beam']], h: [[{ w: 400 }]] },
    fx_wave: { tight: true, dir: 'art', rows: [['fx_wave']], h: [[96]] },
    fx_aura: { tight: true, dir: 'art', rows: [['fx_aura']], h: [[74]] },
    fx_splash: { tight: true, dir: 'art', rows: [['sp0', 'sp1', 'sp2', 'sp3']], h: [[{ w: 26 }, { w: 34 }, { w: 40 }, { w: 40 }]] },
    cutin: { tight: true, rows: [['cutin']], h: [[150]] },
    cameo_m: { tight: true, rows: [['cm_fly0', 'cm_fly1', 'cm_wave', 'cm_throw']], h: [[{ w: 46 }, { w: 46 }, 36, 36]] },
    cameo_s: { tight: true, rows: [['cs_fly0', 'cs_fly1', 'cs_thumb', 'cs_throw']], h: [[{ w: 46 }, { w: 46 }, 40, 40]] },
    h4: { rows: [['n_idle', 'n_run0', 'n_run1', 'n_run2', 'n_shoot', 'n_jump']], h: 44 },
    h3: { rows: [['m_idle', 'm_step', 'm_run0', 'm_run1', 'm_run2'], ['m_shoot', 'm_rs0', 'm_rs1', 'm_rs2', 'm_jump', 'm_jshoot', 'm_hurt']], h: 44 },
    h2: { rows: [['h_climb0', 'h_climb1', 'h_hurt', 'h_stagger', 'h_kneel'], ['h_idle0', 'h_idle1', 'h_wave', 'h_thumb', 'h_cheer']], h: 44, ref: [1, 0] },
    witch: { rows: [['w_stand', ...R8('w_run')], ['w_ride0', 'w_ride1', 'w_ride2', 'w_ride3', 'w_sweep0', 'w_sweep1', 'w_sweep2', 'w_sweep3', 'w_cheer']], h: 46 },
    boss_hurt: { feet: /hurt/, rows: [['a_hurt', 'l_hurt', 'k_hurt']], h: [[44, 48, 72]] }, // 關主被打到的姿勢（GPT）
    witch_hurt: { rows: [['w_hit', 'w_stagger', 'w_kneel']], h: 44, left: true },
    abo: { feet: /^a_(t|stand|sorry)/, rows: [['a_stand', ...R8('a_walk')], ['a_t0', 'a_t1', 'a_t2', 'a_j0', 'a_j1', 'a_sorry0', 'a_sorry1']], h: 44 },
    lady: { feet: /^l_(t|stand|cry)/, rows: [['l_stand', ...R8('l_walk')], ['l_t0', 'l_t1', 'l_t2', 'l_j0', 'l_j1', 'l_j2', 'l_cry0', 'l_cry1']], h: 48 },
    king: { rows: [['k_idle0', 'k_idle1', 'k_roar0', 'k_roar1', 'k_j0', 'k_j1', 'k_j2', 'k_gas'], ['k_shrink', 'k_pup0', 'k_pup1', 'k_pup2']], h: 72 },
    dogs: { rows: [['d_stand', ...R8('d_walk')], ['d_bark0', 'd_bark1', 'd_lunge0', 'd_lunge1', 'd_poop0', 'd_poop1', 'd_happy0', 'd_happy1']], h: 20 },
    bigdog: { rows: [['b_sit', ...R8('b_run')], ['b_growl0', 'b_growl1', 'b_dizzy0', 'b_dizzy1', 'b_happy0', 'b_happy1']], h: 30 },
    poopbot: { rows: [[...R8('u_walk'), 'u_angry'], ['r_vac0', 'r_vac1', 'r_vac2', 'r_vac3', 'r_mech', 'r_mw0', 'r_mw1', 'r_mf0', 'r_mf1']], h: [22, [13, 13, 13, 13, 28, 28, 28, 28, 28]] },
    minions: { tight: true, rows: [['bag0', 'bag1', 'slime0', 'slime1', 'rat0', 'rat1', 'fly0', 'fly1'], ['cat0', 'cat1', 'broom0', 'broom1', 'chi0', 'chi1', 'bagItem', 'handbag']], h: [[18, 16, 12, 11, 10, 10, 9, 9], [15, 12, 13, 13, 12, 12, 10, 11]] },
    tiles1: { dir: 'art', rows: [['t1g', 't1f', 't1b', 't1o', 't1l', 't1s']], h: [[{ w: 16 }, { w: 16 }, { w: 16 }, { w: 16 }, { w: 16 }, { w: 16 }]] },
    tiles2: { dir: 'art', rows: [['t2g', 't2f', 't2b', 't2o', 't2l', 't2s']], h: [[{ w: 16 }, { w: 16 }, { w: 16 }, { w: 16 }, { w: 16 }, { w: 16 }]] },
    tiles3: { dir: 'art', rows: [['t3g', 't3f', 't3b', 't3o', 't3l', 't3s']], h: [[{ w: 16 }, { w: 16 }, { w: 16 }, { w: 16 }, { w: 16 }, { w: 16 }]] },
    tiles4: { dir: 'art', rows: [['t4g', 't4f', 't4b', 't4o', 't4l', 't4s']], h: [[{ w: 16 }, { w: 16 }, { w: 16 }, { w: 16 }, { w: 16 }, { w: 16 }]] },
    items1: { tight: true, dir: 'art', rows: [['it_poop', 'it_big', 'it_can', 'it_bottle', 'it_paper', 'it_egg', 'it_boba', 'it_flagR', 'it_flagG']], h: [[11, 17, 10, 12, 8, 10, 18, 32, 32]] },
    items2: { tight: true, dir: 'art', rows: [['it_drop', 'it_orb', 'it_plat', 'it_gate', 'it_vent', 'it_heart', 'it_star']], h: [[{ w: 9 }, { w: 18 }, { w: 48 }, { w: 16 }, { w: 16 }, 9, 10]] },
    hud1: { tight: true, dir: 'art', rows: [['hud_hp', 'hud_clean', 'hud_ult', 'hud_wpn', 'hud_ring']], h: [[58, { w: 96 }, { w: 80 }, { w: 80 }, 24]] },
    hud2: { tight: true, dir: 'art', rows: [['ic_water', 'ic_bag', 'ic_bubble', 'ic_tornado', 'ic_broom', 'ic_star', 'ic_heart', 'ic_orb']], h: [[13, 13, 13, 13, 13, 13, 13, 13]] },
    ui_labels: { tight: true, dir: 'ui', rows: [['lb_clean', 'lb_ult', 'lb_wpn', 'lb_charge']], h: [[10, 10, 10, 10]] },
    v_rhino: { tight: true, rows: [['vr_idle', 'vr_run0', 'vr_run1', 'vr_run2', 'vr_run3', 'vr_ko']], h: [[70, 62, 62, 62, 62, { w: 68 }]] },
    v_typhoon: { tight: true, rows: [['vt_fly0', 'vt_fly1', 'vt_blow', 'vt_laugh', 'vt_ko']], h: [[80, 80, 80, 80, { w: 80 }]] },
    npc: { rows: [['chief0', 'chief1', 'chief2', 'chief3', 'kid0', 'kid1', 'kid2', 'kid3'], ['owner0', 'owner1', 'owner2', 'owner3', 'owner_t0', 'owner_t1', 'owner_s0', 'owner_s1']], h: [[42, 42, 42, 42, 32, 32, 32, 32], 42] },
  };
  const f = {};
  const isMag = (r, g, b) => g < 95 && r > 160 && b > 160 && Math.abs(r - b) < 75;
  const isWhite = (r, g, b) => r > 232 && g > 232 && b > 232;
  function cut(img, spec) {
    const W = img.width, H = img.height;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0);
    const im = x.getImageData(0, 0, W, H), d = im.data, fg = new Uint8Array(W * H);
    // 判斷底色（看四角）
    const corner = [0, W - 1, (H - 1) * W, H * W - 1].map(i => [d[i * 4], d[i * 4 + 1], d[i * 4 + 2]]);
    // 網頁版的圖已預先去背（透明底），本機版是洋紅底：兩種都當成「去背模式」
    const clear = [0, W - 1, (H - 1) * W, H * W - 1].filter(i => d[i * 4 + 3] < 128).length >= 2;
    const magenta = clear || corner.filter(([r, g, b]) => isMag(r, g, b)).length >= 2;
    if (clear) { for (let i = 0; i < W * H; i++) fg[i] = d[i * 4 + 3] < 128 ? 0 : 1; } // 已去背：只看透明度，不再用顏色判斷（粉紅不會被吃掉）
    else if (magenta) { for (let i = 0; i < W * H; i++) fg[i] = isMag(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]) ? 0 : 1; }
    else { // 白底：從邊緣灌水
      fg.fill(1); const st = [];
      for (let X = 0; X < W; X++) st.push(X, (H - 1) * W + X); for (let Y = 0; Y < H; Y++) st.push(Y * W, Y * W + W - 1);
      while (st.length) { const i = st.pop(); if (!fg[i] || !isWhite(d[i * 4], d[i * 4 + 1], d[i * 4 + 2])) continue; fg[i] = 0; const X = i % W, Y = (i / W) | 0; if (X > 0) st.push(i - 1); if (X < W - 1) st.push(i + 1); if (Y > 0) st.push(i - W); if (Y < H - 1) st.push(i + W); }
    }
    // 去洋紅邊（半透明混色像素）
    for (let i = 0; i < W * H; i++) {
      if (!fg[i]) { d[i * 4 + 3] = 0; continue; }
      const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
      if (magenta && !clear && r > 150 && b > 150 && g < 140 && Math.abs(r - b) < 90) { fg[i] = 0; d[i * 4 + 3] = 0; }
    }
    if (magenta && typeof despill === 'function') { despill(d, W, H); for (let i = 0; i < W * H; i++) if (!d[i * 4 + 3]) fg[i] = 0; }
    x.putImageData(im, 0, 0);
    const split = (proj, len, gapMin, minSize) => { const out = []; let s = -1, gap = 0; for (let i = 0; i <= len; i++) { const on = i < len && proj[i] > 0; if (on) { if (s < 0) s = i; gap = 0; } else if (s >= 0) { gap++; if (gap > gapMin || i === len) { out.push([s, i - gap]); s = -1; gap = 0; } } } return out.filter(r => r[1] - r[0] >= minSize); };
    const rp = new Int32Array(H); for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) if (fg[Y * W + X]) rp[Y]++;
    let rows = split(rp.map(v => v > 2 ? v : 0), H, Math.max(3, H * 0.005), H * 0.06);
    // 若列數比預期多，合併最近的列
    while (rows.length > spec.rows.length) { let bi = 1, bg = 1e9; for (let i = 1; i < rows.length; i++) { const g = rows[i][0] - rows[i - 1][1]; if (g < bg) { bg = g; bi = i; } } rows.splice(bi - 1, 2, [rows[bi - 1][0], rows[bi][1]]); }
    const out = [];
    rows.forEach(([y0, y1], ri) => {
      const names = spec.rows[ri]; if (!names) return;
      const cp = new Int32Array(W); for (let Y = y0; Y <= y1; Y++) for (let X = 0; X < W; X++) if (fg[Y * W + X]) cp[X]++;
      let cols = split(cp, W, Math.max(2, W * 0.004), 1);
      // 合併碎片（頭髮、水花、汗滴）
      let changed = true;
      while (changed && cols.length > 1) {
        changed = false;
        for (let i = 0; i < cols.length; i++) if (cols[i][1] - cols[i][0] < W * 0.015 || cols.length > names.length && cols[i][1] - cols[i][0] < W * 0.03) {
          const gl = i > 0 ? cols[i][0] - cols[i - 1][1] : 1e9, gr = i < cols.length - 1 ? cols[i + 1][0] - cols[i][1] : 1e9; const j = gl < gr ? i - 1 : i + 1;
          const a = Math.min(i, j); cols.splice(a, 2, [Math.min(cols[i][0], cols[j][0]), Math.max(cols[i][1], cols[j][1])]); changed = true; break;
        }
      }
      // 格數不足：把過寬的段從最細的地方切開
      for (let guard = 0; cols.length < names.length && guard < 6; guard++) {
        const widths = cols.map(c2 => c2[1] - c2[0]).sort((p, q) => p - q), med = widths[widths.length >> 1];
        let wi = -1, ww = 0; cols.forEach((c2, i) => { if (c2[1] - c2[0] > ww) { ww = c2[1] - c2[0]; wi = i; } });
        if (ww < med * 1.55) break;
        const [a, b] = cols[wi]; let best = -1, bv = 1e9;
        for (let X = Math.floor(a + (b - a) * 0.3); X <= a + (b - a) * 0.7; X++) if (cp[X] < bv) { bv = cp[X]; best = X; }
        cols.splice(wi, 1, [a, best - 1], [best + 1, b]);
      }
      while (cols.length > names.length) { let bi = 1, bg = 1e9; for (let i = 1; i < cols.length; i++) { const g = cols[i][0] - cols[i - 1][1]; if (g < bg) { bg = g; bi = i; } } cols.splice(bi - 1, 2, [cols[bi - 1][0], cols[bi][1]]); }
      const frames = cols.map(([a, b]) => {
        let top = y1, bot = y0; for (let Y = y0; Y <= y1; Y++) for (let X = a; X <= b; X++) if (fg[Y * W + X]) { if (Y < top) top = Y; if (Y > bot) bot = Y; }
        // 以頭＋軀幹（上緣往下 8%~55%）的中線當水平錨點：手腳擺動時身體不會左右晃
        let sx = 0, n = 0; const ya = Math.floor(top + (bot - top) * 0.08), yb = Math.floor(top + (bot - top) * 0.55);
        const mids = [];
        for (let Y = ya; Y <= yb; Y++) { let l = -1, r = -1; for (let X = a; X <= b; X++) if (fg[Y * W + X]) { if (l < 0) l = X; r = X; } if (l >= 0) mids.push((l + r) / 2); }
        mids.sort((p, q) => p - q);
        let fsx = 0, fn = 0; for (let Y = Math.floor(bot - (bot - top) * 0.12); Y <= bot; Y++) for (let X = a; X <= b; X++) if (fg[Y * W + X]) { fsx += X; fn++; }
        return { x0: a, x1: b, top, bot, cx: mids.length ? mids[mids.length >> 1] : (a + b) / 2, fx: fn ? fsx / fn : (a + b) / 2 };
      });
      const base = Math.max(...frames.map(f => f.bot));
      frames.forEach((fr, i) => out.push({ ri, ci: i, name: names[i], ...fr, base: spec.tight ? fr.bot : base }));
    });
    // 縮放比例
    const ref = spec.ref || [0, 0];
    const refFr = out.find(o => o.ri === ref[0] && o.ci === ref[1]) || out[0];
    for (const o of out) {
      if (!o.name) continue;
      let sc;
      if (typeof spec.h === 'number') sc = spec.h / (refFr.base - refFr.top + 1);
      else {
        const rh = spec.h[o.ri];
        if (Array.isArray(rh)) { const v = rh[o.ci] != null ? rh[o.ci] : rh[rh.length - 1]; sc = typeof v === 'object' ? v.w / (o.x1 - o.x0 + 1) : v / (o.bot - o.top + 1); }
        else { const r0 = out.find(p => p.ri === o.ri && p.ci === 0); sc = rh / (r0.base - r0.top + 1); }
      }
      const sw = o.x1 - o.x0 + 1, sh = o.base - o.top + 1;
      const tw = Math.max(1, Math.round(sw * sc * RS)), th = Math.max(1, Math.round(sh * sc * RS));
      let src = c, sx = o.x0, sy = o.top, cw = sw, ch = sh;
      while (cw / 2 > tw * 1.4) { const t = document.createElement('canvas'); t.width = Math.round(cw / 2); t.height = Math.round(ch / 2); const tx = t.getContext('2d'); tx.imageSmoothingQuality = 'high'; tx.drawImage(src, sx, sy, cw, ch, 0, 0, t.width, t.height); src = t; sx = 0; sy = 0; cw = t.width; ch = t.height; }
      const oc = document.createElement('canvas'); oc.width = tw; oc.height = th;
      const ox = oc.getContext('2d', { willReadFrequently: true }); ox.imageSmoothingQuality = 'high';
      if (spec.left) { ox.translate(tw, 0); ox.scale(-1, 1); }
      ox.drawImage(src, sx, sy, cw, ch, 0, 0, tw, th);
      ox.setTransform(1, 0, 0, 1, 0, 0);
      const od = ox.getImageData(0, 0, tw, th), p = od.data;
      for (let k = 0; k < p.length; k += 4) { if (p[k + 3] < 120) p[k + 3] = 0; else { const a = p[k + 3] / 255; p[k] = Math.min(255, p[k] / a); p[k + 1] = Math.min(255, p[k + 1] / a); p[k + 2] = Math.min(255, p[k + 2] / a); p[k + 3] = 255; } }
      ox.putImageData(od, 0, 0);
      const wc = document.createElement('canvas'); wc.width = tw; wc.height = th; const wx = wc.getContext('2d'); wx.drawImage(oc, 0, 0); wx.globalCompositeOperation = 'source-atop'; wx.fillStyle = '#fff'; wx.fillRect(0, 0, tw, th);
      const useFeet = spec.feet && spec.feet.test(o.name || '');
      let ax = ((useFeet ? o.fx : o.cx) - o.x0) * sc; if (spec.left) ax = tw / RS - ax;
      f[o.name] = { img: oc, white: wc, w: tw / RS, h: th / RS, ax: ax, fh: Math.round((o.bot - o.top + 1) * sc), top: Math.round((o.top - o.top) * sc) };
    }
  }
  function recolor(src, dst, fn) {
    const s = f[src]; if (!s) return;
    const c = document.createElement('canvas'); c.width = s.img.width; c.height = s.img.height; const x = c.getContext('2d'); x.drawImage(s.img, 0, 0);
    const im = x.getImageData(0, 0, c.width, c.height), p = im.data;
    for (let k = 0; k < p.length; k += 4) if (p[k + 3]) { const [r, g, b] = fn(p[k], p[k + 1], p[k + 2]); p[k] = r; p[k + 1] = g; p[k + 2] = b; }
    x.putImageData(im, 0, 0);
    f[dst] = { ...s, img: c };
  }
  let loaded = 0, total = 0;
  function load() {
    for (const [file, spec] of Object.entries(MANIFEST)) {
      total++;
      const img = new Image();
      img.onload = () => {
        try { cut(img, spec); } catch (e) { console.warn('sheet', file, e); }
        // 丟東西的影格：以站姿的背部邊緣對齊，身體不會左右亂跳（只有手往前伸）
        // 丟東西的影格以腳底為錨點（feet 規則），原地出手不會亂跳
        loaded++;
        if (file === 'dogs') Object.keys(f).filter(n => n.startsWith('d_')).forEach(n => recolor(n, 'W' + n, (r, g, b) => { const l = (r + g + b) / 3; return [Math.min(255, l * 0.5 + 125), Math.min(255, l * 0.5 + 123), Math.min(255, l * 0.5 + 130)]; }));
      };
      img.onerror = () => { loaded++; };
      img.src = (spec.dir || 'sheets') + '-' + file + '.webp?v=11211954';
    }
  }
  function has(n) { return !!f[n]; }
  // 以腳底中心為錨點；flip=-1 朝左
  function draw(ctx, name, x, y, flip = 1, white = false, alpha = 1) {
    const s = f[name]; if (!s) return false;
    ctx.save(); ctx.translate(Math.round(x), Math.round(y)); if (flip < 0) ctx.scale(-1, 1);
    if (alpha !== 1) ctx.globalAlpha *= alpha;
    ctx.drawImage(white ? s.white : s.img, -s.ax, -s.h, s.w, s.h);
    ctx.restore(); return true;
  }
  // 大頭版：先畫身體，再把頭部（上方 frac 比例）放大 k 倍蓋上去，以脖子為基準
  function drawBigHead(ctx, name, x, y, flip = 1, k = 1.35, frac = 0.4) {
    const s = f[name]; if (!s) return false;
    ctx.save(); ctx.translate(Math.round(x), Math.round(y)); if (flip < 0) ctx.scale(-1, 1);
    ctx.drawImage(s.img, -s.ax, -s.h, s.w, s.h);
    const hh = s.h * frac, sh = s.img.height * frac;
    ctx.drawImage(s.img, 0, 0, s.img.width, sh, -s.ax * k, -s.h + hh - hh * k, s.w * k, hh * k);
    ctx.restore(); return true;
  }
  return { load, has, draw, drawBigHead, f, get progress() { return total ? loaded / total : 1; } };
})();
