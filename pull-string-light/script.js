/**
 * Interactive Pull-String Light Switch & Ambience Application
 * Features: Physics-based string pull, Web Audio sound synthesis, particle beam dynamics.
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Element References
  const body = document.body;
  const pullHandle = document.getElementById('pullHandle');
  const stringPath = document.getElementById('stringPath');
  const statusBadge = document.getElementById('statusBadge');
  const quickToggleBtn = document.getElementById('quickToggleBtn');
  const quickToggleText = document.getElementById('quickToggleText');
  const dimmerSlider = document.getElementById('dimmerSlider');
  const dimmerVal = document.getElementById('dimmerVal');
  const soundToggle = document.getElementById('soundToggle');
  const dustCanvas = document.getElementById('dustCanvas');
  const ctx = dustCanvas.getContext('2d');

  // State Management
  let isLightOn = false;
  let soundEnabled = true;
  let audioCtx = null;
  let brightness = 1.0;

  // String Physics Variables
  const REST_Y = 220;           // Handle rest position Y
  const PULL_THRESHOLD = 265;   // Pull Y needed to trigger click switch
  const MAX_PULL_Y = 320;       // Hard stop limit
  let currentY = REST_Y;
  let targetY = REST_Y;
  let stringVelocity = 0;
  let stringAngle = 0;
  let isDragging = false;
  let pullTriggeredInCurrentDrag = false;
  let dragStartY = 0;

  // Sound Engine Setup (Web Audio API)
  function initAudio() {
    if (!audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioCtx();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  // Play Mechanical Switch Click Sound
  function playClickSound(isTurningOn) {
    if (!soundEnabled) return;
    initAudio();
    if (!audioCtx) return;

    const now = audioCtx.currentTime;
    
    // Sharp click oscillator 1
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(isTurningOn ? 1200 : 800, now);
    osc1.frequency.exponentialRampToValueAtTime(100, now + 0.04);
    
    gain1.gain.setValueAtTime(0.5, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    
    osc1.start(now);
    osc1.stop(now + 0.04);

    // Mechanical snap oscillator 2
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(isTurningOn ? 2400 : 1800, now + 0.005);
    osc2.frequency.exponentialRampToValueAtTime(200, now + 0.03);
    
    gain2.gain.setValueAtTime(0.3, now + 0.005);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);

    osc2.start(now + 0.005);
    osc2.stop(now + 0.03);
  }

  // Play Cord Tension Slide Sound
  function playPullSound() {
    if (!soundEnabled) return;
    initAudio();
    if (!audioCtx) return;

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(280, now + 0.08);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
  }

  // Toggle Light State
  function toggleLight(forceState = null) {
    isLightOn = forceState !== null ? forceState : !isLightOn;

    if (isLightOn) {
      body.classList.remove('state-off');
      body.classList.add('state-on');
      statusBadge.textContent = 'LIGHT ON';
      quickToggleText.textContent = 'Turn Light OFF';
    } else {
      body.classList.remove('state-on');
      body.classList.add('state-off');
      statusBadge.textContent = 'LIGHT OFF';
      quickToggleText.textContent = 'Turn Light ON';
    }

    playClickSound(isLightOn);
  }

  // String Physics & Render Loop
  function updatePhysics() {
    if (!isDragging) {
      // Spring force towards REST_Y
      const springK = 0.18;
      const damping = 0.78;
      
      const displacement = REST_Y - currentY;
      const force = displacement * springK;
      
      stringVelocity = (stringVelocity + force) * damping;
      currentY += stringVelocity;

      // Damp string sway angle
      stringAngle *= 0.92;
    }

    // Render string curve SVG
    const originX = 10;
    const originY = 0;
    const currentX = originX + Math.sin(stringAngle) * (currentY * 0.15);
    
    // Quad curve control point for string flex
    const ctrlX = (originX + currentX) / 2 + Math.sin(stringAngle * 1.5) * 15;
    const ctrlY = currentY * 0.5;

    stringPath.setAttribute('d', `M ${originX} ${originY} Q ${ctrlX} ${ctrlY} ${currentX} ${currentY}`);
    pullHandle.style.transform = `translate(-50%, ${currentY - REST_Y}px) rotate(${stringAngle * 0.5}rad)`;

    requestAnimationFrame(updatePhysics);
  }

  // Handle Drag Pointer Events
  function onPointerDown(e) {
    isDragging = true;
    pullTriggeredInCurrentDrag = false;
    dragStartY = e.clientY || (e.touches && e.touches[0].clientY);
    playPullSound();
    
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('touchmove', onPointerMove, { passive: false });
    document.addEventListener('touchend', onPointerUp);
  }

  function onPointerMove(e) {
    if (!isDragging) return;
    if (e.cancelable) e.preventDefault();

    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    const deltaY = clientY - dragStartY;
    
    // Calculate new position with rubber-band resistance beyond MAX_PULL_Y
    let newY = REST_Y + deltaY;
    if (newY > MAX_PULL_Y) {
      newY = MAX_PULL_Y + (newY - MAX_PULL_Y) * 0.2;
    }
    if (newY < REST_Y - 20) {
      newY = REST_Y - 20;
    }

    currentY = newY;

    // Check if threshold crossed to click switch
    if (currentY >= PULL_THRESHOLD && !pullTriggeredInCurrentDrag) {
      pullTriggeredInCurrentDrag = true;
      toggleLight();
      // Visual pulse response
      pullHandle.style.filter = 'brightness(1.5)';
      setTimeout(() => pullHandle.style.filter = 'none', 150);
    }
  }

  function onPointerUp() {
    if (!isDragging) return;
    isDragging = false;
    
    // Add residual swing velocity
    stringVelocity = 5;
    stringAngle = (Math.random() - 0.5) * 0.4;

    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
    document.removeEventListener('touchmove', onPointerMove);
    document.removeEventListener('touchend', onPointerUp);
  }

  // Animated Click Tug for Handle or Quick Toggle
  function animateTug() {
    playPullSound();
    let startTime = null;
    const duration = 300;

    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      const progress = (timestamp - startTime) / duration;

      if (progress < 0.4) {
        // Pull down phase
        currentY = REST_Y + (PULL_THRESHOLD - REST_Y + 15) * (progress / 0.4);
      } else {
        // Release spring back phase
        if (!pullTriggeredInCurrentDrag) {
          pullTriggeredInCurrentDrag = true;
          toggleLight();
        }
        const relProg = (progress - 0.4) / 0.6;
        currentY = REST_Y + (PULL_THRESHOLD - REST_Y + 15) * (1 - relProg);
      }

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        currentY = REST_Y;
        pullTriggeredInCurrentDrag = false;
        stringVelocity = 8;
        stringAngle = (Math.random() - 0.5) * 0.3;
      }
    }

    pullTriggeredInCurrentDrag = false;
    requestAnimationFrame(step);
  }

  // Bind Event Listeners
  pullHandle.addEventListener('pointerdown', onPointerDown);
  pullHandle.addEventListener('click', (e) => {
    // If it was just a quick click without significant drag
    if (Math.abs(currentY - REST_Y) < 10) {
      animateTug();
    }
  });

  quickToggleBtn.addEventListener('click', () => {
    animateTug();
  });

  // Dimmer Control
  dimmerSlider.addEventListener('input', (e) => {
    brightness = e.target.value / 100;
    dimmerVal.textContent = `${e.target.value}%`;
    document.documentElement.style.setProperty('--light-intensity', brightness);
  });

  // Sound Toggle Control
  soundToggle.addEventListener('change', (e) => {
    soundEnabled = e.target.checked;
  });

  // Color Presets Map
  const colorMap = {
    'edison': { primary: '#ffaa33', secondary: 'rgba(255, 170, 51, 0.4)' },
    'amber': { primary: '#ff6600', secondary: 'rgba(255, 102, 0, 0.4)' },
    'white': { primary: '#ffffff', secondary: 'rgba(255, 255, 255, 0.4)' },
    'neon-pink': { primary: '#ff007f', secondary: 'rgba(255, 0, 127, 0.4)' },
    'cyan': { primary: '#00e5ff', secondary: 'rgba(0, 229, 255, 0.4)' },
    'emerald': { primary: '#00ff88', secondary: 'rgba(0, 255, 136, 0.4)' }
  };

  document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const colorKey = btn.getAttribute('data-color');
      const colors = colorMap[colorKey] || colorMap['edison'];

      document.documentElement.style.setProperty('--glow-primary', colors.primary);
      document.documentElement.style.setProperty('--glow-secondary', colors.secondary);
    });
  });

  // Room Theme Buttons
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const theme = btn.getAttribute('data-theme');
      body.className = body.className.replace(/theme-\w+/g, '');
      body.classList.add(`theme-${theme}`);
    });
  });

  // Panel Minimize Button
  const togglePanelBtn = document.getElementById('togglePanelBtn');
  const controlPanel = document.querySelector('.control-panel');
  togglePanelBtn.addEventListener('click', () => {
    controlPanel.classList.toggle('collapsed');
  });

  // --- Dust Motes Particle Canvas Simulation ---
  function resizeCanvas() {
    dustCanvas.width = window.innerWidth;
    dustCanvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  const particles = [];
  const PARTICLE_COUNT = 45;

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      radius: Math.random() * 2 + 0.6,
      alpha: Math.random() * 0.7 + 0.2,
      vx: (Math.random() - 0.5) * 0.4,
      vy: Math.random() * 0.3 + 0.1,
      sway: Math.random() * Math.PI * 2
    });
  }

  function renderParticles() {
    ctx.clearRect(0, 0, dustCanvas.width, dustCanvas.height);

    if (isLightOn) {
      const centerX = window.innerWidth / 2;

      particles.forEach(p => {
        p.sway += 0.02;
        p.x += p.vx + Math.sin(p.sway) * 0.3;
        p.y += p.vy;

        // Wrap around boundaries
        if (p.y > window.innerHeight) p.y = 120;
        if (p.x < 0) p.x = window.innerWidth;
        if (p.x > window.innerWidth) p.x = 0;

        // Fade particle intensity based on distance to center light beam
        const distFromCenter = Math.abs(p.x - centerX);
        const maxDist = window.innerWidth * 0.35;
        const lightFactor = Math.max(0, 1 - (distFromCenter / maxDist));

        if (lightFactor > 0) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha * lightFactor * brightness})`;
          ctx.fill();
        }
      });
    }

    requestAnimationFrame(renderParticles);
  }

  // Start Loops
  updatePhysics();
  renderParticles();
});
