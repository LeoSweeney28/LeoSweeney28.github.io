let bannerTimer = null;

export function createDebugPanel(document){
  const panel = document.createElement('div');
  panel.className = 'debug-panel hidden';
  panel.innerHTML = [
    '<div class="debug-panel-header"><strong>DEBUG MENU</strong><span id="debug-mode-badge" class="debug-mode-badge">inactive</span></div>',
    '<div>Stage: <span id="debug-stage-value">1</span> / <span id="debug-max-stage-value">6</span></div>',
    '<div>Enemies: <span id="debug-enemies-value">0</span></div>',
    '<div>Enemy cap: <span id="debug-enemy-cap-value">0</span></div>',
    '<div>Obstacles: <span id="debug-obstacles-value">0</span></div>',
    '<div>Spawn: <span id="debug-spawn-value">0ms</span></div>',
    '<div>Obstacle spawn: <span id="debug-obstacle-spawn-value">0.0s</span></div>',
    '<div>Sandbox: <span id="debug-sandbox-value">off</span></div>',
    '<div>Invulnerable: <span id="debug-invulnerable-value">off</span></div>',
    '<div>Path lines: <span id="debug-path-lines-value">off</span></div>',
    '<div class="debug-spawn-label">Spawn enemies</div>',
    '<div class="debug-spawn-grid">' + [
      ['straight', 'Straight'],
      ['homing', 'Homing'],
      ['zigzag', 'Zigzag'],
      ['fast', 'Fast'],
      ['big', 'Big'],
      ['charger', 'Charger'],
      ['shooter', 'Shooter'],
      ['splitter', 'Splitter'],
      ['dasher', 'Dasher'],
      ['phaser', 'Phaser']
    ].map(([type, label]) => '<button class="debug-spawn-btn" type="button" data-debug-spawn-type="' + type + '">' + label + '</button>').join('') + '</div>',
    '<div class="debug-menu-actions">' +
      '<button class="debug-menu-btn" type="button" data-debug-action="menu">Main Menu</button>' +
      '<button class="debug-menu-btn" type="button" data-debug-action="clear">Clear Enemies</button>' +
      '<button class="debug-menu-btn" type="button" data-debug-action="sandbox"><span id="debug-sandbox-action-label">Enter Sandbox</span></button>' +
      '<button class="debug-menu-btn" type="button" data-debug-action="invulnerable"><span id="debug-invulnerable-action-label">Invulnerable: Off</span></button>' +
      '<button class="debug-menu-btn" type="button" data-debug-action="pathlines"><span id="debug-path-lines-action-label">Path Lines: Off</span></button>' +
    '</div>',
    '<div class="debug-panel-note">Enemy spawns appear in the arena center while sandbox mode is active.</div>',
    '<div>FPS: <span id="debug-fps-value">0</span></div>',
    '<div>Speed mult: <span id="debug-speed-value">1.00</span></div>',
    '<div>Player vel: <span id="debug-player-value">0, 0</span></div>',
    '<div>Paused: <span id="debug-paused-value">no</span></div>'
  ].join('');
  document.body.appendChild(panel);
  return panel;
}
 
export function updateDebugPanel({
  panel,
  debugMode,
  settings,
  stage,
  enemies,
  obstacles,
  obstacleTelegraphs,
  spawnInterval,
  debugSandboxMode,
  debugInvulnerable,
  debugPathLines,
  fps,
  speedMultiplier,
  player,
  paused
}){
  if(!panel) {return;}
  if(!debugMode){
    panel.classList.add('hidden');
    panel.style.display = 'none';
    // ensure panel does not retain forced pointer/z-index when hidden
    try { panel.style.pointerEvents = ''; panel.style.zIndex = ''; } catch (e) { void e; }
    return;
  }
  panel.classList.remove('hidden');
  panel.style.display = 'block';
  // Force pointer interaction and make sure debug chrome sits above overlays
  try { panel.style.pointerEvents = 'auto'; panel.style.zIndex = '9999'; } catch (e) { void e; }
  const obstacleCount = obstacles.length + obstacleTelegraphs.length;
  const stageValue = panel.querySelector('#debug-stage-value');
  const maxStageValue = panel.querySelector('#debug-max-stage-value');
  const enemyValue = panel.querySelector('#debug-enemies-value');
  const enemyCapValue = panel.querySelector('#debug-enemy-cap-value');
  const obstacleValue = panel.querySelector('#debug-obstacles-value');
  const spawnValue = panel.querySelector('#debug-spawn-value');
  const obstacleSpawnValue = panel.querySelector('#debug-obstacle-spawn-value');
  const sandboxValue = panel.querySelector('#debug-sandbox-value');
  const sandboxActionLabel = panel.querySelector('#debug-sandbox-action-label');
  const invulnerableValue = panel.querySelector('#debug-invulnerable-value');
  const invulnerableActionLabel = panel.querySelector('#debug-invulnerable-action-label');
  const pathLinesValue = panel.querySelector('#debug-path-lines-value');
  const pathLinesActionLabel = panel.querySelector('#debug-path-lines-action-label');
  const modeBadge = panel.querySelector('#debug-mode-badge');
  const fpsValue = panel.querySelector('#debug-fps-value');
  const speedValue = panel.querySelector('#debug-speed-value');
  const playerValue = panel.querySelector('#debug-player-value');
  const pausedValue = panel.querySelector('#debug-paused-value');

  if(stageValue) { stageValue.textContent = String(stage); }
  if(maxStageValue) { maxStageValue.textContent = String(settings.maxStage || 6); }
  if(enemyValue) { enemyValue.textContent = String(enemies.length); }
  if(enemyCapValue) { enemyCapValue.textContent = String(settings.enemyMax || 0); }
  if(obstacleValue) { obstacleValue.textContent = String(obstacleCount); }
  if(spawnValue) { spawnValue.textContent = Math.round(spawnInterval) + 'ms'; }
  if(obstacleSpawnValue) { obstacleSpawnValue.textContent = Number(settings.obstacleBaseInterval || 0).toFixed(1) + 's'; }
  if(sandboxValue) { sandboxValue.textContent = debugSandboxMode ? 'on' : 'off'; }
  if(sandboxActionLabel) { sandboxActionLabel.textContent = debugSandboxMode ? 'Exit Sandbox' : 'Enter Sandbox'; }
  if(invulnerableValue) { invulnerableValue.textContent = debugInvulnerable ? 'on' : 'off'; }
  if(invulnerableActionLabel) { invulnerableActionLabel.textContent = debugInvulnerable ? 'Invulnerable: On' : 'Invulnerable: Off'; }
  if(pathLinesValue) { pathLinesValue.textContent = debugPathLines ? 'on' : 'off'; }
  if(pathLinesActionLabel) { pathLinesActionLabel.textContent = debugPathLines ? 'Path Lines: On' : 'Path Lines: Off'; }
  if(modeBadge) {
    modeBadge.textContent = debugSandboxMode ? 'sandbox' : 'debug';
    modeBadge.classList.toggle('active', !!debugSandboxMode);
  }
  if(fpsValue) { fpsValue.textContent = fps.toFixed(0); }
  if(speedValue) { speedValue.textContent = speedMultiplier.toFixed(2); }
  if(playerValue) { playerValue.textContent = player.vx.toFixed(0) + ', ' + player.vy.toFixed(0); }
  if(pausedValue) { pausedValue.textContent = paused ? 'yes' : 'no'; }
}

export function setDebugChromeVisible(document, visible){
  if(!document || !document.body) { return; }
  document.body.classList.toggle('debug-ui-active', !!visible);
  const devControls = document.getElementById('dev-controls');
  if(devControls){
    devControls.classList.toggle('hidden', !visible);
  }
}

export function showRoundBanner(document, text){
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
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(()=>{ banner.style.opacity = '0'; }, 1400);
}

export function drawDebugEnemyHitbox(ctx, enemy){
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
  } else if(enemy.shape === 'circle' || enemy.type === 'phaser'){
    // Draw a circular wireframe for circle-shaped enemies and phasers
    ctx.beginPath();
    const r = Math.max(enemy.r, pad);
    ctx.arc(enemy.x, enemy.y, r, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.strokeRect(enemy.x - pad, enemy.y - pad, pad * 2, pad * 2);
  }
  ctx.restore();
}

export function drawDebugObstacleHitbox(ctx, obstacle){
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
