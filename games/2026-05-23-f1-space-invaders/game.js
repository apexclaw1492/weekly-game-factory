/**
 * F1 Space Invaders — Weekly Game Factory (Week 0)
 * Ported from React GameCanvas component.
 * Red Bull Racing themed Space Invaders-style shooter.
 */

// ============================================================
// CANVAS SETUP
// ============================================================
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const CONFIG = {
  width: 800,
  height: 600,
};

function resizeCanvas() {
  const container = document.getElementById('game-container');
  const maxW = container.clientWidth;
  const maxH = container.clientHeight - 40;
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
const GAME_STATES = {
  MENU: 'menu',
  PLAYING: 'playing',
  GAME_OVER: 'game_over',
  LEVEL_COMPLETE: 'level_complete',
};

let gameState = GAME_STATES.MENU;
let level = 1;
let score = 0;
let multiplier = 1;
let lastHitTime = 0;
let highScores = JSON.parse(localStorage.getItem('f1_scores') || '[]');
let frameCount = 0;

// Game objects
const player = {
  x: CONFIG.width / 2 - 25,
  y: CONFIG.height - 80,
  width: 50,
  height: 30,
  speed: 5,
  color: '#0600EF',
  lastShot: 0,
};

let enemies = [];
let bullets = [];
let enemyBullets = [];
let particles = [];
let powerUps = [];
let lastEnemyShot = 0;
let stars = [];

// Initialize stars
for (let i = 0; i < 50; i++) {
  stars.push({
    x: Math.random() * CONFIG.width,
    y: Math.random() * CONFIG.height,
    speed: 0.5 + Math.random() * 0.5,
    brightness: Math.random(),
  });
}

// ============================================================
// AUDIO
// ============================================================
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function playSound(type) {
  try {
    const ctxAudio = getAudioCtx();
    const osc = ctxAudio.createOscillator();
    osc.frequency.value = type === 'shoot' ? 600 : type === 'explosion' ? 120 : 900;
    const gain = ctxAudio.createGain();
    gain.gain.value = 0.1;
    osc.connect(gain);
    gain.connect(ctxAudio.destination);
    osc.start();
    osc.stop(ctxAudio.currentTime + 0.05);
  } catch (e) {
    // Silently fail — audio is optional
  }
}

// ============================================================
// ENEMIES
// ============================================================
function initEnemies() {
  enemies = [];
  const rows = 4 + level;
  const cols = 6 + Math.min(level, 4);
  const spacingX = 60;
  const spacingY = 40;
  const startX = (CONFIG.width - (cols - 1) * spacingX) / 2;
  const startY = 100;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      enemies.push({
        x: startX + col * spacingX,
        y: startY + row * spacingY,
        width: 40,
        height: 30,
        speed: 1 + level * 0.3,
        color: '#FFFF00',
        direction: 1,
        dead: false,
      });
    }
  }
}

initEnemies();

// ============================================================
// INPUT
// ============================================================
const keys = {};

document.addEventListener('keydown', (e) => {
  keys[e.key] = true;
  if (e.code === 'Space') {
    e.preventDefault();
    if (gameState !== GAME_STATES.PLAYING) {
      startGame();
    } else {
      shoot();
    }
  }
});

document.addEventListener('keyup', (e) => {
  keys[e.key] = false;
});

// Touch controls
let touchStartX = 0;
let touchStartY = 0;
let isDragging = false;

canvas.addEventListener('touchstart', (e) => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
  isDragging = false;
  e.preventDefault();
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  const touchX = e.touches[0].clientX;
  const diffX = touchX - touchStartX;
  if (Math.abs(diffX) > 10) {
    isDragging = true;
    if (diffX > 0) {
      keys['ArrowRight'] = true;
      keys['ArrowLeft'] = false;
    } else {
      keys['ArrowLeft'] = true;
      keys['ArrowRight'] = false;
    }
    touchStartX = touchX;
  }
  e.preventDefault();
}, { passive: false });

canvas.addEventListener('touchend', () => {
  if (!isDragging) {
    if (gameState !== GAME_STATES.PLAYING) {
      startGame();
    } else {
      shoot();
    }
  }
  keys['ArrowLeft'] = false;
  keys['ArrowRight'] = false;
  isDragging = false;
});

canvas.addEventListener('click', () => {
  if (gameState !== GAME_STATES.PLAYING) {
    startGame();
  } else {
    shoot();
  }
});

// ============================================================
// SHOOTING
// ============================================================
function shoot() {
  const now = Date.now();
  if (now - player.lastShot > 300) {
    bullets.push({
      x: player.x + player.width / 2 - 2,
      y: player.y,
      width: 4,
      height: 10,
      speed: 7,
      color: '#FF0000',
    });
    player.lastShot = now;
    playSound('shoot');
  }
}

// ============================================================
// GAME CONTROL
// ============================================================
function startGame() {
  gameState = GAME_STATES.PLAYING;
  level = 1;
  score = 0;
  multiplier = 1;
  player.x = CONFIG.width / 2 - 25;
  player.y = CONFIG.height - 80;
  player.lastShot = 0;
  bullets = [];
  enemyBullets = [];
  particles = [];
  powerUps = [];
  lastEnemyShot = 0;
  initEnemies();
}

// ============================================================
// GAME LOOP
// ============================================================
let lastTime = 0;

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;
  frameCount++;

  // === DRAW BACKGROUND ===
  // Space gradient
  const grad = ctx.createLinearGradient(0, 0, 0, CONFIG.height);
  grad.addColorStop(0, '#020024');
  grad.addColorStop(1, '#090979');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

  // Animated stars
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < stars.length; i++) {
    const s = stars[i];
    s.y += s.speed;
    if (s.y > CONFIG.height) {
      s.y = 0;
      s.x = Math.random() * CONFIG.width;
    }
    ctx.globalAlpha = 0.3 + s.brightness * 0.7;
    ctx.fillRect(s.x, s.y, 1.5, 1.5);
  }
  ctx.globalAlpha = 1;

  // === NON-PLAYING STATES ===
  if (gameState !== GAME_STATES.PLAYING) {
    ctx.fillStyle = '#000000aa';
    ctx.fillRect(0, 0, CONFIG.width, CONFIG.height);

    // Draw game behind overlay
    if (gameState === GAME_STATES.GAME_OVER || gameState === GAME_STATES.LEVEL_COMPLETE) {
      drawGameEntities();
    }

    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';

    if (gameState === GAME_STATES.MENU) {
      // F1 Space Invaders Title
      ctx.font = 'bold 48px "Courier New", monospace';
      ctx.fillStyle = '#0600EF';
      ctx.fillText('F1 SPACE INVADERS', CONFIG.width / 2, CONFIG.height * 0.28);

      ctx.font = 'bold 24px Arial';
      ctx.fillStyle = '#FFFF00';
      ctx.fillText('Red Bull Racing Edition', CONFIG.width / 2, CONFIG.height * 0.28 + 45);

      ctx.font = '20px Arial';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('← → to move  |  SPACE to shoot', CONFIG.width / 2, CONFIG.height * 0.45);

      // Animated "TAP TO START" pulse
      const pulse = Math.sin(Date.now() / 300) * 0.3 + 0.7;
      ctx.globalAlpha = pulse;
      ctx.font = 'bold 28px Arial';
      ctx.fillStyle = '#FF6B35';
      ctx.fillText('TAP or SPACE to Start', CONFIG.width / 2, CONFIG.height * 0.58);
      ctx.globalAlpha = 1;

      // High scores
      if (highScores.length > 0) {
        ctx.font = '16px Arial';
        ctx.fillStyle = '#8888a0';
        ctx.fillText('🏆 High Score: ' + highScores[0], CONFIG.width / 2, CONFIG.height * 0.7);
      }

      // Week badge
      ctx.font = '14px "Courier New", monospace';
      ctx.fillStyle = '#666';
      ctx.fillText('Week 0 — Pre-Season Launch', CONFIG.width / 2, CONFIG.height * 0.85);
    } else if (gameState === GAME_STATES.GAME_OVER) {
      ctx.font = 'bold 48px Arial';
      ctx.fillStyle = '#FF0000';
      ctx.fillText('GAME OVER', CONFIG.width / 2, CONFIG.height * 0.3);

      ctx.font = '28px Arial';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('Score: ' + score, CONFIG.width / 2, CONFIG.height * 0.4);

      if (score >= (highScores[0] || 0)) {
        ctx.font = '20px Arial';
        ctx.fillStyle = '#FFD700';
        ctx.fillText('🏆 NEW HIGH SCORE!', CONFIG.width / 2, CONFIG.height * 0.47);
      }

      ctx.font = '18px Arial';
      ctx.fillStyle = '#8888a0';
      ctx.fillText('Level Reached: ' + level, CONFIG.width / 2, CONFIG.height * 0.54);

      ctx.font = '20px Arial';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('TAP or SPACE to Restart', CONFIG.width / 2, CONFIG.height * 0.65);
    } else if (gameState === GAME_STATES.LEVEL_COMPLETE) {
      ctx.font = 'bold 36px Arial';
      ctx.fillStyle = '#00FF00';
      ctx.fillText('LEVEL COMPLETE!', CONFIG.width / 2, CONFIG.height * 0.35);

      ctx.font = '24px Arial';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('Score: ' + score, CONFIG.width / 2, CONFIG.height * 0.45);

      ctx.font = '20px Arial';
      ctx.fillStyle = '#FFFF00';
      ctx.fillText('Next Level: ' + (level + 1), CONFIG.width / 2, CONFIG.height * 0.53);

      ctx.font = '20px Arial';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('TAP or SPACE to Continue', CONFIG.width / 2, CONFIG.height * 0.65);
    }

    requestAnimationFrame(gameLoop);
    return;
  }

  // === PLAYING STATE ===

  // Update player position
  if (keys['ArrowLeft'] && player.x > 0) {
    player.x -= player.speed;
  }
  if (keys['ArrowRight'] && player.x < CONFIG.width - player.width) {
    player.x += player.speed;
  }

  // Continuous auto-fire while holding SPACE
  if (keys[' ']) {
    shoot();
  }

  // Update bullets
  bullets = bullets.filter(b => {
    b.y -= b.speed;
    return b.y > 0;
  });

  // Update enemy bullets
  enemyBullets = enemyBullets.filter(b => {
    b.y += b.speed;
    return b.y < CONFIG.height;
  });

  // Update enemies
  let moveDown = false;
  enemies.forEach(enemy => {
    enemy.x += enemy.speed * enemy.direction;
    if (enemy.x <= 0 || enemy.x >= CONFIG.width - enemy.width) {
      moveDown = true;
    }
  });

  if (moveDown) {
    enemies.forEach(enemy => {
      enemy.direction *= -1;
      enemy.y += 20;
    });
  }

  // Enemy shooting
  const now = Date.now();
  if (now - lastEnemyShot > 1500 && enemies.length > 0) {
    const shooter = enemies[Math.floor(Math.random() * enemies.length)];
    enemyBullets.push({
      x: shooter.x + shooter.width / 2 - 2,
      y: shooter.y + shooter.height,
      width: 4,
      height: 10,
      speed: 3,
      color: '#00FF00',
    });
    lastEnemyShot = now;
  }

  // Collision detection — bullets hitting enemies
  bullets.forEach((bullet) => {
    enemies.forEach((enemy) => {
      if (
        bullet.x < enemy.x + enemy.width &&
        bullet.x + bullet.width > enemy.x &&
        bullet.y < enemy.y + enemy.height &&
        bullet.y + bullet.height > enemy.y
      ) {
        enemy.dead = true;
        bullet.dead = true;

        // Explosion particles
        for (let i = 0; i < 10; i++) {
          particles.push({
            x: enemy.x + enemy.width / 2,
            y: enemy.y + enemy.height / 2,
            vx: (Math.random() - 0.5) * 6,
            vy: (Math.random() - 0.5) * 6,
            life: 20,
            size: 2 + Math.random() * 3,
            color: `hsl(${40 + Math.random() * 20}, 100%, ${50 + Math.random() * 40}%)`,
          });
        }

        // Score with multiplier
        if (now - lastHitTime < 2000) multiplier++;
        else multiplier = 1;
        lastHitTime = now;
        score += 100 * multiplier;

        // Random power-up drop
        if (Math.random() < 0.2) {
          powerUps.push({
            x: enemy.x,
            y: enemy.y,
            type: 'rapid',
            width: 15,
            height: 15,
          });
        }

        playSound('explosion');
      }
    });
  });

  enemies = enemies.filter(e => !e.dead);
  bullets = bullets.filter(b => !b.dead);

  // Enemy bullets hitting player
  const playerHitByBullet = enemyBullets.some(bullet =>
    bullet.x < player.x + player.width &&
    bullet.x + bullet.width > player.x &&
    bullet.y < player.y + player.height &&
    bullet.y + bullet.height > player.y
  );
  enemyBullets = enemyBullets.filter(bullet => !(
    bullet.x < player.x + player.width &&
    bullet.x + bullet.width > player.x &&
    bullet.y < player.y + player.height &&
    bullet.y + bullet.height > player.y
  ));

  if (playerHitByBullet) {
    gameState = GAME_STATES.GAME_OVER;
    highScores.push(score);
    highScores = highScores.sort((a, b) => b - a).slice(0, 10);
    localStorage.setItem('f1_scores', JSON.stringify(highScores));

    // Big explosion on player
    for (let i = 0; i < 30; i++) {
      particles.push({
        x: player.x + player.width / 2,
        y: player.y + player.height / 2,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        life: 30,
        size: 2 + Math.random() * 4,
        color: `hsl(${220 + Math.random() * 30}, 100%, ${40 + Math.random() * 40}%)`,
      });
    }
  }

  // Draw all game entities
  drawGameEntities();

  // Update particles
  particles = particles.filter(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.95;
    p.vy *= 0.95;
    p.life--;
    return p.life > 0;
  });

  // Update power-ups
  powerUps = powerUps.filter(p => {
    p.y += 2;
    return p.y < CONFIG.height;
  });

  // Power-up collection
  powerUps = powerUps.filter(p => {
    const collected =
      p.x < player.x + player.width &&
      p.x + p.width > player.x &&
      p.y < player.y + player.height &&
      p.y + p.height > player.y;
    if (collected) {
      player.speed += 1;
    }
    return !collected;
  });

  // Draw UI
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '20px "Courier New", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`Score: ${score}`, 20, 30);

  // Multiplier
  if (multiplier > 1) {
    ctx.fillStyle = '#FFD700';
    ctx.font = '16px "Courier New", monospace';
    ctx.fillText(`x${multiplier} COMBO!`, 20, 55);
  }

  // Level
  ctx.textAlign = 'right';
  ctx.fillStyle = '#8888a0';
  ctx.fillText(`Level ${level}`, CONFIG.width - 20, 30);

  // Enemies remaining
  ctx.fillText(`Enemies: ${enemies.length}`, CONFIG.width - 20, 55);

  // === CHECK WIN/LOSE ===
  if (enemies.length === 0) {
    level++;
    gameState = GAME_STATES.LEVEL_COMPLETE;
    initEnemies();
    requestAnimationFrame(gameLoop);
    return;
  }

  // Check if enemies reached player
  const enemiesReachedBottom = enemies.some(enemy =>
    enemy.y + enemy.height > player.y
  );

  if (enemiesReachedBottom) {
    gameState = GAME_STATES.GAME_OVER;
    highScores.push(score);
    highScores = highScores.sort((a, b) => b - a).slice(0, 10);
    localStorage.setItem('f1_scores', JSON.stringify(highScores));
    requestAnimationFrame(gameLoop);
    return;
  }

  requestAnimationFrame(gameLoop);
}

// ============================================================
// DRAW ENTITIES
// ============================================================
function drawGameEntities() {
  // Draw player (F1 car)
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.width, player.height);

  // F1 car details
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(player.x + 15, player.y - 5, 20, 5);  // Rear wing
  ctx.fillRect(player.x + 20, player.y + player.height, 10, 3);  // Diffuser

  // Cockpit
  ctx.fillStyle = '#000033';
  ctx.fillRect(player.x + 10, player.y + 5, 30, 15);

  // Wheels
  ctx.fillStyle = '#111';
  ctx.fillRect(player.x - 3, player.y + 2, 5, 8);
  ctx.fillRect(player.x + player.width - 2, player.y + 2, 5, 8);
  ctx.fillRect(player.x - 3, player.y + player.height - 10, 5, 8);
  ctx.fillRect(player.x + player.width - 2, player.y + player.height - 10, 5, 8);

  // Red Bull logo (simple)
  ctx.fillStyle = '#FF0000';
  ctx.fillRect(player.x + 8, player.y + 8, 5, 14);
  ctx.fillRect(player.x + player.width - 13, player.y + 8, 5, 14);

  // Draw bullets
  ctx.fillStyle = '#FF0000';
  bullets.forEach(bullet => {
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    // Trail
    ctx.fillStyle = 'rgba(255,0,0,0.3)';
    ctx.fillRect(bullet.x - 1, bullet.y + bullet.height, bullet.width + 2, 6);
    ctx.fillStyle = '#FF0000';
  });

  // Draw enemy bullets
  ctx.fillStyle = '#00FF00';
  enemyBullets.forEach(bullet => {
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    // Glow
    ctx.shadowColor = '#00FF00';
    ctx.shadowBlur = 8;
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    ctx.shadowBlur = 0;
  });

  // Draw enemies
  enemies.forEach(enemy => {
    // Body
    ctx.fillStyle = enemy.color;
    ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);

    // F1 enemy details - wheels
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(enemy.x + 8, enemy.y + enemy.height, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(enemy.x + enemy.width - 8, enemy.y + enemy.height, 6, 0, Math.PI * 2);
    ctx.fill();

    // Cockpit
    ctx.fillStyle = '#333300';
    ctx.fillRect(enemy.x + 8, enemy.y + 5, enemy.width - 16, 10);

    // Halo/visor
    ctx.fillStyle = '#88AA00';
    ctx.fillRect(enemy.x + 12, enemy.y + 8, enemy.width - 24, 4);
  });

  // Draw particles
  particles.forEach(p => {
    ctx.fillStyle = p.color || '#FFFF00';
    ctx.globalAlpha = p.life / 20;
    ctx.fillRect(p.x, p.y, p.size || 3, p.size || 3);
  });
  ctx.globalAlpha = 1;

  // Draw power-ups (Blue shield icons)
  powerUps.forEach(p => {
    ctx.fillStyle = '#0600EF';
    ctx.shadowColor = '#0600EF';
    ctx.shadowBlur = 12;
    ctx.fillRect(p.x, p.y, p.width, p.height);
    ctx.shadowBlur = 0;
    // "S" for speed
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('S', p.x + p.width / 2, p.y + 12);
  });
}

// ============================================================
// START
// ============================================================
requestAnimationFrame(gameLoop);