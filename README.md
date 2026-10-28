# 🌌 Web66 — Cosmic Codebase Intelligence

> **Google Maps for Source Code.** Transforms any codebase into an explorable cosmic web of organic glowing blobs, with instant auto-scan, zero-config local server, and live sync.

---

## ⚡ The One-Command Experience

Analyze and explore any local project with a single command:

```bash
# Analyze and serve current directory (opens http://localhost:6868)
npx web66

# Or analyze a specific folder / project on a custom port
npx web66 ./src --port 3000

# Headless / no auto-open browser
npx web66 ../my-app --no-open
```

### Or using npm scripts:
```bash
# Launch interactive cosmos visualizer on tests/demo-project
npm run dev

# Run test suite
npm test
```

---

## ✨ Features

- 🌟 **Supermassive Core Node**: Automatically detects project root entry files (`index.ts`, `main.py`, `app.ts`, `package.json`).
- 🕸️ **Radial Web Orbit Layout**: The root node is stationed at the cosmic center $(0,0)$. Connected files radiate outward in $360^\circ$ concentric orbital rings, while functions, classes, and types orbit their parent files as satellite moons.
- 🫧 **Organic Glowing Blobs**: Nodes are fluid, pulsating celestial blobs with soft outer halos and color-coding:
  - ☀️ **Supernova Gold**: Core Entry / Root File
  - 🌐 **Plasma Cyan**: Files & Modules
  - 💜 **Neon Violet**: Classes
  - 💚 **Aurora Green**: Functions & Arrow Functions
  - 🔷 **Electric Indigo**: Types & Interfaces
- ⚡ **Real-Time Live Sync**: Built-in recursive file watcher automatically re-analyzes code on save and streams delta updates over WebSockets directly to the live browser view.
- 🌌 **Deep Space Environment**: Starfields with twinkling celestial dust, energy pulse particles travelling along filaments, and smooth zoom/pan camera physics.
- 🔍 **HUD Controls & Inspector**:
  - Global Search (`⌘K` / `Ctrl+K`) with instant camera auto-focus.
  - Entity filter pills (All, Files, Functions, Classes, Types).
  - Floating controls: Zoom In/Out, Center Core, Toggle Web Orbit / Free Physics, Toggle Energy Particles.
  - Interactive Inspector Drawer displaying incoming referrers, outgoing dependencies, and metadata.

---

## 🛠️ Architecture

- **`bin/web66.js`**: Executable CLI binary for `npx web66`.
- **`packages/core/engine.js`**: AST and symbol extraction engine (TypeScript, JavaScript, Python, JSON).
- **`packages/core/server.js`**: Zero-external-dependency HTTP server, native RFC 6455 WebSocket streaming, and recursive file watcher.
- **`packages/viewer/client/`**: Standalone, lightweight cosmic web canvas visualizer.
- **`apps/web/`**: ReactFlow-based React companion visualizer.

---

## 📄 License
MIT
