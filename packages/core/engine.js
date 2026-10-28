const fs = require('fs').promises;
const path = require('path');

const NodeType = {
  File: 'File',
  Class: 'Class',
  Function: 'Function',
  Type: 'Type',
  Export: 'Export',
};

class AnalysisEngine {
  constructor(options = {}) {
    this.rootPath = path.resolve(options.rootPath || '.');
    this.ignorePatterns = options.ignorePatterns || [
      'node_modules', '.git', 'dist', 'build', '.next', '.cache', 'coverage', '.turbo'
    ];
    this.graph = {
      nodes: new Map(),
      edges: new Map(),
      metadata: {
        rootPath: this.rootPath,
        rootNodeId: null,
        analyzedAt: new Date().toISOString(),
        languages: [],
        stats: {}
      }
    };
    this.stats = {
      filesDiscovered: 0,
      filesAnalyzed: 0,
      nodesGenerated: 0,
      edgesGenerated: 0
    };
  }

  async analyze() {
    this.graph.nodes.clear();
    this.graph.edges.clear();
    this.stats = { filesDiscovered: 0, filesAnalyzed: 0, nodesGenerated: 0, edgesGenerated: 0 };

    const files = await this.discoverFiles(this.rootPath);
    this.stats.filesDiscovered = files.length;

    const fileContents = new Map();
    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf8');
        fileContents.set(file, content);
      } catch (e) {
        // Skip unreadable files
      }
    }

    // Process all files
    for (const [filePath, content] of fileContents.entries()) {
      await this.processFile(filePath, content);
    }

    // Determine root / main entry file
    const rootNodeId = this.detectRootFile(files);
    this.graph.metadata.rootNodeId = rootNodeId;
    if (rootNodeId && this.graph.nodes.has(rootNodeId)) {
      const rootNode = this.graph.nodes.get(rootNodeId);
      rootNode.isRoot = true;
      rootNode.metadata.isRoot = true;
    }

    this.graph.metadata.analyzedAt = new Date().toISOString();
    this.graph.metadata.stats = {
      ...this.stats,
      nodesGenerated: this.graph.nodes.size,
      edgesGenerated: this.graph.edges.size
    };

    return {
      metadata: this.graph.metadata,
      nodes: Array.from(this.graph.nodes.values()),
      edges: Array.from(this.graph.edges.values())
    };
  }

  async discoverFiles(dir) {
    const results = [];
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (this.shouldIgnore(fullPath)) continue;

        if (entry.isDirectory()) {
          const subFiles = await this.discoverFiles(fullPath);
          results.push(...subFiles);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.json'].includes(ext)) {
            // Skip large lock files or minified bundles
            if (entry.name.includes('.min.') || entry.name === 'package-lock.json' || entry.name === 'pnpm-lock.yaml') {
              continue;
            }
            results.push(fullPath);
          }
        }
      }
    } catch (e) {
      // Ignore directory access errors
    }
    return results;
  }

  shouldIgnore(targetPath) {
    const rel = path.relative(this.rootPath, targetPath);
    return this.ignorePatterns.some(p => {
      return rel.split(path.sep).includes(p) || targetPath.includes(p);
    });
  }

  async processFile(filePath, content) {
    this.stats.filesAnalyzed++;
    const ext = path.extname(filePath).toLowerCase();
    const relPath = path.relative(this.rootPath, filePath).replace(/\\/g, '/');
    const label = path.basename(filePath);
    const fileId = `file:${relPath}`;

    const lineCount = content.split('\n').length;

    // Create file node
    const fileNode = {
      id: fileId,
      type: 'File',
      label: label,
      path: relPath,
      fullPath: filePath,
      language: this.getLanguage(ext),
      metadata: {
        extension: ext,
        lines: lineCount,
        size: Buffer.byteLength(content, 'utf8')
      }
    };
    this.addNode(fileNode);

    // Parse symbols and imports based on language
    if (['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'].includes(ext)) {
      this.parseJavaScript(filePath, relPath, fileId, content);
    } else if (ext === '.py') {
      this.parsePython(filePath, relPath, fileId, content);
    } else if (ext === '.json' && label === 'package.json') {
      this.parsePackageJson(filePath, relPath, fileId, content);
    }
  }

  getLanguage(ext) {
    if (['.ts', '.tsx'].includes(ext)) return 'typescript';
    if (['.js', '.jsx', '.mjs', '.cjs'].includes(ext)) return 'javascript';
    if (ext === '.py') return 'python';
    if (ext === '.json') return 'json';
    return 'unknown';
  }

  parseJavaScript(filePath, relPath, fileId, content) {
    // 1. Extract Functions
    const fnRegex = /(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_$]+)\s*\(/g;
    let m;
    while ((m = fnRegex.exec(content)) !== null) {
      const name = m[1];
      const symId = `symbol:${relPath}:${name}`;
      this.addNode({
        id: symId,
        type: 'Function',
        label: `${name}()`,
        name: name,
        path: relPath,
        parentFile: fileId,
        metadata: { kind: 'function' }
      });
      this.addEdge({
        id: `edge:${fileId}->${symId}`,
        source: fileId,
        target: symId,
        type: 'DECLARES',
        label: 'declares'
      });
    }

    // Arrow functions / const functions: const foo = (...) => or const foo = async (...) =>
    const arrowRegex = /(?:export\s+)?const\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z0-9_$]+)\s*=>/g;
    while ((m = arrowRegex.exec(content)) !== null) {
      const name = m[1];
      const symId = `symbol:${relPath}:${name}`;
      if (!this.graph.nodes.has(symId)) {
        this.addNode({
          id: symId,
          type: 'Function',
          label: `${name}()`,
          name: name,
          path: relPath,
          parentFile: fileId,
          metadata: { kind: 'arrow-function' }
        });
        this.addEdge({
          id: `edge:${fileId}->${symId}`,
          source: fileId,
          target: symId,
          type: 'DECLARES',
          label: 'declares'
        });
      }
    }

    // 2. Extract Classes
    const classRegex = /(?:export\s+)?class\s+([a-zA-Z0-9_$]+)/g;
    while ((m = classRegex.exec(content)) !== null) {
      const name = m[1];
      const symId = `class:${relPath}:${name}`;
      this.addNode({
        id: symId,
        type: 'Class',
        label: `class ${name}`,
        name: name,
        path: relPath,
        parentFile: fileId,
        metadata: { kind: 'class' }
      });
      this.addEdge({
        id: `edge:${fileId}->${symId}`,
        source: fileId,
        target: symId,
        type: 'DECLARES',
        label: 'declares'
      });
    }

    // 3. Extract Interfaces & Types (TypeScript)
    const typeRegex = /(?:export\s+)?(?:type|interface)\s+([a-zA-Z0-9_$]+)/g;
    while ((m = typeRegex.exec(content)) !== null) {
      const name = m[1];
      const symId = `type:${relPath}:${name}`;
      this.addNode({
        id: symId,
        type: 'Type',
        label: `type ${name}`,
        name: name,
        path: relPath,
        parentFile: fileId,
        metadata: { kind: 'type' }
      });
      this.addEdge({
        id: `edge:${fileId}->${symId}`,
        source: fileId,
        target: symId,
        type: 'DECLARES',
        label: 'declares'
      });
    }

    // 4. Resolve Imports
    const importRegex = /import\s+(?:(?:(?:\*\s+as\s+[a-zA-Z0-9_$]+)|(?:\{[^}]*\})|(?:[a-zA-Z0-9_$]+))\s+from\s+)?['"](.*)['"]/g;
    while ((m = importRegex.exec(content)) !== null) {
      const rawSpecifier = m[1];
      const resolved = this.resolveImport(filePath, rawSpecifier);
      if (resolved) {
        const targetRel = path.relative(this.rootPath, resolved).replace(/\\/g, '/');
        const targetId = `file:${targetRel}`;
        this.addEdge({
          id: `edge:${fileId}->${targetId}`,
          source: fileId,
          target: targetId,
          type: 'IMPORTS',
          label: 'imports'
        });
      }
    }

    // CommonJS require: require('...')
    const reqRegex = /require\(['"](.*)['"]\)/g;
    while ((m = reqRegex.exec(content)) !== null) {
      const rawSpecifier = m[1];
      const resolved = this.resolveImport(filePath, rawSpecifier);
      if (resolved) {
        const targetRel = path.relative(this.rootPath, resolved).replace(/\\/g, '/');
        const targetId = `file:${targetRel}`;
        this.addEdge({
          id: `edge:${fileId}->${targetId}`,
          source: fileId,
          target: targetId,
          type: 'IMPORTS',
          label: 'imports'
        });
      }
    }
  }

  parsePython(filePath, relPath, fileId, content) {
    // 1. Functions: def foo(...)
    const fnRegex = /^ *(?:async +)?def +([a-zA-Z_][a-zA-Z0-9_]*) *\(/gm;
    let m;
    while ((m = fnRegex.exec(content)) !== null) {
      const name = m[1];
      const symId = `symbol:${relPath}:${name}`;
      this.addNode({
        id: symId,
        type: 'Function',
        label: `${name}()`,
        name: name,
        path: relPath,
        parentFile: fileId,
        metadata: { kind: 'function' }
      });
      this.addEdge({
        id: `edge:${fileId}->${symId}`,
        source: fileId,
        target: symId,
        type: 'DECLARES',
        label: 'declares'
      });
    }

    // 2. Classes: class Foo:
    const classRegex = /^ *class +([a-zA-Z_][a-zA-Z0-9_]*)/gm;
    while ((m = classRegex.exec(content)) !== null) {
      const name = m[1];
      const symId = `class:${relPath}:${name}`;
      this.addNode({
        id: symId,
        type: 'Class',
        label: `class ${name}`,
        name: name,
        path: relPath,
        parentFile: fileId,
        metadata: { kind: 'class' }
      });
      this.addEdge({
        id: `edge:${fileId}->${symId}`,
        source: fileId,
        target: symId,
        type: 'DECLARES',
        label: 'declares'
      });
    }

    // 3. Python Imports: from .xyz import ... or import xyz
    const fromImportRegex = /^ *(?:from +(\.?[a-zA-Z0-9_.]*) +import +[a-zA-Z0-9_*, ]+)/gm;
    while ((m = fromImportRegex.exec(content)) !== null) {
      const moduleName = m[1];
      const resolved = this.resolvePythonImport(filePath, moduleName);
      if (resolved) {
        const targetRel = path.relative(this.rootPath, resolved).replace(/\\/g, '/');
        const targetId = `file:${targetRel}`;
        this.addEdge({
          id: `edge:${fileId}->${targetId}`,
          source: fileId,
          target: targetId,
          type: 'IMPORTS',
          label: 'imports'
        });
      }
    }
  }

  parsePackageJson(filePath, relPath, fileId, content) {
    try {
      const pkg = JSON.parse(content);
      if (pkg.main) {
        const resolved = this.resolveImport(filePath, pkg.main);
        if (resolved) {
          const targetRel = path.relative(this.rootPath, resolved).replace(/\\/g, '/');
          this.addEdge({
            id: `edge:${fileId}->file:${targetRel}`,
            source: fileId,
            target: `file:${targetRel}`,
            type: 'ENTRY_POINT',
            label: 'entry'
          });
        }
      }
    } catch (e) {}
  }

  resolveImport(sourceFile, specifier) {
    if (!specifier.startsWith('.')) return null;
    const dir = path.dirname(sourceFile);
    const targetBase = path.resolve(dir, specifier);

    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json'];
    // 1. Direct file with extension or added extension
    for (const ext of extensions) {
      const cand = targetBase.endsWith(ext) ? targetBase : targetBase + ext;
      try {
        const fsSync = require('fs');
        if (fsSync.existsSync(cand) && fsSync.statSync(cand).isFile()) {
          return cand;
        }
      } catch (e) {}
    }

    // 2. Directory index: dir/index.ts, etc.
    for (const ext of extensions) {
      const cand = path.join(targetBase, `index${ext}`);
      try {
        const fsSync = require('fs');
        if (fsSync.existsSync(cand) && fsSync.statSync(cand).isFile()) {
          return cand;
        }
      } catch (e) {}
    }

    return null;
  }

  resolvePythonImport(sourceFile, moduleName) {
    const dir = path.dirname(sourceFile);
    const fsSync = require('fs');
    if (moduleName.startsWith('.')) {
      const relativePart = moduleName.replace(/^\.+/, '').replace(/\./g, path.sep);
      const cand = path.resolve(dir, relativePart + '.py');
      if (fsSync.existsSync(cand)) return cand;
    } else {
      const parts = moduleName.replace(/\./g, path.sep);
      const cand1 = path.resolve(dir, parts + '.py');
      if (fsSync.existsSync(cand1)) return cand1;
      const cand2 = path.resolve(this.rootPath, parts + '.py');
      if (fsSync.existsSync(cand2)) return cand2;
    }
    return null;
  }

  detectRootFile(files) {
    if (files.length === 0) return null;

    // 1. Check for standard entry filenames
    const rootCandidates = [
      'index.ts', 'main.ts', 'app.ts', 'server.ts',
      'index.js', 'main.js', 'app.js', 'server.js',
      'app.py', 'main.py', '__init__.py', 'index.py'
    ];

    for (const cand of rootCandidates) {
      const match = files.find(f => path.basename(f).toLowerCase() === cand);
      if (match) {
        const rel = path.relative(this.rootPath, match).replace(/\\/g, '/');
        return `file:${rel}`;
      }
    }

    // 2. Highest out-degree (file that imports the most other files)
    const degreeMap = new Map();
    for (const edge of this.graph.edges.values()) {
      if (edge.type === 'IMPORTS') {
        degreeMap.set(edge.source, (degreeMap.get(edge.source) || 0) + 1);
      }
    }

    let maxDeg = -1;
    let bestId = null;
    for (const [id, deg] of degreeMap.entries()) {
      if (deg > maxDeg) {
        maxDeg = deg;
        bestId = id;
      }
    }
    if (bestId) return bestId;

    // 3. Fallback to first discovered file
    const rel = path.relative(this.rootPath, files[0]).replace(/\\/g, '/');
    return `file:${rel}`;
  }

  addNode(node) {
    if (!this.graph.nodes.has(node.id)) {
      this.graph.nodes.set(node.id, node);
      this.stats.nodesGenerated++;
    }
  }

  addEdge(edge) {
    if (!this.graph.edges.has(edge.id)) {
      this.graph.edges.set(edge.id, edge);
      this.stats.edgesGenerated++;
    }
  }
}

module.exports = { AnalysisEngine, NodeType };
