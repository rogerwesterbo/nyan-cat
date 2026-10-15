// Nyan Cat game: fly the cat around, collect treats and dodge hazards.
(function () {
  const root = document.documentElement;
  const rig = document.getElementById('nyan-rig');
  const nyanCat = document.getElementById('nyan-cat');
  const canvas = document.getElementById('game-canvas');
  const trailCanvas = document.getElementById('trail-canvas');
  const toggle = document.getElementById('game-toggle');
  const pauseBtn = document.getElementById('game-pause');
  const launcherHint = document.getElementById('game-launcher-hint');
  const launcher = document.getElementById('game-launcher');
  const launcherLegend = document.getElementById('game-launcher-legend');
  const hud = document.getElementById('game-hud');
  const scoreEl = document.getElementById('game-score');
  const livesEl = document.getElementById('game-lives');
  const levelEl = document.getElementById('game-level');
  const overlay = document.getElementById('game-overlay');
  const titleEl = document.getElementById('game-title');
  const messageEl = document.getElementById('game-message');
  const legendEl = document.getElementById('game-legend');
  const settingsEl = document.getElementById('game-settings');
  const difficultyRow = document.getElementById('game-difficulty-row');
  const difficultyEl = document.getElementById('game-difficulty');
  const musicBtn = document.getElementById('game-music');
  const sfxBtn = document.getElementById('game-sfx');
  const primaryBtn = document.getElementById('game-primary');
  const quitBtn = document.getElementById('game-quit');
  const music = window.nyanMusic;
  if (!rig || !nyanCat || !canvas || !trailCanvas || !toggle || !launcher) return;

  const ctx = canvas.getContext('2d');
  const trailCtx = trailCanvas.getContext('2d');

  const CAT_HALF_W = 97;
  const CAT_HALF_H = 61;
  // Keep the cat (and the things it can catch) clear of the score bar at the bottom.
  const HUD_SPACE = 64;
  // Collision boxes relative to the centre of the 194x122 cat.
  // Hazards only hurt when they touch the body/head; treats are caught more generously.
  const HIT_BOX = { left: -47, right: 88, top: -55, bottom: 40 };
  const CATCH_BOX = { left: -87, right: 97, top: -65, bottom: 55 };
  const CAT_SPEED = 640;
  const POINTER_OFFSET_X = -110;
  // How far the cat moves per pixel the finger drags.
  const TOUCH_GAIN = 1.6;
  const INVULNERABLE_TIME = 1.6;
  // Level n needs LEVEL_POINTS * (n - 1)^2 points: 150, 600, 1350, 2400, ...
  const LEVEL_POINTS = 150;
  // The CSS stars scroll 400px every 700ms at normal speed.
  const STAR_SPEED = 400 / 0.7;
  const STAR_ANIMATIONS = new Set(['woosh', 'sparkly', 'sparkly-before', 'sparkly-after']);
  const RAINBOW = ['#f00', '#f90', '#ff0', '#3f0', '#09f', '#63f'];
  const RAINBOW_BAND = 17;
  const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

  // bonus: levels added to the difficulty from the start; ramp: levels until ~63% of max difficulty.
  const DIFFICULTIES = {
    easy: { label: 'Easy', lives: 5, bonus: 0, ramp: 10 },
    normal: { label: 'Normal', lives: 3, bonus: 0, ramp: 7 },
    hard: { label: 'Hard', lives: 3, bonus: 2, ramp: 5 },
    insane: { label: 'Insane', lives: 2, bonus: 4, ramp: 3.5 },
  };

  const COIN = { name: 'coin', points: 10, weight: 6, size: 36, coin: true, spin: true };
  const TREATS = [
    COIN,
    { emoji: '🍬', points: 25, weight: 3, size: 40 },
    { emoji: '🍭', points: 25, weight: 3, size: 42 },
    { emoji: '🍩', points: 50, weight: 2, size: 44 },
    { emoji: '⭐', points: 100, weight: 1, size: 42 },
  ];
  const EXTRA_LIFE = { emoji: '💖', name: 'extra life', size: 40, wobble: 30 };
  const HAZARDS = [
    { emoji: '🥒', name: 'Cucumber', weight: 3, size: 52, wobble: 40, roll: true, unlockLevel: 1 },
    { emoji: '💣', name: 'Bomb', weight: 2, size: 50, roll: true, unlockLevel: 1 },
    { emoji: '☄️', name: 'Comet', weight: 3, size: 54, dive: true, unlockLevel: 2 },
    { emoji: '🐕', name: 'Dog', weight: 2, size: 58, wobble: 80, unlockLevel: 3 },
  ];
  const UFO = { emoji: '🛸', name: 'UFO', size: 64, shooter: true, unlockLevel: 5 };
  const LASER = { size: 22, laser: true };

  const KEY_DIRS = {
    ArrowLeft: 'left',
    ArrowRight: 'right',
    ArrowUp: 'up',
    ArrowDown: 'down',
    a: 'left',
    d: 'right',
    w: 'up',
    s: 'down',
  };

  let mode = 'off'; // off | ready | playing | paused | over
  let width = 0;
  let height = 0;
  const cat = { x: 0, y: 0, vx: 0, vy: 0, tilt: 0, tail: 0, tailSkew: 0, wag: 0 };
  let items = [];
  let popups = [];
  let trail = [];
  let trailTime = 0;
  let banner = null;
  let score = 0;
  let lives = 3;
  let level = 1;
  let elapsed = 0;
  let invulnerable = 0;
  let shake = 0;
  let treatTimer = 0;
  let hazardTimer = 0;
  let lifeTimer = 0;
  let ufoTimer = null;
  let starRate = 1;
  let announced = new Set();
  let lastTime = 0;
  let frameId = 0;
  let pointer = null;
  let audioCtx = null;
  // Smaller screens get a smaller cat and items so there is room to dodge.
  let scale = 1;
  // There is no browser API that says whether a keyboard is attached, so guess from the
  // pointer type and switch as soon as the player actually presses a key or touches the screen.
  const touchOnly = window.matchMedia('(any-pointer: coarse)').matches && !window.matchMedia('(any-pointer: fine)').matches;
  let inputMode = touchOnly ? 'touch' : 'keyboard';
  const keys = new Set();

  let difficultyKey = DIFFICULTIES[readSetting('nyan-game-difficulty')] ? readSetting('nyan-game-difficulty') : 'normal';
  let sfxOn = readSetting('nyan-game-sfx') !== 'off';

  function preset() {
    return DIFFICULTIES[difficultyKey];
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(from, to, t) {
    return from + (to - from) * t;
  }

  function readSetting(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function writeSetting(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {}
  }

  function bestKey() {
    return `nyan-game-best-${difficultyKey}`;
  }

  function readBest() {
    return parseInt(readSetting(bestKey()), 10) || 0;
  }

  // Levels come from points; the chosen difficulty adds a head start.
  function effectiveLevel() {
    return level + preset().bonus;
  }

  // 0 at the start, slowly approaching 1 as the level rises (and a little with time).
  function difficulty() {
    const progress = effectiveLevel() - 1 + elapsed / 120;
    return 1 - Math.exp(-progress / preset().ramp);
  }

  function pickWeighted(list) {
    const total = list.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = Math.random() * total;
    for (const entry of list) {
      roll -= entry.weight;
      if (roll <= 0) return entry;
    }
    return list[list.length - 1];
  }

  // Browsers (iOS in particular) only allow audio to start from a tap or key press.
  function unlockAudio() {
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
    } catch (e) {}
  }

  function blip(freq, duration, type, slideTo) {
    if (!sfxOn || !audioCtx) return;
    try {
      const t = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type || 'square';
      osc.frequency.setValueAtTime(freq, t);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + duration);
      gain.gain.setValueAtTime(0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + duration);
    } catch (e) {}
  }

  // Speed up or slow down the page's CSS star animations without restarting them.
  function setStarSpeed(rate) {
    if (rate === starRate || (Math.abs(rate - starRate) < 0.01 && rate !== 0 && rate !== 1)) return;
    starRate = rate;
    if (!document.getAnimations) return;
    for (const animation of document.getAnimations()) {
      if (STAR_ANIMATIONS.has(animation.animationName)) animation.playbackRate = rate;
    }
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function icon(entry) {
    return entry.coin ? el('span', 'coin-icon') : document.createTextNode(entry.emoji);
  }

  function buildLegends() {
    const good = el('div', 'legend-col good');
    good.append(el('h2', '', '✅ Collect'));
    const goodList = el('ul');
    for (const treat of TREATS) {
      const li = el('li');
      li.append(icon(treat), `  +${treat.points}`);
      goodList.append(li);
    }
    goodList.append(el('li', '', `${EXTRA_LIFE.emoji}  +1 life`));
    good.append(goodList);

    const bad = el('div', 'legend-col bad');
    bad.append(el('h2', '', '⛔ Avoid'));
    const badList = el('ul');
    for (const hazard of HAZARDS) badList.append(el('li', '', `${hazard.emoji}  ${hazard.name}`));
    badList.append(el('li', '', `${UFO.emoji}  ${UFO.name} (shoots 🔴)`));
    bad.append(badList);
    legendEl.append(good, bad);

    const goodRow = el('span', 'good', 'Catch');
    for (const treat of TREATS) goodRow.append(' ', icon(treat));
    const badRow = el('span', 'bad', `Dodge ${HAZARDS.map((h) => h.emoji).join(' ')} ${UFO.emoji}`);
    launcherLegend.append(goodRow, badRow);
  }

  function buildSettings() {
    for (const key of Object.keys(DIFFICULTIES)) {
      const button = el('button', 'pill', DIFFICULTIES[key].label);
      button.type = 'button';
      button.dataset.difficulty = key;
      button.addEventListener('click', function () {
        difficultyKey = key;
        writeSetting('nyan-game-difficulty', key);
        renderSettings();
        if (mode === 'ready' || mode === 'over') {
          lives = preset().lives;
          updateHud();
        }
        button.blur();
      });
      difficultyEl.append(button);
    }
    musicBtn.addEventListener('click', function () {
      if (music) music.setOn(!music.isOn());
      musicBtn.blur();
    });
    sfxBtn.addEventListener('click', function () {
      sfxOn = !sfxOn;
      writeSetting('nyan-game-sfx', sfxOn ? 'on' : 'off');
      renderSettings();
      sfxBtn.blur();
    });
    if (music) music.onChange(renderSettings);
    renderSettings();
  }

  function renderSettings() {
    for (const button of difficultyEl.children) {
      button.setAttribute('aria-pressed', String(button.dataset.difficulty === difficultyKey));
    }
    const musicOn = music ? music.isOn() : false;
    musicBtn.setAttribute('aria-pressed', String(musicOn));
    musicBtn.textContent = musicOn ? '🎵 Music on' : '🔇 Music off';
    sfxBtn.setAttribute('aria-pressed', String(sfxOn));
    sfxBtn.textContent = sfxOn ? '🔔 Effects on' : '🔕 Effects off';
  }

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    width = window.innerWidth;
    height = window.innerHeight;
    scale = clamp(Math.min(width, height) / 620, 0.6, 1);
    for (const [c, context] of [
      [canvas, ctx],
      [trailCanvas, trailCtx],
    ]) {
      c.width = Math.round(width * dpr);
      c.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    if (mode !== 'off') {
      clampCat();
      placeCat();
      resetTrail();
      render();
    }
  }

  function clampCat() {
    const maxX = Math.max(0, width / 2 - CAT_HALF_W * scale);
    const maxY = Math.max(0, height / 2 - CAT_HALF_H * scale);
    cat.x = clamp(cat.x, -maxX, maxX);
    cat.y = clamp(cat.y, -maxY, Math.max(-maxY, maxY - HUD_SPACE));
  }

  function placeCat() {
    let x = cat.x;
    let y = cat.y;
    if (shake > 0) {
      x += rand(-6, 6);
      y += rand(-6, 6);
    }
    rig.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    rig.style.setProperty('--tail-rot', `${cat.tail}deg`);
    rig.style.setProperty('--tail-skew', `${cat.tailSkew}deg`);
    nyanCat.style.rotate = `${cat.tilt}deg`;
    rig.classList.toggle('hurt', invulnerable > 0);
  }

  function updateHud() {
    scoreEl.textContent = String(score);
    const maxLives = preset().lives;
    livesEl.textContent = '❤️'.repeat(lives) + '🖤'.repeat(Math.max(0, maxLives - lives));
    levelEl.textContent = `Lv ${level}`;
  }

  // sections: which extra parts of the panel to show.
  function showOverlay(title, message, primaryLabel, sections) {
    titleEl.textContent = title;
    messageEl.textContent = message;
    legendEl.hidden = !sections.legend;
    settingsEl.hidden = !sections.settings;
    difficultyRow.hidden = sections.settings !== 'full';
    primaryBtn.textContent = primaryLabel;
    renderSettings();
    overlay.hidden = false;
    primaryBtn.focus({ preventScroll: true });
  }

  function hideOverlay() {
    overlay.hidden = true;
    if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
  }

  function showBanner(text, sub) {
    banner = { text: text, sub: sub || '', life: 2.5, maxLife: 2.5 };
  }

  function resetRound() {
    cat.x = 0;
    cat.y = 0;
    cat.vx = 0;
    cat.vy = 0;
    cat.tilt = 0;
    cat.tail = 0;
    cat.tailSkew = 0;
    items = [];
    popups = [];
    banner = null;
    score = 0;
    lives = preset().lives;
    level = 1;
    elapsed = 0;
    invulnerable = 0;
    shake = 0;
    treatTimer = 0.4;
    hazardTimer = 2;
    lifeTimer = rand(25, 35);
    ufoTimer = null;
    announced = new Set(HAZARDS.concat(UFO).filter((h) => h.unlockLevel <= effectiveLevel()));
    pointer = null;
    keys.clear();
    resetTrail();
    updateHud();
  }

  function instructions() {
    if (inputMode === 'touch') {
      const portrait = height > width ? '\n📱 Turn your device sideways for more room.' : '';
      return 'Drag anywhere on the screen to fly the cat.\nTap ⏸ to pause.' + portrait;
    }
    return 'Fly with the arrow keys / WASD, or drag with the mouse.\nP pauses, Esc quits.';
  }

  function setInputMode(next) {
    if (next === inputMode) return;
    inputMode = next;
    renderInputHints();
  }

  function renderInputHints() {
    if (launcherHint) launcherHint.textContent = inputMode === 'touch' ? 'tap to play' : 'click or press G';
    if (mode === 'ready') messageEl.textContent = instructions();
  }

  function openGame() {
    if (mode !== 'off') return;
    mode = 'ready';
    root.classList.add('game-on');
    resize();
    resetRound();
    hud.hidden = false;
    showOverlay('Nyan Game', instructions(), 'Start', {
      legend: true,
      settings: 'full',
    });
    lastTime = performance.now();
    cancelAnimationFrame(frameId);
    frameId = requestAnimationFrame(loop);
  }

  function closeGame() {
    if (mode === 'off') return;
    mode = 'off';
    cancelAnimationFrame(frameId);
    items = [];
    popups = [];
    trail = [];
    banner = null;
    pointer = null;
    keys.clear();
    ctx.clearRect(0, 0, width, height);
    trailCtx.clearRect(0, 0, width, height);
    overlay.hidden = true;
    hud.hidden = true;
    root.classList.remove('game-on', 'game-running');
    rig.classList.remove('hurt');
    rig.style.transform = '';
    rig.style.removeProperty('--tail-rot');
    rig.style.removeProperty('--tail-skew');
    nyanCat.style.rotate = '';
    setStarSpeed(1);
  }

  function startRound() {
    resetRound();
    mode = 'playing';
    pauseBtn.textContent = '⏸️';
    hideOverlay();
    unlockAudio();
    if (music) music.play();
    blip(520, 0.15, 'square', 1040);
    showBanner('Level 1', 'Catch the treats, dodge the rest!');
    lastTime = performance.now();
  }

  function pause() {
    if (mode !== 'playing') return;
    mode = 'paused';
    pauseBtn.textContent = '▶️';
    keys.clear();
    pointer = null;
    showOverlay('Paused', `Score: ${score} · Level ${level}`, 'Resume', { legend: true, settings: 'sound' });
  }

  function resume() {
    if (mode !== 'paused') return;
    mode = 'playing';
    pauseBtn.textContent = '⏸️';
    hideOverlay();
    lastTime = performance.now();
  }

  function gameOver() {
    mode = 'over';
    keys.clear();
    pointer = null;
    invulnerable = 0;
    const best = readBest();
    const newBest = score > best;
    if (newBest) writeSetting(bestKey(), String(score));
    blip(440, 0.6, 'sawtooth', 80);
    showOverlay(
      'Game over',
      `Score: ${score} · Level ${level}\nBest on ${preset().label}: ${Math.max(best, score)}` + (newBest && score > 0 ? '\n🎉 New high score!' : ''),
      'Play again',
      { settings: 'full' },
    );
  }

  function primaryAction() {
    if (mode === 'ready' || mode === 'over') startRound();
    else if (mode === 'paused') resume();
  }

  // Slow the world down a little on small screens, where things cross the screen sooner.
  function worldScale() {
    return 0.5 + 0.5 * scale;
  }

  function spawnItem(type, kind, y, speed, extraX) {
    const item = {
      type: type,
      kind: kind,
      size: type.size * scale,
      x: width + type.size * scale + (extraX || 0) * scale,
      y: y,
      baseY: y,
      vx: -speed * worldScale(),
      vy: 0,
      age: 0,
      phase: Math.random() * Math.PI * 2,
    };
    items.push(item);
    return item;
  }

  function spawnTreats(pace) {
    const speed = 260 * pace;
    const y = rand(50, height - 50 - HUD_SPACE);
    if (Math.random() < 0.3) {
      // A wavy trail of coins.
      for (let i = 0; i < 5; i++) {
        spawnItem(COIN, 'treat', clamp(y + Math.sin(i * 0.8) * 50, 30, height - 30 - HUD_SPACE), speed, i * 55);
      }
    } else {
      spawnItem(pickWeighted(TREATS), 'treat', y, speed);
    }
  }

  function spawnHazard(pace) {
    const unlocked = HAZARDS.filter((h) => effectiveLevel() >= h.unlockLevel);
    const type = pickWeighted(unlocked);
    const speed = rand(240, 320) * pace;
    if (type.dive) {
      const comet = spawnItem(type, 'hazard', rand(-40, height * 0.5), speed);
      comet.vy = rand(60, 140) * pace * worldScale();
    } else {
      spawnItem(type, 'hazard', rand(40, height - 40 - HUD_SPACE), speed);
    }
  }

  function spawnUfo(d) {
    const ufo = spawnItem(UFO, 'hazard', rand(80, height - 80 - HUD_SPACE), 0);
    ufo.state = 'enter';
    ufo.stay = lerp(6, 11, d);
    ufo.fireTimer = 1.2;
    blip(300, 0.5, 'triangle', 900);
  }

  function fireLaser(ufo, d) {
    const tx = width / 2 + cat.x;
    const ty = height / 2 + cat.y;
    const dx = tx - ufo.x;
    const dy = ty - ufo.y;
    const dist = Math.hypot(dx, dy) || 1;
    const speed = lerp(260, 460, d) * worldScale();
    const laser = spawnItem(LASER, 'hazard', ufo.y + 10, 0);
    laser.x = ufo.x - 30 * scale;
    laser.vx = (dx / dist) * speed;
    laser.vy = (dy / dist) * speed;
    blip(1200, 0.12, 'sawtooth', 300);
  }

  function updateUfo(ufo, dt, d) {
    const hoverX = width - ufo.size * 1.6;
    if (ufo.state === 'enter') {
      ufo.x = Math.max(hoverX, ufo.x - 240 * dt);
      if (ufo.x === hoverX) ufo.state = 'hover';
    } else if (ufo.state === 'hover') {
      ufo.stay -= dt;
      ufo.fireTimer -= dt;
      // Drift towards the cat's height so it can take aim.
      const step = lerp(70, 180, d) * dt;
      ufo.baseY += clamp(height / 2 + cat.y - ufo.baseY, -step, step);
      if (ufo.fireTimer <= 0) {
        fireLaser(ufo, d);
        ufo.fireTimer = lerp(1.8, 0.7, d) * rand(0.8, 1.2);
      }
      if (ufo.stay <= 0) ufo.state = 'leave';
    } else {
      ufo.x += 260 * dt;
      if (ufo.x > width + ufo.size * 2) ufo.dead = true;
    }
    ufo.y = ufo.baseY + Math.sin(ufo.age * 4) * 10;
  }

  function addPopup(text, x, y, color) {
    popups.push({ text: text, x: x, y: y, life: 0.8, maxLife: 0.8, color: color });
  }

  function touches(item, box) {
    const cx = width / 2 + cat.x;
    const cy = height / 2 + cat.y;
    const nx = clamp(item.x, cx + box.left * scale, cx + box.right * scale);
    const ny = clamp(item.y, cy + box.top * scale, cy + box.bottom * scale);
    const r = item.size * 0.38;
    const dx = item.x - nx;
    const dy = item.y - ny;
    return dx * dx + dy * dy < r * r;
  }

  function moveCat(dt) {
    let dx = 0;
    let dy = 0;
    const speed = CAT_SPEED * Math.max(scale, 0.8);
    const prevX = cat.x;
    const prevY = cat.y;
    if (pointer && pointer.relative) {
      // Touch: move by how far the finger dragged, like a trackpad.
      cat.x += pointer.dx * TOUCH_GAIN;
      cat.y += pointer.dy * TOUCH_GAIN;
      pointer.dx = 0;
      pointer.dy = 0;
    } else if (pointer) {
      const tx = pointer.x - width / 2 + POINTER_OFFSET_X;
      const ty = pointer.y - height / 2;
      const ddx = tx - cat.x;
      const ddy = ty - cat.y;
      const dist = Math.hypot(ddx, ddy);
      if (dist > 2) {
        const strength = Math.min(1, dist / 25);
        dx = (ddx / dist) * strength;
        dy = (ddy / dist) * strength;
      }
    } else {
      if (keys.has('left')) dx -= 1;
      if (keys.has('right')) dx += 1;
      if (keys.has('up')) dy -= 1;
      if (keys.has('down')) dy += 1;
      if (dx && dy) {
        dx *= Math.SQRT1_2;
        dy *= Math.SQRT1_2;
      }
    }
    cat.x += dx * speed * dt;
    cat.y += dy * speed * dt;
    clampCat();
    cat.vx = clamp((cat.x - prevX) / dt / speed, -1.5, 1.5);
    cat.vy = clamp((cat.y - prevY) / dt / speed, -1.5, 1.5);
  }

  // Tilt the cat and whip the tail in a wave, harder the faster it is steered.
  function animateCat(dt) {
    const speed = Math.min(1, Math.hypot(cat.vx, cat.vy));
    cat.wag += dt * lerp(12, 24, speed);
    cat.tilt += (cat.vy * 12 - cat.tilt) * Math.min(1, dt * 10);
    const tailTarget = cat.vy * 40 + Math.sin(cat.wag) * lerp(22, 40, speed);
    cat.tail += (tailTarget - cat.tail) * Math.min(1, dt * 20);
    // Lagging behind the swing makes the tail flex like a wave.
    cat.tailSkew = Math.sin(cat.wag - 1.3) * lerp(14, 26, speed);
  }

  // Where the rainbow leaves the cat, in screen coordinates.
  function trailAnchor() {
    return { x: width / 2 + cat.x - 45 * scale, y: height / 2 + cat.y - 3 * scale };
  }

  function resetTrail() {
    const anchor = trailAnchor();
    trail = [];
    for (let x = -40; x < anchor.x; x += 8) trail.push({ x: x, y: anchor.y });
    trail.push(anchor);
  }

  // The rainbow is a history of where the cat has been, scrolling left with the stars.
  function updateTrail(dt) {
    trailTime += dt;
    const shift = STAR_SPEED * starRate * dt;
    for (const point of trail) point.x -= shift;
    trail.push(trailAnchor());
    while (trail.length > 2 && (trail[1].x < -40 || trail.length > 4000)) trail.shift();
  }

  function drawTrail() {
    trailCtx.clearRect(0, 0, width, height);
    if (trail.length < 2) return;
    const anchor = trail[trail.length - 1];
    const columns = [];
    for (let i = 1; i < trail.length; i++) {
      const older = trail[i - 1];
      const newer = trail[i];
      const behind = Math.max(0, anchor.x - newer.x);
      // A travelling wave that grows away from the cat so the rainbow stays attached to it.
      const wave = Math.sin(behind * 0.03 - trailTime * 8) * 12 * Math.min(1, behind / 120);
      columns.push({
        x: Math.min(older.x, newer.x),
        w: Math.abs(newer.x - older.x) + 1,
        y: Math.round((newer.y + wave) / 3) * 3 - (RAINBOW.length * RAINBOW_BAND * scale) / 2,
      });
    }
    const bandHeight = RAINBOW_BAND * scale;
    RAINBOW.forEach(function (color, band) {
      trailCtx.fillStyle = color;
      for (const column of columns) trailCtx.fillRect(column.x, column.y + band * bandHeight, column.w, bandHeight);
    });
  }

  function update(dt) {
    elapsed += dt;
    invulnerable = Math.max(0, invulnerable - dt);
    shake = Math.max(0, shake - dt);
    const d = difficulty();
    const pace = lerp(0.6, 2.4, d);
    setStarSpeed(pace * 0.6);

    const newLevel = 1 + Math.floor(Math.sqrt(score / LEVEL_POINTS));
    if (newLevel > level) {
      level = newLevel;
      updateHud();
      if (!showUnlocks()) showBanner(`Level ${level}`, 'Things are speeding up!');
      blip(660, 0.25, 'square', 1320);
    }

    moveCat(dt);

    treatTimer -= dt;
    if (treatTimer <= 0) {
      spawnTreats(Math.min(pace, 1.8));
      treatTimer = rand(0.5, 1.1);
    }
    hazardTimer -= dt;
    if (hazardTimer <= 0) {
      spawnHazard(pace);
      // Later on, hazards sometimes come in pairs.
      if (Math.random() < d - 0.4) spawnHazard(pace);
      hazardTimer = lerp(2.2, 0.45, d) * rand(0.75, 1.25);
    }
    lifeTimer -= dt;
    if (lifeTimer <= 0) {
      if (lives < preset().lives) spawnItem(EXTRA_LIFE, 'life', rand(60, height - 60 - HUD_SPACE), 220);
      lifeTimer = rand(25, 35);
    }
    if (effectiveLevel() >= UFO.unlockLevel) {
      if (ufoTimer === null) ufoTimer = 4;
      ufoTimer -= dt;
      if (ufoTimer <= 0) {
        if (!items.some((item) => item.type === UFO)) spawnUfo(d);
        ufoTimer = lerp(28, 12, d);
      }
    }

    for (const item of items) {
      item.age += dt;
      if (item.type === UFO) {
        updateUfo(item, dt, d);
      } else {
        item.x += item.vx * dt;
        item.baseY += item.vy * dt;
        item.y = item.baseY + (item.type.wobble ? Math.sin(item.age * 3 + item.phase) * item.type.wobble : 0);
      }

      if (item.kind === 'hazard') {
        if (invulnerable <= 0 && touches(item, HIT_BOX)) {
          item.dead = true;
          lives -= 1;
          invulnerable = INVULNERABLE_TIME;
          shake = 0.35;
          addPopup('💥', item.x, item.y, '#fff');
          blip(180, 0.35, 'sawtooth', 60);
          updateHud();
          if (lives <= 0) {
            gameOver();
            return;
          }
        }
      } else if (touches(item, CATCH_BOX)) {
        item.dead = true;
        if (item.kind === 'life') {
          lives = Math.min(preset().lives, lives + 1);
          addPopup('+1 ❤️', item.x, item.y, '#f6c');
          blip(660, 0.3, 'triangle', 1320);
        } else {
          score += item.type.points;
          addPopup(`+${item.type.points}`, item.x, item.y, item.type.points >= 50 ? '#ff0' : '#fff');
          blip(item.type.points >= 50 ? 1320 : 880, 0.12, 'square', item.type.points >= 50 ? 1760 : 1320);
        }
        updateHud();
      }
    }
    items = items.filter(function (item) {
      const margin = item.size * 2;
      return !item.dead && item.x > -margin && item.x < width + 400 && item.y > -margin - 60 && item.y < height + margin;
    });

    for (const popup of popups) {
      popup.life -= dt;
      popup.y -= 50 * dt;
    }
    popups = popups.filter(function (popup) {
      return popup.life > 0;
    });
    if (banner) {
      banner.life -= dt;
      if (banner.life <= 0) banner = null;
    }
  }

  // Announce hazards that just became available. Returns true if a banner was shown.
  function showUnlocks() {
    for (const hazard of HAZARDS.concat(UFO)) {
      if (!announced.has(hazard) && effectiveLevel() >= hazard.unlockLevel) {
        announced.add(hazard);
        const sub = hazard.shooter ? 'It shoots red lasers — dodge them!' : 'Avoid it!';
        showBanner(`⚠️ Level ${level} · New danger: ${hazard.emoji} ${hazard.name}`, sub);
        return true;
      }
    }
    return false;
  }

  function drawGlow(x, y, radius, color) {
    const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
    glow.addColorStop(0, color);
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // A shiny gold coin with a star, centred on the current origin.
  function drawCoin(r) {
    const face = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
    face.addColorStop(0, '#fff6b0');
    face.addColorStop(0.45, '#ffd23f');
    face.addColorStop(1, '#c68a00');
    ctx.fillStyle = face;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = r * 0.14;
    ctx.strokeStyle = '#a86f00';
    ctx.stroke();
    ctx.lineWidth = r * 0.07;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const angle = -Math.PI / 2 + (i * Math.PI) / 5;
      const radius = i % 2 ? r * 0.2 : r * 0.45;
      ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    ctx.closePath();
    ctx.fillStyle = '#e8a900';
    ctx.fill();
    ctx.lineWidth = r * 0.06;
    ctx.stroke();
  }

  function drawItem(item) {
    const size = item.size;
    if (item.type.laser) {
      drawGlow(item.x, item.y, size * 1.3, 'rgba(255, 40, 40, 0.9)');
      ctx.fillStyle = '#f22';
      ctx.beginPath();
      ctx.arc(item.x, item.y, size * 0.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(item.x, item.y, size * 0.2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    if (item.kind === 'hazard') {
      // Pulsing red danger halo.
      const pulse = 0.5 + 0.5 * Math.sin(item.age * 8);
      drawGlow(item.x, item.y, size * 0.95, `rgba(255, 30, 30, ${0.35 + 0.25 * pulse})`);
      ctx.strokeStyle = `rgba(255, 60, 60, ${0.5 + 0.4 * pulse})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(item.x, item.y, size * 0.62, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      const color = item.kind === 'life' ? 'rgba(255, 110, 200, 0.6)' : 'rgba(255, 220, 80, 0.45)';
      drawGlow(item.x, item.y, size * 0.85, color);
    }

    ctx.save();
    ctx.translate(item.x, item.y);
    if (item.type.spin) ctx.scale(Math.max(0.15, Math.abs(Math.cos(item.age * 5 + item.phase))), 1);
    if (item.type.roll) ctx.rotate(-item.age * 3);
    if (item.type.coin) {
      drawCoin(size / 2);
    } else {
      ctx.font = `${size}px ${EMOJI_FONT}`;
      ctx.fillText(item.type.emoji, 0, 0);
    }
    ctx.restore();
  }

  function drawOutlinedText(text, x, y, font, color) {
    ctx.font = font;
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  function render() {
    drawTrail();
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    if (shake > 0) ctx.translate(rand(-6, 6), rand(-6, 6));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const item of items) drawItem(item);

    for (const popup of popups) {
      ctx.globalAlpha = Math.max(0, popup.life / popup.maxLife);
      drawOutlinedText(popup.text, popup.x, popup.y, `bold ${Math.round(24 * scale)}px Helvetica, arial, ${EMOJI_FONT}`, popup.color);
    }
    ctx.globalAlpha = 1;

    if (banner) {
      ctx.globalAlpha = Math.min(1, banner.life / 0.5, (banner.maxLife - banner.life) / 0.2);
      const titleSize = width < 600 ? 22 : 34;
      drawOutlinedText(banner.text, width / 2, height * 0.22, `bold ${titleSize}px Helvetica, arial, ${EMOJI_FONT}`, '#fff');
      if (banner.sub) {
        drawOutlinedText(banner.sub, width / 2, height * 0.22 + titleSize, `bold ${width < 600 ? 14 : 18}px Helvetica, arial, ${EMOJI_FONT}`, '#ff0');
      }
    }
    ctx.restore();
  }

  function loop(now) {
    if (mode === 'off') return;
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;
    if (mode === 'playing') {
      update(dt);
    } else if (mode === 'ready') {
      setStarSpeed(0.36);
    } else {
      setStarSpeed(0);
    }
    if (mode === 'playing' || mode === 'ready') {
      animateCat(dt);
      updateTrail(dt);
    }
    root.classList.toggle('game-running', mode === 'playing');
    placeCat();
    render();
    frameId = requestAnimationFrame(loop);
  }

  launcher.addEventListener('click', function () {
    launcher.blur();
    openGame();
  });
  toggle.addEventListener('click', function () {
    toggle.blur();
    closeGame();
  });
  primaryBtn.addEventListener('click', primaryAction);
  quitBtn.addEventListener('click', closeGame);
  pauseBtn.addEventListener('click', function () {
    pauseBtn.blur();
    if (mode === 'playing') pause();
    else if (mode === 'paused') resume();
  });

  document.addEventListener('keydown', function (e) {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (KEY_DIRS[key] || key === 'g') setInputMode('keyboard');
    if (mode === 'off') {
      if (key === 'g' && !e.ctrlKey && !e.metaKey && !e.altKey) openGame();
      return;
    }
    const dir = KEY_DIRS[key];
    if (dir) {
      e.preventDefault();
      if (mode === 'playing') keys.add(dir);
      return;
    }
    if (key === 'Escape') {
      closeGame();
    } else if (key === 'p') {
      if (mode === 'playing') pause();
      else if (mode === 'paused') resume();
    } else if (key === ' ' || key === 'Enter') {
      // Let focused buttons handle their own activation.
      if (e.target instanceof HTMLButtonElement) return;
      e.preventDefault();
      primaryAction();
    }
  });

  document.addEventListener('keyup', function (e) {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const dir = KEY_DIRS[key];
    if (dir) keys.delete(dir);
  });

  document.addEventListener(
    'pointerdown',
    function (e) {
      if (e.pointerType === 'touch' || e.pointerType === 'pen') setInputMode('touch');
      else if (e.pointerType === 'mouse') setInputMode('keyboard');
    },
    true,
  );

  canvas.addEventListener('pointerdown', function (e) {
    if (mode !== 'playing') return;
    // Touch drags move the cat relative to the finger so the finger never hides it;
    // the mouse is followed directly.
    const relative = e.pointerType !== 'mouse';
    pointer = { relative: relative, x: e.clientX, y: e.clientY, dx: 0, dy: 0 };
    canvas.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!pointer) return;
    pointer.dx += e.clientX - pointer.x;
    pointer.dy += e.clientY - pointer.y;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
  });
  canvas.addEventListener('pointerup', function () {
    pointer = null;
  });
  canvas.addEventListener('pointercancel', function () {
    pointer = null;
  });

  window.addEventListener('resize', resize);
  window.addEventListener('blur', pause);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) pause();
  });

  buildLegends();
  buildSettings();
  renderInputHints();
  resize();
})();
