const { AnalysisEngine } = require('../packages/core/engine');
const path = require('path');

async function runTest() {
  const rootPath = path.join(__dirname, 'demo-project');
  console.log('Testing AnalysisEngine on:', rootPath);

  const engine = new AnalysisEngine({
    rootPath: rootPath,
    ignorePatterns: ['node_modules']
  });

  const graph = await engine.analyze();
  console.log(`✅ Discovered ${graph.nodes.length} nodes and ${graph.edges.length} edges.`);
  console.log(`🌟 Root Entry: ${graph.metadata.rootNodeId}`);

  if (graph.nodes.length < 3) {
    throw new Error('Expected at least 3 nodes in demo project');
  }

  console.log('🎉 Test passed successfully!');
}

runTest().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
