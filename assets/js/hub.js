// Weekly Game Factory — Hub JS

// Game database — append here each week
const GAMES = [
  // Week 0 — Pre-season Launch (May 23)
  {
    id: 'f1-space-invaders',
    week: 0,
    title: 'F1 Space Invaders',
    desc: 'Red Bull Racing themed Space Invaders! Blast enemy F1 cars, collect power-ups, and build your combo multiplier across endless levels.',
    tags: ['shooter', 'arcade', 'retro'],
    date: '2026-05-23',
    path: 'games/2026-05-23-f1-space-invaders/',
    released: true
  },
  // Week 1 — May 29
  {
    id: 'cosmic-cargo',
    week: 1,
    title: 'Cosmic Cargo',
    desc: 'A gravity-switching puzzle game. Pilot your cargo ship through asteroid fields — flip gravity to survive!',
    tags: ['puzzle', 'physics', 'gravity'],
    date: '2026-05-29',
    path: 'games/2026-05-30-cosmic-cargo/',
    released: true
  },
  // 🎁 Bonus Game — Contra (May 29)
  {
    id: 'contra-bonus',
    week: 'BONUS',
    title: '⚔ Contra',
    desc: 'Classic run-and-gun action! Blast enemies, dodge bullets, collect power-ups, and defeat the alien boss. Optimized for iPhone with touch controls.',
    tags: ['run-and-gun', 'action', 'mobile'],
    date: '2026-05-29',
    path: 'games/2026-05-29-contra-bonus/',
    released: true
  }
];

// Helpers
function isBonus(game) { return game.week === 'BONUS'; }
function sortOrder(game) { return isBonus(game) ? 999 : game.week; }
function weekLabel(game) { return isBonus(game) ? '🎁 Bonus' : `Week ${game.week}`; }

// Stats counter
let publishedCount = GAMES.filter(g => g.released && !isBonus(g)).length;
let bonusCount = GAMES.filter(g => g.released && isBonus(g)).length;

function updateStats() {
  document.getElementById('games-count').textContent = publishedCount;
  document.getElementById('week-count').textContent = publishedCount;
  const bonusEl = document.getElementById('bonus-count');
  if (bonusEl) bonusEl.textContent = bonusCount;
}

// Generate archive cards
function renderArchive() {
  const grid = document.getElementById('game-grid');
  grid.innerHTML = '';

  // Show released games first, then upcoming; sorted by week then bonus
  const sorted = [...GAMES].sort((a, b) => {
    if (a.released && !b.released) return -1;
    if (!a.released && b.released) return 1;
    return sortOrder(a) - sortOrder(b);
  });

  sorted.forEach((game) => {
    const card = document.createElement('div');
    card.className = `game-card ${game.released ? '' : 'empty'}`;

    const bgGradient = game.id === 'contra-bonus'
      ? 'linear-gradient(135deg, #441111, #1a1a2e)'
      : game.id === 'cosmic-cargo'
      ? 'linear-gradient(135deg, #0600EF, #1a1a2e)'
      : 'linear-gradient(135deg, #0600EF, #1a1a2e)';
    const icon = game.id === 'contra-bonus' ? '⚔️' : game.id === 'f1-space-invaders' ? '🏎️' : '🚀';

    card.innerHTML = game.released ? `
      <a href="${game.path}" style="text-decoration:none;color:inherit;">
        <div class="card-preview" style="background: ${bgGradient};">
          <span style="font-size:2rem;">${icon}</span>
        </div>
      </a>
      <div class="card-info">
        <h4><a href="${game.path}" style="color:inherit;text-decoration:none;">${game.title}</a></h4>
        <p>${weekLabel(game)} — ${game.date}</p>
        <div class="game-meta" style="margin-top:0.5rem;">
          ${game.tags.map(t => `<span class="tag">${t}</span>`).join('')}
        </div>
      </div>
    ` : `
      <div class="card-preview">
        <span class="empty-slot">?</span>
      </div>
      <div class="card-info">
        <h4>${game.title}</h4>
        <p>Coming ${game.date} — ${weekLabel(game)}</p>
      </div>
    `;

    grid.appendChild(card);
  });
}

// Update featured game section (shows the latest released game, or upcoming)
function updateFeatured() {
  // Show the most recently released weekly game as featured
  const weeklyGames = GAMES.filter(g => g.released && !isBonus(g));
  const latestReleased = weeklyGames.sort((a, b) => b.week - a.week)[0];
  const upcoming = GAMES.find(g => !g.released);
  const bonusGame = GAMES.find(g => g.released && isBonus(g));

  // Featured shows the latest weekly release; if none, show bonus or upcoming
  let featuredGame = latestReleased || bonusGame || upcoming;
  let isBonusFeatured = isBonus(featuredGame);

  if (featuredGame) {
    document.getElementById('game-title').textContent = featuredGame.title;
    document.getElementById('game-desc').textContent = featuredGame.desc;

    const tagsContainer = document.querySelector('.featured-info .game-meta');
    tagsContainer.innerHTML = featuredGame.tags.map(t => `<span class="tag">${t}</span>`).join('');

    const btn = document.querySelector('.play-btn');
    if (featuredGame.released) {
      btn.textContent = '▶ Play Now';
      btn.className = 'play-btn';
      btn.disabled = false;
      btn.onclick = () => window.location.href = featuredGame.path;
    } else {
      btn.textContent = `Coming ${featuredGame.date}`;
      btn.className = 'play-btn disabled';
      btn.disabled = true;
    }

    const badge = document.querySelector('.week-badge');
    if (isBonusFeatured) {
      badge.textContent = '🎁 Bonus Game — Just Released!';
    } else if (featuredGame.released) {
      badge.textContent = `${weekLabel(featuredGame)} — Latest Release`;
    } else {
      badge.textContent = `${weekLabel(featuredGame)} — Coming Soon`;
    }
  }
}

// Page load
document.addEventListener('DOMContentLoaded', () => {
  updateStats();
  renderArchive();
  updateFeatured();
});
