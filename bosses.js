// ===== 魔王 =====
class Boss {
  constructor(kind, x, floorY) {
    this.kind = kind; this.t = 0; this.st = 0; this.state = 'enter'; this.hp = 45; this.maxHp = 45; this.inv = 0; this.flash = 0;
    this.face = -1; this.vx = 0; this.vy = 0; this.floorY = floorY; this.dead = false; this.defeated = false; this.phase2 = false; this.queue = [];
    const A = G.arena;
    this.ax0 = A.x0 + 16; this.ax1 = A.x1 - 16;
    const dims = { abo: [18, 38], lady: [20, 42], dogking: [44, 60], witch: [30, 28], virus: [34, 54], typhoonB: [44, 60], rhinoB: [46, 52], shacho: [26, 62] }[kind];
    this.w = dims[0]; this.h = dims[1];
    this.x = x - this.w / 2; this.y = floorY - this.h;
    const hp = { virus: 60, typhoonB: 60, rhinoB: 64, shacho: 76 }[kind]; if (hp) { this.hp = this.maxHp = hp; }
    this.fly = kind === 'witch' || kind === 'typhoonB';
    if (kind === 'abo') { this.dog = { x: this.ax1 - 44, y: floorY - 24, w: 34, h: 24, vx: 0, vy: 0, face: -1, state: 'sit', st: 0, t: 0, flash: 0 }; }
    if (kind === 'lady') { this.y = -60; }
    if (kind === 'dogking') { this.y = floorY - this.h; this.rise = 0; }
    if (kind === 'witch') { this.x = A.x1 + 30; this.y = 60; this.hp = 54; this.maxHp = 54; }
    if (G.hard) { this.hp = this.maxHp = Math.round(this.maxHp * 1.4); } // 困難模式：魔王更耐打
    this.hpShown = 0;
  }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
  // ---- 出場動畫（回傳 true 表示結束） ----
  entrance() {
    this.t++; const P = G.player;
    if (this.kind === 'abo') {
      if (this.t === 1) { this.x = this.ax1 + 20; this.walkIn = true; }
      if (this.x > this.ax1 - 70) { this.x -= 0.8; this.anim = true; }
      else this.anim = false;
      if (this.t === 90) { Audio8.sfx('bark'); this.dog.state = 'bark'; floatText(this.dog.x + 15, this.dog.y - 6, '汪汪！', '#fff'); FX('ink', this.dog.x + 15, this.dog.y + 6); }
      if (this.t === 130) this.dog.state = 'sit';
      return this.t > 150;
    }
    if (this.kind === 'lady') {
      if (this.t === 1) { this.x = this.ax1 - 90; FX('relic', this.cx, this.floorY, { life: 1.6 }); Audio8.sfx('magic'); }
      const target = this.floorY - this.h;
      if (this.y < target) { this.y = Math.min(target, this.y + 1.6); if (this.t % 6 === 0) sparks(this.cx + rnd(-10, 10), this.y + rnd(0, 30), '#ffd0f2', 2, 1, 0); }
      else if (!this.landed) { this.landed = true; Audio8.sfx('stomp'); G.shake = 6; FX('shock', this.cx, this.floorY, { opts: { size: 0.5 } }); floatText(this.cx, this.y - 10, '哦呵呵呵～', '#ff9fd8'); }
      return this.t > 170;
    }
    if (this.kind === 'dogking') {
      if (this.t === 1) { this.x = this.ax1 - 80; this.rise = 1; FX('hole', this.cx, this.floorY - 30, { life: 1.6, opts: { size: 1.6 } }); Audio8.sfx(Audio8.hasExt('bosswarn') ? 'bosswarn' : 'siren'); G.dark = 1; }
      if (this.t === 50) { FX('thunder', this.cx, this.floorY, { opts: { size: 0.7 } }); Audio8.sfx('explode'); G.flash = 8; G.shake = 10; }
      if (this.t > 50) this.rise = Math.max(0, this.rise - 0.02);
      if (this.t === 110) { this.roar = 40; Audio8.sfx('stomp'); G.shake = 14; FX('shock', this.cx, this.floorY, { opts: { size: 0.9 } }); floatText(this.cx, this.y - 10, '汪嗚嗚嗚嗚——！', '#ff5a5a', true); }
      if (this.roar) this.roar--;
      if (this.t > 150) G.dark = Math.max(0, G.dark - 0.05);
      return this.t > 170;
    }
    if (this.kind === 'witch') {
      if (this.t === 1) { this.gfx = FX('gate', this.ax1 - 60, 70, { life: 1.6, opts: { size: 0.8 } }); Audio8.sfx('warp'); }
      if (this.t > 40) { // 從門中飛出，繞一圈
        const k = Math.min(1, (this.t - 40) / 120), a = k * Math.PI * 2;
        this.x = (this.ax1 - 60) - Math.sin(a) * 90 - this.w / 2 - k * 30; this.y = 60 + Math.sin(a * 2) * 24 - this.h / 2;
        this.face = Math.cos(a) > 0 ? -1 : 1;
        if (this.t % 3 === 0) G.parts.push({ x: this.cx - this.face * 14, y: this.cy + 6, vx: 0, vy: 0.3, life: 30, max: 30, c: ['#ffd23f', '#ff7ad9', '#7ad7ff'][this.t % 3], s: 2, g: 0 });
      } else { this.x = this.ax1 + 40; }
      if (this.t === 170) { Audio8.sfx('magic'); floatText(this.cx, this.y - 10, '上課囉～', '#ff9fd8'); FX('star', this.cx, this.cy, { opts: { size: 0.4 } }); }
      this.face = -1;
      return this.t > 200;
    }
    // ---- 二周目 ----
    if (this.kind === 'virus') { // 從天而降
      if (this.t === 1) { this.x = this.ax1 - 90; this.y = -90; FX('venom', this.cx, this.floorY, { life: 1.4, opts: { size: 0.9 } }); Audio8.sfx('gas'); }
      if (this.physics()) { Audio8.sfx('stomp'); G.shake = 10; FX('shock', this.cx, this.floorY, { opts: { size: 0.7 } }); this.landT = 10; }
      if (this.landT) this.landT--;
      if (this.t === 80) { this.puffT = 30; floatText(this.cx, this.y - 10, '嘿嘿嘿…垃圾和積水，就是我的溫床！', '#b6ff6a', true); }
      if (this.puffT) this.puffT--;
      this.face = -1; return this.t > 160;
    }
    if (this.kind === 'typhoonB') { // 颳著風飛進來
      if (this.t === 1) { this.x = this.ax1 + 40; this.y = 40; Audio8.sfx('gas'); }
      const k = Math.min(1, this.t / 90); this.x = this.ax1 + 40 - k * 150; this.y = 40 + Math.sin(this.t / 10) * 8;
      if (this.t % 3 === 0) G.parts.push({ x: this.cx + rnd(-30, 30), y: this.y + rnd(0, this.h), vx: -3, vy: rnd(-0.5, 0.5), life: 30, max: 30, c: '#dff4ff', s: 2, g: 0 });
      if (this.t === 100) { this.laughT = 50; G.shake = 6; floatText(this.cx, this.y - 6, '呼呼呼～沒收好的垃圾，全部吹上街！', '#9fd0ff', true); }
      if (this.laughT) this.laughT--;
      this.face = -1; return this.t > 170;
    }
    if (this.kind === 'rhinoB') { // 衝進場
      if (this.t === 1) { this.x = this.ax1 + 30; this.running = true; }
      if (this.x > this.ax1 - 90) { this.x -= 3; if (this.t % 5 === 0) FX('dust', this.cx + 20, this.floorY, { opts: { size: 0.3 } }); }
      else if (this.running) { this.running = false; Audio8.sfx('stomp'); G.shake = 12; FX('shock', this.cx, this.floorY, { opts: { size: 0.8 } }); floatText(this.cx, this.y - 8, '走開走開！這塊地，我要倒廢土！', '#ff9a6a', true); }
      this.face = -1; return this.t > 160;
    }
    if (this.kind === 'shacho') { // 黑洞中現身
      if (this.t === 1) { this.x = this.ax1 - 100; this.hidden = true; G.dark = 1; Audio8.sfx('warp'); FX('hole', this.cx, this.floorY - 32, { life: 1.6, opts: { size: 1.3, color: '#b04dff' } }); }
      if (this.t === 60) { this.hidden = false; this.tpPose = 'in'; FX('thunder', this.cx, this.floorY, { opts: { size: 0.6 } }); G.flash = 6; G.shake = 8; Audio8.sfx('explode'); }
      if (this.t === 85) this.tpPose = null;
      if (this.t === 100) { this.castT = 40; floatText(this.cx, this.y - 10, '呵呵呵…亂丟垃圾，都是我公司的生意。', '#d08aff', true); }
      if (this.castT) this.castT--;
      if (this.t > 140) G.dark = Math.max(0, G.dark - 0.04);
      this.face = -1; return this.t > 175;
    }
    return true;
  }
  // ---- 戰鬥 ----
  update() {
    this.t++; this.st++; if (this.inv > 0) this.inv--; if (this.flash > 0) this.flash--;
    if (this.defeated) { this.deathAnim(); return; }
    if (!this.phase2 && this.hp <= this.maxHp / 2) { this.phase2 = true; this.onPhase2(); }
    if (G.hard && this.state === 'idle') this.st += 0.7; // 困難模式：攻擊間隔更短
    if (this.stagger > 0) { this.stagger--; this.vx = 0; if (!this.fly) this.physics(); if (this.t % 6 === 0) sparks(this.cx + rnd(-8, 8), this.y + 4, '#ffd23f', 2, 1, 0); return; }
    this[this.kind]();
    const P = G.player;
    if (!this.noContact && overlap(this.hitbox(), P)) P.hurt(3, this.cx);
  }
  hitbox() { return this.kind === 'dogking' ? { x: this.x + 4, y: this.y + 6, w: this.w - 8, h: this.h - 6 } : this; }
  onPhase2() {
    G.flash = 6; Audio8.sfx(Audio8.hasExt('bosswarn') ? 'bosswarn' : 'siren');
    const line = { abo: '可惡！小黑，認真一點！', lady: '我的粉底！你完蛋了！', dogking: '汪嗚！吾要認真了！', witch: '還沒下課喔！第二節課開始！', virus: '咳咳！讓病毒大擴散吧！', typhoonB: '強烈颱風警報！風力再加大！', rhinoB: '戰鬥員們！全部給我上！', shacho: '你以為贏了？真正的生意，現在才開始！' }[this.kind];
    floatText(this.cx, this.y - 12, line, '#ff8a8a', true);
    if (this.kind === 'witch') { FX('hole', this.cx, this.cy, { life: 1.2, opts: { size: 1.4, color: '#c98aff' } }); }
    if (this.kind === 'dogking') FX('thunder', this.cx, this.floorY);
  }
  next(state, dur = 0) { this.state = state; this.st = 0; this.dur = dur; }
  faceP() { this.face = G.player.cx < this.cx ? -1 : 1; }
  physics() { this.vy = Math.min(this.vy + 0.25, 7); this.x += this.vx; this.y += this.vy; if (this.y + this.h >= this.floorY) { const was = this.vy; this.y = this.floorY - this.h; this.vy = 0; this.onGround = true; return was > 2; } this.onGround = false; this.x = clamp(this.x, this.ax0, this.ax1 - this.w); return false; }

  // 第一關：遛狗不撿阿伯 + 小黑
  abo() {
    const P = G.player, d = this.dog;
    const landed = this.physics();
    if (landed) { Audio8.sfx('land'); FX('dust', this.cx, this.floorY, { opts: { size: 0.3 } }); }
    switch (this.state) {
      case 'enter': case 'idle': this.faceP(); this.vx = 0; if (this.st > (this.phase2 ? 30 : 50)) this.next(['throw', 'sic', 'hop'][Math.floor(rnd(0, 3))]); break;
      case 'throw': {
        this.faceP(); const n = (this.phase2 ? 5 : 3) + (G.hard ? 2 : 0);
        if (this.st % 22 === 1 && this.st < n * 22) { this.throwT = 12; Audio8.sfx('throw'); const dist = Math.abs(P.cx - this.cx); G.eshots.push(new EShot('bag', this.cx, this.y + 4, this.face * clamp(dist / 50 + rnd(-0.5, 0.5), 1, 4.5), -4.2)); }
        if (this.st > n * 22 + 20) this.next('idle'); break;
      }
      case 'sic':
        if (this.st === 1) { floatText(this.cx, this.y - 8, '小黑，上！', '#fff'); Audio8.sfx('bark'); d.state = 'bark'; d.st = 0; }
        if (this.st > 70) this.next('idle'); break;
      case 'hop':
        if (this.st === 1) { const tx = this.cx < (this.ax0 + this.ax1) / 2 ? this.ax1 - 40 : this.ax0 + 40; this.vx = (tx - this.cx) / 60; this.vy = -6; this.face = Math.sign(this.vx); }
        if (this.st > 10 && this.onGround) { this.vx = 0; this.next('idle'); } break;
    }
    if (this.throwT) this.throwT--;
    // 小黑
    d.t++; d.st++; if (d.flash) d.flash--;
    d.vy = Math.min(d.vy + 0.3, 7); d.y += d.vy; if (d.y + d.h >= this.floorY) { d.y = this.floorY - d.h; d.vy = 0; d.ground = true; } else d.ground = false;
    if (d.state === 'bark') { d.face = P.cx < d.x + 15 ? -1 : 1; if (d.st > 24) { d.state = 'run'; d.st = 0; } }
    else if (d.state === 'run') {
      d.vx = d.face * (this.phase2 ? 3.6 : 3); d.x += d.vx;
      if (this.phase2 && d.st === 30 && d.ground) d.vy = -5;
      if (d.x < this.ax0 || d.x + d.w > this.ax1) { d.x = clamp(d.x, this.ax0, this.ax1 - d.w); d.state = 'sit'; d.st = 0; G.shake = 3; Audio8.sfx('hit'); }
    } else if (d.state === 'stun') { if (d.st > 50) { d.state = 'sit'; d.st = 0; } }
    else { d.vx = 0; d.face = P.cx < d.x + 15 ? -1 : 1; if (d.st > (this.phase2 ? 80 : 140) && this.state === 'idle') { d.state = 'bark'; d.st = 0; Audio8.sfx('bark'); } }
    if (d.state !== 'stun' && overlap(d, P)) P.hurt(3, d.x + 15, '被小黑撞到！');
  }
  // 第二關：名牌貴婦
  lady() {
    const P = G.player;
    const landed = this.physics();
    if (this.landT) this.landT--;
    if (landed) { this.landT = 10; Audio8.sfx('stomp'); G.shake = 5; FX('shock', this.cx, this.floorY, { opts: { size: 0.45 } }); }
    switch (this.state) {
      case 'enter': case 'idle': this.faceP(); this.vx = 0; if (this.st > (this.phase2 ? 28 : 46)) this.next(['jump', 'bag', 'chi', this.phase2 ? 'rain' : 'jump'][Math.floor(rnd(0, 4))]); break;
      case 'jump':
        if (this.st === 1) { this.vx = clamp((P.cx - this.cx) / 55, -3.5, 3.5); this.vy = -7; this.face = Math.sign(this.vx) || this.face; floatText(this.cx, this.y - 6, '踩扁你！', '#ff9fd8'); }
        if (this.st > 10 && this.onGround) { this.vx = 0; this.next('idle'); } break;
      case 'bag':
        this.faceP();
        if (this.st === 10 || (this.phase2 && this.st === 40)) { this.armT = 12; Audio8.sfx('throw'); const s = new EShot('handbag', this.cx + this.face * 10, this.y + 12 + (this.st > 30 ? -14 : 0), this.face * 4.2, 0, { dir: this.face, dmg: 4 }); G.eshots.push(s); }
        if (this.st > 90) this.next('idle'); break;
      case 'chi':
        if (this.st === 8) { this.armT = 14; floatText(this.cx, this.y - 6, '寶貝們，去！', '#ff9fd8'); Audio8.sfx('bark'); for (let i = 0; i < (this.phase2 ? 3 : 2) + (G.hard ? 1 : 0); i++) G.eshots.push(new EShot('chi', this.cx, this.y + 10, this.face * (1.2 + i * 0.6), -3 - i, { dmg: 3 })); }
        if (this.st > 70) this.next('idle'); break;
      case 'rain':
        if (this.st === 1) { this.vy = -8; this.vx = 0; this.armT = 40; floatText(this.cx, this.y - 6, '名牌包雨～！', '#ff9fd8'); }
        if (this.st > 16 && this.st < 60 && this.st % 9 === 0) { const x = rnd(this.ax0 + 10, this.ax1 - 10); FX('warn', x, this.floorY, { opts: { size: 0.9 } }); G.eshots.push(new EShot('handbag', x, -10, 0, 2.2, { dir: 0, dmg: 3 })); }
        if (this.st > 20 && this.onGround) this.next('idle'); break;
    }
    if (this.armT) this.armT--;
  }
  // 第三關：狗魔王
  dogking() {
    const P = G.player;
    const landed = this.physics();
    if (this.stompT) this.stompT--;
    if (landed) {
      this.stompT = 20;
      Audio8.sfx('stomp'); G.shake = 12; FX('shock', this.cx, this.floorY, { opts: { size: 0.9 } });
      for (const dir of [-1, 1]) G.eshots.push(new EShot('wave', this.cx + dir * 24, this.floorY - 6, dir * (this.phase2 ? 2.8 : 2.2), 0, { dmg: 4 }));
    }
    switch (this.state) {
      case 'enter': case 'idle': this.faceP(); this.vx = 0; if (this.st > (this.phase2 ? 30 : 50)) this.next(['gas', 'jump', 'rain', this.phase2 || G.hard ? 'summon' : 'gas'][Math.floor(rnd(0, 4))]); break;
      case 'gas':
        this.faceP(); this.roar = 6;
        if (this.st === 1) { Audio8.sfx('gas'); FX('venom', this.cx + this.face * 30, this.floorY, { life: 1.2, opts: { size: 0.9 } }); }
        if (this.st % 16 === 8 && this.st < (this.phase2 ? 70 : 50)) G.eshots.push(new EShot('gas', this.cx + this.face * 20, this.y + 20, this.face * rnd(1.1, 1.8), rnd(-0.4, 0.4), { dmg: 3 }));
        if (this.st > 80) this.next('idle'); break;
      case 'jump':
        if (this.st === 1) { const tx = this.cx < (this.ax0 + this.ax1) / 2 ? this.ax1 - 40 : this.ax0 + 40; this.vx = (tx - this.cx) / 70; this.vy = -7.5; }
        if (this.st > 10 && this.onGround) { this.vx = 0; this.next('idle'); } break;
      case 'rain':
        this.roar = 6;
        if (this.st === 1) { Audio8.sfx(Audio8.hasExt('bosswarn') ? 'bosswarn' : 'siren'); floatText(this.cx, this.y - 10, '便便雨，降臨吧！', '#ff8a8a', true); FX('thunder', this.cx, this.y); }
        if (this.st > 20 && this.st < 110 && this.st % (this.phase2 ? 8 : 12) === 0) { const x = rnd(this.ax0 + 8, this.ax1 - 8); G.eshots.push(new EShot('rain', x, -10, 0, 1.5, { dmg: 3 })); }
        if (this.st > 130) this.next('idle'); break;
      case 'summon':
        if (this.st === 1) { FX('venom', this.cx, this.floorY, { life: 1, opts: { size: 0.8 } }); for (const dx of [-60, 60]) { const e = new Enemy('s', clamp(this.cx + dx, this.ax0 + 20, this.ax1 - 20), this.floorY); G.enemies.push(e); } Audio8.sfx('squish'); }
        if (this.st > 60) this.next('idle'); break;
    }
    if (this.roar) this.roar--;
  }
  // 最終關：豪鬼主任（一直在天上飛）
  witch() {
    const P = G.player, A = G.arena, midX = (this.ax0 + this.ax1) / 2;
    this.noContact = false;
    const fly = (sp) => { const k = this.t / sp; this.tx = midX + Math.sin(k) * 140; this.ty = 46 + Math.sin(k * 2) * 26; this.x += (this.tx - this.w / 2 - this.x) * 0.05; this.y += (this.ty - this.h / 2 - this.y) * 0.05; this.face = P.cx < this.cx ? -1 : 1; };
    if (this.t % 4 === 0) G.parts.push({ x: this.cx - this.face * 14, y: this.cy + 6, vx: 0, vy: 0.3, life: 26, max: 26, c: ['#ffd23f', '#ff7ad9', '#7ad7ff'][this.t % 3], s: 2, g: 0 });
    switch (this.state) {
      case 'enter': case 'idle': fly(this.phase2 ? 50 : 70); if (this.st > (this.phase2 ? 50 : 80)) this.next(['stars', 'papers', 'dive', 'meteor', this.phase2 ? 'starfall' : 'stars', this.phase2 ? 'meteor' : 'dive'][Math.floor(rnd(0, 6))]); break; // 流星一開始就會出現，後半更常用
      case 'stars': {
        fly(90); this.cast = 10;
        if (this.st === 1) Audio8.sfx('magic');
        const shots = this.phase2 ? 3 : 2;
        for (let s = 0; s < shots; s++) if (this.st === 20 + s * 30) {
          const base = Math.atan2(P.cy - this.cy, P.cx - this.cx), n = this.phase2 ? 7 : 5;
          for (let i = 0; i < n; i++) { const a = base + (i - (n - 1) / 2) * 0.22; G.eshots.push(new EShot('star', this.cx, this.cy, Math.cos(a) * 2.4, Math.sin(a) * 2.4, { dmg: 3 })); }
          Audio8.sfx('star'); FX('zap', this.cx, this.cy, { opts: { color: '#ff9ae6' } });
        }
        if (this.st > 30 + shots * 30) this.next('idle'); break;
      }
      case 'papers':
        fly(90); this.cast = 10;
        if (this.st === 1) { floatText(this.cx, this.y - 8, '隨堂考！', '#ff9fd8'); Audio8.sfx('magic'); }
        if (this.st % 25 === 10 && this.st < (this.phase2 ? 110 : 80)) { G.eshots.push(new EShot('paper', this.cx, this.cy, rnd(-1.5, 1.5), -1.5, { dmg: 3 })); Audio8.sfx('throw'); }
        if (this.st > 130) this.next('idle'); break;
      case 'dive': if (this.diveStep('掃把衝刺！', '#ff9ae6')) this.next('idle'); break;
      case 'starfall':
        fly(120); this.cast = 10;
        if (this.st === 1) { floatText(this.cx, this.y - 10, '星星雨！', '#ffd23f', true); FX('converge', this.cx, this.cy, { opts: { size: 0.5 } }); Audio8.sfx('magic'); }
        if (this.st > 20 && this.st < 120 && this.st % 7 === 0) { const x = rnd(this.ax0 + 6, this.ax1 - 6); G.eshots.push(new EShot('bigstar', x, -8, rnd(-0.4, 0.4), 2.6, { dmg: 3 })); if (this.st % 21 === 0) Audio8.sfx('star'); }
        if (this.st > 140) this.next('idle'); break;
      case 'meteor':
        fly(120); this.cast = 10;
        if (this.meteorStep((this.phase2 ? 7 : 5) + (G.hard ? 2 : 0), '流星雨魔法！')) this.next('idle'); break;
    }
    if (this.cast) this.cast--;
  }
  // 共用：俯衝（先鎖定，再弧線衝過去）→ 結束回傳 true
  diveStep(say, col) {
    const P = G.player, A = G.arena, midX = (this.ax0 + this.ax1) / 2;
    if (this.st === 1) { this.diveX = P.cx; FX('warn', this.diveX, this.floorY, { opts: { size: 1.4 } }); floatText(this.cx, this.y - 8, say, col); }
    if (this.st < 40) { this.x += (this.diveX - (this.diveX > midX ? 120 : -120) - this.w / 2 - this.x) * 0.06; this.y += (30 - this.y) * 0.06; this.face = this.diveX > this.cx ? 1 : -1; }
    else if (this.st < 90) { const k = (this.st - 40) / 50; this.x += this.face * 5; this.y = 30 + Math.sin(k * Math.PI) * (this.floorY - 32 - this.h); if (this.st % 2 === 0) G.parts.push({ x: this.cx, y: this.cy, vx: 0, vy: 0, life: 20, max: 20, c: col, s: 4, g: 0 }); if (this.st === 41) Audio8.sfx('dash'); }
    this.x = clamp(this.x, A.x0, A.x1 - this.w);
    return this.st >= 90;
  }
  // 共用：流星雨（n 顆，一顆接一顆：先出現鎖定標記，再砸下來）→ 結束回傳 true
  meteorStep(n, say) {
    const P = G.player;
    if (this.st === 1) {
      const xs = [clamp(P.cx, this.ax0 + 24, this.ax1 - 24)];
      // 隨機挑落點但最多試 200 次（以前可能永遠找不到位置 → 當機），不夠就平均分布補滿
      for (let tries = 0; xs.length < n && tries < 200; tries++) { const x = rnd(this.ax0 + 24, this.ax1 - 24); if (xs.every(o => Math.abs(o - x) > 36)) xs.push(x); }
      for (let i = 0; xs.length < n; i++) xs.push(this.ax0 + 24 + ((i + 0.5) / n) * (this.ax1 - this.ax0 - 48));
      this.meteors = xs.map((x, i) => ({ x, t0: 1 + i * 13 }));
      floatText(this.cx, this.y - 10, say, '#ff8a8a', true); Audio8.sfx(Audio8.hasExt('bosswarn') ? 'bosswarn' : 'siren');
    }
    for (const m of this.meteors || []) {
      if (this.st === m.t0) FX('warn', m.x, this.floorY, { opts: { size: 1.2 } });
      if (this.st === m.t0 + 26) FX('meteor', m.x, this.floorY, { opts: { size: 0.6 }, fall: 20 });
      if (this.st === m.t0 + 46) { G.shake = Math.max(G.shake, 9); Audio8.sfx('explode', 0.02); G.flash = 3; if (Math.abs(P.cx - m.x) < 34 && P.y + P.h > this.floorY - 30) P.hurt(4, m.x, '流星直擊！'); }
    }
    if (!this.meteors || this.st > this.meteors[this.meteors.length - 1].t0 + 70) { this.meteors = null; return true; }
    return false;
  }
  // 召喚小怪（有上限，不會無限多）
  summon(code, n, max = 5) {
    for (let i = 0; i < n; i++) {
      if (G.enemies.filter(e => e.code === code && !e.dead && e.x > this.ax0 - 40).length >= max) break; // 只算魔王房間裡的
      // 直接在魔王身邊冒煙變出來，一出來就往主角衝（不用瞄準框）
      const side = i % 2 ? -1 : 1, x = clamp(this.cx + side * (22 + i * 10), this.ax0 + 16, this.ax1 - 16);
      const e = new Enemy(code, x, this.floorY); e.rush = true; e.st = 40; G.enemies.push(e);
      FX('puff', x, this.floorY - 10, { opts: { size: 0.5 } }); for (let k = 0; k < 8; k++) G.parts.push({ x, y: this.floorY - 10, vx: rnd(-1.5, 1.5), vy: rnd(-2, -0.5), life: 22, max: 22, c: code === 'g' ? '#3a3040' : '#8fbf3a', s: 3, g: 0, smoke: true });
    }
  }

  // ===== 二周目 第一關：病毒怪人 =====
  virus() {
    const P = G.player, landed = this.physics();
    this.x = clamp(this.x, this.ax0, this.ax1 - this.w);
    if (landed) {
      this.landT = 10; Audio8.sfx('stomp'); G.shake = 9; FX('shock', this.cx, this.floorY, { opts: { size: 0.6 } });
      if (this.state === 'stomp') for (const dir of [-1, 1]) for (let i = 0; i < (this.phase2 ? 2 : 1) + (G.hard ? 1 : 0); i++) G.eshots.push(new EShot('germ', this.cx + dir * 12, this.y + 20, dir * (1.6 + i * 1.1), -3.5 - i, { dmg: 3 }));
    }
    if (this.landT) this.landT--;
    switch (this.state) {
      case 'enter': case 'idle':
        this.faceP(); this.vx = Math.abs(P.cx - this.cx) > 80 ? this.face * 0.6 : 0;
        if (this.st > (this.phase2 ? 30 : 50)) { this.vx = 0; this.next(['spit', 'stomp', 'spit', 'puff', this.phase2 ? 'stomp' : 'spit'][Math.floor(rnd(0, 5))]); } break;
      case 'spit': { this.faceP(); this.vx = 0; const n = (this.phase2 ? 4 : 3) + (G.hard ? 1 : 0);
        if (this.st % 20 === 8 && this.st < n * 20) { this.spitT = 10; Audio8.sfx('throw'); const dist = Math.abs(P.cx - this.cx); G.eshots.push(new EShot('germ', this.cx + this.face * 14, this.y + 16, this.face * clamp(dist / 45 + rnd(-0.4, 0.4), 1.4, 4.6), -4, { dmg: 3, spawn: this.phase2 && this.st < 20 })); }
        if (this.st > n * 20 + 24) this.next('idle'); break; }
      case 'stomp':
        if (this.st === 1) this.vx = 0;
        if (this.st === 18) { this.vx = clamp((P.cx - this.cx) / 50, -4, 4); this.vy = -7.5; this.face = Math.sign(this.vx) || this.face; Audio8.sfx('dash'); floatText(this.cx, this.y - 8, '病毒大跳躍！', '#b6ff6a'); }
        if (this.st > 26 && this.onGround) { this.vx = 0; this.next('idle'); } break;
      case 'puff':
        this.vx = 0; this.puffT = 4;
        if (this.st === 1) { floatText(this.cx, this.y - 8, '病毒擴散～！', '#b6ff6a', true); Audio8.sfx('gas'); FX('venom', this.cx, this.floorY, { life: 1, opts: { size: 0.8 } }); }
        if (this.st === 20 || this.st === 44) for (const i of [-1, 1]) G.eshots.push(new EShot('gas', this.cx + i * 16, this.y + 20, i * rnd(0.8, 1.4), rnd(-0.6, 0), { dmg: 3 }));
        if (this.st === 30) { this.summon('x', (this.phase2 ? 3 : 2) + (G.hard ? 1 : 0), 6); Audio8.sfx('squish'); }
        if (this.st > 70) this.next('idle'); break;
    }
    if (this.spitT) this.spitT--; if (this.puffT) this.puffT--;
  }
  // ===== 二周目 第二關：颱風怪人（一直在天上飛）=====
  typhoonB() {
    const P = G.player, midX = (this.ax0 + this.ax1) / 2;
    const fly = (sp, h = 50) => { const k = this.t / sp, tx = midX + Math.sin(k) * 130, ty = h + Math.sin(k * 2) * 18; this.x += (tx - this.w / 2 - this.x) * 0.04; this.y += (ty - this.h / 2 - this.y) * 0.04; this.faceP(); };
    if (this.t % 5 === 0) G.parts.push({ x: this.cx + rnd(-20, 20), y: this.y + this.h, vx: rnd(-1, 1), vy: 0.6, life: 24, max: 24, c: '#cfe6ff', s: 2, g: 0 });
    switch (this.state) {
      case 'enter': case 'idle': fly(this.phase2 ? 55 : 75); if (this.st > (this.phase2 ? 40 : 65)) this.next(['blow', 'trash', 'dive', this.phase2 ? 'storm' : 'blow'][Math.floor(rnd(0, 4))]); break;
      case 'blow': {
        if (this.st === 1) { this.side = P.cx < midX ? 1 : -1; floatText(this.cx, this.y - 8, '吹飛你！', '#9fd0ff', true); }
        const tx = midX + this.side * 120, ty = this.floorY - 60, end = this.phase2 ? 150 : 120;
        this.x += (tx - this.w / 2 - this.x) * 0.06; this.y += (ty - this.h / 2 - this.y) * 0.06; this.face = -this.side; this.blowT = this.st > 30 ? 4 : 0;
        if (this.st > 30 && this.st < end - 20 && this.st % (G.hard ? 7 : 10) === 0) { G.eshots.push(new EShot('gust', this.cx + this.face * 20, this.floorY - rnd(10, 46), this.face * 2.4, 0, { dmg: 2 })); if (this.st % 30 === 0) Audio8.sfx('gas'); }
        if (this.phase2 && this.st % 40 === 35) G.eshots.push(new EShot('can', this.cx, this.cy, this.face * 3, -2, { dmg: 3 }));
        if (this.st > end) this.next('idle'); break; }
      case 'trash':
        if (this.st === 1) { this.dir = this.cx < midX ? 1 : -1; floatText(this.cx, this.y - 8, '垃圾全部吹上街！', '#9fd0ff', true); this.laughT = 30; }
        this.y += (30 - this.y) * 0.08; this.x += this.dir * 2.6; this.face = this.dir;
        if (this.st % (this.phase2 || G.hard ? 12 : 18) === 6) { G.eshots.push(new EShot('can', this.cx, this.y + this.h - 6, this.dir * 0.4, 0.5, { dmg: 3 })); Audio8.sfx('throw'); }
        if ((this.dir > 0 && this.x + this.w >= this.ax1) || (this.dir < 0 && this.x <= this.ax0) || this.st > 200) this.next('idle');
        this.x = clamp(this.x, this.ax0, this.ax1 - this.w); break;
      case 'dive': if (this.diveStep('颱風俯衝！', '#cfe6ff')) this.next('idle'); break;
      case 'storm':
        fly(120, 40); this.laughT = 4;
        if (this.st === 1) { floatText(this.cx, this.y - 10, '颱風眼！垃圾大雨！', '#ff8a8a', true); Audio8.sfx(Audio8.hasExt('bosswarn') ? 'bosswarn' : 'siren'); }
        if (this.st > 20 && this.st < 130 && this.st % (G.hard ? 6 : 9) === 0) { const x = rnd(this.ax0 + 8, this.ax1 - 8); FX('warn', x, this.floorY, { opts: { size: 0.7 } }); G.eshots.push(new EShot('can', x, -10, 0, 0.6, { dmg: 3, grav: 0.1 })); }
        if (this.st > 150) this.next('idle'); break;
    }
    if (this.laughT) this.laughT--;
  }
  // ===== 二周目 第三關：犀牛怪人 =====
  rhinoB() {
    const P = G.player, landed = this.physics();
    const hitWall = this.x < this.ax0 || this.x + this.w > this.ax1;
    this.x = clamp(this.x, this.ax0, this.ax1 - this.w);
    if (landed) {
      Audio8.sfx('stomp'); G.shake = 10; FX('shock', this.cx, this.floorY, { opts: { size: 0.8 } });
      for (const dir of [-1, 1]) G.eshots.push(new EShot('wave', this.cx + dir * 24, this.floorY - 6, dir * (this.phase2 ? 2.8 : 2.2), 0, { dmg: 4 }));
    }
    switch (this.state) {
      case 'enter': case 'idle': this.faceP(); this.vx = 0; this.running = false; if (this.st > (this.phase2 ? 28 : 48)) this.next(['charge', 'charge', 'stomp', this.phase2 ? 'summon' : 'rocks', 'rocks'][Math.floor(rnd(0, 5))]); break;
      case 'charge':
        if (this.st === 1) { this.faceP(); this.chDir = this.face; floatText(this.cx, this.y - 8, '犀牛衝撞！', '#ff9a6a'); Audio8.sfx('charge1'); }
        if (this.st < 32) { this.vx = 0; this.x += this.st % 4 < 2 ? -1 : 1; if (this.st % 6 === 0) FX('dust', this.cx - this.chDir * 18, this.floorY, { opts: { size: 0.3 } }); }
        else {
          this.vx = this.chDir * (this.phase2 || G.hard ? 6 : 5); this.face = this.chDir; this.running = true; if (this.st % 5 === 0) FX('dust', this.cx - this.chDir * 18, this.floorY, { opts: { size: 0.3 } });
          if (hitWall || this.st > 160) {
            this.vx = 0; this.running = false; G.shake = 14; Audio8.sfx('explode'); FX('shock', this.cx + this.chDir * 20, this.floorY, { opts: { size: 0.7 } }); floatText(this.cx, this.y - 10, '暈…', '#fff');
            const n = (this.phase2 ? 5 : 3) + (G.hard ? 2 : 0); for (let i = 0; i < n; i++) { const x = rnd(this.ax0 + 12, this.ax1 - 12); FX('warn', x, this.floorY, { opts: { size: 0.8 } }); G.eshots.push(new EShot('rock', x, -10 - i * 34, 0, 1, { dmg: 3 })); }
            this.next('dizzy');
          }
        } break;
      case 'dizzy': this.vx = 0; if (this.st % 8 === 0) sparks(this.cx + rnd(-10, 10), this.y + 2, '#ffd23f', 2, 1, 0); if (this.st > (G.hard ? 30 : 50)) this.next('idle'); break;
      case 'stomp':
        if (this.st === 1) { this.vx = clamp((P.cx - this.cx) / 50, -3, 3); this.vy = -6.5; this.face = Math.sign(this.vx) || this.face; }
        if (this.st > 10 && this.onGround) { this.vx = 0; this.next('idle'); } break;
      case 'rocks': { // 丟廢土塊：先舉過頭頂（往後仰），再往前一甩
        this.faceP(); const n = (this.phase2 ? 4 : 3) + (G.hard ? 1 : 0), per = 26, ph = this.st % per;
        if (this.st === 1) floatText(this.cx, this.y - 10, '廢土丟過去！', '#e0b070', true);
        if (this.st < n * per) {
          if (ph === 1) { this.holdT = 14; Audio8.sfx('charge1', 0.1); }
          if (ph === 15) { this.holdT = 0; this.throwT = 10; Audio8.sfx('throw'); const dist = Math.abs(P.cx - this.cx); G.eshots.push(new EShot('rock', this.cx + this.face * 10, this.y - 6, this.face * clamp(dist / 50 + rnd(-0.3, 0.3), 1.5, 4.5), -4.2, { dmg: 3 })); }
        }
        if (this.st > n * per + 30) this.next('idle'); break; }
      case 'summon':
        if (this.st === 1) { floatText(this.cx, this.y - 10, '走れ！戰鬥員！', '#ff9a6a', true); Audio8.sfx('bark'); this.summon('g', 2 + (G.hard ? 1 : 0), 4); }
        if (this.st > 60) this.next('idle'); break;
    }
    if (this.throwT) this.throwT--; if (this.holdT) this.holdT--;
  }
  // ===== 二周目 最終關：怪獸社長 =====
  shacho() {
    const P = G.player, midX = (this.ax0 + this.ax1) / 2;
    this.noContact = !!this.hidden;
    // 渾身散發黑氣：黑煙從身體四周往上飄（第二階段更濃）
    if (!this.hidden && this.t % (this.phase2 ? 2 : 3) === 0) G.parts.push({ x: this.x + rnd(0, this.w), y: this.y + rnd(4, this.h), vx: rnd(-0.3, 0.3), vy: rnd(-1.1, -0.5), life: 34, max: 34, c: this.t % 9 === 0 ? '#3a1050' : '#0a0610', s: rnd(3, 6), g: 0, smoke: true });
    if (!this.floatUp) { this.physics(); this.x = clamp(this.x, this.ax0, this.ax1 - this.w); }
    switch (this.state) {
      case 'enter': case 'idle': this.faceP(); this.vx = 0; if (this.st > (this.phase2 ? 36 : 56)) this.next(['orbs', 'tp', 'orbs', 'summon', this.phase2 ? 'dark' : 'tp'][Math.floor(rnd(0, 5))]); break;
      case 'orbs': {
        this.faceP(); this.castT = 6; const waves = this.phase2 ? 3 : 2;
        if (this.st === 1) { Audio8.sfx('magic'); FX('converge', this.cx, this.cy, { opts: { size: 0.4, color: '#b04dff' } }); }
        for (let w = 0; w < waves; w++) if (this.st === 24 + w * 28) {
          const base = Math.atan2(P.cy - this.cy, P.cx - this.cx), n = (this.phase2 ? 5 : 3) + (G.hard ? 2 : 0);
          for (let i = 0; i < n; i++) { const a = base + (i - (n - 1) / 2) * 0.32; G.eshots.push(new EShot('orb', this.cx + this.face * 10, this.cy - 8, Math.cos(a) * 2.2, Math.sin(a) * 2.2, { dmg: 3, home: i === (n - 1) / 2 })); }
          Audio8.sfx('star');
        }
        if (this.st > 30 + waves * 28) this.next('idle'); break; }
      case 'tp':
        if (this.st === 1) { this.tpPose = 'out'; Audio8.sfx('warp'); FX('hole', this.cx, this.cy, { life: 0.8, opts: { size: 0.8, color: '#b04dff' } }); }
        if (this.st === 18) this.hidden = true;
        if (this.st === 50) { const side = P.cx < midX ? 1 : -1; this.x = clamp(P.cx + side * rnd(50, 80) - this.w / 2, this.ax0, this.ax1 - this.w); this.y = this.floorY - this.h; this.hidden = false; this.tpPose = 'in'; Audio8.sfx('warp'); FX('hole', this.cx, this.cy, { life: 0.8, opts: { size: 0.8, color: '#b04dff' } }); this.faceP(); }
        if (this.st === 66) { this.tpPose = null; this.next(rnd(0, 1) < 0.6 ? 'orbs' : 'slash'); } break;
      case 'slash':
        if (this.st === 1) { this.faceP(); floatText(this.cx, this.y - 8, '黑暗商法！', '#d08aff'); }
        if (this.st < 14) this.vx = 0;
        else if (this.st < 40) { this.vx = this.face * 5; if (this.st % 2 === 0) G.parts.push({ x: this.cx, y: this.cy, vx: 0, vy: 0, life: 18, max: 18, c: '#8a3aff', s: 5, g: 0 }); if (this.st === 14) Audio8.sfx('dash'); }
        else { this.vx = 0; this.next('idle'); } break;
      case 'summon':
        this.summonT = 4;
        if (this.st === 10) { floatText(this.cx, this.y - 10, '員工們，加班了！', '#d08aff', true); Audio8.sfx('magic'); this.summon('g', 1 + (G.hard ? 1 : 0), 3); this.summon('x', 2, 5); }
        if (this.st > 60) this.next('idle'); break;
      case 'dark':
        this.floatUp = true; this.castT = 4; this.vy = 0; this.y += (40 - this.y) * 0.06;
        if (this.meteorStep((this.phase2 ? 7 : 5) + (G.hard ? 2 : 0), '黑暗隕石雨！')) { this.floatUp = false; this.next('idle'); } break;
    }
    if (this.castT) this.castT--; if (this.summonT) this.summonT--;
  }
  damage(dmg, b) {
    if (this.inv > 0 || this.defeated || this.hidden || this.state === 'enter' && G.mode !== 'boss') return false;
    if (this.kind === 'abo' && b && overlap(b, this.dog) && this.dog.state !== 'stun') { this.dog.state = 'stun'; this.dog.st = 0; this.dog.flash = 10; floatText(this.dog.x + 15, this.dog.y - 4, '嗚…', '#fff'); Audio8.sfx('hit'); return true; }
    const wk = WEAKNESS[this.kind], weak = b && b.wkind && (Array.isArray(wk) ? wk.includes(b.wkind) : wk === b.wkind);
    if (weak) {
      dmg = Math.max(4, Math.round(dmg * 2)); this.stagger = 36;
      floatText(this.cx, this.y - 16, '弱點！效果拔群！', '#ff5a5a', true); FX('ink', this.cx, this.cy); G.shake = 8;
      const cry = { abo: '哇啊！我的袋子被吸走了！', lady: '不要！塑膠袋配不上我的名牌！', dogking: '嗚汪！香香的…好難受！',
        'virus:bubble': '嗚哇！肥皂泡泡…病毒最怕這個！', 'virus:ram': '被廢土壓扁了！咳咳咳！',
        'typhoonB:tornado': '反方向的旋風！我的風被吸走了！', 'typhoonB:spray': '消毒水把我的雲打濕了！飛不動啦！',
        'rhinoB:bag': '垃圾袋炸彈！好痛好痛！', 'rhinoB:gust': '風好大！站、站不穩啊！',
        shacho: '我的黑氣…被吹散了！？' }[this.kind + ':' + b.wkind] || { abo: '哇啊！我的袋子被吸走了！', lady: '不要！塑膠袋配不上我的名牌！', dogking: '嗚汪！香香的…好難受！', shacho: '我的黑氣…被吹散了！？' }[this.kind];
      if (cry && (!this.cryT || G.t - this.cryT > 200)) { this.cryT = G.t; floatText(this.cx, this.y - 30, cry, '#fff'); }
    }
    this.hp -= dmg; this.inv = 45; this.flash = 18; Audio8.sfx('hit'); // 洛克人式：被打後約 0.75 秒無敵（會閃爍），不能連續狂打
    if (b) { sparks(b.cx, b.y + b.h / 2, '#bff4ff', 6, 1.6, 0.1); if (dmg >= 6) floatText(this.cx, this.y - 4, 'BIG HIT!', '#ffd23f'); }
    if (this.hp <= 0) { this.hp = 0; this.defeated = true; this.st = 0; this.vx = 0; G.onBossDefeated(this); }
    return true;
  }
  deathAnim() {
    // 交給 main 的流程；這裡只做持續小爆炸
    if (this.st < 100 && this.st % 24 === 0) { FX('explode', this.cx + rnd(-16, 16), this.cy + rnd(-16, 16), { opts: { size: 0.4 } }); Audio8.sfx('explode'); G.shake = 6; }
    if (this.kind === 'witch') { if (this.y + this.h < this.floorY) { this.y += 1.2; } this.x += ((G.arena.x0 + G.arena.x1) / 2 - this.cx) * 0.02; }
    else { this.vx = 0; if (this.vy < 0) this.vy = 0; this.physics(); } // 空中被打倒：不再帶著衝刺速度飛出畫面，直接落下
    const A = G.arena; if (A) this.x = clamp(this.x, A.x0 + 4, A.x1 - this.w - 4);
    if (this.kind === 'abo') { const d = this.dog; d.vx = 0; d.state = 'happy'; }
  }
  sprKey() {
    const hurtK = { abo: 'a_hurt', lady: 'l_hurt', dogking: 'k_hurt', virus: 'vb_hurt', shacho: 'sh_hurt' }[this.kind]; // 被打到：短暫換成受傷姿勢
    if (!this.defeated && this.flash > 9 && hurtK && SPR.has(hurtK)) return hurtK;
    const f2 = Math.floor(this.t / 8) % 2, f8 = Math.floor(this.t / 5) % 8, f4 = Math.floor(this.t / 6) % 4;
    const air = !this.onGround && (this.state !== 'enter' || this.kind === 'lady' && this.y < this.floorY - this.h - 1);
    if (this.kind === 'abo') return this.defeated ? 'a_sorry' + f2 : this.throwT ? 'a_t' + (this.throwT > 8 ? 0 : this.throwT > 4 ? 1 : 2) : air ? (this.vy < 0 ? 'a_j0' : 'a_j1') : (this.anim || Math.abs(this.vx) > 0.1) ? 'a_walk' + f8 : 'a_stand';
    if (this.kind === 'lady') return this.defeated ? 'l_cry' + f2 : this.armT ? 'l_t' + (this.armT > 8 ? 0 : this.armT > 4 ? 1 : 2) : air ? 'l_j1' : this.landT ? 'l_j2' : 'l_stand';
    if (this.kind === 'dogking') return this.defeated ? (this.st < 70 ? 'k_shrink' : 'k_pup' + (this.st > 160 ? 2 : f2)) : this.state === 'gas' ? 'k_gas' : this.roar ? 'k_roar' + f2 : air ? 'k_j1' : this.stompT ? 'k_j2' : this.state === 'jump' && this.st < 6 ? 'k_j0' : 'k_idle' + (Math.floor(this.t / 20) % 2);
    if (this.kind === 'witch') return this.defeated ? (this.y + this.h >= this.floorY - 1 ? (this.st > 200 ? 'w_stand' : 'w_kneel') : 'w_hit') : this.flash > 10 ? 'w_hit' : 'w_ride' + f4;
    const slow2 = Math.floor(this.t / 20) % 2;
    if (this.kind === 'virus') return this.defeated ? 'vb_ko' + (this.st > 90 ? 1 : 0) : this.spitT ? 'vb_spit' : this.state === 'stomp' && this.st < 18 ? 'vb_crouch' : !this.onGround ? 'vb_jump' : this.puffT ? 'vb_puff' : Math.abs(this.vx) > 0.1 ? 'vb_walk' + f4 : 'vb_idle' + slow2;
    if (this.kind === 'typhoonB') return this.defeated ? 'vt_ko' : this.blowT ? 'vt_blow' : this.laughT ? 'vt_laugh' : 'vt_fly' + f2;
    if (this.kind === 'rhinoB') return this.defeated ? 'vr_ko' : this.running || (this.state === 'charge' && this.st < 32 && this.st % 8 < 4) ? 'vr_run' + f4 : 'vr_idle';
    if (this.kind === 'shacho') return this.defeated ? (this.st < 100 ? 'sh_ko0' : 'sh_ko1') : this.tpPose === 'out' ? 'sh_tpout' : this.tpPose === 'in' ? 'sh_tpin' : this.floatUp ? (SPR.has('sh_float') ? 'sh_float' : 'sh_castbig') : this.state === 'orbs' && this.castT && this.st % 28 > 18 ? 'sh_castbig' : this.castT ? 'sh_cast' + f2 : this.summonT ? 'sh_summon' : Math.abs(this.vx) > 3 ? 'sh_run' + f2 : Math.abs(this.vx) > 0.1 ? 'sh_walk' + f2 : slow2 ? 'sh_idle' : 'sh_stand';
  }
  draw(ctx, cx) {
    if (this.hidden) return; // 怪獸社長瞬移中
    const sk = this.sprKey();
    if (!SPR.has(sk) && !['abo', 'lady', 'dogking', 'witch'].includes(this.kind)) { ctx.fillStyle = '#6a3a8a'; ctx.fillRect(Math.round(this.x - cx), Math.round(this.y), this.w, this.h); return; } // 圖還沒載好時的保底
    if (this.kind === 'shacho' && !this.defeated) { ctx.globalAlpha = 0.22 + Math.sin(this.t / 8) * 0.08; ctx.fillStyle = '#8a3aff'; ctx.beginPath(); ctx.ellipse(this.cx - cx, this.cy, this.w * 1.2, this.h * 0.6, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
    if (SPR.has(sk)) {
      const white = this.flash > 0 && this.flash % 4 < 2;
      if (this.kind === 'abo') {
        const d = this.dog, df2 = Math.floor(d.t / 8) % 2, dk = d.state === 'run' ? 'b_run' + (Math.floor(d.t / 3) % 8) : d.state === 'bark' ? 'b_growl' + df2 : d.state === 'stun' ? 'b_dizzy' + df2 : d.state === 'happy' ? 'b_happy' + df2 : 'b_sit';
        if (SPR.has(dk)) { SPR.draw(ctx, dk, d.x + d.w / 2 - cx, d.y + d.h + 1, d.face, false); if (d.flash && d.flash % 4 < 2) SPR.draw(ctx, dk, d.x + d.w / 2 - cx, d.y + d.h + 1, d.face, true, 0.8); }
        if (d.state === 'stun') { ctx.fillStyle = '#ffd23f'; for (let i = 0; i < 3; i++) { const a = this.t / 8 + i * 2.1; ctx.fillRect(Math.round(d.x + 15 + Math.cos(a) * 10 - cx), Math.round(d.y - 6 + Math.sin(a) * 3), 2, 2); } }
      }
      let dy = this.y + this.h + 1;
      if (this.kind === 'witch') dy += 6 + (this.defeated ? 0 : Math.round(Math.sin(this.t / 10) * 2));
      if (this.kind === 'dogking' && !this.defeated && this.t % 40 < 20) { ctx.globalAlpha = 0.18; ctx.fillStyle = '#9b4dff'; ctx.beginPath(); ctx.ellipse(this.cx - cx, this.cy, this.w * 0.8, this.h * 0.7, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
      if (this.rise) { ctx.save(); ctx.beginPath(); ctx.rect(0, 0, VW, this.floorY); ctx.clip(); SPR.draw(ctx, sk, this.cx - cx, dy + this.rise * 72, this.face); ctx.restore(); }
      else { // 被打到：左右抖一下＋往下壓扁一點（受傷反應），再加白色閃爍
        const hit = this.flash > 8 && !this.defeated, ox = hit ? (this.flash % 4 < 2 ? -2 : 2) : 0, sq = hit ? 0.93 : 1;
        ctx.save(); if (this.inv > 0 && !this.defeated && !hit && this.inv % 6 < 3) ctx.globalAlpha = 0.35; // 無敵時間：閃爍
        ctx.translate(Math.round(this.cx - cx + ox), dy); ctx.scale(2 - sq, sq);
        if (this.kind === 'rhinoB' && !this.defeated) { const lean = this.holdT ? -0.14 : this.throwT ? 0.16 : 0; if (lean) ctx.rotate(lean * this.face); } // 丟東西：舉起時往後仰、丟出時往前甩
        SPR.draw(ctx, sk, 0, 0, this.face); if (white) SPR.draw(ctx, sk, 0, 0, this.face, true, 0.85);
        if (this.kind === 'rhinoB' && this.holdT && !this.defeated) drawRubble(ctx, -this.face * 4, -this.h - 14, 1.6, this.t); // 舉在頭上的廢土塊
        ctx.restore(); }
      if (this.kind === 'lady' && sk === 'l_stand' && !SPR.has('chi')) {}
      return;
    }
    const S = PX.S;
    const hide = this.flash > 0 && this.flash % 4 < 2;
    const pick = (k) => (hide ? S[k + '_w'] : S[k]) || S[k];
    const drawAt = (img, x, y, flip) => { ctx.save(); ctx.translate(Math.round(x - cx), Math.round(y)); ctx.scale(flip, 1); ctx.drawImage(img, -Math.round(img.width / 2), -img.height); ctx.restore(); };
    const f4 = Math.floor(this.t / 8) % 4;
    if (this.kind === 'abo') {
      const d = this.dog;
      const dk = d.state === 'happy' ? 'dogKhappy' : d.state === 'run' ? 'dogK' + (Math.floor(d.t / 4) % 4) : d.state === 'bark' ? 'dogKangry' : d.state === 'stun' ? 'dogKhappy' : 'dogK0';
      drawAt((d.flash && d.flash % 4 < 2 ? S[dk + '_w'] : S[dk]) || S[dk], d.x + d.w / 2, d.y + d.h + 2, d.face);
      if (d.state === 'stun') { ctx.fillStyle = '#ffd23f'; for (let i = 0; i < 3; i++) { const a = this.t / 8 + i * 2.1; ctx.fillRect(Math.round(d.x + 15 + Math.cos(a) * 10 - cx), Math.round(d.y - 6 + Math.sin(a) * 3), 2, 2); } }
      const k = this.defeated ? 'aboUp' : this.throwT ? 'aboT' : (!this.onGround ? 'aboUp' : (this.anim || Math.abs(this.vx) > 0.1) ? 'abo' + f4 : 'abo0');
      drawAt(pick(k), this.cx, this.y + this.h + 1, this.face);
    } else if (this.kind === 'lady') {
      const k = this.defeated ? 'ladyUp' : this.armT ? 'ladyT' : !this.onGround && this.state !== 'enter' ? 'ladyUp' : 'ladyH';
      drawAt(pick(k), this.cx, this.y + this.h + 1, this.face);
      if (!this.defeated && k === 'ladyH') { ctx.save(); ctx.translate(Math.round(this.cx + this.face * 8 - cx), Math.round(this.y + 22)); ctx.scale(this.face, 1); ctx.drawImage(S['chi' + (Math.floor(this.t / 12) % 2)], -7, -9); ctx.restore(); }
    } else if (this.kind === 'dogking') {
      const k = this.defeated ? 'dkStomp' : this.roar ? 'dkRoar' : !this.onGround ? 'dkJump' : 'dk' + (Math.floor(this.t / 20) % 2);
      if (this.rise) { ctx.save(); ctx.beginPath(); ctx.rect(0, 0, VW, this.floorY); ctx.clip(); drawAt(pick(k), this.cx, this.y + this.h + 6 + this.rise * 64, this.face); ctx.restore(); }
      else drawAt(pick(k), this.cx, this.y + this.h + 6, this.face);
      if (!this.defeated && this.t % 40 < 20) { ctx.globalAlpha = 0.25; ctx.fillStyle = '#9b4dff'; ctx.fillRect(Math.round(this.x - cx) - 2, Math.round(this.y) - 2, this.w + 4, this.h + 4); ctx.globalAlpha = 1; }
    } else if (this.kind === 'witch') {
      const k = this.defeated ? 'witchH' : this.cast ? 'witchC' : 'witch' + (Math.floor(this.t / 10) % 2);
      const bob = this.defeated ? 0 : Math.round(Math.sin(this.t / 10) * 2);
      drawAt(pick(k), this.cx, this.y + this.h + 8 + bob, this.face);
    }
  }
}
