import React, { useEffect, useState, useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  BackgroundVariant,
  MarkerType,
  NodeTypes,
  EdgeTypes
} from 'reactflow';
import 'reactflow/dist/style.css';
import { FlowChartData } from '../shared/types';
import CustomNode from './components/CustomNode';
import CustomEdge from './components/CustomEdge';

// Define custom node types
const nodeTypes: NodeTypes = {
  start: CustomNode,
  process: CustomNode,
  decision: CustomNode,
  loop: CustomNode,
  call: CustomNode,
  return: CustomNode,
  end: CustomNode
};

// Define custom edge types
const edgeTypes: EdgeTypes = {
  default: CustomEdge,
  conditional: CustomEdge,
  loop: CustomEdge,
  error: CustomEdge
};

interface VSCode {
  postMessage(message: any): void;
}

declare global {
  interface Window {
    vscode: VSCode;
  }
}

const App: React.FC = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  useEffect(() => {
    // Set up message listener for VSCode messages
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      switch (message.command) {
        case 'updateFlow':
          setIsLoading(false);
          setError(null);
          updateFlowChart(message.data);
          break;

        case 'showLoading':
          setIsLoading(true);
          setError(null);
          break;

        case 'showError':
          setIsLoading(false);
          setError(message.error);
          break;
      }
    };

    window.addEventListener('message', handleMessage);

    // Notify extension that webview is ready
    if (window.vscode) {
      window.vscode.postMessage({ command: 'ready' });
    }

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const updateFlowChart = (data: FlowChartData) => {
    console.log('Received flow chart data:', data);

    if (!data) {
      setError('No flow chart data received. Check the Output panel (View → Output → Claude Flow Visualizer) for details.');
      return;
    }

    if (!data.nodes || !Array.isArray(data.nodes)) {
      setError(`Invalid nodes data. Expected array, got ${typeof data.nodes}. Check the Output panel for Claude\'s response.`);
      return;
    }

    if (!data.edges || !Array.isArray(data.edges)) {
      setError(`Invalid edges data. Expected array, got ${typeof data.edges}. Check the Output panel for Claude\'s response.`);
      return;
    }

    if (data.nodes.length === 0) {
      setError('No nodes in flow chart. The code might be too complex or Claude might need a retry.');
      return;
    }

    // Convert nodes to React Flow format
    const flowNodes: Node[] = data.nodes.map((node) => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: {
        ...node.data,
        type: node.type
      }
    }));

    // Convert edges to React Flow format with proper styling
    const flowEdges: Edge[] = data.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
      type: edge.type || 'default',
      animated: edge.animated || edge.type === 'loop',
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20
      },
      style: getEdgeStyle(edge.type),
      data: edge.data
    }));

    setNodes(flowNodes);
    setEdges(flowEdges);
  };

  const getEdgeStyle = (type?: string) => {
    switch (type) {
      case 'conditional':
        return { stroke: '#ff9800', strokeWidth: 2 };
      case 'loop':
        return { stroke: '#2196f3', strokeWidth: 2 };
      case 'error':
        return { stroke: '#f44336', strokeWidth: 2, strokeDasharray: '5,5' };
      default:
        return { stroke: '#555', strokeWidth: 2 };
    }
  };

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontFamily: 'var(--vscode-font-family)',
        color: 'var(--vscode-foreground)'
      }}>
        <div>
          <div>Analyzing code with Claude...</div>
          <div style={{ marginTop: '10px', fontSize: '12px', opacity: 0.7 }}>
            This may take a few seconds
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontFamily: 'var(--vscode-font-family)',
        padding: '20px'
      }}>
        <div style={{
          maxWidth: '600px',
          padding: '20px',
          border: '1px solid var(--vscode-errorForeground)',
          borderRadius: '5px',
          backgroundColor: 'var(--vscode-inputValidation-errorBackground)'
        }}>
          <div style={{
            fontSize: '18px',
            marginBottom: '15px',
            color: 'var(--vscode-errorForeground)',
            fontWeight: 'bold'
          }}>
            ⚠️ Flow Chart Generation Error
          </div>
          <div style={{ marginBottom: '20px', color: 'var(--vscode-foreground)' }}>
            {error}
          </div>
          <div style={{
            padding: '10px',
            backgroundColor: 'var(--vscode-textBlockQuote-background)',
            borderRadius: '3px',
            fontSize: '13px',
            color: 'var(--vscode-foreground)'
          }}>
            <strong>How to debug:</strong>
            <ol style={{ marginTop: '10px', marginBottom: '5px', paddingLeft: '20px' }}>
              <li>Open the Output panel: View → Output</li>
              <li>Select "Claude Flow Visualizer" from the dropdown</li>
              <li>Check the logs for Claude's raw response</li>
              <li>Try selecting a smaller code snippet</li>
            </ol>
          </div>
          <div style={{
            marginTop: '15px',
            fontSize: '12px',
            opacity: 0.8,
            color: 'var(--vscode-foreground)'
          }}>
            Tip: Start with simple functions (&lt; 50 lines) for best results
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        attributionPosition="top-right"
      >
        <Controls />
        <MiniMap />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
      </ReactFlow>
    </div>
  );
};

export default App;