import { easeInOutCubic, lerp, rand, squareCircleHit } from '../core/utils.js';
import { waveDifficulty } from '../systems/scaling.js';

export function createUpdateGame({
  state,
  settings,
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
}){
  return function update(dt){
    if(state.paused) {return;}
    const sandboxActive = state.debugMode && state.debugSandboxMode;
    const playerInvulnerable = state.debugMode && state.debugInvulnerable;

    const { player, mouse } = state;
    player.prevX = player.x;
    player.prevY = player.y;
    player.x = Math.max(player.r, Math.min(state.width - player.r, mouse.x));
    player.y = Math.max(player.r, Math.min(state.height - player.r, mouse.y));
    player.vx = (player.x - player.prevX) / Math.max(0.0001, dt);
    player.vy = (player.y - player.prevY) / Math.max(0.0001, dt);

    const drawLerp = 0.90;
    state.drawPlayerX = lerp(state.drawPlayerX, player.x, drawLerp);
    state.drawPlayerY = lerp(state.drawPlayerY, player.y, drawLerp);
    const speed = Math.hypot(player.vx, player.vy);
    const targetAngle = Math.atan2(player.vy, player.vx) * 0.04;
    state.drawPlayerAngle = lerp(state.drawPlayerAngle, targetAngle, 0.12);
    const targetScale = 1 + Math.min(0.12, speed / 6000);
    state.drawPlayerScale = lerp(state.drawPlayerScale, targetScale, 0.16);

    if(sandboxActive){
      state.bossPending = false;
      state.bossActive = false;
      state.boss = null;
      state.bossTimer = 0;
      state.bossPendingTimer = 0;
      state.bossSpawnTele = null;
    }

    if(!state.enemiesPaused){
    for(let i=state.enemies.length-1;i>=0;i--){
      const e = state.enemies[i];
      e.phaseTimer += dt;
      if(e.safeTime && e.safeTime > 0){ e.safeTime = Math.max(0, e.safeTime - dt); }
      if(e.type === 'homing' && e.phase === 1 && e.life !== null && e.life >= e.homingTime * 0.75){ applyEnemyPhase(e); }
      if(e.type === 'shooter' && e.phase === 1 && (e.shotsFired || 0) >= 2){ applyEnemyPhase(e); }
      if(e.type === 'big' && e.phase === 1 && e.phaseTimer > 2.2){ applyEnemyPhase(e); }
      if(e.type === 'charger' && e.phase === 1 && e.phaseTimer > (e.warnDuration || 0.5)){ applyEnemyPhase(e); }
      if(e.type === 'homing'){
        e.life = (e.life||0) + dt;
        const homingTime = e.homingTime || 1.2;
        const fadeDur = e.homingFade || 1.2;
        const desiredX = player.x - e.x;
        const desiredY = player.y - e.y;
        const len = Math.hypot(desiredX, desiredY) || 1;
        const nx = desiredX/len, ny = desiredY/len;

        // Follow phase: fully track player for homingTime, then gradually reduce steering over fadeDur
        if(e.life < homingTime + fadeDur){
          let followFactor = 0;
          if(e.life < homingTime) {followFactor = 1;}
          else {followFactor = Math.max(0, 1 - (e.life - homingTime) / Math.max(0.0001, fadeDur));}
          const baseInfluence = 0.9; // how strongly the enemy can turn towards the player
          const influence = Math.max(0.06, baseInfluence * followFactor);
          const turn = Math.min(dt * (e.turnRate||0.9) * influence, 0.6);
          e.dx += (nx - e.dx) * turn;
          e.dy += (ny - e.dy) * turn;
          const nlen = Math.hypot(e.dx,e.dy)||1; e.dx/=nlen; e.dy/=nlen;
        } else {
          // homing finished — lock velocity and mark as straight-moving
          if(e.homingActive !== false){ e.homingActive = false; e.type = 'straight'; e.color = '#ef4444'; }
        }

        e.x += e.dx * e.speed * dt;
        e.y += e.dy * e.speed * dt;
      } else if(e.type === 'zigzag'){
        const perpX = -e.dy, perpY = e.dx;
        e.phase += e.freq * dt;
        const stageBoost = 1 + Math.min(1, (state.stage - 1) * 0.08);
        const ampMultiplier = (e.amp || 28) / 12;
        e.x += e.dx * e.speed * dt + perpX * Math.sin(e.phase) * ampMultiplier * stageBoost;
        e.y += e.dy * e.speed * dt + perpY * Math.sin(e.phase) * ampMultiplier * stageBoost;
      } else if(e.type === 'orbit'){
        e.life = (e.life || 0) + dt;
        const px = player.x;
        const py = player.y;
        const dxToPlayer = px - e.x;
        const dyToPlayer = py - e.y;
        const distance = Math.hypot(dxToPlayer, dyToPlayer) || 1;
        const targetRadius = e.orbitRadius || 88;
        const radiusError = distance - targetRadius;
        const toPlayerNx = dxToPlayer / distance;
        const toPlayerNy = dyToPlayer / distance;
        e.orbitAngle += (e.orbitSpeed || 2.8) * dt;
        const tangentX = -toPlayerNy;
        const tangentY = toPlayerNx;
        const orbitPull = Math.max(-1, Math.min(1, radiusError / Math.max(18, targetRadius * 0.7)));
        const orbitStrength = Math.max(0.55, 1 - (e.life / Math.max(0.001, e.orbitTime || 2.4)));
        e.dx = (tangentX * 0.82 + toPlayerNx * orbitPull * 0.35) * orbitStrength;
        e.dy = (tangentY * 0.82 + toPlayerNy * orbitPull * 0.35) * orbitStrength;
        const nlen = Math.hypot(e.dx, e.dy) || 1;
        e.dx /= nlen;
        e.dy /= nlen;
        const moveSpeed = (e.speed || 100) * (1.05 + orbitStrength * 0.2);
        e.x += e.dx * moveSpeed * dt;
        e.y += e.dy * moveSpeed * dt;
        if(e.life >= (e.orbitTime || 2.4)){
          e.type = 'straight';
          e.color = '#ef4444';
          e.speed = Math.max(e.speed || 0, e.orbitBreakSpeed || (e.speed * 1.12));
        }
      } else if(e.type === 'shooter'){
        e.x += e.dx * e.speed * dt;
        e.y += e.dy * e.speed * dt;
        e.shootTimer -= dt;
        if(e.shootTimer <= 0){
          const bx = e.x, by = e.y;
          const leadTime = 0.18 + state.stage * 0.03;
          const targetX = player.x + player.vx * leadTime;
          const targetY = player.y + player.vy * leadTime;
          const vx = (targetX - bx), vy = (targetY - by);
          const speed = 220 + Math.random()*60 + state.stage*12;
          const burst = 1 + Math.floor(state.stage/3);
          const spread = 0.14 + Math.min(0.5, state.stage*0.02);
          for(let bi=0; bi<burst; bi++){
            const ang = Math.atan2(vy, vx) + (bi - (burst-1)/2) * spread;
            state.bullets.push({ x: bx, y: by, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, r: 4, color: '#ffd972' });
          }
          e.shotsFired = (e.shotsFired || 0) + burst;
          e.shootTimer = e.shootInterval + rand(-0.2,0.2);
        }
      } else if(e.type === 'splitter'){
        e.life = (e.life||0) + dt;
        e.x += e.dx * e.speed * dt;
        e.y += e.dy * e.speed * dt;
        if(e.life > 1.0){
          const count = 2;
          for(let s=0;s<count;s++){
            const ang = Math.atan2(e.dy,e.dx) + (s===0?0.6:-0.6) + rand(-0.2,0.2);
            const sp = e.speed * (1.1 + Math.random()*0.4);
            state.enemies.push({ x: e.x, y: e.y, dx: Math.cos(ang), dy: Math.sin(ang), r: Math.max(5, e.r*0.6), color: '#ff7aa2', type:'fast', speed: sp });
          }
          spawnParticles(e.x, e.y, 10, '#ff7aa2');
          state.enemies.splice(i,1);
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
      if(e.type === 'dasher'){
        e.life = (e.life||0) + dt;
        if(e.warnTimer > 0){
          e.warnTimer -= dt;
          e.x += e.dx * (e.speed * 0.12) * dt;
          e.y += e.dy * (e.speed * 0.12) * dt;
        } else {
          if(!e.dashing){
            e.dashing = true;
            e.dashTime = 0;
            e.dashDuration = Math.max(0.16, 0.22 + Math.random() * 0.12);
            e.dashSpeed = e.dashSpeed || e.speed * (2.5 + state.stage * 0.35);
          }
          e.x += (e.dx || 0) * e.dashSpeed * dt;
          e.y += (e.dy || 0) * e.dashSpeed * dt;
          if(e.dashing){
            e.dashTime += dt;
            if(e.dashTime >= e.dashDuration){
              e.dashing = false;
              e.dashTime = 0;
              e.speed *= 0.78;
              e.warnTimer = 0.6 + Math.random() * 0.4;
            }
          }
        }
      }
      if(e.type === 'phaser'){
        if(e.visible){
          if(e.phaseTimer >= (e.visibleDuration || 0.9)) { e.visible = false; e.phaseTimer = 0; }
        } else {
          if(e.phaseTimer >= (e.invisibleDuration || 1.0)) { e.visible = true; e.phaseTimer = 0; }
        }
        const wob = Math.sin((Date.now() / 280) + (e.phaseTimer * 6)) * (e.r * 0.04);
        e.x += Math.cos(e.phaseTimer * 1.3) * wob * dt * 60;
        e.y += Math.sin(e.phaseTimer * 1.1) * wob * dt * 60;
      }
      if(e.x < -120 || e.x > state.width+120 || e.y < -120 || e.y > state.height+120){
        spawnParticles(e.x, e.y, Math.max(6, Math.floor(e.r/2)), e.color);
        state.enemies.splice(i,1);
        state.survivedCount += 1;
        const basePoints = Math.max(1, Math.floor(Math.pow(1.05, state.survivedCount)));
        const points = Math.floor(basePoints * multiplier());
        state.score += points;
      }
    }

    // If enemies are paused, skip boss progression and spawn scheduling as well
    if(!state.enemiesPaused){

    if(!sandboxActive && state.bossPending && !state.bossActive){
      state.bossPendingTimer -= dt;
      // keep telegraph duration in sync if present
      if(state.bossSpawnTele && typeof state.bossSpawnTele.dur === 'number'){
        state.bossSpawnTele.dur = Math.max(0, state.bossPendingTimer);
      }
      if(state.enemies.length === 0){
        startBossFight();
      } else if(state.bossPendingTimer <= 0){
        clearActiveThreats();
        startBossFight();
      }
    }

    if(!sandboxActive && state.bossActive && state.boss){
      state.boss.life += dt;
      state.bossTimer -= dt;
      if(state.bossTimer <= 0){
        endBossFight();
      } else {
        state.boss.retargetTimer -= dt;
        state.boss.jitter += dt * 7;
        if(state.boss.retargetTimer <= 0){
          state.boss.retargetTimer = rand(0.15, 0.45);
          const aimPlayer = Math.random() < 0.45;
          const baseAngle = aimPlayer ? Math.atan2(player.y - state.boss.y, player.x - state.boss.x) : rand(0, Math.PI * 2);
          const spread = rand(-1.15, 1.15);
          const angle = baseAngle + spread;
          state.boss.dx = Math.cos(angle);
          state.boss.dy = Math.sin(angle);
          const len = Math.hypot(state.boss.dx, state.boss.dy) || 1;
          state.boss.dx /= len;
          state.boss.dy /= len;
          state.boss.speed = (260 + state.boss.stageValue * 24) * (0.92 + state.boss.stageValue * 0.025) * state.speedMultiplier;
        }
        state.boss.x += state.boss.dx * state.boss.speed * dt;
        state.boss.y += state.boss.dy * state.boss.speed * dt;
        const margin = state.boss.r + 12;
        if(state.boss.x < margin){ state.boss.x = margin; state.boss.dx = Math.abs(state.boss.dx); }
        if(state.boss.x > state.width - margin){ state.boss.x = state.width - margin; state.boss.dx = -Math.abs(state.boss.dx); }
        if(state.boss.y < margin){ state.boss.y = margin; state.boss.dy = Math.abs(state.boss.dy); }
        if(state.boss.y > state.height - margin){ state.boss.y = state.height - margin; state.boss.dy = -Math.abs(state.boss.dy); }
        if(state.boss.life >= state.boss.duration){
          endBossFight();
        }
      }
    }

    const profile = waveDifficulty(state.stage, settings.maxStage, state.difficulty);

    if(!state.enemiesPaused && !sandboxActive && !state.bossPending && !state.bossActive && state.stage >= 2 && Math.random() < profile.chaosChance && state.enemies.length < 42){
      spawnEnemy('chaos');
      if(state.stage >= 3 && Math.random() < profile.extraSpawnChance * 0.55) {spawnEnemy('chaos');}
    }

    for(const e of state.enemies){
      if(e.safeTime && e.safeTime > 0) {continue;}
      if(e.type === 'phaser' && !e.visible) {continue;}
      if(squareCircleHit(player.x, player.y, player.r, e.x, e.y, e.r - 2)){
        spawnParticles(player.x, player.y, 28, '#fff');
        if(!playerInvulnerable) { endGame(); }
      }
    }

    if(state.bossActive && state.boss && squareCircleHit(player.x, player.y, player.r, state.boss.x, state.boss.y, state.boss.r - 2)){
      spawnParticles(player.x, player.y, 34, '#fff');
      if(!playerInvulnerable) { endGame(); }
    }

    for(const o of state.obstacles){
      const teleSec = (settings.obstacleTeleTime || 360) / 1000;
      const fadeDur = Math.max(0.6, teleSec);
      const maxLife = o.maxLife || Math.max(1, settings.obstacleLifeBase || 1.6);
      const timeSinceSpawn = Math.max(0, maxLife - o.life);
      if(timeSinceSpawn < fadeDur) {continue;}
      const halfW = (o.w || o.r*2) * 0.5;
      const halfH = (o.h || o.r*2) * 0.5;
      const rectHit = Math.abs(player.x - o.x) < halfW + player.r && Math.abs(player.y - o.y) < halfH + player.r;
      const circleHit = squareCircleHit(player.x, player.y, player.r, o.x, o.y, (o.r || 16) - 2);
      if(rectHit || circleHit){
        spawnParticles(player.x, player.y, 28, '#fff');
        if(!playerInvulnerable) { endGame(); }
      }
    }

    for(let i=state.telegraphs.length-1;i>=0;i--){
      const t = state.telegraphs[i];
      t.t -= dt*1000;
      t.alpha = Math.max(0.12, t.t/1000);
      if(t.t <= 0){
        const enemy = createTelegraphEnemy({
          tele: t,
          stage: state.stage,
          difficulty: state.difficulty,
          elapsed: state.elapsed,
          speedMultiplier: state.speedMultiplier,
          width: state.width,
          height: state.height,
          mouse: state.mouse,
          player,
          rand,
          randomEnemySize,
          chooseEnemyShape
        });
        if(enemy && typeof enemy === 'object' && state.enemies.length < (settings.enemyMax || 80)) {state.enemies.push(enemy);}
        state.telegraphs.splice(i,1);
      }
    }

    for(let i=state.obstacleTelegraphs.length-1;i>=0;i--){
      const t = state.obstacleTelegraphs[i];
      t.t -= dt*1000;
      if(t.t <= 0){
        const life = (settings.obstacleLifeBase || 1.6) + Math.random() * 1.2 + (state.stage-1) * 0.25;
        state.obstacles.push({
          x: t.x,
          y: t.y,
          life,
          maxLife: life,
          color: t.color || '#ff6b6b',
          shape: t.shape,
          w: t.w,
          h: t.h,
          r: Math.max(t.w, t.h) * 0.5,
          motion: t.motion,
          vx: (t.motion === 'static' ? 0 : (t.vx || 0)),
          vy: (t.motion === 'static' ? 0 : (t.vy || 0)),
          phase: t.phase || 0,
          bounds: t.bounds || 24
        });
        state.obstacleTelegraphs.splice(i,1);
      }
    }

    if(!sandboxActive && !state.bossPending && !state.bossActive){
      state.elapsed += dt;
      if(state.elapsed >= state.nextStageTime){
        // schedule boss pending with telegraphed spawn point and max-stage-scaled warning
        const warnTime = profile.bossWarningTime;
        state.bossPending = true;
        state.bossPendingTimer = warnTime;
        const margin = 120;
        const bx = Math.max(margin, Math.min(state.width - margin, Math.floor(rand(margin, state.width - margin))));
        const by = Math.max(margin, Math.min(state.height - margin, Math.floor(rand(margin, state.height - margin))));
        const br = Math.max(120, Math.min(360, Math.round(Math.min(state.width, state.height) * 0.18)));
        state.bossSpawnTele = { x: bx, y: by, r: br, dur: warnTime, durTotal: warnTime };
      }
    }

    for(let i=state.obstacles.length-1;i>=0;i--){
      const o = state.obstacles[i];
      if(o.motion === 'horizontal'){
        o.x += o.vx * dt;
        if(o.x < o.bounds || o.x > state.width - o.bounds){ o.vx *= -1; }
      } else if(o.motion === 'vertical'){
        o.y += o.vy * dt;
        if(o.y < o.bounds || o.y > state.height - o.bounds){ o.vy *= -1; }
      } else if(o.motion === 'drift'){
        o.x += o.vx * dt;
        o.y += o.vy * dt;
        if(o.x < o.bounds || o.x > state.width - o.bounds){ o.vx *= -1; }
        if(o.y < o.bounds || o.y > state.height - o.bounds){ o.vy *= -1; }
      } else if(o.motion === 'oscillate'){
        o.phase += dt * 4;
        o.x += o.vx * dt;
        o.y += o.vy * dt + Math.sin(o.phase) * 14 * dt;
        if(o.x < o.bounds || o.x > state.width - o.bounds){ o.vx *= -1; }
        if(o.y < o.bounds || o.y > state.height - o.bounds){ o.vy *= -1; }
      }
      o.life -= dt;
      if(o.life <= 0) {state.obstacles.splice(i,1);}
    }

    for(let i=state.bullets.length-1;i>=0;i--){
      const b = state.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if(squareCircleHit(player.x, player.y, player.r, b.x, b.y, b.r)){
        spawnParticles(player.x, player.y, 12, '#fff');
        if(!playerInvulnerable) { endGame(); }
      }
      if(b.x < -40 || b.x > state.width+40 || b.y < -40 || b.y > state.height+40) {state.bullets.splice(i,1);}
    }

    if(state.stageEase && state.stageEase.active){
      const t = Math.max(0, Math.min(1, (state.elapsed - state.stageEase.startElapsed) / state.stageEase.duration));
      const eT = easeInOutCubic(t);
      state.speedMultiplier = lerp(state.stageEase.fromSpeed, state.stageEase.toSpeed, eT);
      state.spawnInterval = lerp(state.stageEase.fromSpawn, state.stageEase.toSpawn, eT);
      if(t >= 1){ state.stageEase.active = false; state.stageEase = null; }
    } else if(!sandboxActive) {
      state.speedMultiplier += dt * profile.passiveSpeedGrowth;
    }

    if(!state.enemiesPaused && !sandboxActive && !state.bossPending && !state.bossActive){
      state.lastSpawn += dt*1000;
      if(state.lastSpawn > state.spawnInterval){
        state.lastSpawn = 0;
        scheduleSpawn('spawn');
        if(state.stage >= 3 && Math.random() < profile.extraSpawnChance){ scheduleSpawn('spawn'); }
      }
    }
    if(!state.enemiesPaused && !sandboxActive && !state.bossPending && !state.bossActive){
      state.lastObstacleSpawn += dt;
      const obstacleTarget = Math.max(1.7, settings.obstacleBaseInterval * Math.max(0.45, profile.obstacleIntervalScale));
      if(settings.obstacleEnabled && state.lastObstacleSpawn > obstacleTarget){
        state.lastObstacleSpawn = 0;
        scheduleObstacle();
        if(state.stage >= 4 && Math.random() < profile.extraSpawnChance * 0.65) {scheduleObstacle();}
      }
    }
    const spawnDecay = profile.spawnDecayPerSec;
    if(!state.enemiesPaused && !sandboxActive && !state.bossPending && !state.bossActive) {state.spawnInterval = Math.max(220, state.spawnInterval - dt * spawnDecay);}

    updateDebugPanel();
  };
}
