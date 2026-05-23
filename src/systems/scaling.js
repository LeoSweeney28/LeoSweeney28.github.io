// Spawn interval target (ms) for a given stage. Gradually reduces with stage number.
export function spawnTarget(spawnBase, stage){
  const decay = 0.90; // slower decay for more predictable pacing
  return Math.max(120, Math.round(spawnBase * Math.pow(decay, Math.max(0, stage - 1))));
}

export function spawnInitial(spawnBase){
  return Math.max(120, Math.round(spawnBase * 0.94));
}

// Speed multiplier growth per stage. Slightly steeper to make stages feel faster.
export function speedTargetMultiplier(baseMultiplier, stage){
  const growth = 1.08;
  return +(baseMultiplier * Math.pow(growth, Math.max(0, stage - 1))).toFixed(3);
}

// Enemy HP scaling: fractional increases to keep early stages easy but later stages tougher.
export function enemyHealthForStage(stage){
  return 1 + Math.floor((stage - 1) * 0.5);
}

// AI complexity tiers: increases every 2 stages up to a cap.
export function aiComplexity(stage){
  return Math.min(4, Math.floor(stage / 2));
}

export function stageProgress(stage, maxStage){
  const maxS = Math.max(2, Number(maxStage) || 2);
  return Math.min(1, Math.max(0, (Math.max(1, stage) - 1) / (maxS - 1)));
}

// Central wave profile driven by stage progress, max stage, and selected difficulty.
export function waveDifficulty(stage, maxStage, difficulty = 'normal'){
  const p = stageProgress(stage, maxStage);
  const diffSpawn = difficulty === 'easy' ? 0.88 : (difficulty === 'hard' ? 1.22 : 1.0);
  const diffSpeed = difficulty === 'easy' ? 0.85 : (difficulty === 'hard' ? 1.22 : 1.0);
  const diffBoss = difficulty === 'easy' ? 1.15 : (difficulty === 'hard' ? 0.78 : 1.0);

  return {
    progress: p,
    // How quickly spawn interval decays each second during non-boss waves.
    spawnDecayPerSec: (8 + p * 22) * diffSpawn,
    // Passive speed gain while no stage-ease is running.
    passiveSpeedGrowth: (0.010 + p * 0.030) * diffSpeed,
    // Chance for extra chaos spawns as stage progresses.
    chaosChance: (0.004 + p * 0.020) * (difficulty === 'easy' ? 0.7 : (difficulty === 'hard' ? 1.2 : 1.0)),
    extraSpawnChance: Math.min(0.85, 0.08 + p * 0.62),
    // Obstacle spawn interval tightening multiplier.
    obstacleIntervalScale: 1 - p * 0.48,
    // Boss warning duration gets shorter as players progress.
    bossWarningTime: Math.max(2.4, (6.2 - p * 2.8) * diffBoss)
  };
}
