import * as path from 'path';
const { Web66Server } = require('../core/server');

async function main() {
  const args = process.argv.slice(2);
  let targetDir = '.';
  let port = 6868;
  let openBrowser = true;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '-p' || arg === '--port') {
      port = parseInt(args[++i], 10) || 6868;
    } else if (arg === '--no-open') {
      openBrowser = false;
    } else if (!arg.startsWith('-')) {
      targetDir = arg;
    }
  }

  const absolutePath = path.resolve(process.cwd(), targetDir);
  const server = new Web66Server({
    projectPath: absolutePath,
    port: port,
    openBrowser: openBrowser
  });

  await server.start();
}

main().catch(err => {
  console.error('❌ Server failed:', err);
  process.exit(1);
});
