// ===== 亂入怪人：犀牛怪人（衝撞）、颱風怪人（飛行吹風丟垃圾），偶爾被超人打跑 =====
const INTRUDERS = {
  rhino: { name: '犀牛怪人', hp: 14, w: 44, h: 60, lines: ['閃開閃開～犀牛衝鋒！', '哼！擋我者死！'], ko: '嗚哇——我記住你了！' },
  typhoon: { name: '颱風怪人', hp: 16, w: 44, h: 60, lines: ['呼～呼～把垃圾吹滿街！', '颱風天最愛亂丟東西啦！'], ko: '我…我還會再來的～' },
};
G.intruderTimer = 900;

function endIntruder() { G.intruder = null; Audio8.stopSfx('siren', 'gas'); }
function floorAt(x, fallback) {
  const tx = Math.floor(x / TS);
  for (let ty = Math.max(2, Math.floor((fallback - 6) / TS)); ty < G.level.h; ty++) if (isSolid(tx, ty) || isOneWay(tx, ty)) return ty * TS;
  return fallback;
}

function spawnIntruder(kind) {
  const P = G.player, D = INTRUDERS[kind], dir = Math.random() < 0.5 ? 1 : -1; // dir = 移動方向
  const x = dir > 0 ? G.camX - 50 : G.camX + VW + 50;
  const I = { kind, dir, x: x - D.w / 2, y: 0, w: D.w, h: D.h, hp: D.hp, t: 0, state: 'warn', flash: 0, vx: 0, vy: 0, say: '', sayT: 0, hero: null };
  if (kind === 'rhino') I.y = floorAt(x, P.y + P.h) - D.h;
  else I.y = 60;
  G.intruder = I;
  Audio8.sfx('siren');
  floatText(dir > 0 ? G.camX + 30 : G.camX + VW - 30, 60, '⚠ ' + D.name + ' 亂入！', '#ff5a5a', true);
}

function updateIntruder() {
  if (G.mode !== 'play' || script || G.boss || !G.level) return;
  const P = G.player;
  if (!G.intruder) {
    if (G.cameo || --G.intruderTimer > 0) return;
    G.intruderTimer = Math.round((1200 + Math.floor(rnd(0, 900))) * (G.hard ? 0.5 : 1)); // 怪人更常亂入
    if (G.level.arena && P.x > G.level.arena.x0 - 200) return; // 魔王房附近不亂入
    spawnIntruder(Math.random() < 0.5 ? 'rhino' : 'typhoon');
    return;
  }
  const I = G.intruder, D = INTRUDERS[I.kind]; I.t++; if (I.flash) I.flash--; if (I.sayT) I.sayT--;
  const cx = I.x + I.w / 2;
  if (cx < G.camX - 20 || cx > G.camX + VW + 20) { if (I.state !== 'warn') Audio8.stopSfx('siren', 'gas'); }
  // 被打跑：往後飛出畫面
  if (I.state === 'ko') {
    I.x += I.vx; I.y += I.vy; I.vy += 0.15; I.rot = (I.rot || 0) + 0.25 * Math.sign(I.vx);
    if (I.y > VH + 60 || Math.abs(cx - G.camX - VW / 2) > VW) endIntruder();
    updateHeroStrike(I); return;
  }
  // 超人來救援
  if (!I.hero && I.t > 150 && I.t % 60 === 0 && Math.random() < 0.3) {
    const id = Math.random() < 0.5 ? 'm' : 's', from = Math.random() < 0.5 ? -1 : 1;
    I.hero = { id, x: G.camX + (from < 0 ? -40 : VW + 40), y: 30, t: 0, from };
    Audio8.sfx('warp');
  }
  if (I.hero) updateHeroStrike(I);
  // 子彈打到
  for (const b of G.bullets) if (!b.dead && overlap(b, I) && b.hitEnemy(I)) { I.hp -= b.dmg; I.flash = 6; Audio8.sfx('hit'); if (I.hp <= 0) { knockOut(I, '被小編打跑了！'); return; } }
  if (I.state === 'warn') { // 出場前的提示
    if (I.t === 1) { I.say = D.lines[0]; I.sayT = 90; }
    if (I.t > 40) { I.state = 'go'; I.t = 0; }
  }
  if (I.kind === 'rhino') {
    if (I.state === 'go') {
      I.vx = I.dir * 3.4; I.x += I.vx; I.y = floorAt(cx + I.dir * 6, I.y + I.h) - I.h;
      if (I.t % 6 === 0) G.parts.push({ x: cx - I.dir * 12, y: I.y + I.h - 2, vx: -I.dir * 0.6, vy: -0.4, life: 18, max: 18, c: '#e8dcc0', s: 1, g: 0, cloud: true, r0: 2, r1: 6 });
      if (I.t % 14 === 0) G.shake = Math.max(G.shake, 1.5);
      if (overlap(I, P)) P.hurt(4, cx, '被犀牛撞飛！');
      if ((I.dir > 0 && I.x > G.camX + VW + 60) || (I.dir < 0 && I.x + I.w < G.camX - 60)) endIntruder();
    }
  } else {
    // 颱風怪人：飛到主角前方盤旋，吹風把主角往後推，順便丟垃圾
    const tx = Math.min(P.cx + 110, G.camX + VW - 40), ty = 66 + Math.sin(I.t / 20) * 8;
    if (I.state === 'go') {
      I.x += (tx - I.w / 2 - I.x) * 0.03; I.y += (ty - I.y) * 0.05;
      const face = P.cx < cx ? -1 : 1; I.face = face;
      I.blow = I.t % 160 > 80;
      if (I.blow && Math.abs(P.cy - I.y) < 140) { if (!P.frozen && P.x + face * 0.6 > G.camX + 4) { P.x += face * 0.6; } if (I.t % 4 === 0) G.parts.push({ x: cx + face * 14, y: I.y + 18 + rnd(-6, 6), vx: face * 3, vy: rnd(-0.3, 0.3), life: 30, max: 30, c: '#d9c8ff', s: 2, g: 0 }); if (I.t % 40 === 0) Audio8.sfx('gas', 0.3); }
      if (I.t % 120 === 60) { const it = new Item('trash', cx, I.y + I.h, true); it.vy = 0; G.items.push(it); G.dynPoops++; Audio8.sfx('throw'); I.say = D.lines[1]; I.sayT = 80; }
      if (I.t > 900) { I.state = 'leave'; }
    } else if (I.state === 'leave') { I.y -= 1.5; I.x += I.dir * 2; if (I.y < -80) endIntruder(); }
    if (overlap(I, P)) P.hurt(2, cx, '被颱風捲到！');
  }
}

function knockOut(I, msg) {
  const D = INTRUDERS[I.kind];
  I.state = 'ko'; I.vx = (I.x + I.w / 2 < G.player.cx ? -1 : 1) * 3.5; I.vy = -4; I.say = D.ko; I.sayT = 70;
  fcPop(I.x + I.w / 2, I.y + I.h / 2, 1.5); Audio8.stopSfx('siren', 'gas'); Audio8.sfx('explode'); G.shake = 6;
  floatText(I.x + I.w / 2, I.y - 6, msg, '#ffe36a', true);
  G.ultra = Math.min(100, G.ultra + 20);
  const it = new Item(Math.random() < 0.5 ? 'boba' : 'star', I.x + I.w / 2, I.y + I.h, true); it.vy = -3; G.items.push(it);
}

// 超人衝過來把怪人揍飛
function updateHeroStrike(I) {
  const h = I.hero; if (!h) return; h.t++;
  const tx = I.x + I.w / 2, tyy = I.y + I.h / 2;
  if (!h.hit) {
    h.x += (tx - h.x) * 0.12; h.y += (tyy - h.y) * 0.12;
    if (I.kind === 'typhoon' && h.id === 's' && Math.abs(tx - h.x) < 40 && I.state !== 'ko') { h.blown = true; h.hit = true; h.t = 0; I.say = '呼～～針筒超人吹走啦！'; I.sayT = 80; Audio8.sfx('gas'); floatText(h.x, h.y - 10, '針筒超人：哇啊啊～被吹走了！', '#9fd0ff', true); return; }
    if (Math.abs(tx - h.x) < 10 && I.state !== 'ko') { h.hit = true; h.t = 0; knockOut(I, (h.id === 'm' ? '中央山脈超人' : '針筒超人') + '：滾開！別妨礙小編！'); I.vx = Math.sign(tx - (h.x - h.from * 20)) * 5 || 5; G.flash = 4; }
  } else if (h.blown) { h.x += (h.x < tx ? -1 : 1) * 5; h.y -= 2.5; h.spin = (h.spin || 0) + 0.4; if (h.t > 70) I.hero = null; }
  else { h.x += -h.from * 4; h.y -= 2; if (h.t > 60) I.hero = null; }
}

function drawIntruder(cam) {
  const I = G.intruder; if (!I) return;
  const cx = I.x + I.w / 2 - cam, feet = I.y + I.h + 1;
  let k;
  if (I.kind === 'rhino') k = I.state === 'ko' ? 'vr_ko' : I.state === 'go' ? 'vr_run' + (Math.floor(I.t / 4) % 4) : 'vr_idle';
  else k = I.state === 'ko' ? 'vt_ko' : I.blow ? 'vt_blow' : I.sayT > 0 && I.t % 120 > 60 ? 'vt_laugh' : 'vt_fly' + (Math.floor(I.t / 10) % 2);
  const face = I.kind === 'rhino' ? I.dir : (I.face || -I.dir);
  ctx.save();
  if (I.state === 'ko') { ctx.translate(cx, I.y + I.h / 2); ctx.rotate(I.rot || 0); ctx.translate(-cx, -(I.y + I.h / 2)); }
  if (I.state === 'warn' && (I.t >> 2) % 2) ctx.globalAlpha = 0.5;
  if (!SPR.draw(ctx, k, cx, feet, face)) { ctx.fillStyle = I.kind === 'rhino' ? '#666' : '#88a'; ctx.fillRect(I.x - cam, I.y, I.w, I.h); }
  if (I.flash) SPR.draw(ctx, k, cx, feet, face, true, 0.8);
  ctx.restore();
  const h = I.hero;
  if (h) { const s = SPR.f[h.id === 'm' ? 'cm_throw' : 'cs_throw']; if (s) { ctx.save(); ctx.translate(Math.round(h.x - cam), Math.round(h.y)); if (h.spin) ctx.rotate(h.spin); ctx.scale(h.hit ? -h.from * 1.4 : -h.from * 1.4, 1.4); ctx.drawImage(s.img, -s.ax, -s.h / 2, s.w, s.h); ctx.restore(); } }
}
function drawIntruderSay() {
  const I = G.intruder; if (!I || !I.sayT || !G.zc) return;
  const [x, y] = worldToScreen(I.x + I.w / 2, I.y);
  if (x < 10 || x > VW - 10) return;
  sctx.globalAlpha = Math.min(1, I.sayT / 12);
  drawBubble('ui_bubble', x, Math.max(30, y - 22), INTRUDERS[I.kind].name + '：' + I.say, '#3a1010', '#d23a3a', x);
  sctx.globalAlpha = 1;
}
