export function randomEnemySize(type, stageValue, rand){
  const stageBoost = Math.max(0, stageValue - 1) * 0.6;
  if(type === 'big') {return rand(30, 46) + stageBoost * rand(1.2, 3.0);}
  if(type === 'fast') {return rand(9, 16) + stageBoost * rand(0.3, 0.8);}
  if(type === 'shooter') {return rand(16, 26) + stageBoost * rand(0.4, 1.1);}
  if(type === 'charger') {return rand(18, 28) + stageBoost * rand(0.5, 1.2);}
  if(type === 'splitter') {return rand(12, 22) + stageBoost * rand(0.25, 0.8);}
  return rand(12, 24) + stageBoost * rand(0.18, 0.7);
}

export function chooseEnemyShape(type, stageValue, roll = Math.random()){
  if(type === 'shooter') {return 'diamond';}
  if(type === 'splitter') {return 'triangle';}
  if(type === 'dasher') {return 'arrow';}
  if(type === 'charger') {return 'hex';}
  if(type === 'homing') {return roll < 0.5 ? 'circle' : 'triangle';}
  if(type === 'zigzag') {return roll < 0.5 ? 'square' : 'diamond';}
  if(type === 'big') {return 'hex';}
  if(type === 'fast') {return roll < 0.5 ? 'triangle' : 'circle';}
  return stageValue >= 4 && roll < 0.35 ? 'square' : 'circle';
}

export function chooseObstacleShape(){
  const roll = Math.random();
  if(roll < 0.38) {return 'rect-h';}
  if(roll < 0.72) {return 'rect-v';}
  if(roll < 0.88) {return 'square';}
  return 'bar';
}

export function chooseObstacleMotion(shape, stageValue){
  const roll = Math.random();
  if(roll < 0.38) {return 'static';}
  if(stageValue >= 4 && roll < 0.58) {return shape === 'rect-h' ? 'horizontal' : 'vertical';}
  if(stageValue >= 5 && roll < 0.72) {return 'oscillate';}
  return roll < 0.78 ? 'drift' : 'bounce';
}

export function chooseObstacleColor(shape, roundValue){
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

export function randomObstacleTone(shape, stage, chooseObstacleColorFn){
  const base = chooseObstacleColorFn(shape, stage);
  const extra = ['#38bdf8', '#a78bfa', '#22c55e', '#f472b6', '#f59e0b'];
  return Math.random() < 0.65 ? extra[Math.floor(Math.random() * extra.length)] : base;
}

export function applyEnemyPhase(enemy){
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

export function bossColor(stageValue){
  if(stageValue >= 8) {return '#f97316';}
  if(stageValue >= 5) {return '#fb7185';}
  return '#f59e0b';
}

export function enemyDebugText(enemy, roundValFn){
  const parts = [enemy.type.toUpperCase()];
  if(enemy.phase !== null) {parts.push('phase:' + enemy.phase);}
  if(enemy.shape) {parts.push(enemy.shape);}
  if(enemy.reason) {parts.push('src:' + enemy.reason);}
  if(enemy.type === 'charger') {parts.push('dash');}
  if(enemy.type === 'homing' && enemy.homingTime !== null) {parts.push('t:' + roundValFn(enemy.homingTime,2));}
  if(enemy.type === 'shooter' && enemy.shootInterval !== null) {parts.push('cd:' + roundValFn(enemy.shootInterval,2));}
  if(enemy.type === 'charger' && enemy.warnTimer !== null) {parts.push('warn:' + Math.max(0, roundValFn(enemy.warnTimer,2)));}
  if(enemy.speed !== null) {parts.push('spd:' + roundValFn(enemy.speed,2));}
  if(enemy.r !== null) {parts.push('r:' + Math.round(enemy.r));}
  if(enemy.type === 'phaser'){
    if(typeof enemy.visible === 'boolean') { parts.push(enemy.visible ? 'vis:on' : 'vis:off'); }
    if(typeof enemy.phaseTimer === 'number') { parts.push('t:' + roundValFn(enemy.phaseTimer,2)); }
  }
  return parts.join(' | ');
}
