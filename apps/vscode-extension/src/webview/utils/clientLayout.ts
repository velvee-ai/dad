import dagre from 'dagre';
import { Node, Edge } from 'reactflow';

export interface ClientLayoutOptions {
  direction?: 'TB' | 'BT' | 'LR' | 'RL';
  nodeSpacing?: number;
  rankSpacing?: number;
  preserveUserPositioned?: boolean;
}

/**
 * Apply layout on the client side for edited diagrams
 * This is lazy-loaded only when user starts editing
 */
export const applyLayout = (
  nodes: Node[],
  edges: Edge[],
  options: ClientLayoutOptions = {}
): { nodes: Node[]; edges: Edge[] } => {
  const {
    direction = 'TB',
    nodeSpacing = 50,
    rankSpacing = 80,
    preserveUserPositioned = true
  } = options;

  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: nodeSpacing,
    ranksep: rankSpacing,
    marginx: 20,
    marginy: 20
  });

  // Track which nodes were manually positioned by user
  const userPositionedNodes = new Set<string>();

  nodes.forEach((node) => {
    // Check if node has been manually positioned (has a flag or check position changes)
    const isUserPositioned = preserveUserPositioned && node.data?.userPositioned;

    if (isUserPositioned) {
      userPositionedNodes.add(node.id);
    }

    const nodeWidth = node.width || 150;
    const nodeHeight = node.height || 50;

    dagreGraph.setNode(node.id, {
      width: nodeWidth,
      height: nodeHeight,
      // If user positioned, use their position as a hint
      x: isUserPositioned ? node.position.x : undefined,
      y: isUserPositioned ? node.position.y : undefined
    });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);

    // Skip if user manually positioned this node
    if (preserveUserPositioned && userPositionedNodes.has(node.id)) {
      return node;
    }

    return {
      ...node,
      position: {
        x: nodeWithPosition.x - (nodeWithPosition.width / 2),
        y: nodeWithPosition.y - (nodeWithPosition.height / 2)
      }
    };
  });

  return { nodes: layoutedNodes, edges };
};

/**
 * Get layout for a new node being added to the diagram
 */
export const getNewNodePosition = (
  nodes: Node[],
  edges: Edge[],
  sourceNodeId?: string
): { x: number; y: number } => {
  if (!sourceNodeId) {
    // Place new node to the right of the rightmost node
    const maxX = Math.max(...nodes.map(n => n.position.x), 0);
    return { x: maxX + 200, y: 100 };
  }

  // Find source node
  const sourceNode = nodes.find(n => n.id === sourceNodeId);
  if (!sourceNode) {
    return { x: 250, y: 250 };
  }

  // Check if source already has children
  const childEdges = edges.filter(e => e.source === sourceNodeId);
  const offset = childEdges.length * 150;

  return {
    x: sourceNode.position.x + offset,
    y: sourceNode.position.y + 100
  };
};

/**
 * Auto-arrange nodes in a grid when there's no clear hierarchy
 */
export const arrangeInGrid = (nodes: Node[], columns: number = 3): Node[] => {
  const spacing = { x: 200, y: 100 };

  return nodes.map((node, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);

    return {
      ...node,
      position: {
        x: col * spacing.x,
        y: row * spacing.y
      }
    };
  });
};