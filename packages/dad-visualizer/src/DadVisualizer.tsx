import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  NodeTypes,
  EdgeTypes,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';
import './icicle.css';
import type { DadFile } from '@daad/shared-types';
import C4Node from './components/C4Node';
import C4Edge from './components/C4Edge';
import C4Breadcrumbs, { C4Breadcrumb } from './components/C4Breadcrumbs';
import C4ControlBar from './components/C4ControlBar';
import NodeDetailPanel, { NodeDetail } from './components/NodeDetailPanel';
import { layoutForScope } from './layout/c4LayoutEngine';
import { translateDadToVisual } from './adapter/c4Adapter';
import { ICICLE_THEME } from './theme/icicleTheme';
import type { C4Theme } from './theme/c4ThemeTypes';

const nodeTypes: NodeTypes = {
  c4Node: C4Node,
};

const edgeTypes: EdgeTypes = {
  c4Edge: C4Edge,
};

export interface DadVisualizerProps {
  dadFile: DadFile;
  focusNode?: string;
  theme?: C4Theme;
  onOpenSource?: (filePath: string) => void;
  onDrillDown?: (nodeId: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

function buildBreadcrumbTrail(
  dadNodes: DadFile['nodes'],
  focusNodeId: string
): C4Breadcrumb[] {
  const nodeMap = new Map(dadNodes.map(n => [n.id, n]));
  const trail: C4Breadcrumb[] = [];
  let current = nodeMap.get(focusNodeId);

  while (current) {
    trail.unshift({
      id: current.id,
      label: current.name,
      level: current.c4Level,
    });
    current = current.parentId ? nodeMap.get(current.parentId) : undefined;
  }

  trail.unshift({ id: 'root', label: 'Landscape', level: 'landscape' });
  return trail;
}

export function DadVisualizer({
  dadFile,
  focusNode,
  theme = ICICLE_THEME,
  onOpenSource,
  onDrillDown,
  className,
  style,
}: DadVisualizerProps): React.ReactElement {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const [c4Breadcrumbs, setC4Breadcrumbs] = useState<C4Breadcrumb[]>([
    { id: 'root', label: 'Landscape', level: 'landscape' },
  ]);
  const [selectedNodeDetail, setSelectedNodeDetail] = useState<NodeDetail | null>(null);
  const [allC4Nodes, setAllC4Nodes] = useState<Node[]>([]);
  const [allC4Edges, setAllC4Edges] = useState<Edge[]>([]);
  const [c4Scope, setC4Scope] = useState<string | null>(null);
  const reactFlowRef = useRef<any>(null);

  // Initialize from dadFile
  useEffect(() => {
    if (!dadFile || !dadFile.nodes || !dadFile.edges) return;

    const { nodes: flowNodes, edges: flowEdges } = translateDadToVisual(dadFile, theme);
    setAllC4Nodes(flowNodes);
    setAllC4Edges(flowEdges);

    // Determine initial scope
    const initialScope = focusNode || null;

    if (initialScope && dadFile.nodes.some(n => n.id === initialScope)) {
      const trail = buildBreadcrumbTrail(dadFile.nodes, initialScope);
      setC4Breadcrumbs(trail);
      setC4Scope(initialScope);
      const { nodes: positioned, edges: scopeEdges } = layoutForScope(flowNodes, flowEdges, initialScope);
      setNodes(positioned);
      setEdges(scopeEdges);
    } else {
      setC4Scope(null);
      setC4Breadcrumbs([{ id: 'root', label: 'Landscape', level: 'landscape' }]);
      const { nodes: positioned, edges: scopeEdges } = layoutForScope(flowNodes, flowEdges, null);
      setNodes(positioned);
      setEdges(scopeEdges);
    }
  }, [dadFile, focusNode, theme]);

  // Fit view after scope changes
  useEffect(() => {
    if (reactFlowRef.current) {
      const timer = setTimeout(() => {
        reactFlowRef.current.fitView({ duration: 300, padding: 0.12 });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [c4Scope]);

  const handleDrillDown = useCallback((nodeId: string) => {
    const hasChildren = allC4Nodes.some(n => n.data?.parentId === nodeId);
    if (!hasChildren) return;

    const targetNode = allC4Nodes.find(n => n.id === nodeId);
    if (!targetNode) return;

    const { nodes: positioned, edges: scopeEdges } = layoutForScope(allC4Nodes, allC4Edges, nodeId);
    if (positioned.length === 0) return;

    setC4Breadcrumbs(prev => [
      ...prev,
      { id: nodeId, label: targetNode.data.label, level: targetNode.data.c4Level },
    ]);
    setC4Scope(nodeId);
    setNodes(positioned);
    setEdges(scopeEdges);
    onDrillDown?.(nodeId);
  }, [allC4Nodes, allC4Edges, setNodes, setEdges, onDrillDown]);

  // Listen for drill-down events from C4Node buttons
  useEffect(() => {
    const handler = (e: Event) => {
      const nodeId = (e as CustomEvent).detail?.nodeId;
      if (nodeId) handleDrillDown(nodeId);
    };
    window.addEventListener('c4-drill-down', handler);
    return () => window.removeEventListener('c4-drill-down', handler);
  }, [handleDrillDown]);

  const handleDrillUp = useCallback(() => {
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

  const handleNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
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
  }, []);

  const handleNodeDoubleClick = useCallback((_event: React.MouseEvent, node: Node) => {
    handleDrillDown(node.id);
  }, [handleDrillDown]);

  const handleBreadcrumbNavigate = useCallback((nodeId: string) => {
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
    onOpenSource?.(filePath);
  }, [onOpenSource]);

  const handleZoomIn = useCallback(() => {
    reactFlowRef.current?.zoomIn({ duration: 200 });
  }, []);

  const handleZoomOut = useCallback(() => {
    reactFlowRef.current?.zoomOut({ duration: 200 });
  }, []);

  const handleFitView = useCallback(() => {
    reactFlowRef.current?.fitView({ duration: 300, padding: 0.12 });
  }, []);

  const handleFocusNode = useCallback((nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node || !reactFlowRef.current) return;
    const x = node.position.x + (node.data?.style?.width || 300) / 2;
    const y = node.position.y + (node.data?.style?.height || 140) / 2;
    reactFlowRef.current.setCenter(x, y, { duration: 300, zoom: 1.2 });
  }, [nodes]);

  const handleDrillToRoot = useCallback(() => {
    const { nodes: positioned, edges: scopeEdges } = layoutForScope(allC4Nodes, allC4Edges, null);
    setC4Breadcrumbs([{ id: 'root', label: 'Landscape', level: 'landscape' }]);
    setC4Scope(null);
    setNodes(positioned);
    setEdges(scopeEdges);
  }, [allC4Nodes, allC4Edges, setNodes, setEdges]);

  return (
    <div
      className={className}
      style={{
        width: '100%',
        height: '100%',
        background: theme.canvas.bg0,
        ...style,
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onInit={(instance) => { reactFlowRef.current = instance; }}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        attributionPosition="top-right"
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
      >
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            if (node.type === 'c4Node' && node.data?.style?.accentColor) {
              return node.data.style.accentColor;
            }
            return '#555';
          }}
          style={{
            background: theme.canvas.bg1,
            border: `1px solid ${theme.glass.stroke}`,
          }}
        />
        <Background
          variant={BackgroundVariant.Dots}
          gap={12}
          size={theme.canvas.gridDotSize}
          color={theme.canvas.gridDotColor}
        />

        <Panel position="top-left">
          <C4Breadcrumbs
            breadcrumbs={c4Breadcrumbs}
            onNavigate={handleBreadcrumbNavigate}
            onDrillUp={handleDrillUp}
            scopeLabel={c4Scope
              ? `Contents of ${c4Breadcrumbs[c4Breadcrumbs.length - 1]?.label}`
              : 'System Context View'}
          />
        </Panel>

        <Panel position="bottom-center">
          <C4ControlBar
            allNodes={allC4Nodes}
            currentScope={c4Scope}
            onDrillDown={handleDrillDown}
            onDrillToRoot={handleDrillToRoot}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onFitView={handleFitView}
            onFocusNode={handleFocusNode}
          />
        </Panel>
      </ReactFlow>

      {selectedNodeDetail && (
        <NodeDetailPanel
          detail={selectedNodeDetail}
          onClose={() => setSelectedNodeDetail(null)}
          onOpenSource={handleOpenSource}
        />
      )}
    </div>
  );
}
