/**
 * Cosmic Cargo — Weekly Game Factory (Week 1)
 * A gravity-switching cargo hauler through asteroid fields.
 */

// ============================================================
// CONFIG
// ============================================================
const CANVAS_W = 800;
const CANVAS_H = 600;
const GRAVITY_FORCE = 0.15;
const MAX_SPEED = 4.5;
const FRICTION = 0.98;
const BOUNCE_DAMPING = 0.6;

// ============================================================
// CANVAS SETUP
// ============================================================
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  const container = document.getElementById('game-container');
  const maxW = container.clientWidth;
  const maxH = container.clientHeight - 40;
  const scale = Math.min(maxW / CANVAS_W, maxH / CANVAS_H);

  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  canvas.style.width = Math.floor(CANVAS_W * scale) + 'px';
  canvas.style.height = Math.floor(CANVAS_H * scale) + 'px';
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ============================================================
// AUDIO
// ============================================================
let audioCtx = null;
function getAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playTone(freq, duration, type = 'sine', volume = 0.08) {
  try {
    const a = getAudio();
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, a.currentTime);
    gain.gain.setValueAtTime(volume, a.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, a.currentTime + duration);
    osc.connect(gain);
    gain.connect(a.destination);
    osc.start();
    osc.stop(a.currentTime + duration);
  } catch (e) { /* silent */ }
}

function soundFlip() {
  playTone(200, 0.15, 'sine', 0.06);
  setTimeout(() => playTone(350, 0.1, 'sine', 0.04), 50);
}
function soundCollect() { playTone(800, 0.1, 'sine', 0.08); setTimeout(() => playTone(1200, 0.15, 'sine', 0.06), 80); }
function soundNearMiss() { playTone(400, 0.08, 'sawtooth', 0.03); }
function soundDeath() { playTone(150, 0.3, 'sawtooth', 0.1); setTimeout(() => playTone(80, 0.4, 'sawtooth', 0.08), 150); }
function soundLevelUp() {
  [400, 500, 600, 800].forEach((f, i) => setTimeout(() => playTone(f, 0.15, 'sine', 0.06), i * 100));
}
function soundBoost() { playTone(600, 0.1, 'square', 0.04); }

// ============================================================
// GAME STATE
// ============================================================
const STATE = { MENU: 0, PLAYING: 1, GAME_OVER: 2, LEVEL_COMPLETE: 3 };
let state = STATE.MENU;
let level = 1;
let score = 0;
let comboCount = 0;
let comboTimer = 0;
let fuel = 100;
let frameCount = 0;

// Directions
const DIR = { UP: 0, DOWN: 1, LEFT: 2, RIGHT: 3 };
const DIR_VEC = [
  { x: 0, y: -1 },  // UP
  { x: 0, y: 1 },   // DOWN
  { x: -1, y: 0 },  // LEFT
  { x: 1, y: 0 },   // RIGHT
];
const DIR_NAMES = ['↑ UP', '↓ DOWN', '← LEFT', '→ RIGHT'];
const DIR_ARROWS = ['↑', '↓', '←', '→'];

// ============================================================
// SHIP
// ============================================================
let ship = { x: 0, y: 0, vx: 0, vy: 0, w: 20, h: 14, gravity: DIR.DOWN };
let asteroids = [];
let cargoPods = [];
let particles = [];
let stars = [];
let exitPortal = null;
let nearMissFlash = 0;

function resetShip() {
  ship.x = CANVAS_W / 2;
  ship.y = 60;
  ship.vx = 0;
  ship.vy = 0;
  ship.gravity = DIR.DOWN;
}

function resetLevel() {
  asteroids = [];
  cargoPods = [];
  particles = [];
  exitPortal = null;
  fuel = 100;
  comboCount = 0;
  comboTimer = 0;

  resetShip();
  generateLevel(level);
}

function generateLevel(lvl) {
  const numAsteroids = 8 + lvl * 3;
  const numCargo = 3 + Math.min(lvl, 7);

  // Generate asteroids — avoid center-top (ship start)
  for (let i = 0; i < numAsteroids; i++) {
    let x, y, safe = false;
    let attempts = 0;
    while (!safe && attempts < 50) {
      x = 40 + Math.random() * (CANVAS_W - 80);
      y = 40 + Math.random() * (CANVAS_H - 80);
      const dx = x - CANVAS_W / 2;
      const dy = y - 60;
      safe = Math.sqrt(dx * dx + dy * dy) > 100 + lvl * 5;
      attempts++;
    }
    const size = 12 + Math.random() * 14 + lvl * 0.5;
    asteroids.push({
      x, y,
      r: size,
      vx: (Math.random() - 0.5) * (0.3 + lvl * 0.05),
      vy: (Math.random() - 0.5) * (0.3 + lvl * 0.05),
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.02,
      points: 6 + Math.floor(Math.random() * 4),
    });
  }

  // Place cargo pods
  for (let i = 0; i < numCargo; i++) {
    let x, y, safe = false;
    let attempts = 0;
    while (!safe && attempts < 50) {
      x = 40 + Math.random() * (CANVAS_W - 80);
      y = 40 + Math.random() * (CANVAS_H - 80);
      const dx = x - CANVAS_W / 2;
      const dy = y - 60;
      safe = Math.sqrt(dx * dx + dy * dy) > 80;
      // Also not inside an asteroid
      safe = safe && !asteroids.some(a => Math.sqrt((x - a.x) ** 2 + (y - a.y) ** 2) < a.r + 20);
      attempts++;
    }
    cargoPods.push({ x, y, w: 12, h: 12, collected: false, bobPhase: Math.random() * Math.PI * 2 });
  }

  // Exit portal — far from ship
  let portalX, portalY;
  const corners = [
    [CANVAS_W - 60, CANVAS_H - 60],
    [60, CANVAS_H - 60],
    [CANVAS_W - 60, 60],
  ];
  const chosen = corners[Math.floor(Math.random() * corners.length)];
  exitPortal = { x: chosen[0], y: chosen[1], r: 18, pulse: 0 };
}

// ============================================================
// INIT STARS
// ============================================================
for (let i = 0; i < 80; i++) {
  stars.push({
    x: Math.random() * CANVAS_W,
    y: Math.random() * CANVAS_H,
    size: 0.5 + Math.random() * 1.5,
    speed: 0.2 + Math.random() * 0.5,
    brightness: Math.random(),
  });
}

// ============================================================
// INPUT
// ============================================================
const keys = {};

document.addEventListener('keydown', (e) => {
  keys[e.key] = true;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();

  if (state === STATE.MENU && (e.key === ' ' || e.key === 'Enter')) { startGame(); return; }
  if (state === STATE.GAME_OVER && (e.key === ' ' || e.key === 'Enter')) { state = STATE.MENU; return; }
  if (state === STATE.LEVEL_COMPLETE && (e.key === ' ' || e.key === 'Enter')) { nextLevel(); return; }
  if (state !== STATE.PLAYING) return;

  // Gravity flip
  if (e.key === 'ArrowUp') setGravity(DIR.UP);
  if (e.key === 'ArrowDown') setGravity(DIR.DOWN);
  if (e.key === 'ArrowLeft') setGravity(DIR.LEFT);
  if (e.key === 'ArrowRight') setGravity(DIR.RIGHT);
  if (e.key === ' ') { useBoost(); }
});

document.addEventListener('keyup', (e) => { keys[e.key] = false; });

// Touch/swipe
let touchStart = null;
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
}, { passive: false });

canvas.addEventListener('touchmove', (e) => { e.preventDefault(); }, { passive: false });

canvas.addEventListener('touchend', (e) => {
  if (!touchStart) return;
  const dx = e.changedTouches[0].clientX - touchStart.x;
  const dy = e.changedTouches[0].clientY - touchStart.y;
  const dt = Date.now() - touchStart.t;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (state === STATE.MENU) { startGame(); touchStart = null; return; }
  if (state === STATE.GAME_OVER) { state = STATE.MENU; touchStart = null; return; }
  if (state === STATE.LEVEL_COMPLETE) { nextLevel(); touchStart = null; return; }
  if (state !== STATE.PLAYING) { touchStart = null; return; }

  if (dist < 15) {
    // Tap = boost
    useBoost();
  } else if (dist > 30 && dt < 500) {
    // Swipe
    if (Math.abs(dx) > Math.abs(dy)) {
      setGravity(dx > 0 ? DIR.RIGHT : DIR.LEFT);
    } else {
      setGravity(dy > 0 ? DIR.DOWN : DIR.UP);
    }
  }
  touchStart = null;
});

canvas.addEventListener('click', () => {
  if (state === STATE.MENU) { startGame(); return; }
  if (state === STATE.GAME_OVER) { state = STATE.MENU; return; }
  if (state === STATE.LEVEL_COMPLETE) { nextLevel(); return; }
});

// ============================================================
// GAME ACTIONS
// ============================================================
function setGravity(dir) {
  if (ship.gravity === dir) return;
  ship.gravity = dir;
  soundFlip();

  // Flip particles — burst effect at ship
  for (let i = 0; i < 8; i++) {
    const angle = Math.random() * Math.PI * 2;
    particles.push({
      x: ship.x, y: ship.y,
      vx: Math.cos(angle) * (1 + Math.random() * 2),
      vy: Math.sin(angle) * (1 + Math.random() * 2),
      life: 15 + Math.random() * 10,
      size: 2 + Math.random() * 2,
      color: `hsl(${180 + Math.random() * 60}, 100%, ${60 + Math.random() * 30}%)`,
    });
  }
}

function useBoost() {
  if (fuel <= 0) return;
  fuel = Math.max(0, fuel - 5);
  const vec = DIR_VEC[ship.gravity];
  ship.vx += vec.x * 2;
  ship.vy += vec.y * 2;
  soundBoost();

  // Boost particles
  for (let i = 0; i < 5; i++) {
    particles.push({
      x: ship.x + (Math.random() - 0.5) * ship.w,
      y: ship.y + (Math.random() - 0.5) * ship.h,
      vx: -vec.x * (1 + Math.random() * 2) + (Math.random() - 0.5),
      vy: -vec.y * (1 + Math.random() * 2) + (Math.random() - 0.5),
      life: 10 + Math.random() * 8,
      size: 1 + Math.random() * 2,
      color: `hsl(30, 100%, ${50 + Math.random() * 40}%)`,
    });
  }
}

function startGame() {
  level = 1;
  score = 0;
  frameCount = 0;
  state = STATE.PLAYING;
  resetLevel();
}

function nextLevel() {
  level++;
  state = STATE.PLAYING;
  resetLevel();
  soundLevelUp();
}

function endGame() {
  state = STATE.GAME_OVER;
  soundDeath();

  // Big explosion
  for (let i = 0; i < 40; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd = 1 + Math.random() * 4;
    particles.push({
      x: ship.x, y: ship.y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd,
      life: 25 + Math.random() * 20,
      size: 2 + Math.random() * 4,
      color: `hsl(${Math.random() * 60 + 10}, 100%, ${50 + Math.random() * 40}%)`,
    });
  }
}

// ============================================================
// GAME LOOP
// ============================================================
let lastTime = 0;

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;
  frameCount++;

  // ============ UPDATE ============
  if (state === STATE.PLAYING) {
    // Apply gravity
    const g = DIR_VEC[ship.gravity];
    ship.vx += g.x * GRAVITY_FORCE;
    ship.vy += g.y * GRAVITY_FORCE;

    // Speed cap
    const spd = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
    if (spd > MAX_SPEED) {
      ship.vx = (ship.vx / spd) * MAX_SPEED;
      ship.vy = (ship.vy / spd) * MAX_SPEED;
    }

    // Move
    ship.x += ship.vx;
    ship.y += ship.vy;

    // Wall collision (bounce)
    if (ship.x < ship.w / 2) { ship.x = ship.w / 2; ship.vx *= -BOUNCE_DAMPING; }
    if (ship.x > CANVAS_W - ship.w / 2) { ship.x = CANVAS_W - ship.w / 2; ship.vx *= -BOUNCE_DAMPING; }
    if (ship.y < ship.h / 2) { ship.y = ship.h / 2; ship.vy *= -BOUNCE_DAMPING; }
    if (ship.y > CANVAS_H - ship.h / 2) { ship.y = CANVAS_H - ship.h / 2; ship.vy *= -BOUNCE_DAMPING; }

    // Trail particles
    if (frameCount % 3 === 0) {
      const trailColor = ['#00d4ff', '#0088cc', '#0600EF'][frameCount % 3];
      particles.push({
        x: ship.x + (Math.random() - 0.5) * 4,
        y: ship.y + (Math.random() - 0.5) * 4,
        vx: -ship.vx * 0.1 + (Math.random() - 0.5) * 0.3,
        vy: -ship.vy * 0.1 + (Math.random() - 0.5) * 0.3,
        life: 8 + Math.random() * 5,
        size: 1 + Math.random() * 1.5,
        color: trailColor,
      });
    }

    // Update asteroids
    asteroids.forEach(a => {
      a.x += a.vx;
      a.y += a.vy;
      a.rot += a.rotSpeed;
      // Bounce off walls
      if (a.x < a.r) { a.x = a.r; a.vx *= -1; }
      if (a.x > CANVAS_W - a.r) { a.x = CANVAS_W - a.r; a.vx *= -1; }
      if (a.y < a.r) { a.y = a.r; a.vy *= -1; }
      if (a.y > CANVAS_H - a.r) { a.y = CANVAS_H - a.r; a.vy *= -1; }
    });

    // Ship vs asteroids collision
    let dead = false;
    asteroids.forEach(a => {
      const dx = ship.x - a.x;
      const dy = ship.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = a.r + Math.max(ship.w, ship.h) / 2 - 3;

      if (dist < minDist) {
        dead = true;
      } else if (dist < minDist + 8) {
        // Near miss!
        nearMissFlash = 10;
        score += 50;
        soundNearMiss();
      }
    });

    if (dead) { endGame(); return requestAnimationFrame(gameLoop); }

    // Ship vs cargo pods
    cargoPods.forEach(pod => {
      if (pod.collected) return;
      const dx = ship.x - pod.x;
      const dy = ship.y - pod.y;
      if (Math.abs(dx) < (ship.w / 2 + pod.w / 2) && Math.abs(dy) < (ship.h / 2 + pod.h / 2)) {
        pod.collected = true;
        soundCollect();

        // Combo
        const now = Date.now();
        if (now - comboTimer < 2000) {
          comboCount++;
        } else {
          comboCount = 1;
        }
        comboTimer = now;

        const points = 100 * comboCount;
        score += points;

        // Collection particles
        for (let i = 0; i < 12; i++) {
          const angle = Math.random() * Math.PI * 2;
          particles.push({
            x: pod.x, y: pod.y,
            vx: Math.cos(angle) * (1 + Math.random() * 3),
            vy: Math.sin(angle) * (1 + Math.random() * 3),
            life: 15 + Math.random() * 10,
            size: 2 + Math.random() * 2,
            color: `hsl(${40 + Math.random() * 20}, 100%, ${60 + Math.random() * 30}%)`,
          });
        }
      }
    });

    // Ship vs exit portal
    if (exitPortal) {
      const dx = ship.x - exitPortal.x;
      const dy = ship.y - exitPortal.y;
      if (Math.sqrt(dx * dx + dy * dy) < exitPortal.r + Math.max(ship.w, ship.h) / 2) {
        // Check if all cargo collected
        const remaining = cargoPods.filter(p => !p.collected).length;
        if (remaining === 0) {
          // Level complete!
          score += Math.floor(fuel) * 10; // Fuel bonus
          state = STATE.LEVEL_COMPLETE;
          requestAnimationFrame(gameLoop);
          return;
        }
      }
    }

    // Update particles
    particles = particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.95;
      p.vy *= 0.95;
      p.life--;
      return p.life > 0;
    });

    // Near miss flash decay
    if (nearMissFlash > 0) nearMissFlash--;

    // Fuel regeneration (slow)
    fuel = Math.min(100, fuel + 0.02);
  }

  // ============ PARTICLES always update ============
  else {
    particles = particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.95;
      p.vy *= 0.95;
      p.life--;
      return p.life > 0;
    });
  }

  // ============ DRAW ============
  drawScene();
  requestAnimationFrame(gameLoop);
}

// ============================================================
// DRAWING
// ============================================================
function drawScene() {
  // === Background ===
  const grad = ctx.createRadialGradient(CANVAS_W / 2, CANVAS_H / 2, 0, CANVAS_W / 2, CANVAS_H / 2, CANVAS_W * 0.7);
  grad.addColorStop(0, '#0d0d2b');
  grad.addColorStop(0.5, '#07071a');
  grad.addColorStop(1, '#020210');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // === Stars ===
  stars.forEach(s => {
    const alpha = 0.3 + s.brightness * 0.7;
    const twinkle = Math.sin(frameCount * 0.02 + s.brightness * 10) * 0.2 + 0.8;
    ctx.globalAlpha = alpha * twinkle;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(s.x, s.y, s.size, s.size);
  });
  ctx.globalAlpha = 1;

  if (state === STATE.MENU) {
    drawMenu();
    return;
  }

  // === Asteroids ===
  asteroids.forEach(a => {
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(a.rot);
    ctx.strokeStyle = '#555577';
    ctx.lineWidth = 2;
    ctx.fillStyle = '#2a2a44';
    ctx.beginPath();
    for (let i = 0; i < a.points; i++) {
      const angle = (i / a.points) * Math.PI * 2 - Math.PI / 2;
      const r = a.r * (0.7 + (i % 3 === 0 ? 0.3 : 0));
      const px = Math.cos(angle) * a.r;
      const py = Math.sin(angle) * (a.r * 0.85);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Inner detail
    ctx.strokeStyle = '#3a3a55';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(-a.r * 0.2, -a.r * 0.2, a.r * 0.3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  });

  // === Cargo Pods ===
  cargoPods.forEach(pod => {
    if (pod.collected) return;
    const bob = Math.sin(frameCount * 0.03 + pod.bobPhase) * 2;
    const shimmer = Math.sin(frameCount * 0.05 + pod.bobPhase) * 0.3 + 0.7;

    // Glow
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 15 * shimmer;

    // Diamond shape
    ctx.fillStyle = `rgba(255, 215, 0, ${shimmer})`;
    ctx.beginPath();
    ctx.moveTo(pod.x, pod.y - 6 - bob);
    ctx.lineTo(pod.x + 6, pod.y - bob);
    ctx.lineTo(pod.x, pod.y + 6 - bob);
    ctx.lineTo(pod.x - 6, pod.y - bob);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = `rgba(255, 255, 200, ${shimmer})`;
    ctx.beginPath();
    ctx.moveTo(pod.x, pod.y - 3 - bob);
    ctx.lineTo(pod.x + 3, pod.y - bob);
    ctx.lineTo(pod.x, pod.y + 3 - bob);
    ctx.lineTo(pod.x - 3, pod.y - bob);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
  });

  // === Exit Portal ===
  if (exitPortal) {
    const remaining = cargoPods.filter(p => !p.collected).length;
    const portalPulse = Math.sin(frameCount * 0.04) * 0.15 + 0.85;
    const canExit = remaining === 0;

    // Outer glow
    ctx.shadowColor = canExit ? '#00ff88' : '#444466';
    ctx.shadowBlur = 25 * portalPulse;

    // Portal ring
    ctx.strokeStyle = canExit ? `rgba(0, 255, 136, ${portalPulse})` : `rgba(100, 100, 140, 0.5)`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(exitPortal.x, exitPortal.y, exitPortal.r * portalPulse, 0, Math.PI * 2);
    ctx.stroke();

    // Inner portal
    const grd = ctx.createRadialGradient(exitPortal.x, exitPortal.y, 0, exitPortal.x, exitPortal.y, exitPortal.r);
    if (canExit) {
      grd.addColorStop(0, 'rgba(0, 255, 136, 0.6)');
      grd.addColorStop(0.5, 'rgba(0, 200, 100, 0.3)');
      grd.addColorStop(1, 'rgba(0, 255, 136, 0)');
    } else {
      grd.addColorStop(0, 'rgba(100, 100, 140, 0.3)');
      grd.addColorStop(1, 'rgba(100, 100, 140, 0)');
    }
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(exitPortal.x, exitPortal.y, exitPortal.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // "EXIT" label
    ctx.fillStyle = canExit ? '#00ff88' : '#555';
    ctx.font = '10px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(canExit ? '▽ EXIT ▽' : `Need ${remaining} more`, exitPortal.x, exitPortal.y + exitPortal.r + 14);

    if (canExit) {
      // Arrow pointing to portal
      const arrowPulse = Math.abs(Math.sin(frameCount * 0.06));
      ctx.fillStyle = `rgba(0, 255, 136, ${arrowPulse * 0.6})`;
      ctx.font = '18px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('▼', exitPortal.x, exitPortal.y - exitPortal.r - 12 + arrowPulse * 4);
    }
  }

  // === Ship ===
  if (state === STATE.PLAYING || state === STATE.LEVEL_COMPLETE) {
    ctx.save();
    ctx.translate(ship.x, ship.y);

    // Glow
    ctx.shadowColor = '#00d4ff';
    ctx.shadowBlur = 12;

    // Ship body — elongated hexagon
    ctx.fillStyle = '#0600EF';
    ctx.beginPath();
    ctx.moveTo(0, -ship.h / 2);
    ctx.lineTo(ship.w / 2, -ship.h / 4);
    ctx.lineTo(ship.w / 2, ship.h / 4);
    ctx.lineTo(0, ship.h / 2);
    ctx.lineTo(-ship.w / 2, ship.h / 4);
    ctx.lineTo(-ship.w / 2, -ship.h / 4);
    ctx.closePath();
    ctx.fill();

    // Cockpit
    ctx.fillStyle = '#00d4ff';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    // Cargo container (glowing box behind)
    ctx.fillStyle = '#ff6b35';
    ctx.fillRect(-6, ship.h / 2 - 2, 12, 5);

    // Engine glow
    const gVec = DIR_VEC[ship.gravity];
    ctx.fillStyle = `rgba(255, 107, 53, ${0.3 + Math.sin(frameCount * 0.1) * 0.2})`;
    ctx.beginPath();
    ctx.arc(-gVec.x * 6, -gVec.y * 6, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // === Particles ===
  particles.forEach(p => {
    ctx.globalAlpha = Math.max(0, p.life / 20);
    ctx.fillStyle = p.color || '#ffd700';
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  });
  ctx.globalAlpha = 1;

  // === Near miss flash ===
  if (nearMissFlash > 0) {
    ctx.save();
    ctx.strokeStyle = `rgba(255, 255, 255, ${nearMissFlash / 15})`;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(5, 5, CANVAS_W - 10, CANVAS_H - 10);
    ctx.setLineDash([]);

    ctx.fillStyle = `rgba(255, 200, 50, ${nearMissFlash / 15})`;
    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('NEAR MISS! +50', CANVAS_W / 2, 50);
    ctx.restore();
  }

  // === HUD ===
  drawHUD();

  // === Overlays ===
  if (state === STATE.GAME_OVER) drawGameOver();
  if (state === STATE.LEVEL_COMPLETE) drawLevelComplete();
}

// ============================================================
// MENU
// ============================================================
function drawMenu() {
  // Title
  ctx.save();

  // Game title
  ctx.fillStyle = '#ff6b35';
  ctx.font = 'bold 52px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#ff6b35';
  ctx.shadowBlur = 30;
  ctx.fillText('COSMIC CARGO', CANVAS_W / 2, CANVAS_H * 0.22);
  ctx.shadowBlur = 0;

  // Subtitle
  ctx.fillStyle = '#00d4ff';
  ctx.font = '20px "Courier New", monospace';
  ctx.fillText('A Gravity-Flipping Cargo Run', CANVAS_W / 2, CANVAS_H * 0.22 + 50);

  // Week badge
  ctx.fillStyle = '#8888a0';
  ctx.font = '14px "Courier New", monospace';
  ctx.fillText('Week 1 — May 30, 2026', CANVAS_W / 2, CANVAS_H * 0.22 + 78);

  // Instructions box
  const boxX = CANVAS_W / 2 - 160;
  const boxY = CANVAS_H * 0.38;
  ctx.fillStyle = 'rgba(20, 20, 50, 0.8)';
  ctx.strokeStyle = '#333366';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, 320, 180, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#e8e8f0';
  ctx.font = '15px sans-serif';
  ctx.textAlign = 'center';

  ctx.fillStyle = '#ff6b35';
  ctx.font = 'bold 14px "Courier New", monospace';
  ctx.fillText('HOW TO PLAY', CANVAS_W / 2, boxY + 25);

  ctx.fillStyle = '#e8e8f0';
  ctx.font = '13px sans-serif';
  const instructions = [
    '← → ↑ ↓ Flip gravity direction',
    'Your ship falls toward gravity',
    '💎 Collect ALL cargo pods',
    '🌀 Reach the exit portal',
    '⚡ SPACE or Tap for speed boost',
    '☄️ Avoid asteroids!',
  ];
  instructions.forEach((line, i) => {
    ctx.fillText(line, CANVAS_W / 2, boxY + 55 + i * 22);
  });

  // Combo system
  ctx.fillStyle = '#ffd700';
  ctx.font = '12px sans-serif';
  ctx.fillText('🔥 Combo: Collect pods fast for bonus points!', CANVAS_W / 2, boxY + 185);

  // Start prompt
  const pulse = Math.sin(Date.now() / 300) * 0.3 + 0.7;
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#ff6b35';
  ctx.font = 'bold 22px "Courier New", monospace';
  ctx.fillText('▶ TAP or SPACE to Start ◀', CANVAS_W / 2, CANVAS_H * 0.82);
  ctx.globalAlpha = 1;

  // High score
  const hs = localStorage.getItem('cosmic_cargo_high') || 0;
  if (hs > 0) {
    ctx.fillStyle = '#ffd700';
    ctx.font = '14px "Courier New", monospace';
    ctx.fillText('🏆 Best Score: ' + hs, CANVAS_W / 2, CANVAS_H * 0.9);
  }

  ctx.restore();
}

// ============================================================
// HUD
// ============================================================
function drawHUD() {
  ctx.save();
  const remaining = cargoPods.filter(p => !p.collected).length;
  const total = cargoPods.length;
  const collected = total - remaining;

  // Top bar background
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, CANVAS_W, 36);

  // Score
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px "Courier New", monospace';
  ctx.textAlign = 'left';
  ctx.fillText('SCORE: ' + score, 12, 24);

  // Level
  ctx.fillStyle = '#8888a0';
  ctx.font = '14px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('LEVEL ' + level, CANVAS_W / 2, 24);

  // Cargo progress
  ctx.fillStyle = '#ffd700';
  ctx.textAlign = 'right';
  ctx.font = '14px "Courier New", monospace';
  ctx.fillText('CARGO: ' + collected + '/' + total, CANVAS_W - 12, 18);

  // Fuel bar
  const fuelW = 80;
  const fuelH = 6;
  const fuelX = CANVAS_W - 12 - fuelW;
  const fuelY = 24;
  ctx.fillStyle = '#333';
  ctx.fillRect(fuelX, fuelY, fuelW, fuelH);
  ctx.fillStyle = fuel > 50 ? '#00d4ff' : fuel > 25 ? '#ffaa00' : '#ff3333';
  ctx.fillRect(fuelX, fuelY, fuelW * (fuel / 100), fuelH);
  ctx.fillStyle = '#8888a0';
  ctx.font = '9px "Courier New", monospace';
  ctx.textAlign = 'right';
  ctx.fillText('BOOST', fuelX - 4, fuelY + 5);

  // Gravity indicator
  const gx = 12;
  const gy = CANVAS_H - 50;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.beginPath();
  ctx.roundRect(gx, gy, 90, 40, 6);
  ctx.fill();

  ctx.fillStyle = '#00d4ff';
  ctx.font = '11px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('GRAVITY', gx + 45, gy + 15);

  ctx.fillStyle = '#ff6b35';
  ctx.font = 'bold 16px "Courier New", monospace';
  ctx.fillText(DIR_ARROWS[ship.gravity], gx + 45, gy + 34);

  // Combo indicator
  if (comboCount > 1 && state === STATE.PLAYING) {
    const comboAlpha = Math.min(1, (Date.now() - comboTimer) / 2000);
    ctx.fillStyle = `rgba(255, 215, 0, ${1 - comboAlpha * 0.5})`;
    ctx.font = `bold ${14 + comboCount}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('🔥 x' + comboCount + ' COMBO!', CANVAS_W / 2, CANVAS_H * 0.55);
  }

  ctx.restore();
}

// ============================================================
// GAME OVER
// ============================================================
function drawGameOver() {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  ctx.fillStyle = '#ff3333';
  ctx.font = 'bold 48px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('CARGO LOST', CANVAS_W / 2, CANVAS_H * 0.3);

  ctx.fillStyle = '#ffffff';
  ctx.font = '28px "Courier New", monospace';
  ctx.fillText('Score: ' + score, CANVAS_W / 2, CANVAS_H * 0.4);

  ctx.fillStyle = '#8888a0';
  ctx.font = '18px "Courier New", monospace';
  ctx.fillText('Level Reached: ' + level, CANVAS_W / 2, CANVAS_H * 0.47);

  // High score
  const hs = parseInt(localStorage.getItem('cosmic_cargo_high') || '0');
  const isNew = score > hs;
  if (isNew) {
    localStorage.setItem('cosmic_cargo_high', score);
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 22px "Courier New", monospace';
    ctx.fillText('🏆 NEW HIGH SCORE!', CANVAS_W / 2, CANVAS_H * 0.56);
  } else {
    ctx.fillStyle = '#8888a0';
    ctx.font = '14px "Courier New", monospace';
    ctx.fillText('Best: ' + hs, CANVAS_W / 2, CANVAS_H * 0.56);
  }

  // Reminder
  ctx.fillStyle = '#666';
  ctx.font = '14px sans-serif';
  ctx.fillText('Tip: Use SPACE boost to dodge tight spots!', CANVAS_W / 2, CANVAS_H * 0.66);

  const pulse = Math.sin(Date.now() / 300) * 0.3 + 0.7;
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#ff6b35';
  ctx.font = '20px "Courier New", monospace';
  ctx.fillText('TAP or SPACE to Continue', CANVAS_W / 2, CANVAS_H * 0.77);
  ctx.globalAlpha = 1;

  ctx.restore();
}

// ============================================================
// LEVEL COMPLETE
// ============================================================
function drawLevelComplete() {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  ctx.fillStyle = '#00ff88';
  ctx.font = 'bold 42px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('LEVEL COMPLETE!', CANVAS_W / 2, CANVAS_H * 0.28);

  ctx.fillStyle = '#ffffff';
  ctx.font = '22px "Courier New", monospace';
  ctx.fillText('Score: ' + score, CANVAS_W / 2, CANVAS_H * 0.38);

  ctx.fillStyle = '#ffd700';
  ctx.font = '16px "Courier New", monospace';
  ctx.fillText('Fuel Bonus: +' + Math.floor(fuel) * 10, CANVAS_W / 2, CANVAS_H * 0.45);

  ctx.fillStyle = '#8888a0';
  ctx.font = '18px "Courier New", monospace';
  ctx.fillText('Next: Level ' + (level + 1) + ' — More asteroids, more cargo!', CANVAS_W / 2, CANVAS_H * 0.55);

  // Stats
  const statsY = CANVAS_H * 0.63;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.roundRect(CANVAS_W / 2 - 140, statsY - 10, 280, 40, 6);
  ctx.fill();

  ctx.fillStyle = '#00d4ff';
  ctx.font = '14px "Courier New", monospace';
  ctx.fillText('🌌 Level ' + level + ' complete', CANVAS_W / 2, statsY + 17);

  const pulse = Math.sin(Date.now() / 300) * 0.3 + 0.7;
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#ff6b35';
  ctx.font = '20px "Courier New", monospace';
  ctx.fillText('TAP or SPACE for Level ' + (level + 1), CANVAS_W / 2, CANVAS_H * 0.78);
  ctx.globalAlpha = 1;

  ctx.restore();
}

// ============================================================
// ROUND RECT POLYFILL
// ============================================================
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    if (r > w / 2) r = w / 2;
    if (r > h / 2) r = h / 2;
    this.moveTo(x + r, y);
    this.lineTo(x + w - r, y);
    this.quadraticCurveTo(x + w, y, x + w, y + r);
    this.lineTo(x + w, y + h - r);
    this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.lineTo(x + r, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r);
    this.lineTo(x, y + r);
    this.quadraticCurveTo(x, y, x + r, y);
    return this;
  };
}

// ============================================================
// START
// ============================================================
resetLevel();
requestAnimationFrame(gameLoop);