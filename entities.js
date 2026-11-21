// ===== 實體：主角、小怪、道具、子彈、粒子 =====
const TS = 16, VW = 400, VH = 225;
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

// ---------- 特效門面：優先用 00GameDevs 特效庫，沒有 WebGL / 用 file:// 開啟時改用像素粒子 ----------
const FB = { burst: '#7fe6ff', zap: '#ffe36a', explode: '#ff8a2a', wave: '#5fd8ff', puff: '#d6d3e6', shock: '#e8c999', heal: '#ff9fc8', healfield: '#86e9b2', venom: '#a6c24a', steam: '#b8d27a', air: '#ff9a40', dust: '#dcbb87', thunder: '#c98aff', star: '#fff2a8', gold: '#ffd166', converge: '#c1b8ff', relic: '#f5cc75', fireball: '#ff7a24', meteor: '#ff7a24', ink: '#222', gate: '#c1b8ff', arrows: '#9fd0ff', hole: '#ffab42', warn: '#ff303e' };
// 自製像素特效（特效庫在 2D 畫面上位置對不準，改用自己畫的）
function cloud(x, y, vx, vy, r0, r1, life, c, g = 0) { G.parts.push({ x, y, vx, vy, life, max: life, c, s: 1, g, cloud: true, r0, r1 }); }
function ring(x, y, r0, r1, life, c, flat = 0.4) { G.parts.push({ x, y, vx: 0, vy: 0, life, max: life, c, s: 1, g: 0, ring: true, r0, r1, flat }); }
function fcPop(x, y, k = 1) { G.parts.push({ x, y, vx: 0, vy: 0, life: 16, max: 16, c: '#ffffff', s: 1, g: 0, fc: true, k }); } // FC 洛克人式白色爆散
function FX(name, x, y, o = {}) {
  const sz = (o.opts && o.opts.size) || 0.4, col = (o.opts && o.opts.color) || FB[name] || '#fff', k = sz / 0.4;
  switch (name) {
    case 'puff': case 'air':
      for (let i = 0; i < 7; i++) { const a = i / 7 * 6.28; cloud(x, y, Math.cos(a) * 0.9 * k, Math.sin(a) * 0.6 * k - 0.2, 2, 6 * k, 22, i % 2 ? col : '#ffffff'); }
      return null;
    case 'explode':
      cloud(x, y, 0, 0, 4 * k, 14 * k, 8, '#fffbe0');
      for (let i = 0; i < 8; i++) { const a = rnd(0, 6.28), s = rnd(0.6, 1.6) * k; cloud(x, y, Math.cos(a) * s, Math.sin(a) * s - 0.3, 3 * k, 8 * k, rnd(18, 28), i % 3 ? '#ff9a3a' : '#8a8494'); }
      sparks(x, y, '#ffe36a', 10, 2.5 * k, 0.1); return null;
    case 'venom': case 'steam': case 'ink':
      for (let i = 0; i < 8; i++) { const a = rnd(Math.PI, Math.PI * 2); G.parts.push({ x, y: y - 2, vx: Math.cos(a) * rnd(0.5, 1.8) * k, vy: Math.sin(a) * rnd(1, 2.6) * k, life: 26, max: 26, c: i % 2 ? col : '#d9e88a', s: 2.5, g: 0.15 }); }
      for (let i = 0; i < 3; i++) cloud(x + rnd(-6, 6) * k, y - 3, rnd(-0.3, 0.3), -0.4, 2, 6 * k, 30, name === 'ink' ? '#333' : col);
      return null;
    case 'wave':
      ring(x, y, 2, 16 * k, 16, '#bff4ff');
      for (let i = 0; i < 12; i++) G.parts.push({ x: x + rnd(-4, 4), y: y - 2, vx: rnd(-1.6, 1.6) * k, vy: rnd(-3.2, -1.4) * k, life: 30, max: 30, c: i % 3 ? '#5fd8ff' : '#ffffff', s: 2.5, g: 0.18 });
      return null;
    case 'heal': case 'healfield': case 'star': case 'converge': case 'relic': case 'gold':
      for (let i = 0; i < 12; i++) G.parts.push({ x: x + rnd(-10, 10) * k, y: y - rnd(0, 20) * k, vx: 0, vy: -rnd(0.4, 1.2), life: rnd(24, 40), max: 40, c: i % 3 ? col : '#ffffff', s: 2, g: 0, dot: true });
      if (name !== 'heal') ring(x, y, 2, 20 * k, 20, col);
      return null;
    case 'dust': case 'shock':
      for (let i = 0; i < 8; i++) { const d = i % 2 ? 1 : -1; cloud(x + d * rnd(0, 6), y - 2, d * rnd(0.8, 2.2) * k, -rnd(0, 0.4), 2, 6 * k, 24, i % 3 ? '#dcbb87' : '#f4e6c8'); }
      if (name === 'shock') ring(x, y, 4, 30 * k, 18, '#f4e6c8', 0.25);
      return null;
    case 'warn':
      G.parts.push({ x, y, vx: 0, vy: 0, life: 70, max: 70, c: '#ff303e', s: 1, g: 0, warn: true, r0: 22 * k }); return null;
    case 'thunder': case 'zap':
      cloud(x, y, 0, 0, 3, 12 * k, 8, '#fff6c0'); sparks(x, y, col, 12, 3, 0); return null;
    case 'hole': case 'gate':
      ring(x, y, 4, 30 * k, 40, col, 1); ring(x, y, 2, 20 * k, 50, '#ffffff', 1); sparks(x, y, col, 14, 2, 0); return null;
  }
  const c = FB[name] || '#fff', n = { burst: 12, zap: 8, explode: 24, wave: 18, puff: 10, shock: 20, gold: 30, converge: 40, star: 40, fireball: 30, meteor: 24 }[name] || 14;
  const big = ['converge', 'star', 'gold', 'fireball', 'relic', 'hole'].includes(name);
  for (let i = 0; i < n; i++) {
    const a = rnd(0, Math.PI * 2), s = rnd(0.5, big ? 4 : 2.4);
    G.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - (name === 'steam' || name === 'heal' ? 1.5 : 0), life: rnd(18, big ? 60 : 32), max: 40, c: i % 3 ? c : '#ffffff', s: rnd(1, big ? 4 : 3), g: name === 'wave' || name === 'shock' ? 0.12 : 0 });
  }
  return null;
}
function fxStop(h) { if (h && window.VFX) window.VFX.stop(h); }
function fxHit(h) { if (h && window.VFX) window.VFX.hit(h); }
function sparks(x, y, c, n = 8, sp = 2, g = 0.1) { for (let i = 0; i < n; i++) { const a = rnd(0, Math.PI * 2), s = rnd(0.4, sp); G.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 0.6, life: rnd(14, 28), max: 28, c, s: rnd(1, 2.5), g }); } }
function floatText(x, y, text, color = '#fff', big = false) {
  if (G.texts.some(t => t.text === text && Math.abs(t.x - x) < 70 && t.life > 30)) return; // 同樣的字不要疊在一起
  G.texts.push({ x, y, text, color, life: 60, big }); }

// ---------- 地圖碰撞 ----------
function tileAt(tx, ty) { const L = G.level; if (ty < 0) return '.'; if (tx < 0 || tx >= L.w || ty >= L.h) return ty >= L.h ? '.' : '#'; return L.t[ty][tx]; }
function isSolid(tx, ty) {
  const c = tileAt(tx, ty);
  if (c === '#' || c === '=' || c === '^') return true;
  if (c === 'G') return !G.level.gateOpen;
  if (c === 'Y') return G.level.yokuOn(tx, ty);
  return false;
}
function isLadder(tx, ty) { return tileAt(tx, ty) === 'H'; }
function isOneWay(tx, ty) { const c = tileAt(tx, ty); return c === '-' || (c === 'H' && tileAt(tx, ty - 1) !== 'H'); }

function moveBody(e, opts = {}) {
  // 水平
  e.x += e.vx;
  let hitWall = false;
  const top = Math.floor(e.y / TS), bot = Math.floor((e.y + e.h - 1) / TS);
  if (e.vx > 0) { const tx = Math.floor((e.x + e.w - 1) / TS); for (let ty = top; ty <= bot; ty++) if (isSolid(tx, ty)) { e.x = tx * TS - e.w; hitWall = true; break; } }
  else if (e.vx < 0) { const tx = Math.floor(e.x / TS); for (let ty = top; ty <= bot; ty++) if (isSolid(tx, ty)) { e.x = (tx + 1) * TS; hitWall = true; break; } }
  if (e.x < 0) { e.x = 0; hitWall = true; }
  // 垂直
  const prevBot = e.y + e.h;
  e.y += e.vy;
  e.onGround = false; e.onSpike = false; e.platform = null;
  const l = Math.floor(e.x / TS), r = Math.floor((e.x + e.w - 1) / TS);
  if (e.vy >= 0) {
    // 用腳底（不減 1）判斷，才不會每隔幾格「離地」造成角色抖動
    const ty = Math.floor((e.y + e.h) / TS);
    for (let tx = l; tx <= r; tx++) {
      const solid = isSolid(tx, ty);
      const ow = !solid && !opts.noOneWay && isOneWay(tx, ty) && prevBot <= ty * TS + 1 && e.y + e.h >= ty * TS;
      if (solid || ow) { e.y = ty * TS - e.h; e.vy = 0; e.onGround = true; if (tileAt(tx, ty) === '^') e.onSpike = true; break; }
    }
    if (!e.onGround) for (const p of G.platforms) {
      if (e.x + e.w > p.x && e.x < p.x + p.w && prevBot <= p.y + 2 && e.y + e.h >= p.y) { e.y = p.y - e.h; e.vy = 0; e.onGround = true; e.platform = p; break; }
    }
  } else if (e.vy < 0) {
    const ty = Math.floor(e.y / TS);
    for (let tx = l; tx <= r; tx++) if (isSolid(tx, ty)) { e.y = (ty + 1) * TS; e.vy = 0; break; }
  }
  return hitWall;
}
function groundAhead(e, dir) { const tx = Math.floor((dir > 0 ? e.x + e.w + 1 : e.x - 1) / TS), ty = Math.floor((e.y + e.h + 2) / TS); return isSolid(tx, ty) || isOneWay(tx, ty); }
function wallAhead(e, dir) { const tx = Math.floor((dir > 0 ? e.x + e.w + 1 : e.x - 1) / TS), ty = Math.floor((e.y + e.h - 4) / TS); return isSolid(tx, ty); }

// ---------- 主角 ----------
class Player {
  constructor(x, y) { this.w = 14; this.h = 30; this.reset(x, y); }
  reset(x, y) {
    Object.assign(this, { x: x - 7, y: y - 30, h: 30, crouch: false, idleT: 0, vx: 0, vy: 0, face: 1, hp: 28, maxHp: 28, inv: 0, hurtT: 0, dashT: 0, dashCd: 0, airDash: true, djump: true, climbing: false,
      shootT: 0, charge: 0, anim: 0, onGround: false, dead: false, slipT: 0, frozen: false, chargeFx: null, landed: true, deadT: 0 });
  }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
  hurt(dmg, fromX, msg) {
    if (this.inv > 0 || this.dead || G.mode === 'ready' || this.dashT > 0 && G.abilities.dash) return false;
    this.hp -= dmg; Audio8.sfx('hurt'); G.shake = 6;
    if (msg) floatText(this.cx, this.y - 6, msg, '#ff8a8a');
    this.climbing = false; this.charge = 0;
    if (this.hp <= 0) { this.die(); return true; }
    this.hurtT = 18; this.inv = 110; this.vx = (this.cx < fromX ? -1 : 1) * 1.2; this.vy = -2;
    sparks(this.cx, this.cy, '#ff8a8a', 6, 1.6, 0.1);
    return true;
  }
  die() {
    if (this.dead) return; this.dead = true; this.hp = 0; this.deadT = 0; Audio8.stopMusic(); Audio8.sfx('death');
    // 兩圈光點往外擴散、由大變小（洛克人式）
    for (let ring = 0; ring < 2; ring++) for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2 + ring * Math.PI / 8, s = ring ? 1.1 : 2.2;
      G.parts.push({ x: this.cx, y: this.cy, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 130, max: 130, c: ring ? '#7fe6ff' : '#ffffff', s: 10, g: 0, orb: true });
    }
    FX('converge', this.cx, this.cy);
  }
  update() {
    const I = G.input, A = G.abilities;
    if (this.dead) { this.deadT++; return; }
    if (this.inv > 0) this.inv--;
    if (this.dashCd > 0) this.dashCd--;
    this.anim++;
    if (this.frozen) { this.vx = 0; this.vy = Math.min(this.vy + 0.25, 6); moveBody(this); this.shootT = 0; return; }
    // 受傷硬直
    if (this.hurtT > 0) { this.hurtT--; this.vy = Math.min(this.vy + 0.25, 6); moveBody(this); this.vx *= 0.9; return; }
    // 梯子
    const ltx = Math.floor(this.cx / TS);
    const onLadderTile = isLadder(ltx, Math.floor((this.y + this.h - 4) / TS)) || isLadder(ltx, Math.floor(this.y / TS + 0.5));
    const belowLadder = isLadder(ltx, Math.floor((this.y + this.h + 2) / TS));
    if (!this.climbing && I.held.up && onLadderTile && this.dashT === 0) { this.climbing = true; this.x = ltx * TS + 8 - this.w / 2; }
    if (!this.climbing && I.held.down && this.onGround && belowLadder && !isSolid(ltx, Math.floor((this.y + this.h + 2) / TS))) { this.climbing = true; this.x = ltx * TS + 8 - this.w / 2; this.y += 4; }
    if (this.climbing) {
      this.vx = 0; this.vy = 0;
      if (!this.shootT) { if (I.held.up) this.vy = -1.2; else if (I.held.down) this.vy = 1.2; }
      if (I.held.left) this.face = -1; if (I.held.right) this.face = 1;
      this.y += this.vy;
      const stillOn = isLadder(ltx, Math.floor((this.y + this.h - 1) / TS)) || isLadder(ltx, Math.floor((this.y + 8) / TS));
      if (!stillOn) { // 爬到頂端
        this.climbing = false;
        if (this.vy < 0) { const ty = Math.floor((this.y + this.h) / TS); this.y = ty * TS - this.h; this.onGround = true; }
      }
      const fy = Math.floor((this.y + this.h) / TS);
      if (this.vy > 0 && isSolid(ltx, fy)) { this.climbing = false; this.y = fy * TS - this.h; }
      if (I.pressed.jump) { this.climbing = false; this.vy = 0; }
      this.doShoot(I, A);
      return;
    }
    // 衝刺
    if (A.dash && I.pressed.dash && this.dashT === 0 && this.dashCd === 0 && (this.onGround || this.airDash)) {
      this.dashT = 20; if (!this.onGround) this.airDash = false; Audio8.sfx('dash');
      FX('dust', this.cx - this.face * 18, this.y + this.h, { opts: { size: 0.3 } });
    }
    let speed = 1.5;
    if (I.held.left || I.held.right || I.held.jump || I.held.shoot || !this.onGround) this.idleT = 0; else this.idleT++;
    this.runT = (I.held.left || I.held.right) && this.onGround ? (this.runT || 0) + 1 : 0;
    if (this.dashT > 0) {
      this.dashT--; this.vx = this.face * 3.4; this.vy = this.onGround ? this.vy : Math.min(this.vy, 0.2);
      if (this.anim % 3 === 0) G.parts.push({ x: this.cx - this.face * 14, y: this.y + this.h - 3, vx: -this.face * 0.8, vy: -0.3, life: 18, max: 18, c: '#e8dcc0', s: 3, g: 0 });
      if (I.pressed.jump && this.onGround) { this.dashT = 0; this.dashJump = true; this.vy = -6; Audio8.sfx('jump'); }
      if (!this.dashT) this.dashCd = 8;
    } else {
      const sp = this.dashJump ? 2.6 : speed;
      // 蹲下：按 ↓ 就蹲（身體變矮可躲攻擊）；放開且頭上有空間才站起來
      const wantCrouch = I.held.down && this.onGround && this.slipT === 0;
      if (wantCrouch && !this.crouch) { this.crouch = true; this.y += 10; this.h = 20; }
      if ((!wantCrouch || I.pressed.jump) && this.crouch) {
        const tl = Math.floor(this.x / TS), tr = Math.floor((this.x + this.w - 1) / TS), ty = Math.floor((this.y - 10) / TS);
        if (!isSolid(tl, ty) && !isSolid(tr, ty)) { this.crouch = false; this.y -= 10; this.h = 30; }
      }
      if (this.crouch) { this.vx = 0; if (I.held.left) this.face = -1; if (I.held.right) this.face = 1; }
      else if (this.slipT > 0) { this.slipT--; this.vx *= 0.97; }
      else if (I.held.left) { this.vx = -sp; this.face = -1; }
      else if (I.held.right) { this.vx = sp; this.face = 1; }
      else this.vx = 0;
      // 跳躍
      if (I.pressed.jump) {
        if (this.onGround && !this.crouch) { this.vy = -6; Audio8.sfx('jump'); }
        else if (A.djump && this.djump) { this.djump = false; this.vy = -4.6; Audio8.sfx('djump'); FX('puff', this.cx, this.y + this.h, { opts: { color: '#ff9ae6', size: 0.4 } }); for (let i = 0; i < 6; i++) G.parts.push({ x: this.cx + rnd(-6, 6), y: this.y + this.h, vx: rnd(-1, 1), vy: rnd(0.5, 1.5), life: 24, max: 24, c: '#ffc8f0', s: 3, g: 0, bubble: true }); }
      }
      if (!I.held.jump && this.vy < -1.5) this.vy = -1.5;
      this.vy = Math.min(this.vy + 0.25, 6);
    }
    const wasGround = this.onGround;
    if (this.platform) this.x += this.platform.dx;
    moveBody(this);
    if (this.landT > 0) this.landT--;
    if (this.onGround) { this.djump = true; this.airDash = true; this.dashJump = false; if (!wasGround) { this.landT = 5; Audio8.sfx('land'); sparks(this.cx, this.y + this.h, '#e8dcc0', 4, 1, 0.05); } }
    if (this.onSpike) this.hurt(3, this.cx + this.face, '好痛！');
    if (this.y > G.level.h * TS + 20) { this.hp = 0; this.die(); }
    this.doShoot(I, A);
  }
  doShoot(I, A) {
    if (this.shootT > 0) this.shootT--;
    if (this.lowT > 0) this.lowT--;
    const fire = lvl => {
      const myShots = G.bullets.filter(b => !b.big && !b.dead && !b.wkind).length;
      if (lvl === 0 && (G.weapon || 'water') === 'water' && myShots >= 3 + (G.gunLv || 0)) return;
      const hasSpr = SPR.has('h_shoot');
      const low = this.crouch && !this.climbing;
      const bx = this.cx + this.face * (hasSpr ? 20 : 16), by = this.y + (low ? 9 :hasSpr ? (this.dashT > 0 ? 16 : 10) : (this.climbing ? 11 : this.dashT > 0 ? 17 : 15) + (this.onGround || this.climbing ? 0 : -2));
      if (low) this.lowT = 16;
      const wk = G.weapon || 'water';
      if (wk !== 'water') { // 魔王武器：點按＝一般；集氣放開＝集氣版（耗兩倍能量）
        const W = WEAPONS[wk], ch = lvl === 2, cost = W.cost * (ch ? 2 : 1);
        if (lvl === 1) return; // 半集氣不另外發射（按下時已經射過一發）
        if ((G.ammo[wk] || 0) < cost) { Audio8.sfx('clink'); floatText(this.cx, this.y - 6, '武器能量不足！沖便便或撿清潔劑補充', '#ff8a8a'); return; }
        G.ammo[wk] -= cost; this.shootT = 16;
        if (wk === 'bubble') for (let i = 0; i < (ch ? 5 : 3); i++) G.bullets.push(new WBullet('bubble', bx, by - 2, this.face, i, ch));
        else G.bullets.push(new WBullet(wk, bx, by, this.face, 0, ch));
        Audio8.sfx(wk === 'bag' ? 'throw' : wk === 'bubble' ? 'djump' : 'dash');
        if (ch) { Audio8.sfx('bigshot'); G.shake = 4; sparks(bx, by, W.color, 10, 2.2, 0); floatText(this.cx, this.y - 8, '集氣' + W.name + '！', W.color); }
        return;
      }
      G.bullets.push(new Bullet(bx, by, this.face, lvl));
      this.shootT = 16;
      if (lvl) { Audio8.sfx('bigshot'); G.shake = 3; sparks(bx, by, '#bff4ff', 8, 2, 0); } else Audio8.sfx('shoot');
    };
    if (I.pressed.shoot) fire(0);
    if (A.charge) {
      if (I.held.shoot) {
        this.charge++;
        if (this.charge === 22) Audio8.sfx('charge1');
        if (this.charge > 22 && this.charge % (this.charge >= 52 ? 6 : 10) === 0) Audio8.sfx(this.charge >= 52 ? 'charge2' : 'charge1');
        // FC 洛克人式集氣：小光點從外圈慢慢往身上聚集
        if (this.charge > 8 && this.anim % 3 === 0) {
          const full = this.charge >= 52, wc = G.weapon && G.weapon !== 'water' ? WEAPONS[G.weapon].color : '#8ff0ff';
          for (let n = 0; n < (full ? 2 : 1); n++) {
            const a = rnd(0, 6.28), r = rnd(24, 34), sp = full ? 1.3 : 0.9;
            G.parts.push({ x: this.cx + Math.cos(a) * r, y: this.cy - 2 + Math.sin(a) * r, vx: -Math.cos(a) * sp, vy: -Math.sin(a) * sp, life: Math.round(r / sp) - 2, max: Math.round(r / sp), c: full ? (n ? '#fff6a0' : '#ffffff') : wc, s: 1.6, g: 0, dot: true });
          }
        }
      } else if (this.charge > 0) {
        if (this.charge >= 52) fire(2); else if (this.charge >= 22) fire(1);
        this.charge = 0;
      }
    }
  }
  sprite() {
    const S = PX.S;
    let k;
    const sh = this.shootT > 0 ? 'S' : '';
    if (this.dead) return null;
    if (this.hurtT > 0) k = 'hurt';
    else if (this.climbing) k = this.shootT > 0 ? 'climbS' : ('climb' + (Math.floor(this.y / 8) % 2));
    else if (this.frozen && G.winPose) k = 'win';
    else if (this.dashT > 0) k = 'dash' + sh;
    else if (!this.onGround) k = 'jump' + sh;
    else if (Math.abs(this.vx) > 0.1 && this.slipT === 0) k = 'run' + (Math.floor(this.anim / 6) % 4) + sh;
    else k = sh ? 'standS' : (Math.floor(this.anim / 40) % 2 ? 'stand2' : 'stand');
    return k;
  }
  sprKey() {
    if (this.hurtT > 0) return this.hurtT > 12 ? 'h_hurt' : 'h_stagger';
    if (this.crouch) return this.lowT > 0 || this.shootT > 0 ? 'h_charge' : 'h_j0';
    if (this.climbing) return 'h_climb0';
    if (this.frozen && G.winPose) return 'h_win';
    if (this.dashT > 0) return 'h_dash';
    if (!this.onGround) return this.vy < -2 ? 'h_j1' : this.vy < 1.5 ? 'h_j2' : 'h_j3';
    if (this.landT > 0) return 'h_j4';
    if (Math.abs(this.vx) > 0.1 && this.slipT === 0) return 'h_run' + (Math.floor(this.anim / 4) % 8);
    if (this.slipT > 0) return 'h_stagger';
    if (this.hp < 8 && this.idleT > 60) return 'h_stagger';
    if (this.lowT > 0) return 'h_charge';
    if (this.shootT > 0) return 'h_shoot';
    return Math.floor(this.anim / 40) % 2 ? 'h_idle0' : 'h_idle1';
  }
  draw(ctx, cx) {
    if (this.dead) return;
    if (this.inv > 0 && Math.floor(this.inv / 3) % 2 && this.hurtT === 0) return;
    const sk = this.sprKey();
    if (SPR.has(sk)) {
      // 集氣閃光：第一段慢閃藍光；集滿快速輪流閃白／黃光
      const ch = this.charge, full = ch >= 52, lv1 = ch >= 22;
      const ph = full ? Math.floor(ch / 2) % 3 : Math.floor(ch / 6) % 2;
      const flashW = lv1 && (full ? ph !== 0 : ph === 1);
      const glowCol = full ? (ph === 1 ? '#ffffff' : '#ffe36a') : '#7fe6ff';
      // 爬梯：每爬一步左右鏡像一次 → 左右手、左右腳交替
      const step = Math.floor(this.y / 6) % 2;
      const flip = this.climbing ? (this.shootT > 0 ? this.face : step ? -1 : 1) : this.face, dx = this.cx - cx, dy = this.y + this.h + 1 - (G.ultraLift || 0);
      if (this.dashT > 0) SPR.draw(ctx, sk, dx - this.face * 9, dy, flip, false, 0.35);
      if (lv1) { ctx.save(); ctx.shadowColor = glowCol; ctx.shadowBlur = full ? 10 : 6; SPR.draw(ctx, sk, dx, dy, flip, false); ctx.restore(); }
      else SPR.draw(ctx, sk, dx, dy, flip, false);
      if (flashW) SPR.draw(ctx, sk, dx, dy, flip, true, full ? (ph === 1 ? 0.75 : 0.45) : 0.4);
      else if (G.heroGlow > 0 && (G.t >> 2) % 2) SPR.draw(ctx, sk, dx, dy, flip, true, 0.55);
      if (full && ph === 2) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35; SPR.draw(ctx, sk, dx, dy, flip, true); ctx.restore(); }
      return;
    }
    const k = this.sprite();
    const flashW = this.charge > 30 && Math.floor(this.charge / (this.charge > 70 ? 2 : 4)) % 2;
    const img = (flashW ? PX.S['heroW_' + k] : PX.S['hero_' + k]);
    const flip = this.climbing && !this.shootT ? (Math.floor(this.y / 8) % 2 ? -1 : 1) : this.face;
    const dx = Math.round(this.cx - cx), dy = Math.round(this.y + this.h);
    ctx.save(); ctx.translate(dx, dy); ctx.scale(flip, 1);
    if (flashW) { ctx.globalAlpha = 1; ctx.drawImage(PX.S['hero_' + k], -16, -37); ctx.globalAlpha = 0.55; ctx.drawImage(img, -16, -37); }
    else ctx.drawImage(img, -16, -37);
    ctx.restore();
    if (this.dashT > 0) { ctx.globalAlpha = 0.3; ctx.save(); ctx.translate(dx - this.face * 8, dy); ctx.scale(this.face, 1); ctx.drawImage(PX.S['hero_' + k], -16, -37); ctx.restore(); ctx.globalAlpha = 1; }
  }
}

// ---------- 水彈 ----------
class Bullet {
  constructor(x, y, dir, lvl) {
    this.lvl = lvl; this.dir = dir; this.big = lvl > 0;
    const gl = G.gunLv || 0, k = 1 + gl * 0.22; this.gl = gl;   // 每打倒一個魔王，水槍變大變強
    const sz = [[8, 6], [14, 10], [22, 16]][lvl];
    this.w = Math.round(sz[0] * k); this.h = Math.round(sz[1] * k); this.x = x - this.w / 2; this.y = y - this.h / 2;
    this.vx = dir * (lvl ? 5 : 4.5 + gl * 0.3); this.dmg = [2, 4, 7][lvl] + (gl >= 2 ? 1 : 0) + (gl >= 3 && lvl ? 1 : 0); this.pierce = lvl === 2; this.hitSet = new Set(); this.t = 0;
    this.fx = null; // 集氣砲只用 GPT 水球圖，不加 3D 拖尾
  }
  get cx() { return this.x + this.w / 2; }
  update() {
    this.x += this.vx; this.t++;
    if (this.fx) { this.fx.wx = this.cx; this.fx.wy = this.y + this.h / 2; }
    const sx = this.x - G.camX;
    if (sx < -40 || sx > VW + 40) this.kill(false);
    if (isSolid(Math.floor(this.cx / TS), Math.floor((this.y + this.h / 2) / TS))) { this.kill(true); }
  }
  kill(splash) {
    if (this.dead) return; this.dead = true;
    if (this.fx) { fxHit(this.fx); }
    if (splash) { sparks(this.cx, this.y + this.h / 2, '#9fe9ff', this.big ? 12 : 5, 1.6, 0.15);  }
  }
  hitEnemy(e) {
    if (this.hitSet.has(e)) return false;
    this.hitSet.add(e);
    if (!this.pierce) this.kill(true);
    return true;
  }
  draw(ctx, cx) {
    const x = Math.round(this.x - cx), y = Math.round(this.y), w = this.w, h = this.h;
    const gs = SPR.f[this.lvl === 0 ? 'it_drop' : 'it_orb'];
    if (gs) {
      const sc = this.lvl === 0 ? (1 + this.gl * 0.25) : this.lvl === 2 ? 1.35 : 0.85, dw = gs.w * sc, dh = gs.h * sc;
      ctx.save(); ctx.translate(x + w / 2, y + h / 2); if (this.dir < 0) ctx.scale(-1, 1);
      if (this.lvl && (this.t >> 1) % 2) ctx.globalAlpha = 0.85;
      ctx.drawImage(gs.img, -dw / 2, -dh / 2, dw, dh); ctx.restore(); return;
    }
    if (this.lvl === 0) {
      ctx.fillStyle = '#16111f'; ctx.fillRect(x, y + 1, w, h - 2); ctx.fillRect(x + 1, y, w - 2, h);
      ctx.fillStyle = ['#3fb7ff', '#3fe0ff', '#7ad7ff', '#ffe36a'][this.gl] || '#3fb7ff'; ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
      ctx.fillStyle = '#bff4ff'; ctx.fillRect(x + (this.dir > 0 ? w - 4 : 2), y + 2, 2, 2);
    } else {
      const pulse = (this.t >> 1) % 2;
      ctx.fillStyle = '#16111f'; ctx.beginPath(); ctx.ellipse(x + w / 2, y + h / 2, w / 2 + 1, h / 2 + 1, 0, 0, 7); ctx.fill();
      ctx.fillStyle = pulse ? '#3fb7ff' : '#62d4ff'; ctx.beginPath(); ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#e8fbff'; ctx.beginPath(); ctx.ellipse(x + w / 2 + this.dir * 2, y + h / 2 - 1, w / 4, h / 4, 0, 0, 7); ctx.fill();
    }
  }
}

// ---------- 魔王武器子彈 ----------
class WBullet {
  constructor(kind, x, y, dir, i, charged) {
    // k = 顯示／判定放大倍率：一般 1.7 倍，集氣 2.6 倍
    this.wkind = kind; this.dir = dir; this.t = 0; this.lvl = charged ? 2 : 1; this.big = true; this.hitSet = new Set();
    this.ch = !!charged; const k = this.k = charged ? 2.6 : 1.7;
    if (kind === 'bag') { this.w = 10 * k; this.h = 10 * k; this.vx = dir * (charged ? 3 : 2.6); this.vy = -4.2; this.dmg = charged ? 7 : 3; }
    else if (kind === 'bubble') { this.w = 10 * k; this.h = 10 * k; this.vx = dir * (1.4 + i * 0.5); this.vy = -0.4 - (i - (charged ? 1 : 0)) * 0.45; this.dmg = charged ? 4 : 2; this.ph = i * 2; if (charged) this.pierce = true; }
    else { this.w = 18 * k / 1.2; this.h = 28 * k / 1.2; this.vx = dir * (charged ? 3.6 : 3); this.vy = 0; this.dmg = charged ? 7 : 3; this.pierce = true; this.fx = FX('dust', x, y + 14, { follow: this, life: 3, opts: { size: charged ? 0.7 : 0.45 } }); y -= charged ? 16 : 6; }
    this.x = x - this.w / 2; this.y = y - this.h / 2;
  }
  get cx() { return this.x + this.w / 2; }
  update() {
    this.t++;
    if (this.wkind === 'bag') { this.vy += 0.22; }
    if (this.wkind === 'bubble') { this.vy = Math.max(this.vy - 0.01, -1.2); this.x += Math.sin((this.t + this.ph * 10) / 8) * 0.4; if (this.t > 130) this.kill(true); }
    if (this.wkind === 'tornado') {
      for (const it of G.items) if (it.type === 'trash' && Math.abs(it.cx - this.cx) < 40 && Math.abs(it.y - this.y) < 40) { it.x += (this.cx - it.cx) * 0.25; it.y += (this.y + 10 - it.y) * 0.25; if (Math.abs(it.cx - this.cx) < 8) { it.dead = true; G.cleanUp(it.cx, it.y, '吸走垃圾！'); Audio8.sfx('trash'); } }
      if (this.fx) { this.fx.wx = this.cx; this.fx.wy = this.y + this.h; }
    }
    this.x += this.vx; this.y += this.vy;
    if (Math.abs(this.cx - G.camX - VW / 2) > VW / 2 + 40 || this.y > VH + 20 || this.y < -60) this.kill(false);
    if (this.wkind !== 'tornado' && isSolid(Math.floor(this.cx / TS), Math.floor((this.y + this.h / 2) / TS))) this.kill(true);
  }
  burst() {
    FX('explode', this.cx, this.y + this.h / 2, { opts: { size: this.ch ? 0.8 : 0.55, color: '#7fd17f' } }); Audio8.sfx('explode'); G.shake = this.ch ? 7 : 4;
    const r = this.ch ? 56 : 38;
    for (const e of G.enemies) if (!e.dead && Math.abs(e.cx - this.cx) < r + e.w / 2 && Math.abs(e.cy - this.y) < r + e.h / 2) e.damage(this.dmg, null);
    if (G.boss && !G.boss.defeated && G.mode === 'boss' && Math.abs(G.boss.cx - this.cx) < r + G.boss.w / 2 && Math.abs(G.boss.cy - this.y) < r + G.boss.h / 2) G.boss.damage(this.dmg, this);
    for (const it of G.items) if ((it.type === 'poop' || it.type === 'big') && Math.abs(it.cx - this.cx) < r + 8 && Math.abs(it.y - this.y) < r + 10) it.washed(Object.assign({}, this, { lvl: 2, kill() {}, hitEnemy() {} }));
  }
  kill(hit) {
    if (this.dead) return; this.dead = true;
    if (this.wkind === 'bag' && hit) this.burst();
    if (this.wkind === 'bubble' && hit) { sparks(this.cx, this.y, '#ffc8f0', 6, 1.2, 0); Audio8.sfx('boing', 0.05); }
    if (this.fx) fxStop(this.fx);
  }
  hitEnemy(e) { if (this.hitSet.has(e)) return false; this.hitSet.add(e); if (!this.pierce) this.kill(true); return true; }
  draw(ctx, cx) {
    const x = Math.round(this.x - cx), y = Math.round(this.y);
    const k = this.k || 1;
    if (this.ch && this.t % 4 < 2) { ctx.globalAlpha = 0.35; ctx.fillStyle = this.wkind === 'bag' ? '#b8ffb8' : this.wkind === 'bubble' ? '#ffd0f4' : '#fff2a8'; ctx.beginPath(); ctx.arc(x + this.w / 2, y + this.h / 2, Math.max(this.w, this.h) * 0.62, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
    if (this.wkind === 'bag') { ctx.save(); ctx.translate(x + this.w / 2, y + this.h / 2); ctx.rotate(this.t * 0.18 * this.dir); ctx.scale(k, k); if (!SPR.draw(ctx, 'bagItem', 0, 6, this.dir)) { ctx.fillStyle = '#3d9a4a'; ctx.fillRect(-5, -5, 10, 10); } ctx.restore(); }
    else if (this.wkind === 'bubble') { const r = 5 * k, X = x + this.w / 2, Y = y + this.h / 2; ctx.lineWidth = 1.2; ctx.strokeStyle = '#16111f'; ctx.fillStyle = 'rgba(255,170,230,0.55)'; ctx.beginPath(); ctx.arc(X, Y, r, 0, 7); ctx.fill(); ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(X, Y, r - 2, 3.6, 4.6); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(X - r * 0.5), Math.round(Y - r * 0.55), Math.max(2, Math.round(r * 0.3)), Math.max(2, Math.round(r * 0.3))); }
    else { const s = k / 1.2; ctx.globalAlpha = 0.85; for (let i = 0; i < 6; i++) { const yy = y + this.h - i * 5 * s, r = (3 + i * 1.6) * s, ox = Math.sin(this.t / 3 + i) * 3 * s; ctx.fillStyle = i % 2 ? '#ffe36a' : '#e8c999'; ctx.fillRect(Math.round(x + this.w / 2 - r + ox), Math.round(yy - 3 * s), Math.round(r * 2), Math.round(3 * s)); } ctx.globalAlpha = 1; }
  }
}

// ---------- 道具：便便、垃圾、補血、中繼點 ----------
class Item {
  constructor(type, x, y, dyn) {
    this.type = type; this.dyn = !!dyn; this.t = Math.floor(rnd(0, 60));
    const sz = { poop: [12, 9], big: [20, 15], trash: [9, 10], egg: [9, 10], boba: [12, 18], check: [12, 32], star: [10, 10], ammo: [10, 14] }[type];
    this.sc = type === 'poop' || type === 'big' ? 2 : 1.5; this.w = Math.round(sz[0] * this.sc); this.h = Math.round(sz[1] * this.sc); this.x = x - this.w / 2; this.y = y - this.h; this.vy = 0; // 道具放大 50%
    this.hp = type === 'big' ? 1 : 1; this.kind = Math.floor(rnd(0, 3)); this.active = false;
  }
  get cx() { return this.x + this.w / 2; }
  update() {
    this.t++;
    if (this.dyn && this.vy !== null) { this.vy = Math.min(this.vy + 0.25, 5); const ob = { x: this.x, y: this.y, w: this.w, h: this.h, vx: 0, vy: this.vy }; moveBody(ob); this.y = ob.y; if (ob.onGround) this.vy = null; }
    const P = G.player; if (P.dead) return;
    if (!overlap(this, P)) {
      if ((this.type === 'trash' || this.type === 'egg') && P.dashT > 0 && Math.abs(this.cx - P.cx) < 30 && Math.abs(this.y - P.y) < 30) { this.x += (P.cx - this.cx) * 0.3; this.y += (P.cy - this.y) * 0.3; }
      return;
    }
    if (this.type === 'trash') { this.dead = true; G.cleanUp(this.cx, this.y, '撿起垃圾！'); Audio8.sfx('trash'); G.tip(G.tipsShown.has('trash') ? 'trash2' : 'trash'); FX('puff', this.cx, this.y + 4, { opts: { size: 0.25, color: '#fff7c8' } }); }
    else if (this.type === 'star') { this.dead = true; G.ultra = Math.min(100, G.ultra + 50); Audio8.sfx('magic'); FX('heal', this.cx, this.y + this.h, { opts: { color: '#ffd23f', size: 0.35 } }); floatText(this.cx, this.y, '絕招能量 +50！', '#ffe36a'); }
    else if (this.type === 'ammo') { this.dead = true; G.ammoGain(10); Audio8.sfx('heal'); FX('heal', this.cx, this.y + this.h, { opts: { color: '#7fd7ff', size: 0.35 } }); floatText(this.cx, this.y, '清潔劑！武器能量 +10', '#7fd7ff'); }
    else if (this.type === 'egg' || this.type === 'boba') { this.dead = true; G.heal(this.type === 'egg' ? 6 : 28); floatText(this.cx, this.y, this.type === 'egg' ? '茶葉蛋 +6' : '珍珠奶茶 全回復！', '#9dff9d'); }
    else if (this.type === 'check' && !this.active) { this.active = true; G.checkpoint = { x: this.cx, y: this.y + this.h }; Audio8.sfx('checkpoint'); FX('healfield', this.cx, this.y + this.h); floatText(this.cx, this.y - 8, '中繼點！', '#8fffc0'); G.tip('check'); }
    else if ((this.type === 'poop' || this.type === 'big') && P.onGround && P.inv === 0 && P.dashT === 0 && P.slipT === 0) {
      P.slipT = 24; P.vx = P.face * 2.4; P.hurt(2, P.cx - P.face, '踩到大便！'); G.tip('fine');
      Audio8.sfx('squish'); FX('venom', this.cx, this.y + this.h, { opts: { size: 0.35 }, life: 0.6 });
    }
  }
  washed(b) {
    if (this.type === 'big' && b.lvl === 0) {
      if (b.hitSet && b.hitSet.has(this)) return;
      this.bhp = (this.bhp == null ? 6 : this.bhp) - (b.dmg || 1);
      b.kill(true); FX('wave', this.cx, this.y + this.h, { opts: { size: 0.3 } });
      if (this.bhp > 0) { Audio8.sfx('clink'); floatText(this.cx, this.y - 6, '大坨的！再沖 ' + this.bhp + ' 次（蓄力一發解決）', '#ffd23f'); return; }
    }
    this.dead = true; if (b.hitEnemy) b.hitEnemy(this);
    G.ammoGain && G.ammoGain(1);
    G.cleanUp(this.cx, this.y, this.type === 'big' ? '大坨沖乾淨！' : '沖乾淨了！', this.type === 'big' ? 2 : 1);
    Audio8.sfx('clean'); FX('wave', this.cx, this.y + this.h, { opts: { size: this.type === 'big' ? 0.6 : 0.4 } }); G.tip(this.type === 'big' ? 'big' : 'poop');
    sparks(this.cx, this.y, '#fff8a8', 6, 1.5, 0);
  }
  draw(ctx, cx) {
    const S = PX.S, x = Math.round(this.x - cx), y = Math.round(this.y);
    if (this.type === 'ammo') { // 清潔劑瓶：補充魔王武器能量（自繪像素）
      const yy = y + Math.round(Math.sin(this.t / 12)), w = this.w, h = this.h, col = ['#7fd17f', '#ff9ae6', '#ffd23f'][Math.floor(this.t / 20) % 3];
      ctx.fillStyle = '#16111f'; ctx.fillRect(x + 1, yy + 4, w - 2, h - 4); ctx.fillRect(x + w / 2 - 3, yy, 6, 6);
      ctx.fillStyle = '#e8f4ff'; ctx.fillRect(x + w / 2 - 2, yy + 1, 4, 4);
      ctx.fillStyle = col; ctx.fillRect(x + 2, yy + 5, w - 4, h - 6);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 4, yy + 9, w - 8, 7); ctx.fillStyle = '#2a6bd8'; ctx.fillRect(x + w / 2 - 1, yy + 10, 2, 5); ctx.fillRect(x + w / 2 - 3, yy + 12, 6, 2);
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(x + 3, yy + 6, 2, h - 9);
      if (this.t % 40 < 6) { ctx.fillStyle = '#fff'; ctx.fillRect(x + w - 4, yy + 3, 2, 2); }
      return;
    }
    const gk = { poop: 'it_poop', big: 'it_big', trash: ['it_can', 'it_bottle', 'it_paper'][this.kind], egg: 'it_egg', boba: 'it_boba', star: 'it_star', check: this.active ? 'it_flagG' : 'it_flagR' }[this.type];
    if (SPR.has(gk)) {
      const bob = this.type === 'trash' || this.type === 'egg' || this.type === 'boba' || this.type === 'star' ? Math.round(Math.sin(this.t / 12)) : 0;
      { const fx = this.cx - cx, fy = this.y + this.h + 1 + bob; ctx.save(); ctx.translate(fx, fy); ctx.scale(this.sc, this.sc); SPR.draw(ctx, gk, 0, 0, this.type === 'check' ? 1 : (this.kind % 2 ? -1 : 1)); ctx.restore(); }
      if (this.type === 'poop') this.stink(ctx, x + 12, y - 3);
      if (this.type === 'big') this.stink(ctx, x + 20, y - 5);
      return;
    }
    if (this.type === 'poop') { ctx.drawImage(S.poop, x, y - 1); this.stink(ctx, x + 6, y - 2); }
    else if (this.type === 'big') { ctx.drawImage(S['poopBig' + (Math.floor(this.t / 20) % 2)], x - 1, y - 1); this.stink(ctx, x + 10, y - 3); }
    else if (this.type === 'trash') ctx.drawImage(S['trash' + this.kind], x, y + Math.round(Math.sin(this.t / 12)));
    else if (this.type === 'egg') ctx.drawImage(S.egg, x, y);
    else if (this.type === 'boba') ctx.drawImage(S.boba, x, y);
    else if (this.type === 'check') {
      ctx.fillStyle = '#16111f'; ctx.fillRect(x + 4, y, 4, 32); ctx.fillStyle = '#d8dde8'; ctx.fillRect(x + 5, y, 2, 32);
      const wave = Math.floor(this.t / 8) % 2;
      ctx.fillStyle = '#16111f'; ctx.fillRect(x + 6, y + 1, 14, 10);
      ctx.fillStyle = this.active ? '#3ddc84' : '#ff5a5a'; ctx.fillRect(x + 7, y + 2 + wave, 12, 8 - wave);
      ctx.fillStyle = '#fff'; ctx.fillRect(x + 11, y + 4 + wave, 4, 4);
      ctx.fillStyle = '#16111f'; ctx.fillRect(x, y + 30, 12, 2);
    }
  }
  stink(ctx, x, y) {
    ctx.fillStyle = '#9fdc6a';
    for (let i = 0; i < 2; i++) { const t = (this.t + i * 30) % 60; const yy = y - t / 6; ctx.globalAlpha = 1 - t / 60; ctx.fillRect(x - 3 + i * 5 + Math.round(Math.sin((this.t + i * 20) / 6) * 1.5), Math.round(yy), 1, 3); }
    ctx.globalAlpha = 1;
  }
}

// ---------- 敵人 ----------
const ENEMY_DEF = {
  d: { w: 22, h: 14, hp: 2, dmg: 2, name: 'dog' }, D: { w: 22, h: 14, hp: 2, dmg: 2, name: 'dogB' },
  f: { w: 8, h: 7, hp: 1, dmg: 1, name: 'fly', fly: true }, b: { w: 16, h: 16, hp: 2, dmg: 2, name: 'bagm' },
  o: { w: 12, h: 30, hp: 3, dmg: 2, name: 'walker' }, u: { w: 14, h: 18, hp: 2, dmg: 2, name: 'poopman' },
  s: { w: 16, h: 11, hp: 2, dmg: 2, name: 'slime' }, r: { w: 14, h: 8, hp: 1, dmg: 1, name: 'rat' },
  R: { w: 20, h: 10, hp: 3, dmg: 2, name: 'robo' }, m: { w: 18, h: 24, hp: 4, dmg: 2, name: 'mech' },
  c: { w: 16, h: 12, hp: 2, dmg: 2, name: 'cat' }, w: { w: 24, h: 10, hp: 1, dmg: 2, name: 'broom', fly: true },
  v: { w: 14, h: 6, hp: 999, dmg: 3, name: 'vent', inv: true },
};
class Enemy {
  constructor(code, x, y) {
    const d = ENEMY_DEF[code];
    Object.assign(this, { code, w: d.w, h: d.h, hp: d.hp, maxHp: d.hp, dmg: d.dmg, name: d.name, fly: d.fly, invuln: d.inv, x: x - d.w / 2, y: y - d.h, vx: 0, vy: 0, face: -1, t: Math.floor(rnd(0, 100)), state: 'idle', st: 0, flash: 0, onGround: false, ox: x, oy: y - d.h });
    this.variant = Math.floor(rnd(0, 3));
    if (code !== 'o' && code !== 'v') { const W = Math.round(d.w * 1.5), H = Math.round(d.h * 1.5); this.x = x - W / 2; this.y = y - H; this.oy = this.y; this.w = W; this.h = H; }
    if (code === 'v') { this.t = Math.floor(rnd(0, 150)); }
  }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
  near(px) { return Math.abs(G.player.cx - this.cx) < px && Math.abs(G.player.cy - this.cy) < 80; }
  faceP() { this.face = G.player.cx < this.cx ? -1 : 1; }
  gravity() { this.vy = Math.min(this.vy + 0.25, 6); }
  patrol(sp) {
    if (this.face === 0) this.face = -1;
    this.vx = this.face * sp;
    if (this.onGround && (!groundAhead(this, this.face) || wallAhead(this, this.face))) { this.face *= -1; this.vx = this.face * sp; }
  }
  update() {
    this.t++; this.st++; if (this.flash > 0) this.flash--;
    const P = G.player;
    if (this.state === 'tamed' || this.state === 'sorry') {
      // 被打跑：沿地面直直跑出畫面（不跳、不爬平台，可穿過障礙）
      if (this.st === 1) this.face = (G.player.cx < this.cx ? 1 : -1);
      this.vx = this.face * (this.state === 'tamed' ? 2.6 : 1.6); this.x += this.vx;
      if (!this.onGround) { this.vy = Math.min(this.vy + 0.25, 6); this.y += this.vy; const ty = Math.floor((this.y + this.h) / TS), tx = Math.floor(this.cx / TS); if (isSolid(tx, ty) || isOneWay(tx, ty)) { this.y = ty * TS - this.h; this.vy = 0; this.onGround = true; } }
      if (Math.abs(this.x - G.camX - VW / 2) > VW) this.dead = true;
      return;
    }
    switch (this.code) {
      case 'd': case 'D': this.dogAI(); break;
      case 'f': {
        const tx = this.ox + Math.sin(this.t / 40) * 30, ty = this.oy + Math.sin(this.t / 13) * 10;
        if (this.near(140)) { this.ox += Math.sign(P.cx - this.ox) * 0.25; this.oy += Math.sign(P.cy - 10 - this.oy) * 0.15; }
        this.x = tx - this.w / 2; this.y = ty; this.face = Math.cos(this.t / 40) > 0 ? 1 : -1; break;
      }
      case 'b':
        this.gravity();
        if (this.onGround) { this.vx = 0; if (this.st > 45 && this.near(200)) { this.faceP(); this.vx = this.face * 1.3; this.vy = -4; this.st = 0; Audio8.sfx('boing', 0.2); } }
        moveBody(this); break;
      case 'o':
        this.gravity();
        if (this.near(170)) { this.faceP(); this.vx = 0; if (this.st > 110) { this.st = 0; this.throwT = 18; Audio8.sfx('throw'); G.eshots.push(new EShot('bag', this.cx, this.y + 4, this.face * rnd(1.6, 2.6), -3.6)); } }
        else this.patrol(0.5);
        if (this.throwT) this.throwT--;
        moveBody(this); break;
      case 'u':
        this.gravity(); this.patrol(this.near(120) ? 0.9 : 0.5); if (this.near(120)) this.faceP(); moveBody(this); break;
      case 's':
        this.gravity();
        if (this.onGround) { this.patrol(0.35); if (this.st > 120 && this.near(150)) { this.faceP(); this.vy = -3; this.vx = this.face * 1; this.st = 0; } }
        moveBody(this); break;
      case 'r': this.gravity(); this.patrol(this.near(160) ? 2.2 : 0.8); moveBody(this); break;
      case 'R': {
        this.gravity();
        if (this.state === 'idle' && this.near(200) && Math.abs(P.y + P.h - this.y - this.h) < 30) { this.faceP(); this.state = 'charge'; this.st = 0; Audio8.sfx('siren', 1); }
        if (this.state === 'charge') { this.vx = this.face * Math.min(3, 0.5 + this.st * 0.06); if (this.st % 4 === 0) G.parts.push({ x: this.cx - this.face * 10, y: this.y + this.h - 2, vx: -this.face, vy: -0.5, life: 16, max: 16, c: '#b9b2a0', s: 3, g: 0 }); }
        else this.patrol(0.6);
        if (moveBody(this)) { this.face *= -1; this.state = 'idle'; this.vx = 0; G.shake = 2; Audio8.sfx('hit'); }
        if (this.state === 'charge' && this.onGround && !groundAhead(this, this.face)) { this.face *= -1; this.state = 'idle'; }
        break;
      }
      case 'm':
        this.gravity(); this.vx = 0; this.faceP();
        if (this.near(220) && this.st > 100) { this.st = 0; this.fireT = 14; Audio8.sfx('throw'); G.eshots.push(new EShot('ball', this.cx + this.face * 12, this.y + 10, this.face * rnd(1.6, 2.8), -4)); FX('air', this.cx + this.face * 12, this.y + 10, { opts: { size: 0.25 } }); }
        if (this.fireT) this.fireT--;
        moveBody(this); break;
      case 'c':
        this.gravity();
        if (this.onGround) { this.vx = 0; this.pounce = false; if (this.near(110) && this.st > 70) { this.faceP(); this.vx = this.face * 2.2; this.vy = -4.2; this.st = 0; this.pounce = true; Audio8.sfx('bark'); } }
        moveBody(this); break;
      case 'w':
        this.faceP(); this.x += this.face * 0.9; this.y = this.oy + Math.sin(this.t / 15) * 18; break;
      case 'v': {
        const ph = this.t % 150;
        this.active = ph > 80;
        if (ph === 81) { Audio8.sfx('gas'); this.fx = FX('steam', this.cx, this.y + this.h, { life: 1.1, opts: { size: 0.55 } }); }
        if (this.active && P.x < this.x + this.w + 2 && P.x + P.w > this.x - 2 && P.y + P.h > this.y - 52 && P.y < this.y) { P.hurt(2, this.cx, '臭氣！'); G.tip('vent'); }
        if (this.active && this.t % 3 === 0) G.parts.push({ x: this.cx + rnd(-4, 4), y: this.y, vx: rnd(-0.3, 0.3), vy: -rnd(1, 2.4), life: 26, max: 26, c: '#9fdc6a', s: 3, g: 0 });
        break;
      }
    }
    if (overlap(this, P) && !(this.code === 'v')) {
      if (P.dashT > 0 && G.abilities.dash && this.code === 'f') { this.damage(9, null); }
      else P.hurt(this.dmg, this.cx);
    }
    if (this.y > G.level.h * TS + 40) this.dead = true;
  }
  dogAI() {
    const P = G.player;
    this.gravity();
    if (this.state === 'idle' || this.state === 'walk') {
      this.state = 'walk'; this.patrol(0.6);
      if (this.st > 200 + this.variant * 60 && this.onGround) { this.state = 'poop'; this.st = 0; this.vx = 0; }
      if (this.near(90) && Math.sign(P.cx - this.cx) === this.face && this.st > 30) { this.state = 'bark'; this.st = 0; this.vx = 0; Audio8.sfx('bark'); floatText(this.cx, this.y - 4, '汪！', '#fff'); }
    } else if (this.state === 'poop') {
      this.vx = 0;
      if (this.st === 40) { const p = new Item('poop', this.cx - this.face * 10, this.y + this.h, true); G.items.push(p); G.dynPoops++; Audio8.sfx('squish'); floatText(this.cx, this.y - 6, '噗～', '#c48a4f'); }
      if (this.st > 70) { this.state = 'walk'; this.st = 0; }
    } else if (this.state === 'bark') {
      this.vx = 0; if (this.st > 24) { this.state = 'lunge'; this.st = 0; this.faceP(); this.vy = -2.5; }
    } else if (this.state === 'lunge') {
      this.vx = this.face * 2.4; if (this.st > 26 && this.onGround) { this.state = 'walk'; this.st = 0; }
    }
    moveBody(this);
  }
  damage(dmg, b) {
    if (this.invuln || this.state === 'tamed' || this.state === 'sorry') return false;
    this.hp -= dmg; this.flash = 6; Audio8.sfx('hit');
    if (b) sparks(b.cx, b.y + b.h / 2, '#bff4ff', 5, 1.4, 0.1);
    if (this.hp <= 0) this.defeat();
    return true;
  }
  defeat() {
    const isDog = this.code === 'd' || this.code === 'D';
    G.score += 100;
    if (isDog) { this.state = 'tamed'; this.st = 0; this.face = G.player.cx < this.cx ? 1 : -1; Audio8.sfx('tame'); floatText(this.cx, this.y - 8, '冷靜下來了～♥', '#ff9fc8'); G.tip('dog'); FX('heal', this.cx, this.y + this.h, { opts: { size: 0.4 } }); G.tamed++; return; }
    if (this.code === 'o') { this.state = 'sorry'; this.st = 0; this.face = G.player.cx < this.cx ? 1 : -1; Audio8.sfx('tame'); floatText(this.cx, this.y - 10, ['對不起！我會撿！', '下次會帶袋子…', '我錯了啦～'][this.variant], '#ffe18a'); FX('puff', this.cx, this.y + this.h / 2); G.tip('owner'); return; }
    this.dead = true;
    if (this.code === 'R' || this.code === 'm') { fcPop(this.cx, this.cy, 1.4); FX('explode', this.cx, this.cy, { opts: { size: this.code === 'm' ? 0.5 : 0.4 } }); Audio8.sfx('pop'); Audio8.sfx('hit'); G.shake = 3; sparks(this.cx, this.cy, '#ffd23f', 12, 2.5, 0.12);
      if (this.code === 'R') { for (const [k, dx] of [['star', -10], ['boba', 10]]) { const it = new Item(k, this.cx + dx, this.y + this.h, true); it.vy = -3; G.items.push(it); } floatText(this.cx, this.y - 12, '掃地機器人掉寶！絕招能量＋補血', '#ffe36a', true); Audio8.sfx('magic'); } }
    else if (this.code === 'u' || this.code === 's') { FX('venom', this.cx, this.y + this.h, { opts: { size: 0.4 }, life: 0.8 }); Audio8.sfx('squish'); const p = new Item('poop', this.cx, this.y + this.h, true); G.items.push(p); G.dynPoops++; floatText(this.cx, this.y - 6, '變回便便了！快沖掉！', '#ffd23f'); }
    else if (this.code === 'b') { fcPop(this.cx, this.cy); Audio8.sfx('pop'); for (let i = 0; i < 2; i++) { const t = new Item('trash', this.cx + (i ? 8 : -8), this.y + this.h, true); t.vy = -2; G.items.push(t); G.dynPoops++; } }
    else { fcPop(this.cx, this.cy); Audio8.sfx('pop'); }
    const hasWpn = G.weapons && G.weapons.length > 1;
    if (hasWpn && (this.code === 'R' || Math.random() < 0.25)) G.items.push(Object.assign(new Item('ammo', this.cx + 6, this.y + this.h, true), { vy: -3.5 }));
    else if (Math.random() < 0.3) G.items.push(Object.assign(new Item(Math.random() < 0.85 ? 'egg' : 'boba', this.cx, this.y + this.h, true), { vy: -3 }));
  }
  sprKey() {
    const f2 = Math.floor(this.t / 8) % 2, f8 = Math.floor(this.t / 4) % 8, f4 = Math.floor(this.t / 4) % 4;
    switch (this.code) {
      case 'd': case 'D': {
        const p = 'd_'; // 白狗改用同一套 GPT 狗狗（白色重新上色版太醜）
        if (this.state === 'tamed') return this.onGround && Math.abs(this.vx) > 0.5 ? p + 'walk' + (Math.floor(this.t / 2) % 8) : p + 'happy' + f2;
        if (this.state === 'poop') return p + 'poop' + (this.st > 30 ? 1 : 0);
        if (this.state === 'bark') return p + 'bark' + (Math.floor(this.st / 6) % 2);
        if (this.state === 'lunge') return this.onGround ? p + 'walk' + (Math.floor(this.t / 2) % 8) : p + 'lunge0';
        return this.vx ? p + 'walk' + f8 : p + 'stand';
      }
      case 'f': return 'fly' + (Math.floor(this.t / 3) % 2);
      case 'b': return this.onGround ? 'bag0' : 'bag1';
      case 'o': return this.state === 'sorry' ? 'owner_s' + f2 : this.throwT ? 'owner_t' + (this.throwT > 9 ? 0 : 1) : this.vx ? 'owner' + f4 : 'owner0';
      case 'u': return !this.onGround ? 'u_angry' : 'u_walk' + f8;
      case 's': return 'slime' + f2;
      case 'r': return 'rat' + (Math.floor(this.t / 4) % 2);
      case 'R': return 'r_vac' + f4;
      case 'm': return this.fireT ? 'r_mf' + (this.fireT > 7 ? 0 : 1) : 'r_mech';
      case 'c': return this.pounce && !this.onGround ? 'cat1' : 'cat0';
      case 'w': return 'broom' + f2;
    }
    return null;
  }
  draw(ctx, cx) {
    const sk = this.sprKey();
    if (sk && SPR.has(sk)) {
      let dy = this.y + this.h + 1, sx = 1, sy = 1;
      if (this.code === 'f') dy = this.y + this.h + 2 + Math.sin(this.t / 3);
      if (this.code === 'w') dy = this.y + this.h + 3;
      if (this.code === 'o') dy += Math.abs(Math.sin(this.t / 6)) * -1;
      ctx.save();
      if (this.code === 's') { const k = 1 + Math.sin(this.t / 6) * 0.12; ctx.translate(this.cx - cx, dy); ctx.scale(1 / k, k); ctx.translate(-(this.cx - cx), -dy); }
      if (this.code === 'o' && this.state === 'sorry') ctx.globalAlpha = 0.85;
      if (this.code !== 'o' && this.code !== 'v') { ctx.translate(this.cx - cx, dy); ctx.scale(1.5, 1.5); ctx.translate(-(this.cx - cx), -dy); } // 小怪放大 50%
      if (this.code === 'o') SPR.drawBigHead(ctx, sk, this.cx - cx, dy, this.face > 0 ? 1 : -1); else SPR.draw(ctx, sk, this.cx - cx, dy, this.face > 0 ? 1 : -1, false);
      if (this.flash > 0) SPR.draw(ctx, sk, this.cx - cx, dy, this.face > 0 ? 1 : -1, true, 0.8);
      ctx.restore();
      if (this.code === 'o' && this.throwT) ctx.drawImage(PX.S.poopBag, Math.round(this.cx - cx + this.face * 6 - 5), Math.round(this.y - 6));
      return;
    }
    const S = PX.S; let k, ox = 0, oy = 0, flip = this.face > 0 ? 1 : -1;
    const f2 = Math.floor(this.t / 8) % 2, f4 = Math.floor(this.t / 6) % 4;
    switch (this.code) {
      case 'd': case 'D': {
        const p = this.code === 'D' ? 'dogB' : 'dog';
        k = this.state === 'tamed' ? p + 'Happy' : this.state === 'poop' ? p + 'Poop' : this.state === 'bark' ? p + 'Bark' : p + (this.vx ? f4 : 0); ox = -3; oy = -6; break;
      }
      case 'f': k = 'fly' + (this.t >> 1) % 2; break;
      case 'b': k = 'bagm' + (this.onGround ? 0 : 1); ox = -2; oy = -4; break;
      case 'o': k = this.state === 'sorry' ? `walker${this.variant}_sorry` : this.throwT ? `walker${this.variant}_t` : `walker${this.variant}_${this.vx ? f4 : 0}`; ox = -5; oy = -4; break;
      case 'u': k = this.near(120) ? (f4 % 2 ? 'poopmanA' : 'poopman' + f4) : 'poopman' + f4; ox = -2; oy = -2; break;
      case 's': k = 'slime' + f2; ox = -1; oy = -3; break;
      case 'r': k = 'rat' + f2; ox = -2; oy = -2; break;
      case 'R': k = 'robo' + f2; ox = -1; oy = -2; break;
      case 'm': k = this.fireT ? 'mechF' : 'mech' + (this.onGround ? 0 : 1); ox = -3; oy = -2; break;
      case 'c': k = this.pounce && !this.onGround ? 'catP' : 'cat' + (this.vx ? f2 : 0); ox = -2; oy = -2; break;
      case 'w': k = 'broom' + f2; ox = -2; oy = -1; break;
      case 'v': {
        const x = Math.round(this.x - cx), y = Math.round(this.y);
        if (SPR.draw(ctx, 'it_vent', this.cx - cx, this.y + this.h + 1, 1)) { if (!this.active && this.t % 150 > 55 && (this.t >> 2) % 2) { ctx.fillStyle = '#ff5a5a'; ctx.fillRect(x + 5, y - 8, 3, 3); } return; }
        ctx.fillStyle = '#16111f'; ctx.fillRect(x - 1, y - 1, this.w + 2, this.h + 2); ctx.fillStyle = '#6a6f7a'; ctx.fillRect(x, y, this.w, this.h);
        ctx.fillStyle = this.active ? '#9fdc6a' : '#2b2f3a'; for (let i = 0; i < 3; i++) ctx.fillRect(x + 2 + i * 4, y + 1, 2, 4);
        if (!this.active && this.t % 150 > 55 && (this.t >> 2) % 2) { ctx.fillStyle = '#ff5a5a'; ctx.fillRect(x + 5, y - 6, 3, 3); }
        return;
      }
    }
    const img = S[k + (this.flash ? '_w' : '')] || S[k];
    if (!img) return;
    const dx = Math.round(this.cx - cx), dy = Math.round(this.y + this.h);
    ctx.save(); ctx.translate(dx, dy); ctx.scale(flip, 1);
    ctx.drawImage(img, -Math.round(img.width / 2) - ox * 0, -img.height - oy * 0 + (this.code === 'f' || this.code === 'w' ? img.height - this.h : 0));
    ctx.restore();
  }
}

// ---------- 敵方子彈 ----------
class EShot {
  constructor(type, x, y, vx, vy, o = {}) {
    Object.assign(this, { type, vx, vy, t: 0, grav: 0, dmg: 2, ...o }); if (this.dmg > 2) this.dmg -= 1;
    const sz = { bag: [9, 9], ball: [8, 8], star: [7, 7], bigstar: [9, 9], paper: [11, 13], handbag: [13, 11], gas: [16, 16], rain: [10, 8], wave: [14, 12], chi: [12, 9], note: [8, 8] }[type] || [8, 8];
    this.w = sz[0]; this.h = sz[1]; this.x = x - this.w / 2; this.y = y - this.h / 2;
    if (type === 'bag' || type === 'ball' || type === 'rain') this.grav = 0.18;
    if (type === 'chi') this.grav = 0.25;
  }
  get cx() { return this.x + this.w / 2; }
  update() {
    this.t++;
    const P = G.player;
    if (this.type === 'paper') { // 追蹤考卷
      const a = Math.atan2(P.cy - this.y, P.cx - this.cx); const sp = 1.5;
      if (this.t < 150) { this.vx += (Math.cos(a) * sp - this.vx) * 0.03; this.vy += (Math.sin(a) * sp - this.vy) * 0.03; }
    }
    if (this.type === 'handbag') { this.vx -= this.dir * 0.08; if (this.t > 150) this.dead = true; }
    if (this.type === 'chi') {
      this.vy = Math.min(this.vy + this.grav, 6); const ob = { x: this.x, y: this.y, w: this.w, h: this.h, vx: this.vx, vy: this.vy };
      if (moveBody(ob)) this.vx *= -1; this.x = ob.x; this.y = ob.y; this.vy = ob.vy;
      if (ob.onGround) this.vy = -2.2;
      if (this.t > 260) { this.dead = true; FX('puff', this.cx, this.y); }
    } else {
      this.vy += this.grav; this.x += this.vx; this.y += this.vy;
      if (this.grav && isSolid(Math.floor(this.cx / TS), Math.floor((this.y + this.h) / TS)) && this.vy > 0) {
        this.dead = true;
        if (this.type === 'bag' || this.type === 'rain') { const p = new Item('poop', this.cx, Math.floor((this.y + this.h) / TS) * TS, false); G.items.push(p); G.dynPoops++; Audio8.sfx('squish'); FX('venom', this.cx, p.y + p.h, { opts: { size: 0.3 }, life: 0.4 }); }
        else { FX('air', this.cx, this.y + this.h, { opts: { size: 0.3 } }); Audio8.sfx('hit'); }
      }
      if (this.type === 'wave' && this.t > 140) this.dead = true;
    }
    if (this.t > 400 || this.y > VH + 60 || Math.abs(this.cx - G.camX - VW / 2) > VW) this.dead = true;
    if (!this.dead && overlap(this, P)) { if (P.hurt(this.dmg, this.cx)) { if (this.type !== 'wave' && this.type !== 'gas') this.dead = true; } }
  }
  draw(ctx, cx) {
    const S = PX.S, x = Math.round(this.x - cx), y = Math.round(this.y);
    switch (this.type) {
      case 'bag': if (!SPR.draw(ctx, 'bagItem', x + 5, y + this.h + 1, 1)) ctx.drawImage(S.poopBag, x, y); break;
      case 'ball': case 'rain': ctx.drawImage(S.poop, x - 2, y - 1); break;
      case 'star': ctx.drawImage((this.t >> 2) % 2 ? S.starY : S.starP, x, y); break;
      case 'bigstar': ctx.drawImage(S.starB, x, y); break;
      case 'paper': ctx.drawImage(S['paper' + ((this.t >> 3) % 2)], x, y); break;
      case 'handbag': if (!SPR.draw(ctx, 'handbag', x + 6, y + this.h + 1, (this.t >> 3) % 2 ? 1 : -1)) ctx.drawImage(S['handbag' + ((this.t >> 2) % 2)], x, y); break;
      case 'chi': if (SPR.has('chi0')) { SPR.draw(ctx, 'chi' + ((this.t >> 3) % 2), x + 6, y + this.h + 1, this.vx > 0 ? 1 : -1); break; } { ctx.save(); ctx.translate(x + 6, y + 9); ctx.scale(this.vx > 0 ? 1 : -1, 1); ctx.drawImage(S['chi' + ((this.t >> 3) % 2)], -7, -10); ctx.restore(); break; }
      case 'gas': { ctx.globalAlpha = 0.75; ctx.fillStyle = '#9fdc6a'; ctx.beginPath(); ctx.arc(x + 8, y + 8, 7 + Math.sin(this.t / 4), 0, 7); ctx.fill(); ctx.fillStyle = '#c8f08a'; ctx.beginPath(); ctx.arc(x + 6, y + 6, 3, 0, 7); ctx.fill(); ctx.globalAlpha = 1; break; }
      case 'wave': { ctx.fillStyle = '#16111f'; ctx.fillRect(x - 1, y - 1, this.w + 2, this.h + 2); ctx.fillStyle = (this.t >> 2) % 2 ? '#c48a4f' : '#e8bf86'; ctx.fillRect(x, y + 4, this.w, this.h - 4); ctx.fillRect(x + 3, y, this.w - 6, 4); break; }
      default: ctx.fillStyle = '#fff'; ctx.fillRect(x, y, this.w, this.h);
    }
  }
}

// ---------- NPC ----------
class NPC {
  constructor(x, y, data) { this.data = data; this.who = data.who; this.w = 14; this.h = this.who === 'kid' ? 26 : 32; this.x = x - 7; this.y = y - this.h; this.t = 0; this.face = 1; this.talked = false; }
  get cx() { return this.x + this.w / 2; }
  update() { this.t++; this.face = G.player.cx < this.cx ? -1 : 1; this.near = Math.abs(G.player.cx - this.cx) < 26 && Math.abs(G.player.y - this.y) < 30; }
  draw(ctx, cx) {
    const dx = Math.round(this.cx - cx), dy = Math.round(this.y + this.h);
    const talking = G.dialog && G.talkTarget === this;
    const sk = this.who === 'chief' ? (talking ? 'chief' + (1 + ((G.t >> 3) % 2)) : this.near ? 'chief3' : 'chief0') : (talking ? 'kid' + (2 + ((G.t >> 4) % 2)) : this.near ? 'kid1' : 'kid0');
    if (!SPR.drawBigHead(ctx, sk, dx, dy + 1, this.face)) {
      const img = PX.S[this.who + (Math.floor(this.t / 30) % 2 ? 1 : 0)];
      ctx.save(); ctx.translate(dx, dy); ctx.scale(this.face, 1); ctx.drawImage(img, -Math.round(img.width / 2), -img.height + 1); ctx.restore();
    }
    const topY = SPR.has(sk) ? dy - SPR.f[sk].h : this.y;
    if (!this.talked || this.near) {
      const by = Math.round(topY - 12 + Math.sin(this.t / 10) * 2);
      ctx.fillStyle = '#16111f'; ctx.fillRect(dx - 6, by - 1, 12, 10); ctx.fillStyle = this.near ? '#ffd23f' : '#ffffff'; ctx.fillRect(dx - 5, by, 10, 8);
      ctx.fillStyle = '#16111f'; if (this.near) { ctx.fillRect(dx - 1, by + 1, 2, 2); ctx.fillRect(dx - 3, by + 3, 6, 2); ctx.fillRect(dx - 1, by + 5, 2, 2); } else { ctx.fillRect(dx - 3, by + 3, 2, 2); ctx.fillRect(dx, by + 3, 2, 2); ctx.fillRect(dx + 3, by + 3, 1, 2); }
    }
  }
}

// ---------- 移動平台 ----------
class Platform {
  constructor(x, y, axis) { this.axis = axis; this.w = 48; this.h = 8; this.bx = x - 16; this.by = y; this.x = this.bx; this.y = this.by; this.t = 0; this.dx = 0; this.dy = 0; }
  update() {
    this.t++; const px = this.x, py = this.y;
    if (this.axis === 'h') this.x = this.bx + Math.sin(this.t / 70) * 48; else this.y = this.by + Math.sin(this.t / 60) * 40;
    this.dx = this.x - px; this.dy = this.y - py;
    const P = G.player; if (P.platform === this && this.dy) P.y = this.y - P.h;
  }
  draw(ctx, cx) { if (SPR.has('it_plat')) { const s = SPR.f.it_plat; ctx.drawImage(s.img, Math.round(this.x - cx), Math.round(this.y) - 1, 48, s.h); return; } const img = PX.S[`t${G.level.theme}_moving`]; for (let i = 0; i < 3; i++) ctx.drawImage(img, Math.round(this.x - cx) + i * 16, Math.round(this.y)); }
}
