// 00GameDevs 特效庫（MIT, https://00gamedevs.com/）橋接：Three.js 0.187.0
// 用正交攝影機把 3D 特效畫到 400x225 低解析畫布，再疊進像素遊戲畫面 → 自然像素化。
import * as THREE from 'three';
import plasmaBolt from './effect-plasma-bolt.js';
import tidalSurge from './effect-tidal-surge.js';
import smokePuff from './effect-smoke-puff.js';
import energyBurst from './effect-energy-burst.js';
import fireExplosion from './effect-fire-explosion.js';
import shockwave from './effect-shockwave.js';
import revivalBloom from './effect-revival-bloom.js';
import astralGate from './effect-astral-gate.js';
import astralConvergence from './effect-astral-convergence.js';
import venomPool from './effect-venom-pool.js';
import steamJet from './effect-steam-jet.js';
import meteorStrike from './effect-meteor-strike.js';
import arcaneMissile from './effect-arcane-missile.js';
import comicInk from './effect-comic-ink-arcs.js';
import sacredRelic from './effect-sacred-relic-descent.js';
import rollingFire from './effect-rolling-fireburst.js';
import thunderStrike from './effect-thunder-strike.js';
import airburst from './effect-billowing-airburst.js';
import dustDevil from './effect-dust-devil.js';
import goldenRain from './effect-golden-chain-rain.js';
import starbladeExp from './effect-starblade-explosion.js';
import healingField from './effect-healing-field.js';
import arrowRain from './effect-celestial-arrow-rain.js';
import blackHole from './effect-black-hole.js';
import spellCircle from './effect-spell-indicator-circle.js';
import chargedBeam from './effect-charged-beam.js';

const W = 400, H = 225, U = 16; // 1 個 Three.js 單位 = 16 像素（一格）
// 名稱 -> [工廠, 預設參數, 觸發方式, 最長秒數, 傾斜角(讓地面型特效從側面看得到)]
//   'hit'  建立後立即 hit() 爆開；'stop' 播放 life 秒後 stop()；'once' 自行播完
const LIB = {
  bolt: [plasmaBolt, { size: 0.55, color: '#7fe6ff' }, 'follow', 3, 0],
  missile: [arcaneMissile, { size: 0.6, color: '#ff8ae0' }, 'follow', 5, 0],
  wave: [tidalSurge, { size: 0.55, color: '#5fd8ff' }, 'stop', 0.55, 0.5],
  puff: [smokePuff, { size: 0.55 }, 'stop', 0.25, 0],
  burst: [energyBurst, { size: 0.45, color: '#4fc8ff' }, 'stop', 0.18, 0],
  zap: [energyBurst, { size: 0.35, color: '#ffe36a', quantity: 8 }, 'stop', 0.15, 0],
  explode: [fireExplosion, { size: 0.6 }, 'stop', 0.25, 0],
  shock: [shockwave, { size: 0.7 }, 'stop', 0.35, 0.45],
  heal: [revivalBloom, { size: 0.5 }, 'stop', 0.6, 0.35],
  healfield: [healingField, { size: 0.6 }, 'stop', 1.0, 0.6],
  gate: [astralGate, { size: 0.9 }, 'stop', 1.6, 0],
  converge: [astralConvergence, { size: 0.9 }, 'stop', 1.4, 0],
  venom: [venomPool, { size: 0.7, color: '#a6c24a' }, 'stop', 1.8, 0.6],
  steam: [steamJet, { size: 0.55, color: '#b8d27a' }, 'stop', 1.0, 0],
  meteor: [meteorStrike, { size: 0.55 }, 'once', 3, 0.2],
  ink: [comicInk, { size: 0.8 }, 'once', 1.2, 0],
  relic: [sacredRelic, { size: 0.9 }, 'stop', 2.4, 0.45],
  fireball: [rollingFire, { size: 0.7 }, 'once', 3, 0],
  thunder: [thunderStrike, { size: 0.6, color: '#c98aff' }, 'stop', 0.6, 0],
  air: [airburst, { size: 0.5 }, 'stop', 0.3, 0],
  dust: [dustDevil, { size: 0.45 }, 'stop', 0.35, 0],
  gold: [goldenRain, { size: 0.8 }, 'stop', 2.5, 0.3],
  star: [starbladeExp, { size: 0.7 }, 'once', 3, 0],
  arrows: [arrowRain, { size: 0.7, quantity: 60 }, 'once', 4, 0.3],
  hole: [blackHole, { size: 2.2, density: 0.6, detail: 1 }, 'stop', 1.6, 0],
  beam: [chargedBeam, { size: 1.1, color: '#7fe6ff' }, 'stop', 1.6, 0],
  warn: [spellCircle, { size: 1.6, warningDuration: 1 }, 'once', 2, 1.2],
};

const R2 = 2; // 與遊戲同樣 2 倍解析度
const canvas = document.createElement('canvas'); canvas.width = W * R2; canvas.height = H * R2;
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, premultipliedAlpha: true });
  renderer.setPixelRatio(1); renderer.setSize(W * R2, H * R2, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping;
  renderer.setClearColor(0x000000, 0);
} catch (e) { console.warn('WebGL 無法使用，改用內建特效', e); }
const scene = new THREE.Scene();
const cam = new THREE.OrthographicCamera(-W / U / 2, W / U / 2, H / U / 2, -H / U / 2, 0.1, 200);
cam.position.set(W / U / 2, -H / U / 2, 60); cam.lookAt(W / U / 2, -H / U / 2, 0);
const live = [];

// 畫在角色後面的特效、往上修正（避免陷進地板）的特效
const BACK = new Set(['dust', 'relic', 'healfield', 'venom', 'warn', 'hole', 'gate', 'steam']);
const LIFT = { wave: 7, shock: 5, healfield: 4, venom: 4, relic: 4, warn: 3, dust: 2, heal: 3 };
function place(it, camX, camY) {
  if (it.follow) { it.wx = it.follow.x; it.wy = it.follow.y; }
  it.fx.group.position.set((it.wx - camX) / U, -(it.wy - (LIFT[it.name] || 0) - camY) / U, 0);
}
if (renderer) window.VFX = {
  ready: true,
  spawn(name, x, y, o = {}) {
    const e = LIB[name]; if (!e) return null;
    let fx;
    try { fx = e[0]({ ...e[1], ...(o.opts || {}) }); } catch (err) { console.warn(name, err); return null; }
    const tilt = o.tilt != null ? o.tilt : e[4];
    fx.group.rotation.x = tilt;
    if (o.flip) fx.group.rotation.y = Math.PI;
    if (o.rotZ) fx.group.rotation.z = o.rotZ;
    if (o.scale) fx.group.scale.setScalar(o.scale);
    scene.add(fx.group);
    const it = { name, fx, wx: x, wy: y, mode: e[2], life: o.life != null ? o.life : e[3], age: 0, follow: o.follow || null, stopped: false };
    if (it.mode === 'follow' && fx.setDirection) fx.setDirection(new THREE.Vector3(o.dir || 1, 0, 0), 0);
    if (o.to && fx.setEndpoints) fx.setEndpoints(new THREE.Vector3(0, 0, 0), new THREE.Vector3((o.to.x - x) / U, -(o.to.y - y) / U, 0));
    live.push(it);
    return it;
  },
  hit(it) { if (it && !it.stopped) { it.stopped = true; it.follow = null; try { it.fx.hit ? it.fx.hit() : it.fx.stop(); } catch (e) {} } },
  stop(it) { if (it && !it.stopped) { it.stopped = true; it.follow = null; try { it.fx.stop && it.fx.stop(); } catch (e) {} } },
  update(dt) {
    for (let i = live.length - 1; i >= 0; i--) {
      const it = live[i]; it.age += dt;
      if (it.follow && it.follow.dead) { this.stop(it); }
      if (!it.stopped && it.mode !== 'once' && it.age >= it.life) { it.stopped = true; it.follow = null; try { it.fx.stop && it.fx.stop(); } catch (e) {} }
      try { it.fx.update(dt); } catch (e) { it.fx.finished = true; }
      if (it.fx.finished || it.age > it.life + 6) {
        scene.remove(it.fx.group); try { it.fx.dispose(); } catch (e) {}
        live.splice(i, 1);
      }
    }
  },
  // layer: 'back' 只畫角色後面的特效，'front' 只畫前面的
  draw(ctx, camX, camY, layer = 'front') {
    let any = false;
    for (const it of live) { const b = BACK.has(it.name) || it.back; it.fx.group.visible = layer === 'back' ? b : !b; if (it.fx.group.visible) { any = true; place(it, camX, camY); } }
    if (!any) return;
    renderer.render(scene, cam);
    ctx.drawImage(canvas, 0, 0, W, H);
  },
  clear() { for (const it of live) { scene.remove(it.fx.group); try { it.fx.dispose(); } catch (e) {} } live.length = 0; },
  get count() { return live.length; },
};
