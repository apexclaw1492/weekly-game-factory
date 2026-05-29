# 🎮 Weekly Game Factory — Master Plan

> **For Hermes:** Execute this plan using subagent-driven-development. Each major phase is a task block.
>
> **Goal:** A publicly-accessible website that publishes a new, unique HTML5 game every Friday, with monthly improvement updates to prior games.
>
> **Start Date:** Friday, May 30, 2026 (this Friday)

---

## 🏗️ Architecture

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Hosting** | GitHub Pages (free) | Static site serving |
| **Domain** | `yourgamestudio.com` or GitHub Pages URL | Public access |
| **Game Engine** | HTML5 Canvas + JavaScript (p5.js) | 2D games, visuals |
| **Site Framework** | Pure HTML/CSS/JS (no build step) | Fast, no deps |
| **Art Pipeline** | p5.js + pixel-art skill | Sprites, assets |
| **Coding Agents** | OpenCode / Claude Code | Autonomous game impl |
| **CI/CD** | GitHub Actions | Auto-deploy on push |
| **Scheduler** | Hermes cronjob | Weekly triggers |
| **Notifications** | Twilio SMS + iMessage | Launch alerts |

### Project Structure

```
weekly-game-factory/
├── index.html                # Main hub — game gallery, weekly featured game
├── games/
│   ├── 2026-05-30-game-01/   # Week 1 game (folders by date)
│   │   ├── index.html        # Playable game
│   │   ├── game.js           # Game logic
│   │   ├── style.css         # Game-specific styles
│   │   └── assets/           # Sprites, sounds
│   ├── 2026-06-05-game-02/   # Week 2 game
│   └── ...
├── assets/
│   ├── css/
│   │   ├── main.css          # Site-wide styles
│   │   └── hub.css           # Gallery layout
│   ├── js/
│   │   └── hub.js            # Gallery interactions
│   └── images/
│       └── logo.png          # Site branding
├── .github/
│   └── workflows/
│       └── deploy.yml        # GitHub Actions → Pages
├── .hermes/
│   └── plans/                # All plans stored here
└── README.md
```

---

## 📋 Phase 1: Foundation (THIS WEEK — Before Friday)

### Task 1: Create GitHub Repository

**Objective:** Set up the project repo with GitHub Pages enabled.

**Steps:**
1. Create repo at `github.com/NousResearch/weekly-game-factory` (or under David's org)
2. Initialize with README, MIT license
3. Enable GitHub Pages from `main` branch root
4. Add site description, topics (`games`, `html5`, `weekly`, `indie`)

**Verification:** `https://nousresearch.github.io/weekly-game-factory/` returns 200

---

### Task 2: Build the Hub Website

**Objective:** Create a game gallery landing page that:
- Shows the "Game of the Week" as a hero card
- Lists all past games in a grid
- Has a clean, modern design
- Is fully responsive

**Files to create:**
- `index.html` — Main hub page
- `assets/css/main.css` — Core styles
- `assets/css/hub.css` — Gallery layout
- `assets/js/hub.js` — Gallery interactivity

**Design specs:**
- Dark theme (gaming aesthetic)
- Hero section: game title, thumbnail, play button, week label
- Grid gallery: thumbnail cards with title, date, star rating
- Footer with "Game #N — Published Weekly" badge

**Tools used:** p5js skill for visual inspiration, HTML/CSS directly

---

### Task 3: Create Game Template

**Objective:** A reusable HTML5 game template that all weekly games follow.

**Files:**
- `templates/game-template/index.html` — Boilerplate game page
- `templates/game-template/game.js` — Skeleton game with Canvas render loop
- `templates/game-template/style.css` — Base game styles

**Template features:**
- Canvas-based render loop
- Keyboard/mouse input handling
- Frame-rate independent physics
- Start screen, gameplay, game-over states
- Score tracking
- Mobile touch support
- Seed-based randomness for reproducibility

**Uses:** p5js skill references for render loop patterns

---

### Task 4: Set Up CI/CD Pipeline

**Objective:** Auto-deploy to GitHub Pages on push to main.

**File:** `.github/workflows/deploy.yml`

```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: '.'
      - uses: actions/deploy-pages@v4
```

**Verification:** Push → Actions runs → site updates in 2-3 minutes

---

## 📋 Phase 2: Weekly Game Pipeline (Every Week)

Each week follows a 6-day cycle:

```
Monday   →  Generate Ideas  (AI-powered concept generation)
Tuesday  →  Design + Prototype  (mechanics, assets, wireframe)
Wednesday →  Build Game  (OpenCode implementation)
Thursday →  Polish + Test  (debugging, code review, balance)
Friday   →  PUBLISH!  (deploy + notify)
```

### Week Template: Idea Generation (Monday)

**Process (uses Hermes AI + skills):**

```
1. Seed generation:
   - Random theme generator (pulls from 100+ theme pool)
   - Genre roulette (platformer, puzzle, shooter, strategy, etc.)
   - Art style picker (pixel art, vector, ASCII, minimalist, neon)

2. Cross-pollinate ideas:
   - Take 2+ random concepts and merge them
   - E.g., "Tetris" × "Racing" = "Fall-block racing game"
   - E.g., "Snake" × "RPG" = "Snake with power-ups and levels"

3. Evaluate feasibility:
   - Can this be built in 2-3 days?
   - Is it fun?
   - Is it unique enough?
   - Score 1-10 on each dimension

4. Select winner:
   - Highest composite score
   - User can override
```

**Skills used:** Hermes AI creativity, web_search (game design research)

---

### Week Template: Design + Prototype (Tuesday)

**Process:**
1. Load **excalidraw** skill — draw game wireframes and UI layout
2. Load **p5js** skill — design visual style, color palette, particle effects
3. Load **pixel-art** skill — create game sprites (if retro style)
4. Document game design in `games/YYYY-MM-DD-game-XX/DESIGN.md`
5. Create visual mockup

**Output:** DESIGN.md with:
- Game concept (2-3 sentences)
- Controls
- Scoring
- Art style
- Key mechanics
- What makes it unique

**Skills used:** excalidraw, p5js, pixel-art, ascii-art

---

### Week Template: Build Game (Wednesday-Thursday)

**Process (uses OpenCode + subagent-driven-development):**

```
1. Delegate to OpenCode:
   opencode run "Implement game: [GAME_NAME]
     - Template: templates/game-template/
     - Output dir: games/2026-05-30-game-01/
     - Mechanics: [from DESIGN.md]
     - Controls: [from DESIGN.md]
     - Art style: [from DESIGN.md]
     - Include: start screen, gameplay, game-over, score"

2. If OpenCode needs iteration:
   - Start interactive session (background, pty=true)
   - Send prompts, review output, refine

3. Manual polish by Hermes:
   - Add visual effects (particles, transitions)
   - Tune game balance
   - Add sound effects (Web Audio API)
```

**Skills used:** opencode, claude-code, p5js, subagent-driven-development

---

### Week Template: Polish + Test (Thursday)

**Process:**
1. Load **systematic-debugging** skill — playtest and fix bugs
2. Load **requesting-code-review** skill — code quality check
3. Test on desktop browser (Chrome, Safari, Firefox)
4. Test on mobile (touch controls)
5. Add to hub page (`index.html`) with thumbnail
6. Final deploy check

**Checklist:**
- [ ] Game loads without errors
- [ ] Controls work as documented
- [ ] Score tracking works
- [ ] Game-over state works properly
- [ ] Mobile touch support functional
- [ ] No console errors
- [ ] Hub page shows correct thumbnail + description

**Skills used:** systematic-debugging, requesting-code-review, browser tools

---

### Week Template: Publish! (Friday)

**Process:**
1. `git add . && git commit -m "feat: Week N - [Game Name]"`
2. `git push origin main`
3. Wait for GitHub Actions deploy (2-3 min)
4. Verify live site: `curl https://weekly-game-factory.com/games/YYYY-MM-DD-game-XX/`
5. Send notifications via **send_message** and **Twilio SMS**

**Notification script:**

```python
# Send to David via SMS + Telegram + iMessage
send_message(target="sms:+18322339223",
    message="🎮 NEW GAME PUBLISHED: [Game Name]!\nPlay it at: https://...")
send_message(target="telegram",
    message="🎮 Week N is LIVE!\n\n[Game Name]\n\nPlay now: https://...\n\nControls: [arrows/click/keys]")
```

**Skills used:** github-repo-management, send_message, twilio-sms-voice

---

## 📋 Phase 3: Monthly Improvement Sprint (Last Week of Month)

### Process:
1. **Review all games from previous month** (4-5 games)
2. For each game, identify:
   - Top 3 bugs or polish issues
   - Top 3 feature improvements
   - Visual/audio upgrades
3. **Prioritize** by impact × effort
4. **Implement** using OpenCode
5. **Deploy** improvements

### Improvement Ideas (by type):

| Type | Examples |
|------|----------|
| **Gameplay** | Add levels, power-ups, difficulty curve, leaderboards |
| **Visual** | Particle effects, screen shake, transitions, parallax |
| **Audio** | Background music, SFX, voice overs via TTS |
| **UX** | Tutorial screens, pause menu, settings, high scores |
| **Tech** | Performance optimization, mobile polish, save state |

### Skills used:
- opencode (implementation)
- p5js (visual upgrades)
- pixel-art (improved sprites)
- systematic-debugging (bug fixing)

---

## 🧠 Skills Usage Summary

| Skill | Phase | How It's Used |
|-------|-------|--------------|
| **p5js** | Weekly | Game rendering, particles, effects, visuals |
| **pixel-art** | Weekly | Retro game sprites, animations, palette selection |
| **ascii-art** | Weekly | ASCII-style games, title banners |
| **opencode** | Weekly | Autonomous game code implementation |
| **claude-code** | Weekly (alt) | Alternative coding agent for heavy games |
| **github-repo-management** | Phase 1, Weekly | Repo setup, push, releases |
| **github-pr-workflow** | Monthly | Improvement branches, PRs |
| **static-site-deploy** | Phase 1 | Initial deploy config |
| **subagent-driven-development** | Weekly | Parallel game dev tasks |
| **writing-plans** | Weekly | Game-specific implementation plans |
| **systematic-debugging** | Weekly | Bug finding and fixing |
| **requesting-code-review** | Weekly | Pre-publish quality check |
| **excalidraw** | Weekly | Game design wireframes |
| **architecture-diagram** | Phase 1 | System documentation |
| **cronjob** | Weekly | Schedule: idea gen, build triggers |
| **weather** | Weekly (themed) | Weather-themed game ideas |
| **maps** | Weekly (themed) | Location-based game concepts |
| **spotify** | Weekly (themed) | Music/rhythm game ideas |
| **gif-search** | Weekly (assets) | Finding game art inspiration |
| **imessage** | Friday | Notify David of new games |
| **twilio-sms-voice** | Friday | SMS notification of launch |
| **multi-channel-notifications** | Friday | Send alerts everywhere |
| **youtube-content** | Weekly (ideas) | Game design inspiration from videos |
| **design-md** | Weekly | Game design system consistency |

---

## ⚙️ Automation: Cron Jobs

These cron jobs make the pipeline semi-autonomous:

### Job 1: Friday Launch Reminder
```yaml
Schedule: "0 8 * * 5"  # 8 AM every Friday
Action: Send David reminder to review and push game
```

### Job 2: Monday Idea Generator (Future Enhancement)
```yaml
Schedule: "0 9 * * 1"  # 9 AM Monday
Action: Generate 3 game ideas and deliver to Telegram
```

### Job 3: Monthly Improvement Sprint Trigger
```yaml
Schedule: "0 9 1 * *"  # 1st of every month
Action: "Review last month's games. Prioritize improvements."
```

---

## 📊 Game Idea Pipeline (100+ Concepts)

Pre-generated idea pool to draw from each week:

### Genre Seeds
- Platformer, Puzzle, Shooter, Racing, Rhythm, Strategy, Card, Board, Trivia, Word, Clicker, Idle, Escape, Maze, Tower Defense, Roguelike, Bullet Hell, Stealth, Sports, Fighting

### Theme Seeds
- Space, Ocean, Jungle, Desert, Arctic, Cyberpunk, Medieval, Western, Steampunk, Retro-80s, Norse, Egyptian, Japanese, Fantasy, Zombie, Alien, Dinosaur, Superhero, Detective, Cooking

### Mechanic Seeds
- Physics-based, Time-manipulation, Gravity-switching, Portal-teleport, Shape-shifting, Clone-creation, Size-changing, Invisibility, Telekinesis, Mind-control

### Art Style Seeds
- NES pixel-art, Gameboy monochrome, PICO-8 fantasy, ASCII terminal, Neon cyberpunk, Hand-drawn sketch, Minimalist geometric, Watercolor, Vaporwave, MS Paint retro

### Mashup Generator
Takes 1 from each category → unique game concept:
- "Physics-based Racing with Dinosaurs in Cyberpunk ASCII" 🏆
- "Time-manipulation Stealth in Ancient Egypt with NES pixel-art" 🏆
- "Gravity-switching Puzzle in an Ocean Fantasy with watercolor art" 🏆

---

## 🚀 Additional Tools & Skills Needed

### Need to Set Up (Before Friday)

| Item | Priority | Setup |
|------|----------|-------|
| **GitHub authentication** | 🔴 HIGH | `gh auth login` or set `GITHUB_TOKEN` in `.env` |
| **GitHub Pages domain** | 🔴 HIGH | After repo creation |
| **OpenCode auth** | 🟡 MEDIUM | `opencode auth login` |
| **Image gen auth** | 🟡 MEDIUM | `hermes auth codex` or set FAL key |
| **TENOR_API_KEY** | 🟢 LOW | For GIF search (game inspo) |

### Skills Already Available (No Setup)

✅ **p5js** — Full production pipeline with references
✅ **pixel-art** — Sprites, animations, retro presets
✅ **ascii-art** — 571 fonts, cowsay, boxes, image-to-ASCII
✅ **opencode** — CLI coding agent
✅ **github-repo-management** — Repo creation, push, deploy
✅ **static-site-deploy** — GitHub Pages, Netlify, Vercel
✅ **subagent-driven-development** — Parallel task execution
✅ **systematic-debugging** — Root cause analysis
✅ **requesting-code-review** — Pre-commit quality gates
✅ **excalidraw** — Hand-drawn design diagrams
✅ **architecture-diagram** — SVG system diagrams
✅ **twilio-sms-voice** — SMS notifications
✅ **imessage** — iMessage notifications (needs permission)

---

## ✅ Verification Checklist

### Before First Launch (Friday May 30)

- [ ] GitHub repo created with Pages enabled
- [ ] Hub website live at public URL
- [ ] Game template created
- [ ] CI/CD pipeline working (push → auto-deploy)
- [ ] OpenCode can generate games
- [ ] SMS notifications working
- [ ] Test game published successfully

### Weekly Verification

- [ ] Monday: 3+ game ideas generated
- [ ] Tuesday: Game design documented
- [ ] Wednesday-Thursday: Game implemented + tested
- [ ] Thursday: Code review passed, all bugs fixed
- [ ] Friday: Published, notified, verified live

### Monthly Verification

- [ ] All previous month's games reviewed
- [ ] Top 3 improvements per game identified
- [ ] Improvements implemented and tested
- [ ] Updated games deployed
- [ ] User notified of updates

---

## 🎯 First Week Target: Friday May 30, 2026

**Theme:** Something appropriate for Game #1 — a classic that shows off what the engine can do.

**Suggested:** A physics-based puzzle game with pixel art, because it demonstrates:
- Canvas rendering (p5js)
- Physics engine
- Pixel art assets (pixel-art skill)
- Multiple game states
- Score tracking
- Mobile touch support

**Recommended Game #1:** "Cosmic Cargo" — A gravity-switching puzzle game where you pilot a cargo ship through asteroid fields, switching gravity to navigate. NES pixel-art style.

---

*"The game factory that grows with you." — Hermes Agent*