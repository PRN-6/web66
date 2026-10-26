import { AnalysisEngine, AnalysisOptions } from '@web68/core';
import { TypeScriptAdapter } from '@web68/language-typescript';
import { PythonAdapter } from '@web68/language-python';
import * as fs from 'fs/promises';
import * as path from 'path';

async function main() {
  const args = process.argv.slice(2);
  const targetDir = args[0] || '.';
  const outputPath = args[1] || 'graph.json';

  const absolutePath = path.resolve(process.cwd(), targetDir);

  console.log(`🚀 Web68 Analyzing: ${absolutePath}...`);

  const engine = new AnalysisEngine({
    rootPath: absolutePath,
    ignorePatterns: ['node_modules', '.git', 'dist', 'build'],
    adapters: [new TypeScriptAdapter(), new PythonAdapter()],
  });

  const graph = await engine.analyze();

  const output = {
    metadata: graph.metadata,
    nodes: Array.from(graph.nodes.values()),
    edges: Array.from(graph.edges.values()),
  };

  await fs.writeFile(outputPath, JSON.stringify(output, null, 2));
  console.log(`✅ Analysis complete! Graph saved to: ${outputPath}`);
  console.log(`📊 Summary: ${output.nodes.length} nodes, ${output.edges.length} edges.`);
}

main().catch(err => {
  console.error('❌ Analysis failed:', err);
  process.exit(1);
});
