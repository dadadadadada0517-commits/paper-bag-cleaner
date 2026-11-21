// ===== 魔王 =====
class Boss {
  constructor(kind, x, floorY) {
    this.kind = kind; this.t = 0; this.st = 0; this.state = 'enter'; this.hp = 20; this.maxHp = 20; this.inv = 0; this.flash = 0;
    this.face = -1; this.vx = 0; this.vy = 0; this.floorY = floorY; this.dead = false; this.defeated = false; this.phase2 = false; this.queue = [];
    const A = G.arena;
    this.ax0 = A.x0 + 16; this.ax1 = A.x1 - 16;
    const dims = { abo: [18, 38], lady: [20, 42], dogking: [44, 60], witch: [30, 28] }[kind];
    this.w = dims[0]; this.h = dims[1];
    this.x = x - this.w / 2; this.y = floorY - this.h;
    if (kind === 'abo') { this.dog = { x: this.ax1 - 44, y: floorY - 24, w: 34, h: 24, vx: 0, vy: 0, face: -1, state: 'sit', st: 0, t: 0, flash: 0 }; }
    if (kind === 'lady') { this.y = -60; }
    if (kind === 'dogking') { this.y = floorY - this.h; this.rise = 0; }
    if (kind === 'witch') { this.x = A.x1 + 30; this.y = 60; this.hp = 24; this.maxHp = 24; }
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
      if (this.t === 1) { this.x = this.ax1 - 80; this.rise = 1; FX('hole', this.cx, this.floorY - 30, { life: 1.6, opts: { size: 1.6 } }); Audio8.sfx('siren'); G.dark = 1; }
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
    return true;
  }
  // ---- 戰鬥 ----
  update() {
    this.t++; this.st++; if (this.inv > 0) this.inv--; if (this.flash > 0) this.flash--;
    if (this.defeated) { this.deathAnim(); return; }
    if (!this.phase2 && this.hp <= this.maxHp / 2) { this.phase2 = true; this.onPhase2(); }
    if (this.stagger > 0) { this.stagger--; this.vx = 0; if (this.kind !== 'witch') this.physics(); if (this.t % 6 === 0) sparks(this.cx + rnd(-8, 8), this.y + 4, '#ffd23f', 2, 1, 0); return; }
    this[this.kind]();
    const P = G.player;
    if (!this.noContact && overlap(this.hitbox(), P)) P.hurt(3, this.cx);
  }
  hitbox() { return this.kind === 'dogking' ? { x: this.x + 4, y: this.y + 6, w: this.w - 8, h: this.h - 6 } : this; }
  onPhase2() {
    G.flash = 6; Audio8.sfx('siren');
    const line = { abo: '可惡！小黑，認真一點！', lady: '我的粉底！你完蛋了！', dogking: '汪嗚！吾要認真了！', witch: '還沒下課喔！第二節課開始！' }[this.kind];
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
        this.faceP(); const n = this.phase2 ? 5 : 3;
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
        if (this.st === 8) { this.armT = 14; floatText(this.cx, this.y - 6, '寶貝們，去！', '#ff9fd8'); Audio8.sfx('bark'); for (let i = 0; i < (this.phase2 ? 3 : 2); i++) G.eshots.push(new EShot('chi', this.cx, this.y + 10, this.face * (1.2 + i * 0.6), -3 - i, { dmg: 3 })); }
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
      case 'enter': case 'idle': this.faceP(); this.vx = 0; if (this.st > (this.phase2 ? 30 : 50)) this.next(['gas', 'jump', 'rain', this.phase2 ? 'summon' : 'gas'][Math.floor(rnd(0, 4))]); break;
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
        if (this.st === 1) { Audio8.sfx('siren'); floatText(this.cx, this.y - 10, '便便雨，降臨吧！', '#ff8a8a', true); FX('thunder', this.cx, this.y); }
        if (this.st > 20 && this.st < 110 && this.st % (this.phase2 ? 8 : 12) === 0) { const x = rnd(this.ax0 + 8, this.ax1 - 8); G.eshots.push(new EShot('rain', x, -10, 0, 1.5, { dmg: 3 })); }
        if (this.st > 130) this.next('idle'); break;
      case 'summon':
        if (this.st === 1) { FX('venom', this.cx, this.floorY, { life: 1, opts: { size: 0.8 } }); for (const dx of [-60, 60]) { const e = new Enemy('s', clamp(this.cx + dx, this.ax0 + 20, this.ax1 - 20), this.floorY); G.enemies.push(e); } Audio8.sfx('squish'); }
        if (this.st > 60) this.next('idle'); break;
    }
    if (this.roar) this.roar--;
  }
  // 最終關：小魔女（一直在天上飛）
  witch() {
    const P = G.player, A = G.arena, midX = (this.ax0 + this.ax1) / 2;
    this.noContact = false;
    const fly = (sp) => { const k = this.t / sp; this.tx = midX + Math.sin(k) * 140; this.ty = 46 + Math.sin(k * 2) * 26; this.x += (this.tx - this.w / 2 - this.x) * 0.05; this.y += (this.ty - this.h / 2 - this.y) * 0.05; this.face = P.cx < this.cx ? -1 : 1; };
    if (this.t % 4 === 0) G.parts.push({ x: this.cx - this.face * 14, y: this.cy + 6, vx: 0, vy: 0.3, life: 26, max: 26, c: ['#ffd23f', '#ff7ad9', '#7ad7ff'][this.t % 3], s: 2, g: 0 });
    switch (this.state) {
      case 'enter': case 'idle': fly(this.phase2 ? 50 : 70); if (this.st > (this.phase2 ? 50 : 80)) this.next(['stars', 'papers', 'dive', this.phase2 ? 'starfall' : 'stars', this.phase2 ? 'meteor' : 'dive'][Math.floor(rnd(0, 5))]); break;
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
      case 'dive':
        if (this.st === 1) { this.diveX = P.cx; this.warnFx = FX('warn', this.diveX, this.floorY, { opts: { size: 1.4 } }); floatText(this.cx, this.y - 8, '掃把衝刺！', '#ff9fd8'); this.startX = this.cx; this.startY = this.cy; }
        if (this.st < 40) { this.x += (this.diveX - (this.diveX > midX ? 120 : -120) - this.w / 2 - this.x) * 0.06; this.y += (30 - this.y) * 0.06; this.face = this.diveX > this.cx ? 1 : -1; }
        else if (this.st < 90) { const k = (this.st - 40) / 50; this.x += this.face * 5; this.y = 30 + Math.sin(k * Math.PI) * (this.floorY - 60); if (this.st % 2 === 0) G.parts.push({ x: this.cx, y: this.cy, vx: 0, vy: 0, life: 20, max: 20, c: '#ff9ae6', s: 4, g: 0 }); if (this.st === 41) Audio8.sfx('dash'); }
        else this.next('idle');
        this.x = clamp(this.x, A.x0, A.x1 - this.w); break;
      case 'starfall':
        fly(120); this.cast = 10;
        if (this.st === 1) { floatText(this.cx, this.y - 10, '星星雨！', '#ffd23f', true); FX('converge', this.cx, this.cy, { opts: { size: 0.5 } }); Audio8.sfx('magic'); }
        if (this.st > 20 && this.st < 120 && this.st % 7 === 0) { const x = rnd(this.ax0 + 6, this.ax1 - 6); G.eshots.push(new EShot('bigstar', x, -8, rnd(-0.4, 0.4), 2.6, { dmg: 3 })); if (this.st % 21 === 0) Audio8.sfx('star'); }
        if (this.st > 140) this.next('idle'); break;
      case 'meteor':
        fly(120); this.cast = 10;
        if (this.st === 1) { this.mx = clamp(P.cx, this.ax0 + 30, this.ax1 - 30); FX('warn', this.mx, this.floorY, { opts: { size: 2.2, warningDuration: 1 } }); floatText(this.cx, this.y - 10, '流星魔法！', '#ff8a8a', true); Audio8.sfx('siren'); }
        if (this.st === 60) { FX('meteor', this.mx, this.floorY, { opts: { size: 0.6 } }); }
        if (this.st === 78) { G.shake = 14; Audio8.sfx('explode'); G.flash = 4; if (Math.abs(P.cx - this.mx) < 40 && P.y + P.h > this.floorY - 30) P.hurt(4, this.mx, '流星直擊！'); }
        if (this.st > 110) this.next('idle'); break;
    }
    if (this.cast) this.cast--;
  }
  damage(dmg, b) {
    if (this.inv > 0 || this.defeated || this.state === 'enter' && G.mode !== 'boss') return false;
    if (this.kind === 'abo' && b && overlap(b, this.dog) && this.dog.state !== 'stun') { this.dog.state = 'stun'; this.dog.st = 0; this.dog.flash = 10; floatText(this.dog.x + 15, this.dog.y - 4, '嗚…', '#fff'); Audio8.sfx('hit'); return true; }
    const weak = b && b.wkind && WEAKNESS[this.kind] === b.wkind;
    if (weak) {
      dmg = Math.max(4, Math.round(dmg * 2)); this.stagger = 36;
      floatText(this.cx, this.y - 16, '弱點！效果拔群！', '#ff5a5a', true); FX('ink', this.cx, this.cy); G.shake = 8;
      const cry = { abo: '哇啊！我的袋子被吸走了！', lady: '不要！塑膠袋配不上我的名牌！', dogking: '嗚汪！香香的…好難受！' }[this.kind];
      if (cry && (!this.cryT || G.t - this.cryT > 200)) { this.cryT = G.t; floatText(this.cx, this.y - 30, cry, '#fff'); }
    }
    this.hp -= dmg; this.inv = weak ? 20 : 10; this.flash = 18; Audio8.sfx('hit');
    if (b) { FX(dmg >= 4 ? 'ink' : 'burst', b.cx, b.y + b.h / 2, dmg >= 4 ? {} : { opts: { size: 0.3 } }); if (dmg >= 4) floatText(this.cx, this.y - 4, 'BIG HIT!', '#ffd23f'); }
    if (this.hp <= 0) { this.hp = 0; this.defeated = true; this.st = 0; G.onBossDefeated(this); }
    return true;
  }
  deathAnim() {
    // 交給 main 的流程；這裡只做持續小爆炸
    if (this.st < 100 && this.st % 12 === 0) { FX('explode', this.cx + rnd(-16, 16), this.cy + rnd(-16, 16), { opts: { size: 0.4 } }); Audio8.sfx('explode'); G.shake = 6; }
    if (this.kind === 'witch') { if (this.y + this.h < this.floorY) { this.y += 1.2; } this.x += ((G.arena.x0 + G.arena.x1) / 2 - this.cx) * 0.02; }
    else this.physics();
    if (this.kind === 'abo') { const d = this.dog; d.vx = 0; d.state = 'happy'; }
  }
  sprKey() {
    const f2 = Math.floor(this.t / 8) % 2, f8 = Math.floor(this.t / 5) % 8, f4 = Math.floor(this.t / 6) % 4;
    const air = !this.onGround && (this.state !== 'enter' || this.kind === 'lady' && this.y < this.floorY - this.h - 1);
    if (this.kind === 'abo') return this.defeated ? 'a_sorry' + f2 : this.throwT ? 'a_t' + (this.throwT > 8 ? 0 : this.throwT > 4 ? 1 : 2) : air ? (this.vy < 0 ? 'a_j0' : 'a_j1') : (this.anim || Math.abs(this.vx) > 0.1) ? 'a_walk' + f8 : 'a_stand';
    if (this.kind === 'lady') return this.defeated ? 'l_cry' + f2 : this.armT ? 'l_t' + (this.armT > 8 ? 0 : this.armT > 4 ? 1 : 2) : air ? 'l_j1' : this.landT ? 'l_j2' : 'l_stand';
    if (this.kind === 'dogking') return this.defeated ? (this.st < 70 ? 'k_shrink' : 'k_pup' + (this.st > 160 ? 2 : f2)) : this.state === 'gas' ? 'k_gas' : this.roar ? 'k_roar' + f2 : air ? 'k_j1' : this.stompT ? 'k_j2' : this.state === 'jump' && this.st < 6 ? 'k_j0' : 'k_idle' + (Math.floor(this.t / 20) % 2);
    if (this.kind === 'witch') return this.defeated ? (this.y + this.h >= this.floorY - 1 ? (this.st > 200 ? 'w_stand' : 'w_kneel') : 'w_hit') : this.flash > 10 ? 'w_hit' : 'w_ride' + f4;
  }
  draw(ctx, cx) {
    const sk = this.sprKey();
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
      else { SPR.draw(ctx, sk, this.cx - cx, dy, this.face); if (white) SPR.draw(ctx, sk, this.cx - cx, dy, this.face, true, 0.85); }
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
