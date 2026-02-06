import { Node, Edge } from 'reactflow';

export interface ZoomLevel {
  level: 1 | 2 | 3;
  name: 'software' | 'file' | 'function';
  minZoom: number;
  maxZoom: number;
}

export const ZOOM_LEVELS: ZoomLevel[] = [
  { level: 1, name: 'software', minZoom: 0, maxZoom: 0.5 },
  { level: 2, name: 'file', minZoom: 0.5, maxZoom: 1.5 },
  { level: 3, name: 'function', minZoom: 1.5, maxZoom: Infinity }
];

export class ZoomManager {
  /**
   * Get the current zoom level based on zoom value
   */
  static getCurrentLevel(zoom: number): ZoomLevel {
    for (const level of ZOOM_LEVELS) {
      if (zoom >= level.minZoom && zoom < level.maxZoom) {
        return level;
      }
    }
    // Default to highest zoom level
    return ZOOM_LEVELS[ZOOM_LEVELS.length - 1];
  }

  /**
   * Auto-hide/show nodes based on zoom level (Level of Detail)
   * - Level 1 (software): Show only file nodes
   * - Level 2 (file): Show file + function nodes
   * - Level 3 (function): Show file + function + code nodes
   */
  static applyLOD(
    nodes: Node[],
    edges: Edge[],
    zoom: number,
    respectManualCollapse: boolean = true
  ): { nodes: Node[]; edges: Edge[] } {
    const level = this.getCurrentLevel(zoom);

    const updatedNodes = nodes.map(node => {
      const nodeType = node.data?.type as 'file' | 'function' | 'code' | undefined;

      // If respecting manual collapse, keep manually collapsed nodes hidden
      if (respectManualCollapse && node.data?.collapsed && node.parentId) {
        return { ...node, hidden: true };
      }

      // Apply automatic LOD based on zoom level
      let shouldHide = false;

      switch (level.level) {
        case 1: // Software level - show only file nodes
          if (nodeType === 'function' || nodeType === 'code') {
            shouldHide = true;
          }
          break;

        case 2: // File level - show file and function nodes
          if (nodeType === 'code') {
            shouldHide = true;
          }
          break;

        case 3: // Function level - show all nodes
          shouldHide = false;
          break;
      }

      return {
        ...node,
        hidden: shouldHide || node.hidden
      };
    });

    // Hide edges if either endpoint is hidden
    const updatedEdges = edges.map(edge => {
      const sourceNode = updatedNodes.find(n => n.id === edge.source);
      const targetNode = updatedNodes.find(n => n.id === edge.target);

      const shouldHide = sourceNode?.hidden || targetNode?.hidden;

      return {
        ...edge,
        hidden: shouldHide
      };
    });

    return { nodes: updatedNodes, edges: updatedEdges };
  }

  /**
   * Calculate optimal zoom level for drilling down into a node
   */
  static getZoomForDrillDown(nodeType: 'file' | 'function' | 'code'): number {
    switch (nodeType) {
      case 'file':
        return 1.0; // Medium zoom to see functions
      case 'function':
        return 2.0; // High zoom to see code flow
      case 'code':
      default:
        return 2.5; // Very high zoom for detail
    }
  }

  /**
   * Calculate optimal zoom level for drilling up
   */
  static getZoomForDrillUp(currentLevel: ZoomLevel): number {
    switch (currentLevel.level) {
      case 3:
        return 1.0; // Go to file level
      case 2:
        return 0.3; // Go to software level
      case 1:
      default:
        return 0.2; // Already at top, zoom out more
    }
  }

  /**
   * Get breadcrumb trail for current view
   */
  static getBreadcrumbs(
    selectedNodeId: string | null,
    nodes: Node[]
  ): Array<{ id: string; label: string; type: string }> {
    if (!selectedNodeId) {
      return [{ id: 'root', label: 'Software', type: 'software' }];
    }

    const breadcrumbs: Array<{ id: string; label: string; type: string }> = [
      { id: 'root', label: 'Software', type: 'software' }
    ];

    // Find the node and traverse up the parent chain
    let currentNode = nodes.find(n => n.id === selectedNodeId);

    const chain: Node[] = [];
    while (currentNode) {
      chain.unshift(currentNode);
      if (currentNode.parentId) {
        currentNode = nodes.find(n => n.id === currentNode!.parentId);
      } else {
        break;
      }
    }

    // Add all ancestors to breadcrumbs
    for (const node of chain) {
      breadcrumbs.push({
        id: node.id,
        label: node.data?.label || node.id,
        type: node.data?.type || 'unknown'
      });
    }

    return breadcrumbs;
  }

  /**
   * Get suggested zoom level name for display
   */
  static getZoomLevelName(zoom: number): string {
    const level = this.getCurrentLevel(zoom);
    switch (level.level) {
      case 1:
        return 'Software Overview';
      case 2:
        return 'File Structure';
      case 3:
        return 'Function Detail';
      default:
        return 'Unknown';
    }
  }

  /**
   * Check if auto-expand should trigger based on zoom change
   */
  static shouldAutoExpand(
    previousZoom: number,
    currentZoom: number
  ): { shouldExpand: boolean; targetType?: 'file' | 'function' } {
    const prevLevel = this.getCurrentLevel(previousZoom);
    const currLevel = this.getCurrentLevel(currentZoom);

    // Zooming in from level 1 to level 2 - expand files
    if (prevLevel.level === 1 && currLevel.level === 2) {
      return { shouldExpand: true, targetType: 'file' };
    }

    // Zooming in from level 2 to level 3 - expand functions
    if (prevLevel.level === 2 && currLevel.level === 3) {
      return { shouldExpand: true, targetType: 'function' };
    }

    return { shouldExpand: false };
  }

  /**
   * Check if auto-collapse should trigger based on zoom change
   */
  static shouldAutoCollapse(
    previousZoom: number,
    currentZoom: number
  ): { shouldCollapse: boolean; targetType?: 'file' | 'function' } {
    const prevLevel = this.getCurrentLevel(previousZoom);
    const currLevel = this.getCurrentLevel(currentZoom);

    // Zooming out from level 2 to level 1 - collapse files
    if (prevLevel.level === 2 && currLevel.level === 1) {
      return { shouldCollapse: true, targetType: 'file' };
    }

    // Zooming out from level 3 to level 2 - collapse functions
    if (prevLevel.level === 3 && currLevel.level === 2) {
      return { shouldCollapse: true, targetType: 'function' };
    }

    return { shouldCollapse: false };
  }

  // --- C4 Architecture View Support ---

  static readonly C4_ZOOM_LEVELS = [
    { level: 0, name: 'Landscape',      c4Level: 'landscape',  minZoom: 0,    maxZoom: 0.25 },
    { level: 1, name: 'System Context', c4Level: 'context',    minZoom: 0.25, maxZoom: 0.5  },
    { level: 2, name: 'Containers',     c4Level: 'container',  minZoom: 0.5,  maxZoom: 1.0  },
    { level: 3, name: 'Components',     c4Level: 'component',  minZoom: 1.0,  maxZoom: 2.0  },
    { level: 4, name: 'Code',           c4Level: 'code',       minZoom: 2.0,  maxZoom: Infinity },
  ] as const;

  static getC4Level(zoom: number): typeof ZoomManager.C4_ZOOM_LEVELS[number] {
    for (const level of ZoomManager.C4_ZOOM_LEVELS) {
      if (zoom >= level.minZoom && zoom < level.maxZoom) {
        return level;
      }
    }
    return ZoomManager.C4_ZOOM_LEVELS[ZoomManager.C4_ZOOM_LEVELS.length - 1];
  }

  static getC4LevelName(zoom: number): string {
    return this.getC4Level(zoom).name;
  }

  static getC4ZoomForDrillDown(c4Level: string): number {
    switch (c4Level) {
      case 'landscape': return 0.35;
      case 'context':   return 0.7;
      case 'container': return 1.5;
      case 'component': return 2.5;
      default:          return 1.0;
    }
  }

  static getC4ZoomForDrillUp(c4Level: string): number {
    switch (c4Level) {
      case 'code':      return 1.5;
      case 'component': return 0.7;
      case 'container': return 0.35;
      case 'context':   return 0.15;
      default:          return 0.15;
    }
  }

  /**
   * Apply C4-aware Level of Detail.
   * Shows nodes up to the appropriate C4 level based on zoom.
   */
  static applyC4LOD(
    nodes: Node[],
    edges: Edge[],
    zoom: number
  ): { nodes: Node[]; edges: Edge[] } {
    const c4Level = this.getC4Level(zoom);
    const c4LevelOrder: Record<string, number> = {
      landscape: 0, context: 1, container: 2, component: 3, code: 4,
    };
    const maxVisible = c4Level.level;

    const updatedNodes = nodes.map(node => {
      const nodeC4Level = node.data?.c4Level;
      if (!nodeC4Level) return node;

      const nodeOrder = c4LevelOrder[nodeC4Level] ?? 0;
      const shouldHide = nodeOrder > maxVisible;

      return { ...node, hidden: shouldHide };
    });

    const hiddenIds = new Set(updatedNodes.filter(n => n.hidden).map(n => n.id));
    const updatedEdges = edges.map(edge => ({
      ...edge,
      hidden: hiddenIds.has(edge.source) || hiddenIds.has(edge.target),
    }));

    return { nodes: updatedNodes, edges: updatedEdges };
  }
}
