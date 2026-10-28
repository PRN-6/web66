const path = require('path');
const fs = require('fs').promises;
const { AnalysisEngine } = require('../packages/core/engine');

async function testPython() {
  const tmpDir = path.resolve(__dirname, 'demo-python-project');
  await fs.mkdir(path.join(tmpDir, 'pkg'), { recursive: true });

  await fs.writeFile(path.join(tmpDir, 'app.py'), `
from pkg.service import UserService
import utils

def start_server():
    print("Starting server")

class Application:
    def run(self):
        pass
`);

  await fs.writeFile(path.join(tmpDir, 'utils.py'), `
def log_message(msg):
    print(msg)
`);

  await fs.writeFile(path.join(tmpDir, 'pkg', '__init__.py'), '');
  await fs.writeFile(path.join(tmpDir, 'pkg', 'service.py'), `
class UserService:
    def get_user(self, user_id):
        return {"id": user_id}
`);

  const engine = new AnalysisEngine({ rootPath: tmpDir });
  const result = await engine.analyze();

  console.log(`Discovered ${result.nodes.length} nodes and ${result.edges.length} edges.`);
  console.log(`Root Node: ${result.metadata.rootNodeId}`);

  const hasApp = result.nodes.some(n => n.label === 'app.py');
  const hasFn = result.nodes.some(n => n.label === 'start_server()');
  const hasClass = result.nodes.some(n => n.label === 'class Application');
  const hasUserService = result.nodes.some(n => n.label === 'class UserService');
  const hasUtilsImport = result.edges.some(e => e.type === 'IMPORTS' && e.target.includes('utils.py'));
  const hasPkgImport = result.edges.some(e => e.type === 'IMPORTS' && e.target.includes('service.py'));

  if (hasApp && hasFn && hasClass && hasUserService && hasUtilsImport && hasPkgImport) {
    console.log('✅ Python parsing test passed 100%!');
  } else {
    console.error('❌ Python parsing test failed verification');
    process.exit(1);
  }

  // Cleanup
  await fs.rm(tmpDir, { recursive: true, force: true });
}

testPython().catch(e => {
  console.error(e);
  process.exit(1);
});
