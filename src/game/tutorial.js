function svgDataUri(svg){
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace(/\n+/g, ' ').replace(/\s{2,}/g, ' ').trim());
}

function tutorialSlideImage({ title, subtitle, accent, scene }){
  return svgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540" role="img" aria-label="${title}">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#08182f" />
          <stop offset="100%" stop-color="#040914" />
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="42%" r="60%">
          <stop offset="0%" stop-color="${accent}" stop-opacity="0.28" />
          <stop offset="55%" stop-color="${accent}" stop-opacity="0.08" />
          <stop offset="100%" stop-color="#000000" stop-opacity="0" />
        </radialGradient>
        <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
      </defs>
      <rect width="960" height="540" fill="url(#bg)" />
      <rect width="960" height="540" fill="url(#glow)" />
      <circle cx="480" cy="274" r="170" fill="none" stroke="${accent}" stroke-opacity="0.12" stroke-width="2" stroke-dasharray="18 18">
        <animate attributeName="r" values="162;176;162" dur="5.8s" repeatCount="indefinite" />
        <animate attributeName="stroke-opacity" values="0.08;0.2;0.08" dur="4.8s" repeatCount="indefinite" />
      </circle>
      <g opacity="0.18" stroke="#b7d9ff" stroke-width="1">
        <path d="M0 430H960M0 360H960M0 290H960M0 220H960M0 150H960M0 80H960" />
        <path d="M120 0V540M240 0V540M360 0V540M480 0V540M600 0V540M720 0V540M840 0V540" />
      </g>
      ${scene}
      <g font-family="system-ui, Arial, sans-serif" fill="#dff3ff">
        <text x="52" y="66" font-size="40" font-weight="800">${title}</text>
        <text x="52" y="104" font-size="22" opacity="0.82">${subtitle}</text>
      </g>
    </svg>
  `);
}

function makeSlides(){
  return [
    {
      key: 'move',
      tag: 'Move',
      title: 'Move your mouse',
      copy: 'Your rendered cursor is the player. The OS cursor is hidden, so the blue shape on screen is the thing you control.',
      bullets: ['Choose circle or square before starting.', 'The smaller cursor option makes the visual target 10% smaller.', 'Smooth movement gives the best control.'],
      image: tutorialSlideImage({
        title: 'Move your mouse',
        subtitle: 'The rendered cursor follows your mouse instead of the OS pointer.',
        accent: '#3b82f6',
        scene: `
          <g filter="url(#softGlow)">
            <circle cx="458" cy="292" r="38" fill="#3b82f6">
              <animate attributeName="r" values="34;40;34" dur="2.4s" repeatCount="indefinite" />
            </circle>
          </g>
          <g>
            <rect x="438" y="272" width="40" height="40" rx="10" fill="#3b82f6" stroke="#f6fbff" stroke-opacity="0.22" stroke-width="4">
              <animateTransform attributeName="transform" type="scale" values="1;1.06;1" additive="sum" dur="2.2s" repeatCount="indefinite" />
            </rect>
          </g>
          <path d="M360 346c42-18 77-48 102-88" fill="none" stroke="#9dd9ff" stroke-width="8" stroke-linecap="round" stroke-dasharray="22 16" opacity="0.85" />
          <path d="M360 346c42-18 77-48 102-88" fill="none" stroke="#ffffff" stroke-opacity="0.25" stroke-width="2" stroke-linecap="round" stroke-dasharray="6 10" />
          <g fill="#fff" opacity="0.45">
            <path d="M282 150l34 10-20 18z" />
            <path d="M674 136l-32 14 18 15z" />
            <path d="M730 374l-34-8 16-19z" />
          </g>
        `
      })
    },
    {
      key: 'dodge',
      tag: 'Dodge',
      title: 'Read enemy movement',
      copy: 'Enemies can rush, shoot, split, orbit, or chase. Staying calm and nudging away early works better than hard stops.',
      bullets: ['Red shapes are the main threats.', 'Some enemies chase, some fire shots, and some orbit before breaking off.', 'Keep a little breathing room around the player.'],
      image: tutorialSlideImage({
        title: 'Read enemy movement',
        subtitle: 'Different enemy shapes move differently, so react early instead of late.',
        accent: '#ef4444',
        scene: `
          <g filter="url(#softGlow)">
            <circle cx="410" cy="322" r="34" fill="#3b82f6" />
          </g>
          <rect x="392" y="304" width="36" height="36" rx="10" fill="#3b82f6" stroke="#f6fbff" stroke-opacity="0.22" stroke-width="4" />
          <g>
            <circle cx="716" cy="168" r="28" fill="#ef4444">
              <animate attributeName="cx" values="716;668;716" dur="2.8s" repeatCount="indefinite" />
            </circle>
          </g>
          <g>
            <circle cx="218" cy="178" r="22" fill="#7c3aed">
              <animateTransform attributeName="transform" type="translate" values="0,0; 22,12; 0,0" dur="3.1s" repeatCount="indefinite" />
            </circle>
          </g>
          <g>
            <polygon points="740,376 712,338 768,338" fill="#fb7185">
              <animateTransform attributeName="transform" type="translate" values="0,0; -18,-10; 0,0" dur="2.6s" repeatCount="indefinite" />
            </polygon>
          </g>
          <circle cx="540" cy="250" r="18" fill="#22d3ee">
            <animateTransform attributeName="transform" type="translate" values="0,0; 32,24; 0,0" dur="2.9s" repeatCount="indefinite" />
          </circle>
          <path d="M218 178 C320 220, 406 244, 462 286" fill="none" stroke="#7c3aed" stroke-width="8" stroke-linecap="round" stroke-dasharray="16 16" opacity="0.7" />
          <path d="M716 168 C652 212, 584 250, 470 294" fill="none" stroke="#ef4444" stroke-width="8" stroke-linecap="round" stroke-dasharray="14 10" opacity="0.78" />
          <path d="M740 376 C650 334, 558 320, 468 318" fill="none" stroke="#fb7185" stroke-width="8" stroke-linecap="round" stroke-dasharray="12 10" opacity="0.78" />
        `
      })
    },
    {
      key: 'telegraph',
      tag: 'Telegraph',
      title: 'Watch the warning shapes',
      copy: 'Orange and dotted highlights tell you where danger is about to appear. React to those warnings, not the danger itself.',
      bullets: ['Orange shapes mark obstacle landings.', 'The dotted outline gets clearer as the spawn time gets closer.', 'Boss spawns now show a localized warning.'],
      image: tutorialSlideImage({
        title: 'Watch the warning shapes',
        subtitle: 'Telegraphs mark the landing zone before the hazard arrives.',
        accent: '#fb923c',
        scene: `
          <rect x="168" y="286" width="160" height="84" rx="12" fill="#fb923c" opacity="0.52">
            <animate attributeName="opacity" values="0.34;0.62;0.34" dur="2.7s" repeatCount="indefinite" />
          </rect>
          <rect x="168" y="286" width="160" height="84" rx="12" fill="none" stroke="#fff7ed" stroke-opacity="0.8" stroke-width="4" stroke-dasharray="14 10">
            <animate attributeName="stroke-dashoffset" values="0;24" dur="1.8s" repeatCount="indefinite" />
          </rect>
          <rect x="176" y="294" width="144" height="68" rx="10" fill="none" stroke="#ffffff" stroke-opacity="0.18" stroke-width="2" />
          <circle cx="676" cy="252" r="78" fill="none" stroke="#ffd8a8" stroke-width="6" stroke-dasharray="14 12" opacity="0.9">
            <animate attributeName="r" values="72;84;72" dur="2.9s" repeatCount="indefinite" />
          </circle>
          <circle cx="676" cy="252" r="40" fill="#ff6b6b" opacity="0.18" />
          <circle cx="676" cy="252" r="10" fill="#fff7ed" opacity="0.82" />
          <circle cx="362" cy="382" r="30" fill="#3b82f6" />
        `
      })
    },
    {
      key: 'boss',
      tag: 'Boss',
      title: 'Boss fights and stages',
      copy: 'Each stage ramps toward a boss. The wave pacing, difficulty, and boss warning all scale as you get deeper into the run.',
      bullets: ['Boss warning appears where the boss will spawn.', 'Higher stages spawn faster, nastier waves.', 'Use settings to tune stage duration and spawn pacing.'],
      image: tutorialSlideImage({
        title: 'Boss fights and stages',
        subtitle: 'A localized spawn ring shows the boss location before it arrives.',
        accent: '#f59e0b',
        scene: `
          <circle cx="652" cy="240" r="98" fill="none" stroke="#ffd8a8" stroke-width="6" stroke-dasharray="16 12" opacity="0.9">
            <animate attributeName="r" values="90;104;90" dur="2.4s" repeatCount="indefinite" />
          </circle>
          <circle cx="652" cy="240" r="58" fill="#f59e0b" opacity="0.18" />
          <circle cx="652" cy="240" r="14" fill="#fff7ed" opacity="0.9" />
          <rect x="308" y="330" width="42" height="42" rx="10" fill="#3b82f6" />
          <circle cx="300" cy="330" r="62" fill="none" stroke="#60a5fa" stroke-width="3" stroke-dasharray="10 12" opacity="0.35" />
          <text x="610" y="370" font-size="34" fill="#fff7ed" font-family="system-ui, Arial, sans-serif" font-weight="800">Boss in 3s</text>
        `
      })
    },
    {
      key: 'debug',
      tag: 'Debug',
      title: 'Practice in the debug sandbox',
      copy: 'Turn on the debug sandbox to freeze normal spawning and manually summon enemy types. It is the fastest way to learn what each pattern does.',
      bullets: ['Press F3 to show the debug panel.', 'Press B or click Debug Sandbox to pause normal spawning.', 'Press 1-0 to spawn enemy types, and hold Shift to spawn five.'],
      image: tutorialSlideImage({
        title: 'Practice in the debug sandbox',
        subtitle: 'Spawn each enemy type on demand and read its pattern up close.',
        accent: '#22d3ee',
        scene: `
          <rect x="118" y="118" width="330" height="214" rx="16" fill="rgba(2,6,23,0.5)" stroke="#7dd3fc" stroke-opacity="0.32" stroke-width="2" />
          <g fill="#dff3ff" font-family="system-ui, Arial, sans-serif" font-size="22" font-weight="700">
            <text x="146" y="160">F3 debug panel</text>
            <text x="146" y="196" font-size="18" opacity="0.82">B toggles sandbox mode</text>
            <text x="146" y="228" font-size="18" opacity="0.82">1-0 spawn enemies</text>
            <text x="146" y="260" font-size="18" opacity="0.82">Shift spawns five</text>
          </g>
          <g filter="url(#softGlow)">
            <circle cx="644" cy="170" r="28" fill="#ef4444">
              <animateTransform attributeName="transform" type="translate" values="0,0; -18,12; 0,0" dur="2.4s" repeatCount="indefinite" />
            </circle>
            <polygon points="726,230 696,190 756,190" fill="#fb7185">
              <animateTransform attributeName="transform" type="translate" values="0,0; 16,-8; 0,0" dur="2.2s" repeatCount="indefinite" />
            </polygon>
            <rect x="586" y="274" width="56" height="56" rx="12" fill="#7c3aed">
              <animateTransform attributeName="transform" type="rotate" values="0 614 302; 8 614 302; 0 614 302" dur="3s" repeatCount="indefinite" />
            </rect>
            <polygon points="728,336 702,306 756,306" fill="#22d3ee">
              <animateTransform attributeName="transform" type="translate" values="0,0; -22,0; 0,0" dur="2.8s" repeatCount="indefinite" />
            </polygon>
          </g>
        `
      })
    },
    {
      key: 'ready',
      tag: 'Ready',
      title: 'Ready to play',
      copy: 'The full loop is simple: move, dodge, read the telegraphs, and survive to the next stage.',
      bullets: ['Easy is best for the first run.', 'Normal is the balanced default.', 'Hard ramps faster and is tuned for longer runs.'],
      image: tutorialSlideImage({
        title: 'Ready to play',
        subtitle: 'All the basics in one scene: movement, enemies, and a boss warning.',
        accent: '#60a5fa',
        scene: `
          <circle cx="372" cy="314" r="32" fill="#3b82f6" />
          <rect x="356" y="298" width="32" height="32" rx="8" fill="#3b82f6" stroke="#f6fbff" stroke-opacity="0.22" stroke-width="4" />
          <circle cx="674" cy="188" r="24" fill="#ef4444" />
          <circle cx="718" cy="352" r="24" fill="#7c3aed" />
          <circle cx="642" cy="272" r="16" fill="#22d3ee" />
          <circle cx="670" cy="242" r="92" fill="none" stroke="#ffd8a8" stroke-width="5" stroke-dasharray="14 12" opacity="0.55">
            <animate attributeName="r" values="84;98;84" dur="2.8s" repeatCount="indefinite" />
          </circle>
          <text x="56" y="470" font-size="26" fill="#dff3ff" font-family="system-ui, Arial, sans-serif" font-weight="700">Move. Dodge. Read the telegraphs.</text>
        `
      })
    }
  ];
}

export function createTutorialShowcase({ document, onStartGame, onOpenDebugSandbox } = {}){
  const tutorialOverlay = document.getElementById('tutorial');
  const tutorialCounterEl = document.getElementById('tutorial-counter');
  const tutorialProgressFillEl = document.getElementById('tutorial-progress-fill');
  const tutorialStageTagEl = document.getElementById('tutorial-stage-tag');
  const tutorialVisualImageEl = document.getElementById('tutorial-visual-image');
  const tutorialTitleEl = document.getElementById('tutorial-title');
  const tutorialCopyEl = document.getElementById('tutorial-copy');
  const tutorialBulletsEl = document.getElementById('tutorial-bullets');
  const tutorialDotsEl = document.getElementById('tutorial-dots');
  const tutorialPrevBtn = document.getElementById('tutorialPrev');
  const tutorialPlayBtn = document.getElementById('tutorialPlay');
  const tutorialNextBtn = document.getElementById('tutorialNext');
  const tutorialStartBtn = document.getElementById('tutorialStart');
  const tutorialCloseBtn = document.getElementById('tutorialClose');
  const openTutorialStartBtn = document.getElementById('openTutorialStart');
  const debugSandboxBtn = document.getElementById('tutorialDebugSandboxStart');

  const slides = makeSlides();
  let tutorialIndex = 0;
  let tutorialPlaying = true;
  let tutorialTimer = null;

  function stopTimer(){
    if(tutorialTimer){ clearInterval(tutorialTimer); tutorialTimer = null; }
  }

  function restartTimer(){
    stopTimer();
    if(tutorialOverlay && !tutorialOverlay.classList.contains('hidden') && tutorialPlaying){
      tutorialTimer = setInterval(()=>{
        tutorialIndex = (tutorialIndex + 1) % slides.length;
        renderSlide();
      }, 3600);
    }
  }

  function buildDots(){
    if(!tutorialDotsEl){ return; }
    tutorialDotsEl.innerHTML = '';
    slides.forEach((_, idx)=>{
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'tutorial-dot' + (idx === tutorialIndex ? ' active' : '');
      dot.setAttribute('aria-label', 'Go to tutorial slide ' + (idx + 1));
      dot.addEventListener('click', ()=>{
        tutorialIndex = idx;
        renderSlide();
        restartTimer();
      });
      tutorialDotsEl.appendChild(dot);
    });
  }

  function renderSlide(){
    const slide = slides[tutorialIndex] || slides[0];
    if(tutorialCounterEl) { tutorialCounterEl.textContent = (tutorialIndex + 1) + ' / ' + slides.length; }
    if(tutorialProgressFillEl) { tutorialProgressFillEl.style.width = (((tutorialIndex + 1) / slides.length) * 100) + '%'; }
    if(tutorialStageTagEl) { tutorialStageTagEl.textContent = slide.tag; }
    if(tutorialTitleEl) { tutorialTitleEl.textContent = slide.title; }
    if(tutorialCopyEl) { tutorialCopyEl.textContent = slide.copy; }
    if(tutorialBulletsEl){
      tutorialBulletsEl.innerHTML = '';
      slide.bullets.forEach(text=>{
        const li = document.createElement('li');
        li.textContent = text;
        tutorialBulletsEl.appendChild(li);
      });
    }
    if(tutorialVisualImageEl){
      tutorialVisualImageEl.src = slide.image;
      tutorialVisualImageEl.alt = slide.title;
      tutorialVisualImageEl.dataset.slideKey = slide.key;
    }
    if(tutorialPlayBtn){ tutorialPlayBtn.textContent = tutorialPlaying ? 'Pause' : 'Play'; }
    if(tutorialDotsEl){
      Array.from(tutorialDotsEl.children).forEach((dot, idx)=>{
        dot.classList.toggle('active', idx === tutorialIndex);
      });
    }
  }

  function open(){
    tutorialIndex = 0;
    tutorialPlaying = true;
    if(tutorialOverlay){ tutorialOverlay.classList.remove('hidden'); }
    buildDots();
    renderSlide();
    restartTimer();
  }

  function close(){
    stopTimer();
    if(tutorialOverlay){ tutorialOverlay.classList.add('hidden'); }
  }

  function next(){
    tutorialIndex = (tutorialIndex + 1) % slides.length;
    renderSlide();
  }

  function prev(){
    tutorialIndex = (tutorialIndex - 1 + slides.length) % slides.length;
    renderSlide();
  }

  function togglePlay(){
    tutorialPlaying = !tutorialPlaying;
    renderSlide();
    restartTimer();
  }

  function openDebugSandbox(){
    onOpenDebugSandbox?.();
  }

  if(openTutorialStartBtn){ openTutorialStartBtn.addEventListener('click', ()=> open()); }
  if(debugSandboxBtn){ debugSandboxBtn.addEventListener('click', ()=> openDebugSandbox()); }
  if(tutorialPrevBtn){ tutorialPrevBtn.addEventListener('click', ()=>{ prev(); restartTimer(); }); }
  if(tutorialPlayBtn){ tutorialPlayBtn.addEventListener('click', ()=> togglePlay()); }
  if(tutorialNextBtn){ tutorialNextBtn.addEventListener('click', ()=>{ next(); restartTimer(); }); }
  if(tutorialStartBtn){ tutorialStartBtn.addEventListener('click', ()=>{ close(); onStartGame?.(); }); }
  if(tutorialCloseBtn){ tutorialCloseBtn.addEventListener('click', ()=> close()); }

  buildDots();
  renderSlide();

  return {
    open,
    close,
    next,
    prev,
    togglePlay,
    renderSlide,
    get index(){ return tutorialIndex; },
    get playing(){ return tutorialPlaying; }
  };
}
