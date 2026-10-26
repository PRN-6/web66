import React, { useState, useEffect, useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  ConnectionLineType,
  Panel,
  useNodesState,
  useEdgesState,
  reactFlowInstance
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Search, FileCode, Box, Zap, Wifi } from 'lucide-react';
import { io } from 'socket.io-client';

// --- Types ---
interface Web68Node extends Node {
  data: {
    label: string;
    type: string;
    details?: any;
  };
}

interface Web68Edge extends Edge {
  data: {
    type: string;
  };
}

interface ProjectGraph {
  metadata: any;
  nodes: any[];
  edges: any[];
}

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Web68Node | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { fitView } = reactFlowInstance || { fitView: () => {} }; // Fallback if instance isn't ready

  useEffect(() => {
    const socket = io('http://localhost:3001');

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('🌐 Connected to Web68 Server');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('graph-update', (graph: ProjectGraph) => {
      console.log('🚀 Received Live Graph Update:', graph);

      if (!graph.nodes || graph.nodes.length === 0) {
        console.warn('⚠️ Received empty graph');
        return;
      }

      // Transform Web68 Graph Nodes to React Flow Nodes
      const rfNodes: Web68Node[] = graph.nodes.map((n, index) => {
        // Find existing node to preserve position
        const existing = nodes.find(node => node.id === n.id);
        return {
          id: n.id,
          type: 'default',
          // Spread nodes out more significantly to avoid overlap
          position: existing ? existing.position : {
            x: Math.random() * 1000 - 500,
            y: Math.random() * 1000 - 500
          },
          data: { label: n.label, type: n.type, details: n.metadata },
        };
      });

      const rfEdges: Web68Edge[] = graph.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.type,
        data: { type: e.type },
      }));

      setNodes(rfNodes);
      setEdges(rfEdges);
    });

    return () => {
      socket.disconnect();
    };
  }, [nodes]);

  // Handle manual file upload for those not using the live server
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const graph: ProjectGraph = JSON.parse(e.target?.result as string);
        console.log('📁 Loaded graph from file:', graph);

        const rfNodes: Web68Node[] = graph.nodes.map((n, index) => ({
          id: n.id,
          type: 'default',
          position: { x: index * 150, y: index * 50 },
          data: { label: n.label, type: n.type, details: n.metadata },
        }));

        const rfEdges: Web68Edge[] = graph.edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          label: e.type,
          data: { type: e.type },
        }));

        setNodes(rfNodes);
        setEdges(rfEdges);
      } catch (err) {
        alert('Error parsing JSON');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="w-full h-screen bg-slate-900 text-slate-100 flex overflow-hidden">
      {/* Left Sidebar */}
      <div className="w-64 bg-slate-800 border-r border-slate-700 flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Zap className="text-yellow-400" size={20} />
            Web68 <span className={`text-[10px] px-1 rounded ${isConnected ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>LIVE</span>
          </h1>
        </div>

        <div className="p-4">
          <label className="flex items-center justify-center gap-2 w-full py-2 px-4 bg-blue-600 hover:bg-blue-500 rounded cursor-pointer text-sm font-medium transition-colors">
            <Upload size={16} />
            Load Graph JSON
            <input type="file" accept=".json" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 mb-2">
            Project Files
          </div>
          <div className="space-y-1">
            {nodes.filter(n => n.data.type === 'File').map(node => (
              <div
                key={node.id}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-slate-700 cursor-pointer text-sm"
                onClick={() => setSelectedNode(node)}
              >
                <FileCode size={14} className="text-blue-400" />
                {node.data.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Graph Area */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={(_, node) => setSelectedNode(node as Web68Node)}
          connectionLineType={ConnectionLineType.SmoothStep}
          fitView
        >
          <Background color="#334155" gap={20} />
          <Controls />
          <MiniMap nodeColor="#1e293b" nodeStrokeColor="#475569" />

          <Panel position="top-right" className="bg-slate-800 p-2 rounded border border-slate-700 text-xs">
            Nodes: {nodes.length} | Edges: {edges.length}
          </Panel>
        </ReactFlow>
      </div>

      {/* Right Sidebar: Inspector */}
      <div className="w-80 bg-slate-800 border-l border-slate-700 flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <h2 className="font-bold flex items-center gap-2">
            <Box size={18} />
            Inspector
          </h2>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          {selectedNode ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-500 uppercase">Type</label>
                <div className="text-sm font-medium">{selectedNode.data.type}</div>
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase">Label</label>
                <div className="text-sm font-medium">{selectedNode.data.label}</div>
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase">ID</label>
                <div className="text-xs font-mono text-slate-400 break-all">{selectedNode.id}</div>
              </div>
              <div className="pt-4 border-t border-slate-700">
                <label className="text-xs text-slate-500 uppercase">Details</label>
                <div className="mt-2 p-2 bg-slate-900 rounded text-xs font-mono text-slate-300 overflow-x-auto">
                  <pre>{JSON.stringify(selectedNode.data.details || {}, null, 2)}</pre>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm text-center p-8">
              Select a node in the graph to inspect its properties.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Add the Upload icon import which was missing in previous turn
import { Upload } from 'lucide-react';
