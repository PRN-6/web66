import { LanguageAdapter, AdapterCapabilities } from '@web68/parser-engine';
import { GraphNode, GraphEdge } from '@web68/graph-schema';
import * as path from 'path';

export class PythonAdapter implements LanguageAdapter {
  readonly name = 'Python';
  readonly supportedExtensions = ['.py'];

  detectFile(filePath: string, content: string): boolean {
    return this.supportedExtensions.includes(path.extname(filePath));
  }

  getCapabilities(): AdapterCapabilities {
    return {
      canResolveImports: true,
      canExtractSymbols: true,
      canResolveCalls: false,
      canAnalyzeInheritance: false,
      canAnalyzeTypes: false,
    };
  }

  extractSymbols(filePath: string, content: string): GraphNode[] {
    const symbols: GraphNode[] = [];

    // Simple regex for Python functions and classes
    const functionRegex = /def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
    const classRegex = /class\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*[:\(]/g;

    let match;
    while ((match = functionRegex.exec(content)) !== null) {
      symbols.push(this.createSymbol(filePath, 'Function', match[1], match.index));
    }
    while ((match = classRegex.exec(content)) !== null) {
      symbols.push(this.createSymbol(filePath, 'Class', match[1], match.index));
    }

    return symbols;
  }

  extractRelationships(filePath: string, content: string, symbols: GraphNode[]): GraphEdge[] {
    return [];
  }

  resolveImports(filePath: string, content: string): GraphEdge[] {
    const edges: GraphEdge[] = [];
    const importRegex = /import\s+([a-zA-Z0-9_\.]+)/g;
    const fromImportRegex = /from\s+([a-zA-Z0-9_\.]+)\s+import/g;

    let match;
    while ((match = importRegex.exec(content)) !== null) {
      edges.push({
        id: `edge:${filePath}->${match[1]}`,
        source: `file:${filePath}`,
        target: match[1],
        type: 'IMPORTS',
        metadata: { path: match[1] },
      });
    }
    while ((match = fromImportRegex.exec(content)) !== null) {
      edges.push({
        id: `edge:${filePath}->${match[1]}`,
        source: `file:${filePath}`,
        target: match[1],
        type: 'IMPORTS',
        metadata: { path: match[1] },
      });
    }

    return edges;
  }

  private createSymbol(filePath: string, type: 'Function' | 'Class', name: string, offset: number): GraphNode {
    return {
      id: `symbol:${filePath}:${name}`,
      type: type,
      label: name,
      language: 'python',
      path: filePath,
      location: {
        start: { line: 0, column: 0 },
        end: { line: 0, column: 0 },
      },
      metadata: { offset },
    };
  }
}
