let bannerTimer = null;

export function createDebugPanel(document){
  const panel = document.createElement('div');
  panel.className = 'debug-panel hidden';
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
  fps,
  speedMultiplier,
  player,
  paused
}){
  if(!panel) {return;}
  if(!debugMode){
    panel.classList.add('hidden');
    panel.style.display = 'none';
    return;
  }
  panel.classList.remove('hidden');
  panel.style.display = 'block';
  const obstacleCount = obstacles.length + obstacleTelegraphs.length;
  panel.innerHTML = [
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
