const { spawnTarget, spawnInitial, speedTargetMultiplier, enemyHealthForStage, aiComplexity } = require('../src/systems/scaling.js');

function show() {
  const spawnBase = 1100;
  console.log('Stage | spawnInitial | spawnTarget | speedMult | enemyHP | aiComplex');
  for (let stage = 1; stage <= 12; stage++){
    const si = spawnInitial(spawnBase);
    const st = spawnTarget(spawnBase, stage);
    const sp = speedTargetMultiplier(1, stage);
    const hp = enemyHealthForStage(stage);
    const ai = aiComplexity(stage);
    console.log(`${stage.toString().padStart(5)} | ${si.toString().padStart(12)} | ${st.toString().padStart(11)} | ${sp.toFixed(3).padStart(8)} | ${hp.toString().padStart(6)} | ${ai}`);
  }
}

show();
