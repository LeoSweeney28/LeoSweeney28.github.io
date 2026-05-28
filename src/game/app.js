import { settings } from '../core/config.js';
import { rand } from '../core/utils.js';
import {
  randomEnemySize,
  chooseEnemyShape,
  chooseObstacleShape,
  chooseObstacleMotion,
  chooseObstacleColor,
  randomObstacleTone,
  applyEnemyPhase,
  bossColor,
  enemyDebugText
} from '../systems/rules.js';
import {
  createBoss,
  createSpawnEnemy,
  createDebugEnemy,
  createObstacleTelegraph,
  createTelegraphEnemy
} from './factories.js';
import {
  createDebugPanel,
  updateDebugPanel as syncDebugPanel,
  setDebugChromeVisible,
  showRoundBanner as emitRoundBanner,
  drawDebugEnemyHitbox as renderEnemyHitbox,
  drawDebugObstacleHitbox as renderObstacleHitbox
} from './ui.js';
import { createTutorialShowcase } from './tutorial.js';
import { wireGameInput } from './input.js';
import { createGameState } from './state.js';
import { createUpdateGame } from './update.js';
import { createRenderGame } from './render.js';
import { spawnInitial, spawnTarget, speedTargetMultiplier, waveDifficulty } from '../systems/scaling.js';

const canvas = document.getElementById('game');
const ctx = (canvas && canvas.getContext) ? canvas.getContext('2d') : null;
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const multEl = document.getElementById('mult');
const timeEl = document.getElementById('time');
const bossTimerEl = document.getElementById('boss-timer');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart');
const returnToMenuBtn = document.getElementById('returnToMenu');
const startScreen = document.getElementById('start');
const startBtn = document.getElementById('startBtn');
// Only wire real difficulty controls; other .diff-btn elements (cursor/settings buttons)
// must not trigger difficulty-change handlers.
const diffBtns = Array.from(document.querySelectorAll('.diff-btn[data-diff]'));
const tipEl = document.getElementById('tip');
// static HUD tip (moved from start overlay)
if (tipEl) { tipEl.textContent = 'Tip: static obstacles stay longer but are easier to avoid.'; }

const state = createGameState({ settings, bestScore: Number(localStorage.getItem('md_best') || 0) });
let width = state.width, height = state.height;
function resize() {
  width = window.innerWidth;
  height = window.innerHeight;
  state.width = width;
  state.height = height;
  state.player.x = width / 2;
  state.player.y = height / 2;
  state.player.prevX = width / 2;
  state.player.prevY = height / 2;
  state.drawPlayerX = state.player.x;
  state.drawPlayerY = state.player.y;
  state.mouse.x = state.player.x;
  state.mouse.y = state.player.y;
  canvas.width = width * devicePixelRatio;
  canvas.height = height * devicePixelRatio;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
}
window.addEventListener('resize', resize);
resize();

const player = state.player;
const mouse = state.mouse;
let best = state.best;
if (bestEl) { bestEl.textContent = 'Best: ' + best; }
let difficulty = state.difficulty;
const bossDuration = 10;
const BOSS_PENDING_TIMEOUT = { easy: 6.5, normal: 8.0, hard: 9.5 };

const debugPanel = createDebugPanel(document);
if (debugPanel) {
  debugPanel.addEventListener('click', (event) => {
    const target = event.target && event.target.closest ? event.target.closest('[data-debug-spawn-type], [data-debug-action]') : null;
    if (!target || !debugPanel.contains(target)) { return; }
    const spawnType = target.dataset.debugSpawnType;
    if (spawnType) {
      spawnDebugEnemy(spawnType, event.shiftKey ? 5 : 1);
      return;
    }
    const debugAction = target.dataset.debugAction;
    if (debugAction === 'menu') {
      returnToMainMenu();
      return;
    }
    if (debugAction === 'clear') {
      state.enemies.length = 0;
      state.bullets.length = 0;
      state.telegraphs.length = 0;
      state.obstacles.length = 0;
      state.obstacleTelegraphs.length = 0;
      return;
    }
    if (debugAction === 'sandbox') {
      setDebugSandboxMode(!state.debugSandboxMode);
      return;
    }
    if (debugAction === 'invulnerable') {
      state.debugInvulnerable = !state.debugInvulnerable;
      updateDebugPanel();
      return;
    }
    if (debugAction === 'pathlines') {
      state.debugPathLines = !state.debugPathLines;
      updateDebugPanel();
      return;
    }
  });
}
const tutorial = createTutorialShowcase({
  document,
  onStartGame: () => startGame(),
  onOpenDebugSandbox: () => startDebugSandbox()
});

// Cursor chooser elements (start screen)
const cursorCircleBtn = document.getElementById('cursorCircle');
const cursorSquareBtn = document.getElementById('cursorSquare');
const cursorSmallerChk = document.getElementById('cursorSmaller');

function updateCursorUI(){
  if(cursorCircleBtn) {cursorCircleBtn.classList.toggle('selected', state.cursorShape === 'circle');}
  if(cursorSquareBtn) {cursorSquareBtn.classList.toggle('selected', state.cursorShape === 'square');}
  if(cursorSmallerChk) {cursorSmallerChk.checked = (state.cursorScale < 1);}
}
if(cursorCircleBtn){ cursorCircleBtn.addEventListener('click', ()=>{ state.cursorShape = 'circle'; updateCursorUI(); }); }
if(cursorSquareBtn){ cursorSquareBtn.addEventListener('click', ()=>{ state.cursorShape = 'square'; updateCursorUI(); }); }
if(cursorSmallerChk){ cursorSmallerChk.addEventListener('change', ()=>{ state.cursorScale = cursorSmallerChk.checked ? 0.9 : 1.0; updateCursorUI(); }); }
updateCursorUI();

// Boss spawn flash element (created lazily)
function ensureBossFlash() {
  let el = document.getElementById('boss-spawn-flash');
  if (el) { return el; }
  el = document.createElement('div');
  el.id = 'boss-spawn-flash';
  el.className = 'boss-spawn-hidden';
  document.body.appendChild(el);
  return el;
}

// shared gameplay tables live in `src/systems/rules.js`

function beginStageEnd() {
  const profile = waveDifficulty(state.stage, settings.maxStage, state.difficulty);
  state.bossPending = true;
  state.bossPendingTimer = profile.bossWarningTime || (BOSS_PENDING_TIMEOUT[state.difficulty] || BOSS_PENDING_TIMEOUT.normal);
  state.lastSpawn = 0;
  state.lastObstacleSpawn = 0;
  state.telegraphs.length = 0;
  state.obstacleTelegraphs.length = 0;
  // clear active threats so the boss has a clean arena to spawn into
  state.enemies.length = 0;
  state.bullets.length = 0;
  state.obstacles.length = 0;
  // choose a spawn telegraph location for the pending boss so players can see where it will appear
  const margin = 120;
  const bx = Math.max(margin, Math.min(state.width - margin, Math.floor(rand(margin, state.width - margin))));
  const by = Math.max(margin, Math.min(state.height - margin, Math.floor(rand(margin, state.height - margin))));
  const br = Math.max(120, Math.min(360, Math.round(Math.min(state.width, state.height) * 0.18)));
  state.bossSpawnTele = { x: bx, y: by, r: br, dur: state.bossPendingTimer, durTotal: state.bossPendingTimer };
}

function startBossFight(force = false) {
  // If there are active enemies and we are not forcing, enter a pending state
  if (!force && state.enemies && state.enemies.length > 0) {
    state.bossPending = true;
    state.bossPendingTimer = BOSS_PENDING_TIMEOUT[state.difficulty] || BOSS_PENDING_TIMEOUT.normal;
    return;
  }
  state.bossActive = true;
  state.bossPending = false;
  state.bossPendingTimer = 0;
  // if a bossSpawnTele was set, use its coordinates as the spawn point
  const spawnX = state.bossSpawnTele && state.bossSpawnTele.x;
  const spawnY = state.bossSpawnTele && state.bossSpawnTele.y;
  state.telegraphs.length = 0;
  state.obstacleTelegraphs.length = 0;
  state.lastSpawn = 0;
  state.lastObstacleSpawn = 0;
  state.bossTimer = bossDuration;
  const bossWidth = Math.max(240, state.width || 800);
  const bossHeight = Math.max(240, state.height || 600);
  state.boss = createBoss({ stage: state.stage, width: bossWidth, height: bossHeight, speedMultiplier: state.speedMultiplier, rand, bossColor, spawnX, spawnY });
  state.boss.duration = bossDuration;
  state.bossSpawnTele = null;
  emitRoundBanner(document, 'Boss Stage');
}

function endBossFight() {
  state.bossActive = false;
  state.boss = null;
  state.bossTimer = 0;
  advanceStage();
}

function updateDebugPanel() {
  syncDebugPanel({
    panel: debugPanel,
    debugMode: state.debugMode,
    settings,
    stage: state.stage,
    enemies: state.enemies,
    obstacles: state.obstacles,
    obstacleTelegraphs: state.obstacleTelegraphs,
    spawnInterval: state.spawnInterval,
    debugSandboxMode: state.debugSandboxMode,
    debugInvulnerable: state.debugInvulnerable,
    debugPathLines: state.debugPathLines,
    fps: state.fps,
    speedMultiplier: state.speedMultiplier,
    player,
    paused: state.paused
  });
  setDebugChromeVisible(document, state.debugMode);
}

// debug hitbox wrappers were removed; direct functions from UI are used by renderer
function showRoundBanner(text) { emitRoundBanner(document, text); }

function spawnEnemy(reason = 'spawn') {
  // enforce hard cap on enemies
  if (state.enemies.length >= (settings.enemyMax || 80)) { return; }
  const _e = createSpawnEnemy({
    reason,
    stage: state.stage,
    difficulty: state.difficulty,
    elapsed: state.elapsed,
    speedMultiplier: state.speedMultiplier,
    width: state.width,
    height: state.height,
    mouse: state.mouse,
    rand,
    randomEnemySize,
    chooseEnemyShape
  });
  if (_e && typeof _e === 'object') { state.enemies.push(_e); }
}

function spawnDebugEnemy(type = 'straight', count = 1) {
  for (let n = 0; n < count; n++) {
    if (state.enemies.length >= (settings.enemyMax || 80)) { return; }
    const _d = createDebugEnemy({
      type,
      stage: state.stage,
      elapsed: state.elapsed,
      speedMultiplier: state.speedMultiplier,
      width: state.width,
      height: state.height,
      mouse: state.mouse,
      player: state.player,
      rand,
      randomEnemySize,
      chooseEnemyShape
    });
    if (_d && typeof _d === 'object') { state.enemies.push(_d); }
  }
}

function setDebugSandboxMode(v) {
  state.debugSandboxMode = v;
  if (v) {
    state.debugMode = true;
  }
  if (state.debugSandboxMode) {
    state.enemies.length = 0;
    state.telegraphs.length = 0;
    state.obstacles.length = 0;
    state.obstacleTelegraphs.length = 0;
    state.bullets.length = 0;
    state.particles.length = 0;
    state.lastSpawn = 0;
    state.lastObstacleSpawn = 0;
    state.bossPending = false;
    state.bossActive = false;
    state.boss = null;
    state.bossTimer = 0;
    state.bossPendingTimer = 0;
    state.bossSpawnTele = null;
  }
  updateDebugPanel();
  try {
    if (window.__TEST_HOOK__) {
      window.__TEST_HOOK__.bossActive = !!state.bossActive;
      window.__TEST_HOOK__.bossPending = !!state.bossPending;
      window.__TEST_HOOK__.enemies = Array.isArray(state.enemies) ? state.enemies.length : 0;
      window.__TEST_HOOK__.telegraphs = Array.isArray(state.telegraphs) ? state.telegraphs.length : 0;
      window.__TEST_HOOK__.obstacleTelegraphs = Array.isArray(state.obstacleTelegraphs) ? state.obstacleTelegraphs.length : 0;
      window.__TEST_HOOK__.stage = state.stage;
      window.__TEST_HOOK__.elapsed = state.elapsed;
      window.__TEST_HOOK__.spawnInterval = state.spawnInterval;
    }
  } catch (e) { void e; }
}

function resetRunState() {
  state.enemies.length = 0;
  state.bullets.length = 0;
  state.particles.length = 0;
  state.telegraphs.length = 0;
  state.obstacles.length = 0;
  state.obstacleTelegraphs.length = 0;
  state.lastObstacleSpawn = 0;
  state.lastSpawn = 0;
  state.spawnInterval = spawnInitial(settings.spawnBase || 1200);
  state.lastTime = 0;
  state.score = 0;
  state.survivedCount = 0;
  state.elapsed = 0;
  state.stage = 1;
  state.nextStageTime = settings.stageDuration;
  state.speedMultiplier = 1;
  state.boss = null;
  state.bossActive = false;
  state.bossPending = false;
  state.bossPendingTimer = 0;
  state.bossTimer = 0;
  state.bossSpawnTele = null;
  state.stageEase = null;
  state.debugInvulnerable = false;
  state.debugPathLines = false;
  state.paused = false;
  state.running = false;
  if (scoreEl) { scoreEl.textContent = 'Score: 0'; }
  if (multEl) { multEl.textContent = 'Multiplier: x1'; }
  if (timeEl) { timeEl.textContent = 'Time: 0.0s'; }
  if (bossTimerEl) { bossTimerEl.classList.add('hidden'); bossTimerEl.classList.remove('boss-pending'); bossTimerEl.textContent = 'Boss: 10.0s'; }
  if (diffStageEl) { diffStageEl.textContent = '1'; }
  if (diffProgressEl) { diffProgressEl.style.width = '0%'; }
  if (overlayScore) { overlayScore.textContent = ''; }
  if (overlayTitle) { overlayTitle.textContent = 'Game Over'; }
  const bf = document.getElementById('boss-spawn-flash'); if (bf) { bf.classList.add('boss-spawn-hidden'); }
}

function spawnParticles(x, y, count, color) {
  const MAX = 300;
  if (state.particles.length > MAX) { return; } // drop excess
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    const sp = Math.random() * 3 + 0.6;
    state.particles.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, r: Math.random() * 2 + 0.6, life: 20 + Math.random() * 20, maxLife: 20 + Math.random() * 20, color });
  }
}

function returnToMainMenu() {
  resetRunState();
  state.debugMode = false;
  state.debugSandboxMode = false;
  setGameCursorVisible(false);
  if (overlay) { overlay.classList.add('hidden'); }
  if (settingsModal) { settingsModal.classList.add('hidden'); }
  if (tutorial && tutorial.close) { tutorial.close(); }
  if (startScreen) { startScreen.classList.remove('hidden'); }
  updateDebugPanel();
}

function setGameCursorVisible(running) {
  if (!document || !document.body) { return; }
  document.body.classList.toggle('game-running', !!running);
}

const updateGame = createUpdateGame({
  state,
  settings,
  stageDuration: settings.stageDuration,
  applyEnemyPhase,
  startBossFight,
  endGame,
  endBossFight,
  clearActiveThreats,
  scheduleSpawn,
  scheduleObstacle,
  spawnEnemy,
  createTelegraphEnemy,
  randomEnemySize,
  chooseEnemyShape,
  spawnParticles,
  multiplier,
  updateDebugPanel
});

const renderGame = createRenderGame({
  state,
  settings,
  enemyDebugText,
  renderEnemyHitbox,
  renderObstacleHitbox
});

// pause toggle
let pausedBadge = null;
function setPaused(v) {
  state.paused = v;
  if (state.paused) {
    if (!pausedBadge) { pausedBadge = document.createElement('div'); pausedBadge.className = 'paused-badge'; pausedBadge.textContent = 'PAUSED'; document.body.appendChild(pausedBadge); }
  } else {
    if (pausedBadge) { pausedBadge.remove(); pausedBadge = null; }
  }
}
// cap particles to avoid runaway allocations
function ensureParticleCap() {
  const MAX = 300;
  if (state.particles.length > MAX) { state.particles.splice(0, state.particles.length - MAX); }
}


function scheduleSpawn() {
  // don't schedule new spawns when we've reached the enemy cap
  if (state.enemies.length >= (settings.enemyMax || 80)) { return; }
  if (state.debugMode && state.debugSandboxMode) { return; }
  const side = Math.floor(rand(0, 4));
  const tele = { side, t: 700 + Math.random() * 300, alpha: 1, reason: 'telegraph' };
  if (side === 0) { tele.x = 0; tele.y = Math.max(12, Math.min(state.height - 12, rand(20, state.height - 20))); }
  else if (side === 1) { tele.x = state.width; tele.y = Math.max(12, Math.min(state.height - 12, rand(20, state.height - 20))); }
  else if (side === 2) { tele.x = Math.max(12, Math.min(state.width - 12, rand(20, state.width - 20))); tele.y = 0; }
  else { tele.x = Math.max(12, Math.min(state.width - 12, rand(20, state.width - 20))); tele.y = state.height; }
  state.telegraphs.push(tele);
}

function clearActiveThreats() {
  state.enemies.length = 0;
  state.bullets.length = 0;
  state.telegraphs.length = 0;
}

function scheduleObstacle() {
  if (!settings.obstacleEnabled) { return; }
  const _t = createObstacleTelegraph({
    stage: state.stage,
    width: state.width,
    height: state.height,
    mouse: state.mouse,
    player: state.player,
    rand,
    settings,
    chooseObstacleShape,
    chooseObstacleMotion,
    chooseObstacleColor,
    randomObstacleTone
  });
  if (_t && typeof _t === 'object') { state.obstacleTelegraphs.push(_t); }
}

function advanceStage() {
  state.stage = Math.min(settings.maxStage || 6, state.stage + 1);
  state.nextStageTime += settings.stageDuration;
  const profile = waveDifficulty(state.stage, settings.maxStage, state.difficulty);
  // prepare a smooth ramp for difficulty (speed and spawn interval)
  const targetSpeed = speedTargetMultiplier(state.speedMultiplier, state.stage);
  const targetSpawn = spawnTarget(settings.spawnBase, state.stage);
  state.stageEase = {
    active: true,
    startElapsed: state.elapsed,
    duration: Math.max(2.4, 4.8 - profile.progress * 2.0),
    fromSpeed: state.speedMultiplier,
    toSpeed: targetSpeed,
    fromSpawn: state.spawnInterval,
    toSpawn: targetSpawn
  };
  if (settings.obstacleEnabled) {
    settings.obstacleBaseInterval = Math.max(2.0, settings.obstacleBaseInterval * (0.86 + profile.progress * 0.10));
  }
  state.bossPending = false;
  if (bossTimerEl) { bossTimerEl.classList.add('hidden'); }
  showRoundBanner('Round ' + state.stage);
}

// update HUD difficulty stage/progress indicator
const diffStageEl = document.getElementById('diff-stage');
const diffProgressEl = document.getElementById('diff-progress');

function multiplier() {
  // gentler growth and cap to keep scores reasonable (cap from settings)
  const timeFactor = Math.pow(1.002, state.elapsed); // very gentle
  const survFactor = 1 + (state.survivedCount * 0.0015);
  const raw = timeFactor * survFactor;
  return Math.min(settings.multCap, +(raw).toFixed(3));
}



function loop(ts) {
  if (!state.lastTime) { state.lastTime = ts; }
  const dt = (ts - state.lastTime) / 1000; // seconds
  state.lastTime = ts;

  state._fpsFrames += 1;
  if (!state._fpsLast) { state._fpsLast = ts; }
  if (ts - state._fpsLast >= 1000) {
    state.fps = (state._fpsFrames * 1000) / (ts - state._fpsLast);
    state._fpsFrames = 0;
    state._fpsLast = ts;
  }

  if (state.running) {
    updateGame(dt);
    if (ctx) { renderGame(ctx); }
    // update score/UI (throttled)
    if (Date.now() - state._lastDOM > 140) {
      if (scoreEl) { scoreEl.textContent = 'Score: ' + state.score; }
      const mul = multiplier();
      if (multEl) { multEl.textContent = 'Multiplier: x' + mul.toFixed(2); }
      if (timeEl) { timeEl.textContent = 'Time: ' + state.elapsed.toFixed(1) + 's'; }
      if (bossTimerEl) {
        if (state.bossActive) {
          // Active boss countdown
          bossTimerEl.classList.remove('hidden');
          bossTimerEl.classList.remove('boss-pending');
          bossTimerEl.textContent = 'Boss: ' + Math.max(0, state.bossTimer).toFixed(1) + 's';
          // hide spawn flash when boss active
          const bf = document.getElementById('boss-spawn-flash'); if (bf) { bf.classList.add('boss-spawn-hidden'); }
        } else if (state.bossPending) {
          // Pre-spawn pending countdown and flashing ring
          bossTimerEl.classList.remove('hidden');
          bossTimerEl.classList.add('boss-pending');
          const remaining = Math.max(0, state.bossPendingTimer || 0);
          bossTimerEl.textContent = 'Boss in: ' + remaining.toFixed(1) + 's';
          // ensure flash element exists and show it
          const bf = ensureBossFlash();
          bf.classList.remove('boss-spawn-hidden');
          // Anchor flash near the exact boss spawn telegraph location.
          if (state.bossSpawnTele) {
            bf.style.left = state.bossSpawnTele.x + 'px';
            bf.style.top = state.bossSpawnTele.y + 'px';
          } else {
            bf.style.left = (state.width * 0.5) + 'px';
            bf.style.top = (state.height * 0.5) + 'px';
          }
          // adjust flash size and speed depending on remaining time (faster/more visible close to spawn)
          const baseR = state.bossSpawnTele ? state.bossSpawnTele.r : Math.min(state.width, state.height) * 0.18;
          const size = Math.max(160, Math.min(520, baseR * 1.6));
          bf.style.width = size + 'px';
          bf.style.height = size + 'px';
          const totalWarn = (state.bossSpawnTele && state.bossSpawnTele.durTotal) ? state.bossSpawnTele.durTotal : Math.max(1, remaining);
          const urgency = 1 - Math.min(1, remaining / Math.max(0.001, totalWarn));
          const animDur = Math.max(0.09, 0.7 - urgency * 0.45);
          bf.style.animationDuration = animDur + 's';
          bossTimerEl.style.animationDuration = Math.max(0.08, animDur) + 's';
        } else {
          bossTimerEl.classList.add('hidden');
          const bf = document.getElementById('boss-spawn-flash'); if (bf) { bf.classList.add('boss-spawn-hidden'); }
        }
      }
      // difficulty stage UI
      if (diffStageEl) { diffStageEl.textContent = String(state.stage); }
      if (diffProgressEl) {
        const prevStageStart = state.nextStageTime - settings.stageDuration;
        const prog = Math.min(1, Math.max(0, (state.elapsed - prevStageStart) / settings.stageDuration));
        diffProgressEl.style.width = (prog * 100) + '%';
      }
      state._lastDOM = Date.now();
    }
    ensureParticleCap();
  }

  updateDebugPanel();

  requestAnimationFrame(loop);
}

function startGame({ debugSandbox = false } = {}) {
  tutorial.close();
  state.debugMode = !!debugSandbox;
  setDebugSandboxMode(!!debugSandbox);
  resetRunState();
  state.running = true;
  setGameCursorVisible(true);
  if (overlay) { overlay.classList.add('hidden'); }
  if (startScreen) { startScreen.classList.add('hidden'); }
  if (overlayTitle) { overlayTitle.textContent = 'Game Over'; }
  if (overlayScore) { overlayScore.textContent = ''; }
  // hide restart until next game over
  if (restartBtn) { restartBtn.style.display = 'none'; }
  if (restartBtn) { restartBtn.textContent = 'Play Again'; }
  showRoundBanner('Round 1');
  updateDebugPanel();
}

function startDebugSandbox() {
  startGame({ debugSandbox: true });
}

function endGame() {
  state.running = false;
  setGameCursorVisible(false);
  if (overlay) { overlay.classList.remove('hidden'); }
  if (overlayTitle) { overlayTitle.textContent = 'Game Over'; }
  if (overlayScore) { overlayScore.textContent = 'Score: ' + state.score; }
  if (restartBtn) { restartBtn.textContent = 'Play Again'; }
  if (restartBtn) { restartBtn.style.display = 'inline-block'; }
  if (state.score > best) { best = state.score; localStorage.setItem('md_best', best); if (bestEl) { bestEl.textContent = 'Best: ' + best; } }
  updateDebugPanel();
}

// difficulty selector wiring
// Settings UI wiring
const settingsModal = document.getElementById('settings');
const openSettingsStart = document.getElementById('openSettingsStart');
const openSettingsEnd = document.getElementById('openSettingsEnd');
const debugSandboxStart = document.getElementById('debugSandboxStart');
const closeSettings = document.getElementById('closeSettings');
const applySettings = document.getElementById('applySettings');
const inputStageDuration = document.getElementById('setting-stage-duration');
const inputMultCap = document.getElementById('setting-mult-cap');
const inputSpawnBase = document.getElementById('setting-spawn-base');

function showSettings() {
  // populate
  if (inputStageDuration) { inputStageDuration.value = settings.stageDuration; }
  if (inputMultCap) { inputMultCap.value = settings.multCap; }
  if (inputSpawnBase) { inputSpawnBase.value = settings.spawnBase; }
  if (settingsModal) { settingsModal.classList.remove('hidden'); }
}
function hideSettings() { if (settingsModal) { settingsModal.classList.add('hidden'); } }
wireGameInput({
  canvas,
  startBtn,
  restartBtn,
  returnToMenuBtn,
  diffBtns,
  openSettingsStart,
  openSettingsEnd,
  debugSandboxStart,
  closeSettings,
  applySettings,
  document,
  window,
  handlers: {
    onMouseMove: (x, y) => { mouse.x = x; mouse.y = y; },
    onPauseToggle: () => setPaused(!state.paused),
    onDebugToggle: () => {
      if (state.debugSandboxMode) {
        state.debugMode = true;
        updateDebugPanel();
        return;
      }
      state.debugMode = !state.debugMode;
      if (!state.debugMode) { state.debugSandboxMode = false; }
      updateDebugPanel();
    },
    onDebugSandboxToggle: () => { setDebugSandboxMode(!state.debugSandboxMode); },
    onSpawnDebugEnemy: (type, count) => spawnDebugEnemy(type, count),
    onClearEnemies: () => { state.enemies.length = 0; },
    onStartGame: () => { if (!state.running) { startGame(); } },
    onDifficultyChange: (nextDifficulty) => {
      diffBtns.forEach(x => x.classList.remove('selected'));
      const selected = diffBtns.find(x => x.dataset.diff === nextDifficulty);
      if (selected) { selected.classList.add('selected'); }
      difficulty = nextDifficulty;
      state.difficulty = nextDifficulty;
      if (difficulty === 'easy') { settings.spawnBase = Math.max(600, settings.spawnBase) || 1400; state.speedMultiplier = 0.9; }
      else if (difficulty === 'normal') { settings.spawnBase = Math.max(500, settings.spawnBase) || 1100; state.speedMultiplier = 1.0; }
      else { settings.spawnBase = Math.max(400, settings.spawnBase) || 900; state.speedMultiplier = 1.15; }
    },
    onShowSettings: () => showSettings(),
    onHideSettings: () => hideSettings(),
    onStartDebugSandbox: () => startDebugSandbox(),
    onReturnToMainMenu: () => returnToMainMenu(),
    onApplySettings: () => {
      if (inputStageDuration) { settings.stageDuration = Math.max(5, Number(inputStageDuration.value) || settings.stageDuration); }
      if (inputMultCap) { settings.multCap = Math.max(1, Number(inputMultCap.value) || settings.multCap); }
      if (inputSpawnBase) { settings.spawnBase = Math.max(200, Number(inputSpawnBase.value) || settings.spawnBase); }
      hideSettings();
    }
  }
});

// apply initial difficulty defaults into settings to match selected button
if (difficulty === 'easy') { settings.spawnBase = 1000; state.speedMultiplier = 1.0; }
else if (difficulty === 'normal') { settings.spawnBase = 850; state.speedMultiplier = 1.05; }
else { settings.spawnBase = 700; state.speedMultiplier = 1.12; }

// start the loop
requestAnimationFrame(loop);

// Small accessibility: start paused until click
if (overlay) { overlay.classList.add('hidden'); }
if (startScreen) { startScreen.classList.remove('hidden'); }
if (overlayTitle) { overlayTitle.textContent = 'Game Over'; }
if (overlayScore) { overlayScore.textContent = ''; }
setGameCursorVisible(false);

// --- Test hooks and debug controls (runtime helpers used by Playwright tests)
try {
  window.__TEST_HOOK__ = window.__TEST_HOOK__ || {};
  window.__TEST_API__ = {
    forceBoss: function () { try { startBossFight(true); } catch (e) { void e; } },
    beginStageEnd: function () { try { beginStageEnd(); } catch (e) { void e; } },
    advanceStage: function () { try { advanceStage(); } catch (e) { void e; } },
    scheduleSpawn: function () { try { scheduleSpawn(); } catch (e) { void e; } },
    scheduleObstacle: function () { try { scheduleObstacle(); } catch (e) { void e; } },
    triggerGameOver: function () { try { endGame(); } catch (e) { void e; } },
    spawnEnemy: function () { try { spawnEnemy('test'); } catch (e) { void e; } },
    spawnDebugEnemy: function (type, count) { try { spawnDebugEnemy(type, count || 1); } catch (e) { void e; } },
    returnToMainMenu: function () { try { returnToMainMenu(); } catch (e) { void e; } }
  };

  (function createDevControls() {
    if (document.getElementById('dev-controls')) { return; }
    const d = document.createElement('div');
    d.id = 'dev-controls';
    d.classList.add('hidden');
    d.style.position = 'fixed';
    d.style.right = '8px';
    d.style.top = '8px';
    d.style.zIndex = 9999;
    d.style.display = 'flex';
    d.style.flexDirection = 'column';
    d.style.gap = '6px';
    d.style.fontSize = '12px';
    d.style.padding = '6px';
    d.style.background = 'rgba(0,0,0,0.5)';
    d.style.color = '#fff';
    d.style.borderRadius = '6px';
    const mkBtn = (text, cb) => { const b = document.createElement('button'); b.textContent = text; b.style.padding = '6px'; b.style.cursor = 'pointer'; b.onclick = cb; return b; };
    d.appendChild(mkBtn('Force Boss', () => window.__TEST_API__.forceBoss()));
    d.appendChild(mkBtn('Advance Stage', () => window.__TEST_API__.advanceStage()));
    d.appendChild(mkBtn('Spawn Enemy', () => window.__TEST_API__.spawnEnemy()));
    d.appendChild(mkBtn('Spawn Obstacle', () => window.__TEST_API__.scheduleObstacle()));
    d.appendChild(mkBtn('Game Over', () => window.__TEST_API__.triggerGameOver()));
    d.appendChild(mkBtn('Main Menu', () => window.__TEST_API__.returnToMainMenu()));
    const toggle = mkBtn('Toggle Sandbox', () => { state.debugSandboxMode = !state.debugSandboxMode; setDebugSandboxMode(state.debugSandboxMode); });
    d.appendChild(toggle);
    document.body.appendChild(d);
  })();

  // We'll update the test hook inside the main loop to avoid reassigning functions.
} catch (e) { /* ignore when running outside browser */ }
