import React, { useEffect, useState, useCallback, useRef } from 'react';
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
  EdgeTypes,
  Panel
} from 'reactflow';
import 'reactflow/dist/style.css';
import './icicle.css';
import useUndoable from 'use-undoable';
import { FlowChartData } from '@daad/shared-types';
import CustomNode from './components/CustomNode';
import CustomEdge from './components/CustomEdge';
import SmartEdge from './components/SmartEdge';
import EditToolbar from './components/EditToolbar';
import HierarchicalNode from './components/HierarchicalNode';
import C4Node from './components/C4Node';
import C4Edge from './components/C4Edge';
import C4Breadcrumbs, { C4Breadcrumb } from './components/C4Breadcrumbs';
import C4ControlBar from './components/C4ControlBar';
import NodeDetailPanel, { NodeDetail } from './components/NodeDetailPanel';
import { ZoomManager } from './utils/zoomManager';
import { layoutForScope } from './utils/c4LayoutEngine';
import { translateDadToVisual } from './adapter/c4Adapter';
import { ICICLE_THEME } from './theme/icicleTheme';

// Define custom node types
const nodeTypes: NodeTypes = {
  start: CustomNode,
  process: CustomNode,
  decision: CustomNode,
  loop: CustomNode,
  call: CustomNode,
  return: CustomNode,
  end: CustomNode,
  // Hierarchical node types
  file: HierarchicalNode,
  function: HierarchicalNode,
  code: HierarchicalNode,
  // C4 Architecture node type
  c4Node: C4Node,
};

// Define custom edge types
const edgeTypes: EdgeTypes = {
  default: SmartEdge,
  conditional: SmartEdge,
  loop: SmartEdge,
  error: SmartEdge,
  smart: SmartEdge,
  c4Edge: C4Edge,
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
  // Undo/redo state for nodes and edges
  const [
    nodesState,
    setNodesState,
    {
      undo: undoNodes,
      redo: redoNodes,
      canUndo: canUndoNodes,
      canRedo: canRedoNodes,
      reset: resetNodesHistory
    }
  ] = useUndoable<Node[]>([]);

  const [
    edgesState,
    setEdgesState,
    {
      undo: undoEdges,
      redo: redoEdges,
      canUndo: canUndoEdges,
      canRedo: canRedoEdges,
      reset: resetEdgesHistory
    }
  ] = useUndoable<Edge[]>([]);

  // Use ReactFlow's state management with our undoable state
  const [nodes, setNodes, onNodesChange] = useNodesState(nodesState);
  const [edges, setEdges, onEdgesChange] = useEdgesState(edgesState);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalNodes, setOriginalNodes] = useState<Node[]>([]);
  const [originalEdges, setOriginalEdges] = useState<Edge[]>([]);

  // Combined undo/redo capabilities
  const canUndo = canUndoNodes || canUndoEdges;
  const canRedo = canRedoNodes || canRedoEdges;

  // Sync nodes/edges changes to undoable state
  useEffect(() => {
    if (isEditMode) {
      setNodesState(nodes);
    }
  }, [nodes, isEditMode, setNodesState]);

  useEffect(() => {
    if (isEditMode) {
      setEdgesState(edges);
    }
  }, [edges, isEditMode, setEdgesState]);

  // Undo/redo handlers
  const handleUndo = useCallback(() => {
    if (canUndoNodes) {
      undoNodes();
    }
    if (canUndoEdges) {
      undoEdges();
    }
  }, [canUndoNodes, canUndoEdges, undoNodes, undoEdges]);

  const handleRedo = useCallback(() => {
    if (canRedoNodes) {
      redoNodes();
    }
    if (canRedoEdges) {
      redoEdges();
    }
  }, [canRedoNodes, canRedoEdges, redoNodes, redoEdges]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isEditMode) return;

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? event.metaKey : event.ctrlKey;

      // Undo: Cmd/Ctrl + Z
      if (modifier && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        handleUndo();
      }
      // Redo: Cmd/Ctrl + Shift + Z
      else if (modifier && event.key === 'z' && event.shiftKey) {
        event.preventDefault();
        handleRedo();
      }
      // Alternative Redo: Cmd/Ctrl + Y
      else if (modifier && event.key === 'y') {
        event.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditMode, handleUndo, handleRedo]);

  // Hierarchical view state
  const [isHierarchical, setIsHierarchical] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(1);
  const [previousZoom, setPreviousZoom] = useState(1);
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{ id: string; label: string; type: string }>>([
    { id: 'root', label: 'Software', type: 'software' }
  ]);

  // C4 Architecture view state
  const [isC4View, setIsC4View] = useState(false);
  const [c4Breadcrumbs, setC4Breadcrumbs] = useState<C4Breadcrumb[]>([
    { id: 'root', label: 'Landscape', level: 'landscape' }
  ]);
  const [selectedNodeDetail, setSelectedNodeDetail] = useState<NodeDetail | null>(null);
  // All C4 nodes/edges from DadFile (unfiltered, for drill-down recomputation)
  const [allC4Nodes, setAllC4Nodes] = useState<Node[]>([]);
  const [allC4Edges, setAllC4Edges] = useState<Edge[]>([]);
  // Current drill-down scope (null = root, showing context-level children)
  const [c4Scope, setC4Scope] = useState<string | null>(null);
  // ReactFlow instance ref for programmatic fitView on drill-down
  const reactFlowRef = useRef<any>(null);

  const onConnect = useCallback(
    (params: Connection | Edge) => {
      setEdges((eds) => addEdge(params, eds));
      setHasChanges(true);
    },
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

        case 'updateHierarchicalFlow':
          setIsLoading(false);
          setError(null);
          setIsHierarchical(true);
          updateHierarchicalFlowChart(message.data);
          break;

        case 'updateC4View':
          setIsLoading(false);
          setError(null);
          setIsC4View(true);
          setIsHierarchical(false);
          updateC4FlowChart(message.data);
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

  // Update edges with current nodes for smart routing
  useEffect(() => {
    setEdges((eds) =>
      eds.map((edge) => ({
        ...edge,
        data: {
          ...edge.data,
          nodes: nodes // Update nodes reference for smart edge routing
        }
      }))
    );
  }, [nodes, setEdges]);

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

    // Convert edges to React Flow format with proper styling and nodes data for smart routing
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
      data: {
        ...edge.data,
        nodes: flowNodes // Pass nodes for smart edge routing
      }
    }));

    setNodes(flowNodes);
    setEdges(flowEdges);

    // Save original state for reset functionality
    setOriginalNodes(flowNodes);
    setOriginalEdges(flowEdges);
    setHasChanges(false);
    setIsEditMode(false);
    setIsHierarchical(false);
  };

  const updateHierarchicalFlowChart = (data: any) => {
    console.log('Received hierarchical flow chart data:', data);

    if (!data || !data.nodes || !data.edges) {
      setError('Invalid hierarchical flow chart data received.');
      return;
    }

    // Convert nodes with toggle collapse handlers
    const flowNodes: Node[] = data.nodes.map((node: any) => ({
      ...node,
      data: {
        ...node.data,
        onToggleCollapse: node.data?.type ? () => handleToggleCollapse(node.id) : undefined
      }
    }));

    const flowEdges: Edge[] = data.edges.map((edge: any) => ({
      ...edge,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20
      },
      style: edge.data?.isCrossCall
        ? { stroke: '#ff9800', strokeWidth: 2, strokeDasharray: '5,5' }
        : getEdgeStyle(edge.type),
      data: {
        ...edge.data,
        nodes: flowNodes // Pass nodes for smart edge routing
      }
    }));

    setNodes(flowNodes);
    setEdges(flowEdges);
    setOriginalNodes(flowNodes);
    setOriginalEdges(flowEdges);
    setHasChanges(false);
    setIsEditMode(false);
  };

  const handleToggleCollapse = useCallback((nodeId: string) => {
    setNodes((nds) => {
      const node = nds.find(n => n.id === nodeId);
      if (!node) return nds;

      const isCollapsed = node.data.collapsed;

      // Update the clicked node
      const updatedNodes = nds.map(n => {
        if (n.id === nodeId) {
          return {
            ...n,
            data: {
              ...n.data,
              collapsed: !isCollapsed
            }
          };
        }

        // Show/hide children
        if (n.parentId === nodeId) {
          return {
            ...n,
            hidden: isCollapsed // If currently collapsed, show children; otherwise hide
          };
        }

        return n;
      });

      return updatedNodes;
    });

    setEdges((eds) => {
      return eds.map(e => {
        // Find source and target nodes
        const sourceNode = nodes.find(n => n.id === e.source);
        const targetNode = nodes.find(n => n.id === e.target);

        // Hide edge if either endpoint is hidden or is a child of the toggled node
        if (sourceNode?.parentId === nodeId || targetNode?.parentId === nodeId) {
          const node = nodes.find(n => n.id === nodeId);
          const isCollapsed = node?.data.collapsed;
          return { ...e, hidden: isCollapsed };
        }

        return e;
      });
    });

    setHasChanges(true);
  }, [nodes, setNodes, setEdges]);

  // --- C4 Architecture View ---

  // Fit view after drill-down scope changes
  useEffect(() => {
    if (isC4View && reactFlowRef.current) {
      const timer = setTimeout(() => {
        reactFlowRef.current.fitView({ duration: 300, padding: 0.12 });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isC4View, c4Scope]);

  const updateC4FlowChart = (data: any) => {
    console.log('Received C4 architecture data:', data);

    if (!data || !data.nodes || !data.edges) {
      setError('Invalid C4 architecture data received.');
      return;
    }

    // Translate DAD data to visual model via adapter
    const { nodes: flowNodes, edges: flowEdges } = translateDadToVisual(data, ICICLE_THEME);

    // Store all nodes/edges for drill-down recomputation
    setAllC4Nodes(flowNodes);
    setAllC4Edges(flowEdges);

    // Reset to root scope (context level)
    setC4Scope(null);
    setC4Breadcrumbs([{ id: 'root', label: 'Landscape', level: 'landscape' }]);

    // Apply layout for root scope (shows context-level children)
    const { nodes: positioned, edges: scopeEdges } = layoutForScope(flowNodes, flowEdges, null);

    setNodes(positioned);
    setEdges(scopeEdges);
    setOriginalNodes(positioned);
    setOriginalEdges(scopeEdges);
    setHasChanges(false);
    setIsEditMode(false);
  };

  const handleC4DrillDown = useCallback((nodeId: string) => {
    const hasChildren = allC4Nodes.some(n => n.data?.parentId === nodeId);
    if (!hasChildren) return;

    const targetNode = allC4Nodes.find(n => n.id === nodeId);
    if (!targetNode) return;

    const { nodes: positioned, edges: scopeEdges } = layoutForScope(allC4Nodes, allC4Edges, nodeId);
    if (positioned.length === 0) return;

    setC4Breadcrumbs(prev => [
      ...prev,
      { id: nodeId, label: targetNode.data.label, level: targetNode.data.c4Level }
    ]);
    setC4Scope(nodeId);
    setNodes(positioned);
    setEdges(scopeEdges);
  }, [allC4Nodes, allC4Edges, setNodes, setEdges]);

  // Listen for drill-down events from C4Node buttons
  useEffect(() => {
    const handler = (e: Event) => {
      const nodeId = (e as CustomEvent).detail?.nodeId;
      if (nodeId) handleC4DrillDown(nodeId);
    };
    window.addEventListener('c4-drill-down', handler);
    return () => window.removeEventListener('c4-drill-down', handler);
  }, [handleC4DrillDown]);

  const handleC4DrillUp = useCallback(() => {
    if (c4Breadcrumbs.length <= 1) return;

    const newBreadcrumbs = c4Breadcrumbs.slice(0, -1);
    const parentCrumb = newBreadcrumbs[newBreadcrumbs.length - 1];
    const newScope = parentCrumb.id === 'root' ? null : parentCrumb.id;

    const { nodes: positioned, edges: scopeEdges } = layoutForScope(allC4Nodes, allC4Edges, newScope);

    setC4Breadcrumbs(newBreadcrumbs);
    setC4Scope(newScope);
    setNodes(positioned);
    setEdges(scopeEdges);
  }, [c4Breadcrumbs, allC4Nodes, allC4Edges, setNodes, setEdges]);

  const handleC4NodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (!isC4View) return;
    const d = node.data;
    setSelectedNodeDetail({
      id: node.id,
      name: d.label || d.dadNodeId || node.id,
      c4Level: d.c4Level,
      c4Type: d.c4Type,
      technology: d.technology,
      designSpec: d.designSpec || '',
      documentation: d.documentation || '',
      sourceFilePath: d.sourceFilePath,
    });
  }, [isC4View]);

  const handleC4NodeDoubleClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (!isC4View) return;
    handleC4DrillDown(node.id);
  }, [isC4View, handleC4DrillDown]);

  const handleC4BreadcrumbNavigate = useCallback((nodeId: string) => {
    const idx = c4Breadcrumbs.findIndex(b => b.id === nodeId);
    if (idx < 0) return;

    const newBreadcrumbs = c4Breadcrumbs.slice(0, idx + 1);
    const targetCrumb = newBreadcrumbs[newBreadcrumbs.length - 1];
    const newScope = targetCrumb.id === 'root' ? null : targetCrumb.id;

    const { nodes: positioned, edges: scopeEdges } = layoutForScope(allC4Nodes, allC4Edges, newScope);

    setC4Breadcrumbs(newBreadcrumbs);
    setC4Scope(newScope);
    setNodes(positioned);
    setEdges(scopeEdges);
  }, [c4Breadcrumbs, allC4Nodes, allC4Edges, setNodes, setEdges]);

  const handleOpenSource = useCallback((filePath: string) => {
    if (window.vscode) {
      window.vscode.postMessage({ command: 'openSourceFile', filePath });
    }
  }, []);

  // C4 Control Bar handlers
  const handleC4ZoomIn = useCallback(() => {
    reactFlowRef.current?.zoomIn({ duration: 200 });
  }, []);

  const handleC4ZoomOut = useCallback(() => {
    reactFlowRef.current?.zoomOut({ duration: 200 });
  }, []);

  const handleC4FitView = useCallback(() => {
    reactFlowRef.current?.fitView({ duration: 300, padding: 0.12 });
  }, []);

  const handleC4FocusNode = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node || !reactFlowRef.current) return;
    const x = node.position.x + (node.data?.style?.width || 300) / 2;
    const y = node.position.y + (node.data?.style?.height || 140) / 2;
    reactFlowRef.current.setCenter(x, y, { duration: 300, zoom: 1.2 });
  }, [nodes]);

  const handleC4DrillToRoot = useCallback(() => {
    const { nodes: positioned, edges: scopeEdges } = layoutForScope(allC4Nodes, allC4Edges, null);
    setC4Breadcrumbs([{ id: 'root', label: 'Landscape', level: 'landscape' }]);
    setC4Scope(null);
    setNodes(positioned);
    setEdges(scopeEdges);
  }, [allC4Nodes, allC4Edges, setNodes, setEdges]);

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

  // Edit mode handlers
  const handleToggleEditMode = useCallback(() => {
    setIsEditMode(prev => !prev);
  }, []);

  const handleAddNode = useCallback(async () => {
    const newNodeId = `node_${Date.now()}`;

    // Lazy load the position calculator
    const { getNewNodePosition } = await import('./utils/clientLayout');
    const position = getNewNodePosition(nodes, edges);

    const newNode: Node = {
      id: newNodeId,
      type: 'process',
      position,
      data: {
        label: 'New Node',
        type: 'process'
      }
    };

    setNodes((nds) => [...nds, newNode]);
    setHasChanges(true);
  }, [nodes, edges, setNodes]);

  const handleDeleteSelected = useCallback(() => {
    setNodes((nds) => nds.filter(node => !node.selected));
    setEdges((eds) => eds.filter(edge => !edge.selected));
    setHasChanges(true);
  }, [setNodes, setEdges]);

  const handleAutoLayout = useCallback(async (algorithm: string = 'dagre') => {
    // For ELK layouts, we need to use a different approach
    if (algorithm.startsWith('elk-') || algorithm === 'smart') {
      try {
        // Dynamically import ELK
        const ELK = (await import('elkjs/lib/elk.bundled')).default;
        const elk = new ELK();

        // Map our nodes and edges to ELK format
        const elkGraph: any = {
          id: 'root',
          layoutOptions: {
            'elk.algorithm': algorithm === 'smart' ? 'layered' : algorithm.replace('elk-', ''),
            'elk.direction': 'DOWN',
            'elk.spacing.nodeNode': '50',
            'elk.layered.spacing.edgeNodeBetweenLayers': '50'
          },
          children: nodes.map(node => ({
            id: node.id,
            width: 150,
            height: 50
          })),
          edges: edges.map(edge => ({
            id: edge.id,
            sources: [edge.source],
            targets: [edge.target]
          }))
        };

        const layoutedGraph = await elk.layout(elkGraph);

        // Update node positions
        const layoutedNodes = nodes.map(node => {
          const elkNode = layoutedGraph.children?.find((n: any) => n.id === node.id);
          if (elkNode) {
            return {
              ...node,
              position: {
                x: elkNode.x || 0,
                y: elkNode.y || 0
              }
            };
          }
          return node;
        });

        setNodes(layoutedNodes);
        setHasChanges(true);
      } catch (error) {
        console.error('ELK layout failed:', error);
        // Fallback to dagre
        const { applyLayout } = await import('./utils/clientLayout');
        const { nodes: layoutedNodes } = applyLayout(nodes, edges, {
          direction: 'TB',
          preserveUserPositioned: false
        });
        setNodes(layoutedNodes);
        setHasChanges(true);
      }
    } else {
      // Use dagre for standard layout
      const { applyLayout } = await import('./utils/clientLayout');
      const { nodes: layoutedNodes } = applyLayout(nodes, edges, {
        direction: 'TB',
        preserveUserPositioned: false
      });
      setNodes(layoutedNodes);
      setHasChanges(true);
    }
  }, [nodes, edges, setNodes, setEdges]);

  const handleSave = useCallback(() => {
    // Send updated diagram to extension
    if (window.vscode) {
      const updatedFlowChart: FlowChartData = {
        nodes: nodes.map(node => ({
          id: node.id,
          type: node.type as any,
          position: node.position,
          data: node.data
        })),
        edges: edges.map(edge => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          label: typeof edge.label === 'string' ? edge.label : undefined,
          type: edge.type as any,
          animated: edge.animated,
          data: edge.data
        }))
      };

      window.vscode.postMessage({
        command: 'saveEditedDiagram',
        data: updatedFlowChart
      });

      // Update original state
      setOriginalNodes(nodes);
      setOriginalEdges(edges);
      setHasChanges(false);
    }
  }, [nodes, edges]);

  const handleReset = useCallback(() => {
    setNodes(originalNodes);
    setEdges(originalEdges);
    setHasChanges(false);
  }, [originalNodes, originalEdges, setNodes, setEdges]);

  // Track node drag to mark as edited
  const handleNodeDragStop = useCallback(() => {
    setHasChanges(true);
  }, []);

  // Custom onNodesChange to track changes
  const handleNodesChange = useCallback((changes: any) => {
    onNodesChange(changes);
    if (isEditMode && changes.length > 0) {
      // Check if it's a meaningful change (not just selection)
      const hasRealChange = changes.some((c: any) =>
        c.type === 'position' || c.type === 'remove' || c.type === 'add'
      );
      if (hasRealChange) {
        setHasChanges(true);
      }
    }
  }, [onNodesChange, isEditMode]);

  // Custom onEdgesChange to track changes
  const handleEdgesChange = useCallback((changes: any) => {
    onEdgesChange(changes);
    if (isEditMode && changes.length > 0) {
      const hasRealChange = changes.some((c: any) =>
        c.type === 'remove' || c.type === 'add'
      );
      if (hasRealChange) {
        setHasChanges(true);
      }
    }
  }, [onEdgesChange, isEditMode]);

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

  // Track zoom changes for LOD (Level of Detail)
  const handleMove = useCallback((_event: any, viewport: any) => {
    const newZoom = viewport.zoom;
    setPreviousZoom(currentZoom);
    setCurrentZoom(newZoom);

    if (isHierarchical) {
      // Apply LOD based on zoom level
      const { nodes: lodNodes, edges: lodEdges } = ZoomManager.applyLOD(
        nodes,
        edges,
        newZoom,
        true // Respect manual collapse state
      );

      // Only update if there are actual changes
      if (JSON.stringify(lodNodes) !== JSON.stringify(nodes)) {
        setNodes(lodNodes);
        setEdges(lodEdges);
      }

      // Update breadcrumbs if needed
      const newBreadcrumbs = ZoomManager.getBreadcrumbs(null, nodes);
      setBreadcrumbs(newBreadcrumbs);
    }
  }, [isHierarchical, currentZoom, nodes, edges, setNodes, setEdges]);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: isC4View ? ICICLE_THEME.canvas.bg0 : undefined,
    }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeDragStop={handleNodeDragStop}
        onMove={handleMove}
        onInit={(instance) => { reactFlowRef.current = instance; }}
        onNodeClick={handleC4NodeClick}
        onNodeDoubleClick={handleC4NodeDoubleClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        attributionPosition="top-right"
        nodesDraggable={isEditMode}
        nodesConnectable={isEditMode}
        elementsSelectable={isEditMode}
      >
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            if (node.type === 'c4Node' && node.data?.style?.accentColor) {
              return node.data.style.accentColor;
            }
            return '#555';
          }}
          style={isC4View ? {
            background: ICICLE_THEME.canvas.bg1,
            border: `1px solid ${ICICLE_THEME.glass.stroke}`,
          } : undefined}
        />
        <Background
          variant={BackgroundVariant.Dots}
          gap={12}
          size={isC4View ? ICICLE_THEME.canvas.gridDotSize : 1}
          color={isC4View ? ICICLE_THEME.canvas.gridDotColor : undefined}
        />

        {/* Hierarchical View Info */}
        {isHierarchical && (
          <Panel position="top-left" style={{
            background: 'var(--vscode-editor-background, #1e1e1e)',
            padding: '8px 12px',
            border: '1px solid var(--vscode-panel-border, #444)',
            borderRadius: '4px',
            fontSize: '11px',
            color: 'var(--vscode-foreground, #cccccc)',
            fontFamily: 'var(--vscode-font-family)'
          }}>
            <div style={{ marginBottom: '4px' }}>
              📍 {ZoomManager.getZoomLevelName(currentZoom)}
            </div>
            <div style={{ fontSize: '10px', opacity: 0.7 }}>
              {breadcrumbs.map((b, i) => (
                <span key={b.id}>
                  {i > 0 && ' › '}
                  {b.label}
                </span>
              ))}
            </div>
            <div style={{ marginTop: '6px', fontSize: '10px', opacity: 0.7 }}>
              💡 Double-click nodes to drill down
            </div>
          </Panel>
        )}

        {/* C4 Architecture View Panel */}
        {isC4View && (
          <>
            <Panel position="top-left">
              <C4Breadcrumbs
                breadcrumbs={c4Breadcrumbs}
                onNavigate={handleC4BreadcrumbNavigate}
                onDrillUp={handleC4DrillUp}
                scopeLabel={c4Scope
                  ? `Contents of ${c4Breadcrumbs[c4Breadcrumbs.length - 1]?.label}`
                  : 'System Context View'}
              />
            </Panel>
            <Panel position="bottom-center">
              <C4ControlBar
                allNodes={allC4Nodes}
                currentScope={c4Scope}
                onDrillDown={handleC4DrillDown}
                onDrillToRoot={handleC4DrillToRoot}
                onZoomIn={handleC4ZoomIn}
                onZoomOut={handleC4ZoomOut}
                onFitView={handleC4FitView}
                onFocusNode={handleC4FocusNode}
              />
            </Panel>
          </>
        )}

        {/* Edit Toolbar - only show in non-hierarchical, non-C4 mode */}
        {!isHierarchical && !isC4View && (
          <EditToolbar
            isEditMode={isEditMode}
            hasChanges={hasChanges}
            onAddNode={handleAddNode}
            onDeleteSelected={handleDeleteSelected}
            onAutoLayout={handleAutoLayout}
            onSave={handleSave}
            onReset={handleReset}
            onToggleEditMode={handleToggleEditMode}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={canUndo}
            canRedo={canRedo}
          />
        )}
      </ReactFlow>

      {/* C4 Node Detail Panel */}
      {isC4View && selectedNodeDetail && (
        <NodeDetailPanel
          detail={selectedNodeDetail}
          onClose={() => setSelectedNodeDetail(null)}
          onOpenSource={handleOpenSource}
        />
      )}
    </div>
  );
};

export default App;