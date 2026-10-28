/**
 * Web66 Cosmic Codebase Visualizer
 * Radial Web & Organic Blob Engine with Live WebSocket Sync
 */

(function () {
  'use strict';

  // --- Theme Colors ---
  const COLORS = {
    root: { main: '#fbbf24', border: '#f59e0b', glow: 'rgba(245, 158, 11, 0.65)', bg: 'rgba(245, 158, 11, 0.18)' },
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

  // Camera transform
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
  let panStart = { x: 0, y: 0 };
  let activeFilter = 'all';
  let searchQuery = '';
  let showParticles = true;
  let isRadialWebMode = true;

  // Starfield
  let stars = [];
  function initStars() {
    stars = [];
    const count = Math.min(220, Math.floor((width * height) / 8000));
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.5 + 0.4,
        alpha: Math.random() * 0.8 + 0.2,
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
      size: 2.5 + Math.random() * 1.5,
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
    } catch (e) {
      // Live WS will deliver
    }
  }

  // Flash beacon on update
  function showUpdateFlash() {
    statusPill.style.transform = 'scale(1.08)';
    setTimeout(() => {
      statusPill.style.transform = 'scale(1)';
    }, 250);
  }

  // --- Graph Data Ingestion & Radial Layout ---
  function loadGraphData(data) {
    if (!data || !data.nodes) return;

    metadata = data.metadata || {};
    rootNodeId = metadata.rootNodeId || null;

    document.getElementById('project-path-display').textContent =
      metadata.rootPath ? `Workspace: ${metadata.rootPath}` : 'Universal Workspace';

    const rawNodes = data.nodes || [];
    const rawEdges = data.edges || [];

    // Fallback detection of root if not set
    if (!rootNodeId) {
      const entryCand = rawNodes.find((n) => n.isRoot || n.label === 'main.ts' || n.label === 'index.ts' || n.label === 'app.py');
      rootNodeId = entryCand ? entryCand.id : rawNodes[0]?.id;
    }

    // Preserve existing node positions to prevent visual jumping on live reload
    const oldNodePositions = new Map();
    nodes.forEach((n) => oldNodePositions.set(n.id, { x: n.x, y: n.y, vx: n.vx, vy: n.vy }));

    // Reconstruct nodes
    nodes = rawNodes.map((raw) => {
      const isRoot = raw.id === rootNodeId || raw.isRoot;
      const type = raw.type || 'File';
      const label = raw.label || raw.id;
      const theme = isRoot ? COLORS.root : (COLORS[type] || COLORS.default);

      // Node dimensions based on type and importance
      let baseRadius = 26;
      if (isRoot) baseRadius = 46;
      else if (type === 'File') baseRadius = 34;
      else if (type === 'Class') baseRadius = 28;
      else if (type === 'Function') baseRadius = 24;
      else if (type === 'Type') baseRadius = 22;

      const existing = oldNodePositions.get(raw.id);

      return {
        id: raw.id,
        label: label,
        type: type,
        isRoot: isRoot,
        path: raw.path,
        fullPath: raw.fullPath,
        parentFile: raw.parentFile,
        metadata: raw.metadata || {},
        theme: theme,
        radius: baseRadius,
        x: existing ? existing.x : (Math.random() - 0.5) * 400,
        y: existing ? existing.y : (Math.random() - 0.5) * 400,
        vx: existing ? existing.vx : 0,
        vy: existing ? existing.vy : 0,
        targetX: 0,
        targetY: 0,
        orbitRadius: 0,
        pulseOffset: Math.random() * Math.PI * 2
      };
    });

    nodeMap = new Map();
    nodes.forEach((n) => nodeMap.set(n.id, n));

    edges = rawEdges
      .filter((e) => nodeMap.has(e.source) && nodeMap.has(e.target))
      .map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: e.type || 'IMPORTS',
        label: e.label || e.type
      }));

    document.getElementById('node-count').textContent = nodes.length;
    document.getElementById('edge-count').textContent = edges.length;

    // Apply radial web layout targets
    computeRadialWebLayout();
  }

  /**
   * Compute radial orbital coordinates for a web structure:
   * Level 0 (Center): Root Node
   * Level 1: Files imported directly by Root or importing Root (Orbit 1)
   * Level 2: Secondary Files (Orbit 2)
   * Sub-nodes (Functions, Classes, Types): Orbit around their respective parent File node!
   */
  function computeRadialWebLayout() {
    if (nodes.length === 0) return;

    const rootNode = nodeMap.get(rootNodeId) || nodes[0];
    rootNode.isRoot = true;
    rootNode.targetX = 0;
    rootNode.targetY = 0;
    rootNode.orbitRadius = 0;

    // Separate file nodes vs symbol child nodes
    const fileNodes = nodes.filter((n) => n.type === 'File' && n.id !== rootNode.id);
    const symbolNodes = nodes.filter((n) => n.type !== 'File');

    // Build adjacency between files
    const fileAdj = new Map();
    fileNodes.forEach((f) => fileAdj.set(f.id, new Set()));
    fileAdj.set(rootNode.id, new Set());

    edges.forEach((e) => {
      if (fileAdj.has(e.source) && fileAdj.has(e.target)) {
        fileAdj.get(e.source).add(e.target);
        fileAdj.get(e.target).add(e.source);
      }
    });

    // BFS distance from root file
    const fileDistances = new Map();
    fileDistances.set(rootNode.id, 0);
    const queue = [rootNode.id];

    while (queue.length > 0) {
      const curr = queue.shift();
      const currDist = fileDistances.get(curr);
      const neighbors = fileAdj.get(curr) || new Set();
      neighbors.forEach((nbr) => {
        if (!fileDistances.has(nbr)) {
          fileDistances.set(nbr, currDist + 1);
          queue.push(nbr);
        }
      });
    }

    // Group files by distance tier
    const tiers = new Map();
    fileNodes.forEach((file) => {
      const dist = fileDistances.get(file.id) || 1;
      if (!tiers.has(dist)) tiers.set(dist, []);
      tiers.get(dist).push(file);
    });

    // Position files in concentric radial orbits
    const tierRadii = [0, 280, 480, 680, 880];
    tiers.forEach((filesInTier, tierIndex) => {
      const radius = tierRadii[tierIndex] || tierIndex * 220;
      const angleStep = (Math.PI * 2) / filesInTier.length;
      const angleOffset = tierIndex * 0.45; // stagger tiers

      filesInTier.forEach((file, idx) => {
        const theta = angleOffset + idx * angleStep;
        file.targetX = Math.cos(theta) * radius;
        file.targetY = Math.sin(theta) * radius;
        file.orbitRadius = radius;
      });
    });

    // Position symbol subnodes around their parent file
    const fileChildren = new Map();
    nodes.forEach((n) => {
      if (n.type === 'File') fileChildren.set(n.id, []);
    });

    symbolNodes.forEach((sym) => {
      let parentId = sym.parentFile;
      if (!parentId) {
        // Find declaring edge
        const declEdge = edges.find((e) => e.target === sym.id && e.type === 'DECLARES');
        if (declEdge) parentId = declEdge.source;
      }
      if (!parentId || !fileChildren.has(parentId)) {
        parentId = rootNode.id;
      }
      fileChildren.get(parentId).push(sym);
    });

    fileChildren.forEach((children, parentId) => {
      const parent = nodeMap.get(parentId) || rootNode;
      const childCount = children.length;
      if (childCount === 0) return;

      const subOrbitRadius = parent.isRoot ? 110 : 80;
      const angleStep = (Math.PI * 2) / childCount;

      children.forEach((child, idx) => {
        const theta = idx * angleStep;
        child.targetX = parent.targetX + Math.cos(theta) * subOrbitRadius;
        child.targetY = parent.targetY + Math.sin(theta) * subOrbitRadius;
        child.orbitRadius = subOrbitRadius;
      });
    });

    // If initial load, snap positions to targets immediately
    if (nodes.every((n) => n.x === 0 && n.y === 0)) {
      nodes.forEach((n) => {
        n.x = n.targetX;
        n.y = n.targetY;
      });
    }
  }

  // --- Force Simulation & Physics ---
  function updatePhysics() {
    const kRepulsion = 1600;
    const kSpring = 0.04;
    const kOrbitAnchor = isRadialWebMode ? 0.08 : 0.005;
    const damping = 0.84;

    // 1. Repulsion between blobs
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      if (a === draggedNode) continue;

      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distSq = dx * dx + dy * dy || 1;
        const minDist = a.radius + b.radius + 30;

        if (distSq < minDist * minDist * 4) {
          const dist = Math.sqrt(distSq);
          const force = (kRepulsion / (distSq + 10)) * (minDist / (dist + 1));
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
      const force = (dist - idealDist) * kSpring;

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

    // 3. Anchor toward radial web target or center
    nodes.forEach((node) => {
      if (node === draggedNode) return;

      if (isRadialWebMode) {
        node.vx += (node.targetX - node.x) * kOrbitAnchor;
        node.vy += (node.targetY - node.y) * kOrbitAnchor;
      } else {
        // gentle centering
        node.vx -= node.x * 0.001;
        node.vy -= node.y * 0.001;
      }

      node.vx *= damping;
      node.vy *= damping;
      node.x += node.vx;
      node.y += node.vy;
    });

    // Smooth camera tracking
    camera.x += (camera.targetX - camera.x) * 0.1;
    camera.y += (camera.targetY - camera.y) * 0.1;
    camera.zoom += (camera.targetZoom - camera.zoom) * 0.12;

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

  // --- Rendering Loop ---
  function render() {
    updatePhysics();

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    // Deep space gradient
    const spaceGrad = ctx.createRadialGradient(
      camera.x,
      camera.y,
      50 * camera.zoom,
      camera.x,
      camera.y,
      Math.max(width, height)
    );
    spaceGrad.addColorStop(0, '#0a1029');
    spaceGrad.addColorStop(0.5, '#060a1d');
    spaceGrad.addColorStop(1, '#03050e');
    ctx.fillStyle = spaceGrad;
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
      ctx.fillStyle = `rgba(224, 242, 254, ${star.alpha * twinkle})`;
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
      ctx.strokeStyle = `rgba(56, 189, 248, ${0.12 - idx * 0.03})`;
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 12]);
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();

      // Label orbit ring
      ctx.fillStyle = 'rgba(148, 163, 184, 0.35)';
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

      let alpha = 0.25;
      let lineWidth = 1.5;
      let strokeColor = 'rgba(56, 189, 248, 0.25)';

      if (edge.type === 'DECLARES') {
        strokeColor = 'rgba(52, 211, 153, 0.2)';
      }

      if (isConnectedToHover || isConnectedToSelected) {
        alpha = 0.9;
        lineWidth = 2.8;
        strokeColor = edge.type === 'IMPORTS' ? '#38bdf8' : '#34d399';
        ctx.shadowColor = strokeColor;
        ctx.shadowBlur = 10;
      } else if (hoveredNode || selectedNode) {
        alpha = 0.06;
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
      // Filter check
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
        if (!isNeighbor) alpha = 0.22;
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

      // Organic Blob Body (Smooth Rounded Fluid Blob)
      drawOrganicBlob(ctx, node.x, node.y, currentRadius, time + node.pulseOffset, node.theme);

      // Node Border / Ring
      ctx.lineWidth = isSelected ? 3.5 : isHovered || matchesSearch ? 2.5 : 1.5;
      ctx.strokeStyle = isSelected ? '#ffffff' : node.theme.main;
      ctx.shadowColor = node.theme.main;
      ctx.shadowBlur = isSelected ? 16 : isHovered ? 12 : 6;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Inner Core Glow
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(node.x - currentRadius * 0.3, node.y - currentRadius * 0.3, currentRadius * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fill();

      // Node Label
      ctx.font = node.isRoot
        ? '700 14px "Plus Jakarta Sans", sans-serif'
        : '600 11px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Label background pill
      const text = node.label;
      const textMetrics = ctx.measureText(text);
      const pillW = textMetrics.width + 16;
      const pillH = 22;
      const pillY = node.y + currentRadius + 14;

      ctx.fillStyle = 'rgba(7, 11, 30, 0.85)';
      ctx.strokeStyle = isSelected ? '#38bdf8' : 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      roundRect(ctx, node.x - pillW / 2, pillY - pillH / 2, pillW, pillH, 11);
      ctx.fill();
      ctx.stroke();

      // Label text
      ctx.fillStyle = isSelected ? '#38bdf8' : '#f8fafc';
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
      // Organic deformation
      const offset = Math.sin(angle * 3 + phase) * 2.5 + Math.cos(angle * 2 - phase) * 1.5;
      const pr = r + offset;
      const px = x + Math.cos(angle) * pr;
      const py = y + Math.sin(angle) * pr;

      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        // Smooth curve
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

    // Body Gradient
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

  // --- Interaction & Event Handlers ---
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
      if (dist <= node.radius + 10) {
        return node;
      }
    }
    return null;
  }

  canvas.addEventListener('mousedown', (e) => {
    const node = findNodeAt(e.clientX, e.clientY);
    if (node) {
      draggedNode = node;
      selectNode(node);
    } else {
      isPanning = true;
      panStart = { x: e.clientX - camera.targetX, y: e.clientY - camera.targetY };
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (draggedNode) {
      const world = screenToWorld(e.clientX, e.clientY);
      draggedNode.x = world.x;
      draggedNode.y = world.y;
      draggedNode.vx = 0;
      draggedNode.vy = 0;
    } else if (isPanning) {
      camera.targetX = e.clientX - panStart.x;
      camera.targetY = e.clientY - panStart.y;
    } else {
      const node = findNodeAt(e.clientX, e.clientY);
      hoveredNode = node;
      canvas.style.cursor = node ? 'pointer' : 'grab';
    }
  });

  window.addEventListener('mouseup', () => {
    draggedNode = null;
    isPanning = false;
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.88;
    const newZoom = Math.max(0.2, Math.min(3.5, camera.targetZoom * zoomFactor));

    // Zoom toward mouse position
    const mouseWorldX = (e.clientX - camera.targetX) / camera.targetZoom;
    const mouseWorldY = (e.clientY - camera.targetY) / camera.targetZoom;

    camera.targetZoom = newZoom;
    camera.targetX = e.clientX - mouseWorldX * newZoom;
    camera.targetY = e.clientY - mouseWorldY * newZoom;
  }, { passive: false });

  // Node Selection & Inspector
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

    // Incoming & Outgoing dependencies
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

    // Click relation to navigate
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
    camera.targetZoom = Math.min(3.5, camera.targetZoom * 1.3);
  });

  document.getElementById('btn-zoom-out').addEventListener('click', () => {
    camera.targetZoom = Math.max(0.2, camera.targetZoom * 0.75);
  });

  document.getElementById('btn-center').addEventListener('click', () => {
    const rootNode = nodeMap.get(rootNodeId) || nodes[0];
    if (rootNode) {
      centerOnNode(rootNode);
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
