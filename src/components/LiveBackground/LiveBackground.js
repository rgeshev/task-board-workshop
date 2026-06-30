import './LiveBackground.css';

const PALETTE = {
  violet: '#8b5cff',
  indigo: '#5b8def',
  cyan: '#22d3ee',
  pink: '#f472b6',
  green: '#34d399',
  amber: '#fbbf24',
};

const ACCENTS = [PALETTE.violet, PALETTE.indigo, PALETTE.cyan, PALETTE.pink, PALETTE.green];

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

/* ---------------- Entities ---------------- */

function createParticles(count, width, height) {
  return Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: rand(-0.15, 0.15),
    vy: rand(-0.15, 0.15),
    r: rand(1, 2.4),
  }));
}

function createCard(width, height) {
  return {
    type: 'card',
    x: rand(0.05, 0.95) * width,
    y: rand(0, 1) * height,
    w: rand(150, 210),
    rows: Math.round(rand(2, 3)),
    accent: pick(ACCENTS),
    checked: Math.random() > 0.5,
    speed: rand(8, 20),
    drift: rand(-6, 6),
    phase: rand(0, Math.PI * 2),
    alpha: rand(0.5, 0.85),
  };
}

function createBars(width, height) {
  return {
    type: 'bars',
    x: rand(0.05, 0.95) * width,
    y: rand(0, 1) * height,
    count: Math.round(rand(4, 6)),
    bw: rand(8, 12),
    gap: rand(6, 9),
    h: rand(46, 74),
    accent: pick(ACCENTS),
    speed: rand(8, 18),
    drift: rand(-6, 6),
    phase: rand(0, Math.PI * 2),
    alpha: rand(0.45, 0.75),
  };
}

function createDonut(width, height) {
  return {
    type: 'donut',
    x: rand(0.05, 0.95) * width,
    y: rand(0, 1) * height,
    r: rand(24, 40),
    accent: pick(ACCENTS),
    speed: rand(8, 16),
    drift: rand(-5, 5),
    phase: rand(0, Math.PI * 2),
    alpha: rand(0.5, 0.8),
  };
}

function createIcon(width, height) {
  return {
    type: 'icon',
    glyph: pick(['check', 'clock', 'flag', 'list', 'bolt']),
    x: rand(0.05, 0.95) * width,
    y: rand(0, 1) * height,
    size: rand(26, 44),
    accent: pick(ACCENTS),
    speed: rand(10, 22),
    drift: rand(-7, 7),
    phase: rand(0, Math.PI * 2),
    spin: rand(-0.0006, 0.0006),
    alpha: rand(0.5, 0.85),
  };
}

/* ---------------- Drawing ---------------- */

function drawCardEntity(ctx, e, t) {
  const sway = Math.sin(t * 0.0006 + e.phase) * 6;
  const x = e.x + sway;
  const y = e.y;
  const w = e.w;
  const pad = 14;
  const rowH = 9;
  const h = pad * 2 + 26 + e.rows * (rowH + 9);

  ctx.save();
  ctx.globalAlpha = e.alpha;
  ctx.shadowColor = 'rgba(8, 12, 28, 0.55)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 12;

  roundRect(ctx, x, y, w, h, 16);
  ctx.fillStyle = 'rgba(20, 27, 54, 0.72)';
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.stroke();

  ctx.fillStyle = e.accent;
  roundRect(ctx, x + pad, y + pad, 30, 6, 3);
  ctx.globalAlpha = e.alpha * 0.8;
  ctx.fill();

  const cy = y + pad + 20;
  ctx.globalAlpha = e.alpha;
  ctx.beginPath();
  ctx.arc(x + pad + 7, cy + 4, 7, 0, Math.PI * 2);
  if (e.checked) {
    ctx.fillStyle = e.accent;
    ctx.fill();
    ctx.strokeStyle = '#0a0f1f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + pad + 3.5, cy + 4);
    ctx.lineTo(x + pad + 6, cy + 6.5);
    ctx.lineTo(x + pad + 10.5, cy + 1.5);
    ctx.stroke();
  } else {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(232, 236, 251, 0.55)';
  roundRect(ctx, x + pad + 22, cy, w - pad * 2 - 22, rowH - 2, 3);
  ctx.fill();

  for (let i = 0; i < e.rows; i += 1) {
    const ry = y + pad + 36 + i * (rowH + 9);
    const rw = (w - pad * 2) * (i === e.rows - 1 ? 0.6 : 0.92);
    ctx.fillStyle = 'rgba(154, 166, 199, 0.35)';
    roundRect(ctx, x + pad, ry, rw, rowH, 3);
    ctx.fill();
  }

  ctx.restore();
}

function drawBarsEntity(ctx, e, t) {
  const sway = Math.sin(t * 0.0007 + e.phase) * 5;
  const baseX = e.x + sway;
  const baseY = e.y + e.h;

  ctx.save();
  ctx.globalAlpha = e.alpha;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(baseX - 4, baseY + 4);
  ctx.lineTo(baseX + e.count * (e.bw + e.gap), baseY + 4);
  ctx.stroke();

  for (let i = 0; i < e.count; i += 1) {
    const wave = (Math.sin(t * 0.002 + e.phase + i * 0.7) + 1) / 2;
    const bh = 14 + wave * e.h;
    const bx = baseX + i * (e.bw + e.gap);
    const by = baseY - bh;
    const grad = ctx.createLinearGradient(0, by, 0, baseY);
    grad.addColorStop(0, e.accent);
    grad.addColorStop(1, 'rgba(91, 141, 239, 0.15)');
    ctx.fillStyle = grad;
    ctx.shadowColor = e.accent;
    ctx.shadowBlur = 12;
    roundRect(ctx, bx, by, e.bw, bh, 3);
    ctx.fill();
  }
  ctx.restore();
}

function drawDonutEntity(ctx, e, t) {
  const sway = Math.sin(t * 0.0006 + e.phase) * 5;
  const x = e.x + sway;
  const y = e.y;
  const progress = (Math.sin(t * 0.0009 + e.phase) + 1) / 2;
  const end = -Math.PI / 2 + progress * Math.PI * 2;

  ctx.save();
  ctx.globalAlpha = e.alpha;
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.arc(x, y, e.r, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(x, y, e.r, -Math.PI / 2, end);
  ctx.strokeStyle = e.accent;
  ctx.shadowColor = e.accent;
  ctx.shadowBlur = 16;
  ctx.stroke();

  ctx.shadowColor = 'transparent';
  ctx.fillStyle = 'rgba(232, 236, 251, 0.8)';
  ctx.font = '600 13px Sora, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${Math.round(progress * 100)}%`, x, y + 1);
  ctx.restore();
}

function drawGlyphPath(ctx, glyph, s) {
  ctx.lineWidth = Math.max(2, s * 0.08);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (glyph === 'check') {
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-s * 0.22, 0);
    ctx.lineTo(-s * 0.05, s * 0.18);
    ctx.lineTo(s * 0.26, -s * 0.2);
    ctx.stroke();
  } else if (glyph === 'clock') {
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -s * 0.28);
    ctx.moveTo(0, 0);
    ctx.lineTo(s * 0.22, s * 0.05);
    ctx.stroke();
  } else if (glyph === 'flag') {
    ctx.beginPath();
    ctx.moveTo(-s * 0.3, -s * 0.4);
    ctx.lineTo(-s * 0.3, s * 0.45);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-s * 0.3, -s * 0.38);
    ctx.lineTo(s * 0.32, -s * 0.22);
    ctx.lineTo(-s * 0.3, -s * 0.02);
    ctx.closePath();
    ctx.stroke();
  } else if (glyph === 'list') {
    for (let i = -1; i <= 1; i += 1) {
      const y = i * s * 0.26;
      ctx.beginPath();
      ctx.arc(-s * 0.32, y, s * 0.06, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.15, y);
      ctx.lineTo(s * 0.36, y);
      ctx.stroke();
    }
  } else if (glyph === 'bolt') {
    ctx.beginPath();
    ctx.moveTo(s * 0.12, -s * 0.45);
    ctx.lineTo(-s * 0.22, s * 0.08);
    ctx.lineTo(s * 0.02, s * 0.08);
    ctx.lineTo(-s * 0.12, s * 0.45);
    ctx.lineTo(s * 0.26, -s * 0.1);
    ctx.lineTo(s * 0.02, -s * 0.1);
    ctx.closePath();
    ctx.stroke();
  }
}

function drawIconEntity(ctx, e, t) {
  const sway = Math.sin(t * 0.0008 + e.phase) * 8;
  const bob = Math.cos(t * 0.0011 + e.phase) * 6;
  ctx.save();
  ctx.translate(e.x + sway, e.y + bob);
  ctx.rotate(Math.sin(t * 0.0004 + e.phase) * 0.25);
  ctx.globalAlpha = e.alpha;
  ctx.strokeStyle = e.accent;
  ctx.shadowColor = e.accent;
  ctx.shadowBlur = 14;
  drawGlyphPath(ctx, e.glyph, e.size);
  ctx.restore();
}

/* ---------------- Component ---------------- */

export function renderLiveBackground(container) {
  const wrapper = document.createElement('div');
  wrapper.className = 'live-bg';

  const canvas = document.createElement('canvas');
  canvas.className = 'live-bg__canvas';

  const veil = document.createElement('div');
  veil.className = 'live-bg__veil';

  wrapper.appendChild(canvas);
  wrapper.appendChild(veil);
  container.appendChild(wrapper);

  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let particles = [];
  let entities = [];
  let rafId = null;
  let running = true;

  function build() {
    const rect = wrapper.getBoundingClientRect();
    width = Math.max(rect.width, 1);
    height = Math.max(rect.height, 1);
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const area = width * height;
    const scale = Math.min(area / (1440 * 800), 1.4);

    particles = createParticles(Math.round(70 * scale), width, height);

    entities = [
      ...Array.from({ length: Math.round(5 * scale) }, () => createCard(width, height)),
      ...Array.from({ length: Math.round(4 * scale) }, () => createBars(width, height)),
      ...Array.from({ length: Math.round(3 * scale) }, () => createDonut(width, height)),
      ...Array.from({ length: Math.round(6 * scale) }, () => createIcon(width, height)),
    ];
  }

  function drawParticles() {
    for (let i = 0; i < particles.length; i += 1) {
      const p = particles[i];
      for (let j = i + 1; j < particles.length; j += 1) {
        const q = particles[j];
        const dx = p.x - q.x;
        const dy = p.y - q.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 130) {
          ctx.globalAlpha = (1 - dist / 130) * 0.25;
          ctx.strokeStyle = PALETTE.indigo;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
        }
      }
    }

    for (const p of particles) {
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = PALETTE.cyan;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function updateParticles(dt) {
    for (const p of particles) {
      p.x += p.vx * dt * 0.06;
      p.y += p.vy * dt * 0.06;
      if (p.x < -10) p.x = width + 10;
      if (p.x > width + 10) p.x = -10;
      if (p.y < -10) p.y = height + 10;
      if (p.y > height + 10) p.y = -10;
    }
  }

  function updateEntity(e, dt) {
    e.y -= e.speed * dt * 0.001;
    e.x += e.drift * dt * 0.0006;
    if (e.y < -160) {
      e.y = height + 120;
      e.x = rand(0.05, 0.95) * width;
    }
  }

  function drawEntity(e, t) {
    if (e.type === 'card') drawCardEntity(ctx, e, t);
    else if (e.type === 'bars') drawBarsEntity(ctx, e, t);
    else if (e.type === 'donut') drawDonutEntity(ctx, e, t);
    else if (e.type === 'icon') drawIconEntity(ctx, e, t);
  }

  function renderFrame(t, dt) {
    ctx.clearRect(0, 0, width, height);
    drawParticles();
    for (const e of entities) {
      drawEntity(e, t);
    }
    if (dt > 0) {
      updateParticles(dt);
      for (const e of entities) updateEntity(e, dt);
    }
  }

  let lastTime = performance.now();
  function loop(now) {
    if (!running) return;
    const dt = Math.min(now - lastTime, 50);
    lastTime = now;
    renderFrame(now, dt);
    rafId = requestAnimationFrame(loop);
  }

  function handleResize() {
    build();
    if (reduceMotion) {
      renderFrame(performance.now(), 0);
    }
  }

  let resizeTimer = null;
  function onResize() {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(handleResize, 150);
  }

  function onVisibility() {
    if (document.hidden) {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
    } else if (!reduceMotion) {
      running = true;
      lastTime = performance.now();
      rafId = requestAnimationFrame(loop);
    }
  }

  build();
  window.addEventListener('resize', onResize);
  document.addEventListener('visibilitychange', onVisibility);

  if (reduceMotion) {
    renderFrame(performance.now(), 0);
  } else {
    rafId = requestAnimationFrame(loop);
  }

  return function cleanup() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    window.clearTimeout(resizeTimer);
    window.removeEventListener('resize', onResize);
    document.removeEventListener('visibilitychange', onVisibility);
    wrapper.remove();
  };
}
