import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import chokidar from 'chokidar';
import path from 'path';
import { AnalysisEngine } from './index';
import { TypeScriptAdapter } from '@web68/language-typescript';
import { PythonAdapter } from '@web68/language-python';

const PORT = 3001;
const PROJECT_ROOT = process.env.WEB68_PROJECT_PATH || path.join(process.cwd(), '..', '..', 'tests', 'demo-project');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});

const engine = new AnalysisEngine({
  rootPath: PROJECT_ROOT,
  ignorePatterns: ['node_modules', '.git', 'dist', 'build'],
  adapters: [new TypeScriptAdapter(), new PythonAdapter()],
});

async function broadcastGraph() {
  console.log('🔄 Re-analyzing project for live update...');
  const graph = await engine.analyze();

  const payload = {
    metadata: graph.metadata,
    nodes: Array.from(graph.nodes.values()),
    edges: Array.from(graph.edges.values()),
  };

  io.emit('graph-update', payload);
  console.log('🚀 Graph pushed to clients.');
}

// Initialize file watcher
chokidar.watch(PROJECT_ROOT, {
  ignored: /(^|[\/\\])\.(git|node_modules|dist|build)([\/\\]|$)/,
  persistent: true
}).on('all', (event, filePath) => {
  console.log(`📄 File change detected [${event}]: ${filePath}`);
  broadcastGraph();
});

io.on('connection', (socket) => {
  console.log('💻 Client connected');
  broadcastGraph(); // Send current graph on connection
});

httpServer.listen(PORT, () => {
  console.log(`
🌟 Web68 Live Server running!
-----------------------------------
Watching: ${PROJECT_ROOT}
Socket:   http://localhost:${PORT}
Frontend: http://localhost:5173
-----------------------------------
  `);
});
