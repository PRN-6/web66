/**
 * Web66 Cosmic Codebase Visualizer
 * Radial Web & Organic Blob Engine with Live WebSocket Sync
 * Theme: Black & White Minimalist with Vivid Celestial Blobs
 */

(function () {
  'use strict';

  // --- Celestial Entity Colors ---
  const COLORS = {
    root: { main: '#fbbf24', border: '#f59e0b', glow: 'rgba(251, 191, 36, 0.65)', bg: 'rgba(251, 191, 36, 0.18)' },
    File: { main: '#38bdf8', border: '#0284c7', glow: 'rgba(56, 189, 248, 0.6)', bg: 'rgba(56, 189, 248, 0.15)' },
    Function: { main: '#34d399', border: '#059669', glow: 'rgba(52, 211, 153, 0.55)', bg: 'rgba(52, 211, 153, 0.15)' },
    Class: { main: '#c084fc', border: '#9333ea', glow: 'rgba(192, 132, 252, 0.6)', bg: 'rgba(192, 132, 252, 0.15)' },
    Type: { main: '#818cf8', border: '#4f46e5', glow: 'rgba(129, 140, 248, 0.55)', bg: 'rgba(129, 140, 248, 0.15)' },
    default: { main: '#94a3b8', border: '#64748b', glow: 'rgba(148, 163, 184, 0.4)', bg: 'rgba(148, 163, 184, 0.1)' }
  };

  // --- Canvas & State ---
  const canvas = document.getElementById('galaxy-canvas');
  const ctx = canvas.getContext('2d');

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    initStars();
  });

  // Camera transform (Center of screen by default)
  const camera = {
    x: width / 2,
    y: height / 2,
    targetX: width / 2,
    targetY: height / 2,
    zoom: 1.0,
    targetZoom: 1.0
  };

  // Graph state
  let nodes = [];
  let edges = [];
  let nodeMap = new Map();
  let rootNodeId = null;
  let metadata = {};

  // Interactive state
  let selectedNode = null;
  let hoveredNode = null;
  let draggedNode = null;
  let isPanning = false;
  let panStartX = 0;
  let panStartY = 0;
  let cameraStartX = 0;
  let cameraStartY = 0;
  let activeFilter = 'all';
  let searchQuery = '';
  let showParticles = true;
  let isRadialWebMode = true;

  // Starfield
  let stars = [];
  function initStars() {
    stars = [];
    const count = Math.min(200, Math.floor((width * height) / 9000));
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.3 + 0.3,
        alpha: Math.random() * 0.7 + 0.2,
        twinkleSpeed: Math.random() * 0.02 + 0.005,
        phase: Math.random() * Math.PI * 2
      });
    }
  }
  initStars();

  // Energy pulses along edges
  const particles = [];
  function spawnParticle(edge) {
    if (!showParticles || Math.random() > 0.08) return;
    particles.push({
      edgeId: edge.id,
      source: edge.source,
      target: edge.target,
      progress: 0,
      speed: 0.008 + Math.random() * 0.006,
      size: 2.2 + Math.random() * 1.2,
      color: edge.type === 'IMPORTS' ? '#38bdf8' : '#34d399'
    });
  }

  // --- WebSocket Live Connection ---
  let ws = null;
  const statusPill = document.getElementById('status-pill');
  const statusBeacon = statusPill.querySelector('.status-beacon');
  const statusText = document.getElementById('status-text');

  function connectLiveSync() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    statusText.textContent = 'CONNECTING...';
    statusBeacon.className = 'status-beacon disconnected';

    try {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        statusText.textContent = 'LIVE SYNC ACTIVE';
        statusBeacon.className = 'status-beacon';
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'graph-update' || message.nodes) {
            const data = message.data || message;
            loadGraphData(data);
            showUpdateFlash();
          }
        } catch (e) {
          console.error('Error parsing live update:', e);
        }
      };

      ws.onclose = () => {
        statusText.textContent = 'DISCONNECTED (RETRYING)';
        statusBeacon.className = 'status-beacon disconnected';
        setTimeout(connectLiveSync, 2000);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (e) {
      setTimeout(connectLiveSync, 2000);
    }
  }

  // Fallback REST fetch on startup
  async function fetchInitialGraph() {
    try {
      const res = await fetch('/api/graph');
      if (res.ok) {
        const data = await res.json();
        loadGraphData(data);
      }
    } catch (e) {}
  }

  // Flash beacon on update
  function showUpdateFlash() {
    statusPill.style.transform = 'scale(1.08)';
    setTimeout(() => {
      statusPill.style.transform = 'scale(1)';
    }, 250);
  }

  // --- Load Graph Data ---
  function loadGraphData(data) {
    if (!data || !data.nodes) return;

    metadata = data.metadata || {};
    rootNodeId = metadata.rootNodeId || null;

    document.getElementById('node-count').textContent = data.nodes.length;
    document.getElementById('edge-count').textContent = data.edges ? data.edges.length : 0;
    if (metadata.rootPath) {
      document.getElementById('project-path-display').textContent = metadata.rootPath;
    }

    const prevMap = nodeMap;
    nodeMap = new Map();

    nodes = data.nodes.map((rawNode) => {
      const prev = prevMap.get(rawNode.id);
      const isRoot = rawNode.isRoot || rawNode.id === rootNodeId;
      const type = rawNode.type || 'File';
      const theme = isRoot ? COLORS.root : (COLORS[type] || COLORS.default);

      let radius = 18;
      if (isRoot) radius = 34;
      else if (type === 'File') radius = 22;
      else if (type === 'Class') radius = 18;
      else if (type === 'Function') radius = 14;
      else if (type === 'Type') radius = 12;

      return {
        id: rawNode.id,
        label: rawNode.label || rawNode.name || rawNode.id,
        path: rawNode.path,
        type: type,
        isRoot: isRoot,
        metadata: rawNode.metadata || {},
        theme: theme,
        radius: radius,
        pulseOffset: Math.random() * Math.PI * 2,
        x: prev ? prev.x : (Math.random() - 0.5) * 400,
        y: prev ? prev.y : (Math.random() - 0.5) * 400,
        vx: prev ? prev.vx : 0,
        vy: prev ? prev.vy : 0,
        targetX: 0,
        targetY: 0,
        orbitRadius: 0,
        orbitAngle: 0
      };
    });

    nodes.forEach((n) => nodeMap.set(n.id, n));
    edges = (data.edges || []).filter((e) => nodeMap.has(e.source) && nodeMap.has(e.target));

    computeRadialWebLayout();
    wakeSimulation(1.0);
  }

  // --- Radial Web Layout Calculation ---
  function computeRadialWebLayout() {
    const root = nodes.find((n) => n.isRoot) || nodes[0];
    if (!root) return;

    root.targetX = 0;
    root.targetY = 0;
    root.orbitRadius = 0;

    const files = nodes.filter((n) => !n.isRoot && n.type === 'File');
    const functions = nodes.filter((n) => n.type === 'Function');
    const classes = nodes.filter((n) => n.type === 'Class');
    const types = nodes.filter((n) => n.type === 'Type');

    const fileCount = files.length;
    const tier1Radius = Math.max(280, (fileCount * 100) / (2 * Math.PI));

    files.forEach((file, index) => {
      const angle = (index / Math.max(1, fileCount)) * Math.PI * 2;
      file.orbitAngle = angle;
      file.orbitRadius = tier1Radius;
      file.targetX = Math.cos(angle) * tier1Radius;
      file.targetY = Math.sin(angle) * tier1Radius;
    });

    const otherSymbols = [...classes, ...functions, ...types];
    const otherCount = otherSymbols.length;
    const tier2Radius = tier1Radius + Math.max(180, (otherCount * 55) / (2 * Math.PI));

    otherSymbols.forEach((sym, index) => {
      const parentFileId = sym.metadata?.parentFile;
      const parent = parentFileId ? nodeMap.get(parentFileId) : null;

      if (parent && parent.orbitAngle !== undefined) {
        const spread = (Math.random() - 0.5) * 0.45;
        const angle = parent.orbitAngle + spread;
        const r = tier2Radius + (Math.random() - 0.5) * 60;
        sym.targetX = Math.cos(angle) * r;
        sym.targetY = Math.sin(angle) * r;
      } else {
        const angle = (index / Math.max(1, otherCount)) * Math.PI * 2;
        sym.targetX = Math.cos(angle) * tier2Radius;
        sym.targetY = Math.sin(angle) * tier2Radius;
      }
    });
  }

  // Simulation alpha temperature
  let simAlpha = 1.0;
  function wakeSimulation(val = 0.5) {
    simAlpha = Math.max(simAlpha, val);
  }

  // Physics Simulation
  function updatePhysics() {
    if (simAlpha < 0.003) {
      nodes.forEach((n) => {
        n.vx = 0;
        n.vy = 0;
      });
      return;
    }

    const kRepulsion = 800 * simAlpha;
    const kSpring = 0.03 * simAlpha;
    const kOrbitAnchor = (isRadialWebMode ? 0.12 : 0.01) * simAlpha;
    const damping = 0.72;

    // 1. Soft Repulsion between nearby blobs
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      if (a === draggedNode) continue;

      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distSq = dx * dx + dy * dy || 1;
        const minDist = a.radius + b.radius + 20;

        if (distSq < minDist * minDist * 2.5) {
          const dist = Math.sqrt(distSq);
          const force = Math.min(8, kRepulsion / (distSq + 20));
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          a.vx -= fx;
          a.vy -= fy;
          b.vx += fx;
          b.vy += fy;
        }
      }
    }

    // 2. Edge spring tension
    edges.forEach((edge) => {
      const a = nodeMap.get(edge.source);
      const b = nodeMap.get(edge.target);
      if (!a || !b) return;

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const idealDist = edge.type === 'DECLARES' ? 85 : 220;
      const force = Math.min(6, (dist - idealDist) * kSpring);

      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      if (a !== draggedNode) {
        a.vx += fx;
        a.vy += fy;
      }
      if (b !== draggedNode) {
        b.vx -= fx;
        b.vy -= fy;
      }
    });

    // 3. Anchor toward radial web target
    nodes.forEach((node) => {
      if (node === draggedNode) return;

      if (isRadialWebMode) {
        node.vx += (node.targetX - node.x) * kOrbitAnchor;
        node.vy += (node.targetY - node.y) * kOrbitAnchor;
      } else {
        node.vx -= node.x * 0.001;
        node.vy -= node.y * 0.001;
      }

      node.vx *= damping;
      node.vy *= damping;

      node.vx = Math.max(-10, Math.min(10, node.vx));
      node.vy = Math.max(-10, Math.min(10, node.vy));

      if (Math.abs(node.vx) < 0.02) node.vx = 0;
      if (Math.abs(node.vy) < 0.02) node.vy = 0;

      node.x += node.vx;
      node.y += node.vy;
    });

    // Cool down simulation smoothly each frame
    if (!draggedNode) {
      simAlpha *= 0.96;
    }

    // Update energy particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.progress += p.speed;
      if (p.progress >= 1) {
        particles.splice(i, 1);
      }
    }

    // Spawn new particles occasionally
    if (edges.length > 0) {
      const randEdge = edges[Math.floor(Math.random() * edges.length)];
      spawnParticle(randEdge);
    }
  }

  // --- Dedicated Camera System (Runs Every Frame Smoothly) ---
  function updateCamera() {
    camera.x += (camera.targetX - camera.x) * 0.22;
    camera.y += (camera.targetY - camera.y) * 0.22;
    camera.zoom += (camera.targetZoom - camera.zoom) * 0.22;

    if (Math.abs(camera.targetX - camera.x) < 0.05) camera.x = camera.targetX;
    if (Math.abs(camera.targetY - camera.y) < 0.05) camera.y = camera.targetY;
    if (Math.abs(camera.targetZoom - camera.zoom) < 0.001) camera.zoom = camera.targetZoom;
  }

  // --- Rendering Loop ---
  function render() {
    updatePhysics();
    updateCamera();

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    // Pure pitch black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Draw twinkling starfield
    renderStars();

    // World transformation (pan & zoom)
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.zoom, camera.zoom);

    // Draw cosmic web orbital rings
    if (isRadialWebMode) {
      renderOrbitalRings();
    }

    // Draw filaments (edges)
    renderEdges();

    // Draw energy particles traveling along web
    if (showParticles) {
      renderParticles();
    }

    // Draw organic blob nodes
    renderNodes();

    ctx.restore();
    requestAnimationFrame(render);
  }

  // Twinkling background stars
  function renderStars() {
    const time = Date.now() * 0.001;
    ctx.save();
    for (const star of stars) {
      const twinkle = Math.sin(time * 2 + star.phase) * 0.4 + 0.6;
      ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha * twinkle})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Orbital web rings (concentric cosmic orbits around Root)
  function renderOrbitalRings() {
    const rings = [280, 480, 680];
    ctx.save();
    rings.forEach((r, idx) => {
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.08 - idx * 0.02})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 8]);
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();

      // Label orbit ring
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText(`ORBIT TIER ${idx + 1}`, r + 10, 0);
    });
    ctx.setLineDash([]);
    ctx.restore();
  }

  // Web filaments (edges connecting nodes)
  function renderEdges() {
    ctx.save();

    edges.forEach((edge) => {
      const source = nodeMap.get(edge.source);
      const target = nodeMap.get(edge.target);
      if (!source || !target) return;

      const isConnectedToHover =
        hoveredNode && (hoveredNode.id === source.id || hoveredNode.id === target.id);
      const isConnectedToSelected =
        selectedNode && (selectedNode.id === source.id || selectedNode.id === target.id);

      let alpha = 0.22;
      let lineWidth = 1.4;
      let strokeColor = 'rgba(56, 189, 248, 0.25)';

      if (edge.type === 'DECLARES') {
        strokeColor = 'rgba(52, 211, 153, 0.2)';
      }

      if (isConnectedToHover || isConnectedToSelected) {
        alpha = 0.95;
        lineWidth = 2.8;
        strokeColor = edge.type === 'IMPORTS' ? '#38bdf8' : '#34d399';
        ctx.shadowColor = strokeColor;
        ctx.shadowBlur = 10;
      } else if (hoveredNode || selectedNode) {
        alpha = 0.05;
      }

      ctx.strokeStyle = strokeColor;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = lineWidth;

      ctx.beginPath();
      ctx.moveTo(source.x, source.y);

      // Curved subtle arc for imports
      if (edge.type === 'IMPORTS') {
        const midX = (source.x + target.x) / 2;
        const midY = (source.y + target.y) / 2;
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const curveOffset = 25;
        const cx = midX - (dy / (Math.hypot(dx, dy) || 1)) * curveOffset;
        const cy = midY + (dx / (Math.hypot(dx, dy) || 1)) * curveOffset;
        ctx.quadraticCurveTo(cx, cy, target.x, target.y);
      } else {
        ctx.lineTo(target.x, target.y);
      }

      ctx.stroke();
      ctx.shadowBlur = 0;
    });

    ctx.restore();
  }

  // Glowing energy pulses
  function renderParticles() {
    ctx.save();
    particles.forEach((p) => {
      const source = nodeMap.get(p.source);
      const target = nodeMap.get(p.target);
      if (!source || !target) return;

      const px = source.x + (target.x - source.x) * p.progress;
      const py = source.y + (target.y - source.y) * p.progress;

      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  // Organic Blob Node Rendering
  function renderNodes() {
    const time = Date.now() * 0.002;

    nodes.forEach((node) => {
      if (activeFilter !== 'all' && node.type !== activeFilter) {
        return;
      }

      const isHovered = hoveredNode && hoveredNode.id === node.id;
      const isSelected = selectedNode && selectedNode.id === node.id;
      const matchesSearch =
        searchQuery && node.label.toLowerCase().includes(searchQuery.toLowerCase());

      let alpha = 1.0;
      if (hoveredNode || selectedNode) {
        const isNeighbor =
          edges.some(
            (e) =>
              (e.source === (hoveredNode || selectedNode).id && e.target === node.id) ||
              (e.target === (hoveredNode || selectedNode).id && e.source === node.id)
          ) ||
          node.id === (hoveredNode || selectedNode).id;
        if (!isNeighbor) alpha = 0.2;
      }

      ctx.save();
      ctx.globalAlpha = alpha;

      // Organic pulsating breathing radius
      const pulse = Math.sin(time + node.pulseOffset) * 2;
      const currentRadius = node.radius + pulse + (isHovered || isSelected ? 4 : 0);

      // Outer Aura Glow
      const glowGrad = ctx.createRadialGradient(
        node.x,
        node.y,
        currentRadius * 0.4,
        node.x,
        node.y,
        currentRadius * 2.2
      );
      glowGrad.addColorStop(0, node.theme.glow);
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(node.x, node.y, currentRadius * 2.2, 0, Math.PI * 2);
      ctx.fill();

      // Organic Blob Body
      drawOrganicBlob(ctx, node.x, node.y, currentRadius, time + node.pulseOffset, node.theme);

      // Node Border / Ring
      ctx.lineWidth = isSelected ? 3.5 : isHovered || matchesSearch ? 2.5 : 1.5;
      ctx.strokeStyle = isSelected ? '#ffffff' : node.theme.main;
      ctx.shadowColor = node.theme.main;
      ctx.shadowBlur = isSelected ? 16 : isHovered ? 12 : 6;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Inner Core Glow
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath();
      ctx.arc(node.x - currentRadius * 0.3, node.y - currentRadius * 0.3, currentRadius * 0.22, 0, Math.PI * 2);
      ctx.fill();

      // Node Label
      ctx.font = node.isRoot
        ? '700 13px "JetBrains Mono", monospace'
        : '600 11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Label background pill (Black & White style)
      const text = node.label;
      const textMetrics = ctx.measureText(text);
      const pillW = textMetrics.width + 16;
      const pillH = 22;
      const pillY = node.y + currentRadius + 14;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.88)';
      ctx.strokeStyle = isSelected ? '#ffffff' : 'rgba(255, 255, 255, 0.18)';
      ctx.lineWidth = isSelected ? 1.5 : 1;
      roundRect(ctx, node.x - pillW / 2, pillY - pillH / 2, pillW, pillH, 6);
      ctx.fill();
      ctx.stroke();

      // Label text
      ctx.fillStyle = isSelected ? '#ffffff' : '#f3f4f6';
      ctx.fillText(text, node.x, pillY);

      // Search match indicator ring
      if (matchesSearch) {
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(node.x, node.y, currentRadius + 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.restore();
    });
  }

  // Draw organic fluid blob with harmonic perlin-like distortion
  function drawOrganicBlob(ctx, x, y, r, phase, theme) {
    const points = 8;
    const step = (Math.PI * 2) / points;

    ctx.beginPath();
    for (let i = 0; i < points; i++) {
      const angle = i * step;
      const offset = Math.sin(angle * 3 + phase) * 2.5 + Math.cos(angle * 2 - phase) * 1.5;
      const pr = r + offset;
      const px = x + Math.cos(angle) * pr;
      const py = y + Math.sin(angle) * pr;

      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        const prevAngle = (i - 1) * step;
        const prevOffset = Math.sin(prevAngle * 3 + phase) * 2.5 + Math.cos(prevAngle * 2 - phase) * 1.5;
        const prevR = r + prevOffset;
        const prevPx = x + Math.cos(prevAngle) * prevR;
        const prevPy = y + Math.sin(prevAngle) * prevR;

        const cpx = (prevPx + px) / 2;
        const cpy = (prevPy + py) / 2;
        ctx.quadraticCurveTo(prevPx, prevPy, cpx, cpy);
      }
    }
    ctx.closePath();

    const bodyGrad = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
    bodyGrad.addColorStop(0, theme.main);
    bodyGrad.addColorStop(1, theme.border);
    ctx.fillStyle = bodyGrad;
    ctx.fill();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // --- Coordinate Transformations ---
  function screenToWorld(sx, sy) {
    return {
      x: (sx - camera.x) / camera.zoom,
      y: (sy - camera.y) / camera.zoom
    };
  }

  function findNodeAt(sx, sy) {
    const world = screenToWorld(sx, sy);
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      if (activeFilter !== 'all' && node.type !== activeFilter) continue;
      const dist = Math.hypot(node.x - world.x, node.y - world.y);
      if (dist <= node.radius + 12) {
        return node;
      }
    }
    return null;
  }

  // --- Mouse & Pan / Drag Interaction Handlers ---
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0 || e.button === 1) { // Left or Middle click
      const node = findNodeAt(e.clientX, e.clientY);
      if (node) {
        draggedNode = node;
        wakeSimulation(0.5);
        selectNode(node);
        canvas.style.cursor = 'grabbing';
      } else {
        isPanning = true;
        panStartX = e.clientX;
        panStartY = e.clientY;
        cameraStartX = camera.targetX;
        cameraStartY = camera.targetY;
        canvas.style.cursor = 'grabbing';
      }
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (draggedNode) {
      const world = screenToWorld(e.clientX, e.clientY);
      draggedNode.x = world.x;
      draggedNode.y = world.y;
      draggedNode.vx = 0;
      draggedNode.vy = 0;
      wakeSimulation(0.2);
    } else if (isPanning) {
      const dx = e.clientX - panStartX;
      const dy = e.clientY - panStartY;
      camera.targetX = cameraStartX + dx;
      camera.targetY = cameraStartY + dy;
    } else {
      const node = findNodeAt(e.clientX, e.clientY);
      hoveredNode = node;
      canvas.style.cursor = node ? 'pointer' : 'grab';
    }
  });

  window.addEventListener('mouseup', () => {
    if (draggedNode) {
      wakeSimulation(0.3);
    }
    draggedNode = null;
    isPanning = false;
    canvas.style.cursor = hoveredNode ? 'pointer' : 'grab';
  });

  // --- Smooth Mouse Wheel Zoom (Pivots Around Mouse Pointer) ---
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.14 : 0.88;
    const newZoom = Math.max(0.08, Math.min(5.0, camera.targetZoom * zoomFactor));

    const mouseWorldX = (e.clientX - camera.targetX) / camera.targetZoom;
    const mouseWorldY = (e.clientY - camera.targetY) / camera.targetZoom;

    camera.targetZoom = newZoom;
    camera.targetX = e.clientX - mouseWorldX * newZoom;
    camera.targetY = e.clientY - mouseWorldY * newZoom;
  }, { passive: false });

  // --- Touch Support (Pan & Pinch-to-Zoom) ---
  let initialPinchDist = null;
  let initialPinchZoom = 1;

  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const node = findNodeAt(touch.clientX, touch.clientY);
      if (node) {
        draggedNode = node;
        wakeSimulation(0.5);
        selectNode(node);
      } else {
        isPanning = true;
        panStartX = touch.clientX;
        panStartY = touch.clientY;
        cameraStartX = camera.targetX;
        cameraStartY = camera.targetY;
      }
    } else if (e.touches.length === 2) {
      isPanning = false;
      draggedNode = null;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      initialPinchDist = Math.hypot(dx, dy);
      initialPinchZoom = camera.targetZoom;
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      if (draggedNode) {
        const world = screenToWorld(touch.clientX, touch.clientY);
        draggedNode.x = world.x;
        draggedNode.y = world.y;
        wakeSimulation(0.2);
      } else if (isPanning) {
        const dx = touch.clientX - panStartX;
        const dy = touch.clientY - panStartY;
        camera.targetX = cameraStartX + dx;
        camera.targetY = cameraStartY + dy;
      }
    } else if (e.touches.length === 2 && initialPinchDist) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const currentDist = Math.hypot(dx, dy);
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const factor = currentDist / initialPinchDist;
      const newZoom = Math.max(0.08, Math.min(5.0, initialPinchZoom * factor));

      const wx = (midX - camera.targetX) / camera.targetZoom;
      const wy = (midY - camera.targetY) / camera.targetZoom;
      camera.targetZoom = newZoom;
      camera.targetX = midX - wx * newZoom;
      camera.targetY = midY - wy * newZoom;
    }
  }, { passive: false });

  canvas.addEventListener('touchend', () => {
    draggedNode = null;
    isPanning = false;
    initialPinchDist = null;
  });

  // --- Node Selection & Inspector ---
  function selectNode(node) {
    selectedNode = node;
    const drawer = document.getElementById('inspector-drawer');
    const content = document.getElementById('inspector-content');
    const typeBadge = document.getElementById('inspector-type');

    if (!node) {
      drawer.classList.remove('open');
      return;
    }

    drawer.classList.add('open');
    typeBadge.textContent = node.isRoot ? 'CORE ENTRY NODE' : `${node.type.toUpperCase()} BLOB`;

    const outgoing = edges.filter((e) => e.source === node.id);
    const incoming = edges.filter((e) => e.target === node.id);

    content.innerHTML = `
      <div class="node-title-card">
        <div class="node-title-label">${escapeHtml(node.label)}</div>
        <div class="node-title-sub">${escapeHtml(node.path || node.id)}</div>
      </div>

      <div class="meta-group">
        <div class="meta-label">Node Identifier</div>
        <div class="meta-val">${escapeHtml(node.id)}</div>
      </div>

      <div class="meta-group">
        <div class="meta-label">Architectural Role</div>
        <div class="meta-val">${node.isRoot ? '🌟 Project Root Entry Point' : node.type}</div>
      </div>

      ${node.metadata?.lines ? `
        <div class="meta-group">
          <div class="meta-label">Source Lines</div>
          <div class="meta-val">${node.metadata.lines} lines</div>
        </div>
      ` : ''}

      <div class="meta-group">
        <div class="meta-label">Outgoing Relationships (${outgoing.length})</div>
        <div class="relations-list">
          ${outgoing.length === 0 ? '<div class="meta-val">None</div>' : outgoing.map((e) => {
            const targetNode = nodeMap.get(e.target);
            return `
              <div class="relation-item" data-goto="${escapeHtml(e.target)}">
                <span><strong>${escapeHtml(e.type)}:</strong> ${escapeHtml(targetNode ? targetNode.label : e.target)}</span>
                <span>→</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div class="meta-group">
        <div class="meta-label">Incoming Referrers (${incoming.length})</div>
        <div class="relations-list">
          ${incoming.length === 0 ? '<div class="meta-val">None</div>' : incoming.map((e) => {
            const sourceNode = nodeMap.get(e.source);
            return `
              <div class="relation-item" data-goto="${escapeHtml(e.source)}">
                <span><strong>${escapeHtml(e.type)}:</strong> ${escapeHtml(sourceNode ? sourceNode.label : e.source)}</span>
                <span>←</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    content.querySelectorAll('.relation-item').forEach((item) => {
      item.addEventListener('click', () => {
        const targetId = item.getAttribute('data-goto');
        const targetNode = nodeMap.get(targetId);
        if (targetNode) {
          centerOnNode(targetNode);
          selectNode(targetNode);
        }
      });
    });
  }

  function centerOnNode(node) {
    camera.targetX = width / 2 - node.x * camera.targetZoom;
    camera.targetY = height / 2 - node.y * camera.targetZoom;
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // --- UI Controls Listeners ---
  document.getElementById('inspector-close').addEventListener('click', () => {
    selectNode(null);
  });

  document.getElementById('btn-zoom-in').addEventListener('click', () => {
    const newZoom = Math.min(5.0, camera.targetZoom * 1.3);
    const cx = width / 2;
    const cy = height / 2;
    const wx = (cx - camera.targetX) / camera.targetZoom;
    const wy = (cy - camera.targetY) / camera.targetZoom;
    camera.targetZoom = newZoom;
    camera.targetX = cx - wx * newZoom;
    camera.targetY = cy - wy * newZoom;
  });

  document.getElementById('btn-zoom-out').addEventListener('click', () => {
    const newZoom = Math.max(0.08, camera.targetZoom * 0.72);
    const cx = width / 2;
    const cy = height / 2;
    const wx = (cx - camera.targetX) / camera.targetZoom;
    const wy = (cy - camera.targetY) / camera.targetZoom;
    camera.targetZoom = newZoom;
    camera.targetX = cx - wx * newZoom;
    camera.targetY = cy - wy * newZoom;
  });

  document.getElementById('btn-center').addEventListener('click', () => {
    const rootNode = nodeMap.get(rootNodeId) || nodes[0];
    camera.targetZoom = 1.0;
    if (rootNode) {
      camera.targetX = width / 2 - rootNode.x * 1.0;
      camera.targetY = height / 2 - rootNode.y * 1.0;
    } else {
      camera.targetX = width / 2;
      camera.targetY = height / 2;
    }
  });

  document.getElementById('btn-layout').addEventListener('click', function () {
    isRadialWebMode = !isRadialWebMode;
    this.classList.toggle('active', isRadialWebMode);
    if (isRadialWebMode) {
      computeRadialWebLayout();
    }
    wakeSimulation(0.8);
  });

  document.getElementById('btn-particles').addEventListener('click', function () {
    showParticles = !showParticles;
    this.classList.toggle('active', showParticles);
  });

  // Filter Pills
  document.querySelectorAll('.filter-pills .pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-pills .pill').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.getAttribute('data-filter');
    });
  });

  // Search input
  const searchInput = document.getElementById('node-search');
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    if (searchQuery) {
      const match = nodes.find((n) => n.label.toLowerCase().includes(searchQuery.toLowerCase()));
      if (match) {
        centerOnNode(match);
      }
    }
  });

  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      searchInput.focus();
    }
  });

  // Start initialization & live loop
  fetchInitialGraph();
  connectLiveSync();
  requestAnimationFrame(render);
})();
