const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const multEl = document.getElementById('mult');
const timeEl = document.getElementById('time');
const bossTimerEl = document.getElementById('boss-timer');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart');
const startScreen = document.getElementById('start');
const startBtn = document.getElementById('startBtn');
const diffBtns = Array.from(document.querySelectorAll('.diff-btn'));
const tipEl = document.getElementById('tip');
// static HUD tip (moved from start overlay)
if(tipEl) tipEl.textContent = 'Tip: static obstacles stay longer but are easier to avoid.';

let width = 800, height = 600;
function resize(){
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width * devicePixelRatio;
  canvas.height = height * devicePixelRatio;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
}
window.addEventListener('resize', resize);
resize();

const player = { x: width/2, y: height/2, r: 12, color: '#3b82f6', prevX: width/2, prevY: height/2, vx: 0, vy: 0 };
// visual-only eased draw state (keeps collision exact but smooths visual)
let drawPlayerX = player.x, drawPlayerY = player.y, drawPlayerAngle = 0, drawPlayerScale = 1;
let mouse = { x: player.x, y: player.y };
window.addEventListener('mousemove', e=>{ mouse.x = e.clientX; mouse.y = e.clientY; });

let enemies = [];
let lastSpawn = 0;
let spawnInterval = 1000; // ms
let lastTime = 0;
let score = 0;
let best = Number(localStorage.getItem('md_best')||0);
bestEl.textContent = 'Best: ' + best;
let running = false;
let speedMultiplier = 1;
let particles = [];
let difficulty = 'normal';
let telegraphs = [];
let survivedCount = 0; // used for exponential scoring
let paused = false;
let debugMode = false;
let debugSandboxMode = false;
let elapsed = 0; // seconds
let _lastDOM = 0;
let fps = 0;
let _fpsFrames = 0;
let _fpsLast = 0;
let bullets = [];
let stage = 1;
// stage easing state for smooth difficulty transition
let stageEase = null;
let boss = null;
let bossActive = false;
let bossPending = false;
let bossTimer = 0;
let bossPendingTimer = 0;
const bossDuration = 10;
const BOSS_PENDING_TIMEOUT = { easy: 6.5, normal: 8.0, hard: 9.5 };
const OBSTACLE_MOUSE_SAFE_PADDING_MIN = 70;
const OBSTACLE_MOUSE_SAFE_PADDING_MULT = 4;
const MAX_OBSTACLE_PLACEMENT_TRIES = 12;
const OBSTACLE_EDGE_PADDING = 40;
const OBSTACLE_SPAWN_MARGIN = 60;
const OBSTACLE_FALLBACK_OFFSET = 80;

function lerp(a,b,t){ return a + (b-a) * t; }
function easeInOutCubic(t){ return t<0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2; }
// obstacles (telegraphed hazards that kill on touch)
let obstacles = [];
let obstacleTelegraphs = [];
let lastObstacleSpawn = 0;
let obstacleActiveInterval = 0;
// settings (adjustable via UI)
const settings = {
  stageDuration: 20,
  multCap: 4,
  spawnBase: 1100,
  obstacleEnabled: true,
  // obstacle timings: shorter telegraph animation, longer presence, and more frequent spawns
  obstacleTeleTime: 900, // ms telegraph before obstacle appears (increased for more warning)
  obstacleLifeBase: 3.8, // base seconds obstacle remains
  obstacleBaseInterval: 6, // seconds between obstacle telegraphs
  // hard cap for number of simultaneous enemies to avoid runaway scaling
  enemyMax: 20,
  maxStage: 10
};
let nextStageTime = settings.stageDuration;

const debugPanel = document.createElement('div');
debugPanel.className = 'debug-panel hidden';
document.body.appendChild(debugPanel);

function rand(min,max){ return Math.random()*(max-min)+min; }

function randomEnemySize(type, stageValue){
  // narrower / more moderate random sizes (avoid extremes)
  const stageBoost = Math.max(0, stageValue - 1) * 0.6;
  // slightly larger overall sizes for clearer visibility
  if(type === 'big') return rand(30, 46) + stageBoost * rand(1.2, 3.0);
  if(type === 'fast') return rand(9, 16) + stageBoost * rand(0.3, 0.8);
  if(type === 'shooter') return rand(16, 26) + stageBoost * rand(0.4, 1.1);
  if(type === 'charger') return rand(18, 28) + stageBoost * rand(0.5, 1.2);
  if(type === 'splitter') return rand(12, 22) + stageBoost * rand(0.25, 0.8);
  return rand(12, 24) + stageBoost * rand(0.18, 0.7);
}

function squareCircleHit(squareX, squareY, halfSize, circleX, circleY, circleRadius){
  const closestX = Math.max(squareX - halfSize, Math.min(circleX, squareX + halfSize));
  const closestY = Math.max(squareY - halfSize, Math.min(circleY, squareY + halfSize));
  const dx = circleX - closestX;
  const dy = circleY - closestY;
  return dx * dx + dy * dy <= circleRadius * circleRadius;
}

function roundVal(v, decimals = 2){
  const m = Math.pow(10, decimals);
  return Math.round((v || 0) * m) / m;
}

function chooseEnemyShape(type, stageValue){
  const roll = Math.random();
  if(type === 'shooter') return 'diamond';
  if(type === 'splitter') return 'triangle';
  if(type === 'dasher') return 'arrow';
  if(type === 'charger') return 'hex';
  if(type === 'homing') return roll < 0.5 ? 'circle' : 'triangle';
  if(type === 'zigzag') return roll < 0.5 ? 'square' : 'diamond';
  if(type === 'big') return 'hex';
  if(type === 'fast') return roll < 0.5 ? 'triangle' : 'circle';
  return stageValue >= 4 && roll < 0.35 ? 'square' : 'circle';
}

function chooseObstacleShape(){
  const roll = Math.random();
  if(roll < 0.38) return 'rect-h';
  if(roll < 0.72) return 'rect-v';
  if(roll < 0.88) return 'square';
  return 'bar';
}

function chooseObstacleMotion(shape, stageValue){
  const roll = Math.random();
  // prefer static obstacles more often, especially on lower stages
  if(roll < 0.38) return 'static';
  if(stageValue >= 4 && roll < 0.58) return shape === 'rect-h' ? 'horizontal' : 'vertical';
  if(stageValue >= 5 && roll < 0.72) return 'oscillate';
  return roll < 0.78 ? 'drift' : 'bounce';
}

function chooseObstacleColor(shape, roundValue){
  const palettes = {
    'rect-h': ['#22c55e', '#38bdf8', '#a855f7'],
    'rect-v': ['#06b6d4', '#fb923c', '#f472b6'],
    'square': ['#facc15', '#60a5fa', '#34d399'],
    'bar': ['#8b5cf6', '#22d3ee', '#f97316']
  };
  const list = palettes[shape] || ['#22c55e', '#38bdf8', '#a855f7'];
  const idx = Math.min(list.length - 1, Math.floor(roundValue / 2) % list.length);
  return list[idx];
}

function randomObstacleTone(shape){
  const base = chooseObstacleColor(shape, stage);
  const extra = ['#38bdf8', '#a78bfa', '#22c55e', '#f472b6', '#f59e0b'];
  return Math.random() < 0.65 ? extra[Math.floor(Math.random() * extra.length)] : base;
}

function applyEnemyPhase(enemy){
  if(enemy.type === 'homing' && enemy.phase === 1){
    enemy.phase = 2;
    enemy.color = '#fb7185';
    enemy.speed *= 1.28;
    enemy.turnRate = (enemy.turnRate || 0.9) * 0.35;
    enemy.shape = 'square';
  } else if(enemy.type === 'shooter' && enemy.phase === 1){
    enemy.phase = 2;
    enemy.color = '#a855f7';
    enemy.shootInterval = Math.max(0.22, (enemy.shootInterval || 0.9) * 0.72);
    enemy.shape = 'diamond';
  } else if(enemy.type === 'big' && enemy.phase === 1){
    enemy.phase = 2;
    enemy.color = '#f59e0b';
    enemy.speed *= 1.22;
    enemy.r *= 1.08;
    enemy.shape = 'hex';
  } else if(enemy.type === 'charger' && enemy.phase === 1){
    enemy.phase = 2;
    enemy.color = '#22d3ee';
    enemy.dashSpeed *= 1.08;
  }
}

function enemyDebugText(enemy){
  const parts = [enemy.type.toUpperCase()];
  if(enemy.phase != null) parts.push('phase:' + enemy.phase);
  if(enemy.shape) parts.push(enemy.shape);
  if(enemy.reason) parts.push('src:' + enemy.reason);
  if(enemy.type === 'charger'){ parts.push('dash'); }
  if(enemy.type === 'homing' && enemy.homingTime != null) parts.push('t:' + roundVal(enemy.homingTime,2));
  if(enemy.type === 'shooter' && enemy.shootInterval != null) parts.push('cd:' + roundVal(enemy.shootInterval,2));
  if(enemy.type === 'charger' && enemy.warnTimer != null) parts.push('warn:' + Math.max(0, roundVal(enemy.warnTimer,2)));
  if(enemy.speed != null) parts.push('spd:' + roundVal(enemy.speed,2));
  if(enemy.r != null) parts.push('r:' + Math.round(enemy.r));
  return parts.join(' | ');
}

function bossColor(stageValue){
  if(stageValue >= 8) return '#f97316';
  if(stageValue >= 5) return '#fb7185';
  return '#f59e0b';
}

function beginStageEnd(){
  bossPending = true;
  bossPendingTimer = BOSS_PENDING_TIMEOUT[difficulty] || BOSS_PENDING_TIMEOUT.normal;
  lastSpawn = 0;
  lastObstacleSpawn = 0;
  telegraphs.length = 0;
  obstacleTelegraphs.length = 0;
}

function startBossFight(){
  bossActive = true;
  bossPending = false;
  bossPendingTimer = 0;
  telegraphs.length = 0;
  obstacleTelegraphs.length = 0;
  lastSpawn = 0;
  lastObstacleSpawn = 0;
  bossTimer = bossDuration;
  const sizeBoost = stage * 6;
  const speedBoost = stage * 24;
  boss = {
    x: rand(120, Math.max(121, width - 120)),
    y: rand(120, Math.max(121, height - 120)),
    dx: Math.cos(rand(0, Math.PI * 2)),
    dy: Math.sin(rand(0, Math.PI * 2)),
    r: 36 + sizeBoost,
    speed: (260 + speedBoost) * (0.95 + stage * 0.03) * speedMultiplier,
    color: bossColor(stage),
    life: 0,
    duration: bossDuration,
    retargetTimer: 0.25,
    jitter: rand(0, Math.PI * 2),
    stageValue: stage
  };
  showRoundBanner('Boss Stage');
}

function endBossFight(){
  bossActive = false;
  boss = null;
  bossTimer = 0;
  advanceStage();
}

function updateBoss(dt){
  if(!bossActive || !boss) return;
  boss.life += dt;
  bossTimer -= dt;
  if(bossTimer <= 0){
    endBossFight();
    return;
  }
  boss.retargetTimer -= dt;
  boss.jitter += dt * 7;

  if(boss.retargetTimer <= 0){
    boss.retargetTimer = rand(0.15, 0.45);
    const aimPlayer = Math.random() < 0.45;
    const baseAngle = aimPlayer ? Math.atan2(player.y - boss.y, player.x - boss.x) : rand(0, Math.PI * 2);
    const spread = rand(-1.15, 1.15);
    const angle = baseAngle + spread;
    boss.dx = Math.cos(angle);
    boss.dy = Math.sin(angle);
    const len = Math.hypot(boss.dx, boss.dy) || 1;
    boss.dx /= len;
    boss.dy /= len;
    boss.speed = (260 + boss.stageValue * 24) * (0.92 + boss.stageValue * 0.025) * speedMultiplier;
  }

  boss.x += boss.dx * boss.speed * dt;
  boss.y += boss.dy * boss.speed * dt;

  const margin = boss.r + 12;
  if(boss.x < margin){ boss.x = margin; boss.dx = Math.abs(boss.dx); }
  if(boss.x > width - margin){ boss.x = width - margin; boss.dx = -Math.abs(boss.dx); }
  if(boss.y < margin){ boss.y = margin; boss.dy = Math.abs(boss.dy); }
  if(boss.y > height - margin){ boss.y = height - margin; boss.dy = -Math.abs(boss.dy); }

  if(boss.life >= boss.duration){
    endBossFight();
  }
}

function updateDebugPanel(){
  if(!debugMode){
    debugPanel.classList.add('hidden');
    debugPanel.style.display = 'none';
    return;
  }
  debugPanel.classList.remove('hidden');
  debugPanel.style.display = 'block';
  const obstacleCount = obstacles.length + obstacleTelegraphs.length;
  debugPanel.innerHTML = [
    '<div><strong>DEBUG MODE</strong></div>',
    '<div>Stage: ' + stage + ' / ' + (settings.maxStage || 6) + '</div>',
    '<div>Enemies: ' + enemies.length + '</div>',
    '<div>Enemy cap: ' + (settings.enemyMax || 0) + '</div>',
    '<div>Obstacles: ' + obstacleCount + '</div>',
    '<div>Spawn: ' + Math.round(spawnInterval) + 'ms</div>',
    '<div>Obstacle spawn: ' + settings.obstacleBaseInterval.toFixed(1) + 's</div>',
    '<div>Sandbox: ' + (debugSandboxMode ? 'on' : 'off') + '</div>',
    '<div>Spawn tests: 1 straight, 2 homing, 3 zigzag, 4 fast, 5 big, 6 charger, 7 shooter, 8 splitter, 9 dasher</div>',
    '<div>X clears enemies, Shift spawns 5</div>',
    '<div>B toggles sandbox</div>',
    '<div>FPS: ' + fps.toFixed(0) + '</div>',
    '<div>Speed mult: ' + speedMultiplier.toFixed(2) + '</div>',
    '<div>Player vel: ' + player.vx.toFixed(0) + ', ' + player.vy.toFixed(0) + '</div>',
    '<div>Paused: ' + (paused ? 'yes' : 'no') + '</div>'
  ].join('');
}

function drawDebugEnemyHitbox(enemy){
  ctx.save();
  ctx.strokeStyle = 'rgba(34,211,238,0.85)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  const pad = Math.max(6, enemy.r * 1.05);
  if(enemy.shape === 'triangle'){
    ctx.beginPath();
    ctx.moveTo(enemy.x + pad, enemy.y);
    ctx.lineTo(enemy.x - pad * 0.9, enemy.y - pad * 0.85);
    ctx.lineTo(enemy.x - pad * 0.9, enemy.y + pad * 0.85);
    ctx.closePath();
    ctx.stroke();
  } else if(enemy.shape === 'diamond'){
    ctx.beginPath();
    ctx.moveTo(enemy.x, enemy.y - pad);
    ctx.lineTo(enemy.x + pad, enemy.y);
    ctx.lineTo(enemy.x, enemy.y + pad);
    ctx.lineTo(enemy.x - pad, enemy.y);
    ctx.closePath();
    ctx.stroke();
  } else if(enemy.shape === 'hex'){
    ctx.beginPath();
    ctx.moveTo(enemy.x + pad, enemy.y);
    for(let k=1;k<6;k++){
      const ang = (Math.PI * 2 / 6) * k;
      ctx.lineTo(enemy.x + Math.cos(ang) * pad, enemy.y + Math.sin(ang) * pad);
    }
    ctx.closePath();
    ctx.stroke();
  } else {
    ctx.strokeRect(enemy.x - pad, enemy.y - pad, pad * 2, pad * 2);
  }
  ctx.restore();
}

function drawDebugObstacleHitbox(obstacle){
  ctx.save();
  ctx.strokeStyle = 'rgba(251,191,36,0.9)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 5]);
  if(obstacle.shape === 'rect-h' || obstacle.shape === 'rect-v' || obstacle.shape === 'square' || obstacle.shape === 'bar'){
    ctx.strokeRect(obstacle.x - obstacle.w/2, obstacle.y - obstacle.h/2, obstacle.w, obstacle.h);
  } else {
    ctx.beginPath();
    ctx.arc(obstacle.x, obstacle.y, obstacle.r || 16, 0, Math.PI*2);
    ctx.stroke();
  }
  ctx.restore();
}

function showRoundBanner(text){
  let banner = document.getElementById('round-banner');
  if(!banner){
    banner = document.createElement('div');
    banner.id = 'round-banner';
    banner.style.position = 'absolute';
    banner.style.left = '50%';
    banner.style.top = '62px';
    banner.style.transform = 'translateX(-50%)';
    banner.style.zIndex = '38';
    banner.style.padding = '8px 14px';
    banner.style.borderRadius = '999px';
    banner.style.background = 'rgba(2,6,23,0.72)';
    banner.style.border = '1px solid rgba(255,255,255,0.08)';
    banner.style.color = '#e6eef8';
    banner.style.fontWeight = '800';
    banner.style.letterSpacing = '0.04em';
    banner.style.boxShadow = '0 8px 26px rgba(2,6,23,0.45)';
    document.body.appendChild(banner);
  }
  banner.textContent = text;
  banner.style.opacity = '1';
  banner.style.transition = 'opacity 220ms ease';
  clearTimeout(showRoundBanner._timer);
  showRoundBanner._timer = setTimeout(()=>{ banner.style.opacity = '0'; }, 1400);
}

function spawnEnemy(reason='spawn'){
  // enforce hard cap on enemies
  if(enemies.length >= (settings.enemyMax || 80)) return;
  // spawn from random edge and choose an enemy type influenced by difficulty
  const side = Math.floor(rand(0,4));
  let x,y,dx,dy;
  const baseSpeed = rand(70,140) * speedMultiplier; // px/sec
  const spawnSize = rand(8,30);
  if(side===0){ x = -spawnSize; y = rand(0,height); dx = rand(0.2,1); dy = rand(-0.5,0.5);} // left
  else if(side===1){ x = width+spawnSize; y = rand(0,height); dx = rand(-1,-0.2); dy = rand(-0.5,0.5);} // right
  else if(side===2){ x = rand(0,width); y = -spawnSize; dx = rand(-0.5,0.5); dy = rand(0.2,1);} // top
  else { x = rand(0,width); y = height+spawnSize; dx = rand(-0.5,0.5); dy = rand(-1,-0.2);} // bottom
  // gently bias the initial path toward the current cursor position
  const aimX = mouse.x - x;
  const aimY = mouse.y - y;
  const len = Math.hypot(aimX, aimY) || 1;
  dx = lerp(dx, aimX / len, 0.25);
  dy = lerp(dy, aimY / len, 0.25);
  const aimLen = Math.hypot(dx, dy) || 1;
  dx /= aimLen;
  dy /= aimLen;

  const stageBoost = Math.min(1, (stage-1) * 0.14 + elapsed / 90);

  // choose type
  const roll = Math.random();
  let type = 'straight';
  if(difficulty === 'easy'){
    if(roll < 0.10 + stageBoost * 0.08) type = 'homing';
    else if(roll < 0.20 + stageBoost * 0.08) type = 'zigzag';
    else if(stage >= 3 && roll > 0.94) type = 'fast';
    else type = 'straight';
  } else if(difficulty === 'normal'){
    if(roll < 0.24 + stageBoost * 0.16) type = 'homing';
    else if(roll < 0.28 + stageBoost * 0.08) type = 'zigzag';
    else if(roll < 0.44 + stageBoost * 0.10) type = 'fast';
    else if(stage >= 4 && roll > 0.88) type = 'shooter';
    else if(stage >= 3 && roll > 0.80) type = 'charger';
    else type = 'straight';
  } else { // hard
    if(roll < 0.34 + stageBoost * 0.14) type = 'homing';
    else if(roll < 0.40 + stageBoost * 0.08) type = 'zigzag';
    else if(roll < 0.64 + stageBoost * 0.10) type = 'fast';
    else if(roll < 0.78 + stageBoost * 0.06) type = 'big';
    else if(stage >= 3 && roll > 0.82) type = 'shooter';
    else if(stage >= 2 && roll > 0.72) type = 'charger';
    else type = 'straight';
  }

  const size = randomEnemySize(type, stage);
  let enemy = { x, y, dx, dy, r: size, color: '#ef4444', type, speed: baseSpeed, shape: chooseEnemyShape(type, stage), hp: 1, reason, phase: 1, phaseTimer: 0 };
  enemy.speed *= 1 + stageBoost * 0.35;
  if(type === 'straight') { enemy.color = '#ef4444'; }
  if(type === 'fast') { enemy.speed *= 1.6; enemy.r = Math.max(6, size * 0.75); enemy.color = '#fb7185'; enemy.shape = 'triangle'; }
  if(type === 'big') { enemy.speed *= 0.6; enemy.r = Math.max(22, size * 1.6); enemy.color = '#f97316'; enemy.shape = 'hex'; }
  if(type === 'zigzag') { enemy.amp = rand(12,36); enemy.phase = rand(0,Math.PI*2); enemy.freq = rand(3,6); enemy.color = '#f43f5e'; }
  if(type === 'homing') { enemy.turnRate = rand(0.86,1.28) * (1 + stageBoost * 0.65); enemy.homingTime = Math.max(0.38, 1.0 + Math.random()*0.7 - stageBoost * 0.55); enemy.color = '#ef4444'; }
  if(type === 'shooter') { enemy.shootTimer = rand(0.6,1.4); enemy.shootInterval = Math.max(0.32, 1.0 - stageBoost * 0.5); enemy.shotsFired = 0; enemy.color = '#7c3aed'; enemy.shape = 'diamond'; }
  if(type === 'charger') {
    const leadX = player.x + player.vx * (0.2 + stage * 0.04);
    const leadY = player.y + player.vy * (0.2 + stage * 0.04);
    const tx = leadX - x;
    const ty = leadY - y;
    const tlen = Math.hypot(tx, ty) || 1;
    enemy.chargeDx = tx / tlen;
    enemy.chargeDy = ty / tlen;
    // make charger easier to see and dodge: larger, slower dash, longer warning
    enemy.r = Math.max(enemy.r, size + 6);
    // longer, more visible warning to give fair reaction time
    enemy.warnTimer = Math.max(0.9, 1.1 + Math.random() * 0.6 + stage * 0.04);
    enemy.warnDuration = Math.max(0.6, enemy.warnTimer * 0.95);
    enemy.dashSpeed = enemy.speed * Math.max(1.8, (2.2 + stage * 0.28));
    enemy.chargeLen = rand(200, 320) + stage * 14;
    enemy.chargeTargetX = x + enemy.chargeDx * enemy.chargeLen;
    enemy.chargeTargetY = y + enemy.chargeDy * enemy.chargeLen;
    enemy.color = '#22d3ee';
    enemy.shape = 'hex';
  }
  if(type === 'splitter') { enemy.phase = 1; enemy.phaseTimer = 0; enemy.color = '#ff7aa2'; }
  enemies.push(enemy);
}

function spawnDebugEnemy(type='straight', count=1){
  if(!debugMode) return;
  for(let n=0; n<count; n++){
    if(enemies.length >= (settings.enemyMax || 80)) return;
    const angle = rand(0, Math.PI * 2);
    const radius = rand(180, 240);
    const x = Math.max(0, Math.min(width, mouse.x + Math.cos(angle) * radius));
    const y = Math.max(0, Math.min(height, mouse.y + Math.sin(angle) * radius));
    let dx = mouse.x - x;
    let dy = mouse.y - y;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;

    const stageBoost = Math.min(1, (stage-1) * 0.14 + elapsed / 90);
    const baseSpeed = rand(70,140) * speedMultiplier;
    const size = randomEnemySize(type, stage);
    let enemy = { x, y, dx, dy, r: size, color: '#ef4444', type, speed: baseSpeed, shape: chooseEnemyShape(type, stage), hp: 1, reason: 'debug', phase: 1, phaseTimer: 0 };
    enemy.speed *= 1 + stageBoost * 0.35;
    if(type === 'straight') { enemy.color = '#ef4444'; }
    if(type === 'fast') { enemy.speed *= 1.6; enemy.r = Math.max(6, size * 0.75); enemy.color = '#fb7185'; enemy.shape = 'triangle'; }
    if(type === 'big') { enemy.speed *= 0.6; enemy.r = Math.max(22, size * 1.6); enemy.color = '#f97316'; enemy.shape = 'hex'; }
    if(type === 'zigzag') { enemy.amp = rand(12,36); enemy.phase = rand(0,Math.PI*2); enemy.freq = rand(3,6); enemy.color = '#f43f5e'; }
    if(type === 'homing') { enemy.turnRate = rand(0.86,1.28) * (1 + stageBoost * 0.65); enemy.homingTime = Math.max(0.38, 1.0 + Math.random()*0.7 - stageBoost * 0.55); enemy.color = '#ef4444'; }
    if(type === 'shooter') { enemy.shootTimer = rand(0.6,1.4); enemy.shootInterval = Math.max(0.32, 1.0 - stageBoost * 0.5); enemy.shotsFired = 0; enemy.color = '#7c3aed'; enemy.shape = 'diamond'; }
    if(type === 'dasher') { enemy.warnTimer = 0.6 + Math.random()*0.8; enemy.warnDuration = Math.max(0.18, enemy.warnTimer * Math.max(0.38, 1 - (stage-1)*0.10)); enemy.dashSpeed = enemy.speed * (2.5 + stage*0.35); enemy.color = '#06b6d4'; }
    if(type === 'charger') {
      const leadX = player.x + player.vx * (0.2 + stage * 0.04);
      const leadY = player.y + player.vy * (0.2 + stage * 0.04);
      const tx = leadX - x;
      const ty = leadY - y;
      const tlen = Math.hypot(tx, ty) || 1;
      enemy.chargeDx = tx / tlen;
      enemy.chargeDy = ty / tlen;
      enemy.r = Math.max(enemy.r, size + 6);
      enemy.warnTimer = Math.max(0.9, 1.1 + Math.random() * 0.6 + stage * 0.04);
      enemy.warnDuration = Math.max(0.6, enemy.warnTimer * 0.95);
      enemy.dashSpeed = enemy.speed * Math.max(1.8, (2.2 + stage * 0.28));
      enemy.chargeLen = rand(200, 320) + stage * 14;
      enemy.chargeTargetX = x + enemy.chargeDx * enemy.chargeLen;
      enemy.chargeTargetY = y + enemy.chargeDy * enemy.chargeLen;
      enemy.color = '#22d3ee';
      enemy.shape = 'hex';
    }
    if(type === 'splitter') { enemy.phase = 1; enemy.phaseTimer = 0; enemy.color = '#ff7aa2'; }
    enemies.push(enemy);
  }
}

function setDebugSandboxMode(v){
  debugSandboxMode = v;
  if(debugSandboxMode){
    enemies.length = 0;
    telegraphs.length = 0;
    obstacles.length = 0;
    obstacleTelegraphs.length = 0;
    bullets.length = 0;
    particles.length = 0;
    lastSpawn = 0;
    lastObstacleSpawn = 0;
  }
  updateDebugPanel();
}

function spawnParticles(x,y,count,color){
  const MAX = 300;
  if(particles.length > MAX) return; // drop excess
  for(let i=0;i<count;i++){
    const ang = Math.random()*Math.PI*2;
    const sp = Math.random()*3 + 0.6;
    particles.push({ x, y, vx: Math.cos(ang)*sp, vy: Math.sin(ang)*sp, r: Math.random()*2+0.6, life: 20 + Math.random()*20, maxLife: 20+Math.random()*20, color });
  }
}

// pause toggle
let pausedBadge = null;
function setPaused(v){
  paused = v;
  if(paused){
    if(!pausedBadge){ pausedBadge = document.createElement('div'); pausedBadge.className='paused-badge'; pausedBadge.textContent='PAUSED'; document.body.appendChild(pausedBadge); }
  } else {
    if(pausedBadge){ pausedBadge.remove(); pausedBadge = null; }
  }
}
document.addEventListener('keydown', e=>{ if(e.key === 'p' || e.key === 'P'){ setPaused(!paused); } });
document.addEventListener('keydown', e=>{ if(e.key === 'F3'){ e.preventDefault(); debugMode = !debugMode; if(!debugMode) debugSandboxMode = false; updateDebugPanel(); } });
document.addEventListener('keydown', e=>{
  if(!debugMode) return;
  const tag = e.target && e.target.tagName;
  if(tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  if(e.key === 'b' || e.key === 'B'){ e.preventDefault(); setDebugSandboxMode(!debugSandboxMode); return; }
  const count = e.shiftKey ? 5 : 1;
  if(e.key === '1'){ e.preventDefault(); spawnDebugEnemy('straight', count); }
  else if(e.key === '2'){ e.preventDefault(); spawnDebugEnemy('homing', count); }
  else if(e.key === '3'){ e.preventDefault(); spawnDebugEnemy('zigzag', count); }
  else if(e.key === '4'){ e.preventDefault(); spawnDebugEnemy('fast', count); }
  else if(e.key === '5'){ e.preventDefault(); spawnDebugEnemy('big', count); }
  else if(e.key === '6'){ e.preventDefault(); spawnDebugEnemy('charger', count); }
  else if(e.key === '7'){ e.preventDefault(); spawnDebugEnemy('shooter', count); }
  else if(e.key === '8'){ e.preventDefault(); spawnDebugEnemy('splitter', count); }
  else if(e.key === '9'){ e.preventDefault(); spawnDebugEnemy('dasher', count); }
  else if(e.key === 'x' || e.key === 'X'){ e.preventDefault(); enemies.length = 0; }
});

// cap particles to avoid runaway allocations
function ensureParticleCap(){
  const MAX = 300;
  if(particles.length > MAX) particles.splice(0, particles.length - MAX);
}


function scheduleSpawn(){
  // don't schedule new spawns when we've reached the enemy cap
  if(enemies.length >= (settings.enemyMax || 80)) return;
  if(debugMode && debugSandboxMode) return;
  const side = Math.floor(rand(0,4));
  const tele = { side, t: 700 + Math.random()*300, alpha: 1, reason: 'telegraph' };
  if(side===0){ tele.x = 0; tele.y = Math.max(12, Math.min(height-12, rand(20,height-20))); }
  else if(side===1){ tele.x = width; tele.y = Math.max(12, Math.min(height-12, rand(20,height-20))); }
  else if(side===2){ tele.x = Math.max(12, Math.min(width-12, rand(20,width-20))); tele.y = 0; }
  else { tele.x = Math.max(12, Math.min(width-12, rand(20,width-20))); tele.y = height; }
  telegraphs.push(tele);
}

function clearActiveThreats(){
  enemies.length = 0;
  bullets.length = 0;
  telegraphs.length = 0;
}

function scheduleObstacle(){
  if(!settings.obstacleEnabled) return;
  const shape = chooseObstacleShape();
  const tele = { t: settings.obstacleTeleTime || 700, shape, reason: 'obstacle' };
  const deep = Math.max(0, stage - 1);
  const randomScale = rand(0.75, 1.55) + deep * rand(0.03, 0.08);
  const teleW = shape === 'rect-h' ? rand(90, 250) * randomScale + deep * rand(10, 24) : shape === 'bar' ? rand(200, 380) * randomScale : rand(44, 130) * randomScale;
  const teleH = shape === 'rect-v' ? rand(90, 250) * randomScale + deep * rand(10, 24) : shape === 'bar' ? rand(16, 34) * rand(0.8, 1.25) : rand(44, 130) * randomScale;
  tele.w = shape === 'rect-v' ? rand(22, 58) * rand(0.9, 1.35) : teleW;
  tele.h = teleH;
  if(shape === 'square') { tele.w = rand(48, 130) * randomScale; tele.h = tele.w; }
  const mouseSpawnSafePadding = Math.max(OBSTACLE_MOUSE_SAFE_PADDING_MIN, player.r * OBSTACLE_MOUSE_SAFE_PADDING_MULT);
  let placed = false;
  for(let tries = 0; tries < MAX_OBSTACLE_PLACEMENT_TRIES; tries++){
    const candidateX = Math.max(OBSTACLE_EDGE_PADDING, Math.min(width - OBSTACLE_EDGE_PADDING, rand(OBSTACLE_SPAWN_MARGIN, width - OBSTACLE_SPAWN_MARGIN)));
    const candidateY = Math.max(OBSTACLE_EDGE_PADDING, Math.min(height - OBSTACLE_EDGE_PADDING, rand(OBSTACLE_SPAWN_MARGIN, height - OBSTACLE_SPAWN_MARGIN)));
    const nearMouseX = Math.abs(candidateX - mouse.x) < (tele.w * 0.5 + mouseSpawnSafePadding);
    const nearMouseY = Math.abs(candidateY - mouse.y) < (tele.h * 0.5 + mouseSpawnSafePadding);
    if(!(nearMouseX || nearMouseY)){
      tele.x = candidateX;
      tele.y = candidateY;
      placed = true;
      break;
    }
  }
  if(!placed){
    const anchors = [
      { x: OBSTACLE_FALLBACK_OFFSET, y: OBSTACLE_FALLBACK_OFFSET },
      { x: Math.max(OBSTACLE_EDGE_PADDING, width - OBSTACLE_FALLBACK_OFFSET), y: OBSTACLE_FALLBACK_OFFSET },
      { x: OBSTACLE_FALLBACK_OFFSET, y: Math.max(OBSTACLE_EDGE_PADDING, height - OBSTACLE_FALLBACK_OFFSET) },
      { x: Math.max(OBSTACLE_EDGE_PADDING, width - OBSTACLE_FALLBACK_OFFSET), y: Math.max(OBSTACLE_EDGE_PADDING, height - OBSTACLE_FALLBACK_OFFSET) }
    ];
    anchors.sort((a, b)=>{
      const da = Math.hypot(a.x - mouse.x, a.y - mouse.y);
      const db = Math.hypot(b.x - mouse.x, b.y - mouse.y);
      return db - da;
    });
    tele.x = anchors[0].x;
    tele.y = anchors[0].y;
  }
  tele.color = randomObstacleTone(shape);
  tele.motion = chooseObstacleMotion(shape, stage);
  tele.vx = 0;
  tele.vy = 0;
  if(tele.motion === 'horizontal') tele.vx = rand(80, 150) * (Math.random() < 0.5 ? -1 : 1);
  if(tele.motion === 'vertical') tele.vy = rand(80, 150) * (Math.random() < 0.5 ? -1 : 1);
  if(tele.motion === 'drift'){
    const ang = rand(0, Math.PI * 2);
    const sp = rand(40, 90) + deep * 8;
    tele.vx = Math.cos(ang) * sp;
    tele.vy = Math.sin(ang) * sp;
  }
  if(tele.motion === 'oscillate'){
    tele.vx = rand(60, 110) * (Math.random() < 0.5 ? -1 : 1);
    tele.vy = rand(40, 80) * (Math.random() < 0.5 ? -1 : 1);
    tele.phase = rand(0, Math.PI * 2);
  }
  tele.bounds = 24;
  obstacleTelegraphs.push(tele);
}

function advanceStage(){
  stage = Math.min(settings.maxStage || 6, stage + 1);
  nextStageTime += settings.stageDuration;
  // prepare a smooth ramp for difficulty (speed and spawn interval)
  const targetSpeed = speedMultiplier * 1.06;
  const targetSpawn = Math.max(160, settings.spawnBase * Math.pow(0.88, stage - 1));
  stageEase = {
    active: true,
    startElapsed: elapsed,
    duration: (difficulty === 'easy' ? 5.4 : 3.6),
    fromSpeed: speedMultiplier,
    toSpeed: targetSpeed,
    fromSpawn: spawnInterval,
    toSpawn: targetSpawn
  };
  if(settings.obstacleEnabled){
    settings.obstacleBaseInterval = Math.max(3.0, settings.obstacleBaseInterval * 0.88);
  }
  bossPending = false;
  if(bossTimerEl) bossTimerEl.classList.add('hidden');
  showRoundBanner('Round ' + stage);
}

function update(dt){
  if(paused) return;
  // move player directly with the mouse and track velocity for predictive aiming
  player.prevX = player.x; player.prevY = player.y;
  player.x = Math.max(player.r, Math.min(width - player.r, mouse.x));
  player.y = Math.max(player.r, Math.min(height - player.r, mouse.y));
  player.vx = (player.x - player.prevX) / Math.max(0.0001, dt);
  player.vy = (player.y - player.prevY) / Math.max(0.0001, dt);

  // update eased visual state for player (draw-only): tiny smoothing so visuals nearly match cursor
  // higher -> snappier (less smoothing), lower -> more eased motion
  const drawLerp = 0.90; // 0.90 = nearly identical to real cursor with a touch of smoothing
  drawPlayerX = lerp(drawPlayerX, player.x, drawLerp);
  drawPlayerY = lerp(drawPlayerY, player.y, drawLerp);
  const speed = Math.hypot(player.vx, player.vy);
  const targetAngle = Math.atan2(player.vy, player.vx) * 0.04; // reduced tilt magnitude to reduce wiggle
  drawPlayerAngle = lerp(drawPlayerAngle, targetAngle, 0.12);
  const targetScale = 1 + Math.min(0.12, speed / 6000);
  drawPlayerScale = lerp(drawPlayerScale, targetScale, 0.16);

  // update enemies
  for(let i=enemies.length-1;i>=0;i--){
    const e = enemies[i];
    e.phaseTimer += dt;
    if(e.type === 'homing' && e.phase === 1 && e.life != null && e.life >= e.homingTime * 0.75){ applyEnemyPhase(e); }
    if(e.type === 'shooter' && e.phase === 1 && (e.shotsFired || 0) >= 2){ applyEnemyPhase(e); }
    if(e.type === 'big' && e.phase === 1 && e.phaseTimer > 2.2){ applyEnemyPhase(e); }
    if(e.type === 'charger' && e.phase === 1 && e.phaseTimer > (e.warnDuration || 0.5)){ applyEnemyPhase(e); }
    // behavior by type
    if(e.type === 'homing'){
      // steer toward player but only for limited homingTime so they can still leave
      e.life = (e.life||0) + dt;
      const homingTime = e.homingTime || 1.2; // seconds
      if(e.life < homingTime){
        const desiredX = player.x - e.x;
        const desiredY = player.y - e.y;
        const len = Math.hypot(desiredX, desiredY) || 1;
        const nx = desiredX/len, ny = desiredY/len;
        const influence = Math.max(0.12, (homingTime - e.life) / homingTime);
        e.dx += (nx - e.dx) * Math.min(dt * (e.turnRate||0.9) * influence, 0.45);
        e.dy += (ny - e.dy) * Math.min(dt * (e.turnRate||0.9) * influence, 0.45);
        const nlen = Math.hypot(e.dx,e.dy)||1; e.dx/=nlen; e.dy/=nlen;
      }
      e.x += e.dx * e.speed * dt;
      e.y += e.dy * e.speed * dt;
    } else if(e.type === 'zigzag'){
      // base movement then add perpendicular sinus wave
      const perpX = -e.dy, perpY = e.dx; // perpendicular
      e.phase += e.freq * dt;
      e.x += e.dx * e.speed * dt + perpX * Math.sin(e.phase) * (e.amp/20);
      e.y += e.dy * e.speed * dt + perpY * Math.sin(e.phase) * (e.amp/20);
    } else if(e.type === 'shooter'){
      // move normally but periodically shoot toward player (predictive bursts)
      e.x += e.dx * e.speed * dt;
      e.y += e.dy * e.speed * dt;
      e.shootTimer -= dt;
      if(e.shootTimer <= 0){
        const bx = e.x, by = e.y;
        // predictive lead based on player's recent velocity
        const leadTime = 0.18 + stage * 0.03; // seconds
        const targetX = player.x + player.vx * leadTime;
        const targetY = player.y + player.vy * leadTime;
        const vx = (targetX - bx), vy = (targetY - by);
        const vlen = Math.hypot(vx,vy)||1;
        const speed = 220 + Math.random()*60 + stage*12;
        // burst count increases with stage
        const burst = 1 + Math.floor(stage/3);
        const spread = 0.14 + Math.min(0.5, stage*0.02);
        for(let bi=0; bi<burst; bi++){
          const ang = Math.atan2(vy, vx) + (bi - (burst-1)/2) * spread;
          bullets.push({ x: bx, y: by, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, r: 4, color: '#ffd972' });
        }
        e.shotsFired = (e.shotsFired || 0) + burst;
        e.shootTimer = e.shootInterval + rand(-0.2,0.2);
      }
    } else if(e.type === 'splitter'){
      // basic movement and split after short delay
      e.life = (e.life||0) + dt;
      e.x += e.dx * e.speed * dt;
      e.y += e.dy * e.speed * dt;
      if(e.life > 1.0){
        // split into two smaller fast enemies
        const count = 2;
        for(let s=0;s<count;s++){
          const ang = Math.atan2(e.dy,e.dx) + (s===0?0.6:-0.6) + rand(-0.2,0.2);
          const sp = e.speed * (1.1 + Math.random()*0.4);
          enemies.push({ x: e.x, y: e.y, dx: Math.cos(ang), dy: Math.sin(ang), r: Math.max(5, e.r*0.6), color: '#ff7aa2', type:'fast', speed: sp });
        }
        spawnParticles(e.x, e.y, 10, '#ff7aa2');
        enemies.splice(i,1);
        continue;
      }
    } else if(e.type === 'charger'){
      e.life = (e.life||0) + dt;
      if(e.warnTimer > 0){
        e.warnTimer -= dt;
        e.x += e.dx * (e.speed * 0.12) * dt;
        e.y += e.dy * (e.speed * 0.12) * dt;
      } else {
        e.x += (e.chargeDx || e.dx) * e.dashSpeed * dt;
        e.y += (e.chargeDy || e.dy) * e.dashSpeed * dt;
        if(e.phase === 2 && e.phaseTimer > 1.2){
          e.phase = 3;
          e.color = '#34d399';
          e.dashSpeed *= 1.12;
        }
      }
    } else {
      e.x += e.dx * e.speed * dt;
      e.y += e.dy * e.speed * dt;
    }
    // remove if far outside
    if(e.x < -120 || e.x > width+120 || e.y < -120 || e.y > height+120){
      // create a small particle burst when enemy exits
      spawnParticles(e.x, e.y, Math.max(6, Math.floor(e.r/2)), e.color);
      enemies.splice(i,1);
      // exponential scoring: use survivedCount to increase points
      survivedCount += 1;
      const basePoints = Math.max(1, Math.floor(Math.pow(1.05, survivedCount)));
      const points = Math.floor(basePoints * multiplier());
      score += points;
    }
  }

  if(bossPending && !bossActive){
    bossPendingTimer -= dt;
    if(enemies.length === 0){
      startBossFight();
    } else if(bossPendingTimer <= 0){
      clearActiveThreats();
      startBossFight();
    }
  }

  updateBoss(dt);

  // extra random chaos once the round advances: occasional split spawns and fast spawns
  if(!bossPending && !bossActive && stage >= 2 && Math.random() < 0.012 * stage && enemies.length < 42){
    spawnEnemy('chaos');
    if(stage >= 4 && Math.random() < 0.35) spawnEnemy('chaos');
  }

  // collision
  for(const e of enemies){
    if(squareCircleHit(player.x, player.y, player.r, e.x, e.y, e.r - 2)){ // collision
      // collision particle burst
      spawnParticles(player.x, player.y, 28, '#fff');
      endGame();
    }
  }

  if(bossActive && boss){
    if(squareCircleHit(player.x, player.y, player.r, boss.x, boss.y, boss.r - 2)){
      spawnParticles(player.x, player.y, 34, '#fff');
      endGame();
    }
  }

  // obstacle collisions (instant death)
  for(const o of obstacles){
    const halfW = (o.w || o.r*2) * 0.5;
    const halfH = (o.h || o.r*2) * 0.5;
    const rectHit = Math.abs(player.x - o.x) < halfW + player.r && Math.abs(player.y - o.y) < halfH + player.r;
    const circleHit = squareCircleHit(player.x, player.y, player.r, o.x, o.y, (o.r || 16) - 2);
    if(rectHit || circleHit){ spawnParticles(player.x, player.y, 28, '#fff'); endGame(); }
  }

  // update telegraphs and spawn when ready
  for(let i=telegraphs.length-1;i>=0;i--){
    const t = telegraphs[i];
    t.t -= dt*1000;
    t.alpha = Math.max(0.12, t.t/1000);
    if(t.t <= 0){
      // create enemy from telegraph location
      const side = t.side;
      let x,y,dx,dy;
      const spawnSize = rand(10,30);
      if(side===0){ x = -spawnSize; y = t.y; dx = rand(0.2,1); dy = rand(-0.4,0.4); }
      else if(side===1){ x = width+spawnSize; y = t.y; dx = rand(-1,-0.2); dy = rand(-0.4,0.4); }
      else if(side===2){ x = t.x; y = -spawnSize; dx = rand(-0.4,0.4); dy = rand(0.2,1); }
      else { x = t.x; y = height+spawnSize; dx = rand(-0.4,0.4); dy = rand(-1,-0.2); }
      const baseSpeed = rand(70,140) * speedMultiplier;
      const aimX = mouse.x - x;
      const aimY = mouse.y - y;
      const len = Math.hypot(aimX, aimY) || 1;
      dx = lerp(dx, aimX / len, 0.18);
      dy = lerp(dy, aimY / len, 0.18);
      const aimLen = Math.hypot(dx, dy) || 1;
      dx /= aimLen;
      dy /= aimLen;
      const roll = Math.random(); let type='straight';
      if(difficulty==='easy'){ if(roll<0.12) type='homing'; else if(roll<0.22) type='zigzag'; else if(stage >= 2 && roll > 0.9) type='fast'; }
      else if(difficulty==='normal'){ if(roll<0.32) type='homing'; else if(roll<0.48) type='zigzag'; else if(roll<0.68) type='fast'; else if(stage >= 4 && roll > 0.78) type='charger'; else if(stage >= 3 && roll > 0.86) type='shooter'; }
      else { if(roll<0.42) type='homing'; else if(roll<0.58) type='zigzag'; else if(roll<0.76) type='fast'; else if(roll<0.86) type='big'; else if(stage >= 2 && roll > 0.78) type='charger'; else if(stage >= 2) type='shooter'; }
      const teleSize = randomEnemySize(type, stage);
      const enemy = { x,y,dx,dy,r:teleSize,color:'#ef4444',type,speed:baseSpeed, life:0, shape: chooseEnemyShape(type, stage), reason: 'telegraph' };
      // linear scaling: make enemies stronger as stage/time increases
      const scaleFactor = 1 + (stage-1)*0.09 + Math.min(1, elapsed/40) * 0.30;
      enemy.speed *= scaleFactor;
      // stage-influenced upgrades (more variety)
      if(stage >= 2 && Math.random() < 0.18) { if(type === 'straight') type = 'shooter'; }
      if(stage >= 2 && Math.random() < 0.12) { type = 'splitter'; }
      if(stage >= 1 && Math.random() < 0.08) { type = 'dasher'; }
      if(stage >= 3 && Math.random() < 0.10) { type = 'charger'; }
      if(type==='homing'){ enemy.turnRate = rand(0.78,1.22) * (1 + (stage-1)*0.08); enemy.homingTime = Math.max(0.45, 1.0 + Math.random()*0.9 - (stage-1)*0.08); }
      if(type==='shooter'){ enemy.shootTimer = rand(0.35,1.1); enemy.shootInterval = Math.max(0.28, 0.86 - Math.min(0.4, stage*0.05)); enemy.color='#7c3aed'; }
      if(type==='dasher'){ enemy.warnTimer = 0.6 + Math.random()*0.8; enemy.warnDuration = Math.max(0.18, enemy.warnTimer * Math.max(0.38, 1 - (stage-1)*0.10)); enemy.dashSpeed = enemy.speed * (2.5 + stage*0.35); enemy.color = '#06b6d4'; }
      if(type==='zigzag'){ enemy.amp=rand(14,36); enemy.phase=rand(0,Math.PI*2); enemy.freq=rand(3,6); enemy.shape = Math.random() < 0.5 ? 'square' : 'diamond'; }
      if(type==='fast'){ enemy.speed*=1.6; enemy.r=Math.max(6,teleSize*0.75); enemy.color='#fb7185'; enemy.shape = 'triangle'; }
      if(type==='big'){ enemy.speed*=0.6; enemy.r=Math.max(22,teleSize*1.6); enemy.color='#f97316'; enemy.shape = 'hex'; }
      if(type==='charger'){
        enemy.shape = 'hex';
        // make telegraphed chargers more visible and easier to dodge
        enemy.r = Math.max(enemy.r, teleSize + 6);
        enemy.warnTimer = Math.max(0.9, 1.1 + Math.random() * 0.6 + stage * 0.04);
        enemy.warnDuration = Math.max(0.6, enemy.warnTimer * 0.95);
        enemy.dashSpeed = enemy.speed * Math.max(1.8, (2.2 + stage * 0.28));
        enemy.chargeLen = rand(200, 320) + stage * 14;
        enemy.color = '#22d3ee';
      }
      enemy.shape = chooseEnemyShape(type, stage);
      if(type==='zigzag'){ enemy.shape = Math.random() < 0.5 ? 'square' : 'diamond'; }
      if(type==='fast'){ enemy.shape = 'triangle'; }
      if(type==='big'){ enemy.shape = 'hex'; }
      if(type==='shooter'){ enemy.shape = 'diamond'; }
      if(type==='charger'){ enemy.shape = 'hex'; }
      if(type === 'splitter' && !enemy.reason) enemy.reason = 'telegraph';
      // respect hard cap when spawning from telegraphs
      if(enemies.length < (settings.enemyMax || 80)){
        enemies.push(enemy);
      }
      telegraphs.splice(i,1);
    }
  }

  // process obstacle telegraphs (spawn hazards after a brief telegraph)
  for(let i=obstacleTelegraphs.length-1;i>=0;i--){
    const t = obstacleTelegraphs[i];
    t.t -= dt*1000;
    if(t.t <= 0){
      // spawn obstacle that remains for a short duration
      const life = (settings.obstacleLifeBase || 1.6) + Math.random() * 1.2 + (stage-1) * 0.25;
      obstacles.push({
        x: t.x,
        y: t.y,
        life,
        maxLife: life,
        color: t.color || '#ff6b6b',
        shape: t.shape,
        w: t.w,
        h: t.h,
        r: Math.max(t.w, t.h) * 0.5
        ,motion: t.motion,
        vx: (t.motion === 'static' ? 0 : (t.vx || 0)),
        vy: (t.motion === 'static' ? 0 : (t.vy || 0)),
        phase: t.phase || 0,
        bounds: t.bounds || 24
      });
      obstacleTelegraphs.splice(i,1);
    }
  }

  // update elapsed time
  if(!bossPending && !bossActive){
    elapsed += dt;
    // stage progression stops at the end of the stage until the board is cleared
    if(elapsed >= nextStageTime){
      beginStageEnd();
    }
  }

  // update obstacles (life countdown)
  for(let i=obstacles.length-1;i>=0;i--){
    const o = obstacles[i];
    if(o.motion === 'horizontal'){
      o.x += o.vx * dt;
      if(o.x < o.bounds || o.x > width - o.bounds){ o.vx *= -1; }
    } else if(o.motion === 'vertical'){
      o.y += o.vy * dt;
      if(o.y < o.bounds || o.y > height - o.bounds){ o.vy *= -1; }
    } else if(o.motion === 'drift'){
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      if(o.x < o.bounds || o.x > width - o.bounds){ o.vx *= -1; }
      if(o.y < o.bounds || o.y > height - o.bounds){ o.vy *= -1; }
    } else if(o.motion === 'oscillate'){
      o.phase += dt * 4;
      o.x += o.vx * dt;
      o.y += o.vy * dt + Math.sin(o.phase) * 14 * dt;
      if(o.x < o.bounds || o.x > width - o.bounds){ o.vx *= -1; }
      if(o.y < o.bounds || o.y > height - o.bounds){ o.vy *= -1; }
    }
    o.life -= dt;
    if(o.life <= 0) obstacles.splice(i,1);
  }

  // bullets update
  for(let i=bullets.length-1;i>=0;i--){
    const b = bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    // collision with player
    if(squareCircleHit(player.x, player.y, player.r, b.x, b.y, b.r)){ spawnParticles(player.x, player.y, 12, '#fff'); endGame(); }
    if(b.x < -40 || b.x > width+40 || b.y < -40 || b.y > height+40) bullets.splice(i,1);
  }
}

// update HUD difficulty stage/progress indicator
const diffStageEl = document.getElementById('diff-stage');
const diffProgressEl = document.getElementById('diff-progress');

function draw(){
  // background gradient
  const g = ctx.createLinearGradient(0,0,0,height);
  g.addColorStop(0,'#021029');
  g.addColorStop(1,'#071028');
  ctx.fillStyle = g;
  ctx.fillRect(0,0,width,height);

  // subtle moving stars (parallax-ish)
  ctx.fillStyle = 'rgba(255,255,255,0.02)';
  for(let i=0;i<40;i++){
    const sx = (i*73 + Date.now()/20) % width;
    const sy = (i*97 + Date.now()/37) % height;
    ctx.fillRect(sx, sy, 1,1);
  }

  // particles
  for(let i = particles.length-1; i>=0; i--){
    const p = particles[i];
    p.x += p.vx; p.y += p.vy; p.life -= 1;
    ctx.globalAlpha = Math.max(0, p.life/ p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha = 1;
    if(p.life <= 0) particles.splice(i,1);
  }

  // telegraph visuals
  for(const t of telegraphs){
    const a = Math.max(0.12, t.t/1000);
    ctx.globalAlpha = 0.9 * a;
    ctx.fillStyle = 'rgba(255,200,90,0.9)';
    ctx.beginPath();
    if(t.side===0){ ctx.moveTo(6, t.y); ctx.lineTo(22, t.y-10); ctx.lineTo(22, t.y+10); }
    else if(t.side===1){ ctx.moveTo(width-6, t.y); ctx.lineTo(width-22, t.y-10); ctx.lineTo(width-22, t.y+10); }
    else if(t.side===2){ ctx.moveTo(t.x,6); ctx.lineTo(t.x-10,22); ctx.lineTo(t.x+10,22); }
    else { ctx.moveTo(t.x,height-6); ctx.lineTo(t.x-10,height-22); ctx.lineTo(t.x+10,height-22); }
    ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
  }

  // obstacle telegraphs (soft red pulsing markers)
  for(const t of obstacleTelegraphs){
    const teleDur = settings.obstacleTeleTime || 520;
    // progress 0->1 as telegraph advances
    const prog = Math.min(1, Math.max(0, 1 - (t.t / teleDur)));
    const easedProg = easeInOutCubic(prog);
    const fillAlpha = 0.12 + easedProg * 0.78; // gentle ease-in for telegraph fill
    ctx.globalAlpha = fillAlpha;
    ctx.fillStyle = t.color || 'rgba(255,120,120,0.9)';
    if(t.shape === 'rect-h' || t.shape === 'bar' || t.shape === 'rect-v' || t.shape === 'square'){
      ctx.fillRect(t.x - t.w/2, t.y - t.h/2, t.w, t.h);
    } else {
      ctx.beginPath(); ctx.arc(t.x, t.y, 18, 0, Math.PI*2); ctx.fill();
    }
    // dashed outline warning ~1s before spawn (if telegraph duration allows)
    // show dashed warning for the entire telegraph duration (gives full warning time)
    const warnThresholdMs = teleDur;
    if(t.t < warnThresholdMs){
      ctx.save();
      const p = Math.min(1, Math.max(0, 1 - (t.t / warnThresholdMs)));
      const eased = easeInOutCubic(p);
      const warnAlpha = 0.15 + eased * 0.85;
      ctx.globalAlpha = warnAlpha;
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8,6]);
      if(t.shape === 'rect-h' || t.shape === 'bar' || t.shape === 'rect-v' || t.shape === 'square'){
        ctx.strokeRect(t.x - t.w/2 - 4, t.y - t.h/2 - 4, t.w + 8, t.h + 8);
      } else { ctx.beginPath(); ctx.arc(t.x, t.y, 22, 0, Math.PI*2); ctx.stroke(); }
      ctx.setLineDash([]);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  // draw active obstacles
  for(const o of obstacles){
    // smoother fade-in/out for obstacle appearance
    const teleSec = (settings.obstacleTeleTime || 360) / 1000;
    const fadeDur = Math.max(1.2, teleSec * 1.35);
    const maxLife = o.maxLife || Math.max(1, settings.obstacleLifeBase || 1.6);
    const timeSinceSpawn = Math.max(0, maxLife - o.life);
    const inNorm = Math.min(1, Math.max(0, timeSinceSpawn / fadeDur));
    const outNorm = Math.min(1, Math.max(0, o.life / fadeDur));
    const fadeIn = easeInOutCubic(inNorm);
    const fadeOut = easeInOutCubic(outNorm);
    const alphaFade = Math.min(1, Math.max(fadeIn, fadeOut));
    ctx.globalAlpha = Math.max(0.12, alphaFade);
    ctx.fillStyle = o.color || '#ff6b6b';
    if(o.shape === 'rect-h' || o.shape === 'bar' || o.shape === 'rect-v' || o.shape === 'square'){
      ctx.fillRect(o.x - o.w/2, o.y - o.h/2, o.w, o.h);
    } else {
      ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI*2); ctx.fill();
    }
    // dashed outline ~1s before despawn
    const despawnWarn = 1.0; // seconds
    if(o.life < despawnWarn){
      ctx.save();
      const p = Math.max(0, 1 - (o.life / despawnWarn));
      const eased = easeInOutCubic(Math.min(1, Math.max(0, p)));
      ctx.globalAlpha = 0.18 + eased * 0.82;
      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8,6]);
      if(o.shape === 'rect-h' || o.shape === 'bar' || o.shape === 'rect-v' || o.shape === 'square'){
        ctx.strokeRect(o.x - o.w/2 - 4, o.y - o.h/2 - 4, o.w + 8, o.h + 8);
      } else { ctx.beginPath(); ctx.arc(o.x, o.y, (o.r || 16) + 6, 0, Math.PI*2); ctx.stroke(); }
      ctx.setLineDash([]);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  if(debugMode){
    for(const t of obstacleTelegraphs){
      drawDebugObstacleHitbox(t);
    }
    for(const o of obstacles){
      drawDebugObstacleHitbox(o);
    }
    if(bossActive && boss){
      drawDebugEnemyHitbox(boss);
    }
  }

  // draw player as a smoothed square (visual only)
  ctx.save();
  ctx.translate(drawPlayerX, drawPlayerY);
  ctx.rotate(drawPlayerAngle);
  ctx.scale(drawPlayerScale, drawPlayerScale);
  ctx.fillStyle = player.color;
  ctx.fillRect(-player.r, -player.r, player.r * 2, player.r * 2);
  ctx.restore();
  // debug: show exact hitbox (based on actual player.x/y) and mouse position
  if(debugMode){
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1.6;
    ctx.setLineDash([6,4]);
    ctx.strokeRect(player.x - player.r, player.y - player.r, player.r*2, player.r*2);
    ctx.setLineDash([]);
    // small crosshair for mouse
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath(); ctx.moveTo(mouse.x-6, mouse.y); ctx.lineTo(mouse.x+6, mouse.y); ctx.moveTo(mouse.x, mouse.y-6); ctx.lineTo(mouse.x, mouse.y+6); ctx.stroke();
    ctx.restore();
  }

  // draw enemies
  for(const e of enemies){
    // draw shape based on type/shape attribute
    ctx.fillStyle = e.color;
    ctx.beginPath();
    if(e.type === 'charger' && e.warnTimer > 0){
      const dx = (e.chargeDx || e.dx || 1);
      const dy = (e.chargeDy || e.dy || 0);
      const len = Math.hypot(dx, dy) || 1;
      const nx = dx / len;
      const ny = dy / len;
      const total = e.chargeLen || 220;
      ctx.save();
      // smooth warn alpha based on remaining warnTimer using easing
      const totalWarn = e.warnDuration || 0.9;
      const prog = Math.min(1, Math.max(0, 1 - (e.warnTimer / totalWarn)));
      const eased = easeInOutCubic(prog);
      const drawAlpha = Math.min(0.95, 0.2 + eased * 0.9);
      ctx.globalAlpha = drawAlpha;
      ctx.strokeStyle = 'rgba(34,211,238,1)';
      ctx.lineWidth = 6;
      ctx.setLineDash([6, 9]);
      ctx.beginPath();
      ctx.moveTo(e.x, e.y);
      ctx.lineTo(e.x + nx * total, e.y + ny * total);
      ctx.stroke();
      ctx.setLineDash([]);
      // emphasized outline for visibility
      ctx.beginPath(); ctx.arc(e.x, e.y, Math.max(10, e.r + 8), 0, Math.PI*2); ctx.strokeStyle = 'rgba(34,211,238,0.28)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
      ctx.globalAlpha = drawAlpha * 0.95;
      ctx.fillStyle = 'rgba(34,211,238,0.18)';
      ctx.beginPath();
      ctx.moveTo(e.x + ny * 14, e.y - nx * 14);
      ctx.lineTo(e.x + nx * total, e.y + ny * total);
      ctx.lineTo(e.x - ny * 14, e.y + nx * 14);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    if(e.type === 'dasher' && e.warnTimer > 0){
      // draw flashing warning cone in facing direction
      const alphaPulse = 0.4 + 0.6 * Math.abs(Math.sin(Date.now() / Math.max(80, e.warnTimer*200)));
      const warnAlpha = Math.min(1, Math.max(0.08, (1 - e.warnTimer / e.warnDuration))) * alphaPulse;
      ctx.globalAlpha = warnAlpha;
      ctx.fillStyle = 'rgba(6,182,212,0.28)';
      // approximate cone: triangle forward
      const len = Math.max(40, e.r * 6 + (1 - e.warnTimer/e.warnDuration)*40);
      const dirX = e.dx || 1, dirY = e.dy || 0;
      const perpX = -dirY, perpY = dirX;
      const cx = e.x + dirX * (e.r + 4);
      const cy = e.y + dirY * (e.r + 4);
      ctx.beginPath();
      ctx.moveTo(cx + perpX * (e.r*0.6), cy + perpY * (e.r*0.6));
      ctx.lineTo(cx + dirX * len, cy + dirY * len);
      ctx.lineTo(cx - perpX * (e.r*0.6), cy - perpY * (e.r*0.6));
      ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
      // draw enemy body
      ctx.beginPath(); ctx.arc(e.x,e.y,e.r,0,Math.PI*2); ctx.fillStyle = e.color; ctx.fill();
    } else if(e.shape === 'square'){
      ctx.save(); ctx.translate(e.x,e.y); ctx.rotate((e.life||0)*0.6); ctx.fillRect(-e.r,-e.r,e.r*2,e.r*2); ctx.restore();
    } else if(e.shape === 'diamond'){
      ctx.moveTo(e.x, e.y - e.r);
      ctx.lineTo(e.x + e.r, e.y);
      ctx.lineTo(e.x, e.y + e.r);
      ctx.lineTo(e.x - e.r, e.y);
      ctx.closePath(); ctx.fill();
    } else if(e.shape === 'triangle' || e.type === 'splitter'){
      // draw triangle for splitter / triangle-shaped enemies
      ctx.moveTo(e.x + e.r, e.y);
      ctx.lineTo(e.x - e.r*0.9, e.y - e.r*0.85);
      ctx.lineTo(e.x - e.r*0.9, e.y + e.r*0.85);
      ctx.closePath(); ctx.fill();
    } else if(e.shape === 'hex'){
      ctx.moveTo(e.x + e.r, e.y);
      for(let k=1;k<6;k++){
        const ang = (Math.PI*2/6)*k;
        ctx.lineTo(e.x + Math.cos(ang)*e.r, e.y + Math.sin(ang)*e.r);
      }
      ctx.closePath(); ctx.fill();
    } else if(e.type === 'shooter'){
      // star-like circle
      ctx.arc(e.x, e.y, e.r, 0, Math.PI*2);
      ctx.fill();
      ctx.beginPath(); ctx.strokeStyle='rgba(255,255,255,0.08)'; ctx.lineWidth=1.2; ctx.stroke();
    } else {
      ctx.arc(e.x, e.y, e.r, 0, Math.PI*2);
      ctx.fill();
    }
    // // small eye/direction marker
    // ctx.beginPath();
    // ctx.fillStyle = 'rgba(255,255,255,0.8)';
    // ctx.arc(e.x + (e.dx||0)* (e.r*0.35), e.y + (e.dy||0)*(e.r*0.35), Math.max(1, e.r*0.18), 0, Math.PI*2);
    // ctx.fill();
    // // difficulty marker glow for higher stages
    // if(stage >= 3){ ctx.beginPath(); ctx.strokeStyle = 'rgba(255,80,80,0.12)'; ctx.lineWidth = Math.min(6, stage); ctx.arc(e.x, e.y, e.r+4,0,Math.PI*2); ctx.stroke(); }

    if(debugMode){
      const label = enemyDebugText(e);
      ctx.save();
      ctx.font = '11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      const padX = 6;
      const padY = 4;
      const textWidth = ctx.measureText(label).width;
      const boxW = textWidth + padX * 2;
      const boxH = 18;
      const boxX = e.x - boxW / 2;
      const boxY = e.y - e.r - 12 - boxH;
      ctx.fillStyle = 'rgba(2,6,23,0.85)';
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#e6eef8';
      ctx.fillText(label, e.x, boxY + boxH - 5);
      ctx.restore();
      drawDebugEnemyHitbox(e);
    }
  }

  if(bossActive && boss){
    ctx.save();
    ctx.translate(boss.x, boss.y);
    ctx.rotate(Math.sin(boss.jitter) * 0.25);
    ctx.fillStyle = boss.color;
    ctx.beginPath();
    ctx.moveTo(0, -boss.r);
    for(let k=1;k<6;k++){
      const ang = (Math.PI * 2 / 6) * k;
      const wobble = 1 + Math.sin(boss.jitter + k) * 0.08;
      ctx.lineTo(Math.cos(ang) * boss.r * wobble, Math.sin(ang) * boss.r * wobble);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.globalAlpha = 0.18;
    ctx.beginPath();
    ctx.arc(0, 0, boss.r + 10 + Math.sin(boss.jitter * 1.8) * 2, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();
  }

  // draw bullets
  for(const b of bullets){ ctx.beginPath(); ctx.fillStyle = b.color; ctx.arc(b.x,b.y,b.r,0,Math.PI*2); ctx.fill(); }
}

function multiplier(){
  // gentler growth and cap to keep scores reasonable (cap from settings)
  const timeFactor = Math.pow(1.002, elapsed); // very gentle
  const survFactor = 1 + (survivedCount * 0.0015);
  const raw = timeFactor * survFactor;
  return Math.min(settings.multCap, +(raw).toFixed(3));
}



function loop(ts){
  if(!lastTime) lastTime = ts;
  const dt = (ts - lastTime)/1000; // seconds
  lastTime = ts;

  _fpsFrames += 1;
  if(!_fpsLast) _fpsLast = ts;
  if(ts - _fpsLast >= 1000){
    fps = (_fpsFrames * 1000) / (ts - _fpsLast);
    _fpsFrames = 0;
    _fpsLast = ts;
  }

  if(running){
    // apply stage easing if active (smoothly ramp speed and spawn interval)
    if(stageEase && stageEase.active){
      const t = Math.max(0, Math.min(1, (elapsed - stageEase.startElapsed) / stageEase.duration));
      const eT = easeInOutCubic(t);
      speedMultiplier = lerp(stageEase.fromSpeed, stageEase.toSpeed, eT);
      spawnInterval = lerp(stageEase.fromSpawn, stageEase.toSpawn, eT);
      if(t >= 1){ stageEase.active = false; stageEase = null; }
    } else {
      // gradual global ramp when not in a stage transition — slower on easy
      const growth = (difficulty === 'easy') ? 0.012 : (difficulty === 'hard' ? 0.045 : 0.028);
      speedMultiplier += dt * growth;
    }
    // spawn control
    if(!(debugMode && debugSandboxMode) && !bossPending && !bossActive){
      lastSpawn += dt*1000;
      if(lastSpawn > spawnInterval){
        lastSpawn = 0;
        scheduleSpawn();
        if(stage >= 3 && Math.random() < Math.min(0.65, 0.14 * stage)){ scheduleSpawn(); }
      }
    }
    // obstacle scheduling
    if(!(debugMode && debugSandboxMode) && !bossPending && !bossActive){
      lastObstacleSpawn += dt;
      if(settings.obstacleEnabled && lastObstacleSpawn > Math.max(2.8, settings.obstacleBaseInterval - stage * 0.35)){
        lastObstacleSpawn = 0;
        scheduleObstacle();
        if(stage >= 4 && Math.random() < 0.45) scheduleObstacle();
      }
    }
    // difficulty ramp: spawn acceleration slower on easy
    const spawnDecay = (difficulty === 'easy') ? 8 : (difficulty === 'hard' ? 24 : 14);
    if(!bossPending && !bossActive) spawnInterval = Math.max(220, spawnInterval - dt * spawnDecay);

    update(dt);
    draw();
    // update score/UI (throttled)
    if(Date.now() - _lastDOM > 140){
      scoreEl.textContent = 'Score: ' + score;
      const mul = multiplier();
      multEl.textContent = 'Multiplier: x' + mul.toFixed(2);
      timeEl.textContent = 'Time: ' + elapsed.toFixed(1) + 's';
      if(bossTimerEl){
        if(bossActive){
          bossTimerEl.classList.remove('hidden');
          bossTimerEl.textContent = 'Boss: ' + Math.max(0, bossTimer).toFixed(1) + 's';
        } else {
          bossTimerEl.classList.add('hidden');
        }
      }
      // difficulty stage UI
      if(diffStageEl) diffStageEl.textContent = String(stage);
      if(diffProgressEl) {
        const prevStageStart = nextStageTime - settings.stageDuration;
        const prog = Math.min(1, Math.max(0, (elapsed - prevStageStart) / settings.stageDuration));
        diffProgressEl.style.width = (prog*100) + '%';
      }
      _lastDOM = Date.now();
    }
    ensureParticleCap();
  }

  updateDebugPanel();

  requestAnimationFrame(loop);
}

function startGame(){
  // reset state fully to avoid carry-over between runs
  enemies = [];
  bullets = [];
  particles = [];
  telegraphs = [];
  obstacles = [];
  obstacleTelegraphs = [];
  lastObstacleSpawn = 0;
  lastSpawn = 0;
  spawnInterval = Math.max(160, (settings.spawnBase || 1200) * 0.92);
  lastTime = 0;
  score = 0;
  survivedCount = 0;
  elapsed = 0;
  stage = 1;
  nextStageTime = settings.stageDuration;
  speedMultiplier = 1;
  boss = null;
  bossActive = false;
  bossPending = false;
  bossPendingTimer = 0;
  bossTimer = 0;
  running = true;
  overlay.classList.add('hidden');
  startScreen.classList.add('hidden');
  overlayTitle.textContent = 'Game Over';
  overlayScore.textContent = '';
  // hide restart until next game over
  if(restartBtn) restartBtn.style.display = 'none';
  if(restartBtn) restartBtn.textContent = 'Play Again';
  showRoundBanner('Round 1');
  updateDebugPanel();
}

function endGame(){
  running = false;
  overlay.classList.remove('hidden');
  overlayTitle.textContent = 'Game Over';
  overlayScore.textContent = 'Score: ' + score;
  if(restartBtn) restartBtn.textContent = 'Play Again';
  if(restartBtn) restartBtn.style.display = 'inline-block';
  if(score > best){ best = score; localStorage.setItem('md_best', best); bestEl.textContent = 'Best: ' + best; }
  updateDebugPanel();
}

canvas.addEventListener('click', ()=>{ if(!running) startGame(); });
restartBtn.addEventListener('click', ()=> startGame());
startBtn.addEventListener('click', ()=> startGame());

// difficulty selector wiring
diffBtns.forEach(b=> b.addEventListener('click', ()=>{
  diffBtns.forEach(x=> x.classList.remove('selected'));
  b.classList.add('selected');
  difficulty = b.dataset.diff;
  // adjust base values for difficulty
  if(difficulty === 'easy'){ settings.spawnBase = Math.max(600, settings.spawnBase) || 1400; speedMultiplier = 0.9; }
  else if(difficulty === 'normal'){ settings.spawnBase = Math.max(500, settings.spawnBase) || 1100; speedMultiplier = 1.0; }
  else { settings.spawnBase = Math.max(400, settings.spawnBase) || 900; speedMultiplier = 1.15; }
}));

// Settings UI wiring
const settingsModal = document.getElementById('settings');
const openSettingsStart = document.getElementById('openSettingsStart');
const openSettingsEnd = document.getElementById('openSettingsEnd');
const closeSettings = document.getElementById('closeSettings');
const applySettings = document.getElementById('applySettings');
const inputStageDuration = document.getElementById('setting-stage-duration');
const inputMultCap = document.getElementById('setting-mult-cap');
const inputSpawnBase = document.getElementById('setting-spawn-base');

function showSettings(){
  // populate
  inputStageDuration.value = settings.stageDuration;
  inputMultCap.value = settings.multCap;
  inputSpawnBase.value = settings.spawnBase;
  settingsModal.classList.remove('hidden');
}
function hideSettings(){ settingsModal.classList.add('hidden'); }
if(openSettingsStart) openSettingsStart.addEventListener('click', ()=> showSettings());
if(openSettingsEnd) openSettingsEnd.addEventListener('click', ()=> showSettings());
if(closeSettings) closeSettings.addEventListener('click', ()=> hideSettings());
if(applySettings) applySettings.addEventListener('click', ()=>{
  // apply and close
  settings.stageDuration = Math.max(5, Number(inputStageDuration.value) || settings.stageDuration);
  settings.multCap = Math.max(1, Number(inputMultCap.value) || settings.multCap);
  settings.spawnBase = Math.max(200, Number(inputSpawnBase.value) || settings.spawnBase);
  hideSettings();
});

// apply initial difficulty defaults into settings to match selected button
if(difficulty === 'easy'){ settings.spawnBase = 1000; speedMultiplier = 1.0; }
else if(difficulty === 'normal'){ settings.spawnBase = 850; speedMultiplier = 1.05; }
else { settings.spawnBase = 700; speedMultiplier = 1.12; }

// start the loop
requestAnimationFrame(loop);

// Small accessibility: start paused until click
overlay.classList.add('hidden');
startScreen.classList.remove('hidden');
overlayTitle.textContent = 'Game Over';
overlayScore.textContent = '';
