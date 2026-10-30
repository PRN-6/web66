# 🌌 Web66 — Cosmic Codebase Intelligence

[![npm version](https://img.shields.io/npm/v/@leozodiac/web66.svg?color=cb3837)](https://www.npmjs.com/package/@leozodiac/web66)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Google Maps for Source Code.** Transforms any codebase into an explorable cosmic web of organic glowing blobs, with instant auto-scan, zero-config local server, and live sync.

---

## ⚡ Quick Start (No Installation Needed)

Anyone can run Web66 in **any** project directory without installing anything:

```bash
# Analyze and serve current directory (opens http://localhost:6868)
npx @leozodiac/web66

# Or analyze a specific folder
npx @leozodiac/web66 ./src

# Change port or disable browser auto-open
npx @leozodiac/web66 . --port 3000 --no-open
```

---

## 💻 Install Globally as a CLI Command

To use `web66` anywhere on your machine like a native tool:

```bash
# Install globally from npm
npm install -g @leozodiac/web66
```

Then run it in **any** project folder:
```bash
web66 .
```

---

## 📦 Add to a Team Project

Install as a devDependency in your repository:

```bash
npm install -D @leozodiac/web66
```

Add to your `package.json`:
```json
{
  "scripts": {
    "visualize": "web66 ."
  }
}
```

Now anyone on your team can run:
```bash
npm run visualize
```

---

## 🛠️ Local Development & Contributing

Clone the repository and test it locally:

```bash
git clone https://github.com/PRN-6/web66.git
cd web66

# Launch interactive cosmos visualizer on the included demo project
npm run dev

# Run automated test suite
npm test
```

---

## ✨ Features

- 🌟 **Supermassive Core Node**: Automatically detects project root entry points (`index.ts`, `main.ts`, `main.py`, `app.py`, `package.json`).
- 🕸️ **Radial Web Orbit Layout**: The root node is stationed at the cosmic center $(0,0)$. Connected files radiate outward in $360^\circ$ concentric orbital rings, while functions, classes, and types orbit their parent files as satellite moons.
- 🫧 **Organic Glowing Blobs**: Fluid celestial blobs with glowing halos and color-coding:
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

## 🏗️ Architecture

- **`bin/web66.js`**: Executable CLI binary runner.
- **`packages/core/engine.js`**: Universal AST and symbol extraction engine (TypeScript, JavaScript, Python, JSON) with zero runtime dependencies.
- **`packages/core/server.js`**: Built-in HTTP server, native RFC 6455 WebSocket streaming, and recursive file watcher.
- **`packages/viewer/client/`**: Standalone, lightweight cosmic web canvas visualizer.
- **`apps/web/`**: ReactFlow-based companion visualizer.

---

## 📄 License
MIT © [PRN-6](https://github.com/PRN-6)
