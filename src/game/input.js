export function wireGameInput({
  canvas,
  startBtn,
  restartBtn,
  returnToMenuBtn,
  diffBtns,
  openSettingsStart,
  openSettingsEnd,
  openTutorialStart,
  debugSandboxStart,
  closeSettings,
  applySettings,
  document,
  window,
  handlers
}){
  const {
    onMouseMove,
    onPauseToggle,
    onDebugToggle,
    onDebugSandboxToggle,
    onSpawnDebugEnemy,
    onClearEnemies,
    onStartGame,
    onReturnToMainMenu,
    onDifficultyChange,
    onShowSettings,
    onHideSettings,
    onShowTutorial,
    onStartDebugSandbox,
    onApplySettings
  } = handlers;

  const keydownHandler = e=>{
    if(e.key === 'p' || e.key === 'P'){ onPauseToggle?.(); return; }
    if(e.key === 'F3'){ e.preventDefault(); onDebugToggle?.(); return; }
    const tag = e.target && e.target.tagName;
    if(tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {return;}
    if(e.key === 'b' || e.key === 'B'){ e.preventDefault(); onDebugSandboxToggle?.(); return; }
    if(!onSpawnDebugEnemy) {return;}
    const count = e.shiftKey ? 5 : 1;
    if(e.key === '1'){ e.preventDefault(); onSpawnDebugEnemy('straight', count); }
    else if(e.key === '2'){ e.preventDefault(); onSpawnDebugEnemy('homing', count); }
    else if(e.key === '3'){ e.preventDefault(); onSpawnDebugEnemy('zigzag', count); }
    else if(e.key === '4'){ e.preventDefault(); onSpawnDebugEnemy('fast', count); }
    else if(e.key === '5'){ e.preventDefault(); onSpawnDebugEnemy('big', count); }
    else if(e.key === '6'){ e.preventDefault(); onSpawnDebugEnemy('charger', count); }
    else if(e.key === '7'){ e.preventDefault(); onSpawnDebugEnemy('shooter', count); }
    else if(e.key === '8'){ e.preventDefault(); onSpawnDebugEnemy('splitter', count); }
    else if(e.key === '9'){ e.preventDefault(); onSpawnDebugEnemy('dasher', count); }
    else if(e.key === '0'){ e.preventDefault(); onSpawnDebugEnemy('phaser', count); }
    else if((e.key === 'x' || e.key === 'X') && onClearEnemies){ e.preventDefault(); onClearEnemies(); }
  };

  const diffClickHandler = b=> ()=> onDifficultyChange?.(b.dataset.diff);

  if(window && onMouseMove){
    window.addEventListener('mousemove', e=>{ onMouseMove(e.clientX, e.clientY); });
  }
  if(document){ document.addEventListener('keydown', keydownHandler); }

  canvas?.addEventListener('click', ()=>{ onStartGame?.(); });
  restartBtn?.addEventListener('click', ()=> onStartGame?.());
  returnToMenuBtn?.addEventListener('click', ()=> onReturnToMainMenu?.());
  startBtn?.addEventListener('click', ()=> onStartGame?.());
  diffBtns?.forEach(b=> b.addEventListener('click', diffClickHandler(b)));
  openSettingsStart?.addEventListener('click', ()=> onShowSettings?.());
  openSettingsEnd?.addEventListener('click', ()=> onShowSettings?.());
  openTutorialStart?.addEventListener('click', ()=> onShowTutorial?.());
  debugSandboxStart?.addEventListener('click', ()=> onStartDebugSandbox?.());
  closeSettings?.addEventListener('click', ()=> onHideSettings?.());
  applySettings?.addEventListener('click', ()=> onApplySettings?.());

  return () => {
    document?.removeEventListener('keydown', keydownHandler);
  };
}
