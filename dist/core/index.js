"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalysisEngine = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
class AnalysisEngine {
    constructor(options) {
        this.options = options;
        this.adapters = options.adapters;
        this.graph = {
            nodes: new Map(),
            edges: new Map(),
            metadata: {
                rootPath: options.rootPath,
                analyzedAt: new Date().toISOString(),
                languages: [],
            },
        };
    }
    async analyze() {
        const files = await this.discoverFiles(this.options.rootPath);
        for (const filePath of files) {
            try {
                const content = await fs.readFile(filePath, 'utf8');
                const adapter = this.findAdapterForFile(filePath, content);
                if (adapter) {
                    await this.processFile(filePath, content, adapter);
                }
            }
            catch (error) {
                console.error(`Error analyzing file ${filePath}:`, error);
            }
        }
        return this.graph;
    }
    async discoverFiles(dir) {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        const files = [];
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (this.shouldIgnore(fullPath))
                continue;
            if (entry.isDirectory()) {
                files.push(...await this.discoverFiles(fullPath));
            }
            else if (entry.isFile()) {
                files.push(fullPath);
            }
        }
        return files;
    }
    shouldIgnore(filePath) {
        return this.options.ignorePatterns.some(pattern => {
            return filePath.includes(pattern);
        });
    }
    findAdapterForFile(filePath, content) {
        return this.adapters.find(adapter => adapter.detectFile(filePath, content));
    }
    async processFile(filePath, content, adapter) {
        const fileNode = {
            id: `file:${filePath}`,
            type: 'File',
            label: path.basename(filePath),
            path: filePath,
            metadata: { extension: path.extname(filePath) },
        };
        this.addNode(fileNode);
        const symbols = adapter.extractSymbols(filePath, content);
        for (const symbol of symbols) {
            this.addNode(symbol);
            this.addEdge({
                id: `edge:${fileNode.id}->${symbol.id}`,
                source: fileNode.id,
                target: symbol.id,
                type: 'DECLARES',
                metadata: {},
            });
        }
        const internalEdges = adapter.extractRelationships(filePath, content, symbols);
        for (const edge of internalEdges) {
            this.addEdge(edge);
        }
        const imports = adapter.resolveImports(filePath, content);
        for (const edge of imports) {
            const resolvedTarget = await this.resolveImportPath(filePath, edge.target);
            if (resolvedTarget) {
                this.addEdge({
                    ...edge,
                    target: `file:${resolvedTarget}`,
                });
            }
            else {
                this.addEdge(edge);
            }
        }
    }
    async resolveImportPath(sourceFile, importPath) {
        if (!importPath.startsWith('.'))
            return null;
        const dir = path.dirname(sourceFile);
        let fullPath = path.resolve(dir, importPath);
        const extensions = ['.ts', '.tsx', '.js', '.jsx'];
        for (const ext of extensions) {
            try {
                await fs.access(fullPath + ext);
                return fullPath + ext;
            }
            catch { }
        }
        for (const ext of extensions) {
            try {
                await fs.access(path.join(fullPath, `index${ext}`));
                return path.join(fullPath, `index${ext}`);
            }
            catch { }
        }
        try {
            await fs.access(fullPath);
            return fullPath;
        }
        catch {
            return null;
        }
    }
    addNode(node) {
        this.graph.nodes.set(node.id, node);
    }
    addEdge(edge) {
        this.graph.edges.set(edge.id, edge);
    }
}
exports.AnalysisEngine = AnalysisEngine;
