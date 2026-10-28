/**
 * Web66 Landing Page Interactive Cosmic Canvas
 */
(function() {
  'use strict';

  const canvas = document.getElementById('demo-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let width = (canvas.width = canvas.parentElement.clientWidth);
  let height = (canvas.height = canvas.parentElement.clientHeight || 380);

  window.addEventListener('resize', () => {
    width = canvas.width = canvas.parentElement.clientWidth;
    height = canvas.height = canvas.parentElement.clientHeight || 380;
    initStars();
  });

  // Starfield
  let stars = [];
  function initStars() {
    stars = [];
    for (let i = 0; i < 90; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.2 + 0.3,
        a: Math.random() * 0.7 + 0.2,
        twinkle: Math.random() * 0.02 + 0.005,
        phase: Math.random() * Math.PI * 2
      });
    }
  }
  initStars();

  // Nodes for the landing page interactive preview
  const nodes = [
    { id: 'main', label: 'main.ts', type: 'root', x: width / 2, y: height / 2, tx: width / 2, ty: height / 2, vx: 0, vy: 0, r: 24, color: '#fbbf24', border: '#f59e0b', glow: 'rgba(245, 158, 11, 0.7)' },
    { id: 'utils', label: 'utils.ts', type: 'file', x: width / 2 - 120, y: height / 2 - 60, tx: width / 2 - 120, ty: height / 2 - 60, vx: 0, vy: 0, r: 18, color: '#38bdf8', border: '#0284c7', glow: 'rgba(56, 189, 248, 0.6)' },
    { id: 'app', label: 'app.py', type: 'file', x: width / 2 + 120, y: height / 2 + 60, tx: width / 2 + 120, ty: height / 2 + 60, vx: 0, vy: 0, r: 18, color: '#38bdf8', border: '#0284c7', glow: 'rgba(56, 189, 248, 0.6)' },
    { id: 'auth', label: 'auth.ts', type: 'file', x: width / 2 + 70, y: height / 2 - 100, tx: width / 2 + 70, ty: height / 2 - 100, vx: 0, vy: 0, r: 18, color: '#38bdf8', border: '#0284c7', glow: 'rgba(56, 189, 248, 0.6)' },
    { id: 'fn_main', label: 'main()', type: 'func', x: width / 2, y: height / 2 + 55, tx: width / 2, ty: height / 2 + 55, vx: 0, vy: 0, r: 14, color: '#34d399', border: '#059669', glow: 'rgba(52, 211, 153, 0.6)' },
    { id: 'fn_hello', label: 'hello()', type: 'func', x: width / 2 - 175, y: height / 2 - 80, tx: width / 2 - 175, ty: height / 2 - 80, vx: 0, vy: 0, r: 13, color: '#34d399', border: '#059669', glow: 'rgba(52, 211, 153, 0.6)' },
    { id: 'cls_user', label: 'class User', type: 'class', x: width / 2 + 180, y: height / 2 + 90, tx: width / 2 + 180, ty: height / 2 + 90, vx: 0, vy: 0, r: 15, color: '#c084fc', border: '#9333ea', glow: 'rgba(192, 132, 252, 0.6)' },
    { id: 'typ_session', label: 'type Session', type: 'type', x: width / 2 + 120, y: height / 2 - 140, tx: width / 2 + 120, ty: height / 2 - 140, vx: 0, vy: 0, r: 13, color: '#818cf8', border: '#4f46e5', glow: 'rgba(129, 140, 248, 0.6)' }
  ];

  const edges = [
    { source: 'main', target: 'utils', type: 'IMPORTS' },
    { source: 'main', target: 'auth', type: 'IMPORTS' },
    { source: 'main', target: 'fn_main', type: 'DECLARES' },
    { source: 'utils', target: 'fn_hello', type: 'DECLARES' },
    { source: 'app', target: 'cls_user', type: 'DECLARES' },
    { source: 'auth', target: 'typ_session', type: 'DECLARES' },
    { source: 'app', target: 'main', type: 'IMPORTS' }
  ];

  const nodeMap = new Map();
  nodes.forEach(n => nodeMap.set(n.id, n));

  // Particles gliding along edges
  const particles = [];
  function spawnParticle() {
    if (particles.length > 8) return;
    const edge = edges[Math.floor(Math.random() * edges.length)];
    particles.push({
      edge,
      progress: 0,
      speed: 0.008 + Math.random() * 0.008,
      color: edge.type === 'IMPORTS' ? '#38bdf8' : '#34d399'
    });
  }

  // Dragging state
  let draggedNode = null;
  let hoveredNode = null;

  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      if (Math.hypot(n.x - mx, n.y - my) <= n.r + 8) {
        draggedNode = n;
        break;
      }
    }
  });

  window.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (draggedNode) {
      draggedNode.x = mx;
      draggedNode.y = my;
      draggedNode.vx = 0;
      draggedNode.vy = 0;
    } else {
      hoveredNode = null;
      for (const n of nodes) {
        if (Math.hypot(n.x - mx, n.y - my) <= n.r + 8) {
          hoveredNode = n;
          break;
        }
      }
      canvas.style.cursor = hoveredNode ? 'pointer' : 'grab';
    }
  });

  window.addEventListener('mouseup', () => {
    draggedNode = null;
  });

  function update() {
    const time = Date.now() * 0.002;

    // Repulsion and gentle spring to anchor
    for (const n of nodes) {
      if (n === draggedNode) continue;
      // Spring back to target
      n.vx += (n.tx - n.x) * 0.04;
      n.vy += (n.ty - n.y) * 0.04;
      n.vx *= 0.85;
      n.vy *= 0.85;
      n.x += n.vx;
      n.y += n.vy;
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.progress += p.speed;
      if (p.progress >= 1) particles.splice(i, 1);
    }
    if (Math.random() < 0.1) spawnParticle();
  }

  function draw() {
    update();
    ctx.clearRect(0, 0, width, height);

    // Deep void background
    ctx.fillStyle = '#020202';
    ctx.fillRect(0, 0, width, height);

    // Subtle twinkling stars
    const time = Date.now() * 0.001;
    for (const s of stars) {
      const tw = Math.sin(time * 2 + s.phase) * 0.3 + 0.7;
      ctx.fillStyle = `rgba(200, 220, 255, ${s.a * tw})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Orbit Rings
    const cx = width / 2;
    const cy = height / 2;
    ctx.save();
    [130, 220].forEach((r, idx) => {
      ctx.strokeStyle = `rgba(56, 189, 248, ${0.1 - idx * 0.04})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 8]);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.setLineDash([]);
    ctx.restore();

    // Edges
    for (const e of edges) {
      const s = nodeMap.get(e.source);
      const t = nodeMap.get(e.target);
      if (!s || !t) continue;

      ctx.save();
      ctx.strokeStyle = e.type === 'IMPORTS' ? 'rgba(56, 189, 248, 0.35)' : 'rgba(52, 211, 153, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(t.x, t.y);
      ctx.stroke();
      ctx.restore();
    }

    // Energy particles
    for (const p of particles) {
      const s = nodeMap.get(p.edge.source);
      const t = nodeMap.get(p.edge.target);
      if (!s || !t) continue;
      const px = s.x + (t.x - s.x) * p.progress;
      const py = s.y + (t.y - s.y) * p.progress;

      ctx.save();
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(px, py, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Nodes (Organic Blobs)
    for (const n of nodes) {
      const isHov = hoveredNode === n || draggedNode === n;
      const r = n.r + (isHov ? 3 : 0);

      ctx.save();
      // Glow
      const glowGrad = ctx.createRadialGradient(n.x, n.y, r * 0.4, n.x, n.y, r * 2.2);
      glowGrad.addColorStop(0, n.glow);
      glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(n.x, n.y, r * 2.2, 0, Math.PI * 2);
      ctx.fill();

      // Blob body
      ctx.fillStyle = n.color;
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fill();

      // Border
      ctx.strokeStyle = isHov ? '#ffffff' : n.border;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(n.label, n.x, n.y + r + 13);

      ctx.restore();
    }

    requestAnimationFrame(draw);
  }

  requestAnimationFrame(draw);
})();
