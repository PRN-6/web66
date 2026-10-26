import { ProjectGraph, GraphNode, GraphEdge } from '@web68/graph-schema';
import { LanguageAdapter } from '@web68/parser-engine';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface AnalysisOptions {
  rootPath: string;
  ignorePatterns: string[];
  adapters: LanguageAdapter[];
}

export class AnalysisEngine {
  private graph: ProjectGraph;
  private adapters: LanguageAdapter[];
  private options: AnalysisOptions;

  constructor(options: AnalysisOptions) {
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
  }

  async analyze(): Promise<ProjectGraph> {
    const files = await this.discoverFiles(this.options.rootPath);

    for (const filePath of files) {
      try {
        const content = await fs.readFile(filePath, 'utf8');
        const adapter = this.findAdapterForFile(filePath, content);

        if (adapter) {
          await this.processFile(filePath, content, adapter);
        }
      } catch (error) {
        console.error(`Error analyzing file ${filePath}:`, error);
      }
    }

    return this.graph;
  }

  private async discoverFiles(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files: string[] = [];

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

  private shouldIgnore(filePath: string): boolean {
    return this.options.ignorePatterns.some(pattern => {
      return filePath.includes(pattern);
    });
  }

  private findAdapterForFile(filePath: string, content: string): LanguageAdapter | undefined {
    return this.adapters.find(adapter => adapter.detectFile(filePath, content));
  }

  private async processFile(filePath: string, content: string, adapter: LanguageAdapter): Promise<void> {
    const fileNode: GraphNode = {
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
        this.addEdge(edge);
      }
    }
  }

  private async resolveImportPath(sourceFile: string, importPath: string): Promise<string | null> {
    if (!importPath.startsWith('.')) return null;

    const dir = path.dirname(sourceFile);
    let fullPath = path.resolve(dir, importPath);

    const extensions = ['.ts', '.tsx', '.js', '.jsx'];
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

  addNode(node: GraphNode): void {
    this.graph.nodes.set(node.id, node);
  }

  addEdge(edge: GraphEdge): void {
    this.graph.edges.set(edge.id, edge);
  }
}
