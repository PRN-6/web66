# 🛠️ Contributing to Web68

First off, thank you for considering contributing to Web68! It's a community-driven effort to make codebase understanding visual and intuitive.

## 🌟 How to Contribute

### 1. Adding a New Language Adapter
The core strength of Web68 is its language-agnostic design. Adding a new language (e.g., Go, Rust, Java) is straightforward:

1.  **Create a new package**: Create a directory in `packages/language-<lang>`.
2.  **Implement the Interface**: Create an `index.ts` that implements the `LanguageAdapter` interface from `@web68/parser-engine`.
3.  **Implement Core Methods**:
    - `detectFile`: Determine if the file extension matches your language.
    - `extractSymbols`: Find classes, functions, and interfaces.
    - `resolveImports`: Map import statements to file paths.
4.  **Register the Adapter**: Add your new adapter to the `AnalysisEngine` instance in `packages/cli/index.ts`.

### 2. Improving the Visualization
The frontend in `apps/web` is built with React Flow. You can contribute by:
- Implementing **Automated Layouts** (e.g., integrating `dagre` for hierarchical views).
- Adding **Filtering** (e.g., "Hide all nodes except Classes").
- Improving the **Inspector Panel** to show more detailed AST information.

## 🧪 Testing Your Changes

We use a fixture-based testing approach. To verify your changes:
1. Create a sample project in `tests/fixtures/`.
2. Run the CLI against that folder:
   ```bash
   npx ts-node packages/cli/index.ts tests/fixtures/my-test-project graph.json
   ```
3. Load the `graph.json` into the web app to verify the visual connections.

## 📜 Guidelines

- **TypeScript First**: All code must be written in TypeScript with strict type safety.
- **Schema Adherence**: Do not modify the `graph-schema` without ensuring backward compatibility for existing graph exports.
- **Performance**: Avoid heavy synchronous operations in the analysis engine to keep the CLI responsive.

## 🚩 Pull Request Process

1. Fork the repo and create your branch from `main`.
2. If you've added a feature, please include a sample fixture in `tests/fixtures/`.
3. Open a Pull Request with a clear description of the changes.
