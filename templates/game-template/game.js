/**
 * GAME_NAME — Weekly Game Factory
 * Template: HTML5 Canvas Game
 *
 * Fill in the CONFIG section below, then implement the game states.
 */

// ============================================================
// CONFIG — Edit these for each game
// ============================================================
const CONFIG = {
  title: 'GAME_NAME',
  week: 0,
  width: 800,
  height: 500,
  fps: 60,
  bgColor: '#0a0a12',
};

// ============================================================
// CANVAS SETUP
// ============================================================
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Responsive sizing
function resizeCanvas() {
  const container = document.getElementById('game-container');
  const maxW = container.clientWidth;
  const maxH = container.clientHeight - 40; // account for header
  const scale = Math.min(maxW / CONFIG.width, maxH / CONFIG.height);

  canvas.width = CONFIG.width;
  canvas.height = CONFIG.height;
  canvas.style.width = Math.floor(CONFIG.width * scale) + 'px';
  canvas.style.height = Math.floor(CONFIG.height * scale) + 'px';
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ============================================================
// GAME STATE
// ============================================================
const GameState = {
  MENU: 'menu',
  PLAYING: 'playing',
  GAME_OVER: 'game_over',
  PAUSED: 'paused',
};

let state = GameState.MENU;
let score = 0;
let highScore = parseInt(localStorage.getItem('highScore_' + CONFIG.title)) || 0;
let keys = {};

// ============================================================
// INPUT
// ============================================================
document.addEventListener('keydown', e => {
  keys[e.key] = true;
  if (e.key === ' ' || e.key === 'Enter') e.preventDefault();

  if (state === GameState.MENU && (e.key === ' ' || e.key === 'Enter')) {
    startGame();
  }
  if (state === GameState.GAME_OVER && (e.key === ' ' || e.key === 'Enter')) {
    state = GameState.MENU;
  }
  if (state === GameState.PLAYING && e.key === 'p') {
    state = GameState.PAUSED;
  } else if (state === GameState.PAUSED && e.key === 'p') {
    state = GameState.PLAYING;
  }
});

document.addEventListener('keyup', e => { keys[e.key] = false; });

// Touch support
let touchX = 0, touchY = 0, touching = false;
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  touchX = (e.touches[0].clientX - rect.left) / (rect.width / CONFIG.width);
  touchY = (e.touches[0].clientY - rect.top) / (rect.height / CONFIG.height);
  touching = true;

  if (state === GameState.MENU) startGame();
  if (state === GameState.GAME_OVER) state = GameState.MENU;
});
canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  touchX = (e.touches[0].clientX - rect.left) / (rect.width / CONFIG.width);
  touchY = (e.touches[0].clientY - rect.top) / (rect.height / CONFIG.height);
});
canvas.addEventListener('touchend', e => { touching = false; });

// Mouse click
canvas.addEventListener('click', e => {
  if (state === GameState.MENU) startGame();
  if (state === GameState.GAME_OVER) state = GameState.MENU;
});

// ============================================================
// GAME LOGIC — Implement your game here!
// ============================================================

let gameTime = 0;
let entities = []; // Your game objects go here

function startGame() {
  state = GameState.PLAYING;
  score = 0;
  gameTime = 0;
  entities = [];
  initLevel();
}

function initLevel() {
  // TODO: Create starting entities, obstacles, player, etc.
}

function update(dt) {
  if (state !== GameState.PLAYING) return;
  gameTime += dt;

  // TODO: Update game logic — movement, collision, scoring, spawning
  // Use keys object for keyboard input
  // Use touchX, touchY, touching for mobile
}

// ============================================================
// RENDERING
// ============================================================

function draw() {
  // Clear
  ctx.fillStyle = CONFIG.bgColor;
  ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

  if (state === GameState.MENU) {
    drawMenu();
  } else if (state === GameState.PLAYING || state === GameState.PAUSED) {
    drawGame();
    if (state === GameState.PAUSED) drawPauseOverlay();
  } else if (state === GameState.GAME_OVER) {
    drawGame();
    drawGameOver();
  }
}

function drawMenu() {
  ctx.save();

  // Title
  ctx.fillStyle = '#ff6b35';
  ctx.font = `bold ${Math.floor(CONFIG.width * 0.06)}px 'Courier New', monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(CONFIG.title, CONFIG.width / 2, CONFIG.height * 0.3);

  // Subtitle
  ctx.fillStyle = '#8888a0';
  ctx.font = `${Math.floor(CONFIG.width * 0.025)}px 'Courier New', monospace`;
  ctx.fillText('Weekly Game Factory — Week ' + CONFIG.week, CONFIG.width / 2, CONFIG.height * 0.3 + 50);

  // Instructions
  ctx.fillStyle = '#e8e8f0';
  ctx.font = `${Math.floor(CONFIG.width * 0.022)}px sans-serif`;
  ctx.fillText('Press SPACE or Tap to Start', CONFIG.width / 2, CONFIG.height * 0.6);

  // High score
  if (highScore > 0) {
    ctx.fillStyle = '#ffd700';
    ctx.font = `${Math.floor(CONFIG.width * 0.02)}px 'Courier New', monospace`;
    ctx.fillText('🏆 High Score: ' + highScore, CONFIG.width / 2, CONFIG.height * 0.7);
  }

  ctx.restore();
}

function drawGame() {
  // TODO: Draw all game entities
  // Use ctx.save() / ctx.restore() around transforms
  // Score / HUD
  ctx.save();
  ctx.fillStyle = '#fff';
  ctx.font = `${Math.floor(CONFIG.width * 0.025)}px 'Courier New', monospace`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('Score: ' + score, 10, 10);
  ctx.restore();
}

function drawPauseOverlay() {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.floor(CONFIG.width * 0.04)}px 'Courier New', monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PAUSED', CONFIG.width / 2, CONFIG.height / 2);
  ctx.fillStyle = '#8888a0';
  ctx.font = `${Math.floor(CONFIG.width * 0.02)}px sans-serif`;
  ctx.fillText('Press P to resume', CONFIG.width / 2, CONFIG.height / 2 + 40);
  ctx.restore();
}

function drawGameOver() {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

  ctx.fillStyle = '#ff6b35';
  ctx.font = `bold ${Math.floor(CONFIG.width * 0.05)}px 'Courier New', monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('GAME OVER', CONFIG.width / 2, CONFIG.height * 0.35);

  ctx.fillStyle = '#fff';
  ctx.font = `${Math.floor(CONFIG.width * 0.03)}px 'Courier New', monospace`;
  ctx.fillText('Score: ' + score, CONFIG.width / 2, CONFIG.height * 0.45);

  if (score >= highScore) {
    ctx.fillStyle = '#ffd700';
    ctx.fillText('🏆 NEW HIGH SCORE!', CONFIG.width / 2, CONFIG.height * 0.53);
  }

  ctx.fillStyle = '#8888a0';
  ctx.font = `${Math.floor(CONFIG.width * 0.02)}px sans-serif`;
  ctx.fillText('Press SPACE or Tap to continue', CONFIG.width / 2, CONFIG.height * 0.63);

  ctx.restore();
}

function endGame() {
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('highScore_' + CONFIG.title, highScore);
  }
  state = GameState.GAME_OVER;
}

// ============================================================
// GAME LOOP
// ============================================================
let lastTime = 0;

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05); // cap at 50ms
  lastTime = timestamp;

  update(dt);
  draw();

  requestAnimationFrame(gameLoop);
}

// Start
update(0);
draw();
requestAnimationFrame(gameLoop);