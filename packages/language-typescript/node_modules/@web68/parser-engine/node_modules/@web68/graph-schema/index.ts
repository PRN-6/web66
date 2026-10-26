export type NodeType =
  | 'Repository'
  | 'Directory'
  | 'File'
  | 'Module'
  | 'Namespace'
  | 'Package'
  | 'Class'
  | 'Interface'
  | 'Function'
  | 'Method'
  | 'Variable'
  | 'Constant'
  | 'Type'
  | 'Enum'
  | 'Import'
  | 'Export';

export type RelationType =
  | 'CONTAINS'
  | 'IMPORTS'
  | 'EXPORTS'
  | 'CALLS'
  | 'EXTENDS'
  | 'IMPLEMENTS'
  | 'REFERENCES'
  | 'DECLARES'
  | 'DEPENDS_ON'
  | 'RE_EXPORTS'
  | 'TYPE_DEPENDS_ON';

export interface GraphNode {
  id: string; // Deterministic ID
  type: NodeType;
  label: string;
  language?: string;
  path?: string;
  location?: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
  metadata: Record<string, any>;
}

export interface GraphEdge {
  id: string;
  source: string; // Node ID
  target: string; // Node ID
  type: RelationType;
  evidence?: string; // Snippet or reason
  metadata: Record<string, any>;
}

export interface ProjectGraph {
  nodes: Map<string, GraphNode>;
  edges: Map<string, GraphEdge>;
  metadata: {
    rootPath: string;
    analyzedAt: string;
    languages: string[];
  };
}
