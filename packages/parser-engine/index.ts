import { GraphNode, GraphEdge, ProjectGraph } from '@web68/graph-schema';

export interface LanguageAdapter {
  readonly name: string;
  readonly supportedExtensions: string[];

  /** Detect if a file is supported by this adapter */
  detectFile(filePath: string, content: string): boolean;

  /** Extract symbols from the source code */
  extractSymbols(filePath: string, content: string): GraphNode[];

  /** Extract relationships between symbols within the file */
  extractRelationships(filePath: string, content: string, symbols: GraphNode[]): GraphEdge[];

  /** Resolve imports/dependencies from the file */
  resolveImports(filePath: string, content: string): GraphEdge[];

  /** Report capabilities of this adapter */
  getCapabilities(): AdapterCapabilities;
}

export interface AdapterCapabilities {
  canResolveImports: boolean;
  canExtractSymbols: boolean;
  canResolveCalls: boolean;
  canAnalyzeInheritance: boolean;
  canAnalyzeTypes: boolean;
}
