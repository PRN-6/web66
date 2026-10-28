#!/usr/bin/env node

const path = require('path');
const { Web68Server } = require('../packages/core/server');

function printHelp() {
  console.log(`
🌌 Web68 — Universal Codebase Intelligence & Cosmic Visualizer

Usage:
  npx web68 [directory] [options]

Arguments:
  [directory]       Target project path to analyze and visualize (default: current directory)

Options:
  -p, --port <port> Port to run local server and visualizer on (default: 6868)
  --no-open         Do not automatically open the default web browser
  -h, --help        Show this help message
  -v, --version     Display Web68 version

Examples:
  npx web68
  npx web68 ./src --port 3000
  npx web68 ../another-app --no-open
  `);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('-h') || args.includes('--help')) {
    printHelp();
    process.exit(0);
  }

  if (args.includes('-v') || args.includes('--version')) {
    const pkg = require('../package.json');
    console.log(`Web68 v${pkg.version || '1.0.0'}`);
    process.exit(0);
  }

  let projectPath = '.';
  let port = 6868;
  let openBrowser = true;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '-p' || arg === '--port') {
      port = parseInt(args[++i], 10) || 6868;
    } else if (arg === '--no-open') {
      openBrowser = false;
    } else if (!arg.startsWith('-')) {
      projectPath = arg;
    }
  }

  const server = new Web68Server({
    projectPath: path.resolve(process.cwd(), projectPath),
    port: port,
    openBrowser: openBrowser
  });

  try {
    await server.start();
  } catch (err) {
    console.error('❌ Failed to start Web68 server:', err.message);
    process.exit(1);
  }
}

main();
