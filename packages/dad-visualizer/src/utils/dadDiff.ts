/**
 * DAD Diff — Computes changes between a baseline DadFile and the current state.
 * Used to build the coalesce request payload for the design agent.
 */

interface DadNode {
  id: string;
  status?: string;
  [key: string]: any;
}

interface DadEdge {
  id: string;
  status?: string;
  [key: string]: any;
}

interface DadFile {
  nodes: DadNode[];
  edges: DadEdge[];
  [key: string]: any;
}

export interface DadDiffResult {
  addedNodes: DadNode[];
  addedEdges: DadEdge[];
  hasChanges: boolean;
}

/**
 * Computes the diff between baseline and current DadFile.
 * Returns nodes/edges that were added (status: 'user-proposed' or 'agent-planned').
 */
export function computeDadDiff(baseline: DadFile, current: DadFile): DadDiffResult {
  const baselineNodeIds = new Set(baseline.nodes.map(n => n.id));
  const baselineEdgeIds = new Set(baseline.edges.map(e => e.id));

  const addedNodes = current.nodes.filter(n => !baselineNodeIds.has(n.id));
  const addedEdges = current.edges.filter(e => !baselineEdgeIds.has(e.id));

  return {
    addedNodes,
    addedEdges,
    hasChanges: addedNodes.length > 0 || addedEdges.length > 0,
  };
}

/**
 * Counts nodes by status for display in the toolbar.
 */
export function countByStatus(nodes: DadNode[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const node of nodes) {
    const status = node.status || 'existing';
    counts[status] = (counts[status] || 0) + 1;
  }
  return counts;
}
