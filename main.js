// ===== 主程式：流程、畫面、對話特寫、HUD =====
const G = {
  mode: 'boot', t: 0, time: 0, camX: 0, shake: 0, flash: 0, dark: 0, parts: [], texts: [], splashes: [], bullets: [], eshots: [], items: [], enemies: [], npcs: [], platforms: [],
  abilities: { charge: false, djump: false, dash: false }, clean: 0, ultra: 0, score: 0, tamed: 0, deaths: 0, dynPoops: 0, lowFx: false,
  input: { held: {}, pressed: {} }, dialog: null, zoom: { k: 1, tk: 1, x: 200, y: 112 }, letterbox: 0, freeze: false,
};
let save = { cleared: [], stats: {} };
try { const s = JSON.parse(localStorage.getItem('pbh_save2') || 'null'); if (s && Array.isArray(s.cleared)) save = s; } catch (e) {}
function writeSave() { try { localStorage.setItem('pbh_save2', JSON.stringify(save)); } catch (e) {} }
G.loop = 1; G.char = 'hero'; G.hard = !!save.hard; // 角色只在二周目生效（save.char 記住選擇）；一周目固定小編，不然第四關會自己打自己 // 角色（一周目破關後可選豪鬼主任）、難度
function syncAbilities() {
  // 二周目：一周目的能力和三把魔王武器全部帶著
  const c = G.loop === 2 ? [1, 2, 3] : [1, 2, 3].filter(n => save.cleared.includes(n));
  // 打倒任一魔王就能集氣射出大水砲；貴婦給二段跳、狗魔王給衝刺
  G.abilities = { charge: true, djump: c.includes(2), dash: c.includes(3) }; // 洛克人式集氣：一開始就有
  G.gunLv = c.length;
  G.weapons = ['water', ...c.map(n => STAGE_WEAPON[n])];
  if (G.loop === 2) for (const n of [5, 6, 7]) if (save.cleared.includes(n)) G.weapons.push(STAGE_WEAPON[n]); // 二周目吸收的怪人能力
  if (!G.weapons.includes(G.weapon)) G.weapon = 'water';
  G.ammo = G.ammo || {}; for (const w of G.weapons) if (G.ammo[w] == null) G.ammo[w] = 28;
}
G.refillAmmo = () => { for (const w of G.weapons) G.ammo[w] = 28; };
G.ammoGain = (n) => { for (const w of G.weapons) if (w !== 'water') G.ammo[w] = Math.min(28, (G.ammo[w] || 0) + n); };
const QS = new URLSearchParams(location.search);
const SECRET = QS.get('k') === 'ngp7q'; // 作者用的秘密入口：直接進二周目、全關卡解鎖
const IS_TOUCH = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

// ---------- 畫布 ----------
const screen = document.getElementById('screen'), sctx = screen.getContext('2d');
const buf = PX.canvas(VW * RS, VH * RS), ctx = buf.getContext('2d'); // 2 倍內部解析度
let K = 3;
function resize() {
  const dpr = window.devicePixelRatio || 1;
  // 畫面填滿整個螢幕（手機上按鍵疊在遊戲畫面上）
  const side = IS_TOUCH ? 110 : 0; // 手機：左右至少留 110px 給搖桿和按鍵，不蓋到遊戲
  const s = Math.min((innerWidth - side * 2) / VW, innerHeight / VH);
  K = Math.min(s * dpr, 8); screen.width = Math.round(VW * K); screen.height = Math.round(VH * K);
  screen.style.width = Math.floor(VW * s) + 'px'; screen.style.height = Math.floor(VH * s) + 'px';
  sctx.imageSmoothingEnabled = false;
}
addEventListener('resize', resize); resize();

// ---------- 圖片（GPT 生成） ----------
const IMG = {};
const LOAD = { n: 0, done: 0 }; // 讀取進度（成功或失敗都算完成，不會卡住）
['p_hero', 'p_witch', 'p_abo', 'p_lady', 'p_dogking', 'p_chief', 'p_kid', 'title', 'bg1', 'bg2', 'bg3', 'bg4'].forEach(k => { const im = new Image(); LOAD.n++; im.onload = () => { IMG[k] = im; LOAD.done++; }; im.onerror = () => LOAD.done++; im.src = 'gpt-' + k + '.jpg?v=11230002'; });
// GPT 生成的介面文字圖（洋紅底 → 去背、裁邊）
const UI = {};
// 去紫邊：只處理貼著透明區、而且「非常接近洋紅」的邊緣像素（不會吃掉粉紅、紫色的衣服頭髮）
function despill(p, W, H) {
  for (let pass = 0; pass < 1; pass++) {
    const edge = new Uint8Array(W * H);
    for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) {
      const i = Y * W + X; if (!p[i * 4 + 3]) continue;
      if ((X > 0 && !p[(i - 1) * 4 + 3]) || (X < W - 1 && !p[(i + 1) * 4 + 3]) || (Y > 0 && !p[(i - W) * 4 + 3]) || (Y < H - 1 && !p[(i + W) * 4 + 3])) edge[i] = 1;
    }
    for (let i = 0; i < W * H; i++) {
      if (!edge[i]) continue; const o = i * 4, r = p[o], g = p[o + 1], b = p[o + 2];
      // 只有「紅≈藍、綠很低」的洋紅混色才處理
      if (Math.abs(r - b) < 45 && g < Math.min(r, b) * 0.4 && r > 120 && b > 120) { if (g < 70 && r > 200 && b > 200) p[o + 3] = 0; else { const m = Math.round((r + b) / 2 * 0.45); p[o] = Math.min(r, m); p[o + 2] = Math.min(b, m); } }
    }
  }
}
function keyMagenta(img) {
  const c = PX.canvas(img.width, img.height), x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0);
  const im = x.getImageData(0, 0, c.width, c.height), p = im.data, W = c.width, H = c.height; let x0 = W, y0 = H, x1 = 0, y1 = 0;
  // 只去掉「跟外框連在一起」的洋紅底（灌水），裡面只去純洋紅 → 粉紅字、粉紅衣服不會被吃掉
  const mag = i => { const r = p[i * 4], g = p[i * 4 + 1], b = p[i * 4 + 2]; return p[i * 4 + 3] < 128 || (g < 110 && r > 150 && b > 150 && Math.abs(r - b) < 90); };
  const pure = i => { const r = p[i * 4], g = p[i * 4 + 1], b = p[i * 4 + 2]; return g < 60 && r > 205 && b > 205 && Math.abs(r - b) < 50; };
  const bg = new Uint8Array(W * H), st = [];
  for (let X = 0; X < W; X++) st.push(X, (H - 1) * W + X); for (let Y = 0; Y < H; Y++) st.push(Y * W, Y * W + W - 1);
  while (st.length) { const i = st.pop(); if (bg[i] || !mag(i)) continue; bg[i] = 1; const X = i % W, Y = (i / W) | 0; if (X > 0) st.push(i - 1); if (X < W - 1) st.push(i + 1); if (Y > 0) st.push(i - W); if (Y < H - 1) st.push(i + W); }
  for (let k = 0; k < W * H; k++) {
    if (bg[k] || pure(k)) p[k * 4 + 3] = 0;
    else { const X = k % W, Y = (k / W) | 0; if (X < x0) x0 = X; if (X > x1) x1 = X; if (Y < y0) y0 = Y; if (Y > y1) y1 = Y; }
  }
  despill(p, c.width, c.height);
  x.putImageData(im, 0, 0);
  const o = PX.canvas(Math.max(1, x1 - x0 + 1), Math.max(1, y1 - y0 + 1)); o.getContext('2d').drawImage(c, -x0, -y0); return o;
}
['ui_logo', 'ui_get', 'ui_ab_charge', 'ui_ab_djump', 'ui_ab_dash', 'ui_ultimate', 'ui_warning', 'ui_ready', 'ui_clear', 'ui_s1', 'ui_s2', 'ui_s3', 'ui_s4', 'ui_end', 'ui_w_bag', 'ui_w_bubble', 'ui_w_tornado', 'ui_tipbanner', 'ui_bubble', 'ui_bubble_hero', 'ui_win', 'ui_slogan'].forEach(k => { const im = new Image(); LOAD.n++; im.onload = () => { try { UI[k] = keyMagenta(im); } catch (e) {} LOAD.done++; }; im.onerror = () => LOAD.done++; im.src = 'ui-' + k + '.webp?v=11230002'; });
// 全部讀完（人物圖＋介面圖＋背景）＝ 1；超過 25 秒也直接放行
const LOAD_T0 = performance.now();
function loadProgress() { const p = SPR.progress * 0.6 + (LOAD.n ? LOAD.done / LOAD.n : 1) * 0.4; return performance.now() - LOAD_T0 > 25000 ? 1 : Math.min(1, p); }
let loadShown = 0; // 顯示用的進度（平滑追上）
const LOAD_TIPS = ['小提示：沖掉便便，可以補充魔王武器的能量！', '小提示：按住「射」可以集氣，放開發射大水砲！', '小提示：打倒關主，就能吸收他的能力！', '小提示：能量滿了按「絕」，全場清光光！', '小提示：手機「加入主畫面」，全螢幕更好玩！'];
// ---------- 二周目資源：進二周目（或選豪鬼主任）才下載，平常遊玩不會變慢 ----------
const LOOP2_IMG = ['p_virus', 'p_typhoon', 'p_rhino', 'p_shacho', 'bg5', 'bg6', 'bg7', 'bg8', 'bg8b'];
const LZ = { n: 0, done: 0, started: false, t0: 0 };
function startLoop2Load() {
  if (LZ.started) return; LZ.started = true; LZ.t0 = performance.now();
  SPR.loadLazy();
  LOOP2_IMG.forEach(k => { const im = new Image(); LZ.n++; im.onload = () => { IMG[k] = im; LZ.done++; }; im.onerror = () => LZ.done++; im.src = 'gpt-' + k + '.jpg?v=11230002'; });
}
function loop2Progress() { if (!LZ.started) return 0; if (performance.now() - LZ.t0 > 30000) return 1; return Math.min(1, SPR.lazyProgress * 0.7 + (LZ.n ? LZ.done / LZ.n : 1) * 0.3); }
function enterLoop2() {
  startLoop2Load();
  if (loop2Progress() >= 1) return goSelect(2);
  G.mode = 'lazy'; loadShown = 0; Audio8.music('title');
}
const LOOP2_TIPS = [
  '二周目可以換成豪鬼主任！選關畫面按「衝」換角色',
  '豪鬼主任：在空中連點「跳」，騎掃把往上飛！',
  '豪鬼主任：放開就會自動滑翔，按住「射」集氣也不會掉下去',
  '豪鬼主任：蘑菇頭往下＝快速下降',
  '豪鬼主任：射出魔法星星，在空中也能集氣大星星！',
  '豪鬼主任的大絕招：流星雨，全畫面一起清光光！',
];
function drawLoading(pp) {
  const t = G.t, p = pp != null ? pp : loadProgress(); loadShown += (p - loadShown) * 0.15; if (p >= 1) loadShown = Math.min(1, loadShown + 0.03);
  const g = sctx.createLinearGradient(0, 0, 0, VH * K); g.addColorStop(0, '#141a3c'); g.addColorStop(1, '#05060f'); sctx.fillStyle = g; sctx.fillRect(0, 0, screen.width, screen.height);
  for (let i = 0; i < 70; i++) { const x = (i * 83 + t * (0.3 + (i % 3) * 0.25)) % VW, y = (i * 47) % VH; sctx.fillStyle = i % 6 ? '#39407a' : '#ffe36a'; sctx.fillRect(x * K, y * K, K, K); }
  // 標題字：一個字一個字上下跳
  const title = '小編出擊！'; for (let i = 0; i < title.length; i++) { const dy = Math.sin(t / 8 - i * 0.7) * 4; txt(title[i], 128 + i * 36, 52 + dy, 28, '#ffe36a', 'center', '#7a2a00'); }
  txt(pp != null ? '二周目　怪人篇　準備中…' : '維護環境　你我一起來！', 200, 96, 10, pp != null ? '#ff9a6a' : '#9ff3ff', 'center', '#0a1030');
  // 洛克人式能量條：金框＋一格一格的水藍色格子，前端有水滴
  const bx = 80, by = 132, bw = 240, bh = 16, n = 24, sw = (bw - 8) / n, fill = Math.floor(loadShown * n);
  box(bx, by, bw, bh, '#0b0e22', '#ffd23f');
  for (let i = 0; i < n; i++) { const x = bx + 4 + i * sw; sctx.fillStyle = i < fill ? (i % 2 ? '#3ad6ff' : '#7ff3ff') : '#1c2246'; sctx.fillRect(x * K, (by + 4) * K, (sw - 1) * K, (bh - 8) * K); if (i < fill) { sctx.fillStyle = 'rgba(255,255,255,0.55)'; sctx.fillRect(x * K, (by + 4) * K, (sw - 1) * K, 1.5 * K); } }
  const dx = bx + 4 + Math.max(0, fill) * sw, dy2 = by - 7 + Math.abs(Math.sin(t / 5)) * -3;
  sctx.fillStyle = '#16111f'; sctx.beginPath(); sctx.arc(dx * K, (dy2 + 3) * K, 4.2 * K, 0, 7); sctx.fill(); sctx.beginPath(); sctx.moveTo((dx - 3.6) * K, (dy2 + 1.6) * K); sctx.lineTo(dx * K, (dy2 - 5) * K); sctx.lineTo((dx + 3.6) * K, (dy2 + 1.6) * K); sctx.fill();
  sctx.fillStyle = '#5fd8ff'; sctx.beginPath(); sctx.arc(dx * K, (dy2 + 3) * K, 3 * K, 0, 7); sctx.fill(); sctx.beginPath(); sctx.moveTo((dx - 2.6) * K, (dy2 + 1.8) * K); sctx.lineTo(dx * K, (dy2 - 3.6) * K); sctx.lineTo((dx + 2.6) * K, (dy2 + 1.8) * K); sctx.fill();
  sctx.fillStyle = '#ffffff'; sctx.fillRect((dx - 1.5) * K, (dy2 + 1) * K, 1.2 * K, 1.2 * K);
  txt('NOW LOADING' + '...'.slice(0, (t >> 4) % 4), 80, 118, 9, '#ffffff', 'left', '#0a1030'); txt(Math.round(loadShown * 100) + '%', 320, 118, 9, '#ffe36a', 'right', '#0a1030');
  const tips = pp != null ? LOOP2_TIPS : LOAD_TIPS; // 二周目讀取畫面：介紹豪鬼主任的操作
  let tip = tips[Math.floor(t / 150) % tips.length];
  if (!IS_TOUCH) tip = tip.replace('「衝」', ' C ').replace('「跳」', ' Z ').replace('「射」', ' X ').replace('蘑菇頭往下', '按 ↓');
  txt(tip, 200, 168, 8, '#d8def0', 'center', '#0a1030');
}
// 宣導標語：解決狀況時在畫面上方滑入（每關每種只出現一次）
const TIPS = {
  poop: '遛狗不撿狗便便，依《廢棄物清理法》\n可罰新台幣 1,200～6,000 元！',
  big: '狗便便含寄生蟲和細菌，雨水沖進水溝\n會污染環境、傳播疾病！',
  trash: '亂丟垃圾、菸蒂，依《廢棄物清理法》\n可罰新台幣 1,200～6,000 元！',
  trash2: '垃圾堆積會孳生蚊蠅、蟑螂和老鼠，\n還會傳播登革熱等疾病！',
  dog: '遛狗請繫牽繩、隨身帶袋子，\n保護人狗安全，也讓社區更乾淨！',
  owner: '飼主責任：狗便便請自己清，\n用袋子撿起、丟進垃圾桶！',
  fine: '踩到狗便便很危險會滑倒！\n不清理的飼主可罰 1,200～6,000 元！',
  vent: '垃圾塞住水溝會發臭，下大雨還會淹水！\n水溝保持暢通，人人有責！',
  check: '維護環境 你我一起來！',
};G.tipQ = []; G.tipsShown = new Set();
G.tip = (key) => { if (!TIPS[key] || G.tipsShown.has(key)) return; G.tipsShown.add(key); G.tipQ.push(TIPS[key]); };
function drawTip() {
  if (!G.curTip && G.tipQ.length) G.curTip = { text: G.tipQ.shift(), t: 0 };
  const c = G.curTip; if (!c) return;
  if (c.t > 170) { G.curTip = null; return; }
  const inK = Math.min(1, c.t / 12), outK = c.t > 155 ? (c.t - 155) / 15 : 0, y = 2 - (1 - inK) * 40 - outK * 40;
  const im = UI.ui_tipbanner, w = 190, h = im ? w * im.height / im.width : 28;
  sctx.globalAlpha = 1 - outK;
  if (im) sctx.drawImage(im, (200 - w / 2) * K, y * K, w * K, h * K); else box(50, y, 300, 26, '#fff8e0', '#2f9e8a');
  const ls = c.text.split('\n'); ls.forEach((l, i) => txt(l, 210, y + h / 2 - ls.length * 3.6 + i * 7.2, 6, '#3a2410', 'center', null));
  sctx.globalAlpha = 1;
}
// GPT 中景圖、深淵圖（洋紅底去背）
const MIDIMG = {}, PITIMG = {}, SELHEAD = [];
{ const im = new Image(); im.onload = () => { try { const c = keyMagenta(im), x = c.getContext('2d'), d = x.getImageData(0, 0, c.width, c.height).data, col = [];
  for (let i = 0; i < c.width; i++) { let on = 0; for (let j = 0; j < c.height; j += 2) if (d[(j * c.width + i) * 4 + 3] > 0) { on = 1; break; } col.push(on); }
  let segs = [], s = -1; col.forEach((v, i) => { if (v && s < 0) s = i; if (!v && s >= 0) { segs.push([s, i]); s = -1; } }); if (s >= 0) segs.push([s, c.width]);
  segs = segs.filter(g => g[1] - g[0] > c.width / 40).sort((a, b) => (b[1] - b[0]) - (a[1] - a[0])).slice(0, 5).sort((a, b) => a[0] - b[0]);
  for (const [a, b] of segs) { let top = c.height, bot = 0; for (let j = 0; j < c.height; j++) for (let i = a; i < b; i += 2) if (d[(j * c.width + i) * 4 + 3] > 0) { if (j < top) top = j; bot = j; break; } const o = document.createElement('canvas'); o.width = b - a; o.height = bot - top + 1; o.getContext('2d').drawImage(c, a, top, b - a, bot - top + 1, 0, 0, b - a, bot - top + 1); SELHEAD.push(o); }
} catch (e) {} }; im.src = 'art-sel_heads.webp?v=11230002'; }
[1, 2, 3, 4].forEach(n => {
  const im = new Image(); im.onload = () => { try { MIDIMG[n] = keyMagenta(im); } catch (e) {} }; im.src = 'art-mid' + n + '.webp?v=11230002';
  const ip = new Image(); ip.onload = () => { try { PITIMG[n] = keyMagenta(ip); } catch (e) {} }; ip.src = 'art-pit' + n + '.webp?v=11230002';
});

// ---------- 英雄亂入：中央山脈超人／針筒超人 ----------
const CAMEOS = {
  m: { name: '中央山脈超人', fly: 'cm_fly', idle: 'cm_wave', throw: 'cm_throw', lines: ['愛護山林，垃圾帶下山！', '小編加油！這個給你！', '保護環境，從撿起腳邊的垃圾開始！'] },
  s: { name: '針筒超人', fly: 'cs_fly', idle: 'cs_thumb', throw: 'cs_throw', lines: ['清除積水，預防登革熱！', '打起精神！幫你補充能量！', '垃圾堆積會孳生病媒蚊喔！'] },
};
G.cameoTimer = 600;
// ---------- 針筒超人救援：掉坑時衝下來把小編拉回最近的平台 ----------
function startRescue() {
  const P = G.player; P.frozen = true; P.vx = 0; P.vy = 0;
  G.rescue = { phase: 'dive', t: 0, x: P.cx + 60, y: G.camY || -30, sx: P.lastSafe.x + P.w / 2, sy: P.lastSafe.y };
  G.rescue.y = -30; Audio8.sfx('warp'); floatText(P.cx, 60, '針筒超人：撐住！我來了！', '#9fd0ff', true);
}
function updateRescue() {
  const R = G.rescue; if (!R) return; const P = G.player; R.t++;
  if (R.phase === 'dive') { // 從天上俯衝到小編身邊
    P.vx = 0; P.vy = 0; P.y = Math.min(P.y, G.level.h * TS - 4);
    R.x += (P.cx - R.x) * 0.2; R.y += (P.y - 6 - R.y) * 0.2;
    if (Math.abs(R.x - P.cx) < 3 && Math.abs(R.y - (P.y - 6)) < 3) { R.phase = 'carry'; R.t = 0; Audio8.sfx('magic'); sparks(P.cx, P.cy, '#9fd0ff', 12, 2, 0); }
  } else if (R.phase === 'carry') { // 抓著小編飛回最近的平台
    const tx = R.sx, ty = R.sy - 6, k = Math.min(1, R.t / 50), e = k * k * (3 - 2 * k), lift = Math.sin(k * Math.PI) * 40;
    if (R.t === 1) { R.fx = R.x; R.fy = R.y; }
    R.x = R.fx + (tx - R.fx) * e; R.y = R.fy + (ty - R.fy) * e - lift;
    P.x = R.x - P.w / 2; P.y = R.y + 6; P.vx = 0; P.vy = 0;
    if (k >= 1) { P.x = P.lastSafe.x; P.y = P.lastSafe.y; P.frozen = false; P.inv = 60; R.phase = 'leave'; R.t = 0; Audio8.sfx('heal');
      R.say = 140; floatText(P.cx, P.y - 18, '針筒超人：還好我這次路過有看到你！', '#9fd0ff', true); }
  } else { R.x += 3; R.y -= 2.5; if (R.say) R.say--; if (R.t > 90) G.rescue = null; }
}
function drawRescue(cam) {
  const R = G.rescue; if (!R) return; const s = SPR.f[R.phase === 'leave' ? 'cs_fly' : 'cs_throw'] || SPR.f.cs_fly; if (!s) return;
  ctx.save(); ctx.translate(Math.round(R.x - cam), Math.round(R.y)); ctx.scale(1.3, 1.3); ctx.drawImage(s.img, -s.ax, -s.h / 2, s.w, s.h); ctx.restore();
}
function updateCameo() {
  if (G.mode !== 'play' || script) return;
  const P = G.player;
  if (!G.cameo) {
    if (--G.cameoTimer > 0) return;
    G.cameoTimer = 1100 + Math.floor(rnd(0, 800)); // 超人更常出現
    const id = Math.random() < 0.5 ? 'm' : 's', dir = Math.random() < 0.5 ? 1 : -1, gift = true;
    G.cameo = { id, gift, dir, t: 0, x: G.camX + (dir > 0 ? -40 : VW + 40), y: gift ? 62 : rnd(78, 100), say: '', sayT: 0, phase: 'in' };
    Audio8.sfx('warp');
    return;
  }
  const c = G.cameo, C = CAMEOS[c.id]; c.t++;
  if (!c.gift) { // 遠方飛過
    c.x += c.dir * 1.5; c.y += Math.sin(c.t / 12) * 0.4;
    if (c.t === 50) { c.say = C.lines[Math.random() < 0.5 ? 0 : 2]; c.sayT = 150; }
    if (Math.abs(c.x - G.camX - 200) > 300) G.cameo = null;
  } else {
    if (c.phase === 'in') { const tx = P.cx - c.dir * 30; c.x += (tx - c.x) * 0.06; c.y += (62 - c.y) * 0.06; if (Math.abs(tx - c.x) < 4) { c.phase = 'hover'; c.t = 0; c.say = '我來幫你！'; c.sayT = 110; Audio8.sfx('magic'); } }
    else if (c.phase === 'hover') { c.y = 62 + Math.sin(c.t / 10) * 2;
      if (c.t === 25) { let n = 0; for (const e of G.enemies) if (!e.dead && e.code !== 'o' && e.code !== 'v' && e.state !== 'tamed' && e.x > G.camX - 10 && e.x < G.camX + VW + 10) { e.damage(99, null); n++; } if (G.intruder && G.intruder.state !== 'ko') { if (G.intruder.kind === 'typhoon' && c.id === 's') { c.phase = 'blown'; c.t = 0; c.say = '哇啊啊～被吹走了！'; c.sayT = 80; G.intruder.say = '呼～～針筒超人吹走啦！'; G.intruder.sayT = 80; Audio8.sfx('gas'); } else { knockOut(G.intruder, C.name + '：滾開！'); n++; } } G.flash = 6; Audio8.sfx('bigshot'); if (n) floatText(c.x, c.y + 24, C.name + '掃蕩！擊退 ' + n + ' 隻', '#ffe36a', true); }
      if (c.t === 60) { c.phase = 'throw'; c.t = 0; } }
    else if (c.phase === 'blown') { c.x += c.dir * -5; c.y -= 2; c.spin = (c.spin || 0) + 0.35; if (c.t > 80) G.cameo = null; }
    else if (c.phase === 'throw') {
      if (c.t === 6 || c.t === 14) { const r = Math.random(), type = c.t === 6 ? 'boba' : r < 0.6 ? 'star' : 'egg'; const it = new Item(type, c.x + c.dir * (c.t === 6 ? 6 : 18), c.y + 10, true); it.vy = -2; G.items.push(it); Audio8.sfx('throw'); FX('heal', c.x, c.y + 10, { opts: { size: 0.3 } }); }
      if (c.t > 24) { c.phase = 'out'; c.t = 0; }
    } else { c.x += c.dir * 3; c.y -= 0.6; if (Math.abs(c.x - G.camX - 200) > 300) G.cameo = null; }
  }
  if (c.sayT > 0) c.sayT--;
}
function drawCameo(cam, back) {
  const c = G.cameo; if (!c) { G.cameoSay = null; return; } if (back !== !c.gift) return;
  const C = CAMEOS[c.id];
  const key = c.gift && c.phase === 'hover' ? C.idle : c.gift && c.phase === 'throw' ? C.throw : C.fly + (Math.floor(c.t / 6) % 2);
  const s = SPR.f[key]; if (!s) return;
  const k = back ? 1.1 : 1.5;
  ctx.save(); ctx.translate(Math.round(c.x - cam), Math.round(c.y)); if (c.spin) ctx.rotate(c.spin); ctx.scale(c.dir * k, k); if (back) ctx.globalAlpha = 0.92;
  ctx.drawImage(s.img, -s.ax, -s.h / 2, s.w, s.h); ctx.restore();
  const onScr = c.x - cam > 10 && c.x - cam < VW - 10;
  if (c.sayT > 0 && onScr) G.cameoSay = { x: c.x, top: c.y - s.h * k / 2, bot: c.y + s.h * k / 2, text: C.name + '：' + c.say };
  else G.cameoSay = null;
}
// 小編行進中自言自語（配合場景）
G.mumbleT = 600;
function updateMumble() {
  const P = G.player; if (G.mode !== 'play' || script || P.dead) { if (G.mode !== 'play') G.heroSay = null; return; } // 進魔王門／魔王戰／對話時，碎念泡泡立刻消失
  if (G.heroSay && --G.heroSay.t <= 0) G.heroSay = null;
  if (P.slipT === 20) { G.heroSay = { text: '咦…我好像踩到了什麼…', t: 110 }; return; }
  G.walkT = Math.abs(P.vx) > 0.3 && P.onGround ? (G.walkT || 0) + 1 : 0; // 連續走路時間
  if (--G.mumbleT > 0) return;
  G.mumbleT = 300; // 碎念：每 5 秒講一句（每句顯示約 2 秒）
  const near = G.items.filter(i => (i.type === 'poop' || i.type === 'big') && Math.abs(i.cx - P.cx) < 220).length;
  const pool = ['我才不是大叔！我才 45 歲！', '我肚子好餓…等等去吃夜市。', '這邊也太髒了吧…', '我好想下班…', '今天適合吃薑母鴨。', '我考卷還沒改完…', 'EMI 計畫還沒寫啊…', '今天的影片還沒做…', '我老婆又嫌我胖了…', '我痛風發作…'];
  if (near >= 1) { for (const food of ['我肚子好餓…等等去吃夜市。', '今天適合吃薑母鴨。']) { const i = pool.indexOf(food); if (i >= 0) pool.splice(i, 1); } } // 在大便旁邊不講吃的，太噁心
  if (near >= 3) pool.push('狗屎好多…到底是誰不撿！', '狗屎好多…', '狗屎好多…');
  if (G.walkT > 180) pool.push('我痛風發作…', '我痛風發作…', '我痛風發作…'); // 走超過 3 秒，痛風比較容易發作
  if (G.clean / Math.max(1, G.level.total) > 0.5) pool.push('乾淨多了，心情真好！');
  if (G.char === 'witch') { // 豪鬼主任的碎念
    pool.length = 0; pool.push('騎掃把巡邏，比走路輕鬆多了～', '誰亂丟垃圾？給我記一支警告！', '這次換我來當好人啦！', '下次朝會要好好宣導一下。', '小編跑太慢了，還是我來吧～', '月考考卷還沒出完…', '呵呵～從上面看，垃圾一清二楚！', 'EMI 計畫還沒寫完…', '我想回去畫畫…', '好想下班…', '我英文不好…');
    if (near >= 3) pool.push('狗屎好多…這些飼主都給我罰站！', '狗屎好多…');
    if (G.clean / Math.max(1, G.level.total) > 0.5) pool.push('嗯，乾淨多了，給你們一百分！');
  }
  let text; do { text = pool[Math.floor(rnd(0, pool.length))]; } while (text === G.lastMumble && pool.length > 1);
  G.lastMumble = text; G.heroSay = { text, t: 130 };
}
function drawHeroSay() {
  const s = G.heroSay; if (!s || !G.zc || G.dialog) return;
  const P = G.player, [x, y] = worldToScreen(P.cx, P.y - 16);
  sctx.globalAlpha = Math.min(1, s.t / 15);
  // 平常在頭上；飛太高（會撞到上方 HUD）時改顯示在腳下，一樣跟著人跑
  if (y - 20 >= 44) drawBubble('ui_bubble', x, y - 20, s.text, '#16233a', '#16111f', x);
  else { const [, fy] = worldToScreen(P.cx, P.y + P.h); drawBubble('ui_bubble', x, Math.min(VH - 24, fy + 6), s.text, '#16233a', '#16111f'); }
  sctx.globalAlpha = 1;
}
// GPT 對話泡泡（沒有圖時用簡單框）
// 自己畫的像素對話框：箭頭永遠對準說話的人（tailX）
function pixBubble(bx, by, w, h, tailX, border, fill, shade) {
  const r = (x, y, ww, hh, c) => { sctx.fillStyle = c; sctx.fillRect(Math.round(x * K), Math.round(y * K), Math.round(ww * K), Math.round(hh * K)); };
  r(bx + 2, by, w - 4, h, border); r(bx, by + 2, w, h - 4, border); r(bx + 1, by + 1, w - 2, h - 2, border);
  r(bx + 2, by + 1, w - 4, h - 2, fill); r(bx + 1, by + 2, w - 2, h - 4, fill);
  r(bx + 2, by + h - 3, w - 4, 2, shade); r(bx + 3, by + 2, 3, 1, '#9fd0ff');
  const tx = Math.max(bx + 6, Math.min(bx + w - 6, tailX));
  for (let i = 0; i < 5; i++) { const hw = 4 - i; r(tx - hw - 1, by + h - 1 + i, hw * 2 + 2, 1, border); if (hw > 0) r(tx - hw, by + h - 2 + i, hw * 2, 1, i ? fill : shade); }
}
function drawBubble(imgKey, cx, topY, text, color, fallbackBorder, tailX) {
  sctx.font = `${Math.round(7 * K)}px Cubic11, "Microsoft JhengHei", sans-serif`;
  const tw = sctx.measureText(text).width / K, w = tw + 22, h = 21;
  const bx = Math.max(4, Math.min(VW - w - 4, cx - w / 2));
  if (tailX != null) { pixBubble(bx, topY, w, 14, tailX, '#16111f', '#ffffff', '#cfe6ff'); txt(text, bx + w / 2, topY + 3, 7, color, 'center', null); return h; }
  const im = UI[imgKey];
  if (im) sctx.drawImage(im, bx * K, topY * K, w * K, h * K);
  else box(bx, topY, w, 14, '#ffffff', fallbackBorder);
  txt(text, bx + w / 2, topY + (im ? 5.5 : 3), 7, color, 'center', null);
  return h;
}
function drawCameoSay() {
  const b = G.cameoSay; if (!b || !G.zc || !G.cameo || G.mode !== 'play') return;
  const [x, ty] = worldToScreen(b.x, b.top), [, by] = worldToScreen(b.x, b.bot);
  // 上方放得下就放上方，否則放到超人下方，避免擋住他
  const above = ty - 24 >= 44;
  drawBubble('ui_bubble_hero', x, above ? ty - 24 : by + 3, b.text, '#5a1010', '#d23a3a');
}
// 在畫面座標（遊戲單位）置中畫一張 UI 圖，寬度 w
function uiImg(k, cx, cy, w, alpha = 1) { const c = UI[k]; if (!c) return false; const h = w * c.height / c.width; sctx.globalAlpha = alpha; sctx.drawImage(c, (cx - w / 2) * K, (cy - h / 2) * K, w * K, h * K); sctx.globalAlpha = 1; return true; }
const PORTRAIT = { hero: 'p_hero', witch: 'p_witch', abo: 'p_abo', lady: 'p_lady', dogking: 'p_dogking', chief: 'p_chief', kid: 'p_kid', virus: 'p_virus', typhoonB: 'p_typhoon', rhinoB: 'p_rhino', shacho: 'p_shacho' };
const SPRITE_FALLBACK = { hero: 'hero_stand', witch: 'witchS', abo: 'abo0', lady: 'lady0', dogking: 'dk0', chief: 'chief0', kid: 'kid0' };

// ---------- 輸入 ----------
const KEYMAP = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', KeyZ: 'jump', KeyK: 'jump', Space: 'jump', KeyX: 'shoot', KeyJ: 'shoot', KeyC: 'dash', KeyL: 'dash', ShiftLeft: 'dash', KeyA: 'ult', KeyU: 'ult', KeyS: 'swap', KeyI: 'swap', KeyQ: 'swap', Enter: 'start', Escape: 'start', KeyM: 'mute', KeyF: 'fx' };
const held = {}, prevHeld = {};
addEventListener('keydown', e => { const k = KEYMAP[e.code]; if (k) { held[k] = true; e.preventDefault(); } Audio8.init(); });
addEventListener('keyup', e => { const k = KEYMAP[e.code]; if (k) { held[k] = false; e.preventDefault(); } });
addEventListener('blur', () => { for (const k in held) held[k] = false; });
const touch = document.getElementById('touch');
if ('ontouchstart' in window || navigator.maxTouchPoints > 0) touch.classList.add('on');
touch.querySelectorAll('.tb').forEach(b => {
  const k = b.dataset.k;
  b.addEventListener('pointerdown', e => { e.preventDefault(); held[k] = true; b.classList.add('down'); Audio8.init(); b.setPointerCapture(e.pointerId); });
  const up = e => { held[k] = false; b.classList.remove('down'); };
  b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
});
screen.addEventListener('pointerdown', () => { Audio8.init(); if (G.mode === 'boot') held.start = true; setTimeout(() => held.start = false, 80); });
function pollInput() {
  const gp = navigator.getGamepads ? [...navigator.getGamepads()].find(g => g) : null;
  const pad = {};
  if (gp) {
    const b = i => gp.buttons[i] && gp.buttons[i].pressed;
    pad.left = b(14) || gp.axes[0] < -0.4; pad.right = b(15) || gp.axes[0] > 0.4; pad.up = b(12) || gp.axes[1] < -0.5; pad.down = b(13) || gp.axes[1] > 0.5;
    pad.jump = b(0); pad.shoot = b(2) || b(1); pad.dash = b(5) || b(7); pad.ult = b(3); pad.swap = b(4) || b(6); pad.start = b(9);
  }
  const I = G.input;
  for (const k of ['left', 'right', 'up', 'down', 'jump', 'shoot', 'dash', 'ult', 'swap', 'start', 'mute', 'fx']) {
    const h = !!(held[k] || pad[k]);
    I.pressed[k] = h && !prevHeld[k]; I.held[k] = h; prevHeld[k] = h;
  }
  I.pressed.ok = I.pressed.jump || I.pressed.shoot || I.pressed.start;
  if (I.pressed.mute) { const m = Audio8.toggleMute(); toast(m ? '靜音' : '聲音開啟'); }
  if (I.pressed.fx) { G.lowFx = !G.lowFx; toast(G.lowFx ? '特效：簡易' : '特效：完整'); }
}
let toastMsg = null; function toast(m) { toastMsg = { m, t: 90 }; }

// ---------- 腳本（協程） ----------
let script = null, waitN = 0, waitFn = null;
function run(gen) { script = gen; waitN = 0; waitFn = null; }
function stepScript() {
  while (script) {
    if (waitN > 0) { waitN--; return; }
    if (waitFn) { if (!waitFn()) return; waitFn = null; }
    const r = script.next();
    if (r.done) { script = null; return; }
    if (typeof r.value === 'number') waitN = r.value;
    else if (typeof r.value === 'function') waitFn = r.value;
  }
}
function* talk(lines) {
  for (const l0 of lines) {
    const l = forPlayer(l0); // 看選的英雄：選豪鬼主任就由她來講
    const [who, name, text] = l.length === 3 ? l : [l[0] === '小編' ? 'hero' : l[0] === '小學生' ? 'kid' : 'chief', l[0], l[1]];
    G.dialog = { who, name, text, shown: 0, t: 0 };
    yield () => G.dialog === null;
  }
}
function* playVideo(src, maxSec = 12, audioName = null) {
  const v = document.createElement('video');
  // 有分離的音軌就讓影片靜音（一定能自動播），聲音由音樂播放器同步播出
  v.src = src; v.playsInline = true; v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', ''); v.muted = audioName ? true : Audio8.isMuted(); v.preload = 'auto';
  // 影片疊在遊戲畫面上方，用淡入淡出銜接（不再硬切）
  Object.assign(v.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', objectFit: 'contain', background: 'rgba(0,0,0,0.85)', zIndex: 5, opacity: '0', transition: 'opacity .45s ease', pointerEvents: 'none' });
  // iPhone 不會預先載入影片：直接放進畫面並播放；有聲音被擋就改成靜音再播
  let state = 'load';
  document.body.appendChild(v);
  const show = () => { if (state === 'load') { state = 'play'; if (audioName) Audio8.oneShot(audioName); setTimeout(() => { v.style.opacity = '1'; }, 30); } };
  v.addEventListener('playing', show);
  v.addEventListener('error', () => { state = 'fail'; });
  v.addEventListener('ended', () => { state = 'done'; });
  const p = v.play(); if (p && p.catch) p.catch(() => { v.muted = true; v.play().catch(() => { state = 'fail'; }); });
  setTimeout(() => { if (state === 'load') state = 'fail'; }, 8000);
  const t0 = performance.now();
  yield () => state === 'fail' || state === 'done' || (state === 'play' && (G.input.pressed.start || performance.now() - t0 > maxSec * 1000) || state === 'play' && v.duration && v.currentTime > v.duration - 0.45);
  if (state !== 'fail') { v.style.opacity = '0'; G.flash = 8; yield 26; }
  v.pause(); if (v.parentNode) v.remove();
  Audio8.init(); // iPhone 播完影片後會暫停遊戲音效，這裡叫醒
  return state !== 'fail';
}

// ---------- 關卡 ----------
let LV = null;
function loadLevel(n) {
  const D = LEVEL_DATA[n - 1];
  const t = D.map.map(r => r.split(''));
  const L = { def: D, theme: D.theme, w: t[0].length, h: t.length, t, gateOpen: false, gateAnim: 0, yoku: [], tt: 0 };
  G.tipQ = []; G.tipsShown = new Set(); G.curTip = null;
  G.cameo = null; G.heroSay = null; G.rescue = null; G.cameoTimer = 600; G.mumbleT = 120; G.intruder = null; G.intruderTimer = 900;
  Object.assign(G, { splashes: [], ultraBeam: null, ultraWave: null, ultraAura: 0, ultraLift: 0, parts: [], texts: [], bullets: [], eshots: [], items: [], enemies: [], npcs: [], platforms: [], boss: null, clean: 0, dynPoops: 0, checkpoint: null, dark: 0, freeze: false });
  if (window.VFX) VFX.clear();
  let total = 0, start = { x: 40, y: 176 }, npcI = 0, yokuCells = [];
  for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
    const c = t[y][x], px = x * TS + 8, py = (y + 1) * TS;
    if ('#=-H^G'.includes(c)) continue;
    if (c === 'Y') { yokuCells.push([x, y]); continue; }
    t[y][x] = '.';
    if (c === '.') continue;
    if (c === '@') start = { x: px, y: py };
    else if (c === 'p') { G.items.push(new Item('poop', px, py)); total++; }
    else if (c === 'P') { G.items.push(new Item('big', px, py)); total += 2; }
    else if (c === 't') { G.items.push(new Item('trash', px, py)); total++; }
    else if (c === 'h') G.items.push(new Item('egg', px, py));
    else if (c === 'B') G.items.push(new Item('boba', px, py));
    else if (c === 'k') G.items.push(new Item('check', px, py));
    else if (c === 'n') { const d = D.npcs[npcI++]; if (d) G.npcs.push(new NPC(px, py, d)); }
    else if (c === 'M') G.platforms.push(new Platform(px, y * TS + 4, 'h'));
    else if (c === 'V') G.platforms.push(new Platform(px, y * TS + 4, 'v'));
    else if (c === 'Z') L.bossSpawn = { x: px, y: py };
    else if (ENEMY_DEF[c]) G.enemies.push(new Enemy(c, px, py));
  }
  // 消失磚分組（同一列相鄰為一組）
  yokuCells.sort((a, b) => a[0] - b[0]);
  for (const [x, y] of yokuCells) { const g = L.yoku.find(g => g.y === y && g.x2 === x - 1); if (g) g.x2 = x; else L.yoku.push({ x1: x, x2: x, y }); }
  L.yoku.forEach((g, i) => g.i = i);
  L.yokuOn = (tx, ty) => { const g = L.yoku.find(g => g.y === ty && tx >= g.x1 && tx <= g.x2); return g ? g.on : false; };
  // 魔王門
  for (let x = 0; x < L.w; x++) if (t[9][x] === 'G') { L.gateX = x; break; }
  L.arena = { x0: L.gateX * TS + TS, x1: (L.gateX + 24) * TS };
  G.arena = L.arena;
  G.level = L; LV = L; // 先設好地圖，下面判斷地形才找得到
  // 困難模式：小怪加倍（每隻旁邊多一隻；二周目多派戰鬥員／小病毒），怪人入侵更頻繁
  if (G.hard) {
    for (const e of G.enemies.slice()) {
      if (!ENEMY_DEF[e.code] || 'RmMvo'.includes(e.code)) continue;
      const code = D.loop === 2 ? (Math.random() < 0.5 ? 'g' : 'x') : e.code, x = e.cx + (Math.random() < 0.5 ? -28 : 28);
      const tx = Math.floor(x / TS), ty = Math.floor((e.y + e.h + 2) / TS);
      if (isSolid(tx, ty) && !isSolid(tx, ty - 1)) G.enemies.push(new Enemy(code, x, ty * TS));
    }
    G.intruderTimer = 450;
  }
  L.total = total; L.req = Math.ceil(total * 0.5);
  G.level = L; LV = L;
  G.player = new Player(start.x, start.y); G.start = start;
  G.camX = 0; G.stage = n; G.time = 0; G.deathsStage = 0; G.killsStage = 0;
  syncAbilities(); G.refillAmmo(); G.weapon = 'water';
}
function updateYoku() {
  const L = G.level; L.tt++;
  const n = L.yoku.length; if (!n) return;
  const step = 40, cyc = 240; // 每塊亮 170/240 幀，前後塊重疊，比較好跳
  for (const g of L.yoku) {
    const ph = ((L.tt - g.i * step) % cyc + cyc) % cyc;
    const was = g.on; g.on = ph < 170; g.age = ph;
    if (g.on && !was && Math.abs(g.x1 * TS - G.camX - 200) < 260) Audio8.sfx('blip');
  }
}
G.cleanUp = (x, y, msg, amt = 1) => {
  G.clean += amt; G.score += 50 * amt; G.ultra = Math.min(100, G.ultra + 9 * amt);
  const L = G.level, pct = Math.min(100, Math.floor(G.clean / Math.max(1, L.total) * 100));
  floatText(x, y - 4, msg + ' ' + pct + '%', '#9ff3ff');
  if (G.clean >= L.req && !L.reqToast) { L.reqToast = true; toast('清潔度達標！魔王之門已解鎖！'); Audio8.sfx('checkpoint'); }
};
G.heal = (n) => { const P = G.player; const start = P.hp; P.hp = Math.min(P.maxHp, P.hp + n); FX('heal', P.cx, P.y + P.h, { opts: { size: 0.4 } }); Audio8.sfx('heal'); };

// ---------- 流程 ----------
function goTitle() {
  // 已經能玩二周目的人：一到開始畫面就在背景先下載二周目素材，按下去不用等
  if (save.cleared.includes(4) || SECRET || save.char === 'witch') setTimeout(startLoop2Load, 800);
  G.mode = 'title'; G.menu = 0; Audio8.music('title'); if (window.VFX) VFX.clear(); }
function goSelect(loop) {
  if (loop) G.loop = loop; else G.loop = G.stage >= 5 ? 2 : (G.loop || 1);
  G.char = G.loop === 2 && save.char === 'witch' ? 'witch' : 'hero';
  const o = loopOff(); G.selSayI = -1; G.charSay = null; G.charSwapT = null;
  G.mode = 'select'; syncAbilities(); G.sel = [1, 2, 3].every(i => save.cleared.includes(o + i)) ? 3 : [0, 1, 2].find(i => !save.cleared.includes(o + i + 1)) || 0; Audio8.music('title'); if (window.VFX) VFX.clear();
}
function* storyIntro() {
  G.mode = 'story'; G.storyBg = 'bg1';
  yield* talk(STORY_INTRO);
  goSelect();
}
function startStage(n) {
  if (n === 4) setTimeout(startLoop2Load, 500); // 打最終關時就在背景預先下載二周目（趁關卡標題動畫時處理，不卡遊戲），破關後直接進
  G.mode = 'stageCard'; G.cardT = 0; G.cardStage = n; Audio8.stopMusic(); Audio8.sfx('select');
  run((function* () {
    yield 6; Audio8.music(LEVEL_DATA[n - 1].music); yield 214;
    loadLevel(n); G.mode = 'ready'; G.readyT = 0; G.player.frozen = true;
    yield 150;
    G.mode = 'play'; G.player.frozen = false; Audio8.music(LEVEL_DATA[n - 1].music);
  })());
}
function* bossSequence() {
  const L = G.level, D = L.def, P = G.player;
  G.mode = 'gate'; P.frozen = true; P.vx = 0;
  Audio8.stopMusic(); Audio8.sfx('door');
  for (let i = 0; i <= 30; i++) { L.gateAnim = i / 30; yield 1; }
  L.gateOpen = true;
  // 自動走進門，鏡頭平移
  const targetCam = L.gateX * TS, startCam = G.camX;
  for (let i = 0; i < 70; i++) { G.camX = startCam + (targetCam - startCam) * (i / 69); P.x += 1.1; P.face = 1; P.anim++; P.vx = 1; yield 1; }
  P.vx = 0; P.x = Math.max(P.x, L.arena.x0 + 8);
  L.gateOpen = false; Audio8.sfx('door');
  G.enemies = G.enemies.filter(e => e.state !== 'sorry' && e.state !== 'tamed' && e.x < L.arena.x0 - 8);
  for (let i = 30; i >= 0; i--) { L.gateAnim = i / 30; yield 1; }
  G.mode = 'bossIntro';
  // 魔王出場動畫：先試 Grok 生成的影片，沒有就用遊戲內動畫
  // 魔王出場動畫（Grok 影片，淡入淡出）
  yield* playVideo('video-boss' + G.stage + '.mp4', 8, 'vintro' + G.stage);
  Audio8.music(D.bossMusic || 'boss'); Audio8.sfx(Audio8.hasExt('bosswarn') ? 'bosswarn' : 'siren'); G.warnT = 120; yield 60; // 魔王出場警告：ElevenLabs 史詩感號角（不用警報聲）
  G.boss = new Boss(D.boss, L.bossSpawn.x, L.arena && 11 * TS);
  yield () => G.boss.entrance();
  yield* talk(D.intro);
  // 血條充填
  Audio8.music(D.bossMusic || 'boss');
  G.bossBarFill = 0;
  for (let i = 0; i <= 28; i++) { G.bossBarFill = i; if (i % 4 === 0) Audio8.sfx('cursor'); yield 2; }
  G.bossBarFill = null;
  G.mode = 'boss'; P.frozen = false; G.boss.state = 'idle'; G.boss.st = 0;
}
G.onBossDefeated = (b) => {
  run((function* () {
    G.mode = 'bossDown'; G.player.frozen = true; G.eshots = []; Audio8.stopMusic(); Audio8.sfx('bossdie'); Audio8.sfx('bossboom'); // 魔王被打倒：連環大爆炸 G.flash = 12; G.shake = 16;
    for (const e of G.enemies) if (e.code === 's' || e.code === 'x' || e.code === 'g') e.dead = true;
    FX(b.kind === 'dogking' ? 'star' : 'converge', b.cx, b.cy, { opts: { size: b.kind === 'dogking' ? 0.9 : 0.7 } });
    yield 130;
    if (Audio8.hasExt('victory')) Audio8.sfx('victory'); else Audio8.music('victory'); G.winPose = true; yield 170; G.winPose = false;
    yield* talk(G.level.def.outro);
    const before = { ...G.abilities }, lvBefore = G.gunLv;
    const firstClear = !save.cleared.includes(G.stage);
    if (firstClear) save.cleared.push(G.stage);
    { const old = save.stats[G.stage], st = { time: G.time, clean: G.clean, total: G.level.total, deaths: G.deathsStage || 0, kills: G.killsStage || 0 }; st.stars = stageStars(st);
      save.stats[G.stage] = !old || (st.stars || 0) >= (old.stars || stageStars(old)) ? st : old; } // 保留最好的成績
    writeSave(); syncAbilities();
    const wkey = STAGE_WEAPON[G.stage];
    const newPassive = ['charge', 'djump', 'dash'].filter(k => G.abilities[k] && !before[k]);
    G.getInfo = { weapon: wkey, passives: newPassive, lv: G.gunLv, lvUp: G.gunLv > lvBefore };
    const reward = wkey;
    if (reward) {
      // 吸收魔王能力的特效
      G.mode = 'absorb'; const P = G.player, ab = WEAPONS[reward];
      floatText(b.cx, b.y - 14, '能力釋放中…', ab.color, true);
      FX('converge', b.cx, b.cy, { opts: { size: 0.5, color: ab.color } }); Audio8.sfx('magic'); yield 40;
      G.absorb = { t: 0, from: { x: b.cx, y: b.cy }, color: ab.color };
      for (let i = 0; i < 26; i++) { const a = rnd(0, 6.28); G.parts.push({ x: b.cx + Math.cos(a) * 20, y: b.cy + Math.sin(a) * 20, vx: Math.cos(a) * 2, vy: Math.sin(a) * 2, life: 140, max: 140, c: i % 2 ? ab.color : '#ffffff', s: 3, g: 0, home: true, delay: i * 3 }); }
      Audio8.sfx(Audio8.hasExt('absorb') ? 'absorb' : 'warp'); yield 90;
      FX('relic', P.cx, P.y + P.h, { life: 1.4, opts: { size: 0.6, color: ab.color } }); FX('heal', P.cx, P.y + P.h, { opts: { color: ab.color } });
      G.heroGlow = 90; Audio8.sfx('bigshot'); G.flash = 10; floatText(P.cx, P.y - 14, '吸收能力：' + ab.name + '！', ab.color, true);
      yield 100; G.absorb = null;
      G.mode = 'getAbility'; G.getT = 0; G.getAb = reward; if (Audio8.hasExt('getweapon')) { Audio8.sfx('getweapon'); setTimeout(() => { if (G.mode === 'getAbility') Audio8.music('title'); }, 3300); } else Audio8.music('getweapon', () => Audio8.music('title'));
      yield () => G.getT > 90 && G.input.pressed.ok;
      goSelect();
    } else if (G.stage !== 4 && G.stage !== 8) {
      // 二周目的怪人：沒有新武器，打倒後回選關
      floatText(G.player.cx, G.player.y - 20, 'STAGE CLEAR！', '#ffe36a', true); Audio8.sfx('checkpoint'); yield 120;
      goSelect();
    } else {
      yield 40; yield* endingSeq();
    }
  })());
};
function* endingSeq() {
  G.mode = 'ending'; G.endT = 0; Audio8.music('ending'); if (window.VFX) VFX.clear();
  yield 60;
  yield* talk(G.stage === 8 ? ENDING2 : ENDING);
  G.mode = 'slogan'; G.slT = 0; // 宣導標語
  yield () => G.slT > 300 || (G.slT > 90 && G.input.pressed.ok);
  G.mode = 'credits'; G.credT = 0;
  yield () => G.credT > 1100 || (G.credT > 200 && G.input.pressed.ok);
  openCert(); // 獎狀：輸入名字、下載
}
// ---------- 成績：星星與分數 ----------
function stageStars(s) { if (!s) return 0; let n = 1; if (s.total && s.clean / s.total >= 0.9) n++; if (!s.deaths) n++; return n; }
function stageScore(s) { if (!s) return 0; return Math.max(0, s.clean * 100 + (s.kills || 0) * 50 + stageStars(s) * 1000 + Math.max(0, 2000 - Math.floor((s.time || 0) / 60) * 5) - (s.deaths || 0) * 300); }
function totals() {
  const t = { stars: 0, score: 0, kills: 0, clean: 0, deaths: 0, time: 0 };
  const o = loopOff();
  for (let n = o + 1; n <= o + 4; n++) { const s = save.stats[n]; if (!s) continue; t.stars += stageStars(s); t.score += stageScore(s); t.kills += s.kills || 0; t.clean += s.clean || 0; t.deaths += s.deaths || 0; t.time += s.time || 0; }
  t.rank = t.stars >= 12 ? '傳說級清潔英雄' : t.stars >= 9 ? '金牌清潔英雄' : t.stars >= 6 ? '銀牌清潔英雄' : '清潔小尖兵';
  return t;
}
const starStr = n => '★'.repeat(n) + '☆'.repeat(3 - n);
// ---------- 宣導標語 ----------
function drawSlogan() {
  const t = G.slT;
  sctx.fillStyle = '#0d1a3a'; sctx.fillRect(0, 0, screen.width, screen.height);
  sctx.save(); sctx.translate(200 * K, 112 * K); sctx.rotate(t * 0.003); sctx.fillStyle = 'rgba(255,214,92,0.10)';
  for (let i = 0; i < 16; i++) { sctx.rotate(Math.PI / 8); sctx.beginPath(); sctx.moveTo(0, 0); sctx.lineTo(420 * K, -28 * K); sctx.lineTo(420 * K, 28 * K); sctx.fill(); }
  sctx.restore();
  for (let i = 0; i < 40; i++) { const x = (i * 37) % VW, y = ((i * 53 + t * (0.6 + (i % 4) * 0.2)) % 240) - 10; sctx.fillStyle = ['#ff5a5a', '#ffe36a', '#7ff3ff', '#7dffa0', '#ff9de2'][i % 5]; sctx.fillRect(x * K, y * K, 3 * K, 3 * K); }
  const s0 = Math.min(1, t / 20);
  if (uiImg('ui_slogan', 200, 104, 360 * (1.4 - 0.4 * s0), s0)) return;
  SLOGANS.forEach((s, i) => { if (t < 20 + i * 25) return; const big = i === SLOGANS.length - 1; txt(s, 200, 50 + i * 34 + (big ? 6 : 0), big ? 20 : 16, big ? '#ffe36a' : '#ffffff', 'center', '#5a1d00'); });
}
// ---------- 獎狀 ----------
let certName = '', certCv = null, certUI = null;
function makeCert(name) {
  const W = 1600, H = 1320, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const SERIF = '"BiauKai","DFKai-SB","標楷體","Kaiti TC","Noto Serif TC","PMingLiU",serif', SANS = '"PingFang TC","Microsoft JhengHei","Noto Sans TC",sans-serif';
  const T = totals(), today = new Date();
  // 紙張
  const pg = x.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, 950); pg.addColorStop(0, '#fffdf3'); pg.addColorStop(1, '#f5e6c4'); x.fillStyle = pg; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 2500; i++) { x.fillStyle = `rgba(150,110,40,${(i % 7) / 160})`; x.fillRect((i * 7919) % W, (i * 104729) % H, 2, 2); }
  // 外框：金＋紅雙框、四角星飾
  x.strokeStyle = '#c9a227'; x.lineWidth = 22; x.strokeRect(34, 34, W - 68, H - 68);
  x.strokeStyle = '#b3262e'; x.lineWidth = 6; x.strokeRect(62, 62, W - 124, H - 124);
  x.strokeStyle = '#c9a227'; x.lineWidth = 2; x.strokeRect(74, 74, W - 148, H - 148);
  const star = (cx, cy, r, col) => { x.fillStyle = col; x.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } x.closePath(); x.fill(); };
  for (const [cx, cy] of [[62, 62], [W - 62, 62], [62, H - 62], [W - 62, H - 62]]) { x.fillStyle = '#b3262e'; x.beginPath(); x.arc(cx, cy, 34, 0, 7); x.fill(); star(cx, cy, 26, '#ffd65c'); }
  // 標誌＋標題
  const lg = UI.ui_logo; if (lg) { const w = 400, h = w * lg.height / lg.width; x.drawImage(lg, W / 2 - w / 2, 92, w, h); }
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = `900 140px ${SERIF}`; x.lineWidth = 10; x.strokeStyle = '#f3d36b'; x.strokeText('獎　狀', W / 2, 330); x.fillStyle = '#b3262e'; x.fillText('獎　狀', W / 2, 330);
  // 內文
  x.fillStyle = '#3a2410'; x.font = `700 44px ${SERIF}`; x.textAlign = 'left'; x.fillText('茲證明', 190, 445);
  x.textAlign = 'center'; x.font = `900 84px ${SERIF}`; x.fillStyle = '#1a2a6c'; x.fillText(name || '清潔英雄', W / 2, 445);
  x.fillStyle = '#c9a227'; x.fillRect(W / 2 - 330, 495, 660, 5);
  x.fillStyle = '#3a2410'; x.font = `700 42px ${SERIF}`;
  x.fillText('在《小編出擊！》中奮勇作戰，打倒四大魔王，', W / 2, 560);
  x.fillText('讓全城恢復乾淨，表現傑出，特頒此狀，以資表揚。', W / 2, 618);
  x.font = `900 46px ${SERIF}`; x.fillStyle = '#b3262e'; x.fillText('榮獲稱號：「' + T.rank + '」', W / 2, 686);
  // 成績表
  const bx = 200, by = 730, bw = W - 400, rh = 46;
  x.fillStyle = 'rgba(255,255,255,0.65)'; x.fillRect(bx, by, bw, rh * 6 + 10); x.strokeStyle = '#c9a227'; x.lineWidth = 3; x.strokeRect(bx, by, bw, rh * 6 + 10);
  const cols = [bx + 40, bx + 420, bx + 640, bx + 880, bx + 1080];
  x.font = `700 28px ${SANS}`; x.fillStyle = '#7a5a20'; x.textAlign = 'left';
  ['關卡', '星星', '清潔', '擊潰', '分數'].forEach((h, i) => x.fillText(h, cols[i], by + 28));
  x.font = `600 28px ${SANS}`;
  for (let i = 1; i <= 4; i++) { const n = loopOff() + i, s = save.stats[n], y = by + 28 + rh * i, D = LEVEL_DATA[n - 1];
    x.fillStyle = '#3a2410'; x.fillText((i < 4 ? '第' + '一二三'[i - 1] + '關 ' : '最終關 ') + D.name, cols[0], y);
    x.fillStyle = '#e0a800'; x.font = `700 30px ${SANS}`; x.fillText(s ? starStr(stageStars(s)) : '☆☆☆', cols[1], y); x.font = `600 28px ${SANS}`;
    x.fillStyle = '#3a2410'; x.fillText(s ? (s.total ? Math.round(s.clean / s.total * 100) : 100) + '%' : '—', cols[2], y); x.fillText(s ? (s.kills || 0) + ' 隻' : '—', cols[3], y); x.fillText(s ? stageScore(s).toLocaleString() : '—', cols[4], y); }
  x.fillStyle = '#b3262e'; x.font = `900 30px ${SANS}`; const ty = by + 28 + rh * 5;
  x.fillText('總計', cols[0], ty); x.fillText('★ ' + T.stars + ' / 12', cols[1], ty); x.fillText('倒下 ' + T.deaths + ' 次', cols[2], ty); x.fillText(T.kills + ' 隻', cols[3], ty); x.fillText(T.score.toLocaleString(), cols[4], ty);
  // 左下小編、右下印章、日期
  const ph = IMG.p_hero; if (ph) { x.save(); x.beginPath(); x.arc(205, H - 175, 78, 0, 7); x.clip(); x.drawImage(ph, 127, H - 253, 156, 156 * ph.height / ph.width); x.restore(); x.strokeStyle = '#c9a227'; x.lineWidth = 6; x.beginPath(); x.arc(205, H - 175, 78, 0, 7); x.stroke(); }
  x.save(); x.translate(W - 230, H - 180); x.rotate(-0.12); x.strokeStyle = 'rgba(200,30,40,0.85)'; x.lineWidth = 8; x.beginPath(); x.arc(0, 0, 82, 0, 7); x.stroke(); x.lineWidth = 3; x.beginPath(); x.arc(0, 0, 68, 0, 7); x.stroke();
  x.fillStyle = 'rgba(200,30,40,0.85)'; x.textAlign = 'center'; x.font = `900 34px ${SERIF}`; x.fillText('清潔', 0, -20); x.fillText('認證', 0, 24); star(0, -58, 9, 'rgba(200,30,40,0.85)'); x.restore();
  x.fillStyle = '#3a2410'; x.textAlign = 'center'; x.font = `700 34px ${SERIF}`;
  x.fillText('小編出擊！清潔大隊 敬贈', W / 2, H - 190);
  x.fillText('中華民國 ' + (today.getFullYear() - 1911) + ' 年 ' + (today.getMonth() + 1) + ' 月 ' + today.getDate() + ' 日', W / 2, H - 135);
  return c;
}
function openCert() {
  G.mode = 'cert'; try { certName = localStorage.getItem('pbh_name') || ''; } catch (e) {}
  certCv = makeCert(certName);
  if (certUI) certUI.remove();
  const d = certUI = document.createElement('div');
  d.style.cssText = 'position:fixed;left:50%;bottom:10px;transform:translateX(-50%);z-index:20;display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:center;background:rgba(8,12,24,.85);border:3px solid #ffd65c;border-radius:14px;padding:8px 12px;font:700 16px "PingFang TC","Microsoft JhengHei",sans-serif;color:#fff;touch-action:manipulation';
  d.innerHTML = '<span>你的名字：</span><input id="cName" maxlength="12" placeholder="輸入名字" style="font:700 18px sans-serif;width:150px;padding:6px 8px;border-radius:8px;border:2px solid #ffd65c;touch-action:manipulation">' +
    '<button id="cMake" style="font:700 16px sans-serif;padding:8px 12px;border-radius:8px;border:0;background:#7dffa0;touch-action:manipulation">寫上名字</button>' +
    '<button id="cSave" style="font:700 16px sans-serif;padding:8px 12px;border-radius:8px;border:0;background:#ffd65c;touch-action:manipulation">下載獎狀</button>' +
    '<button id="cBack" style="font:700 16px sans-serif;padding:8px 12px;border-radius:8px;border:0;background:#cfd6e6;touch-action:manipulation">回標題</button>' +
    '<small style="width:100%;text-align:center;color:#ffe9a8;font-weight:500">也可以直接截圖保存喔！</small>';
  document.body.appendChild(d);
  const inp = d.querySelector('#cName'); inp.value = certName;
  ['touchstart', 'touchend', 'pointerdown'].forEach(n => d.addEventListener(n, e => e.stopPropagation(), { passive: true }));
  inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') d.querySelector('#cMake').click(); });
  d.querySelector('#cMake').onclick = () => { certName = inp.value.trim(); try { localStorage.setItem('pbh_name', certName); } catch (e) {} certCv = makeCert(certName); Audio8.sfx('select'); inp.blur(); };
  d.querySelector('#cSave').onclick = () => { certName = inp.value.trim() || certName; certCv = makeCert(certName); certCv.toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = '小編出擊_獎狀_' + (certName || '清潔英雄') + '.webp?v=11230002'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000); }, 'image/png'); Audio8.sfx('getweapon'); };
  d.querySelector('#cBack').onclick = () => { d.remove(); certUI = null; goTitle(); };
}
function drawCertScreen() {
  sctx.fillStyle = '#1b2440'; sctx.fillRect(0, 0, screen.width, screen.height);
  if (!certCv) return;
  const s = Math.min(screen.width / certCv.width, (screen.height - 52 * K) / certCv.height) * 0.98, w = certCv.width * s, h = certCv.height * s; // 底下留位置給名字輸入框
  sctx.imageSmoothingEnabled = true; sctx.drawImage(certCv, (screen.width - w) / 2, 4 * K, w, h); sctx.imageSmoothingEnabled = false;
}
function respawn() {
  const L = G.level, P = G.player;
  G.deaths++; G.deathsStage = (G.deathsStage || 0) + 1;
  const cp = G.checkpoint || G.start;
  if (G.boss) { G.boss = null; L.gateOpen = false; L.gateAnim = 0; }
  G.eshots = []; G.bullets = []; if (window.VFX) VFX.clear();
  G.enemies = G.enemies.filter(e => !(e.code === 's' && e.fromBoss));
  P.reset(cp.x, cp.y); G.camX = clamp(P.cx - 200, 0, camMax());
  G.mode = 'ready'; G.readyT = 0; P.frozen = true;
  run((function* () { yield 90; G.mode = 'play'; P.frozen = false; Audio8.music(L.def.music); })());
}
function camMax() { const L = G.level; return Math.min(L.w * TS - VW, L.gateX * TS + TS - VW + 8); }
function ultimate() {
  run((function* () {
    const prev = G.mode, P = G.player;
    G.mode = 'ultra'; G.ultraT = 0; P.frozen = true; G.ultra = 0;
    // ① 集氣：畫面變暗、小編微微浮起、背後 GPT 能量氣焰、光點往身上聚
    G.ultraAura = 1; Audio8.sfx('ultcharge');
    for (let i = 0; i < 60; i++) {
      G.dark = Math.min(0.85, i / 30); G.ultraLift = Math.min(6, i / 6);
      if (i % 2 === 0) { const a = rnd(0, 6.28), r = 56; G.parts.push({ x: P.cx + Math.cos(a) * r, y: P.cy + Math.sin(a) * r, vx: -Math.cos(a) * 2.4, vy: -Math.sin(a) * 2.4, life: 22, max: 22, c: i % 4 ? '#bff4ff' : '#ffe36a', s: 2.5, g: 0 }); }
      G.shake = i / 30; yield 1;
    }
    // ② 特寫切入（有 Grok 影片就播影片，否則用 GPT 特寫圖）
    const W = G.char === 'witch';
    G.cutin = W ? { t: 0, who: 'witch', name: '流星雨魔法！！', sub: '豪鬼主任 ─ 魔女奧義', dur: 80, color: '#ff9ae6', y: 96 } : { t: 0, who: 'hero', name: '全城大掃除！！', sub: '小編 ─ 清潔奧義', dur: 80, color: '#7fe6ff', y: 96 }; Audio8.sfx('cutin');
    yield () => G.cutin.t > 80; G.cutin = null;
    if (W) { yield* witchMeteorUlt(prev); return; }
    // ③ GPT 巨大水砲：從槍口延伸到畫面邊緣，沿路依序沖掉便便、打倒敵人
    G.mode = 'ultraFire'; G.flash = 12; G.shake = 14; Audio8.sfx('ultfire');
    const dir = P.face, gx = P.cx + dir * 18, gy = P.y + 10 - G.ultraLift;
    G.ultraBeam = { t: 0, x: gx, y: gy, dir };
    const onScreen = o => o.x > G.camX - 10 && o.x < G.camX + VW + 10;
    const targets = [
      ...G.items.filter(it => (it.type === 'poop' || it.type === 'big' || it.type === 'trash') && onScreen(it)).map(it => ({ k: 'item', o: it })),
      ...G.enemies.filter(onScreen).map(e => ({ k: 'enemy', o: e })),
    ].sort((a, b) => Math.abs(a.o.cx - P.cx) - Math.abs(b.o.cx - P.cx));
    let n = 0;
    const hit = tg => {
      const o = tg.o;
      if (tg.k === 'item') { if (o.dead) return; o.dead = true; n += o.type === 'big' ? 2 : 1; G.splashes.push({ x: o.cx, y: o.y + o.h, t: 0 }); sparks(o.cx, o.y, '#fff8a8', 6, 2, 0); Audio8.sfx('clean', 0.03); }
      else { o.damage(99, null); G.splashes.push({ x: o.cx, y: o.y + o.h, t: 0, big: true }); G.shake = 6; Audio8.sfx('explode', 0.06); }
    };
    for (let i = 0; i < 70; i++) {
      G.ultraBeam.t = i; G.shake = 4 + Math.sin(i) * 2; P.shootT = 8;
      const reach = Math.min(1, i / 12) * 420;
      while (targets.length && Math.abs(targets[0].o.cx - gx) < reach && (targets[0].o.cx - gx) * dir > -30) hit(targets.shift());
      if (G.boss && !G.boss.defeated && i === 20) { G.boss.inv = 0; G.boss.damage(8, null); G.splashes.push({ x: G.boss.cx, y: G.boss.y + G.boss.h, t: 0, big: true }); }
      yield 1;
    }
    G.ultraBeam = null;
    // ④ GPT 大海浪掃過整個畫面，把剩下的也沖乾淨
    Audio8.sfx('ultwave');
    G.ultraWave = { x: dir > 0 ? G.camX - 60 : G.camX + VW + 60, dir };
    for (let i = 0; i < 54; i++) {
      G.ultraWave.x += dir * 9.5;
      for (const tg of targets.slice()) if ((G.ultraWave.x - tg.o.cx) * dir > 0) { hit(tg); targets.splice(targets.indexOf(tg), 1); }
      if (i % 6 === 0) Audio8.sfx('clean', 0.02);
      yield 1;
    }
    G.ultraWave = null;
    if (n) { G.clean += n; G.score += 80 * n; G.ammoGain(n); floatText(P.cx, P.y - 30, `一口氣清掉 ${n} 個！`, '#ffe36a', true); }
    // ⑤ 收尾：閃光＋蓋章
    G.flash = 10; G.ultraStamp = 70; Audio8.sfx('stomp'); G.ultraAura = 0;
    for (let i = 0; i < 20; i++) { G.dark = Math.max(0, 0.85 - i / 20); G.ultraLift = Math.max(0, 6 - i / 3); yield 1; }
    yield 40;
    G.dark = 0; G.heroGlow = 0; G.ultraLift = 0;
    P.frozen = false; if (G.mode === 'ultraFire') G.mode = prev === 'boss' ? 'boss' : 'play';
  })());
}
// 豪鬼主任的大絕招：流星雨（先出現鎖定標記，再一顆一顆砸下來，清光畫面上的小怪和便便）
function* witchMeteorUlt(prev) {
  const P = G.player;
  G.mode = 'ultraFire'; G.flash = 10; Audio8.sfx('magic');
  const onScreen = o => o.x > G.camX - 10 && o.x < G.camX + VW + 10;
  const targets = [
    ...G.items.filter(it => (it.type === 'poop' || it.type === 'big' || it.type === 'trash') && onScreen(it)).map(it => ({ k: 'item', o: it })),
    ...G.enemies.filter(onScreen).map(e => ({ k: 'enemy', o: e })),
  ];
  let n = 0;
  const hit = tg => {
    const o = tg.o; if (o.dead) return;
    if (tg.k === 'item') { o.dead = true; n += o.type === 'big' ? 2 : 1; sparks(o.cx, o.y, '#ffd0f2', 6, 2, 0); Audio8.sfx('clean', 0.03); }
    else { o.damage(99, null); G.shake = 6; }
  };
  // 落點：每個目標附近一顆，其餘平均灑滿畫面；魔王頭上一定有一顆
  const fy = G.boss ? G.boss.floorY : 176;
  const xs = targets.map(t => t.o.cx);
  for (let i = 0; i < 6; i++) xs.push(G.camX + 30 + i * (VW - 60) / 5 + rnd(-12, 12));
  if (G.boss && !G.boss.defeated) xs.push(G.boss.cx, G.boss.cx);
  xs.sort(() => Math.random() - 0.5);
  const rain = xs.slice(0, 16).map((x, i) => ({ x, t0: i * 7 }));
  const end = rain[rain.length - 1].t0 + 50;
  for (let t = 0; t <= end; t++) {
    for (const m of rain) {
      if (t === m.t0) FX('warn', m.x, fy, { opts: { size: 1 } });
      if (t === m.t0 + 18) FX('meteor', m.x, fy, { opts: { size: 0.6 }, fall: 16 });
      if (t === m.t0 + 34) {
        G.shake = 8; G.flash = 2; Audio8.sfx('explode', 0.04);
        for (const tg of targets) if (Math.abs(tg.o.cx - m.x) < 40) hit(tg);
        if (G.boss && !G.boss.defeated && Math.abs(G.boss.cx - m.x) < 50) { G.boss.inv = 0; G.boss.damage(4, null); }
      }
    }
    P.shootT = 8; yield 1;
  }
  for (const tg of targets) hit(tg); // 剩下的也一起清掉
  if (n) { G.clean += n; G.score += 80 * n; G.ammoGain(n); floatText(P.cx, P.y - 30, `一口氣清掉 ${n} 個！`, '#ffd0f2', true); }
  G.flash = 10; G.ultraStamp = 70; Audio8.sfx('stomp'); G.ultraAura = 0;
  for (let i = 0; i < 20; i++) { G.dark = Math.max(0, 0.85 - i / 20); G.ultraLift = Math.max(0, 6 - i / 3); yield 1; }
  yield 40;
  G.dark = 0; G.heroGlow = 0; G.ultraLift = 0;
  P.frozen = false; if (G.mode === 'ultraFire') G.mode = prev === 'boss' ? 'boss' : 'play';
}

// ---------- 更新 ----------
function update() {
  G.t++;
  pollInput();
  const I = G.input;
  if (toastMsg && --toastMsg.t <= 0) toastMsg = null;
  if (window.VFX) VFX.update(1 / 60);
  // 對話推進
  if (G.dialog) {
    const d = G.dialog; d.t++;
    const prevShown = Math.floor(d.shown);
    d.shown = Math.min(d.text.length, d.shown + (I.held.shoot || I.held.jump ? 0.9 : 0.55));
    if (Math.floor(d.shown) !== prevShown && !/[\s，。、！？…（）「」]/.test(d.text[Math.floor(d.shown) - 1] || '')) Audio8.sfx('blip', 0.04);
    if (I.pressed.ok && d.t > 8) { if (d.shown < d.text.length) d.shown = d.text.length; else { G.dialog = null; Audio8.sfx('cursor'); } }
  }
  stepScript();
  switch (G.mode) {
    case 'boot': if (loadProgress() >= 1 && loadShown > 0.98) { goTitle(); if (SECRET) enterLoop2(); } break; // 全部讀完就直接進開始畫面
    case 'lazy': if (loop2Progress() >= 1 && loadShown > 0.98) goSelect(2); break; // 二周目資源讀完 → 選關
    case 'title': {
      const opts = titleOptions();
      if (I.pressed.up) { G.menu = (G.menu + opts.length - 1) % opts.length; Audio8.sfx('cursor'); }
      if (I.pressed.down) { G.menu = (G.menu + 1) % opts.length; Audio8.sfx('cursor'); }
      if (I.pressed.ok) { Audio8.sfx('select'); opts[G.menu][1](); }
      break;
    }
    case 'help': if (I.pressed.ok) { G.mode = 'title'; Audio8.sfx('cursor'); } break;
    case 'select': {
      const o = loopOff();
      if (G.sel < 3) {
        if (I.pressed.left) { G.sel = (G.sel + 2) % 3; Audio8.sfx('cursor'); }
        if (I.pressed.right) { G.sel = (G.sel + 1) % 3; Audio8.sfx('cursor'); }
        if (I.pressed.down) { G.sel = 3; Audio8.sfx('cursor'); }
      } else if (I.pressed.up || I.pressed.left || I.pressed.right) { G.sel = 1; Audio8.sfx('cursor'); }
      if (I.pressed.ok) { if (stageUnlocked(o + G.sel + 1)) startStage(o + G.sel + 1); else { Audio8.sfx('hurt'); toast(o ? '最終關：要先打倒三個怪人才能挑戰！' : '最終關：要先打倒三個魔王才能挑戰！'); } }
      if (o && I.pressed.dash) { // 二周目：按「衝」直接換角色，換完講一句話
        G.char = save.char = G.char === 'witch' ? 'hero' : 'witch'; writeSave(); startLoop2Load(); syncAbilities();
        const q = G.char === 'witch' ? CHAR_SWAP_LINES.witch : CHAR_SWAP_LINES.hero;
        G.charSay = { text: q[Math.floor(rnd(0, q.length))], t0: G.t, sel: G.sel }; G.charSwapT = G.t; Audio8.sfx('warp'); Audio8.sfx('select');
      }
      else if (I.pressed.dash || (o && I.pressed.swap)) { goTitle(); }
      break;
    }
    case 'stageCard': { G.cardT++; const t = G.cardT, D = LEVEL_DATA[G.cardStage - 1];
      if (t === 9) Audio8.sfx('cutin'); if (t === 32) { Audio8.sfx('stomp'); } if (t === 45) Audio8.sfx('magic');
      if (t > 64 && (t - 64) % 5 === 0 && (t - 64) / 5 <= D.bossName.length) Audio8.sfx('blip'); if (t === 64 + D.bossName.length * 5 + 6) Audio8.sfx('select');
      break; }
    case 'ready': G.readyT++; worldUpdate(true); break;
    case 'play': case 'boss':
      if (I.pressed.start && !G.dialog && !script) { G.prevPlay = G.mode; G.mode = 'pause'; G.pauseSel = 0; Audio8.sfx('pause'); break; }
      if (I.pressed.ult && G.ultra >= 100 && !G.player.dead && !G.dialog && !script) { ultimate(); break; }
      if (I.pressed.swap && G.weapons.length > 1) {
        const i = (G.weapons.indexOf(G.weapon) + 1) % G.weapons.length; G.weapon = G.weapons[i];
        Audio8.sfx('cursor'); G.swapT = 60;
      }
      worldUpdate(false);
      break;
    case 'pause': {
      const opts = ['繼續遊戲', '回到關卡選擇', '音樂／音效 開關', '特效品質切換'];
      if (I.pressed.up) { G.pauseSel = (G.pauseSel + 3) % 4; Audio8.sfx('cursor'); }
      if (I.pressed.down) { G.pauseSel = (G.pauseSel + 1) % 4; Audio8.sfx('cursor'); }
      if (I.pressed.start) G.mode = G.prevPlay || 'play';
      else if (I.pressed.jump || I.pressed.shoot) {
        Audio8.sfx('select');
        if (G.pauseSel === 0) G.mode = G.prevPlay || 'play';
        else if (G.pauseSel === 1) { script = null; G.dialog = null; goSelect(); }
        else if (G.pauseSel === 2) Audio8.toggleMute();
        else G.lowFx = !G.lowFx;
      }
      break;
    }
    case 'gate': case 'bossIntro': case 'bossDown': case 'absorb': case 'ultra': case 'ultraFire': case 'npcTalk':
      worldUpdate(true); break;
    case 'getAbility': G.getT++; break;
    case 'ending': G.endT++; break;
    case 'slogan': G.slT++; G.endT++; break;
    case 'credits': G.credT++; break;
  }
}
function titleOptions() {
  const o = [], loop1 = save.cleared.includes(4) || QS.has('all') || SECRET;
  if (save.cleared.some(n => n <= 4)) o.push(['繼續（關卡選擇）', () => goSelect(1)]);
  if (loop1) o.push(['★ 二周目（怪人篇）', () => enterLoop2()]);
  o.push(['開始新遊戲', () => { const keep = { char: save.char, hard: save.hard }; save = { cleared: [], stats: {}, ...keep }; writeSave(); syncAbilities(); G.deaths = 0; goSelect(1); }]);
  if (loop1) o.push(['二周目角色：' + (save.char === 'witch' ? '豪鬼主任' : '小編'), () => { save.char = save.char === 'witch' ? 'hero' : 'witch'; writeSave(); if (save.char === 'witch') { startLoop2Load(); toast('豪鬼主任：空中連點「跳」飛行，自動滑翔，絕招＝流星雨！'); } }]);
  o.push(['難度：' + (G.hard ? '困難' : '普通'), () => { G.hard = save.hard = !G.hard; writeSave(); }]);
  o.push(['操作說明', () => { G.mode = 'help'; }]);
  return o;
}
// 洛克人式選關：1~3 關任意順序；最終關要三個魔王都打倒才開
// 二周目（5~8）：一周目破關後開放；最終關（8）要先打倒三個怪人
function stageUnlocked(n) {
  if (QS.has('all') || SECRET) return true;
  if (n <= 3) return true;
  if (n === 4) return [1, 2, 3].every(i => save.cleared.includes(i));
  if (n <= 7) return true; // 二周目三個怪人隨時都能打（能進二周目選關就代表已開放）；只有怪獸社長要先打倒三個怪人
  return [5, 6, 7].every(i => save.cleared.includes(i));
}
function loopOff() { return G.loop === 2 ? 4 : 0; }

function worldUpdate(cutscene) {
  const L = G.level, P = G.player; if (!L) return;
  G.time++;
  updateYoku();
  const frozenWorld = G.mode === 'ultra' || G.mode === 'npcTalk' && G.dialog;
  for (const p of G.platforms) p.update();
  if (!frozenWorld) P.update();
  if (P.dead) {
    if (P.deadT === 150) respawn();
  }
  // 鏡頭
  if (G.mode === 'play' || G.mode === 'ready' || G.mode === 'npcTalk') {
    const tgt = clamp(P.cx - 200 + P.face * 24, 0, camMax());
    G.camX += (tgt - G.camX) * 0.12;
    if (Math.abs(tgt - G.camX) < 0.3) G.camX = tgt;
  }
  if (G.mode === 'boss' || G.mode === 'bossIntro' || G.mode === 'bossDown' || G.mode === 'absorb') { G.camX = L.gateX * TS; P.x = clamp(P.x, L.arena.x0, L.arena.x1 - P.w); }
  if (!frozenWorld) {
    for (const b of G.bullets) b.update();
    for (const it of G.items) it.update();
    if (!cutscene || G.mode === 'ultraFire' || G.mode === 'ready') for (const e of G.enemies) if (Math.abs(e.cx - G.camX - 200) < 280 || e.state === 'tamed') e.update();
    for (const n of G.npcs) n.update();
    if (G.boss) { if (G.mode === 'boss' || G.boss.defeated) G.boss.update(); }
    for (const s of G.eshots) s.update();
    // 子彈命中
    for (const b of G.bullets) {
      if (b.dead) continue;
      // 便便在地上很矮：命中範圍往上延伸 26px，水柱從上面飛過也能沖到
      for (const it of G.items) if (!it.dead && (it.type === 'poop' || it.type === 'big') && overlap(b, { x: it.x - 2, y: it.y - 26, w: it.w + 4, h: it.h + 26 })) { it.washed(b); if (b.dead) break; }
      if (b.dead) continue;
      for (const e of G.enemies) if (!e.dead && e.state !== 'tamed' && e.state !== 'sorry' && !e.invuln && overlap(b, e) && b.hitEnemy(e)) { e.damage(b.dmg, b); if (e.hp <= 0) G.ultra = Math.min(100, G.ultra + 5); if (b.dead) break; }
      if (!b.dead && G.boss && !G.boss.defeated && G.mode === 'boss') {
        const bx = G.boss.hitbox();
        if (G.boss.dog && overlap(b, G.boss.dog) && b.hitEnemy(G.boss.dog)) G.boss.damage(0, b);
        else if (overlap(b, bx) && b.hitEnemy(G.boss)) { if (!G.boss.damage(b.dmg, b)) { Audio8.sfx('clink'); } }
      }
      for (const s of G.eshots) if (!s.dead && b.big && (s.type === 'paper' || s.type === 'bag' || s.type === 'ball' || s.type === 'star') && overlap(b, s)) { s.dead = true; sparks(s.cx, s.y, '#fff', 5); }
    }
    // NPC 對話
    if (G.mode === 'play' && !G.dialog && !script) for (const n of G.npcs) if (n.near && (G.input.pressed.up || !n.talked && n.data.auto)) {
      n.talked = true; G.talkTarget = n;
      run((function* () { G.mode = 'npcTalk'; P.frozen = true; P.vx = 0; yield* talk(n.data.lines); P.frozen = false; G.mode = 'play'; G.talkTarget = null; })());
      break;
    }
    // 第一位 NPC 自動開口
    if (G.mode === 'play' && !script && G.npcs[0] && !G.npcs[0].talked && Math.abs(P.cx - G.npcs[0].cx) < 50) {
      const n = G.npcs[0]; n.talked = true; G.talkTarget = n;
      run((function* () { G.mode = 'npcTalk'; P.frozen = true; P.vx = 0; yield* talk(n.data.lines); P.frozen = false; G.mode = 'play'; G.talkTarget = null; })());
    }
    // 魔王門
    if (G.mode === 'play' && !script && !P.dead && L.gateX && P.x + P.w >= L.gateX * TS - 2 && P.y > 7 * TS) {
      if (G.clean >= L.req) run(bossSequence());
      else if (!G.gateMsgT || G.t - G.gateMsgT > 90) { G.gateMsgT = G.t; Audio8.sfx('clink'); toast(`清潔度不足！需要 ${Math.ceil(L.req / L.total * 100)}%（目前 ${Math.floor(G.clean / L.total * 100)}%）回去打掃吧！`); P.x -= 6; }
    }
  }
  // 清理
  G.bullets = G.bullets.filter(b => !b.dead);
  G.items = G.items.filter(i => !i.dead);
  G.enemies = G.enemies.filter(e => !e.dead);
  G.eshots = G.eshots.filter(e => !e.dead);
  // 粒子
  const P2 = G.player;
  for (const p of G.parts) {
    if (p.delay > 0) { p.delay--; continue; }
    if (p.home) { const dx = P2.cx - p.x, dy = P2.cy - p.y, d = Math.hypot(dx, dy) || 1; p.vx += dx / d * 0.5; p.vy += dy / d * 0.5; p.vx *= 0.92; p.vy *= 0.92; if (d < 8) { p.life = 0; Audio8.sfx('blip', 0.08); } }
    p.x += p.vx; p.y += p.vy; p.vy += p.g || 0; p.life--;
    if (p.bubble) p.vx += Math.sin(p.life / 3) * 0.05;
  }
  G.parts = G.parts.filter(p => p.life > 0);
  if (G.parts.length > 600) G.parts.splice(0, G.parts.length - 600);
  for (const s of G.splashes) s.t++;
  G.splashes = G.splashes.filter(s => s.t < 16);
  for (const t of G.texts) { t.y -= 0.4; t.life--; }
  G.texts = G.texts.filter(t => t.life > 0);
  if (G.shake > 0) G.shake *= 0.85; if (G.shake < 0.3) G.shake = 0;
  if (G.flash > 0) G.flash--;
  if (G.heroGlow > 0) G.heroGlow--;
  if (G.warnT > 0) G.warnT--;
  if (G.cutin) G.cutin.t++;
  if (G.curTip) G.curTip.t++;
  if (G.level) { updateRescue(); updateCameo(); updateMumble(); if (typeof updateIntruder === 'function') updateIntruder(); }
}

// ---------- 繪製：世界 ----------
function drawBackground() {
  const L = G.level, D = L.def, cam = G.camX;
  const gr = ctx.createLinearGradient(0, 0, 0, VH); gr.addColorStop(0, D.sky[0]); gr.addColorStop(1, D.sky[1]);
  ctx.fillStyle = gr; ctx.fillRect(0, 0, VW, VH);
  const bg = (G.boss && D.bossBg && IMG[D.bossBg]) || IMG[D.bg], fx25 = !G.lowFx; // 魔王房間可以有自己的背景（怪獸基地內部）
  if (bg) {
    // 遠景：景深模糊＋輕微放大（2.5D 景深感）
    if (fx25) ctx.filter = 'blur(3px) brightness(0.78) saturate(0.85)';
    const h = 262, w = Math.round(bg.width * h / bg.height), off = Math.floor(cam * 0.15) % w;
    for (let x = -off - 4; x < VW; x += w) ctx.drawImage(bg, x, -22, w, h);
    ctx.filter = 'none';
  }
  // GPT 中景（填滿遠景與地面之間）：視差 0.6、輕微景深
  const mg = MIDIMG[L.theme];
  if (mg) {
    // 中景往後退：較暗、較低飽和、模糊（角色層才會清楚）
    const dim = { 1: 'brightness(0.72) saturate(0.75)', 2: 'brightness(0.52) saturate(0.6)', 3: 'brightness(0.6) saturate(0.7)', 4: 'brightness(0.6) saturate(0.7)' }[L.theme];
    ctx.filter = (fx25 ? 'blur(1.4px) ' : '') + dim;
    const h = 92, w = Math.round(mg.width * h / mg.height), off = Math.floor(cam * 0.6) % w;
    for (let x = -off - 1; x < VW; x += w - 1) ctx.drawImage(mg, x, 178 - h, w, h);
    ctx.filter = 'none';
    const sep = ctx.createLinearGradient(0, 120, 0, 178); sep.addColorStop(0, 'rgba(10,8,20,0)'); sep.addColorStop(1, 'rgba(10,8,20,0.45)');
    ctx.fillStyle = sep; ctx.fillRect(0, 120, VW, 58);
    return;
  }
  if (fx25) ctx.filter = 'blur(1px)';
  // 中景（視差 0.5）
  const mid = cam * 0.5, th = L.theme;
  if (th === 1) {
    for (let i = -1; i < 9; i++) { const x = i * 64 - (mid % 64); ctx.fillStyle = '#2f6b3c'; ctx.beginPath(); ctx.ellipse(x + 32, 168, 40, 18, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#3f8a4c'; ctx.beginPath(); ctx.ellipse(x + 26, 164, 22, 10, 0, 0, 7); ctx.fill(); }
    for (let i = -1; i < 6; i++) { const x = i * 96 - (mid % 96) + 40; ctx.fillStyle = '#1e2a3a'; ctx.fillRect(x, 120, 3, 56); ctx.fillRect(x - 4, 118, 11, 4); ctx.fillStyle = '#fff3b0'; ctx.fillRect(x - 3, 122, 9, 3); }
  } else if (th === 2) {
    for (let i = -1; i < 12; i++) { const x = i * 40 - ((cam * 0.6) % 40); const y = 34 + Math.sin((i + Math.floor(cam * 0.6 / 40)) * 1.3) * 3; ctx.fillStyle = '#16111f'; ctx.fillRect(x + 18, y - 1, 8, 11); ctx.fillStyle = (G.t >> 4) % 2 && i % 3 === 0 ? '#ff8a6a' : '#e8312a'; ctx.fillRect(x + 19, y, 6, 9); ctx.fillStyle = '#ffd23f'; ctx.fillRect(x + 21, y + 9, 2, 2); }
    ctx.strokeStyle = '#16111f'; ctx.beginPath(); for (let x = 0; x <= VW; x += 8) ctx.lineTo(x, 34 + Math.sin((x + cam * 0.6) / 40 * 1.3) * 3); ctx.stroke();
    for (let i = -1; i < 7; i++) { const x = i * 80 - (mid % 80); ctx.fillStyle = '#2a1a3e'; ctx.fillRect(x, 140, 60, 36); ctx.fillStyle = i % 2 ? '#ff5a8a' : '#3fd0ff'; ctx.fillRect(x, 136, 60, 6); ctx.fillStyle = '#ffd98a'; ctx.globalAlpha = 0.5; ctx.fillRect(x + 6, 146, 48, 10); ctx.globalAlpha = 1; }
  } else if (th === 3) {
    for (let i = -1; i < 6; i++) { const x = i * 100 - (mid % 100); ctx.fillStyle = '#26301f'; ctx.fillRect(x, 20, 100, 10); ctx.fillStyle = '#3a4a2c'; ctx.fillRect(x, 22, 100, 3); ctx.fillStyle = '#1a2216'; ctx.fillRect(x + 90, 16, 8, 18); }
    for (let i = 0; i < 6; i++) { const x = (i * 71 - mid * 0.8) % VW; const xx = x < 0 ? x + VW : x; const dy = (G.t * 1.5 + i * 37) % 150; ctx.fillStyle = '#9fdc6a'; ctx.fillRect(Math.round(xx), 30 + dy, 1, 3); }
    ctx.fillStyle = 'rgba(140,200,90,0.08)'; ctx.fillRect(0, 140 + Math.sin(G.t / 40) * 4, VW, 40);
  } else if (th === 4) {
    for (let i = 0; i < 30; i++) { const x = (i * 97 + 13) % VW, y = (i * 53) % 110; if ((G.t + i * 13) % 90 < 60) { ctx.fillStyle = '#fff'; ctx.fillRect(x, y, 1, 1); if ((G.t + i * 13) % 90 < 10) { ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); } } }
    for (let i = -1; i < 10; i++) { const x = i * 48 - (mid % 48); ctx.fillStyle = '#2b2f55'; ctx.fillRect(x, 160, 2, 16); ctx.fillRect(x, 160, 48, 2); ctx.fillRect(x + 24, 162, 2, 14); }
  }
  ctx.filter = 'none';
  if (fx25) drawFloor25(L, cam);
}
// 2.5D 透視地板：地面往畫面深處延伸（Mode-7 掃描線）
const floorPat = {};
function drawFloor25(L, cam) {
  const th = L.theme, key = th;
  let p = floorPat[key];
  if (!p) {
    const s = SPR.f[`t${th}f`], g = SPR.f[`t${th}g`]; if (!s || !g) return;
    const c = PX.canvas(32, 32), x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    // 用地表（草／磚）上緣當地板材質
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) x.drawImage(g.img, 0, 0, g.img.width, g.img.height * 0.45, i * 16, j * 16, 16, 16);
    p = floorPat[key] = ctx.createPattern(c, 'repeat');
  }
  const hz = 112, y0 = 146, y1 = 176;
  for (let y = y0; y < y1; y++) {
    const d = y - hz, s = d / (y1 - hz), row = (900 / d) % 16;
    p.setTransform(new DOMMatrix().translate(VW / 2 - (cam + VW / 2) * s, y - row * s).scale(s, s));
    ctx.fillStyle = p; ctx.fillRect(0, y, VW, 1);
  }
  // 遠處霧化
  const fog = ctx.createLinearGradient(0, y0, 0, y1); fog.addColorStop(0, L.def.sky[1]); fog.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.75; ctx.fillStyle = fog; ctx.fillRect(0, y0, VW, y1 - y0); ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, y1 - 2, VW, 2);
}
// 2.5D 方塊頂面：地表／平台往後延伸的頂面，會依畫面位置朝消失點傾斜
function drawTopFaces(L, cam) {
  const th = L.theme, x0 = Math.floor(cam / TS), x1 = Math.min(L.w - 1, x0 + 26), D = 6;
  const top = { 1: ['#7ed36a', '#5aa84c'], 2: ['#c96a52', '#9c4a38'], 3: ['#78a05c', '#557a42'], 4: ['#b8c2d8', '#8a96b0'] }[th];
  for (let ty = 1; ty < L.h; ty++) for (let tx = x0; tx <= x1; tx++) {
    const c = L.t[ty][tx]; if (!'#=-^'.includes(c)) continue;
    const above = L.t[ty - 1][tx]; if ('#=^G'.includes(above)) continue;
    const x = tx * TS - cam, y = ty * TS + (c === '^' ? 4 : 0);
    const k = 0.05, dxL = (x - VW / 2) * k, dxR = (x + TS - VW / 2) * k;
    ctx.fillStyle = top[(tx + ty) % 2]; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + TS, y); ctx.lineTo(x + TS - dxR * D / TS, y - D); ctx.lineTo(x - dxL * D / TS, y - D); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(x - dxL * D / TS, y - D, TS, 1);
  }
}
// 角色腳下影子
function shadowAt(o, cam, w) {
  if (!o || o.dead) return;
  let fy = null; const tx = Math.floor((o.x + o.w / 2) / TS);
  for (let ty = Math.floor((o.y + o.h) / TS); ty < G.level.h; ty++) if (isSolid(tx, ty) || isOneWay(tx, ty)) { fy = ty * TS; break; }
  if (fy == null) return;
  const dist = fy - (o.y + o.h), k = Math.max(0.3, 1 - dist / 90);
  ctx.fillStyle = `rgba(0,0,0,${0.32 * k})`; ctx.beginPath(); ctx.ellipse(o.x + o.w / 2 - cam, fy - 1, (w || o.w * 0.8) * k, 3 * k, 0, 0, 7); ctx.fill();
}
function drawTiles() {
  const L = G.level, th = L.theme, S = PX.S, cam = Math.floor(G.camX);
  const x0 = Math.floor(cam / TS), x1 = Math.min(L.w - 1, x0 + 26);
  // 掉落洞口：畫成深淵（中景底下不再露出遠景），兩側加土壁陰影
  const pitTop = { 1: ['#3a2614', '#0a0604'], 2: ['#2a1d2e', '#05030a'], 3: ['#2c4a1e', '#061006'], 4: ['#1c1f3a', '#020208'] }[th];
  const pitAt = tx => tx >= 0 && tx < L.w && (L.t[L.h - 1][tx] === '.' || L.t[L.h - 1][tx] === 'Y');
  for (let tx = x0 - 1; tx <= x1; tx++) {
    if (!pitAt(tx) || pitAt(tx - 1) && tx > x0 - 1) continue;
    let e = tx; while (pitAt(e + 1)) e++;
    let s0 = tx; while (pitAt(s0 - 1)) s0--; // 用整個斷層的真正寬度，捲動時圖不會被擠壓變形
    const x = s0 * TS - cam, w = (e - s0 + 1) * TS, top = 11 * TS - 4, pi = PITIMG[th];
    if (pi) { const pad = 8; ctx.fillStyle = '#050307'; ctx.fillRect(x, top + 6, w, VH - top); ctx.drawImage(pi, x - pad, top, w + pad * 2, VH - top + 4); }
    else { const gr = ctx.createLinearGradient(0, top, 0, VH); gr.addColorStop(0, pitTop[0]); gr.addColorStop(0.35, pitTop[1]); gr.addColorStop(1, '#000'); ctx.fillStyle = gr; ctx.fillRect(x, top, w, VH - top); }
    if (th === 3) { ctx.fillStyle = 'rgba(120,210,60,0.45)'; ctx.fillRect(x, VH - 10 + Math.sin((G.t + tx * 9) / 14) * 1.5, w, 10); }
    tx = e;
  }
  for (let ty = 0; ty < L.h; ty++) for (let tx = x0; tx <= x1; tx++) {
    const c = L.t[ty][tx]; if (c === '.') continue;
    const x = tx * TS - cam, y = ty * TS, v = Math.floor(PX.hash(tx, ty) * 4);
    // GPT 生成的圖塊優先
    const T = (n) => SPR.f[`t${th}${n}`];
    const tImg = (n, yy = y + TS) => { const s = T(n); if (!s) return false; ctx.drawImage(s.img, x, yy - s.h, TS, s.h); return true; };
    if (T('g')) {
      if (c === '#') { const above = ty > 0 ? L.t[ty - 1][tx] : '.'; tImg(above === '#' || above === '^' || above === 'G' ? 'f' : 'g'); continue; }
      if (c === '=') { tImg('b'); continue; }
      if (c === '-') { tImg('o'); continue; }
      if (c === 'H') { tImg('l'); continue; }
      if (c === '^') { tImg('f'); tImg('s', y + 4); continue; }
    }
    if (c === '#') { const above = ty > 0 ? L.t[ty - 1][tx] : '.'; ctx.drawImage(S[`t${th}_${above === '#' || above === '^' || above === 'G' ? 'fill' : 'ground'}_${v}`], x, y); }
    else if (c === '=') ctx.drawImage(S[`t${th}_block`], x, y);
    else if (c === '-') ctx.drawImage(S[`t${th}_oneway`], x, y);
    else if (c === 'H') ctx.drawImage(S[`t${th}_ladder`], x, y);
    else if (c === '^') { ctx.drawImage(S[`t${th}_fill_${v}`], x, y); ctx.drawImage(S[`t${th}_spike`], x, y - 8); }
    else if (c === 'Y') {
      const g = L.yoku.find(g => g.y === ty && tx >= g.x1 && tx <= g.x2);
      if (g && g.on) { if (g.age < 8) { ctx.globalAlpha = g.age / 8; } if (g.age > 145 && (g.age >> 1) % 2) ctx.globalAlpha = 0.4; ctx.drawImage(S[`t${th}_yoku`], x, y); ctx.globalAlpha = 1; }
      else { ctx.strokeStyle = 'rgba(86,240,224,0.25)'; ctx.strokeRect(x + 0.5, y + 0.5, 15, 15); }
    }
    else if (c === 'G') {
      // 洛克人式魔王門：一條一條橫向鐵捲門，開門時由下往上一條條收起
      if (ty > 0 && L.t[ty - 1][tx] === 'G') continue;
      let n = 0; while (ty + n < L.h && L.t[ty + n][tx] === 'G') n++;
      const H = n * TS, slatH = 4, slats = Math.floor(H / slatH), shown = Math.round(slats * (1 - L.gateAnim));
      ctx.fillStyle = '#0d0a14'; ctx.fillRect(x, y, TS, H);
      for (let i = 0; i < shown; i++) {
        const sy = y + i * slatH;
        ctx.fillStyle = '#5c6478'; ctx.fillRect(x + 1, sy, TS - 2, slatH);
        ctx.fillStyle = '#b8c0d4'; ctx.fillRect(x + 1, sy, TS - 2, 1);
        ctx.fillStyle = '#8a93a8'; ctx.fillRect(x + 1, sy + 1, TS - 2, 1);
        ctx.fillStyle = '#2a2f3c'; ctx.fillRect(x + 1, sy + slatH - 1, TS - 2, 1);
      }
      ctx.fillStyle = '#2a2f3c'; ctx.fillRect(x, y, 2, H); ctx.fillRect(x + TS - 2, y, 2, H);
      ctx.fillStyle = '#9aa3b8'; ctx.fillRect(x, y, 1, H); ctx.fillRect(x + TS - 2, y, 1, H);
      ctx.fillStyle = '#3a4050'; ctx.fillRect(x - 1, y - 3, TS + 2, 3); ctx.fillStyle = '#c9ced8'; ctx.fillRect(x - 1, y - 3, TS + 2, 1);
    }
  }
}
function drawWorld() {
  ctx.setTransform(RS, 0, 0, RS, 0, 0); ctx.imageSmoothingEnabled = false;
  const cam = Math.floor(G.camX);
  drawBackground(); drawCameo(cam, true); drawTiles();
  if (!G.lowFx) { shadowAt(G.player, cam, 9); for (const e of G.enemies) if (Math.abs(e.x - cam - 200) < 240 && !e.fly) shadowAt(e, cam); if (G.boss) shadowAt(G.boss, cam, G.boss.w * 0.6); for (const n of G.npcs) shadowAt(n, cam, 8); }
  for (const it of G.items) if (Math.abs(it.x - cam - 200) < 230) it.draw(ctx, cam);
  for (const p of G.platforms) p.draw(ctx, cam);
  for (const n of G.npcs) if (Math.abs(n.x - cam - 200) < 230) n.draw(ctx, cam);
  for (const e of G.enemies) if (Math.abs(e.x - cam - 200) < 240) e.draw(ctx, cam);
  if (G.boss) G.boss.draw(ctx, cam);
  drawCameo(cam, false); if (typeof drawIntruder === 'function') drawIntruder(cam); drawRescue(cam);
  // 變暗（絕招／魔王出場）：放在主角與特效之前，讓主角與特效保持明亮
  if (G.dark > 0) { ctx.fillStyle = `rgba(10,0,20,${G.dark * 0.6})`; ctx.fillRect(0, 0, VW, VH); }
  if (window.VFX && !G.lowFx) VFX.draw(ctx, cam, 0, 'back');
  // 主角發光（吸收能力）
  if (G.heroGlow > 0) { const P = G.player; ctx.globalAlpha = 0.35 + Math.sin(G.t / 3) * 0.2; ctx.fillStyle = G.ultraCharge || G.mode === 'ultraFire' ? '#7fe6ff' : STAGE_WEAPON[G.stage] ? WEAPONS[STAGE_WEAPON[G.stage]].color : '#fff'; ctx.beginPath(); ctx.arc(P.cx - cam, P.cy, 22 + Math.sin(G.t / 4) * 4, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
  // 絕招：GPT 能量氣焰（主角背後）
  const P0 = G.player, S0 = SPR.f;
  if (G.ultraAura && S0.fx_aura) { const a = S0.fx_aura, k = 1 + Math.sin(G.t / 3) * 0.06, w = a.w * k, h = a.h * k; ctx.globalAlpha = 0.75 + Math.sin(G.t / 2) * 0.2; ctx.drawImage(a.img, P0.cx - cam - w / 2, P0.y + P0.h - (G.ultraLift || 0) - h + 6, w, h); ctx.globalAlpha = 1; }
  G.player.draw(ctx, cam);
  // 絕招：GPT 巨大水砲
  if (G.ultraBeam && S0.fx_beam) {
    const b = G.ultraBeam, s = S0.fx_beam, L = Math.min(1, b.t / 12) * 420, h = s.h * Math.min(1, b.t / 6) * (1 + Math.sin(b.t * 0.9) * 0.08) * (b.t > 60 ? (70 - b.t) / 10 : 1);
    ctx.save(); ctx.translate(b.x - cam, b.y); ctx.scale(b.dir, 1);
    ctx.drawImage(s.img, 0, 0, s.img.width * (L / 400), s.img.height, 0, -h / 2, L, h);
    if (b.t % 4 < 2) { ctx.globalAlpha = 0.35; ctx.fillStyle = '#fff'; ctx.fillRect(0, -h * 0.12, L, h * 0.24); }
    ctx.restore(); ctx.globalAlpha = 1;
  }
  // 絕招：GPT 大海浪
  if (G.ultraWave && S0.fx_wave) { const s = S0.fx_wave; ctx.save(); ctx.translate(G.ultraWave.x - cam, 177); ctx.scale(G.ultraWave.dir, 1); ctx.drawImage(s.img, -s.w * 0.7, -s.h, s.w, s.h); ctx.restore(); }
  // GPT 水花爆散
  for (const sp of G.splashes) { const f = S0['sp' + Math.min(3, sp.t >> 2)]; if (f) { const k = sp.big ? 1.5 : 1; ctx.drawImage(f.img, sp.x - cam - f.w * k / 2, sp.y - f.h * k, f.w * k, f.h * k); } }
  for (const b of G.bullets) b.draw(ctx, cam);
  for (const s of G.eshots) s.draw(ctx, cam);
  for (const p of G.parts) {
    if (p.delay > 0) continue;
    const a = Math.min(1, p.life / (p.max * 0.5)); ctx.globalAlpha = a; ctx.fillStyle = p.c;
    if (p.smoke) { const k = 1 - p.life / p.max; ctx.globalAlpha = a * 0.7; ctx.beginPath(); ctx.arc(Math.round(p.x - cam), Math.round(p.y), p.s * (0.6 + k * 1.2), 0, 7); ctx.fill(); continue; } // 黑氣：越飄越大、越淡
    if (p.orb) { // 光點：由大到小、閃爍、外圈光暈
      ctx.globalAlpha = 1;
      const k = p.life / p.max, r = Math.max(1, Math.round(p.s * (0.25 + 0.75 * k) * (p.life % 6 < 3 ? 1 : 0.8)));
      const X = Math.round(p.x - cam), Y = Math.round(p.y);
      ctx.fillStyle = p.c; ctx.globalAlpha = 0.3; ctx.beginPath(); ctx.arc(X, Y, r + 3, 0, 7); ctx.fill();
      ctx.globalAlpha = 1; ctx.fillStyle = '#16111f'; ctx.beginPath(); ctx.arc(X, Y, r + 1, 0, 7); ctx.fill();
      ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(X, Y, r, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(X - 1, Y - 1, 2, 2);
      continue;
    }
    const s = p.s;
    if (p.fc) { // FC 式白色爆散：中心亮點＋八方向像素放射，三段放大
      const k = 1 - p.life / p.max, r = (3 + k * 12) * p.k, X = Math.round(p.x - cam), Y = Math.round(p.y), b = Math.max(1, Math.round(3 * p.k * (1 - k * 0.6)));
      ctx.globalAlpha = 1; ctx.fillStyle = (p.life >> 1) % 2 ? '#ffffff' : '#fff2a8';
      if (k < 0.35) ctx.fillRect(X - b * 2, Y - b * 2, b * 4, b * 4);
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? r * 0.75 : r; ctx.fillRect(Math.round(X + Math.cos(a) * rr - b / 2), Math.round(Y + Math.sin(a) * rr - b / 2), b, b); if (k > 0.3) ctx.fillRect(Math.round(X + Math.cos(a) * rr * 0.55 - b / 2), Math.round(Y + Math.sin(a) * rr * 0.55 - b / 2), b, b); }
      continue; }
    if (p.cloud) { const k = 1 - p.life / p.max, r = p.r0 + (p.r1 - p.r0) * Math.sqrt(k); ctx.globalAlpha = Math.min(1, (1 - k) * 1.4) * 0.85; ctx.beginPath(); ctx.arc(Math.round(p.x - cam), Math.round(p.y), r, 0, 7); ctx.fill(); continue; }
    if (p.ring) { const k = 1 - p.life / p.max, r = p.r0 + (p.r1 - p.r0) * k; ctx.globalAlpha = 1 - k; ctx.strokeStyle = p.c; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(p.x - cam, p.y, r, r * p.flat, 0, 0, 7); ctx.stroke(); continue; }
    if (p.warn) { // 洛克人式鎖定標記：四角括號往中間收、紅色倒三角跳動、天上掉下來的虛線
      const X = Math.round(p.x - cam), Y = Math.round(p.y), t = 1 - p.life / p.max, blink = p.life % 8 < 4;
      const r = Math.round(p.r0 * (1.7 - 0.7 * Math.min(1, t * 3))), ry = Math.max(4, Math.round(r * 0.35)), L = Math.max(4, Math.round(r * 0.4));
      const col = blink ? '#ff3b3b' : '#ffe36a';
      ctx.globalAlpha = 0.22; ctx.fillStyle = col; for (let yy = 0; yy < Y - 10; yy += 8) ctx.fillRect(X, yy, 1, 4);
      ctx.globalAlpha = 0.25; ctx.fillStyle = '#ff3b3b'; ctx.fillRect(X - r, Y - 1, r * 2, 2);
      ctx.globalAlpha = 1;
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const cx = X + sx * r, cy = Y - 2 + sy * ry;
        ctx.fillStyle = '#16111f'; ctx.fillRect(cx - (sx > 0 ? L : 0) - 1, cy - 2, L + 2, 4); ctx.fillRect(cx - 2, cy - (sy > 0 ? L * 0.6 : 0) - 1, 4, L * 0.6 + 2);
        ctx.fillStyle = col; ctx.fillRect(cx - (sx > 0 ? L : 0), cy - 1, L, 2); ctx.fillRect(cx - 1, cy - (sy > 0 ? L * 0.6 : 0), 2, L * 0.6);
      }
      const by = Y - ry - 14 - Math.abs(Math.sin(G.t / 5)) * 4;
      ctx.fillStyle = '#16111f'; ctx.beginPath(); ctx.moveTo(X - 6, by - 1); ctx.lineTo(X + 6, by - 1); ctx.lineTo(X, by + 8); ctx.fill();
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(X - 4, by); ctx.lineTo(X + 4, by); ctx.lineTo(X, by + 6); ctx.fill();
      continue; }
    if (p.meteor) { // 流星：橘紅火球＋拖尾，加速落下
      const t = 1 - p.life / p.max, e = t * t, sx = p.x - cam + (1 - e) * 60, sy = -30 + (p.y + 30) * e, R = 7 * p.k;
      for (let i = 6; i >= 1; i--) { ctx.globalAlpha = 0.12 * (7 - i); ctx.fillStyle = i % 2 ? '#ff7a24' : '#ffd23f'; const tx = sx + i * 6, ty = sy - i * 9; ctx.beginPath(); ctx.arc(tx, ty, R * (1 - i * 0.1), 0, 7); ctx.fill(); }
      ctx.globalAlpha = 1; ctx.fillStyle = '#16111f'; ctx.beginPath(); ctx.arc(sx, sy, R + 2, 0, 7); ctx.fill();
      ctx.fillStyle = '#ff5a1f'; ctx.beginPath(); ctx.arc(sx, sy, R, 0, 7); ctx.fill(); ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(sx - R * 0.25, sy - R * 0.25, R * 0.6, 0, 7); ctx.fill(); ctx.fillStyle = '#fff8d0'; ctx.fillRect(Math.round(sx - R * 0.45), Math.round(sy - R * 0.45), 3, 3);
      if (p.life === 1) { FX('explode', p.x, p.y - 6, { opts: { size: 1.1 } }); FX('shock', p.x, p.y, { opts: { size: 1 } }); }
      continue; }
    if (p.dot) { ctx.globalAlpha = Math.min(1, p.life / 6); ctx.fillStyle = p.c; ctx.fillRect(p.x - cam - 1.5, p.y - 0.5, 3, 1); ctx.fillRect(p.x - cam - 0.5, p.y - 1.5, 1, 3); ctx.globalAlpha *= 0.35; ctx.fillRect(p.x - cam - 2, p.y - 2, 4, 4); continue; }
    ctx.fillRect(Math.round(p.x - cam - s / 2), Math.round(p.y - s / 2), Math.ceil(s), Math.ceil(s));
  }
  ctx.globalAlpha = 1;
  if (window.VFX && !G.lowFx) VFX.draw(ctx, cam, 0, 'front');
}

// ---------- 文字（高解析度層） ----------
function txt(s, x, y, size = 10, color = '#fff', align = 'left', outline = '#16111f', ctx2 = sctx) {
  ctx2.font = `${Math.round(size * K)}px Cubic11, "Microsoft JhengHei", sans-serif`;
  ctx2.textAlign = align; ctx2.textBaseline = 'top';
  const X = x * K, Y = y * K, o = Math.max(1, Math.round(K * size / 10));
  if (outline) { ctx2.fillStyle = outline; for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [1, -1], [-1, 1]]) ctx2.fillText(s, X + dx * o, Y + dy * o); }
  ctx2.fillStyle = color; ctx2.fillText(s, X, Y);
}
function box(x, y, w, h, fill = '#141a33', border = '#f4ecd8', ctx2 = sctx) {
  ctx2.fillStyle = '#16111f'; ctx2.fillRect((x - 1) * K, (y - 1) * K, (w + 2) * K, (h + 2) * K);
  ctx2.fillStyle = border; ctx2.fillRect(x * K, y * K, w * K, h * K);
  ctx2.fillStyle = fill; ctx2.fillRect((x + 2) * K, (y + 2) * K, (w - 4) * K, (h - 4) * K);
}
function wrap(text, maxW, size) {
  sctx.font = `${Math.round(size * K)}px Cubic11, "Microsoft JhengHei", sans-serif`;
  const lines = []; let cur = '';
  for (const ch of text) { if (sctx.measureText(cur + ch).width > maxW * K) { lines.push(cur); cur = ch; } else cur += ch; }
  if (cur) lines.push(cur); return lines;
}
function portrait(who, x, y, s, flip) {
  const im = IMG[PORTRAIT[who]];
  sctx.save();
  if (flip) { sctx.translate((x + s) * K, y * K); sctx.scale(-1, 1); sctx.translate(-x * K, -y * K); }
  if (im) sctx.drawImage(im, x * K, y * K, s * K, s * K);
  else { sctx.fillStyle = '#141a33'; sctx.fillRect(x * K, y * K, s * K, s * K); const sp = PX.S[SPRITE_FALLBACK[who]]; if (sp) sctx.drawImage(sp, 0, 0, sp.width, sp.height * 0.55, x * K + s * K * 0.1, y * K + s * K * 0.05, s * K * 0.8, s * K * 0.8 * sp.height * 0.55 / sp.width); }
  sctx.restore();
}

// ---------- 繪製：HUD ----------
function bar(x, y, val, max, col, fillTo) {
  sctx.fillStyle = '#16111f'; sctx.fillRect(x * K, y * K, 8 * K, 58 * K);
  const n = 28, shown = fillTo != null ? fillTo : Math.ceil(val / max * n);
  for (let i = 0; i < n; i++) {
    const yy = y + 56 - i * 2;
    sctx.fillStyle = i < shown ? (i % 2 ? col : '#fffbe6') : '#3a3550';
    sctx.fillRect((x + 1) * K, yy * K, 6 * K, 1 * K);
  }
}
// GPT HUD 外框：先畫填色，再疊外框
function hudSpr(n, x, y) { const s = SPR.f[n]; if (!s) return null; sctx.drawImage(s.img, x * K, y * K, s.w * K, s.h * K); return s; }
function hudBarH(frame, x, y, pct, col, col2) {
  const s = SPR.f[frame]; if (!s) return false;
  const ix = x + s.w * 0.30, iw = s.w * 0.655, iy = y + s.h * 0.32, ih = s.h * 0.36;
  sctx.fillStyle = '#1a1a2e'; sctx.fillRect(ix * K, iy * K, iw * K, ih * K);
  const g = sctx.createLinearGradient(0, iy * K, 0, (iy + ih) * K); g.addColorStop(0, col2); g.addColorStop(1, col);
  sctx.fillStyle = g; sctx.fillRect(ix * K, iy * K, iw * Math.max(0, Math.min(1, pct)) * K, ih * K);
  sctx.fillStyle = 'rgba(255,255,255,0.35)'; sctx.fillRect(ix * K, iy * K, iw * Math.max(0, Math.min(1, pct)) * K, Math.max(1, ih * 0.25) * K);
  hudSpr(frame, x, y); return { ix, iw, iy, ih, s };
}
function hudBarV(x, y, val, max, col, fillTo) {
  const s = SPR.f.hud_hp; if (!s) return false;
  const ix = x + s.w * 0.30, iw = s.w * 0.40, top = y + s.h * 0.10, bot = y + s.h * 0.74, n = 28, seg = (bot - top) / n;
  const shown = fillTo != null ? fillTo : Math.ceil(val / max * n);
  sctx.fillStyle = '#1a1a2e'; sctx.fillRect(ix * K, top * K, iw * K, (bot - top) * K);
  for (let i = 0; i < shown; i++) { sctx.fillStyle = i % 2 ? col : '#fffbe6'; sctx.fillRect(ix * K, (bot - (i + 1) * seg) * K, iw * K, Math.max(1, seg * 0.7) * K); }
  hudSpr('hud_hp', x, y); return true;
}
function drawHUD() {
  const P = G.player, L = G.level;
  if (SPR.has('hud_hp') && SPR.has('hud_clean')) {
    hudBarV(4, 4, P.hp, P.maxHp, '#ffd23f');
    if (G.boss && (G.mode === 'boss' || G.mode === 'bossIntro' || G.mode === 'bossDown') && (G.mode !== 'bossIntro' || G.bossBarFill != null)) {
      hudBarV(20, 4, G.boss.hp, G.boss.maxHp, '#ff5a8a', G.bossBarFill != null ? G.bossBarFill : null);
    }
    const pct = Math.min(1, G.clean / Math.max(1, L.total)), req = L.req / Math.max(1, L.total);
    const cb = hudBarH('hud_clean', 300, 4, pct, pct >= req ? '#2fd07a' : '#1f8fd8', pct >= req ? '#9dffc4' : '#8fe3ff');
    if (cb) { sctx.fillStyle = '#ffd23f'; sctx.fillRect((cb.ix + cb.iw * req) * K, (cb.iy - 2) * K, 1 * K, (cb.ih + 4) * K); if (!hudSpr('lb_clean', cb.ix + 2, 4 + cb.s.h)) txt('清潔度', cb.ix, 4 + cb.s.h, 7, '#9ff3ff'); txt(Math.floor(pct * 100) + '%', 396, 4 + cb.s.h, 8, pct >= req ? '#5dff9a' : '#fff', 'right'); }
    const full = G.ultra >= 100;
    const ub = hudBarH('hud_ult', 40, 4, G.ultra / 100, full ? ((G.t >> 3) % 2 ? '#ffb21a' : '#fff6b0') : '#e8a020', '#fff2a0');
    if (ub) { if (!hudSpr('lb_ult', ub.ix + 2, 4 + ub.s.h)) txt('絕招', ub.ix, 4 + ub.s.h, 7, '#ffe36a'); if (full && G.mode !== 'ultra') txt('按 A 發動！', ub.ix + 26, 4 + ub.s.h, 7, (G.t >> 4) % 2 ? '#ffe36a' : '#fff'); }
    if (G.weapon && G.weapon !== 'water') {
      const W = WEAPONS[G.weapon];
      const wb = hudBarH('hud_wpn', 40, 40, (G.ammo[G.weapon] || 0) / 28, W.color, '#ffffff');
      if (wb) { hudSpr('ic_' + G.weapon, wb.ix + wb.iw + 4, 40 + (wb.s.h - 13) / 2); txt(W.name, wb.ix + 2, 40 + wb.s.h, 7, W.color); }
    }

    if (G.swapT > 0) { G.swapT--; const W = WEAPONS[G.weapon]; txt(W.name, 200, 60, 12, W.color, 'center'); }
    return;
  }
  bar(8, 8, P.hp, P.maxHp, '#ffd23f');
  txt('HP', 8, 67, 7, '#fff');
  if (G.boss && (G.mode === 'boss' || G.mode === 'bossIntro' || G.mode === 'bossDown') && (G.mode !== 'bossIntro' || G.bossBarFill != null)) {
    bar(19, 8, G.boss.hp, G.boss.maxHp, '#ff5a8a', G.bossBarFill != null ? G.bossBarFill : null);
    txt('BOSS', 16, 67, 6, '#ff9fc8');
  }
  // 清潔度
  const pct = Math.min(100, Math.floor(G.clean / Math.max(1, L.total) * 100)), req = Math.ceil(L.req / Math.max(1, L.total) * 100);
  const bx = 268, by = 8, bw = 120;
  txt('清潔度', bx, by, 8, '#9ff3ff');
  sctx.fillStyle = '#16111f'; sctx.fillRect((bx + 34) * K, by * K, (bw - 34) * K, 9 * K);
  sctx.fillStyle = '#2a3350'; sctx.fillRect((bx + 35) * K, (by + 1) * K, (bw - 36) * K, 7 * K);
  sctx.fillStyle = pct >= req ? '#5dff9a' : '#3fb7ff'; sctx.fillRect((bx + 35) * K, (by + 1) * K, (bw - 36) * pct / 100 * K, 7 * K);
  sctx.fillStyle = '#ffd23f'; sctx.fillRect((bx + 35 + (bw - 36) * req / 100) * K, (by - 1) * K, 1 * K, 11 * K);
  txt(pct + '%', bx + bw - 2, by + 11, 7, pct >= req ? '#5dff9a' : '#fff', 'right');
  // 絕招量表
  const ux = 34, uy = 8, full = G.ultra >= 100;
  txt('絕招', ux, uy, 7, '#ffe36a');
  sctx.fillStyle = '#16111f'; sctx.fillRect((ux + 20) * K, uy * K, 62 * K, 7 * K);
  sctx.fillStyle = full ? ((G.t >> 3) % 2 ? '#fff6b0' : '#ffb21a') : '#e8a020'; sctx.fillRect((ux + 21) * K, (uy + 1) * K, 60 * G.ultra / 100 * K, 5 * K);
  if (full && G.mode !== 'ultra') txt('按 A 發動！', ux + 20, uy + 9, 7, (G.t >> 4) % 2 ? '#ffe36a' : '#fff');
  // 能力圖示
  let ax = 34; const ay = 30;
  for (const k of ['charge', 'djump', 'dash']) if (G.abilities[k]) { const a = ABILITIES[k]; sctx.fillStyle = '#16111f'; sctx.fillRect(ax * K, ay * K, 9 * K, 9 * K); sctx.fillStyle = a.color; sctx.fillRect((ax + 1) * K, (ay + 1) * K, 7 * K, 7 * K); txt(a.name[0], ax + 1.5, ay + 0.5, 7, '#16111f', 'left', null); ax += 11; }
  // 蓄力提示
  if (P.charge > 22) txt(P.charge >= 52 ? '★ 全力蓄滿 ★' : '蓄力中…', 200, 200, 8, P.charge >= 52 ? '#fff' : '#7fe6ff', 'center');
}
function worldToScreen(x, y) { const z = G.zc; return [((x - G.camX) - z.x) * (VW / z.w), (y - z.y) * (VH / z.h)]; }
function drawTexts() {
  for (const t of G.texts) {
    const [x, y] = worldToScreen(t.x, t.y);
    sctx.globalAlpha = Math.min(1, t.life / 20);
    txt(t.text, x, y, t.big ? 11 : 8, t.color, 'center');
  }
  sctx.globalAlpha = 1;
}
function drawDialog() {
  const d = G.dialog; if (!d) return;
  const heroSide = d.who === 'hero';
  const bx = 8, by = 158, bw = 384, bh = 60;
  box(bx, by, bw, bh, 'rgba(10,12,28,0.94)');
  // 特寫頭像
  const ps = 84, px = heroSide ? bx + bw - ps - 6 : bx + 6, py = by - ps + 50;
  const slide = Math.min(1, d.t / 10);
  sctx.save(); sctx.globalAlpha = slide;
  box(px - 2, py - 2, ps + 4, ps + 4, '#141a33', heroSide ? '#7fe6ff' : '#ffd23f');
  portrait(d.who, px, py, ps, false);
  sctx.restore();
  // 名牌
  const nx = heroSide ? px - 70 : px + ps + 8;
  box(nx, by - 9, 64, 14, heroSide ? '#1d4a6e' : '#6e1d3a', '#f4ecd8');
  txt(d.name, nx + 32, by - 7, 9, '#fff', 'center', null);
  // 內文
  const tx = heroSide ? bx + 12 : px + ps + 10, tw = heroSide ? px - bx - 22 : bx + bw - (px + ps + 10) - 10;
  const lines = wrap(d.text.slice(0, Math.floor(d.shown)), tw, 10);
  lines.slice(0, 3).forEach((l, i) => txt(l, tx, by + 10 + i * 15, 10, '#f4ecd8', 'left', null));
  if (d.shown >= d.text.length && (G.t >> 4) % 2) txt('▼', bx + bw - 14, by + bh - 13, 8, '#ffd23f', 'left', null);
}
function drawBand(c) {
  const t = c.t, dur = c.dur || 90, cy = c.y || 100, bh = 56, skew = 18;
  const inK = Math.min(1, t / 7), outK = t > dur - 10 ? Math.min(1, (t - (dur - 10)) / 10) : 0;
  const ease = k => 1 - Math.pow(1 - k, 3);
  const slide = (1 - ease(inK)) * 420 - ease(outK) * 420; // 由右滑入、往左滑出
  const hgt = bh * (outK > 0 ? 1 - outK * 0.6 : 1);
  // 輕微壓暗（不是全黑）
  sctx.fillStyle = `rgba(10,6,20,${0.28 * (1 - outK)})`; sctx.fillRect(0, 0, VW * K, VH * K);
  const poly = (y0, y1, dx) => { sctx.beginPath(); sctx.moveTo((slide + dx - 10) * K, y0 * K); sctx.lineTo((slide + dx + VW + 30) * K, y0 * K); sctx.lineTo((slide + dx + VW + 30 - skew) * K, y1 * K); sctx.lineTo((slide + dx - 10 - skew) * K, y1 * K); sctx.closePath(); };
  // 外框色帶
  sctx.fillStyle = c.color || '#ffd23f'; poly(cy - hgt / 2 - 3, cy + hgt / 2 + 3, 0); sctx.fill();
  sctx.save(); poly(cy - hgt / 2, cy + hgt / 2, 0); sctx.clip();
  sctx.fillStyle = '#0d0a18'; sctx.fillRect(0, 0, VW * K, VH * K);
  // 眼部特寫（慢慢平移）
  const im = IMG[PORTRAIT[c.who]];
  if (im) {
    const ey = EYE[c.who] || 0.33, cropH = im.height * 0.2, sy = im.height * ey - cropH / 2;
    const w = VW * 1.05, h = w * cropH / im.width, drift = -t * 0.25;
    sctx.imageSmoothingEnabled = false;
    sctx.drawImage(im, 0, sy, im.width, cropH, (slide + drift - 8) * K, (cy - h / 2) * K, w * K, h * K);
  }
  // 速度線
  sctx.strokeStyle = 'rgba(255,255,255,0.55)';
  for (let i = 0; i < 18; i++) {
    const yy = cy - hgt / 2 + ((i * 13.7) % hgt), len = 30 + (i * 23) % 70, x = ((i * 97 - t * (14 + i % 5 * 3)) % (VW + 120) + VW + 120) % (VW + 120) - 60;
    sctx.lineWidth = (i % 3 === 0 ? 2 : 1) * K * 0.6; sctx.beginPath(); sctx.moveTo(x * K, yy * K); sctx.lineTo((x + len) * K, yy * K); sctx.stroke();
  }
  sctx.restore();
  // 名稱
  if (t > 6) {
    const a = Math.min(1, (t - 6) / 8) * (1 - outK);
    sctx.globalAlpha = a;
    txt(c.sub || '', 24 + slide * 0.5, cy + hgt / 2 - 22, 8, c.color || '#ffd23f', 'left');
    txt(c.name || '', 24 + slide * 0.5, cy + hgt / 2 - 13, 12, '#fff', 'left');
    sctx.globalAlpha = 1;
  }
  // 入場閃光
  if (t < 5) { sctx.fillStyle = `rgba(255,255,255,${0.5 * (1 - t / 5)})`; sctx.fillRect(0, 0, VW * K, VH * K); }
}
// 歧路旅人式切入：斜向橫帶＋速度線＋眼部特寫（不用全畫面）
const EYE = { hero: 0.30, witch: 0.40, abo: 0.33, lady: 0.26, dogking: 0.31, chief: 0.34, kid: 0.36, virus: 0.38, typhoonB: 0.40, rhinoB: 0.36, shacho: 0.30 };
function drawCutin() {
  const c = G.cutin; if (!c) return;
  if (c.who) return drawBand(c);
  const t = c.t, W = VW * K, H = VH * K;
  sctx.fillStyle = 'rgba(0,0,0,0.6)'; sctx.fillRect(0, 0, W, H);
  // 斜向光帶
  const band = Math.min(1, t / 12);
  sctx.save(); sctx.translate(W / 2, H / 2); sctx.rotate(-0.18);
  sctx.fillStyle = '#ffd23f'; sctx.fillRect(-W, -60 * K * band, W * 2, 120 * K * band);
  sctx.fillStyle = '#16111f'; sctx.fillRect(-W, -54 * K * band, W * 2, 108 * K * band);
  // 集中線
  sctx.strokeStyle = 'rgba(255,255,255,0.35)'; sctx.lineWidth = K;
  for (let i = 0; i < 26; i++) { const yy = ((i * 37 + t * 9) % 108 - 54) * K; sctx.beginPath(); sctx.moveTo(-W, yy); sctx.lineTo(W, yy); sctx.stroke(); }
  sctx.restore();
  // 頭像滑入
  const k = t < 20 ? 1 - Math.pow(1 - t / 20, 3) : 1;
  const ps = 120, px = 400 - (400 - 230) * k + (t > 85 ? (t - 85) * -20 : 0);
  const ci = SPR.f.cutin;
  if (ci) { const w = ci.w * 1.1, h = ci.h * 1.1, x = 420 - (420 - 270) * k - w / 2 + (t > 85 ? (t - 85) * -24 : 0); sctx.drawImage(ci.img, x * K, (112 - h / 2) * K, w * K, h * K); }
  else portrait('hero', px, 50, ps, false);
  if (t > 22) { const s = t < 30 ? 2 - (t - 22) / 8 : 1; sctx.save(); sctx.translate(110 * K, 112 * K); sctx.scale(s, s); sctx.translate(-110 * K, -112 * K); if (!uiImg('ui_ultimate', 110, 108, 210)) txt('全城大掃除！！', 110, 98, 22, '#ffe36a', 'center', '#7a1d00'); sctx.restore(); }
  if (t > 40) txt('— 清潔能量 全開放 —', 110, 128, 9, '#fff', 'center');
}

// ---------- 繪製：各畫面 ----------
function drawTitle() {
  if (G.mode === 'boot') return drawLoading();
  sctx.fillStyle = '#07080f'; sctx.fillRect(0, 0, screen.width, screen.height);
  const im = IMG.title;
  if (im) { const s = Math.max(VW / im.width, VH / im.height); const w = im.width * s, h = im.height * s; sctx.drawImage(im, (VW - w) / 2 * K, (VH - h) / 2 * K, w * K, h * K); }
  const g = sctx.createLinearGradient(0, 120 * K, 0, VH * K); g.addColorStop(0, 'rgba(7,8,15,0)'); g.addColorStop(1, 'rgba(7,8,15,0.92)'); sctx.fillStyle = g; sctx.fillRect(0, 0, VW * K, VH * K);
  const bob = Math.sin(G.t / 30) * 2;
  if (!uiImg('ui_logo', 200, 42 + bob, 250)) { txt('小編出擊！', 200, 18 + bob, 34, '#ffe36a', 'center', '#5a1d00'); txt('維護環境 你我一起來！', 200, 58 + bob, 9, '#fff', 'center'); }
  // （讀取畫面在 drawTitle 開頭處理）

  if (G.mode === 'help') { drawHelp(); return; }
  const opts = titleOptions();
  const many = opts.length > 4, oy = many ? 118 : 150, os = many ? 13 : 16;
  if (many) box(128, oy - 4, 150, opts.length * os + 6, 'rgba(7,8,15,0.55)');
  opts.forEach((o, i) => txt((i === G.menu ? '▶ ' : '　') + o[0], 140, oy + i * os, many ? 10 : 11, i === G.menu ? '#ffe36a' : o[0].startsWith('★') ? '#ff9a6a' : '#ddd'));
  if (IS_TOUCH) txt('蘑菇頭上下選擇，按綠色「射」確定', 200, 198, 8, '#7dffa0', 'center');
  txt(IS_TOUCH ? (navigator.standalone || matchMedia('(display-mode: fullscreen)').matches || matchMedia('(display-mode: standalone)').matches ? '全螢幕模式　手機請橫放' : '想要畫面更大？Safari 按「分享」→「加入主畫面」，從主畫面打開就是全螢幕！') : 'M：靜音　F：特效品質', 200, 212, 7, IS_TOUCH ? '#ffe36a' : '#9aa', 'center');
}
function drawHelp() {
  box(30, 72, 340, 150, 'rgba(10,12,28,0.95)');
  const L = [['← →', '移動'], ['↑ ↓', '爬梯子／與人對話'], ['Z 或 K', '跳躍（空中再按＝二段跳）'], ['X 或 J', '射擊（按住＝集氣，魔王武器也能集氣）'], ['S 或 I', '切換魔王武器'], ['C 或 L', '吸塵衝刺'], ['A 或 U', '大絕招「全城大掃除」（能量滿時）'], ['Enter', '暫停選單']];
  L.forEach(([k, v], i) => { txt(k, 48, 79 + i * 13, 8.5, '#ffe36a'); txt(v, 112, 79 + i * 13, 8.5, '#fff'); });
  txt('武器能量：沖掉便便 +1、撿「清潔劑」+10（打倒小怪會掉）', 200, 186, 7.5, '#7fd7ff', 'center');
  txt('沖掉便便、撿起垃圾，清潔度達標才能挑戰魔王！', 200, 201, 7.5, '#9ff3ff', 'center');
}
function drawSelect() {
  // 原本的星空背景＋洛克人式十字排列：左／上／右＝三個關卡，下＝豪鬼主任，中間＝小編
  sctx.fillStyle = '#0b0d1e'; sctx.fillRect(0, 0, screen.width, screen.height);
  for (let i = 0; i < 60; i++) { const x = (i * 83 + G.t * (1 + i % 3) * 0.3) % VW, y = (i * 41) % VH; sctx.fillStyle = i % 5 ? '#4a4f7a' : '#fff'; sctx.fillRect(x * K, y * K, K, K); }
  const o = loopOff();
  txt(o ? 'STAGE SELECT  二周目' : 'STAGE SELECT', 200, 4, 13, o ? '#ff9a6a' : '#ffe36a', 'center');
  txt(IS_TOUCH ? '蘑菇頭選關卡' : '方向鍵選關卡', 56, 26, 7, '#9ff3ff', 'center'); txt(IS_TOUCH ? '按綠色「射」確定' : '按 Z 或 X 確定', 56, 37, 7, '#9ff3ff', 'center');
  if (o) { txt(IS_TOUCH ? '按「衝」換角色' : '按 C 換角色', 56, 52, 7, '#ffd23f', 'center'); txt(IS_TOUCH ? '按「換」回開始畫面' : '按 S 回開始畫面', 56, 63, 7, '#ffd23f', 'center'); }
  else { txt(IS_TOUCH ? '按「衝」回開始畫面' : '按 C 回開始畫面', 56, 52, 7, '#ffd23f', 'center'); txt('（可換角色、難度）', 56, 63, 7, '#ffd23f', 'center'); }
  const F = 48, P = [[96, 118], [200, 52], [304, 118], [200, 184]], C = [200, 118];
  // 中心到四格的連接光帶
  for (const [x, y] of P) { sctx.strokeStyle = 'rgba(127,230,255,0.25)'; sctx.lineWidth = 3 * K; sctx.beginPath(); sctx.moveTo(C[0] * K, C[1] * K); sctx.lineTo(x * K, y * K); sctx.stroke(); }
  const frame = (cx, cy, sel, col) => {
    const x = cx - F / 2, y = cy - F / 2 - 6, lift = sel ? -2 : 0;
    box(x - 3, y - 3 + lift, F + 6, F + 6, sel ? '#24305e' : '#141a33', sel ? ((G.t >> 3) % 2 ? '#ffe36a' : '#ffffff') : col);
    return [x, y + lift];
  };
  P.forEach(([cx, cy], i) => {
    const D = LEVEL_DATA[o + i], sel = G.sel === i, unlocked = stageUnlocked(o + i + 1), cleared = save.cleared.includes(o + i + 1);
    const [x, y] = frame(cx, cy, sel, i === 3 ? '#b07aff' : '#6a6f8a');
    if (unlocked) { if (cleared) sctx.globalAlpha = 0.4; portrait(D.boss, x, y, F, false); sctx.globalAlpha = 1; }
    else { sctx.fillStyle = '#0a0c18'; sctx.fillRect(x * K, y * K, F * K, F * K); sctx.globalAlpha = 0.25; portrait(D.boss, x, y, F, false); sctx.globalAlpha = 1; txt('🔒', cx, y + F / 2 - 10, 14, '#fff', 'center', null); }
    if (cleared) { sctx.save(); sctx.translate(cx * K, (y + F / 2) * K); sctx.rotate(-0.25); txt('CLEAR', 0, -6, 10, '#ff3b3b', 'center', '#fff'); sctx.restore(); }
    txt(D.bossName, cx, y + F + 4, 7, sel ? '#ffe36a' : '#ff9fc8', 'center');
  });
  { const sw = G.charSwapT != null ? G.t - G.charSwapT : 99, pop = sw < 10 ? 1 + (10 - sw) * 0.03 : 1;
    const [x, y] = frame(C[0], C[1], sw < 20 && sw % 4 < 2, G.char === 'witch' ? '#ff9ae6' : '#7fe6ff');
    if (sw < 14) { sctx.fillStyle = `rgba(255,255,255,${0.8 * (1 - sw / 14)})`; sctx.fillRect(x * K, y * K, F * K, F * K); }
    const hi = [1, 3, 2, 4][G.sel], h = SELHEAD.length === 5 && !o && G.char !== 'witch' ? SELHEAD[hi] : null;
    if (pop !== 1) { sctx.save(); sctx.translate(C[0] * K, (y + F / 2) * K); sctx.scale(pop, pop); sctx.translate(-C[0] * K, -(y + F / 2) * K); }
    if (G.char === 'witch') portrait('witch', x, y, F, false);
    else if (o) portrait('hero', x, y, F, false);
    else if (h) { const k = Math.min(F / h.width, F / h.height); sctx.drawImage(h, (C[0] - h.width * k / 2) * K, (y + F - h.height * k) * K, h.width * k * K, h.height * k * K); }
    else portrait('hero', x, y, F, false);
    if (pop !== 1) sctx.restore();
    txt(G.char === 'witch' ? '豪鬼主任' : '小編', C[0], y + F + 4, 7, G.char === 'witch' ? '#ff9ae6' : '#7fe6ff', 'center'); }
  // 剛換角色：換上的角色講一句話（約 3 秒，暫時取代關主的台詞框）；一移動選關就收掉，不會跑到怪人那邊
  if (G.charSay && G.charSay.sel !== G.sel) G.charSay = null;
  if (G.charSay && G.t - G.charSay.t0 < 180) {
    const s = G.charSay, n = Math.min(s.text.length, Math.floor((G.t - s.t0) / 2)), col = G.char === 'witch' ? '#ff9ae6' : '#7fe6ff';
    const [qx, qy] = [[14, 150], [234, 36], [228, 150], [234, 152]][G.sel], qw = 158;
    box(qx, qy, qw, 30, 'rgba(10,12,28,0.94)', col); txt(G.char === 'witch' ? '豪鬼主任' : '小編', qx + 6, qy + 4, 7, col, 'left'); txt(s.text.slice(0, n), qx + 6, qy + 16, 7.5, '#ffffff', 'left');
    if (n < s.text.length && (G.t - s.t0) % 4 === 0) Audio8.sfx('blip', 0.05);
    G.selSayT0 = G.t; // 講完後，關主的台詞再從頭打字
  }
  // 選到的關主講一句話（打字效果）
  if (G.selSayI !== G.sel) { G.selSayI = G.sel; const q = SELECT_QUOTES[o + G.sel]; G.selSayText = q[Math.floor(rnd(0, q.length))]; G.selSayT0 = G.t; }
  if (!(G.charSay && G.t - G.charSay.t0 < 180)) { const Dq = LEVEL_DATA[o + G.sel], n = Math.min(G.selSayText.length, Math.floor((G.t - G.selSayT0) / 2)), col = ['#ff9a3a', '#ff7ad9', '#b07aff', '#ff4552'][G.sel];
    const [qx, qy] = [[14, 150], [234, 36], [228, 150], [234, 152]][G.sel], qw = 158;
    box(qx, qy, qw, 30, 'rgba(10,12,28,0.94)', col); txt(Dq.bossName, qx + 6, qy + 4, 7, col, 'left'); txt(G.selSayText.slice(0, n), qx + 6, qy + 16, 7.5, '#ffffff', 'left');
    if (n < G.selSayText.length && n % 2 === 0 && (G.t - G.selSayT0) % 4 === 0) Audio8.sfx('blip', 0.05); }
  const D = LEVEL_DATA[o + G.sel];
  txt(D.name, 40, 196, 8, '#ffffff', 'center'); txt(stageUnlocked(o + G.sel + 1) ? (IS_TOUCH ? '按「射」出發' : 'Z 出發') : o ? '打倒三個怪人解鎖' : '打倒三個魔王解鎖', 40, 208, 6, '#aab', 'center');
  txt((G.char === 'witch' ? '魔法星星' : '水槍') + ' Lv.' + (G.gunLv + 1) + (G.hard ? '　困難' : ''), 360, 196, 7, G.hard ? '#ff8a8a' : '#9ff3ff', 'center');
  if ((o || save.cleared.length) && G.sel < 3) txt(o ? '怪人也有弱點武器！' : '魔王互相克制！', 360, 208, 6, '#ffd23f', 'center');
}function drawStageCard() {
  // 洛克人式出場卡：白閃 → 上下鐵幕夾成橫帶 → 魔王頭像砸下來 → 關卡標題彈出 → 魔王名字逐字打出
  const D = LEVEL_DATA[G.cardStage - 1], t = G.cardT, col = G.cardStage === 4 ? '#b07aff' : '#ff9fc8';
  sctx.fillStyle = '#05060c'; sctx.fillRect(0, 0, screen.width, screen.height);
  // 速度線（越來越快）
  const sp = 2 + Math.min(6, t / 20);
  for (let i = 0; i < 90; i++) { const x = (i * 97 - t * sp * (1 + i % 4)) % VW, y = (i * 37) % VH; sctx.fillStyle = i % 7 ? '#3a3f6a' : col; sctx.fillRect(((x + VW) % VW) * K, y * K, (4 + i % 3 * 4) * K, K); }
  // 上下鐵幕
  const b = Math.min(1, Math.max(0, (t - 8) / 12)), bh = 46 * b;
  sctx.fillStyle = '#1c2450'; sctx.fillRect(0, (112 - bh) * K, VW * K, bh * 2 * K);
  for (let y = 112 - bh; y < 112 + bh; y += 6) { sctx.fillStyle = 'rgba(255,255,255,0.04)'; sctx.fillRect(0, y * K, VW * K, 2 * K); }
  sctx.fillStyle = '#ffd23f'; sctx.fillRect(0, (112 - bh - 2) * K, VW * K, 2 * K); sctx.fillRect(0, (112 + bh) * K, VW * K, 2 * K);
  // 魔王頭像：從上方砸下＋震動
  if (t > 24) {
    const k = Math.min(1, (t - 24) / 8), py = -90 + (74 + 90) * k, shake = t > 32 && t < 44 ? Math.sin(t * 3) * (44 - t) * 0.4 : 0;
    const px = 268 + shake;
    sctx.save(); if (t > 32 && t < 40) { sctx.shadowColor = col; sctx.shadowBlur = 20 * K; }
    box(px - 3, py - 3, 86, 86, '#141a33', col); portrait(D.boss, px, py, 80, false); sctx.restore();
    if (t > 32 && t < 38) { sctx.fillStyle = 'rgba(255,255,255,' + (0.7 - (t - 32) * 0.12) + ')'; sctx.fillRect(0, 0, screen.width, screen.height); }
  }
  // 關卡標題（GPT 文字圖）彈出
  if (t > 44) { const k = Math.min(1, (t - 44) / 7), s = k < 1 ? 1.4 - 0.4 * k : 1 + Math.sin((t - 51) / 6) * 0.015;
    if (!uiImg('ui_s' + G.cardStage, 130, 90, 196 * s, Math.min(1, k * 1.5))) { txt(D.sub, 24, 80, 9, '#ffe36a'); txt(D.name, 24, 94, 22, '#fff'); } }
  // 魔王名字逐字打出
  if (t > 64) { const n = Math.min(D.bossName.length, Math.floor((t - 64) / 5)); txt('BOSS', 40, 134, 8, '#aab'); txt(D.bossName.slice(0, n), 72, 130, 13, col); }
  if (t > 120 && (t >> 3) % 2) txt('— 準備出擊 —', 128, 160, 8, '#ffffff', 'center');
  if (t < 8) { sctx.fillStyle = 'rgba(255,255,255,' + (1 - t / 8) + ')'; sctx.fillRect(0, 0, screen.width, screen.height); }
}function drawGetAbility() {
  const ab = WEAPONS[G.getAb], t = G.getT, info = G.getInfo || { passives: [] };
  sctx.fillStyle = '#05060c'; sctx.fillRect(0, 0, screen.width, screen.height);
  for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2 + t / 100, r = 40 + ((t * 2 + i * 20) % 160); sctx.fillStyle = i % 2 ? ab.color : '#fff'; sctx.fillRect((200 + Math.cos(a) * r) * K, (90 + Math.sin(a) * r * 0.6) * K, 2 * K, 2 * K); }
  // 標題用 GPT 生成的文字圖
  const s0 = Math.min(1, t / 14);
  if (!uiImg('ui_get', 200, 22, 230 * (2 - s0), s0)) { txt('獲得新能力！', 200, 10, 16, ab.color, 'center'); }
  // 能力清單（GPT 文字圖，沒有就用文字）
  const rows = [];
  if (info.weapon) rows.push(['ui_w_' + info.weapon, WEAPONS[info.weapon].name, WEAPONS[info.weapon].color, WEAPONS[info.weapon].desc + '（S 鍵切換，按住射擊可集氣；能量用完就沖便便或撿清潔劑補充）']);
  for (const p of info.passives) rows.push(['ui_ab_' + p, ABILITIES[p].name, ABILITIES[p].color, ABILITIES[p].desc.join('')]);
  if (info.lvUp) rows.push([null, '水槍強化 Lv.' + (info.lv + 1), '#7fe6ff', '水柱變大、威力提升、可同時發射 ' + (3 + info.lv) + ' 發！']);
  // 右側：能力清單（GPT 標題圖＋自動換行說明，不互相重疊）
  let yy = 54;
  rows.forEach((r, i) => {
    if (t <= 30 + i * 20) return;
    const pop = Math.min(1, (t - 30 - i * 20) / 10), bw = 150;
    const im = r[0] && UI[r[0]]; let bh = 18;
    if (im) { bh = bw * im.height / im.width; sctx.globalAlpha = pop; sctx.drawImage(im, 196 * K, yy * K, bw * K, bh * K); sctx.globalAlpha = 1; }
    else txt(r[1], 200, yy + 2, 12, r[2], 'left');
    const lines = wrap(r[3], 180, 7.5);
    lines.slice(0, 4).forEach((l, j) => txt(l, 200, yy + bh + 2 + j * 10, 7.5, '#fff', 'left'));
    yy += bh + 6 + Math.min(4, lines.length) * 10;
  });
  // 左側：小編開心跳躍歡呼
  const ks = ['h_cheer', 'h_win', 'h_thumb'], key = ks[Math.floor(t / 24) % 3], s = SPR.f[key] || SPR.f.h_win;
  if (s) {
    const sc = 80 / 44, hop = Math.abs(Math.sin(t / 9)) * 14, x = 96, y = 176 - hop;
    sctx.fillStyle = 'rgba(0,0,0,0.35)'; sctx.beginPath(); sctx.ellipse(x * K, 178 * K, (22 - hop * 0.6) * K, 4 * K, 0, 0, 7); sctx.fill();
    sctx.drawImage(s.img, (x - s.ax * sc) * K, (y - s.h * sc) * K, s.w * sc * K, s.h * sc * K);
    if ((t >> 3) % 2) { sctx.globalAlpha = 0.35; sctx.drawImage(s.white, (x - s.ax * sc) * K, (y - s.h * sc) * K, s.w * sc * K, s.h * sc * K); sctx.globalAlpha = 1; }
  }  if (t > 90 && (t >> 4) % 2) txt('按 Z 繼續', 200, 206, 9, '#ffe36a', 'center');
}
function drawEnding() {
  sctx.fillStyle = '#000'; sctx.fillRect(0, 0, screen.width, screen.height);
  // 勝利慶祝：晴朗的第一關背景＋旋轉光芒＋煙火＋彩帶＋大家排排站跳
  const im = IMG.bg1, T = G.endT || G.t;
  const g = sctx.createLinearGradient(0, 0, 0, VH * K); g.addColorStop(0, '#ffb36a'); g.addColorStop(1, '#ffe8c0'); sctx.fillStyle = g; sctx.fillRect(0, 0, VW * K, VH * K);
  if (im) { sctx.drawImage(im, 0, -14 * K, (im.width * 250 / im.height) * K, 250 * K); }
  sctx.save(); sctx.translate(200 * K, 52 * K); sctx.rotate(T * 0.004); sctx.fillStyle = 'rgba(255,240,170,0.16)';
  for (let i = 0; i < 14; i++) { sctx.rotate(Math.PI / 7); sctx.beginPath(); sctx.moveTo(0, 0); sctx.lineTo(420 * K, -34 * K); sctx.lineTo(420 * K, 34 * K); sctx.fill(); }
  sctx.restore();
  // 煙火：每 40 格在天空隨機位置炸開
  for (let f = 0; f < 3; f++) { const ft = (T + f * 23) % 70, seed = Math.floor((T + f * 23) / 70) * 7 + f * 13, fx = 40 + (seed * 53 % 320), fy = 20 + (seed * 31 % 50), cols = ['#ff5a5a', '#ffe36a', '#7ff3ff', '#7dffa0', '#ff9de2'], c = cols[seed % 5];
    if (ft < 45) { const r = 4 + ft * 0.9; sctx.globalAlpha = 1 - ft / 45; sctx.fillStyle = c; for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; sctx.fillRect((fx + Math.cos(a) * r) * K, (fy + Math.sin(a) * r + ft * 0.08) * K, 2 * K, 2 * K); sctx.fillRect((fx + Math.cos(a) * r * 0.6) * K, (fy + Math.sin(a) * r * 0.6) * K, K, K); } sctx.globalAlpha = 1; } }
  // 彩帶
  for (let i = 0; i < 46; i++) { const x = (i * 37 + Math.sin((T + i * 17) / 20) * 10) % VW, y = ((i * 53 + T * (0.5 + (i % 4) * 0.2)) % 240) - 10, w = (Math.sin((T + i * 9) / 6) > 0 ? 3 : 1.5); sctx.fillStyle = ['#ff5a5a', '#ffe36a', '#7ff3ff', '#7dffa0', '#ff9de2', '#ffffff'][i % 6]; sctx.fillRect(x * K, y * K, w * K, 3 * K); }
  sctx.fillStyle = '#5cc85a'; sctx.fillRect(0, 160 * K, VW * K, 4 * K); sctx.fillStyle = '#a8743f'; sctx.fillRect(0, 164 * K, VW * K, 61 * K);
  const S = PX.S, row = [['chief' + ((G.t >> 5) % 2), 60], ['kid' + ((G.t >> 5) % 2), 100], ['aboUp', 140], ['ladyUp', 182], ['dogKhappy', 228], ['witchS', 280], [(G.t >> 4) % 2 ? 'hero_win' : 'hero_stand', 330]];
  const row2 = [['chief0', 50], ['kid3', 92], ['a_stand', 135], ['l_stand', 182], ['k_pup2', 228], ['w_stand', 280], [(G.t >> 5) % 2 ? 'h_thumb' : 'h_cheer', 335]];
  // 說話的人頭上出現黃色▼（不再全員一直跳）
  const who = G.dialog && G.dialog.who, wx = { chief: 50, kid: 92, abo: 135, lady: 182, dogking: 228, witch: 280, hero: 335 }[who];
  if (wx) { const by = 108 + Math.abs(Math.sin(G.t / 6)) * 4; sctx.fillStyle = '#16111f'; sctx.beginPath(); sctx.moveTo((wx - 7) * K, (by - 1) * K); sctx.lineTo((wx + 7) * K, (by - 1) * K); sctx.lineTo(wx * K, (by + 9) * K); sctx.fill(); sctx.fillStyle = '#ffe36a'; sctx.beginPath(); sctx.moveTo((wx - 5) * K, by * K); sctx.lineTo((wx + 5) * K, by * K); sctx.lineTo(wx * K, (by + 7) * K); sctx.fill(); }
  if (SPR.has('h_thumb')) { for (const [k, x] of row2) { const s = SPR.f[k]; if (!s) continue; const hop = x === wx ? Math.abs(Math.sin(G.t / 8)) * 3 : 0; sctx.drawImage(s.img, (x - s.w / 2) * K, (161 - s.h - hop) * K, s.w * K, s.h * K); } row.length = 0; }
  for (const [k, x] of row) { const im2 = S[k]; if (!im2) continue; const hop = Math.abs(Math.sin((G.t + x) / 12)) * 4; sctx.drawImage(im2, (x - im2.width / 2) * K, (160 - im2.height - hop) * K, im2.width * K, im2.height * K); }
  { const s0 = Math.min(1, T / 18), sc = s0 < 1 ? 1.6 - 0.6 * s0 : 1 + Math.sin(T / 14) * 0.03; // GPT 勝利標題圖：彈出後輕輕跳動
    if (!uiImg('ui_win', 200, 46 + Math.sin(T / 20) * 2, 270 * sc, s0)) txt('全城恢復乾淨了！', 200, 20, 16, '#fff', 'center'); }
}
function drawCredits() {
  sctx.fillStyle = '#05060c'; sctx.fillRect(0, 0, screen.width, screen.height);
  const t = G.credT, y0 = 230 - t * 0.35;
  const tt = Object.values(save.stats).reduce((a, s) => a + (s.time || 0), 0);
  const cl = Object.values(save.stats).reduce((a, s) => a + (s.clean || 0), 0);
  const T = totals(), stg = [1, 2, 3, 4].map(i => { const n = loopOff() + i, s = save.stats[n], D = LEVEL_DATA[n - 1]; return (i < 4 ? '第' + '一二三'[i - 1] + '關' : '最終關') + '　' + D.name + '　' + (s ? starStr(stageStars(s)) + '　' + stageScore(s).toLocaleString() + ' 分' : '☆☆☆'); });
  const L = ['小編出擊！', '', '— 演出 —', '主角　小編', '熱心居民　小學生', '遛狗不撿阿伯　名牌貴婦　狗魔王', '最終魔王　豪鬼主任', '中央山脈超人　針筒超人', '', '— 你的成績 —', ...stg, '', `總星數　★ ${T.stars} / 12`, `清潔分數　${T.score.toLocaleString()} 分`, `擊潰敵人　${T.kills} 隻`, `清掃數量　${cl}`, `倒下次數　${T.deaths} 次`, `總遊玩時間　${Math.floor(tt / 3600)} 分 ${Math.floor(tt / 60) % 60} 秒`, `稱號　${T.rank}`, '', '遛狗請牽繩，便便請撿走！', '', 'THE END'];
  L.forEach((l, i) => { const y = y0 + i * 20; if (i === 0 && uiImg('ui_logo', 200, y + 10, 200)) return; if (l === 'THE END' && uiImg('ui_win', 200, y + 20, 240)) return; txt(l, 200, y, i === 0 ? 20 : l === 'THE END' ? 22 : 10, i === 0 || l === 'THE END' ? '#ffe36a' : '#fff', 'center'); });
}
function drawPause() {
  sctx.fillStyle = 'rgba(0,0,0,0.6)'; sctx.fillRect(0, 0, screen.width, screen.height);
  box(100, 40, 200, 150, 'rgba(10,12,28,0.96)');
  txt('暫停', 200, 48, 14, '#ffe36a', 'center');
  ['繼續遊戲', '回到關卡選擇', '音樂／音效 開關' + (Audio8.isMuted() ? '（靜音中）' : ''), '特效品質：' + (G.lowFx ? '簡易' : '完整')].forEach((o, i) => txt((G.pauseSel === i ? '▶ ' : '　') + o, 120, 72 + i * 15, 10, G.pauseSel === i ? '#ffe36a' : '#ddd'));
  txt('能力：水槍' + ['charge', 'djump', 'dash'].filter(k => G.abilities[k]).map(k => '、' + ABILITIES[k].name).join(''), 200, 140, 8, '#9ff3ff', 'center');
  txt('Z 跳　X 射擊　C 衝刺　A 絕招　↑ 對話', 200, 156, 8, '#aab', 'center');
  txt('清潔度 ' + Math.floor(G.clean / G.level.total * 100) + '%　馴服狗狗 ' + G.tamed, 200, 170, 8, '#fff', 'center');
}

// ---------- 主繪製 ----------
function render() {
  sctx.imageSmoothingEnabled = false;
  const m = G.mode;
  if (m === 'lazy') return drawLoading(loop2Progress());
  if (m === 'boot' || m === 'title' || m === 'help') return drawTitle();
  if (m === 'select') return drawSelect();
  if (m === 'stageCard') return drawStageCard();
  if (m === 'getAbility') return drawGetAbility();
  if (m === 'credits') return drawCredits();
  if (m === 'slogan') return drawSlogan();
  if (m === 'cert') return drawCertScreen();
  if (m === 'ending' || m === 'story') {
    if (m === 'ending') drawEnding();
    else { sctx.fillStyle = '#0b0d1e'; sctx.fillRect(0, 0, screen.width, screen.height); const im = IMG.bg1; if (im) { sctx.globalAlpha = 0.55; sctx.drawImage(im, 0, -14 * K, im.width * 250 / im.height * K, 250 * K); sctx.globalAlpha = 1; } txt('序章', 200, 20, 18, '#ffe36a', 'center'); txt('某個城市的社區，最近到處都是狗大便……', 200, 50, 10, '#fff', 'center'); }
    drawDialog(); return;
  }
  if (!G.level) return;
  drawWorld();
  // 特寫鏡頭：對話時朝說話者拉近
  let z = { x: 0, y: 0, w: VW, h: VH };
  let tk = 1, fx = 200, fy = 112;
  if (G.dialog && (m === 'npcTalk' || m === 'bossIntro' || m === 'bossDown' || m === 'play' || m === 'boss')) {
    tk = 1.28;
    const who = G.dialog.who;
    const tgt = who === 'hero' ? G.player : (G.boss && who === G.boss.kind) ? G.boss : G.talkTarget || G.player;
    fx = tgt.cx - G.camX; fy = tgt.y + 10;
  }
  G.zoom.k += (tk - G.zoom.k) * 0.12; G.zoom.x += (fx - G.zoom.x) * 0.12; G.zoom.y += (fy - G.zoom.y) * 0.12;
  if (G.zoom.k > 1.005) { const w = VW / G.zoom.k, h = VH / G.zoom.k; z = { x: clamp(G.zoom.x - w / 2, 0, VW - w), y: clamp(G.zoom.y - h / 2 - 12, 0, VH - h), w, h }; }
  G.zc = z;
  const sh = G.shake ? [rnd(-G.shake, G.shake), rnd(-G.shake, G.shake)] : [0, 0];
  sctx.fillStyle = '#000'; sctx.fillRect(0, 0, screen.width, screen.height);
  sctx.drawImage(buf, z.x * RS, z.y * RS, z.w * RS, z.h * RS, sh[0] * K, sh[1] * K, VW * K, VH * K);
  if (G.flash > 0) { sctx.fillStyle = `rgba(255,255,255,${G.flash / 14})`; sctx.fillRect(0, 0, screen.width, screen.height); }
  // 電影黑邊
  const lbT = G.dialog || m === 'bossIntro' || m === 'gate' || m === 'absorb' || m === 'bossDown' ? 1 : 0;
  G.letterbox += (lbT - G.letterbox) * 0.15;
  if (G.letterbox > 0.01) { sctx.fillStyle = '#000'; sctx.fillRect(0, 0, screen.width, 16 * K * G.letterbox); sctx.fillRect(0, screen.height - 16 * K * G.letterbox, screen.width, 16 * K * G.letterbox); }
  drawTexts(); drawCameoSay(); if (typeof drawIntruderSay === 'function') drawIntruderSay(); drawHeroSay();
  if (m !== 'ultra' && G.letterbox < 0.5) { drawHUD(); drawTip(); }
  else if (G.boss && !G.boss.defeated && SPR.has('hud_hp')) { hudBarV(4, 4, G.player.hp, G.player.maxHp, '#ffd23f'); hudBarV(20, 4, G.boss.hp, G.boss.maxHp, '#ff5a8a'); } // 放大絕時魔王血條不消失，看得到扣多少
  if (G.warnT > 0 && (G.warnT >> 3) % 2) { sctx.fillStyle = 'rgba(200,0,30,0.35)'; sctx.fillRect(0, 0, VW * K, VH * K); if (!uiImg('ui_warning', 200, 104, 300)) { sctx.fillStyle = 'rgba(200,0,30,0.75)'; sctx.fillRect(0, 90 * K, VW * K, 40 * K); txt('⚠ WARNING ⚠', 200, 96, 18, '#fff', 'center', '#600'); } txt(G.level.def.bossName + ' 出現！', 200, 136, 10, '#ffe', 'center', '#600'); }
  if (m === 'ready' && (G.readyT >> 3) % 2) { if (!uiImg('ui_ready', 200, 104, 130)) txt('READY', 200, 100, 20, '#fff', 'center'); }
  if (m === 'bossDown' && G.winPose) uiImg('ui_clear', 200, 70, 260, Math.min(1, (G.t % 1000) / 10));
  if (G.player.dead && G.player.deadT > 60) txt('再試一次！', 200, 100, 14, '#fff', 'center');
  drawCutin();
  if (G.ultraStamp > 0) { G.ultraStamp--; const k = G.ultraStamp > 60 ? 1 + (G.ultraStamp - 60) * 0.12 : 1; sctx.save(); sctx.translate(200 * K, 70 * K); sctx.scale(k, k); sctx.rotate(-0.06); sctx.translate(-200 * K, -70 * K); if (G.char === 'witch') txt('流星雨魔法！！', 200, 58, 22, '#ffd0f2', 'center', '#5a1a6a'); else if (!uiImg('ui_ultimate', 200, 70, 240, Math.min(1, G.ultraStamp / 15))) txt('全城大掃除！！', 200, 58, 22, '#ffe36a', 'center', '#7a1d00'); sctx.restore(); }
  drawDialog();
  if (m === 'pause') drawPause();
  if (toastMsg) { const w = 300; box(50, 40, w, 20, 'rgba(10,12,28,0.92)', '#ffd23f'); txt(toastMsg.m, 200, 45, 9, '#fff', 'center', null); }
}
function renderToast() { if (toastMsg && (G.mode === 'title' || G.mode === 'select')) { box(50, 186, 300, 20, 'rgba(10,12,28,0.92)', '#ffd23f'); txt(toastMsg.m, 200, 191, 9, '#fff', 'center', null); } }

// ---------- 主迴圈 ----------
PX.build();
SPR.load();
let last = performance.now(), acc = 0;
function loop(now) {
  requestAnimationFrame(loop); // 先排下一格：就算這格出錯，遊戲也不會卡死
  acc += Math.min(100, now - last); last = now;
  let steps = 0;
  try { while (acc >= 1000 / 60 && steps < 4) { update(); acc -= 1000 / 60; steps++; } } catch (e) { acc = 0; console.error('update', e); }
  try { render(); renderToast(); } catch (e) { console.error('render', e); }
}
syncAbilities();
// 測試用網址參數：?stage=2&boss=1&all=1
if (QS.has('stage')) {
  const n = +QS.get('stage');
  if (n >= 5) { G.loop = 2; startLoop2Load(); }
  if (QS.has('witch')) { G.char = 'witch'; startLoop2Load(); }
  if (QS.has('hard')) G.hard = true;
  if (QS.has('abil')) { save.cleared = [1, 2, 3].filter(i => i < n || QS.get('abil') === 'all'); syncAbilities(); }
  loadLevel(n); G.mode = 'play'; G.abilities = { charge: true, djump: n > 2 || QS.has('abil'), dash: n > 3 || QS.has('abil') };
  if (QS.has('boss')) { G.clean = G.level.total; const P = G.player; P.x = (G.level.gateX - 3) * TS; G.camX = camMax(); }
  if (QS.has('ultra')) G.ultra = 100;
}
document.fonts && document.fonts.load('10px Cubic11').catch(() => {});
requestAnimationFrame(loop);
