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
exports.TypeScriptAdapter = void 0;
const path = __importStar(require("path"));
class TypeScriptAdapter {
    constructor() {
        this.name = 'TypeScript';
        this.supportedExtensions = ['.ts', '.tsx', '.js', '.jsx'];
    }
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
exports.TypeScriptAdapter = TypeScriptAdapter;
