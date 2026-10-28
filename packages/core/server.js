const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');
const { AnalysisEngine } = require('./engine');

class Web68Server {
  constructor(options = {}) {
    this.projectPath = path.resolve(options.projectPath || '.');
    this.port = parseInt(options.port || 6868, 10);
    this.openBrowser = options.openBrowser !== false;
    this.clientDir = path.resolve(__dirname, '..', 'viewer', 'client');

    this.engine = new AnalysisEngine({ rootPath: this.projectPath });
    this.currentGraph = null;
    this.wsClients = new Set();
    this.debounceTimer = null;
    this.httpServer = null;
    this.watcher = null;
  }

  async start() {
    // 1. Initial Analysis
    console.log(`\n🚀 Analyzing codebase: ${this.projectPath}...`);
    const startTime = Date.now();
    this.currentGraph = await this.engine.analyze();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Discovered ${this.currentGraph.nodes.length} nodes & ${this.currentGraph.edges.length} edges in ${duration}s.`);
    if (this.currentGraph.metadata.rootNodeId) {
      console.log(`🌟 Central Core Node: ${this.currentGraph.metadata.rootNodeId}`);
    }

    // 2. HTTP Server
    this.httpServer = http.createServer((req, res) => {
      this.handleHttpRequest(req, res);
    });

    // 3. Native WebSocket Upgrade
    this.httpServer.on('upgrade', (req, socket, head) => {
      this.handleWebSocketUpgrade(req, socket, head);
    });

    // 4. File Watcher
    this.startWatcher();

    // 5. Listen
    return new Promise((resolve, reject) => {
      this.httpServer.listen(this.port, () => {
        const url = `http://localhost:${this.port}`;
        console.log(`
🌌 Web68 Cosmic Intelligence is LIVE!
--------------------------------------------------
🔭 Target:    ${this.projectPath}
🌐 Cosmos:    ${url}
⚡ Live Sync: Active (watching file changes)
--------------------------------------------------
Press Ctrl+C to terminate.
        `);

        if (this.openBrowser) {
          this.launchBrowser(url);
        }

        resolve({ url, port: this.port });
      }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.error(`❌ Port ${this.port} is already in use. Try passing --port <another-port>.`);
        }
        reject(err);
      });
    });
  }

  handleHttpRequest(req, res) {
    const parsedUrl = new URL(req.url, `http://localhost:${this.port}`);
    const pathname = parsedUrl.pathname;

    // API endpoint for graph JSON
    if (pathname === '/api/graph') {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      return res.end(JSON.stringify(this.currentGraph));
    }

    // Serve static files from packages/viewer/client
    let filePath = path.join(this.clientDir, pathname === '/' ? 'index.html' : pathname);

    // Prevent directory traversal
    if (!filePath.startsWith(this.clientDir)) {
      res.writeHead(403);
      return res.end('Forbidden');
    }

    fs.readFile(filePath, (err, content) => {
      if (err) {
        // Fallback to index.html for SPA routing
        fs.readFile(path.join(this.clientDir, 'index.html'), (fallbackErr, fallbackContent) => {
          if (fallbackErr) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            return res.end('File not found');
          }
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(fallbackContent);
        });
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = {
        '.html': 'text/html; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.png': 'image/png',
        '.svg': 'image/svg+xml'
      };

      res.writeHead(200, {
        'Content-Type': mimeTypes[ext] || 'application/octet-stream',
        'Cache-Control': 'no-cache'
      });
      res.end(content);
    });
  }

  handleWebSocketUpgrade(req, socket, head) {
    const key = req.headers['sec-websocket-key'];
    if (!key) {
      socket.destroy();
      return;
    }

    const acceptKey = crypto
      .createHash('sha1')
      .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
      .digest('base64');

    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${acceptKey}\r\n\r\n`
    );

    this.wsClients.add(socket);

    socket.on('close', () => {
      this.wsClients.delete(socket);
    });

    socket.on('error', () => {
      this.wsClients.delete(socket);
    });

    // Send initial graph immediately upon connection
    if (this.currentGraph) {
      this.sendWebSocketMessage(socket, {
        type: 'graph-update',
        data: this.currentGraph
      });
    }
  }

  sendWebSocketMessage(socket, data) {
    try {
      const payload = Buffer.from(JSON.stringify(data));
      const len = payload.length;
      let header;

      if (len < 126) {
        header = Buffer.from([0x81, len]);
      } else if (len < 65536) {
        header = Buffer.alloc(4);
        header[0] = 0x81;
        header[1] = 126;
        header.writeUInt16BE(len, 2);
      } else {
        header = Buffer.alloc(10);
        header[0] = 0x81;
        header[1] = 127;
        header.writeBigUInt64BE(BigInt(len), 2);
      }

      socket.write(Buffer.concat([header, payload]));
    } catch (e) {
      this.wsClients.delete(socket);
    }
  }

  broadcast(message) {
    for (const client of this.wsClients) {
      this.sendWebSocketMessage(client, message);
    }
  }

  startWatcher() {
    try {
      this.watcher = fs.watch(this.projectPath, { recursive: true }, (eventType, filename) => {
        if (!filename) return;

        // Ignore common build & version control files
        const ignored = [
          'node_modules', '.git', 'dist', 'build', '.next', '.cache',
          'package-lock.json', 'pnpm-lock.yaml', 'graph.json'
        ];

        const norm = filename.replace(/\\/g, '/');
        if (ignored.some(ig => norm.includes(ig))) return;

        const ext = path.extname(filename).toLowerCase();
        if (!['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.json'].includes(ext)) {
          return;
        }

        // Debounce file changes
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(async () => {
          console.log(`🔄 Change detected [${eventType}]: ${filename} — updating cosmic web...`);
          try {
            this.currentGraph = await this.engine.analyze();
            this.broadcast({
              type: 'graph-update',
              data: this.currentGraph
            });
            console.log(`✨ Live update broadcast to ${this.wsClients.size} connected cosmos client(s).`);
          } catch (e) {
            console.error('Error re-analyzing graph:', e);
          }
        }, 180);
      });
    } catch (e) {
      console.warn('File watcher failed to initialize:', e.message);
    }
  }

  launchBrowser(url) {
    const plat = process.platform;
    let cmd = '';
    if (plat === 'win32') {
      cmd = `start "" "${url}"`;
    } else if (plat === 'darwin') {
      cmd = `open "${url}"`;
    } else {
      cmd = `xdg-open "${url}"`;
    }

    exec(cmd, (err) => {
      // Ignore background exec warnings
    });
  }

  stop() {
    if (this.watcher) this.watcher.close();
    if (this.httpServer) this.httpServer.close();
  }
}

module.exports = { Web68Server };
