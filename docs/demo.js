/**
 * Web66 Interactive Cosmic Canvas (Middle Bento Card)
 */
(function() {
  'use strict';

  const canvas = document.getElementById('demo-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight || 360;
  }
  resize();

  let width = canvas.width;
  let height = canvas.height;

  // Nodes for middle card preview (tight, clean offsets)
  const nodeDefs = [
    { id: 'main', label: 'main.ts', type: 'root', dx: 0, dy: 0, r: 22, color: '#fbbf24', border: '#f59e0b', glow: 'rgba(245, 158, 11, 0.7)' },
    { id: 'utils', label: 'utils.ts', type: 'file', dx: -85, dy: -55, r: 17, color: '#38bdf8', border: '#0284c7', glow: 'rgba(56, 189, 248, 0.6)' },
    { id: 'app', label: 'app.py', type: 'file', dx: 85, dy: 55, r: 17, color: '#38bdf8', border: '#0284c7', glow: 'rgba(56, 189, 248, 0.6)' },
    { id: 'auth', label: 'auth.ts', type: 'file', dx: 55, dy: -75, r: 17, color: '#38bdf8', border: '#0284c7', glow: 'rgba(56, 189, 248, 0.6)' },
    { id: 'fn_main', label: 'main()', type: 'func', dx: -15, dy: 60, r: 13, color: '#34d399', border: '#059669', glow: 'rgba(52, 211, 153, 0.6)' },
    { id: 'fn_hello', label: 'hello()', type: 'func', dx: -130, dy: -80, r: 12, color: '#34d399', border: '#059669', glow: 'rgba(52, 211, 153, 0.6)' },
    { id: 'cls_user', label: 'class User', type: 'class', dx: 130, dy: 85, r: 14, color: '#c084fc', border: '#9333ea', glow: 'rgba(192, 132, 252, 0.6)' },
    { id: 'typ_session', label: 'type Session', type: 'type', dx: 100, dy: -110, r: 12, color: '#818cf8', border: '#4f46e5', glow: 'rgba(129, 140, 248, 0.6)' }
  ];

  const nodes = nodeDefs.map(d => ({
    ...d,
    x: width / 2 + d.dx,
    y: height / 2 + d.dy,
    tx: width / 2 + d.dx,
    ty: height / 2 + d.dy,
    vx: 0,
    vy: 0
  }));

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

  function updateTargets() {
    const cx = width / 2;
    const cy = height / 2;
    nodes.forEach(n => {
      n.tx = cx + n.dx;
      n.ty = cy + n.dy;
    });
  }

  window.addEventListener('resize', () => {
    resize();
    width = canvas.width;
    height = canvas.height;
    updateTargets();
    initStars();
  });

  // Starfield
  let stars = [];
  function initStars() {
    stars = [];
    for (let i = 0; i < 70; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.1 + 0.3,
        a: Math.random() * 0.7 + 0.2,
        twinkle: Math.random() * 0.02 + 0.005,
        phase: Math.random() * Math.PI * 2
      });
    }
  }
  initStars();

  // Particles
  const particles = [];
  function spawnParticle() {
    if (particles.length > 6) return;
    const edge = edges[Math.floor(Math.random() * edges.length)];
    particles.push({
      edge,
      progress: 0,
      speed: 0.01 + Math.random() * 0.008,
      color: edge.type === 'IMPORTS' ? '#38bdf8' : '#34d399'
    });
  }

  // Dragging
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
    for (const n of nodes) {
      if (n === draggedNode) continue;
      n.vx += (n.tx - n.x) * 0.045;
      n.vy += (n.ty - n.y) * 0.045;
      n.vx *= 0.85;
      n.vy *= 0.85;
      n.x += n.vx;
      n.y += n.vy;
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.progress += p.speed;
      if (p.progress >= 1) particles.splice(i, 1);
    }
    if (Math.random() < 0.08) spawnParticle();
  }

  function draw() {
    update();
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, width, height);

    // Stars
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
    [105, 175].forEach((r, idx) => {
      ctx.strokeStyle = `rgba(56, 189, 248, ${0.12 - idx * 0.05})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 6]);
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
      ctx.strokeStyle = e.type === 'IMPORTS' ? 'rgba(56, 189, 248, 0.4)' : 'rgba(52, 211, 153, 0.4)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(t.x, t.y);
      ctx.stroke();
      ctx.restore();
    }

    // Particles
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
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Blobs
    for (const n of nodes) {
      const isHov = hoveredNode === n || draggedNode === n;
      const r = n.r + (isHov ? 2.5 : 0);

      ctx.save();
      const glowGrad = ctx.createRadialGradient(n.x, n.y, r * 0.3, n.x, n.y, r * 2.2);
      glowGrad.addColorStop(0, n.glow);
      glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(n.x, n.y, r * 2.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = n.color;
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = isHov ? '#ffffff' : n.border;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ededed';
      ctx.fillText(n.label, n.x, n.y + r + 13);

      ctx.restore();
    }

    requestAnimationFrame(draw);
  }

  requestAnimationFrame(draw);
})();
