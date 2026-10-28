import { AnalysisEngine } from '@web66/core';
import { TypeScriptAdapter } from '@web66/language-typescript';
import * as path from 'path';

async function runTest() {
  const rootPath = path.join(process.cwd(), 'tests/fixtures');

  const engine = new AnalysisEngine({
    rootPath: rootPath,
    ignorePatterns: ['node_modules'],
    adapters: [new TypeScriptAdapter()],
  });

  console.log('Analyzing project...');
  const graph = await engine.analyze();

  console.log('Nodes found:', graph.nodes.size);
  for (const [id, node] of graph.nodes) {
    console.log(`Node: ${id} [${node.type}] - ${node.label}`);
  }

  console.log('Edges found:', graph.edges.size);
  for (const [id, edge] of graph.edges) {
    console.log(`Edge: ${id} (${edge.type}) ${edge.source} -> ${edge.target}`);
  }
}

runTest().catch(console.error);
