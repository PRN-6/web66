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
exports.PythonAdapter = void 0;
const path = __importStar(require("path"));
class PythonAdapter {
    constructor() {
        this.name = 'Python';
        this.supportedExtensions = ['.py'];
    }
    detectFile(filePath, content) {
        return this.supportedExtensions.includes(path.extname(filePath));
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
        // Simple regex for Python functions and classes
        const functionRegex = /def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
        const classRegex = /class\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*[:\(]/g;
        let match;
        while ((match = functionRegex.exec(content)) !== null) {
            symbols.push(this.createSymbol(filePath, 'Function', match[1], match.index));
        }
        while ((match = classRegex.exec(content)) !== null) {
            symbols.push(this.createSymbol(filePath, 'Class', match[1], match.index));
        }
        return symbols;
    }
    extractRelationships(filePath, content, symbols) {
        return [];
    }
    resolveImports(filePath, content) {
        const edges = [];
        const importRegex = /import\s+([a-zA-Z0-9_\.]+)/g;
        const fromImportRegex = /from\s+([a-zA-Z0-9_\.]+)\s+import/g;
        let match;
        while ((match = importRegex.exec(content)) !== null) {
            edges.push({
                id: `edge:${filePath}->${match[1]}`,
                source: `file:${filePath}`,
                target: match[1],
                type: 'IMPORTS',
                metadata: { path: match[1] },
            });
        }
        while ((match = fromImportRegex.exec(content)) !== null) {
            edges.push({
                id: `edge:${filePath}->${match[1]}`,
                source: `file:${filePath}`,
                target: match[1],
                type: 'IMPORTS',
                metadata: { path: match[1] },
            });
        }
        return edges;
    }
    createSymbol(filePath, type, name, offset) {
        return {
            id: `symbol:${filePath}:${name}`,
            type: type,
            label: name,
            language: 'python',
            path: filePath,
            location: {
                start: { line: 0, column: 0 },
                end: { line: 0, column: 0 },
            },
            metadata: { offset },
        };
    }
}
exports.PythonAdapter = PythonAdapter;
