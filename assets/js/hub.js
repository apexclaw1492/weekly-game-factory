// Weekly Game Factory — Hub JS

// Game database — append here each week
const GAMES = [
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

  GAMES.forEach((game, i) => {
    const card = document.createElement('div');
    card.className = `game-card ${game.released ? '' : 'empty'}`;

    card.innerHTML = game.released ? `
      <a href="${game.path}" class="card-preview-link">
        <div class="card-preview" style="background: linear-gradient(135deg, #1a1a2e, #16213e);">
          <span style="font-size:2rem;">🎮</span>
        </div>
      </a>
      <div class="card-info">
        <h4>${game.title}</h4>
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
        <h4>Coming Soon</h4>
        <p>Game #${game.week} — ${game.date}</p>
      </div>
    `;

    grid.appendChild(card);
  });

  // Add a "coming soon" placeholder for the next week
  const nextWeek = GAMES.length + 1;
  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + (7 - nextDate.getDay() + 5) % 7 + 1);

  if (GAMES.filter(g => g.released).length < GAMES.length) {
    const placeholder = document.createElement('div');
    placeholder.className = 'game-card empty';
    placeholder.innerHTML = `
      <div class="card-preview">
        <span class="empty-slot">?</span>
      </div>
      <div class="card-info">
        <h4>Coming Soon</h4>
        <p>Game #${nextWeek}</p>
      </div>
    `;
    grid.appendChild(placeholder);
  }
}

// Update featured game section
function updateFeatured() {
  const current = GAMES.find(g => !g.released) || GAMES[GAMES.length - 1];
  const featured = document.getElementById('game-of-week');

  if (current) {
    document.getElementById('game-title').textContent = current.title;
    document.getElementById('game-desc').textContent = current.desc;

    const tagsContainer = document.querySelector('.featured-info .game-meta');
    tagsContainer.innerHTML = current.tags.map(t => `<span class="tag">${t}</span>`).join('');

    const btn = document.querySelector('.play-btn');
    if (current.released) {
      btn.textContent = '▶ Play Now';
      btn.className = 'play-btn';
      btn.disabled = false;
      btn.onclick = () => window.location.href = current.path;
    } else {
      btn.textContent = `Coming ${current.date}`;
      btn.className = 'play-btn disabled';
      btn.disabled = true;
    }

    document.querySelector('.week-badge').textContent = `Week ${current.week}`;
  }
}

// Page load
document.addEventListener('DOMContentLoaded', () => {
  updateStats();
  renderArchive();
  updateFeatured();
});
