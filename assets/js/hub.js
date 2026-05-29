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
  // Week 1 — Coming May 30
  {
    id: 'cosmic-cargo',
    week: 1,
    title: 'Cosmic Cargo',
    desc: 'A gravity-switching puzzle game. Pilot your cargo ship through asteroid fields — flip gravity to survive!',
    tags: ['puzzle', 'physics', 'pixel-art'],
    date: '2026-05-30',
    path: 'games/2026-05-30-cosmic-cargo/',
    released: false
  }
];

// Stats counter
let publishedCount = GAMES.filter(g => g.released).length;

function updateStats() {
  document.getElementById('games-count').textContent = publishedCount;
  document.getElementById('week-count').textContent = publishedCount;
}

// Generate archive cards
function renderArchive() {
  const grid = document.getElementById('game-grid');
  grid.innerHTML = '';

  // Show released games first, then upcoming
  const sorted = [...GAMES].sort((a, b) => {
    if (a.released && !b.released) return -1;
    if (!a.released && b.released) return 1;
    return b.week - a.week;
  });

  sorted.forEach((game) => {
    const card = document.createElement('div');
    card.className = `game-card ${game.released ? '' : 'empty'}`;

    card.innerHTML = game.released ? `
      <a href="${game.path}" style="text-decoration:none;color:inherit;">
        <div class="card-preview" style="background: linear-gradient(135deg, #0600EF, #1a1a2e);">
          <span style="font-size:2rem;">🏎️</span>
        </div>
      </a>
      <div class="card-info">
        <h4><a href="${game.path}" style="color:inherit;text-decoration:none;">${game.title}</a></h4>
        <p>Week ${game.week} — ${game.date}</p>
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
        <p>Coming ${game.date} — Week ${game.week}</p>
      </div>
    `;

    grid.appendChild(card);
  });
}

// Update featured game section (shows the latest released game, or upcoming)
function updateFeatured() {
  // Show the most recently released game as featured
  const latestReleased = GAMES.filter(g => g.released).sort((a, b) => b.week - a.week)[0];
  const upcoming = GAMES.find(g => !g.released);

  // Featured shows the latest released; if none released, show upcoming
  const featuredGame = latestReleased || upcoming;

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

    document.querySelector('.week-badge').textContent = featuredGame.released
      ? `Week ${featuredGame.week} — Latest Release`
      : `Week ${featuredGame.week} — Coming Soon`;
  }
}

// Page load
document.addEventListener('DOMContentLoaded', () => {
  updateStats();
  renderArchive();
  updateFeatured();
});