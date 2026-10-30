# 🌌 Web66 Technical Documentation

Comprehensive architectural reference and developer guide for **Web66 (`@leozodiac/web66`)**.

---

## 📑 Table of Contents

- [1. Overview & Core Philosophy](#1-overview--core-philosophy)
- [2. Quick Start & Execution Modes](#2-quick-start--execution-modes)
- [3. System Architecture](#3-system-architecture)
  - [AST Engine (`packages/core/engine.js`)](#ast-engine-packagescoreenginejs)
  - [Live Server & WebSockets (`packages/core/server.js`)](#live-server--websockets-packagescoreserverjs)
  - [Cosmic Canvas Client (`packages/viewer/client/`)](#cosmic-canvas-client-packagesviewerclient)
- [4. CLI Reference & Configuration Flags](#4-cli-reference--configuration-flags)
- [5. Cosmic Entity Model & Color Palette](#5-cosmic-entity-model--color-palette)
- [6. Real-Time Delta Synchronization](#6-real-time-delta-synchronization)
- [7. Performance & Optimization Guarantees](#7-performance--optimization-guarantees)
- [8. Contributing & Local Development](#8-contributing--local-development)

---

## 1. Overview & Core Philosophy

**Web66** is an offline, zero-config codebase intelligence visualizer designed as *"Google Maps for Source Code"*. It parses files, classes, functions, and interfaces into interactive celestial galaxies without sending any source code or metadata to external servers.

### Key Tenets
1. **Zero External Dependencies:** Built with native Node.js standard libraries (`http`, `fs`, `path`, `crypto`).
2. **Deterministic Radial Layout:** Central root entry modules sit at coordinates $(0,0)$; modules and symbols radiate outwards in concentric orbital rings.
3. **Instant Startup:** Scans hundreds of files in under 50ms with zero heavy compilers required.

---

## 2. Quick Start & Execution Modes

### Mode A: Zero-Config Direct Run (Recommended)
```bash
npx @leozodiac/web66
```
Directly scans the current directory and automatically opens `http://localhost:6868`.

### Mode B: Target Specific Directory
```bash
npx @leozodiac/web66 ./src
```

### Mode C: Global Installation
```bash
npm install -g @leozodiac/web66
web66 .
```

### Mode D: Project Dependency
```bash
npm install -D @leozodiac/web66
```
Add to `package.json`:
```json
{
  "scripts": {
    "visualize": "web66 ."
  }
}
```

---

## 3. System Architecture

```
web66/
├── bin/
│   └── web66.js             # CLI entrypoint and argument parser
├── packages/
│   ├── core/
│   │   ├── engine.js        # Universal regex/AST parser & graph builder
│   │   └── server.js        # Native HTTP + RFC 6455 WebSocket streaming
│   └── viewer/
│       └── client/          # Vanilla Canvas-based cosmos renderer
└── docs/                    # Interactive web documentation & demo
```

### AST Engine (`packages/core/engine.js`)
- Recursively traverses project trees ignoring non-source folders (`node_modules`, `.git`, `dist`, `.next`, `build`).
- Extracts symbol definitions and dependency links across:
  - **TypeScript & JavaScript (`.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`)**: `import`, `require`, `export`, functions, classes, interfaces, type aliases.
  - **Python (`.py`)**: `import`, `from ... import`, `def`, `class`.
  - **JSON (`.json`)**: Module manifests and configuration mappings.
- Automatically detects root entry points (e.g. `index.ts`, `main.ts`, `app.py`, `package.json`).

### Live Server & WebSockets (`packages/core/server.js`)
- Runs a lightweight HTTP server serving the visualizer bundle.
- Implements the RFC 6455 WebSocket handshake from scratch without external libraries (`ws` or `socket.io`).
- Utilizes native `fs.watch` to detect file additions, edits, and deletions, broadcasting JSON delta events to the browser.

### Cosmic Canvas Client (`packages/viewer/client/`)
- GPU-accelerated HTML5 Canvas renderer.
- Implements physical simulation cooling (`simAlpha` temperature decay) to ensure nodes settle cleanly without jitter.
- Provides search (`⌘K` / `Ctrl+K`), entity filtering pills, and node inspector drawers.

---

## 4. CLI Reference & Configuration Flags

| Flag | Short | Default | Description |
|---|---|---|---|
| `--port <number>` | `-p` | `6868` | Port to run local server on |
| `--no-open` | | `false` | Prevent opening browser automatically |
| `--help` | `-h` | | Print CLI usage and help |
| `--version` | `-v` | | Print current version |

### Examples
```bash
# Custom port with browser auto-open disabled
npx @leozodiac/web66 ./packages/backend --port 8080 --no-open
```

---

## 5. Cosmic Entity Model & Color Palette

| Entity Type | Celestial Role | Color Hex | Visual Style |
|---|---|---|---|
| **Root Entry** | Supermassive Core | `#fbbf24` (Gold) | Large radiant core with pulsing halo |
| **Files & Modules** | Orbital Planets | `#38bdf8` (Cyan) | Dense orbital spheres along rings |
| **Classes** | Nebular Clusters | `#c084fc` (Violet) | Clustered nodes with boundary shields |
| **Functions** | Energy Satellites | `#34d399` (Emerald) | Fast-orbiting moons |
| **Types / Interfaces** | Crystal Arrays | `#818cf8` (Indigo) | Geometric structural nodes |

---

## 6. Real-Time Delta Synchronization

1. Developer saves a file in their editor (VS Code, Cursor, Neovim, etc.).
2. The recursive file watcher detects the file modification timestamp change.
3. The engine re-parses only the changed file and resolves incoming/outgoing edge diffs.
4. A WebSocket packet with `{ type: 'DELTA_UPDATE', payload: ... }` is sent to the client.
5. The Canvas client smoothly interpolates node positions and glows newly updated nodes.

---

## 7. Performance & Optimization Guarantees

- **Binary Footprint:** ~21 KB unpacked bundle.
- **Memory Footprint:** < 30 MB idle memory consumption.
- **Zero Telemetry:** Strictly offline localhost traffic; 0 bytes transmitted externally.
- **Scale:** Tested on codebases with over 1,500 source files.

---

## 8. Contributing & Local Development

```bash
# 1. Clone repository
git clone https://github.com/PRN-6/web66.git
cd web66

# 2. Run local development on the included demo project
npm run dev

# 3. Run test suite
npm test

# 4. Serve documentation site locally
npm run site
```

---

© 2026 PRN-6. Released under the [MIT License](https://opensource.org/licenses/MIT).

