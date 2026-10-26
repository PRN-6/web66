import * as fs from 'fs/promises';
import * as path from 'path';
export class AnalysisEngine {
    graph;
    adapters;
    options;
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
            // Simple glob-like check for now; can be improved with 'minimatch' or 'micromatch'
            return filePath.includes(pattern);
        });
    }
    findAdapterForFile(filePath, content) {
        return this.adapters.find(adapter => adapter.detectFile(filePath, content));
    }
    async processFile(filePath, content, adapter) {
        // Create File Node
        const fileNode = {
            id: `file:${filePath}`,
            type: 'File',
            label: path.basename(filePath),
            path: filePath,
            metadata: { extension: path.extname(filePath) },
        };
        this.addNode(fileNode);
        // Extract Symbols
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
        // Extract Internal Relationships
        const internalEdges = adapter.extractRelationships(filePath, content, symbols);
        for (const edge of internalEdges) {
            this.addEdge(edge);
        }
        // Resolve External Imports
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
                this.addEdge(edge); // Keep original if cannot resolve
            }
        }
    }
    async resolveImportPath(sourceFile, importPath) {
        if (!importPath.startsWith('.'))
            return null; // Only handle relative imports for now
        const dir = path.dirname(sourceFile);
        let fullPath = path.resolve(dir, importPath);
        // Try adding common extensions
        const extensions = ['.ts', '.tsx', '.js', '.jsx'];
        for (const ext of extensions) {
            try {
                await fs.access(fullPath + ext);
                return fullPath + ext;
            }
            catch { }
        }
        // Try as a directory with index file
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
}
this.graph.nodes.set(node.id, node);
addEdge(edge, GraphEdge);
void {
    this: .graph.edges.set(edge.id, edge),
};
