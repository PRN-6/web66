# 🌐 Web68 — Universal Codebase Intelligence

Web68 is a professional-grade codebase analysis and interactive dependency mapping platform. It transforms complex software projects into an explorable network graph, allowing developers to visualize architectural relationships, trace dependencies, and understand the "big picture" of any codebase.

## ✨ Key Features

- **Universal Graph Schema**: A language-agnostic model representing files, modules, classes, and functions.
- **Multi-Language Support**: Initial adapters for **TypeScript**, **JavaScript**, and **Python**.
- **Interactive Visualization**: A high-performance React Flow-based map for exploring dependencies.
- **Headless Analysis**: A powerful CLI to generate architectural snapshots as JSON.
- **Symbol-Level Detail**: Go beyond file-to-file imports to see exactly which functions and classes are being declared and used.

## 🛠️ Technology Stack

- **Core**: TypeScript, Node.js
- **Frontend**: React, Vite, Tailwind CSS, React Flow, Zustand
- **Analysis**: AST-based extraction, Universal Graph Schema
- **Monorepo**: pnpm Workspaces

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)

### Installation
```bash
git clone https://github.com/your-username/web68.git
cd web68
pnpm install
```

### Running the Analysis
Use the CLI to analyze a local project folder:
```bash
# Format: npx ts-node packages/cli/index.ts <path-to-project> <output-file.json>
npx ts-node packages/cli/index.ts ./my-awesome-app graph.json
```

### Visualizing the Results
1. Start the visualization app:
   ```bash
   cd apps/web
   npm run dev
   ```
2. Open `http://localhost:5173` in your browser.
3. Click **"Load Graph JSON"** and select the `graph.json` you generated.

## 🏗️ Architecture

Web68 is built as a monorepo to separate the analysis logic from the visualization:

- `packages/graph-schema`: The "Source of Truth" for how a project is represented.
- `packages/parser-engine`: The interface that all language adapters must implement.
- `packages/core`: The orchestrator that handles file discovery and analysis.
- `packages/language-typescript` & `packages/language-python`: Specific logic for extracting symbols and imports from source code.
- `apps/web`: The interactive frontend for exploring the resulting graph.

## 🤝 Contributing

We welcome contributions! Whether it's adding a new language adapter or improving the visualization layout, check out our [Contributing Guide](CONTRIBUTING.md).

**Interested in adding a language?** 
Simply implement the `LanguageAdapter` interface in a new package under `packages/language-*.`

## 📄 License
MIT
