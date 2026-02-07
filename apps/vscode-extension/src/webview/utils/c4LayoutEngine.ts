/**
 * C4 Hierarchical Layout Engine
 *
 * Uses dagre to position nodes based on edges, grouped by parent.
 * Produces clean directed-graph layouts for each drill-down scope.
 */
import dagre from 'dagre';
import { Node, Edge } from 'reactflow';
import { C4_NODE_SIZES, C4_LAYOUT } from '../designTokens';

interface LayoutResult {
  nodes: Node[];
  edges: Edge[];
}

/**
 * Get the actual rendered dimensions of a node.
 * Prefers the adapter-resolved style dimensions, falls back to C4_NODE_SIZES.
 */
function getNodeDimensions(node: Node): { w: number; h: number } {
  // Adapter-resolved dimensions (from VisualNodeData.style)
  if (node.data?.style?.width && node.data?.style?.height) {
    return { w: node.data.style.width, h: node.data.style.height };
  }
  // Fallback to C4_NODE_SIZES by level
  const c4Level = node.data?.c4Level || 'container';
  const sizes = C4_NODE_SIZES[c4Level] || C4_NODE_SIZES.container;
  return { w: sizes.width, h: sizes.height };
}

/**
 * Apply dagre layout to a set of nodes and edges.
 * Nodes are positioned based on the directed graph structure.
 */
export function applyC4DagreLayout(
  nodes: Node[],
  edges: Edge[],
  direction: 'TB' | 'LR' = 'TB'
): LayoutResult {
  if (nodes.length === 0) return { nodes: [], edges };

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: direction,
    nodesep: C4_LAYOUT.nodeSpacing,
    ranksep: C4_LAYOUT.rankSpacing,
    marginx: 30,
    marginy: 30,
  });

  // Add nodes with their actual rendered sizes
  for (const node of nodes) {
    const { w, h } = getNodeDimensions(node);
    g.setNode(node.id, { width: w + 20, height: h + 20 });
  }

  // Add edges (only those connecting visible nodes)
  const nodeIds = new Set(nodes.map(n => n.id));
  for (const edge of edges) {
    if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
      g.setEdge(edge.source, edge.target);
    }
  }

  dagre.layout(g);

  // Apply computed positions (dagre gives center coordinates, ReactFlow wants top-left)
  const positioned = nodes.map(node => {
    const dagreNode = g.node(node.id);
    if (!dagreNode) return node;

    const { w, h } = getNodeDimensions(node);

    return {
      ...node,
      position: {
        x: dagreNode.x - w / 2,
        y: dagreNode.y - h / 2,
      },
    };
  });

  return { nodes: positioned, edges };
}

/**
 * Compute the scope for progressive disclosure.
 *
 * Given a parent node ID (or null for root), returns the nodes and edges
 * that should be visible at that scope level.
 *
 * @param allNodes - All nodes from the DadFile
 * @param allEdges - All edges from the DadFile
 * @param scopeNodeId - The parent node whose children to show (null = root/landscape)
 */
export function computeScopeView(
  allNodes: Node[],
  allEdges: Edge[],
  scopeNodeId: string | null
): { visibleNodes: Node[]; visibleEdges: Edge[] } {
  let visibleNodes: Node[];

  if (scopeNodeId === null) {
    // Root scope: show the landscape node's children (context level)
    // Find the landscape node
    const landscapeNode = allNodes.find(n => n.data?.c4Level === 'landscape');
    if (!landscapeNode) {
      // Fallback: show all context-level nodes
      visibleNodes = allNodes.filter(n => n.data?.c4Level === 'context');
    } else {
      // Show landscape node's children
      const landscapeChildIds = new Set<string>();
      // Find nodes whose data has this as parent
      for (const n of allNodes) {
        if (n.data?.parentId === landscapeNode.id) {
          landscapeChildIds.add(n.id);
        }
      }
      visibleNodes = allNodes.filter(n => landscapeChildIds.has(n.id));
    }
  } else {
    // Show children of the scoped node
    const childIds = new Set<string>();
    for (const n of allNodes) {
      if (n.data?.parentId === scopeNodeId) {
        childIds.add(n.id);
      }
    }
    visibleNodes = allNodes.filter(n => childIds.has(n.id));
  }

  // Filter edges to only those between visible nodes
  const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
  const visibleEdges = allEdges.filter(
    e => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
  );

  return { visibleNodes, visibleEdges };
}

/**
 * Full layout pipeline for a drill-down scope:
 * 1. Compute which nodes/edges are visible
 * 2. Apply dagre layout
 * 3. Return positioned nodes + edges
 */
export function layoutForScope(
  allNodes: Node[],
  allEdges: Edge[],
  scopeNodeId: string | null
): LayoutResult {
  const { visibleNodes, visibleEdges } = computeScopeView(allNodes, allEdges, scopeNodeId);

  if (visibleNodes.length === 0) {
    return { nodes: [], edges: [] };
  }

  return applyC4DagreLayout(visibleNodes, visibleEdges);
}
