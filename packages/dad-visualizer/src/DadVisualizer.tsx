import React, { useState, useCallback, useEffect, useRef } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Connection,
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
import type { DadFile } from '@dad/shared-types';
import C4Node from './components/C4Node';
import C4Edge from './components/C4Edge';
import C4Breadcrumbs, { C4Breadcrumb } from './components/C4Breadcrumbs';
import C4ControlBar from './components/C4ControlBar';
import NodeDetailPanel, { NodeDetail } from './components/NodeDetailPanel';
import AuthorToolbar from './components/AuthorToolbar';
import AddNodeDialog from './components/AddNodeDialog';
import AddEdgeDialog from './components/AddEdgeDialog';
import PlanReviewPanel from './components/PlanReviewPanel';
import CoalesceLogPanel, { LogEntry } from './components/CoalesceLogPanel';
import { useAuthorMode } from './hooks/useAuthorMode';
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
  // Author Mode
  authorMode?: boolean;
  onCoalesceDesign?: (proposedDad: DadFile) => void;
  onApproveDesign?: (approvedDad: DadFile, plan: string) => void;
  onRejectDesign?: () => void;
  onDadFileChange?: (updatedDad: DadFile) => void;
  // Cross-file navigation (landscape → context)
  onNavigate?: (filePath: string) => void;
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
  authorMode = false,
  onCoalesceDesign,
  onApproveDesign,
  onRejectDesign,
  onDadFileChange,
  onNavigate,
}: DadVisualizerProps): React.ReactElement {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Author Mode state
  const author = useAuthorMode();
  const [workingDad, setWorkingDad] = useState<DadFile>(dadFile);
  const [showAddNodeDialog, setShowAddNodeDialog] = useState(false);
  const [showAddEdgeDialog, setShowAddEdgeDialog] = useState(false);
  const [coalesceLogs, setCoalesceLogs] = useState<LogEntry[]>([]);

  const [c4Breadcrumbs, setC4Breadcrumbs] = useState<C4Breadcrumb[]>([
    { id: 'root', label: 'Landscape', level: 'landscape' },
  ]);
  const [selectedNodeDetail, setSelectedNodeDetail] = useState<NodeDetail | null>(null);
  const [allC4Nodes, setAllC4Nodes] = useState<Node[]>([]);
  const [allC4Edges, setAllC4Edges] = useState<Edge[]>([]);
  const [c4Scope, setC4Scope] = useState<string | null>(null);
  const reactFlowRef = useRef<any>(null);

  // Sync workingDad with external dadFile changes
  useEffect(() => {
    setWorkingDad(dadFile);
  }, [dadFile]);

  // Helper to refresh visualization from a DadFile
  // scopeOverride lets callers navigate to a different scope in the same render pass
  const refreshVisualization = useCallback((dad: DadFile, scopeOverride?: string | null) => {
    const { nodes: flowNodes, edges: flowEdges } = translateDadToVisual(dad, theme);
    setAllC4Nodes(flowNodes);
    setAllC4Edges(flowEdges);
    const effectiveScope = scopeOverride !== undefined ? scopeOverride : c4Scope;
    const { nodes: positioned, edges: scopeEdges } = layoutForScope(flowNodes, flowEdges, effectiveScope);
    setNodes(positioned);
    setEdges(scopeEdges);
  }, [theme, c4Scope, setNodes, setEdges]);

  // --- Author Mode handlers ---

  const handleToggleEditMode = useCallback(() => {
    if (author.mode === 'view') {
      author.enterEditMode(workingDad);
    } else {
      author.exitAuthorMode();
      setWorkingDad(dadFile);
      refreshVisualization(dadFile);
    }
  }, [author, workingDad, dadFile, refreshVisualization]);

  const handleAuthorAddNode = useCallback((node: any) => {
    // If parentId is null/empty, resolve to the landscape node so it's visible at root scope
    let resolvedParentId = node.parentId || null;
    if (!resolvedParentId) {
      const landscapeNode = workingDad.nodes.find(n => n.c4Level === 'landscape');
      if (landscapeNode) {
        resolvedParentId = landscapeNode.id;
      }
    }

    const resolvedNode = { ...node, parentId: resolvedParentId };
    const updatedDad = author.addNode(resolvedNode, workingDad);
    setWorkingDad(updatedDad);

    // Navigate to the parent scope so the new node is visible on canvas
    const targetScope = resolvedParentId;
    if (targetScope !== c4Scope) {
      setC4Scope(targetScope);
      if (targetScope) {
        const trail = buildBreadcrumbTrail(updatedDad.nodes, targetScope);
        setC4Breadcrumbs(trail);
      } else {
        setC4Breadcrumbs([{ id: 'root', label: 'Landscape', level: 'landscape' }]);
      }
    }

    // Refresh with the target scope so the new node appears immediately
    refreshVisualization(updatedDad, targetScope);
    setShowAddNodeDialog(false);
    onDadFileChange?.(updatedDad);

    // Fit view after a short delay so the new node is centered
    setTimeout(() => {
      reactFlowRef.current?.fitView({ duration: 300, padding: 0.12 });
    }, 100);
  }, [author, workingDad, c4Scope, refreshVisualization, onDadFileChange]);

  const handleAuthorAddEdge = useCallback((edge: any) => {
    const updatedDad = author.addEdge(edge, workingDad);
    setWorkingDad(updatedDad);
    refreshVisualization(updatedDad);
    setShowAddEdgeDialog(false);
    onDadFileChange?.(updatedDad);
  }, [author, workingDad, refreshVisualization, onDadFileChange]);

  // Drag-and-drop edge creation in edit mode
  const handleConnect = useCallback((connection: Connection) => {
    if (!authorMode || !author.isEditing) return;
    if (!connection.source || !connection.target) return;

    // Infer c4Level from the source node
    const sourceNode = workingDad.nodes.find(n => n.id === connection.source);
    const c4Level = sourceNode?.c4Level || 'container';

    const edge: any = {
      id: `proposed-edge:${connection.source}-${connection.target}-${Date.now()}`,
      source: connection.source,
      target: connection.target,
      label: 'connects to',
      technology: '',
      c4Level,
      status: 'user-proposed' as const,
    };

    const updatedDad = author.addEdge(edge, workingDad);
    setWorkingDad(updatedDad);
    refreshVisualization(updatedDad);
    onDadFileChange?.(updatedDad);
  }, [authorMode, author, workingDad, refreshVisualization, onDadFileChange]);

  const handleCoalesce = useCallback(() => {
    setCoalesceLogs([{ timestamp: Date.now(), message: 'Starting design agent...', type: 'info' }]);
    author.startCoalescing();
    onCoalesceDesign?.(workingDad);
  }, [author, workingDad, onCoalesceDesign]);

  const handleApprove = useCallback(() => {
    setCoalesceLogs([{ timestamp: Date.now(), message: 'Approved plan — starting Claude Code implementation...', type: 'info' }]);
    author.approve();
    onApproveDesign?.(workingDad, author.agentPlan || '');
  }, [author, workingDad, onApproveDesign]);

  const handleReject = useCallback(() => {
    const updatedDad = author.reject(workingDad);
    setWorkingDad(updatedDad);
    refreshVisualization(updatedDad);
    onRejectDesign?.();
  }, [author, workingDad, refreshVisualization, onRejectDesign]);

  const handleReset = useCallback(() => {
    author.exitAuthorMode();
    setWorkingDad(dadFile);
    refreshVisualization(dadFile);
  }, [author, dadFile, refreshVisualization]);

  // Update a proposed/planned node's properties in-place
  const handleUpdateNode = useCallback((update: { id: string; name?: string; technology?: string; documentation?: string }) => {
    const updatedNodes = workingDad.nodes.map(n => {
      if (n.id !== update.id) return n;
      return {
        ...n,
        name: update.name || n.name,
        technology: update.technology ?? n.technology,
        documentation: update.documentation ?? n.documentation,
      };
    });

    const updatedDad: DadFile = { ...workingDad, nodes: updatedNodes };
    setWorkingDad(updatedDad);
    refreshVisualization(updatedDad);
    onDadFileChange?.(updatedDad);

    // Update the detail panel to reflect changes
    const updatedNode = updatedNodes.find(n => n.id === update.id);
    if (updatedNode && selectedNodeDetail?.id === update.id) {
      setSelectedNodeDetail(prev => prev ? {
        ...prev,
        name: updatedNode.name,
        technology: updatedNode.technology,
        documentation: updatedNode.documentation || '',
      } : null);
    }
  }, [workingDad, refreshVisualization, onDadFileChange, selectedNodeDetail]);

  // Listen for coalesce/implementation results from the extension (via custom events)
  useEffect(() => {
    const handleCoalesceResult = (e: Event) => {
      const { plan, dadFile: coalescedDad } = (e as CustomEvent).detail;
      if (plan && coalescedDad) {
        const updatedDad = author.receiveCoalesceResult(plan, coalescedDad);
        setWorkingDad(updatedDad);
        refreshVisualization(updatedDad);
        setCoalesceLogs([]);
      }
    };

    const handleImplementResult = (e: Event) => {
      const { dadFile: finalizedDad } = (e as CustomEvent).detail;
      if (finalizedDad) {
        const updatedDad = author.finalize(finalizedDad);
        setWorkingDad(updatedDad);
        refreshVisualization(updatedDad);
        setCoalesceLogs([]);
      }
    };

    const handleCoalesceProgress = (e: Event) => {
      const { message, type } = (e as CustomEvent).detail;
      if (message) {
        setCoalesceLogs(prev => [...prev, {
          timestamp: Date.now(),
          message,
          type: type || 'progress',
        }]);
      }
    };

    window.addEventListener('dad-coalesce-result', handleCoalesceResult);
    window.addEventListener('dad-implementation-result', handleImplementResult);
    window.addEventListener('dad-coalesce-progress', handleCoalesceProgress);
    return () => {
      window.removeEventListener('dad-coalesce-result', handleCoalesceResult);
      window.removeEventListener('dad-implementation-result', handleImplementResult);
      window.removeEventListener('dad-coalesce-progress', handleCoalesceProgress);
    };
  }, [author, refreshVisualization]);

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
    if (!hasChildren) {
      // Cross-file navigation: open the system's context DAD file
      const targetNode = allC4Nodes.find(n => n.id === nodeId);
      if (targetNode?.data?.contextFilePath) {
        onNavigate?.(targetNode.data.contextFilePath);
      }
      return;
    }

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
  }, [allC4Nodes, allC4Edges, setNodes, setEdges, onDrillDown, onNavigate]);

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
      status: d.status,
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
        onConnect={handleConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        attributionPosition="top-right"
        nodesDraggable={authorMode && author.isEditing}
        nodesConnectable={authorMode && author.isEditing}
        elementsSelectable={authorMode && author.isEditing}
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

        {authorMode && (
          <Panel position="top-right">
            <AuthorToolbar
              mode={author.mode}
              proposedNodeCount={author.proposedNodeCount}
              agentPlannedNodeCount={author.agentPlannedNodeCount}
              onToggleEditMode={handleToggleEditMode}
              onAddNode={() => setShowAddNodeDialog(true)}
              onAddEdge={() => setShowAddEdgeDialog(true)}
              onCoalesceDesign={handleCoalesce}
              onApprove={handleApprove}
              onReject={handleReject}
              onReset={handleReset}
            />
          </Panel>
        )}
      </ReactFlow>

      {selectedNodeDetail && (
        <NodeDetailPanel
          detail={selectedNodeDetail}
          onClose={() => setSelectedNodeDetail(null)}
          onOpenSource={handleOpenSource}
          onUpdateNode={authorMode && author.isEditing ? handleUpdateNode : undefined}
        />
      )}

      {/* Author Mode: Add Node Dialog */}
      {showAddNodeDialog && (
        <AddNodeDialog
          parentOptions={workingDad.nodes.map(n => ({
            id: n.id,
            name: n.name,
            c4Level: n.c4Level,
          }))}
          defaultParentId={c4Scope}
          onSubmit={handleAuthorAddNode}
          onClose={() => setShowAddNodeDialog(false)}
        />
      )}

      {/* Author Mode: Add Edge Dialog */}
      {showAddEdgeDialog && (
        <AddEdgeDialog
          nodeOptions={workingDad.nodes.map(n => ({
            id: n.id,
            name: n.name,
            c4Level: n.c4Level,
          }))}
          onSubmit={handleAuthorAddEdge}
          onClose={() => setShowAddEdgeDialog(false)}
        />
      )}

      {/* Author Mode: Plan Review Panel */}
      {author.mode === 'reviewing' && author.agentPlan && (
        <PlanReviewPanel
          plan={author.agentPlan}
          addedNodeCount={author.agentPlannedNodeCount}
          addedEdgeCount={workingDad.edges.filter(e => e.status === 'agent-planned').length}
          onApprove={handleApprove}
          onReject={handleReject}
          onClose={handleReject}
        />
      )}

      {/* Author Mode: Coalesce / Implementation Log Panel */}
      {(author.mode === 'coalescing' || author.mode === 'implementing') && (
        <CoalesceLogPanel
          mode={author.mode === 'coalescing' ? 'coalescing' : 'implementing'}
          logs={coalesceLogs}
        />
      )}

      {/* Edit mode: larger connection handles */}
      {authorMode && author.isEditing && (
        <style>{`
          .react-flow__handle {
            width: 12px !important;
            height: 12px !important;
            min-width: 12px !important;
            min-height: 12px !important;
            border-radius: 50% !important;
            background: rgba(79,233,255,0.50) !important;
            border: 2px solid rgba(79,233,255,0.80) !important;
            opacity: 1 !important;
          }
          .react-flow__handle:hover {
            background: rgba(79,233,255,0.80) !important;
            transform: scale(1.3);
          }
        `}</style>
      )}
    </div>
  );
}
