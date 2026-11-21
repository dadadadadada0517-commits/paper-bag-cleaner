// ===== 音效與配樂：WebAudio 晶片音樂合成（若 assets/music/<名稱>.mp3 存在，例如 Suno 產生的歌，會自動改用） =====
const Audio8 = (() => {
  let ac = null, master = null, musicGain = null, sfxGain = null, noiseBuf = null;
  const waves = {};
  let muted = false;
  try { muted = localStorage.getItem('pbh_mute') === '1'; } catch (e) {}

  function init() {
    try { unlockBgm(); } catch (e) {}
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    ac = new (window.AudioContext || window.webkitAudioContext)();
    master = ac.createGain(); master.gain.value = muted ? 0 : 0.8; master.connect(ac.destination);
    musicGain = ac.createGain(); musicGain.gain.value = 0.42; musicGain.connect(master);
    sfxGain = ac.createGain(); sfxGain.gain.value = 0.7; sfxGain.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    for (const duty of [0.125, 0.25, 0.5]) {
      const n = 32, re = new Float32Array(n), im = new Float32Array(n);
      for (let k = 1; k < n; k++) {
        re[k] = Math.sin(2 * Math.PI * k * duty) / (k * Math.PI);
        im[k] = (1 - Math.cos(2 * Math.PI * k * duty)) / (k * Math.PI);
      }
      waves[duty] = ac.createPeriodicWave(re, im);
    }
    setTimeout(loadExtSfx, 0);
  }
  function toggleMute() {
    muted = !muted;
    try { localStorage.setItem('pbh_mute', muted ? '1' : '0'); } catch (e) {}
    if (master) master.gain.value = muted ? 0 : 0.8;
    if (ext.el) ext.el.muted = muted;
    return muted;
  }

  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function midi(s) {
    const m = /^([A-G])([#b]?)(-?\d)$/.exec(s);
    if (!m) return null;
    let n = NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    return 12 * (+m[3] + 1) + n;
  }
  const freq = m => 440 * Math.pow(2, (m - 69) / 12);

  // 一小節固定 16 步；"~C4,E4,G4" = 16 分音符琶音
  function parseBars(str) {
    const events = []; const bars = str.split('|').map(s => s.trim()).filter(s => s.length);
    bars.forEach((bar, bi) => {
      const base = bi * 16;
      if (bar[0] === '~') {
        const ns = bar.slice(1).split(',').map(midi);
        const seq = ns.length === 3 ? [ns[0], ns[1], ns[2], ns[1]] : ns;
        for (let i = 0; i < 16; i++) events.push([base + i, 1, seq[i % seq.length]]);
        return;
      }
      let pos = 0;
      for (const tok of bar.split(/\s+/)) {
        if (!tok) continue;
        const [n, l] = tok.split(':'); const len = l ? +l : 2;
        if (pos >= 16) break;
        if (n !== '-') events.push([base + pos, Math.min(len, 16 - pos), midi(n)]);
        pos += len;
      }
    });
    return { events, steps: bars.length * 16 };
  }

  const SONGS = {
    title: { bpm: 132, loop: true,
      lead: '|C5:3 G4:3 C5:2 E5:4 D5:2 C5:2|D5:3 A4:3 D5:2 F5:4 E5:2 D5:2|E5:2 G5:2 C6:4 B5:2 A5:2 G5:4|A5:2 F5:2 D5:2 B4:2 G4:8|C5:3 G4:3 C5:2 E5:4 G5:2 E5:2|F5:3 E5:3 D5:2 A5:4 G5:2 F5:2|E5:2 G5:2 C6:2 E6:2 D6:4 B5:4|C6:12 -:4|',
      bass: '|C3 C3 G2 G2 C3 C3 G2 G2|D3 D3 A2 A2 D3 D3 A2 A2|C3 C3 E3 E3 A2 A2 G2 G2|F2 F2 G2 G2 G2 G2 B2 B2|C3 C3 G2 G2 C3 C3 E3 E3|F2 F2 A2 A2 D3 D3 F3 F3|C3 C3 E3 E3 G2 G2 G2 G2|C3:4 G2:4 C3:8|',
      harm: '|~C4,E4,G4|~D4,F4,A4|~C4,E4,G4|~F4,A4,D4|~C4,E4,G4|~F4,A4,C5|~E4,G4,C5|~C4,E4,G4|',
      drums: 'k.h.s.h.k.k.s.h.' },
    stage1: { bpm: 150, loop: true,
      lead: '|F5:2 A5:2 C6:2 A5:2 G5:3 F5:1 E5:2 F5:2|D5:2 F5:2 A5:4 G5:2 F5:2 E5:4|C5:2 E5:2 G5:2 Bb5:2 A5:3 G5:1 F5:2 E5:2|F5:6 C5:2 F5:4 G5:4|A5:2 A5:2 Bb5:2 C6:2 D6:4 C6:4|Bb5:2 A5:2 G5:2 F5:2 G5:8|A5:2 C6:2 F6:2 E6:2 D6:2 C6:2 Bb5:2 G5:2|F5:8 -:4 C5:2 E5:2|',
      bass: '|F2 F3 F2 F3 C3 C3 C2 C3|D3 D2 D3 D2 A2 A2 C3 C3|C3 C2 C3 C2 C3 C3 C2 C3|F2 F3 F2 F3 F2 F3 C3 C3|Bb2 Bb3 Bb2 Bb3 F2 F3 F2 F3|Bb2 Bb2 F2 F2 C3 C3 C3 C3|F2 F3 F2 F3 Bb2 Bb2 C3 C3|F2 F3 C3 C3 F2:8|',
      harm: '|~F4,A4,C5|~D4,F4,A4|~C4,E4,Bb4|~F4,A4,C5|~Bb4,D5,F5|~G4,Bb4,D5|~F4,A4,C5|~F4,A4,C5|',
      drums: 'k.h.s.hkk.h.s.h.' },
    stage2: { bpm: 128, loop: true,
      lead: '|D5:2 -:1 D5:1 F5:2 G5:2 A5:3 G5:1 F5:2 D5:2|C5:2 -:1 C5:1 E5:2 F5:2 G5:4 E5:4|D5:2 -:1 D5:1 F5:2 G5:2 A5:2 C6:2 A5:2 G5:2|F5:2 E5:2 C5:2 E5:2 D5:8|A5:3 A5:1 G5:2 A5:2 C6:4 A5:4|G5:3 G5:1 F5:2 G5:2 Bb5:4 G5:4|F5:2 G5:2 A5:2 F5:2 E5:2 D5:2 C5:2 E5:2|D5:12 -:4|',
      bass: '|D3:1 -:1 D3:1 D4:1 -:2 D3:2 C3:2 -:2 A2:2 C3:2|C3:1 -:1 C3:1 C4:1 -:2 C3:2 Bb2:2 -:2 G2:2 Bb2:2|D3:1 -:1 D3:1 D4:1 -:2 D3:2 C3:2 -:2 A2:2 C3:2|A2:1 -:1 A2:1 A3:1 -:2 A2:2 G2:2 -:2 E2:2 G2:2|F2:1 -:1 F2:1 F3:1 -:2 F2:2 E2:2 -:2 C3:2 E3:2|G2:1 -:1 G2:1 G3:1 -:2 G2:2 F2:2 -:2 D3:2 F3:2|Bb2:1 -:1 Bb2:1 Bb3:1 -:2 Bb2:2 A2:2 -:2 A2:2 C#3:2|D3:1 -:1 D3:1 D4:1 -:2 D3:2 D3:8|',
      harm: '|~D4,F4,A4|~C4,E4,G4|~D4,F4,A4|~A3,C#4,E4|~F4,A4,C5|~G4,Bb4,D5|~Bb3,D4,F4|~D4,F4,A4|',
      drums: 'k.h.s.hkk.h.s.hs' },
    stage3: { bpm: 160, loop: true,
      lead: '|E5:2 E5:2 G5:2 E5:2 A5:2 G5:2 F#5:2 D5:2|E5:2 E5:2 G5:2 B5:2 A5:4 G5:4|C6:2 B5:2 A5:2 G5:2 F#5:2 G5:2 A5:2 F#5:2|E5:8 B4:4 D5:4|E5:2 G5:2 B5:2 E6:2 D6:4 B5:4|C6:2 B5:2 A5:2 C6:2 B5:4 F#5:4|G5:2 A5:2 B5:2 G5:2 F#5:2 D5:2 E5:2 F#5:2|E5:12 -:4|',
      bass: '|E2 E3 E2 E3 E2 E3 E2 E3|E2 E3 E2 E3 C3 C3 D3 D3|C3 C4 C3 C4 D3 D4 D3 D4|E2 E3 E2 E3 B2 B2 D3 D3|E2 E3 E2 E3 E2 E3 E2 E3|A2 A3 A2 A3 B2 B3 B2 B3|G2 G3 G2 G3 D3 D4 D3 D4|E2 E3 E2 E3 E2:8|',
      harm: '|~E4,G4,B4|~E4,G4,B4|~C4,E4,G4|~E4,G4,B4|~E4,G4,B4|~A4,C5,E5|~G4,B4,D5|~E4,G4,B4|',
      drums: 'k.h.s.h.k.hks.hs' },
    stage4: { bpm: 120, loop: true,
      lead: '|A5:4 C6:2 E6:2 D6:4 C6:2 B5:2|C6:4 A5:2 G#5:2 A5:8|F5:4 A5:2 C6:2 B5:4 A5:2 G#5:2|E5:4 G#5:2 B5:2 E6:8|A5:2 B5:2 C6:2 D6:2 E6:4 F6:2 E6:2|D6:2 C6:2 B5:2 A5:2 G#5:4 E5:4|F5:2 A5:2 D6:2 C6:2 B5:2 G#5:2 E5:2 B5:2|A5:12 -:4|',
      bass: '|A2:4 E3:4 A3:4 E3:4|A2:4 E3:4 A3:4 E3:4|F2:4 C3:4 F3:4 C3:4|E2:4 B2:4 E3:4 G#3:4|A2:4 E3:4 C3:4 E3:4|D3:4 A3:4 E3:4 B2:4|F2:4 C3:4 E2:4 G#2:4|A2:16|',
      harm: '|~A4,C5,E5|~A4,C5,E5|~F4,A4,C5|~E4,G#4,B4|~A4,C5,E5|~D4,F4,A4|~F4,A4,D5|~A4,C5,E5|',
      drums: 'k...h.s.k.k.h.s.' },
    boss: { bpm: 172, loop: true,
      lead: '|C5:2 C5:2 Eb5:2 C5:2 F5:2 C5:2 G5:2 F5:2|Eb5:2 D5:2 C5:2 D5:2 Eb5:4 G4:4|Ab4:2 C5:2 Eb5:2 Ab5:2 G5:4 F5:4|G5:2 F5:2 Eb5:2 D5:2 B4:8|C6:2 B5:2 C6:2 G5:2 Ab5:2 G5:2 F5:2 Eb5:2|F5:2 Eb5:2 F5:2 C5:2 D5:4 B4:4|C5:2 Eb5:2 G5:2 C6:2 B5:4 G5:4|C6:8 G5:4 B4:4|',
      bass: '|C2 C3 C2 C3 C2 C3 C2 C3|C2 C3 C2 C3 C2 C3 C2 C3|Ab2 Ab3 Ab2 Ab3 Ab2 Ab3 Ab2 Ab3|G2 G3 G2 G3 G2 G3 G2 G3|C2 C3 C2 C3 C2 C3 C2 C3|F2 F3 F2 F3 G2 G3 G2 G3|Ab2 Ab3 Ab2 Ab3 G2 G3 G2 G3|C2 C3 C2 C3 G2 G3 G2 G3|',
      harm: '|~C4,Eb4,G4|~C4,Eb4,G4|~Ab3,C4,Eb4|~G3,B3,D4|~C4,Eb4,G4|~F4,Ab4,C5|~Ab3,C4,Eb4|~G3,B3,D4|',
      drums: 'k.hsk.hsk.hsk.ss' },
    witch: { bpm: 168, loop: true,
      lead: '|D6:2 A5:2 F5:2 A5:2 D6:2 E6:2 F6:4|E6:2 C6:2 A5:2 C6:2 E6:4 C#6:4|D6:2 Bb5:2 G5:2 Bb5:2 D6:2 F6:2 G6:4|F6:2 E6:2 D6:2 C#6:2 A5:8|Bb5:3 A5:1 G5:2 Bb5:2 D6:4 G6:4|A5:3 G5:1 F5:2 A5:2 C#6:4 E6:4|F6:2 E6:2 D6:2 A5:2 Bb5:2 G5:2 E5:2 C#5:2|D5:8 A5:4 D6:4|',
      bass: '|D2 D3 A2 D3 D2 D3 A2 D3|A2 A3 E3 A3 A2 A3 E3 A3|G2 G3 D3 G3 G2 G3 D3 G3|A2 A3 E3 A3 A2 A3 C#3 E3|G2 G3 D3 G3 G2 G3 D3 G3|A2 A3 E3 A3 A2 A3 E3 A3|Bb2 Bb3 F3 Bb3 A2 A3 E3 A3|D2 D3 A2 D3 D2:8|',
      harm: '|~D4,F4,A4|~C#4,E4,A4|~G4,Bb4,D5|~A4,C#5,E5|~G4,Bb4,D5|~A4,C#5,E5|~Bb4,D5,F5|~D4,F4,A4|',
      drums: 'kkhsk.hsk.hsk.hs' },
    // 魔王介紹畫面：短而有壓迫感（小調、低音重擊）
    bossintro: { bpm: 132, loop: false,
      lead: '|C5:2 C5:1 C5:1 Eb5:3 D5:1 C5:2 B4:2 G4:4|Ab4:2 Ab4:1 Ab4:1 C5:3 B4:1 Ab4:2 G4:2 F#4:4|G4:3 G4:1 C5:3 Eb5:1 G5:2 F#5:2 G5:4|C6:12 -:4|',
      bass: '|C2:2 C2:1 C2:1 C2:4 C2:2 C2:2 G1:4|Ab1:2 Ab1:1 Ab1:1 Ab1:4 Ab1:2 Ab1:2 D2:4|G1:4 G1:4 G1:4 G1:4|C2:12 -:4|',
      harm: '|~C4,Eb4,G4|~Ab3,C4,Eb4|~G3,B3,D4|~C4,Eb4,G4|',
      drums: 'k..sk..sk.k.s.ss' },
    // 洛克人式進關開場曲（READY 時播放）
    ready: { bpm: 150, loop: false,
      lead: '|C5:1 E5:1 G5:1 C6:1 E5:1 G5:1 C6:1 E6:1 G5:1 C6:1 E6:1 G6:1 E6:2 G6:2|C7:6 B6:1 C7:1 D7:8|',
      bass: '|C3:4 G2:4 C3:4 E3:4|G2:8 G3:8|',
      harm: '|~C5,E5,G5|~G4,B4,D5|', drums: 'k.h.k.h.k.hsk.sk' },
    start: { bpm: 150, loop: false, lead: '|C5:1 E5:1 G5:1 C6:3 G5:2 C6:8|', bass: '|C3:6 G2:2 C3:8|', drums: 'k.....s.k.......' },
    victory: { bpm: 140, loop: false, lead: '|G4:2 C5:2 E5:2 G5:4 E5:2 G5:4|C6:16|', bass: '|C3:4 E3:4 G3:4 E3:4|C3:16|', harm: '|~C4,E4,G4|~E4,G4,C5|', drums: 'k.h.s.h.k.h.s.ss' },
    getweapon: { bpm: 150, loop: false, lead: '|C5:2 E5:2 G5:2 C6:2 E5:2 G5:2 C6:2 E6:2|G6:16|', bass: '|C3:8 E3:8|G3:16|', harm: '|~C5,E5,G5|~E5,G5,C6|' },
    ending: null,
  };
  SONGS.ending = SONGS.title;

  const parsed = {};
  function getSong(name) {
    if (parsed[name]) return parsed[name];
    const s = SONGS[name]; if (!s) return null;
    const p = { bpm: s.bpm, loop: s.loop, ch: [] };
    if (s.lead) p.ch.push({ type: 'pulse', duty: 0.25, vol: 0.16, ...parseBars(s.lead) });
    if (s.harm) p.ch.push({ type: 'pulse', duty: 0.125, vol: 0.055, ...parseBars(s.harm) });
    if (s.bass) p.ch.push({ type: 'triangle', vol: 0.32, ...parseBars(s.bass) });
    p.steps = Math.max(...p.ch.map(c => c.steps));
    p.drums = s.drums || null;
    return (parsed[name] = p);
  }

  // --- 音樂排程 ---
  let cur = null, curName = null, nextStepTime = 0, step = 0, timer = null, onEnd = null;
  const ext = { el: null, ok: {}, sfx: {} };

  function playNote(c, m, t, dur, out) {
    if (m == null) return;
    const o = ac.createOscillator(), g = ac.createGain();
    if (c.type === 'pulse') o.setPeriodicWave(waves[c.duty]); else o.type = c.type;
    o.frequency.value = freq(m);
    const v = c.vol;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(v, t + 0.005);
    g.gain.setValueAtTime(v, t + Math.max(0.01, dur - 0.04));
    g.gain.linearRampToValueAtTime(c.type === 'triangle' ? 0 : v * 0.5, t + dur * 0.98);
    g.gain.linearRampToValueAtTime(0, t + dur);
    if (c.type === 'pulse' && dur > 0.25) { // 顫音
      const lfo = ac.createOscillator(), lg = ac.createGain();
      lfo.frequency.value = 5.5; lg.gain.value = freq(m) * 0.006;
      lfo.connect(lg); lg.connect(o.frequency); lfo.start(t + 0.15); lfo.stop(t + dur);
    }
    o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 0.02);
  }
  function drum(ch, t, out, vol = 1) {
    if (ch === 'k') {
      const o = ac.createOscillator(), g = ac.createGain();
      o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
      g.gain.setValueAtTime(0.5 * vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.16);
    } else if (ch === 's' || ch === 'h') {
      const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
      s.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = ch === 's' ? 1200 : 7000;
      const d = ch === 's' ? 0.13 : 0.035;
      g.gain.setValueAtTime((ch === 's' ? 0.28 : 0.1) * vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
      s.connect(f); f.connect(g); g.connect(out); s.start(t, Math.random() * 0.5); s.stop(t + d + 0.01);
    }
  }
  function tick() {
    if (!cur || !ac) return;
    const spb = 60 / cur.bpm / 4;
    while (nextStepTime < ac.currentTime + 0.12) {
      if (step >= cur.steps) {
        if (cur.loop) step = 0; else { const cb = onEnd; stopMusic(); if (cb) cb(); return; }
      }
      for (const c of cur.ch) {
        const s = step % c.steps;
        for (const e of c.idx[s] || []) playNote(c, e[2], nextStepTime, e[1] * spb, musicGain);
      }
      if (cur.drums) drum(cur.drums[step % 16], nextStepTime, musicGain);
      nextStepTime += spb; step++;
    }
  }
  function stopMusic() {
    if (timer) clearInterval(timer); timer = null; cur = null; curName = null;
    if (ext.el) { ext.el.pause(); ext.el = null; }
    if (bgm && !bgm.paused) bgm.pause();
  }
  function startChip(name, cb) {
    const s = getSong(name); if (!s) return;
    for (const c of s.ch) if (!c.idx) { c.idx = {}; for (const e of c.events) (c.idx[e[0]] = c.idx[e[0]] || []).push(e); }
    cur = s; step = 0; nextStepTime = ac.currentTime + 0.05; onEnd = cb || null;
    timer = setInterval(tick, 25); tick();
  }
  // Suno 配樂：開遊戲就全部預先載入；載入中先保持安靜（不再用合成音頂替），載好立刻播放
  // 只用「一個」音樂播放器、邊下載邊播：iPhone 不會預先下載音訊，第一次點畫面時就把它解鎖，之後換歌不用再按
  let bgm = null, bgmName = null, fadeT = null;
  function bgmEl() {
    if (bgm) return bgm;
    bgm = new Audio(); bgm.loop = true; bgm.preload = 'auto'; bgm.setAttribute('playsinline', '');
    bgm.addEventListener('error', () => { if (curName && curName === bgmName && !cur) { ext.el = null; startChip(curName); } });
    bgm.addEventListener('playing', prefetchSongs, { once: true });
    return bgm;
  }
  // 第一首開始播之後，背景依序把其他配樂抓進快取 → 之後換關、魔王戰音樂馬上就有
  function prefetchSongs() {
    (async () => { for (const n of ['stage1', 'boss', 'stage2', 'stage3', 'stage4', 'witch', 'ending', 'title']) { try { await fetch('music-' + n + '.mp3?v=11212022'); } catch (e) {} } })();
  }
  function unlockBgm() {
    const el = bgmEl(); if (el._unlocked) return; el._unlocked = true;
    if (!el.src) { el.src = 'music-' + 'title' + '.mp3?v=11212022'; bgmName = 'title'; }
    el.muted = true; const p = el.play();
    const done = () => { if (ext.el !== el) el.pause(); el.muted = muted; };
    if (p && p.then) p.then(done, done); else done();
  }
  // 魔王出場影片的聲音：用已解鎖的音樂播放器播（iPhone 會擋影片自己的聲音）
  function oneShot(name) {
    if (!ac) init();
    stopMusic(); curName = name;
    const el = bgmEl(); el.loop = false; el.src = 'music-' + name + '.mp3?v=11212022'; bgmName = name;
    ext.el = el; el.muted = muted; el.volume = 0.9; el.currentTime = 0; el.play().catch(() => {});
  }
  function playEl(name) {
    const el = bgmEl(); el.loop = true;
    if (cur) { if (timer) clearInterval(timer); timer = null; cur = null; }
    if (bgmName !== name) { el.src = 'music-' + name + '.mp3?v=11212022'; bgmName = name; } else el.currentTime = 0;
    ext.el = el; el.muted = muted; el.volume = 0; el.play().catch(() => {});
    clearInterval(fadeT); let v = 0; fadeT = setInterval(() => { v = Math.min(0.6, v + 0.06); el.volume = v; if (v >= 0.6 || ext.el !== el) clearInterval(fadeT); }, 40);
  }
  function music(name, cb) {
    if (!ac) init();
    if (curName === name) return;
    stopMusic(); curName = name;
    if (!SONGS[name] || !SONGS[name].loop) { startChip(name, cb); curName = name; return; }
    playEl(name); // 直接串流播放 Suno（不再先用合成音頂替）
  }

  // --- 音效 ---
  function env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0008, t + a + d); }
  function tone(type, f0, f1, dur, vol = 0.3, delay = 0, duty) {
    const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
    if (type === 'pulse') o.setPeriodicWave(waves[duty || 0.5]); else o.type = type;
    o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    env(g, t, 0.004, vol, dur); o.connect(g); g.connect(sfxGain); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, vol = 0.3, ftype = 'lowpass', f0 = 2000, f1 = f0, delay = 0, q = 1) {
    const t = ac.currentTime + delay, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; s.loop = true; f.type = ftype; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t); if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(g, t, 0.004, vol, dur); s.connect(f); f.connect(g); g.connect(sfxGain); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  const last = {};
  const SFX = {
    shoot() { tone('pulse', 1300, 700, 0.07, 0.18, 0, 0.25); noise(0.05, 0.12, 'highpass', 4000); },
    charge1() { tone('triangle', 500, 900, 0.12, 0.1); },
    charge2() { tone('pulse', 900, 1500, 0.1, 0.08, 0, 0.125); },
    bigshot() { tone('sawtooth', 300, 80, 0.35, 0.22); noise(0.4, 0.35, 'bandpass', 3000, 300, 0, 2); tone('pulse', 1200, 400, 0.2, 0.12, 0, 0.25); },
    jump() { tone('pulse', 320, 640, 0.09, 0.13, 0, 0.5); },
    djump() { tone('sine', 400, 1200, 0.14, 0.25); tone('sine', 800, 1600, 0.08, 0.15, 0.05); },
    land() { noise(0.06, 0.18, 'lowpass', 600, 200); },
    dash() { noise(0.22, 0.25, 'bandpass', 600, 3000, 0, 3); tone('sawtooth', 120, 240, 0.2, 0.08); },
    hurt() { tone('pulse', 700, 180, 0.08, 0.2, 0, 0.5); tone('pulse', 600, 150, 0.1, 0.2, 0.09, 0.5); },
    hit() { noise(0.06, 0.25, 'highpass', 2500); tone('pulse', 220, 110, 0.06, 0.15, 0, 0.25); },
    clink() { tone('pulse', 2400, 2400, 0.04, 0.12, 0, 0.5); tone('pulse', 1800, 1800, 0.04, 0.1, 0.03, 0.5); },
    clean() { noise(0.25, 0.3, 'bandpass', 1800, 500, 0, 1.5); [1047, 1319, 1568, 2093].forEach((f, i) => tone('triangle', f, f, 0.12, 0.13, 0.08 + i * 0.05)); },
    trash() { tone('pulse', 880, 880, 0.05, 0.13, 0, 0.25); tone('pulse', 1320, 1320, 0.08, 0.13, 0.05, 0.25); },
    tame() { tone('pulse', 600, 380, 0.07, 0.16, 0, 0.5); tone('pulse', 650, 400, 0.08, 0.16, 0.12, 0.5); [784, 988, 1175].forEach((f, i) => tone('triangle', f, f, 0.12, 0.13, 0.25 + i * 0.07)); },
    bark() { tone('pulse', 520, 300, 0.07, 0.16, 0, 0.5); noise(0.05, 0.1, 'bandpass', 900); },
    explode() { noise(0.6, 0.45, 'lowpass', 3000, 100); tone('sawtooth', 150, 30, 0.5, 0.2); },
    bossdie() { for (let i = 0; i < 6; i++) { noise(0.5, 0.35, 'lowpass', 2500, 100, i * 0.18); } tone('sawtooth', 400, 30, 1.6, 0.2); },
    door() { for (let i = 0; i < 6; i++) tone('pulse', 90, 70, 0.08, 0.2, i * 0.1, 0.5); },
    blip() { tone('pulse', 820 + Math.random() * 120, 700, 0.035, 0.16, 0, 0.5); noise(0.02, 0.06, 'highpass', 5000); },
    select() { tone('pulse', 990, 990, 0.05, 0.15, 0, 0.25); tone('pulse', 1480, 1480, 0.1, 0.15, 0.06, 0.25); },
    cursor() { tone('pulse', 660, 660, 0.04, 0.12, 0, 0.25); },
    heal() { tone('pulse', 660 + Math.random() * 40, 990, 0.05, 0.1, 0, 0.25); },
    siren() { for (let i = 0; i < 6; i++) tone('pulse', i % 2 ? 620 : 880, i % 2 ? 620 : 880, 0.18, 0.13, i * 0.2, 0.5); },
    squish() { tone('sine', 180, 60, 0.18, 0.35); noise(0.15, 0.25, 'lowpass', 900, 200); },
    throw() { noise(0.15, 0.18, 'bandpass', 500, 2000, 0, 2); },
    magic() { [1568, 2093, 2637, 3136].forEach((f, i) => tone('triangle', f, f * 1.02, 0.09, 0.09, i * 0.04)); },
    star() { tone('pulse', 1700, 2600, 0.08, 0.08, 0, 0.125); },
    stomp() { noise(0.35, 0.45, 'lowpass', 400, 60); tone('sine', 90, 30, 0.35, 0.4); },
    gas() { noise(0.6, 0.2, 'bandpass', 300, 900, 0, 1); },
    checkpoint() { [523, 659, 784, 1047].forEach((f, i) => tone('pulse', f, f, 0.08, 0.12, i * 0.06, 0.25)); },
    pause() { tone('pulse', 880, 880, 0.06, 0.12, 0, 0.5); tone('pulse', 440, 440, 0.06, 0.12, 0.07, 0.5); },
    death() { // 洛克人式爆散：脈衝音＋回音（延遲回授）
      const t = ac.currentTime, d = ac.createDelay(1), fb = ac.createGain(), wet = ac.createGain(), lp = ac.createBiquadFilter();
      d.delayTime.value = 0.16; fb.gain.value = 0.55; wet.gain.value = 0.7; lp.type = 'lowpass'; lp.frequency.value = 2400;
      d.connect(lp); lp.connect(fb); fb.connect(d); d.connect(wet); wet.connect(sfxGain);
      for (let i = 0; i < 6; i++) {
        const o = ac.createOscillator(), g = ac.createGain(), s = t + i * 0.11;
        o.setPeriodicWave(waves[0.25]); o.frequency.setValueAtTime(1500 - i * 140, s); o.frequency.exponentialRampToValueAtTime(260, s + 0.1);
        g.gain.setValueAtTime(0.0001, s); g.gain.linearRampToValueAtTime(0.2, s + 0.005); g.gain.exponentialRampToValueAtTime(0.001, s + 0.1);
        o.connect(g); g.connect(sfxGain); g.connect(d); o.start(s); o.stop(s + 0.12);
      }
      noise(0.35, 0.25, 'bandpass', 3000, 400, 0, 2);
      setTimeout(() => { try { fb.disconnect(); d.disconnect(); } catch (e) {} }, 4000);
    },
    warp() { tone('pulse', 200, 2000, 0.4, 0.14, 0, 0.25); },
    ultcharge() { tone('sawtooth', 100, 600, 1.2, 0.12); },
    ultfire() { noise(1.2, 0.4, 'bandpass', 600, 3000, 0, 1); tone('sawtooth', 200, 60, 1.0, 0.2); },
    ultwave() { noise(1.0, 0.35, 'lowpass', 3000, 300); },
    pop() { noise(0.12, 0.18, 'bandpass', 1400, 500, 0, 1.2); tone('triangle', 660, 990, 0.08, 0.1, 0.02); },
    boing() { tone('sine', 220, 660, 0.12, 0.25); },
  };
  // 外部音效（ElevenLabs 生成，放在 assets/sfx/<名稱>.mp3）優先，沒有就用合成音
  const SFX_VOL = { shoot: 1, victory: 1, getweapon: 1, cursor: 1, pop: 0.7, heal: 0.7, blip: 0.5, step: 0.5, explode: 0.6, dash: 0.6, clink: 0.6, magic: 0.7 };
  function loadExtSfx() {
    if (location.protocol === 'file:') return;
    fetch('sfx-list.json?v=11212022').then(r => r.ok ? r.json() : []).catch(() => []).then(list => list.forEach(n => fetch('sfx-' + n + '.mp3?v=11212022').then(r => r.ok ? r.arrayBuffer() : null).then(b => b && ac.decodeAudioData(b)).then(buf => { if (buf) ext.sfx[n] = buf; }).catch(() => {})));
  }
  const playing = {};
  function stopSfx(...names) { for (const n of names) { for (const s of playing[n] || []) { try { s.stop(); } catch (e) {} } playing[n] = []; } }
  function playExt(n) {
    const s = ac.createBufferSource(), g = ac.createGain();
    s.buffer = ext.sfx[n]; s.playbackRate.value = n === 'blip' ? 0.92 + Math.random() * 0.16 : 1;
    g.gain.value = SFX_VOL[n] || 0.9; s.connect(g); g.connect(sfxGain); s.start();
    (playing[n] = playing[n] || []).push(s); s.onended = () => { const a = playing[n]; if (a) a.splice(a.indexOf(s), 1); };
  }
  function sfx(name, minGap = 0.03) {
    if (!ac || (!SFX[name] && !ext.sfx[name])) return;
    if (ac.state !== 'running') { try { ac.resume(); } catch (e) {} } // iPhone 影片／來電後音效會被暫停（suspended / interrupted）
    const now = ac.currentTime;
    if (last[name] && now - last[name] < minGap) return;
    last[name] = now;
    if (ext.sfx[name]) playExt(name); else SFX[name]();
  }

  return { init, music, oneShot, stopMusic, sfx, stopSfx, hasExt: n => !!ext.sfx[n], toggleMute, isMuted: () => muted, get current() { return curName; } };
})();
