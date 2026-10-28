import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Handle,
  Position,
  NodeProps,
} from 'reactflow';
import 'reactflow/dist/style.css';
import './App.css';
import { Search, FileCode, Box, Zap, Upload, Orbit, Layers, Sparkles } from 'lucide-react';
import { io } from 'socket.io-client';

// --- Custom Organic Blob Node Component ---
function BlobNodeComponent({ data, selected }: NodeProps) {
  const isRoot = data.isRoot;
  const type = data.type || 'File';

  let blobClass = 'blob-file';
  let size = 64;

  if (isRoot) {
    blobClass = 'blob-root';
    size = 84;
  } else if (type === 'Function') {
    blobClass = 'blob-function';
    size = 52;
  } else if (type === 'Class') {
    blobClass = 'blob-class';
    size = 58;
  } else if (type === 'Type') {
    blobClass = 'blob-type';
    size = 48;
  }

  return (
    <div
      className={`cosmic-blob-node ${blobClass} ${selected ? 'selected' : ''}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <Handle type="source" position={Position.Bottom} className="opacity-0" />

      {isRoot && <div className="blob-halo" />}

      <div className="text-center font-bold text-xs truncate px-2 select-none">
        {isRoot ? '🌟' : type === 'Function' ? 'ƒ' : type === 'Class' ? 'C' : '📄'}
      </div>

      {/* Floating Label Underneath */}
      <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-950/80 border border-white/10 px-2 py-0.5 rounded-full text-[11px] font-semibold text-slate-200 pointer-events-none shadow-lg">
        {data.label}
      </div>
    </div>
  );
}

// --- Layout Calculator: Radial Web ---
function computeRadialWeb(rawNodes: any[], rawEdges: any[], rootId?: string) {
  if (!rawNodes || rawNodes.length === 0) return [];

  const root = rawNodes.find((n) => n.id === rootId || n.isRoot || n.label === 'main.ts' || n.label === 'index.ts') || rawNodes[0];
  const fileNodes = rawNodes.filter((n) => n.type === 'File' && n.id !== root.id);
  const symbolNodes = rawNodes.filter((n) => n.type !== 'File');

  const rfNodes: Node[] = [];

  // 1. Center root
  rfNodes.push({
    id: root.id,
    type: 'blobNode',
    position: { x: 0, y: 0 },
    data: { label: root.label, type: root.type, isRoot: true, details: root.metadata || {} },
  });

  // 2. Concentric orbits for other files
  const fileRadius = 280;
  const step = (Math.PI * 2) / (fileNodes.length || 1);

  fileNodes.forEach((file, idx) => {
    const theta = idx * step;
    const fx = Math.cos(theta) * fileRadius;
    const fy = Math.sin(theta) * fileRadius;

    rfNodes.push({
      id: file.id,
      type: 'blobNode',
      position: { x: fx, y: fy },
      data: { label: file.label, type: file.type, isRoot: false, details: file.metadata || {} },
    });
  });

  // 3. Satellites around their parent files
  const filePositions = new Map();
  rfNodes.forEach((n) => filePositions.set(n.id, n.position));

  symbolNodes.forEach((sym, idx) => {
    let parentId = sym.parentFile;
    if (!parentId) {
      const declEdge = rawEdges.find((e: any) => e.target === sym.id);
      if (declEdge) parentId = declEdge.source;
    }
    const parentPos = filePositions.get(parentId) || { x: 0, y: 0 };
    const subRadius = 85;
    const subTheta = idx * 0.9;

    rfNodes.push({
      id: sym.id,
      type: 'blobNode',
      position: {
        x: parentPos.x + Math.cos(subTheta) * subRadius,
        y: parentPos.y + Math.sin(subTheta) * subRadius,
      },
      data: { label: sym.label, type: sym.type, isRoot: false, details: sym.metadata || {} },
    });
  });

  return rfNodes;
}

export default function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const nodeTypes = useMemo(() => ({ blobNode: BlobNodeComponent }), []);

  const handleGraphData = useCallback((graph: any) => {
    if (!graph || !graph.nodes) return;

    const rootId = graph.metadata?.rootNodeId;
    const rfNodes = computeRadialWeb(graph.nodes, graph.edges || [], rootId);

    const rfEdges: Edge[] = (graph.edges || []).map((e: any) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      animated: e.type === 'IMPORTS',
      style: {
        stroke: e.type === 'IMPORTS' ? '#38bdf8' : '#34d399',
        strokeWidth: 2,
        opacity: 0.65,
      },
      data: { type: e.type },
    }));

    setNodes(rfNodes);
    setEdges(rfEdges);
  }, [setNodes, setEdges]);

  useEffect(() => {
    // 1. Connect to Web68 Live Server via Native WebSocket or Socket.io
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//localhost:6868`;
    let ws: WebSocket | null = null;

    try {
      ws = new WebSocket(wsUrl);
      ws.onopen = () => setIsConnected(true);
      ws.onclose = () => setIsConnected(false);
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'graph-update' || msg.nodes) {
            handleGraphData(msg.data || msg);
          }
        } catch (e) {}
      };
    } catch (e) {}

    // Fallback socket.io connection if port 3001 is used
    const socket = io('http://localhost:3001', { autoConnect: false });
    socket.connect();
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    socket.on('graph-update', handleGraphData);

    // Initial REST fetch
    fetch('http://localhost:6868/api/graph')
      .then((res) => res.json())
      .then(handleGraphData)
      .catch(() => {});

    return () => {
      if (ws) ws.close();
      socket.disconnect();
    };
  }, [handleGraphData]);

  // Handle manual JSON file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const graph = JSON.parse(e.target?.result as string);
        handleGraphData(graph);
      } catch (err) {
        alert('Invalid graph JSON format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="w-full h-screen cosmic-space-bg text-slate-100 flex overflow-hidden font-sans">
      {/* Left Glass Sidebar */}
      <div className="w-72 glass-panel-dark border-r border-white/10 flex flex-col z-20">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h1 className="text-lg font-extrabold flex items-center gap-2 text-white">
            <Orbit className="text-cyan-400 animate-spin-slow" size={22} />
            WEB68 <span className="text-cyan-400 font-mono text-xs">COSMOS</span>
          </h1>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1.5 ${
              isConnected
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
            {isConnected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>

        {/* Load JSON Action */}
        <div className="p-3">
          <label className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 rounded-xl cursor-pointer text-xs font-semibold text-cyan-300 transition-all">
            <Upload size={14} />
            Load Graph JSON
            <input type="file" accept=".json" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>

        {/* Search */}
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg">
            <Search size={14} className="text-slate-400" />
            <input
              type="text"
              placeholder="Search entities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none text-xs text-white placeholder-slate-500 focus:outline-none w-full"
            />
          </div>
        </div>

        {/* Node Explorer List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider px-2 mb-1">
            Cosmic Entities ({nodes.length})
          </div>
          {nodes
            .filter((n) => !searchQuery || n.data.label.toLowerCase().includes(searchQuery.toLowerCase()))
            .map((node) => (
              <div
                key={node.id}
                onClick={() => setSelectedNode(node)}
                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-xs transition-colors ${
                  selectedNode?.id === node.id ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'hover:bg-white/5 text-slate-300'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    node.data.isRoot
                      ? 'bg-amber-400'
                      : node.data.type === 'File'
                      ? 'bg-cyan-400'
                      : node.data.type === 'Function'
                      ? 'bg-emerald-400'
                      : 'bg-purple-400'
                  }`}
                />
                <span className="truncate">{node.data.label}</span>
              </div>
            ))}
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={(_, node) => setSelectedNode(node)}
          connectionLineType={ConnectionLineType.SmoothStep}
          fitView
        >
          <Background color="#1e293b" gap={28} size={1} />
          <Controls className="bg-slate-900/90 border border-white/10 rounded-lg overflow-hidden text-white" />
          <MiniMap
            nodeColor={(node: any) =>
              node.data.isRoot ? '#fbbf24' : node.data.type === 'File' ? '#38bdf8' : '#34d399'
            }
            maskColor="rgba(3, 7, 18, 0.7)"
            className="border border-white/10 rounded-lg overflow-hidden"
          />

          <Panel position="top-right" className="glass-panel-dark px-3 py-1.5 rounded-full text-xs font-mono text-slate-400">
            {nodes.length} Blobs <span className="text-slate-600">•</span> {edges.length} Filaments
          </Panel>
        </ReactFlow>
      </div>

      {/* Right Inspector Drawer */}
      <div className="w-80 glass-panel-dark border-l border-white/10 flex flex-col z-20">
        <div className="p-4 border-b border-white/10 flex items-center gap-2">
          <Box size={18} className="text-cyan-400" />
          <h2 className="font-bold text-sm text-white">Entity Inspector</h2>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          {selectedNode ? (
            <div className="space-y-4">
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl">
                <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                  {selectedNode.data.isRoot ? '🌟 Supermassive Root Node' : selectedNode.data.type}
                </div>
                <div className="text-base font-bold text-white mt-1 break-all">{selectedNode.data.label}</div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Entity ID</label>
                <div className="text-xs font-mono text-slate-300 break-all p-2 bg-slate-950/50 rounded-lg mt-1 border border-white/5">
                  {selectedNode.id}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase">Details & Metadata</label>
                <div className="mt-1 p-2 bg-slate-950/50 rounded-lg text-xs font-mono text-slate-300 overflow-x-auto border border-white/5">
                  <pre>{JSON.stringify(selectedNode.data.details || {}, null, 2)}</pre>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs text-center p-6 gap-2">
              <Sparkles size={28} className="text-slate-600 mb-1" />
              Select any blob in the cosmic web to inspect its code properties and connections.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
