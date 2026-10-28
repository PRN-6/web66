const fs = require('fs').promises;
const path = require('path');
const { performance } = require('perf_hooks');

// --- GRAPH SCHEMA ---
const NodeType = {
  Repository: 'Repository',
  Directory: 'Directory',
  File: 'File',
  Module: 'Module',
  Class: 'Class',
  Function: 'Function',
  Method: 'Method',
  Variable: 'Variable',
  Constant: 'Constant',
  Type: 'Type',
  Enum: 'Enum',
  Import: 'Import',
  Export: 'Export'
};

const RelationType = {
  CONTAINS: 'CONTAINS',
  IMPORTS: 'IMPORTS',
  EXPORTS: 'EXPORTS',
  CALLS: 'CALLS',
  EXTENDS: 'EXTENDS',
  IMPLEMENTS: 'IMPLEMENTS',
  REFERENCES: 'REFERENCES',
  DECLARES: 'DECLARES',
  DEPENDS_ON: 'DEPENDS_ON',
  RE_EXPORTS: 'RE_EXPORTS',
  TYPE_DEPENDS_ON: 'TYPE_DEPENDS_ON'
};

// --- LANGUAGE ADAPTERS ---

class TypeScriptAdapter {
  constructor() {
    this.name = 'TypeScript';
    this.supportedExtensions = ['.ts', '.tsx', '.js', '.jsx'];
  }

  detectFile(filePath, content) {
    const ext = path.extname(filePath);
    return this.supportedExtensions.includes(ext);
  }

  extractSymbols(filePath, content) {
    const symbols = [];
    const functionRegex = /(?:async\s+)?function\s+([a-zA-Z0-9_]+)\s*\(/g;
    const constFunctionRegex = /const\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?\(.*\)\s*=>/g;
    const classRegex = /class\s+([a-zA-Z0-9_]+)\s*\{/g;

    let match;
    while ((match = functionRegex.exec(content)) !== null) {
      symbols.push({ id: `symbol:${filePath}:${match[1]}`, type: 'Function', label: match[1], language: 'typescript', path: filePath, metadata: { offset: match.index } });
    }
    while ((match = constFunctionRegex.exec(content)) !== null) {
      symbols.push({ id: `symbol:${filePath}:${match[1]}`, type: 'Function', label: match[1], language: 'typescript', path: filePath, metadata: { offset: match.index } });
    }
    while ((match = classRegex.exec(content)) !== null) {
      symbols.push({ id: `symbol:${filePath}:${match[1]}`, type: 'Class', label: match[1], language: 'typescript', path: filePath, metadata: { offset: match.index } });
    }
    return symbols;
  }

  extractRelationships(filePath, content, symbols) {
    return [];
  }

  resolveImports(filePath, content) {
    const edges = [];
    const importRegex = /import\s+.*\s+from\s+['"](.*)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      edges.push({ id: `edge:${filePath}->${importPath}`, source: `file:${filePath}`, target: importPath, type: 'IMPORTS', metadata: { path: importPath } });
    }
    return edges;
  }
}

class PythonAdapter {
  constructor() {
    this.name = 'Python';
    this.supportedExtensions = ['.py'];
  }

  detectFile(filePath, content) {
    const ext = path.extname(filePath);
    return this.supportedExtensions.includes(ext);
  }

  extractSymbols(filePath, content) {
    const symbols = [];
    const functionRegex = /def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
    const classRegex = /class\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*[:\(]/g;
    let match;
    while ((match = functionRegex.exec(content)) !== null) {
      symbols.push({ id: `symbol:${filePath}:${match[1]}`, type: 'Function', label: match[1], language: 'python', path: filePath, metadata: { offset: match.index } });
    }
    while ((match = classRegex.exec(content)) !== null) {
      symbols.push({ id: `symbol:${filePath}:${match[1]}`, type: 'Class', label: match[1], language: 'python', path: filePath, metadata: { offset: match.index } });
    }
    return symbols;
  }

  extractRelationships(filePath, content, symbols) {
    return [];
  }

  resolveImports(filePath, content) {
    const edges = [];
    const importRegex = /import\s+([a-zA-Z0-9_\.]+)/g;
    const fromImportRegex = /from\s+([a-zA-Z0-9_\.]+)\s+import/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      edges.push({ id: `edge:${filePath}->${match[1]}`, source: `file:${filePath}`, target: match[1], type: 'IMPORTS', metadata: { path: match[1] } });
    }
    while ((match = fromImportRegex.exec(content)) !== null) {
      edges.push({ id: `edge:${filePath}->${match[1]}`, source: `file:${filePath}`, target: match[1], type: 'IMPORTS', metadata: { path: match[1] } });
    }
    return edges;
  }
}

// --- ANALYSIS ENGINE ---

class AnalysisEngine {
  constructor(options) {
    this.options = options;
    this.adapters = options.adapters;
    this.graph = {
      nodes: new Map(),
      edges: new Map(),
      metadata: {
        rootPath: options.rootPath,
        analyzedAt: new Date().toISOString(),
        languages: [],
      },
    };
    this.stats = {
      filesDiscovered: 0,
      filesAnalyzed: 0,
      filesSkipped: 0,
      nodesGenerated: 0,
      edgesGenerated: 0,
      unresolvedImports: 0
    };
  }

  async analyze() {
    const files = await this.discoverFiles(this.options.rootPath);
    this.stats.filesDiscovered = files.length;

    const batchSize = this.options.concurrency || 5;
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      await Promise.all(batch.map(async (filePath) => {
        try {
          const stats = await fs.stat(filePath);
          if (stats.size > (this.options.maxFileSize || 5 * 1024 * 1024)) {
            this.stats.filesSkipped++;
            return;
          }

          const content = await fs.readFile(filePath, 'utf8');
          const adapter = this.findAdapterForFile(filePath, content);
          if (adapter) {
            await this.processFile(filePath, content, adapter);
            this.stats.filesAnalyzed++;
          } else {
            this.stats.filesSkipped++;
          }
        } catch (error) {
          this.stats.filesSkipped++;
          console.error(`Error analyzing file ${filePath}:`, error.message);
        }
      }));
    }

    return this.graph;
  }

  async discoverFiles(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (this.shouldIgnore(fullPath)) continue;
      if (entry.isDirectory()) {
        files.push(...await this.discoverFiles(fullPath));
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
    return files;
  }

  shouldIgnore(filePath) {
    const ignoreList = [
      'node_modules', '.git', 'dist', 'build', '.venv', 'venv', '__pycache__', 'coverage', '.idea', '.vscode'
    ];
    const patterns = this.options.ignorePatterns || [];
    return [...ignoreList, ...patterns].some(pattern => filePath.includes(pattern));
  }

  findAdapterForFile(filePath, content) {
    return this.adapters.find(adapter => adapter.detectFile(filePath, content));
  }

  async processFile(filePath, content, adapter) {
    const fileNode = {
      id: `file:${filePath}`,
      type: 'File',
      label: path.basename(filePath),
      path: filePath,
      metadata: { extension: path.extname(filePath) },
    };
    this.addNode(fileNode);

    const symbols = adapter.extractSymbols(filePath, content);
    for (const symbol of symbols) {
      this.addNode(symbol);
      this.addEdge({
        id: `edge:${fileNode.id}->${symbol.id}`,
        source: fileNode.id,
        target: symbol.id,
        type: 'DECLARES',
        metadata: {},
      });
    }

    const internalEdges = adapter.extractRelationships(filePath, content, symbols);
    for (const edge of internalEdges) {
      this.addEdge(edge);
    }

    const imports = adapter.resolveImports(filePath, content);
    for (const edge of imports) {
      const resolvedTarget = await this.resolveImportPath(filePath, edge.target);
      if (resolvedTarget) {
        this.addEdge({
          ...edge,
          target: `file:${resolvedTarget}`,
        });
      } else {
        this.stats.unresolvedImports++;
        this.addEdge(edge);
      }
    }
  }

  async resolveImportPath(sourceFile, importPath) {
    if (!importPath.startsWith('.')) return null;
    const dir = path.dirname(sourceFile);
    let fullPath = path.resolve(dir, importPath);

    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.py'];
    for (const ext of extensions) {
      try {
        await fs.access(fullPath + ext);
        return fullPath + ext;
      } catch {}
    }

    for (const ext of extensions) {
      try {
        await fs.access(path.join(fullPath, `index${ext}`));
        return path.join(fullPath, `index${ext}`);
      } catch {}
    }

    try {
      await fs.access(fullPath);
      return fullPath;
    } catch {
      return null;
    }
  }

  addNode(node) {
    this.graph.nodes.set(node.id, node);
    this.stats.nodesGenerated++;
  }

  addEdge(edge) {
    this.graph.edges.set(edge.id, edge);
    this.stats.edgesGenerated++;
  }
}

// --- CLI RUNNER ---

async function main() {
  const args = process.argv.slice(2);
  const targetDir = args[0] || '.';
  const outputPath = args[1] || 'graph.json';
  const absolutePath = path.resolve(process.cwd(), targetDir);

  const options = {
    rootPath: absolutePath,
    ignorePatterns: [],
    adapters: [new TypeScriptAdapter(), new PythonAdapter()],
    maxFileSize: 5 * 1024 * 1024, // 5MB
    concurrency: 4
  };

  console.log(`\nWeb66 Standalone Analysis\nProject: ${absolutePath}\n-----------------------------------\n`);

  const startTime = performance.now();
  const engine = new AnalysisEngine(options);

  console.log('[1/3] Analyzing project files...');
  const graph = await engine.analyze();

  const output = {
    metadata: {
      ...graph.metadata,
      stats: engine.stats,
      elapsedTime: `${((performance.now() - startTime) / 1000).toFixed(2)}s`
    },
    nodes: Array.from(graph.nodes.values()),
    edges: Array.from(graph.edges.values()),
  };

  console.log('[2/3] Writing graph.json...');
  await fs.writeFile(outputPath, JSON.stringify(output, null, 2));

  console.log('[3/3] Analysis Complete.');
  console.log(`\nAnalysis Statistics\n-----------------------------------\nFiles discovered:       ${engine.stats.filesDiscovered}\nFiles analyzed:         ${engine.stats.filesAnalyzed}\nFiles skipped:          ${engine.stats.filesSkipped}\nNodes generated:        ${engine.stats.nodesGenerated}\nEdges generated:        ${engine.stats.edgesGenerated}\nUnresolved imports:     ${engine.stats.unresolvedImports}\nElapsed time:           ${output.metadata.stats.elapsedTime}\nStatus:                 SUCCESS\n-----------------------------------`);
  console.log(`Output: ${outputPath}\n`);
}

main().catch(err => {
  console.error('❌ Analysis failed:', err);
  process.exit(1);
});
