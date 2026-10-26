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
const core_1 = require("@web68/core");
const language_typescript_1 = require("@web68/language-typescript");
const language_python_1 = require("@web68/language-python");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
async function main() {
    const args = process.argv.slice(2);
    const targetDir = args[0] || '.';
    const outputPath = args[1] || 'graph.json';
    const absolutePath = path.resolve(process.cwd(), targetDir);
    console.log(`🚀 Web68 Analyzing: ${absolutePath}...`);
    const engine = new core_1.AnalysisEngine({
        rootPath: absolutePath,
        ignorePatterns: ['node_modules', '.git', 'dist', 'build'],
        adapters: [new language_typescript_1.TypeScriptAdapter(), new language_python_1.PythonAdapter()],
    });
    const graph = await engine.analyze();
    const output = {
        metadata: graph.metadata,
        nodes: Array.from(graph.nodes.values()),
        edges: Array.from(graph.edges.values()),
    };
    await fs.writeFile(outputPath, JSON.stringify(output, null, 2));
    console.log(`✅ Analysis complete! Graph saved to: ${outputPath}`);
    console.log(`📊 Summary: ${output.nodes.length} nodes, ${output.edges.length} edges.`);
}
main().catch(err => {
    console.error('❌ Analysis failed:', err);
    process.exit(1);
});
