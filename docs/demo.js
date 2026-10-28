/**
 * Web66 Interactive Cosmos Engine & Live Demo Playground
 */
(function() {
  'use strict';

  const canvas = document.getElementById('demo-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight || 460;
  }
  resize();

  let width = canvas.width;
  let height = canvas.height;

  // Preset Topologies
  const presets = {
    web66: {
      name: 'Web66 Core Engine',
      stats: '14 symbols · 18 links · Root: bin/web66.js',
      nodes: [
        { id: 'cli', label: 'bin/web66.js', type: 'root', r: 24, color: '#fbbf24', border: '#f59e0b', glow: 'rgba(251, 191, 36, 0.7)', desc: 'CLI Launcher & argv parser' },
        { id: 'server', label: 'server.js', type: 'file', r: 18, color: '#38bdf8', border: '#0284c7', glow: 'rgba(56, 189, 248, 0.6)', desc: 'HTTP + Native RFC 6455 WebSocket streaming' },
        { id: 'engine', label: 'engine.js', type: 'file', r: 18, color: '#38bdf8', border: '#0284c7', glow: 'rgba(56, 189, 248, 0.6)', desc: 'Multi-language AST Symbol Extractor' },
        { id: 'viewer', label: 'app.js', type: 'file', r: 17, color: '#38bdf8', border: '#0284c7', glow: 'rgba(56, 189, 248, 0.6)', desc: 'Canvas force-directed rendering client' },
        { id: 'scanDir', label: 'scanDirectory()', type: 'func', r: 12, color: '#34d399', border: '#059669', glow: 'rgba(52, 211, 153, 0.5)', desc: 'Recursive file discovery with ignore lists' },
        { id: 'parseAST', label: 'extractSymbols()', type: 'func', r: 12, color: '#34d399', border: '#059669', glow: 'rgba(52, 211, 153, 0.5)', desc: 'Regex & token based AST symbol parser' },
        { id: 'findRoot', label: 'findRootNode()', type: 'func', r: 11, color: '#34d399', border: '#059669', glow: 'rgba(52, 211, 153, 0.5)', desc: 'Centrality degree ranking calculator' },
        { id: 'broadcast', label: 'broadcast()', type: 'func', r: 11, color: '#34d399', border: '#059669', glow: 'rgba(52, 211, 153, 0.5)', desc: 'Pushes binary WS frames to connected browsers' },
        { id: 'watch', label: 'watchDirectory()', type: 'func', r: 11, color: '#34d399', border: '#059669', glow: 'rgba(52, 211, 153, 0.5)', desc: 'Debounced recursive filesystem watcher' },
        { id: 'physics', label: 'stepPhysics()', type: 'func', r: 11, color: '#34d399', border: '#059669', glow: 'rgba(52, 211, 153, 0.5)', desc: 'Force decay & orbit dampening engine' },
        { id: 'clsGraph', label: 'class AstGraph', type: 'class', r: 14, color: '#c084fc', border: '#9333ea', glow: 'rgba(192, 132, 252, 0.6)', desc: 'In-memory dependency adjacency matrix' }
      ],
      edges: [
        { source: 'cli', target: 'server', type: 'IMPORTS' },
        { source: 'server', target: 'engine', type: 'IMPORTS' },
        { source: 'server', target: 'viewer', type: 'SERVES' },
        { source: 'server', target: 'broadcast', type: 'DECLARES' },
        { source: 'server', target: 'watch', type: 'DECLARES' },
        { source: 'engine', target: 'scanDir', type: 'DECLARES' },
        { source: 'engine', target: 'parseAST', type: 'DECLARES' },
        { source: 'engine', target: 'findRoot', type: 'DECLARES' },
        { source: 'engine', target: 'clsGraph', type: 'DECLARES' },
        { source: 'viewer', target: 'physics', type: 'DECLARES' }
      ]
    },
    nextjs: {
      name: 'Next.js App Router',
      stats: '12 symbols · 15 links · Root: app/layout.tsx',
      nodes: [
        { id: 'layout', label: 'app/layout.tsx', type: 'root', r: 24, color: '#fbbf24', border: '#f59e0b', glow: 'rgba(251, 191, 36, 0.7)', desc: 'Root HTML layout & theme provider' },
        { id: 'page', label: 'app/page.tsx', type: 'file', r: 18, color: '#38bdf8', border: '#0284c7', glow: 'rgba(56, 189, 248, 0.6)', desc: 'Landing page component' },
        { id: 'api', label: 'api/route.ts', type: 'file', r: 17, color: '#38bdf8', border: '#0284c7', glow: 'rgba(56, 189, 248, 0.6)', desc: 'Edge serverless endpoint' },
        { id: 'db', label: 'lib/db.ts', type: 'file', r: 17, color: '#38bdf8', border: '#0284c7', glow: 'rgba(56, 189, 248, 0.6)', desc: 'Prisma / Postgres connection pool' },
        { id: 'auth', label: 'middleware.ts', type: 'file', r: 16, color: '#38bdf8', border: '#0284c7', glow: 'rgba(56, 189, 248, 0.6)', desc: 'Session token validation middleware' },
        { id: 'hero', label: 'HeroSection()', type: 'func', r: 12, color: '#34d399', border: '#059669', glow: 'rgba(52, 211, 153, 0.5)', desc: 'Client hero component with animation' },
        { id: 'fetchData', label: 'getStaticProps()', type: 'func', r: 11, color: '#34d399', border: '#059669', glow: 'rgba(52, 211, 153, 0.5)', desc: 'Server-side cached data query' },
        { id: 'session', label: 'class AuthSession', type: 'class', r: 14, color: '#c084fc', border: '#9333ea', glow: 'rgba(192, 132, 252, 0.6)', desc: 'Encrypted JWT user session handler' }
      ],
      edges: [
        { source: 'layout', target: 'page', type: 'IMPORTS' },
        { source: 'layout', target: 'auth', type: 'IMPORTS' },
        { source: 'page', target: 'hero', type: 'DECLARES' },
        { source: 'page', target: 'fetchData', type: 'DECLARES' },
        { source: 'fetchData', target: 'api', type: 'IMPORTS' },
        { source: 'api', target: 'db', type: 'IMPORTS' },
        { source: 'auth', target: 'session', type: 'DECLARES' }
      ]
    },
    aiagent: {
      name: 'Autonomous AI Agent Stack',
      stats: '13 symbols · 16 links · Root: agent/controller.py',
      nodes: [
        { id: 'agent', label: 'controller.py', type: 'root', r: 24, color: '#fbbf24', border: '#f59e0b', glow: 'rgba(251, 191, 36, 0.7)', desc: 'ReAct agent reasoning loop' },
        { id: 'llm', label: 'llm_client.py', type: 'file', r: 18, color: '#38bdf8', border: '#0284c7', glow: 'rgba(56, 189, 248, 0.6)', desc: 'Streaming LLM completion provider' },
        { id: 'memory', label: 'memory_store.py', type: 'file', r: 17, color: '#38bdf8', border: '#0284c7', glow: 'rgba(56, 189, 248, 0.6)', desc: 'Vector embedding semantic store' },
        { id: 'tools', label: 'tools/sandbox.py', type: 'file', r: 17, color: '#38bdf8', border: '#0284c7', glow: 'rgba(56, 189, 248, 0.6)', desc: 'Terminal & Python code executor' },
        { id: 'think', label: 'plan_action()', type: 'func', r: 12, color: '#34d399', border: '#059669', glow: 'rgba(52, 211, 153, 0.5)', desc: 'Chain of thought prompt generator' },
        { id: 'search', label: 'vector_search()', type: 'func', r: 11, color: '#34d399', border: '#059669', glow: 'rgba(52, 211, 153, 0.5)', desc: 'Cosine similarity recall on embeddings' },
        { id: 'clsAgent', label: 'class AgentBrain', type: 'class', r: 14, color: '#c084fc', border: '#9333ea', glow: 'rgba(192, 132, 252, 0.6)', desc: 'State machine for multi-step tasks' }
      ],
      edges: [
        { source: 'agent', target: 'llm', type: 'IMPORTS' },
        { source: 'agent', target: 'memory', type: 'IMPORTS' },
        { source: 'agent', target: 'tools', type: 'IMPORTS' },
        { source: 'agent', target: 'think', type: 'DECLARES' },
        { source: 'agent', target: 'clsAgent', type: 'DECLARES' },
        { source: 'memory', target: 'search', type: 'DECLARES' }
      ]
    }
  };

  let currentPresetKey = 'web66';
  let activeNodes = [];
  let activeEdges = [];
  let nodeMap = new Map();
  let selectedNode = null;
  let hoveredNode = null;
  let draggedNode = null;
  let autoRotate = true;
  let showOrbits = true;
  let rotationAngle = 0;

  function loadPreset(key) {
    currentPresetKey = key;
    const preset = presets[key];
    if (!preset) return;

    const cx = width / 2;
    const cy = height / 2;

    const count = preset.nodes.length;
    activeNodes = preset.nodes.map((n, i) => {
      let angle = (i / (count - 1 || 1)) * Math.PI * 2;
      let dist = n.type === 'root' ? 0 : (n.type === 'file' ? 110 : 175);
      if (n.type !== 'root') {
        dist += (Math.random() - 0.5) * 20;
      }
      return {
        ...n,
        x: cx + (n.type === 'root' ? 0 : Math.cos(angle) * dist),
        y: cy + (n.type === 'root' ? 0 : Math.sin(angle) * dist),
        vx: 0,
        vy: 0,
        dist: dist,
        angle: angle,
        baseAngle: angle
      };
    });

    activeEdges = preset.edges;
    nodeMap.clear();
    activeNodes.forEach(n => nodeMap.set(n.id, n));
    selectedNode = null;
    hideInspector();

    const statsEl = document.getElementById('canvas-stats');
    if (statsEl) statsEl.textContent = preset.stats;

    // Update active preset button
    document.querySelectorAll('[data-preset]').forEach(btn => {
      if (btn.getAttribute('data-preset') === key) {
        btn.classList.add('bg-neutral-800', 'text-white', 'border-neutral-600');
        btn.classList.remove('text-[#777777]', 'border-transparent');
      } else {
        btn.classList.remove('bg-neutral-800', 'text-white', 'border-neutral-600');
        btn.classList.add('text-[#777777]', 'border-transparent');
      }
    });
  }

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

  // Floating Edge Particles
  const particles = [];
  function spawnParticle() {
    if (particles.length > 8 || activeEdges.length === 0) return;
    const edge = activeEdges[Math.floor(Math.random() * activeEdges.length)];
    particles.push({
      edge,
      progress: 0,
      speed: 0.012 + Math.random() * 0.008,
      color: edge.type === 'IMPORTS' ? '#38bdf8' : '#34d399'
    });
  }

  // Window resize
  window.addEventListener('resize', () => {
    resize();
    width = canvas.width;
    height = canvas.height;
    initStars();
  });

  // Physics Step
  function stepPhysics() {
    const cx = width / 2;
    const cy = height / 2;

    if (autoRotate && !draggedNode) {
      rotationAngle += 0.002;
    }

    // Keep Root locked to center
    const root = activeNodes.find(n => n.type === 'root');
    if (root && root !== draggedNode) {
      root.x += (cx - root.x) * 0.1;
      root.y += (cy - root.y) * 0.1;
      root.vx = 0;
      root.vy = 0;
    }

    // Node forces
    for (let i = 0; i < activeNodes.length; i++) {
      const n1 = activeNodes[i];
      if (n1 === draggedNode) continue;

      if (n1.type !== 'root') {
        // Orbit attraction
        const currentAngle = n1.baseAngle + rotationAngle;
        const targetX = cx + Math.cos(currentAngle) * n1.dist;
        const targetY = cy + Math.sin(currentAngle) * n1.dist;

        n1.vx += (targetX - n1.x) * 0.03;
        n1.vy += (targetY - n1.y) * 0.03;
      }

      // Repulsion from others
      for (let j = i + 1; j < activeNodes.length; j++) {
        const n2 = activeNodes[j];
        const dx = n2.x - n1.x;
        const dy = n2.y - n1.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const minDist = n1.r + n2.r + 28;

        if (dist < minDist) {
          const force = (minDist - dist) / dist * 0.08;
          if (n1 !== draggedNode && n1.type !== 'root') {
            n1.vx -= dx * force;
            n1.vy -= dy * force;
          }
          if (n2 !== draggedNode && n2.type !== 'root') {
            n2.vx += dx * force;
            n2.vy += dy * force;
          }
        }
      }

      // Damping
      n1.vx *= 0.85;
      n1.vy *= 0.85;
      n1.x += n1.vx;
      n1.y += n1.vy;
    }
  }

  // Draw Render Loop
  function draw() {
    ctx.clearRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2;

    // 1. Draw Starfield
    for (const s of stars) {
      s.phase += s.twinkle;
      const alpha = s.a + Math.sin(s.phase) * 0.2;
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.1, alpha)})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Draw Orbit Rings
    if (showOrbits) {
      const radii = [110, 175];
      for (const r of radii) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.035)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // 3. Draw Edges
    for (const e of activeEdges) {
      const s = nodeMap.get(e.source);
      const t = nodeMap.get(e.target);
      if (!s || !t) continue;

      const isHighlight = (hoveredNode && (hoveredNode.id === s.id || hoveredNode.id === t.id)) ||
                          (selectedNode && (selectedNode.id === s.id || selectedNode.id === t.id));

      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(t.x, t.y);

      if (isHighlight) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.lineWidth = 2;
      } else {
        ctx.strokeStyle = e.type === 'IMPORTS' ? 'rgba(56, 189, 248, 0.12)' : 'rgba(52, 211, 153, 0.12)';
        ctx.lineWidth = 1;
      }
      ctx.stroke();
    }

    // 4. Draw Edge Particles
    if (Math.random() < 0.08) spawnParticle();
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      const s = nodeMap.get(p.edge.source);
      const t = nodeMap.get(p.edge.target);
      if (!s || !t) {
        particles.splice(i, 1);
        continue;
      }

      p.progress += p.speed;
      if (p.progress >= 1) {
        particles.splice(i, 1);
        continue;
      }

      const px = s.x + (t.x - s.x) * p.progress;
      const py = s.y + (t.y - s.y) * p.progress;

      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // 5. Draw Celestial Blobs
    for (const n of activeNodes) {
      const isSelected = selectedNode && selectedNode.id === n.id;
      const isHovered = hoveredNode && hoveredNode.id === n.id;

      // Glow effect
      ctx.save();
      ctx.shadowColor = n.glow;
      ctx.shadowBlur = isSelected ? 30 : (isHovered ? 24 : 14);

      // Blob body
      ctx.fillStyle = n.color;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();

      // Border outline
      ctx.strokeStyle = isSelected ? '#ffffff' : n.border;
      ctx.lineWidth = isSelected ? 2.5 : 1.5;
      ctx.stroke();
      ctx.restore();

      // Selected ring indicator
      if (isSelected) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Label below blob
      ctx.fillStyle = isSelected ? '#ffffff' : (isHovered ? '#f3f4f6' : '#9ca3af');
      ctx.font = `${n.type === 'root' ? 'bold 12px' : '10px'} "JetBrains Mono", monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(n.label, n.x, n.y + n.r + 14);
    }

    stepPhysics();
    requestAnimationFrame(draw);
  }

  // Mouse Interaction & Inspector
  function getNodeAt(x, y) {
    for (let i = activeNodes.length - 1; i >= 0; i--) {
      const n = activeNodes[i];
      const dx = n.x - x;
      const dy = n.y - y;
      if (Math.sqrt(dx * dx + dy * dy) <= n.r + 6) {
        return n;
      }
    }
    return null;
  }

  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (draggedNode) {
      draggedNode.x = mx;
      draggedNode.y = my;
      draggedNode.vx = 0;
      draggedNode.vy = 0;
      return;
    }

    const hit = getNodeAt(mx, my);
    hoveredNode = hit;
    canvas.style.cursor = hit ? 'pointer' : 'default';
  });

  canvas.addEventListener('mousedown', e => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const hit = getNodeAt(mx, my);
    if (hit) {
      draggedNode = hit;
      selectedNode = hit;
      showInspector(hit);
    } else {
      selectedNode = null;
      hideInspector();
    }
  });

  window.addEventListener('mouseup', () => {
    draggedNode = null;
  });

  // Inspector Panel logic
  const inspector = document.getElementById('node-inspector');
  const inspectTitle = document.getElementById('inspect-title');
  const inspectType = document.getElementById('inspect-type');
  const inspectDesc = document.getElementById('inspect-desc');
  const inspectDeps = document.getElementById('inspect-deps');

  function showInspector(node) {
    if (!inspector) return;
    inspector.classList.remove('hidden');

    if (inspectTitle) inspectTitle.textContent = node.label;
    if (inspectType) {
      inspectType.textContent = node.type.toUpperCase();
      inspectType.className = `px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
        node.type === 'root' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
        node.type === 'file' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' :
        node.type === 'func' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
        'bg-purple-500/20 text-purple-400 border border-purple-500/30'
      }`;
    }
    if (inspectDesc) inspectDesc.textContent = node.desc || 'Symbol identified by Web66 AST extractor.';

    if (inspectDeps) {
      const incoming = activeEdges.filter(e => e.target === node.id).map(e => e.source);
      const outgoing = activeEdges.filter(e => e.source === node.id).map(e => e.target);
      inspectDeps.innerHTML = `
        <div class="flex items-center justify-between text-[11px] mb-1">
          <span class="text-[#666666]">Inbound Callers:</span>
          <span class="text-white font-mono">${incoming.length}</span>
        </div>
        <div class="flex items-center justify-between text-[11px]">
          <span class="text-[#666666]">Outbound Imports:</span>
          <span class="text-white font-mono">${outgoing.length}</span>
        </div>
      `;
    }
  }

  function hideInspector() {
    if (inspector) inspector.classList.add('hidden');
  }

  // Setup UI controls
  document.querySelectorAll('[data-preset]').forEach(btn => {
    btn.addEventListener('click', () => {
      const presetKey = btn.getAttribute('data-preset');
      loadPreset(presetKey);
    });
  });

  const toggleRotateBtn = document.getElementById('btn-toggle-rotate');
  if (toggleRotateBtn) {
    toggleRotateBtn.addEventListener('click', () => {
      autoRotate = !autoRotate;
      toggleRotateBtn.classList.toggle('text-emerald-400', autoRotate);
      toggleRotateBtn.classList.toggle('text-[#666666]', !autoRotate);
    });
  }

  const toggleOrbitsBtn = document.getElementById('btn-toggle-orbits');
  if (toggleOrbitsBtn) {
    toggleOrbitsBtn.addEventListener('click', () => {
      showOrbits = !showOrbits;
      toggleOrbitsBtn.classList.toggle('text-emerald-400', showOrbits);
      toggleOrbitsBtn.classList.toggle('text-[#666666]', !showOrbits);
    });
  }

  const resetCanvasBtn = document.getElementById('btn-reset-canvas');
  if (resetCanvasBtn) {
    resetCanvasBtn.addEventListener('click', () => {
      rotationAngle = 0;
      loadPreset(currentPresetKey);
    });
  }

  const closeInspectBtn = document.getElementById('btn-close-inspect');
  if (closeInspectBtn) {
    closeInspectBtn.addEventListener('click', hideInspector);
  }

  // Initialize Default
  loadPreset('web66');
  requestAnimationFrame(draw);

})();
