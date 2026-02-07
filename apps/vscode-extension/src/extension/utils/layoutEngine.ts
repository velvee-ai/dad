import dagre from 'dagre';
import ELK from 'elkjs/lib/elk.bundled';
import { FlowChartData } from '@daad/shared-types';

export interface LayoutOptions {
  rankdir?: 'TB' | 'BT' | 'LR' | 'RL';  // Top-Bottom, Bottom-Top, Left-Right, Right-Left
  nodesep?: number;  // Separation between nodes in the same rank
  ranksep?: number;  // Separation between ranks
  edgesep?: number;  // Separation between edges
  marginx?: number;  // Margin on x-axis
  marginy?: number;  // Margin on y-axis
}

export type LayoutAlgorithm =
  | 'dagre'           // Hierarchical layout (current)
  | 'elk-layered'     // ELK layered (better hierarchical)
  | 'elk-force'       // Force-directed (organic)
  | 'elk-stress'      // Stress-minimization (reduces crossings)
  | 'elk-mrtree'      // Tree layout (for tree structures)
  | 'elk-radial'      // Radial layout (circular)
  | 'elk-box';        // Box layout (for components)

export class LayoutEngine {
  /**
   * Apply auto-layout to flow chart nodes using dagre
   */
  static applyLayout(flowChart: FlowChartData, options?: LayoutOptions): FlowChartData {
    // Default options
    const defaultOptions: LayoutOptions = {
      rankdir: 'TB',
      nodesep: 50,
      ranksep: 80,
      edgesep: 10,
      marginx: 20,
      marginy: 20
    };

    const layoutOptions = { ...defaultOptions, ...options };

    // Create a new directed graph
    const g = new dagre.graphlib.Graph();

    // Set graph options
    g.setGraph({
      rankdir: layoutOptions.rankdir,
      nodesep: layoutOptions.nodesep,
      ranksep: layoutOptions.ranksep,
      edgesep: layoutOptions.edgesep,
      marginx: layoutOptions.marginx,
      marginy: layoutOptions.marginy
    });

    // Default to compound graph to support subgraphs
    g.setDefaultEdgeLabel(() => ({}));

    // Add nodes to the graph
    flowChart.nodes.forEach((node) => {
      // Estimate node dimensions based on label length
      const width = Math.max(150, (node.data.label?.length || 10) * 8);
      const height = 50;

      g.setNode(node.id, {
        width,
        height,
        label: node.data.label
      });
    });

    // Add edges to the graph
    flowChart.edges.forEach((edge) => {
      // Only add edge if both source and target nodes exist
      if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
        g.setEdge(edge.source, edge.target, {
          label: edge.label,
          labelpos: 'c',
          labeloffset: 10
        });
      }
    });

    // Perform the layout
    dagre.layout(g);

    // Update node positions from the layout
    const layoutedNodes = flowChart.nodes.map((node) => {
      const dagreNode = g.node(node.id);
      if (dagreNode) {
        return {
          ...node,
          position: {
            x: dagreNode.x - dagreNode.width / 2,
            y: dagreNode.y - dagreNode.height / 2
          }
        };
      }
      return node;
    });

    return {
      ...flowChart,
      nodes: layoutedNodes
    };
  }

  /**
   * Detect if a flow chart has branches (nodes with multiple outgoing edges)
   */
  static hasBranches(flowChart: FlowChartData): boolean {
    const sourceCount: Record<string, number> = {};

    flowChart.edges.forEach(edge => {
      sourceCount[edge.source] = (sourceCount[edge.source] || 0) + 1;
    });

    return Object.values(sourceCount).some(count => count > 1);
  }

  /**
   * Detect if a flow chart has parallel flows (nodes with same source and target rank)
   */
  static hasParallelFlows(flowChart: FlowChartData): boolean {
    // Create adjacency lists
    const outgoing: Record<string, string[]> = {};
    const incoming: Record<string, string[]> = {};

    flowChart.edges.forEach(edge => {
      if (!outgoing[edge.source]) outgoing[edge.source] = [];
      if (!incoming[edge.target]) incoming[edge.target] = [];
      outgoing[edge.source].push(edge.target);
      incoming[edge.target].push(edge.source);
    });

    // Check for diamond patterns (split and merge)
    for (const node of flowChart.nodes) {
      const targets = outgoing[node.id] || [];
      if (targets.length > 1) {
        // Check if these targets eventually merge
        const targetDescendants = targets.map(t => outgoing[t] || []);
        const commonDescendants = targetDescendants[0]?.filter(d =>
          targetDescendants.every(td => td.includes(d))
        );
        if (commonDescendants && commonDescendants.length > 0) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Optimize layout for specific patterns
   */
  static optimizeLayout(flowChart: FlowChartData): FlowChartData {
    // Detect flow characteristics
    const hasBranches = this.hasBranches(flowChart);
    const hasParallel = this.hasParallelFlows(flowChart);

    // Choose layout options based on characteristics
    let options: LayoutOptions = {
      rankdir: 'TB',
      nodesep: 50,
      ranksep: 80
    };

    if (hasBranches || hasParallel) {
      // Increase spacing for complex flows
      options.nodesep = 80;
      options.ranksep = 100;
    }

    // Check if the flow would be better horizontal
    if (flowChart.nodes.length > 10 && !hasParallel) {
      // For long linear flows, consider horizontal layout
      const avgLabelLength = flowChart.nodes.reduce((sum, node) =>
        sum + (node.data.label?.length || 0), 0
      ) / flowChart.nodes.length;

      if (avgLabelLength > 20) {
        options.rankdir = 'LR'; // Left to right for long labels
        options.ranksep = 120;
      }
    }

    return this.applyLayout(flowChart, options);
  }

  /**
   * Apply ELK layout algorithms
   */
  static async applyELKLayout(
    flowChart: FlowChartData,
    algorithm: Exclude<LayoutAlgorithm, 'dagre'> = 'elk-layered'
  ): Promise<FlowChartData> {
    const elk = new ELK();

    // Map algorithm names to ELK algorithm identifiers
    const algorithmMap: Record<string, string> = {
      'elk-layered': 'layered',
      'elk-force': 'force',
      'elk-stress': 'stress',
      'elk-mrtree': 'mrtree',
      'elk-radial': 'radial',
      'elk-box': 'box'
    };

    // Prepare the graph for ELK
    const elkGraph: any = {
      id: 'root',
      layoutOptions: {
        'elk.algorithm': algorithmMap[algorithm],
        'elk.direction': 'DOWN',
        'elk.spacing.nodeNode': 50,
        'elk.layered.spacing.edgeNodeBetweenLayers': 50,
        'elk.layered.spacing.nodeNodeBetweenLayers': 80,
        'elk.force.iterations': 500,
        'elk.force.temperature': 0.001,
        'elk.stress.desiredEdgeLength': 100
      },
      children: flowChart.nodes.map(node => ({
        id: node.id,
        width: Math.max(150, (node.data.label?.length || 10) * 8),
        height: 50,
        labels: [{
          text: node.data.label || '',
          width: Math.max(150, (node.data.label?.length || 10) * 8),
          height: 20
        }]
      })),
      edges: flowChart.edges.map(edge => ({
        id: edge.id,
        sources: [edge.source],
        targets: [edge.target],
        labels: edge.label ? [{
          text: edge.label,
          width: edge.label.length * 8,
          height: 20
        }] : []
      }))
    };

    try {
      // Perform the layout
      const layoutedGraph = await elk.layout(elkGraph);

      // Update node positions from the layout
      const layoutedNodes = flowChart.nodes.map(node => {
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

      return {
        ...flowChart,
        nodes: layoutedNodes
      };
    } catch (error) {
      console.error('ELK layout failed:', error);
      // Fallback to dagre
      return this.applyLayout(flowChart);
    }
  }

  /**
   * Apply layout with algorithm selection
   */
  static async applyAdvancedLayout(
    flowChart: FlowChartData,
    algorithm: LayoutAlgorithm = 'dagre'
  ): Promise<FlowChartData> {
    if (algorithm === 'dagre') {
      return this.applyLayout(flowChart);
    } else {
      return this.applyELKLayout(flowChart, algorithm);
    }
  }

  /**
   * Choose best layout algorithm based on graph characteristics
   */
  static async applySmartLayout(flowChart: FlowChartData): Promise<FlowChartData> {
    const nodeCount = flowChart.nodes.length;
    const edgeCount = flowChart.edges.length;
    const hasBranches = this.hasBranches(flowChart);
    const hasParallel = this.hasParallelFlows(flowChart);
    const density = edgeCount / (nodeCount || 1);

    let algorithm: LayoutAlgorithm = 'dagre';

    // Choose algorithm based on characteristics
    if (density > 2 && nodeCount > 20) {
      // Dense graph - use stress to minimize crossings
      algorithm = 'elk-stress';
    } else if (hasParallel && hasBranches) {
      // Complex flow - use layered for better organization
      algorithm = 'elk-layered';
    } else if (density < 1.2 && !hasBranches) {
      // Tree-like structure
      algorithm = 'elk-mrtree';
    } else if (nodeCount > 30 && density > 1.5) {
      // Large interconnected graph - use force
      algorithm = 'elk-force';
    }

    console.log(`Smart layout selected: ${algorithm} for ${nodeCount} nodes, ${edgeCount} edges`);
    return this.applyAdvancedLayout(flowChart, algorithm);
  }
}