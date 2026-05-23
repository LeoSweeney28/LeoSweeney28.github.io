import { easeInOutCubic, pathRoundRect, roundVal } from '../core/utils.js';

export function createRenderGame({
  state,
  settings,
  enemyDebugText,
  renderEnemyHitbox,
  renderObstacleHitbox
}){
  return function render(ctx){
    const width = state.width;
    const height = state.height;

    const g = ctx.createLinearGradient(0,0,0,height);
    g.addColorStop(0,'#021029');
    g.addColorStop(1,'#071028');
    ctx.fillStyle = g;
    ctx.fillRect(0,0,width,height);

    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    for(let i=0;i<40;i++){
      const sx = (i*73 + Date.now()/20) % width;
      const sy = (i*97 + Date.now()/37) % height;
      ctx.fillRect(sx, sy, 1,1);
    }

    for(let i = state.particles.length-1; i>=0; i--){
      const p = state.particles[i];
      p.x += p.vx; p.y += p.vy; p.life -= 1;
      ctx.globalAlpha = Math.max(0, p.life/ p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
      if(p.life <= 0) {state.particles.splice(i,1);}
    }

    for(const t of state.telegraphs){
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

    for(const t of state.obstacleTelegraphs){
      const teleDur = settings.obstacleTeleTime || 520;
      const prog = Math.min(1, Math.max(0, 1 - (t.t / teleDur)));
      const easedProg = easeInOutCubic(prog);
      const fillAlpha = 0.12 + easedProg * 0.78;
      ctx.globalAlpha = fillAlpha;
      ctx.fillStyle = t.color || 'rgba(255,120,120,0.9)';
      if(t.shape === 'rect-h' || t.shape === 'bar' || t.shape === 'rect-v' || t.shape === 'square'){
        ctx.fillRect(t.x - t.w/2, t.y - t.h/2, t.w, t.h);
      } else {
        ctx.beginPath(); ctx.arc(t.x, t.y, 18, 0, Math.PI*2); ctx.fill();
      }
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

    // boss spawn telegraph (draw where the boss will appear while pending)
    if(state.bossPending && state.bossSpawnTele){
      const bt = state.bossSpawnTele;
      const total = bt.dur || 1.0;
      const remaining = Math.max(0, state.bossPendingTimer || 0);
      const prog = Math.min(1, Math.max(0, 1 - (remaining / Math.max(0.0001, total))));
      const eased = easeInOutCubic(prog);
      ctx.save();
      const fillAlpha = 0.05 + eased * 0.34;
      ctx.globalAlpha = fillAlpha;
      ctx.fillStyle = 'rgba(255,140,80,0.55)';
      // draw a soft filled circle to indicate area
      ctx.beginPath(); ctx.arc(bt.x, bt.y, bt.r * 0.42, 0, Math.PI*2); ctx.fill();
      ctx.globalAlpha = 1;
      // draw dotted outline that becomes more visible as time passes
      ctx.save();
      ctx.globalAlpha = 0.12 + eased * 0.45;
      ctx.strokeStyle = 'rgba(255,255,255,0.78)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8,10]);
      ctx.beginPath(); ctx.arc(bt.x, bt.y, bt.r * 0.48 + eased * 6, 0, Math.PI*2); ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      // small pulsing crosshair center
      ctx.save();
      ctx.globalAlpha = 0.45 * (0.4 + 0.6 * Math.abs(Math.sin(Date.now() / Math.max(90, 420 * (1 - prog)))));
      ctx.strokeStyle = 'rgba(255,255,255,0.72)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(bt.x - 8, bt.y); ctx.lineTo(bt.x + 8, bt.y); ctx.moveTo(bt.x, bt.y - 8); ctx.lineTo(bt.x, bt.y + 8); ctx.stroke();
      ctx.restore();
      ctx.restore();
    }

    for(const o of state.obstacles){
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
      const despawnWarn = 1.0;
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

    if(state.debugMode){
      for(const t of state.obstacleTelegraphs){ renderObstacleHitbox(ctx, t); }
      for(const o of state.obstacles){ renderObstacleHitbox(ctx, o); }
      if(state.bossActive && state.boss){ renderEnemyHitbox(ctx, state.boss); }
    }

    // Render player (used as the cursor). Respect chosen cursor shape and scale, hide OS cursor via CSS.
    const drawR = (state.player.r || 12) * (state.cursorScale || 1);
    ctx.save();
    ctx.translate(state.drawPlayerX, state.drawPlayerY);
    ctx.rotate(state.drawPlayerAngle);
    ctx.scale(state.drawPlayerScale, state.drawPlayerScale);
    ctx.fillStyle = state.player.color;
    if(state.cursorShape === 'circle'){
      ctx.beginPath(); ctx.arc(0,0, drawR, 0, Math.PI*2); ctx.fill();
    } else {
      ctx.fillRect(-drawR, -drawR, drawR * 2, drawR * 2);
    }
    ctx.restore();
    if(state.debugMode){
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([6,4]);
      ctx.strokeRect(state.player.x - state.player.r, state.player.y - state.player.r, state.player.r*2, state.player.r*2);
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath(); ctx.moveTo(state.mouse.x-6, state.mouse.y); ctx.lineTo(state.mouse.x+6, state.mouse.y); ctx.moveTo(state.mouse.x, state.mouse.y-6); ctx.lineTo(state.mouse.x, state.mouse.y+6); ctx.stroke();
      ctx.restore();
    }

    for(const e of state.enemies){
      if(e.type === 'phaser'){
        if(!e.visible){
          ctx.save();
          const pulse = 0.08 + 0.06 * Math.abs(Math.sin(Date.now() / 260));
          ctx.globalAlpha = pulse;
          ctx.strokeStyle = 'rgba(159,122,234,0.72)';
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 6, 0, Math.PI*2); ctx.stroke();
          ctx.restore();
        } else {
          ctx.save();
          ctx.fillStyle = e.color;
          ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI*2); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 2; ctx.stroke();
          ctx.globalAlpha = 0.14; ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 12, 0, Math.PI*2); ctx.fillStyle = e.color; ctx.fill();
          ctx.globalAlpha = 1;
          ctx.restore();
        }
        continue;
      }
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
        const alphaPulse = 0.4 + 0.6 * Math.abs(Math.sin(Date.now() / Math.max(80, e.warnTimer*200)));
        const warnAlpha = Math.min(1, Math.max(0.08, (1 - e.warnTimer / e.warnDuration))) * alphaPulse;
        ctx.globalAlpha = warnAlpha;
        ctx.fillStyle = 'rgba(6,182,212,0.28)';
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
        ctx.arc(e.x, e.y, e.r, 0, Math.PI*2);
        ctx.fill();
        ctx.beginPath(); ctx.strokeStyle='rgba(255,255,255,0.08)'; ctx.lineWidth=1.2; ctx.stroke();
      } else {
        ctx.arc(e.x, e.y, e.r, 0, Math.PI*2);
        ctx.fill();
      }
      if(state.debugMode){
        const label = enemyDebugText(e, roundVal);
        ctx.save();
        ctx.font = '11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        const padX = 6;
        const textWidth = ctx.measureText(label).width;
        const boxW = textWidth + padX * 2;
        const boxH = 18;
        const boxX = e.x - boxW / 2;
        const boxY = e.y - e.r - 12 - boxH;
        ctx.fillStyle = 'rgba(2,6,23,0.85)';
        ctx.strokeStyle = 'rgba(255,255,255,0.18)';
        ctx.lineWidth = 1;
        pathRoundRect(ctx, boxX, boxY, boxW, boxH, 6);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#e6eef8';
        ctx.fillText(label, e.x, boxY + boxH - 5);
        ctx.restore();
        renderEnemyHitbox(ctx, e);
      }
    }

    if(state.bossActive && state.boss){
      ctx.save();
      ctx.translate(state.boss.x, state.boss.y);
      ctx.rotate(Math.sin(state.boss.jitter) * 0.25);
      ctx.fillStyle = state.boss.color;
      ctx.beginPath();
      ctx.moveTo(0, -state.boss.r);
      for(let k=1;k<6;k++){
        const ang = (Math.PI * 2 / 6) * k;
        const wobble = 1 + Math.sin(state.boss.jitter + k) * 0.08;
        ctx.lineTo(Math.cos(ang) * state.boss.r * wobble, Math.sin(ang) * state.boss.r * wobble);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.globalAlpha = 0.18;
      ctx.beginPath();
      ctx.arc(0, 0, state.boss.r + 10 + Math.sin(state.boss.jitter * 1.8) * 2, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.restore();
    }

    for(const b of state.bullets){ ctx.beginPath(); ctx.fillStyle = b.color; ctx.arc(b.x,b.y,b.r,0,Math.PI*2); ctx.fill(); }
  };
}
