import * as path from 'path';
export class TypeScriptAdapter {
    name = 'TypeScript';
    supportedExtensions = ['.ts', '.tsx', '.js', '.jsx'];
    detectFile(filePath, content) {
        const ext = path.extname(filePath);
        return this.supportedExtensions.includes(ext);
    }
    getCapabilities() {
        return {
            canResolveImports: true,
            canExtractSymbols: true,
            canResolveCalls: false,
            canAnalyzeInheritance: false,
            canAnalyzeTypes: false,
        };
    }
    extractSymbols(filePath, content) {
        const symbols = [];
        // Simple regex-based extraction for the first vertical slice.
        // In a real implementation, this would use Tree-sitter.
        const functionRegex = /(?:async\s+)?function\s+([a-zA-Z0-9_]+)\s*\(/g;
        const constFunctionRegex = /const\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?\(.*\)\s*=>/g;
        const classRegex = /class\s+([a-zA-Z0-9_]+)\s*\{/g;
        let match;
        // Match standard functions
        while ((match = functionRegex.exec(content)) !== null) {
            symbols.push(this.createSymbol(filePath, 'Function', match[1], match.index));
        }
        // Match arrow functions
        while ((match = constFunctionRegex.exec(content)) !== null) {
            symbols.push(this.createSymbol(filePath, 'Function', match[1], match.index));
        }
        // Match classes
        while ((match = classRegex.exec(content)) !== null) {
            symbols.push(this.createSymbol(filePath, 'Class', match[1], match.index));
        }
        return symbols;
    }
    extractRelationships(filePath, content, symbols) {
        const edges = [];
        // Internal relationships logic would go here
        return edges;
    }
    resolveImports(filePath, content) {
        const edges = [];
        const importRegex = /import\s+.*\s+from\s+['"](.*)['"]/g;
        let match;
        while ((match = importRegex.exec(content)) !== null) {
            const importPath = match[1];
            edges.push({
                id: `edge:${filePath}->${importPath}`,
                source: `file:${filePath}`,
                target: `file:${importPath}`, // Simple target; resolution logic needed for real paths
                type: 'IMPORTS',
                metadata: { path: importPath },
            });
        }
        return edges;
    }
    createSymbol(filePath, type, name, offset) {
        return {
            id: `symbol:${filePath}:${name}`,
            type: type,
            label: name,
            language: 'typescript',
            path: filePath,
            location: {
                start: { line: 0, column: 0 }, // Simplified for now
                end: { line: 0, column: 0 },
            },
            metadata: { offset },
        };
    }
}
