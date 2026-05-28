export function createBoss({ stage, width, height, speedMultiplier, rand, bossColor, spawnX, spawnY }) {
    const sizeBoost = stage * 6;
    const speedBoost = stage * 24;
    const r = 36 + sizeBoost;
    const x = typeof spawnX === 'number' ? spawnX : rand(120, Math.max(121, width - 120));
    const y = typeof spawnY === 'number' ? spawnY : rand(120, Math.max(121, height - 120));
    return {
        x,
        y,
        dx: Math.cos(rand(0, Math.PI * 2)),
        dy: Math.sin(rand(0, Math.PI * 2)),
        r,
        speed: (260 + speedBoost) * (0.95 + stage * 0.03) * speedMultiplier,
        color: bossColor(stage),
        life: 0,
        duration: 10,
        retargetTimer: 0.25,
        jitter: rand(0, Math.PI * 2),
        stageValue: stage
    };
}

function createBaseEnemy({ type, reason, x, y, dx, dy, stage, speedMultiplier, elapsed, rand, randomEnemySize, chooseEnemyShape }) {
    const stageBoost = Math.min(1, (stage - 1) * 0.14 + elapsed / 90);
    const baseSpeed = rand(70, 140) * speedMultiplier;
    const size = randomEnemySize(type, stage, rand);
    const enemy = { x, y, dx, dy, r: size, color: '#ef4444', type, speed: baseSpeed, shape: chooseEnemyShape(type, stage), hp: 1, reason, phase: 1, phaseTimer: 0 };
    enemy.safeTime = 0.45;
    enemy.speed *= 1 + stageBoost * 0.35;
    if (type === 'straight') { enemy.color = '#ef4444'; }
    if (type === 'fast') { enemy.speed *= 1.6; enemy.r = Math.max(6, size * 0.75); enemy.color = '#fb7185'; enemy.shape = 'triangle'; }
    if (type === 'big') { enemy.speed *= 0.6; enemy.r = Math.max(22, size * 1.6); enemy.color = '#f97316'; enemy.shape = 'hex'; }
    if (type === 'zigzag') {
        enemy.amp = rand(20, 58) + stage * 3;
        enemy.phase = rand(0, Math.PI * 2);
        enemy.freq = rand(4, 8);
        enemy.color = '#f43f5e';
    }
    if (type === 'orbit') {
        enemy.orbitTime = Math.max(1.2, 2.2 + Math.random() * 1.1 - stageBoost * 0.45);
        enemy.orbitRadius = rand(64, 110) + stage * 2;
        enemy.orbitAngle = Math.atan2(dy, dx);
        enemy.orbitSpeed = rand(2.2, 3.2) * (1 + stageBoost * 0.35);
        enemy.orbitBreakSpeed = enemy.speed * 1.15;
        enemy.color = '#34d399';
        enemy.shape = 'circle';
    }
    if (type === 'homing') { enemy.turnRate = rand(0.86, 1.28) * (1 + stageBoost * 0.65); enemy.homingTime = Math.max(0.38, 1.0 + Math.random() * 0.7 - stageBoost * 0.55); enemy.color = '#ef4444'; }
    if (type === 'shooter') { enemy.shootTimer = rand(0.6, 1.4); enemy.shootInterval = Math.max(0.32, 1.0 - stageBoost * 0.5); enemy.shotsFired = 0; enemy.color = '#7c3aed'; enemy.shape = 'diamond'; }
    if (type === 'charger') {
        enemy.chargeDx = dx;
        enemy.chargeDy = dy;
        const leadX = x + dx * 0.2;
        const leadY = y + dy * 0.2;
        const tx = leadX - x;
        const ty = leadY - y;
        const tlen = Math.hypot(tx, ty) || 1;
        enemy.chargeDx = tx / tlen;
        enemy.chargeDy = ty / tlen;
        enemy.r += 6;
        enemy.warnTimer = Math.max(0.9, 1.1 + Math.random() * 0.6 + stage * 0.04);
        enemy.warnDuration = Math.max(0.6, enemy.warnTimer * 0.95);
        enemy.dashSpeed = enemy.speed * Math.max(1.8, (2.2 + stage * 0.28));
        enemy.chargeLen = rand(200, 320) + stage * 14;
        enemy.chargeTargetX = x + enemy.chargeDx * enemy.chargeLen;
        enemy.chargeTargetY = y + enemy.chargeDy * enemy.chargeLen;
        enemy.color = '#22d3ee';
        enemy.shape = 'hex';
    }
    if (type === 'splitter') { enemy.phase = 1; enemy.phaseTimer = 0; enemy.color = '#ff7aa2'; }
    if (type === 'phaser') {
        enemy.visible = false;
        enemy.phaseTimer = 0;
        enemy.visibleDuration = 0.9 + Math.random() * 0.6;
        enemy.invisibleDuration = 0.9 + Math.random() * 0.9;
        enemy.color = '#9f7aea';
        enemy.shape = 'circle';
    }
    return enemy;
}

function chooseSpawnType({ difficulty, stage, stageBoost, roll }) {
    let type = 'straight';
    if (difficulty === 'easy') {
        if (roll < 0.10 + stageBoost * 0.08) {type = 'homing';}
        else if (roll < 0.20 + stageBoost * 0.08) {type = 'zigzag';}
        else if (roll < 0.25 + stageBoost * 0.04) {type = 'phaser';}
        else if (stage >= 4 && roll > 0.87) {type = 'orbit';}
        else if (stage >= 3 && roll > 0.94) {type = 'fast';}
    } else if (difficulty === 'normal') {
        if (roll < 0.24 + stageBoost * 0.16) {type = 'homing';}
        else if (roll < 0.28 + stageBoost * 0.08) {type = 'zigzag';}
        else if (roll < 0.44 + stageBoost * 0.10) {type = 'fast';}
        else if (stage >= 4 && roll > 0.74) {type = 'orbit';}
        else if (stage >= 4 && roll > 0.88) {type = 'shooter';}
        else if (stage >= 3 && roll > 0.80) {type = 'charger';}
    } else {
        if (roll < 0.34 + stageBoost * 0.14) {type = 'homing';}
        else if (roll < 0.40 + stageBoost * 0.08) {type = 'zigzag';}
        else if (roll < 0.44 + stageBoost * 0.06) {type = 'phaser';}
        else if (roll < 0.64 + stageBoost * 0.10) {type = 'fast';}
        else if (roll < 0.78 + stageBoost * 0.06) {type = 'big';}
        else if (stage >= 3 && roll > 0.70) {type = 'orbit';}
        else if (stage >= 3 && roll > 0.82) {type = 'shooter';}
        else if (stage >= 2 && roll > 0.72) {type = 'charger';}
    }
    return type;
}

export function createSpawnEnemy({
    reason = 'spawn',
    stage,
    difficulty,
    elapsed,
    speedMultiplier,
    width,
    height,
    mouse,
    rand,
    randomEnemySize,
    chooseEnemyShape
}) {
    const side = Math.floor(rand(0, 4));
    const spawnSize = rand(8, 30);
    let x, y, dx, dy;
    if (side === 0) { x = -spawnSize; y = rand(0, height); dx = rand(0.2, 1); dy = rand(-0.5, 0.5); }
    else if (side === 1) { x = width + spawnSize; y = rand(0, height); dx = rand(-1, -0.2); dy = rand(-0.5, 0.5); }
    else if (side === 2) { x = rand(0, width); y = -spawnSize; dx = rand(-0.5, 0.5); dy = rand(0.2, 1); }
    else { x = rand(0, width); y = height + spawnSize; dx = rand(-0.5, 0.5); dy = rand(-1, -0.2); }

    const aimX = mouse.x - x;
    const aimY = mouse.y - y;
    const len = Math.hypot(aimX, aimY) || 1;
    dx = dx + (aimX / len - dx) * 0.25;
    dy = dy + (aimY / len - dy) * 0.25;
    const aimLen = Math.hypot(dx, dy) || 1;
    dx /= aimLen;
    dy /= aimLen;

    const stageBoost = Math.min(1, (stage - 1) * 0.14 + elapsed / 90);
    const type = chooseSpawnType({ difficulty, stage, stageBoost, roll: Math.random() });
    return createBaseEnemy({ type, reason, x, y, dx, dy, stage, speedMultiplier, elapsed, rand, randomEnemySize, chooseEnemyShape });
}

export function createDebugEnemy({
    type = 'straight',
    stage,
    elapsed,
    speedMultiplier,
    width,
    height,
    player,
    rand,
    randomEnemySize,
    chooseEnemyShape
}) {
    const x = Math.max(0, Math.min(width, width * 0.5));
    const y = Math.max(0, Math.min(height, height * 0.5));
    // Sandbox/debug spawns should not start pre-aimed at the player.
    const launchAngle = rand(0, Math.PI * 2);
    const dx = Math.cos(launchAngle);
    const dy = Math.sin(launchAngle);

    const stageBoost = Math.min(1, (stage - 1) * 0.14 + elapsed / 90);
    const enemy = createBaseEnemy({ type, reason: 'debug', x, y, dx, dy, stage, speedMultiplier, elapsed, rand, randomEnemySize, chooseEnemyShape });
    if (type === 'dasher') { enemy.warnTimer = 0.6 + Math.random() * 0.8; enemy.warnDuration = Math.max(0.18, enemy.warnTimer * Math.max(0.38, 1 - (stage - 1) * 0.10)); enemy.dashSpeed = enemy.speed * (2.5 + stage * 0.35); enemy.color = '#06b6d4'; }
    if (type === 'zigzag') {
        enemy.amp = rand(20, 58) + stage * 3;
        enemy.phase = rand(0, Math.PI * 2);
        enemy.freq = rand(4, 8);
        enemy.color = '#f43f5e';
    }
    if (type === 'orbit') {
        enemy.orbitTime = Math.max(1.2, 2.2 + Math.random() * 1.1 - stageBoost * 0.45);
        enemy.orbitRadius = rand(64, 110) + stage * 2;
        enemy.orbitAngle = Math.atan2(dy, dx);
        enemy.orbitSpeed = rand(2.2, 3.2) * (1 + stageBoost * 0.35);
        enemy.orbitBreakSpeed = enemy.speed * 1.15;
        enemy.color = '#34d399';
        enemy.shape = 'circle';
    }
    if (type === 'homing') { enemy.turnRate = rand(0.86, 1.28) * (1 + stageBoost * 0.65); enemy.homingTime = Math.max(0.38, 1.0 + Math.random() * 0.7 - stageBoost * 0.55); enemy.color = '#ef4444'; }
    if (type === 'shooter') { enemy.shootTimer = rand(0.6, 1.4); enemy.shootInterval = Math.max(0.32, 1.0 - stageBoost * 0.5); enemy.shotsFired = 0; enemy.color = '#7c3aed'; enemy.shape = 'diamond'; }
    if (type === 'big') { enemy.speed *= 0.6; enemy.r = Math.max(22, enemy.r * 1.6); enemy.color = '#f97316'; enemy.shape = 'hex'; }
    if (type === 'fast') { enemy.speed *= 1.6; enemy.r = Math.max(6, enemy.r * 0.75); enemy.color = '#fb7185'; enemy.shape = 'triangle'; }
    if (type === 'charger') {
        const leadX = player.x + player.vx * (0.2 + stage * 0.04);
        const leadY = player.y + player.vy * (0.2 + stage * 0.04);
        const tx = leadX - x;
        const ty = leadY - y;
        const tlen = Math.hypot(tx, ty) || 1;
        enemy.chargeDx = tx / tlen;
        enemy.chargeDy = ty / tlen;
        enemy.r = Math.max(enemy.r, enemy.r + 6);
        enemy.warnTimer = Math.max(0.9, 1.1 + Math.random() * 0.6 + stage * 0.04);
        enemy.warnDuration = Math.max(0.6, enemy.warnTimer * 0.95);
        enemy.dashSpeed = enemy.speed * Math.max(1.8, (2.2 + stage * 0.28));
        enemy.chargeLen = rand(200, 320) + stage * 14;
        enemy.chargeTargetX = x + enemy.chargeDx * enemy.chargeLen;
        enemy.chargeTargetY = y + enemy.chargeDy * enemy.chargeLen;
        enemy.color = '#22d3ee';
        enemy.shape = 'hex';
    }
    if (type === 'splitter') { enemy.phase = 1; enemy.phaseTimer = 0; enemy.color = '#ff7aa2'; }
    if (type === 'phaser') {
        enemy.visible = false;
        enemy.phaseTimer = 0;
        enemy.visibleDuration = 0.9 + Math.random() * 0.6;
        enemy.invisibleDuration = 0.9 + Math.random() * 0.9;
        enemy.color = '#9f7aea';
        enemy.shape = 'circle';
    }
    return enemy;
}

export function createObstacleTelegraph({
    stage,
    width,
    height,
    mouse,
    _player,
    rand,
    settings,
    chooseObstacleShape,
    chooseObstacleMotion,
    chooseObstacleColor,
    randomObstacleTone
}) {
    const shape = chooseObstacleShape();
    const tele = { t: settings.obstacleTeleTime || 700, shape, reason: 'obstacle' };
    const deep = Math.max(0, stage - 1);
    const randomScale = rand(0.75, 1.55) + deep * rand(0.03, 0.08);
    const teleW = shape === 'rect-h' ? rand(90, 250) * randomScale + deep * rand(10, 24) : shape === 'bar' ? rand(200, 380) * randomScale : rand(44, 130) * randomScale;
    const teleH = shape === 'rect-v' ? rand(90, 250) * randomScale + deep * rand(10, 24) : shape === 'bar' ? rand(16, 34) * rand(0.8, 1.25) : rand(44, 130) * randomScale;
    tele.w = shape === 'rect-v' ? rand(22, 58) * rand(0.9, 1.35) : teleW;
    tele.h = teleH;
    if (shape === 'square') { tele.w = rand(48, 130) * randomScale; tele.h = tele.w; }
    const mouseSpawnSafePadding = Math.max(70, (_player && _player.r ? _player.r : 16) * 4);
    const edgePadding = 40;
    const spawnMargin = 60;
    const fallbackOffset = 80;
    let placed = false;
    for (let tries = 0; tries < 12; tries++) {
        const candidateX = Math.max(edgePadding, Math.min(width - edgePadding, rand(spawnMargin, width - spawnMargin)));
        const candidateY = Math.max(edgePadding, Math.min(height - edgePadding, rand(spawnMargin, height - spawnMargin)));
        const nearMouseX = Math.abs(candidateX - mouse.x) < (tele.w * 0.5 + mouseSpawnSafePadding);
        const nearMouseY = Math.abs(candidateY - mouse.y) < (tele.h * 0.5 + mouseSpawnSafePadding);
        if (!(nearMouseX || nearMouseY)) {
            tele.x = candidateX;
            tele.y = candidateY;
            placed = true;
            break;
        }
    }
    if (!placed) {
        const anchors = [
            { x: fallbackOffset, y: fallbackOffset },
            { x: Math.max(edgePadding, width - fallbackOffset), y: fallbackOffset },
            { x: fallbackOffset, y: Math.max(edgePadding, height - fallbackOffset) },
            { x: Math.max(edgePadding, width - fallbackOffset), y: Math.max(edgePadding, height - fallbackOffset) }
        ];
        anchors.sort((a, b) => {
            const da = Math.hypot(a.x - mouse.x, a.y - mouse.y);
            const db = Math.hypot(b.x - mouse.x, b.y - mouse.y);
            return db - da;
        });
        tele.x = anchors[0].x;
        tele.y = anchors[0].y;
    }
    tele.color = randomObstacleTone(shape, stage, chooseObstacleColor);
    tele.motion = chooseObstacleMotion(shape, stage);
    tele.vx = 0;
    tele.vy = 0;
    if (tele.motion === 'horizontal') {tele.vx = rand(80, 150) * (Math.random() < 0.5 ? -1 : 1);}
    if (tele.motion === 'vertical') {tele.vy = rand(80, 150) * (Math.random() < 0.5 ? -1 : 1);}
    if (tele.motion === 'drift') {
        const ang = rand(0, Math.PI * 2);
        const sp = rand(40, 90) + deep * 8;
        tele.vx = Math.cos(ang) * sp;
        tele.vy = Math.sin(ang) * sp;
    }
    if (tele.motion === 'oscillate') {
        tele.vx = rand(60, 110) * (Math.random() < 0.5 ? -1 : 1);
        tele.vy = rand(40, 80) * (Math.random() < 0.5 ? -1 : 1);
        tele.phase = rand(0, Math.PI * 2);
    }
    tele.bounds = 24;
    return tele;
}

export function createTelegraphEnemy({
    tele,
    stage,
    difficulty,
    elapsed,
    speedMultiplier,
    width,
    height,
    mouse,
    rand,
    randomEnemySize,
    chooseEnemyShape
}) {
    const side = tele.side;
    let x, y, dx, dy;
    const spawnSize = rand(10, 30);
    if (side === 0) { x = -spawnSize; y = tele.y; dx = rand(0.2, 1); dy = rand(-0.4, 0.4); }
    else if (side === 1) { x = width + spawnSize; y = tele.y; dx = rand(-1, -0.2); dy = rand(-0.4, 0.4); }
    else if (side === 2) { x = tele.x; y = -spawnSize; dx = rand(-0.4, 0.4); dy = rand(0.2, 1); }
    else { x = tele.x; y = height + spawnSize; dx = rand(-0.4, 0.4); dy = rand(-1, -0.2); }

    const baseSpeed = rand(70, 140) * speedMultiplier;
    const aimX = mouse.x - x;
    const aimY = mouse.y - y;
    const len = Math.hypot(aimX, aimY) || 1;
    dx = dx + (aimX / len - dx) * 0.18;
    dy = dy + (aimY / len - dy) * 0.18;
    const aimLen = Math.hypot(dx, dy) || 1;
    dx /= aimLen;
    dy /= aimLen;

    // stageBoost not used here; omit to avoid unused variable
    const roll = Math.random();
    let type = 'straight';
    if (difficulty === 'easy') { if (roll < 0.12) {type = 'homing';} else if (roll < 0.22) {type = 'zigzag';} else if (stage >= 2 && roll > 0.9) {type = 'fast';} }
    else if (difficulty === 'normal') { if (roll < 0.32) {type = 'homing';} else if (roll < 0.48) {type = 'zigzag';} else if (roll < 0.68) {type = 'fast';} else if (stage >= 4 && roll > 0.78) {type = 'charger';} else if (stage >= 3 && roll > 0.86) {type = 'shooter';} }
    else { if (roll < 0.42) {type = 'homing';} else if (roll < 0.58) {type = 'zigzag';} else if (roll < 0.76) {type = 'fast';} else if (roll < 0.86) {type = 'big';} else if (stage >= 2 && roll > 0.78) {type = 'charger';} else if (stage >= 2) {type = 'shooter';} }

    const teleSize = randomEnemySize(type, stage, rand);
    const enemy = { x, y, dx, dy, r: teleSize, color: '#ef4444', type, speed: baseSpeed, life: 0, shape: chooseEnemyShape(type, stage), reason: 'telegraph' };
    enemy.safeTime = 0.45;
    const scaleFactor = 1 + (stage - 1) * 0.09 + Math.min(1, elapsed / 40) * 0.30;
    enemy.speed *= scaleFactor;
    if (stage >= 2 && Math.random() < 0.18 && type === 'straight') {type = 'shooter';}
    if (stage >= 2 && Math.random() < 0.12) {type = 'splitter';}
    if (stage >= 1 && Math.random() < 0.08) {type = 'dasher';}
    else if (stage >= 1 && Math.random() < 0.06) {type = 'phaser';}
    if (stage >= 3 && Math.random() < 0.10) {type = 'charger';}

    if (type === 'homing') { enemy.turnRate = rand(0.78, 1.22) * (1 + (stage - 1) * 0.08); enemy.homingTime = Math.max(0.45, 1.0 + Math.random() * 0.9 - (stage - 1) * 0.08); }
    if (type === 'shooter') { enemy.shootTimer = rand(0.35, 1.1); enemy.shootInterval = Math.max(0.28, 0.86 - Math.min(0.4, stage * 0.05)); enemy.color = '#7c3aed'; }
    if (type === 'dasher') { enemy.warnTimer = 0.6 + Math.random() * 0.8; enemy.warnDuration = Math.max(0.18, enemy.warnTimer * Math.max(0.38, 1 - (stage - 1) * 0.10)); enemy.dashSpeed = enemy.speed * (2.5 + stage * 0.35); enemy.color = '#06b6d4'; }
    if (type === 'zigzag') { enemy.amp = rand(20, 64) + stage * 4; enemy.phase = rand(0, Math.PI * 2); enemy.freq = rand(4, 8); enemy.shape = Math.random() < 0.5 ? 'square' : 'diamond'; enemy.color = '#f43f5e'; }
    if (type === 'fast') { enemy.speed *= 1.6; enemy.r = Math.max(6, teleSize * 0.75); enemy.color = '#fb7185'; enemy.shape = 'triangle'; }
    if (type === 'big') { enemy.speed *= 0.6; enemy.r = Math.max(22, teleSize * 1.6); enemy.color = '#f97316'; enemy.shape = 'hex'; }
    if (type === 'charger') {
        enemy.shape = 'hex';
        enemy.r = Math.max(enemy.r, teleSize + 6);
        enemy.warnTimer = Math.max(0.9, 1.1 + Math.random() * 0.6 + stage * 0.04);
        enemy.warnDuration = Math.max(0.6, enemy.warnTimer * 0.95);
        enemy.dashSpeed = enemy.speed * Math.max(1.8, (2.2 + stage * 0.28));
        enemy.chargeLen = rand(200, 320) + stage * 14;
        enemy.chargeDx = enemy.dx;
        enemy.chargeDy = enemy.dy;
        enemy.chargeTargetX = x + enemy.chargeDx * enemy.chargeLen;
        enemy.chargeTargetY = y + enemy.chargeDy * enemy.chargeLen;
        enemy.color = '#22d3ee';
    }
    if (type === 'splitter') { enemy.phase = 1; enemy.phaseTimer = 0; enemy.color = '#ff7aa2'; }
    enemy.shape = chooseEnemyShape(type, stage);
    if (type === 'zigzag') {enemy.shape = Math.random() < 0.5 ? 'square' : 'diamond';}
    if (type === 'fast') {enemy.shape = 'triangle';}
    if (type === 'big') {enemy.shape = 'hex';}
    if (type === 'shooter') {enemy.shape = 'diamond';}
    if (type === 'charger') {enemy.shape = 'hex';}
    if (type === 'splitter' && !enemy.reason) {enemy.reason = 'telegraph';}
    // Ensure the enemy object reflects any type changes made above
    enemy.type = type;
    return enemy;
}
