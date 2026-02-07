import { FlowChartData, FlowNode, FlowEdge } from '@dad/shared-types';
import { SavedFlowChart } from '../storage/FlowChartStorage';
import * as path from 'path';

export interface HierarchyMetadata {
  isHierarchical: boolean;
  levels: {
    files: string[];
    functions: Map<string, string[]>; // file -> function names
  };
}

export class HierarchyBuilder {
  /**
   * Build a 3-level hierarchical structure from individual function diagrams
   * Level 1: Files
   * Level 2: Functions within files
   * Level 3: Code flow within functions
   */
  static buildSoftwareHierarchy(charts: SavedFlowChart[], workspaceRoot: string): FlowChartData & { metadata: HierarchyMetadata } {
    const nodes: FlowNode[] = [];
    const edges: FlowEdge[] = [];

    // Group charts by file
    const fileGroups = this.groupChartsByFile(charts, workspaceRoot);

    // Track metadata
    const metadata: HierarchyMetadata = {
      isHierarchical: true,
      levels: {
        files: Array.from(fileGroups.keys()),
        functions: new Map()
      }
    };

    let fileNodeY = 50;
    const FILE_SPACING_Y = 400;
    const FILE_SPACING_X = 350;
    let fileIndex = 0;

    // Create file nodes and function nodes
    for (const [filePath, fileCharts] of fileGroups) {
      const fileName = path.basename(filePath);
      const fileId = `file:${filePath}`;

      // Calculate position (layout files in grid)
      const col = fileIndex % 3;
      const row = Math.floor(fileIndex / 3);
      const fileX = 50 + (col * FILE_SPACING_X);
      const fileY = 50 + (row * FILE_SPACING_Y);

      // Create file node (Level 1)
      nodes.push({
        id: fileId,
        type: 'file',
        position: { x: fileX, y: fileY },
        data: {
          label: fileName,
          type: 'file',
          collapsed: true,
          childCount: fileCharts.length
        }
      });

      const functionNames: string[] = [];
      let functionY = 80; // Relative to file node

      // Create function nodes for each chart (Level 2)
      for (let i = 0; i < fileCharts.length; i++) {
        const chart = fileCharts[i];
        const functionName = this.extractFunctionName(chart.name);
        functionNames.push(functionName);

        const functionId = `${fileId}:${functionName}`;
        const functionX = 20 + (i % 2) * 140; // Layout functions in 2 columns

        nodes.push({
          id: functionId,
          type: 'function',
          position: { x: functionX, y: functionY },
          data: {
            label: functionName,
            type: 'function',
            collapsed: true,
            childCount: chart.flowChart.nodes.length
          },
          parentId: fileId,
          extent: 'parent',
          hidden: true // Initially hidden (collapsed)
        });

        // Create code flow nodes (Level 3)
        const codeNodes = this.createCodeNodes(
          chart.flowChart,
          functionId,
          { x: 20, y: 60 }
        );
        nodes.push(...codeNodes);

        // Create code flow edges
        const codeEdges = this.createCodeEdges(
          chart.flowChart,
          functionId
        );
        edges.push(...codeEdges);

        functionY += 120;
      }

      metadata.levels.functions.set(filePath, functionNames);
      fileIndex++;
    }

    // Detect cross-file and cross-function calls
    const crossCallEdges = this.detectCrossCalls(charts, workspaceRoot);
    edges.push(...crossCallEdges);

    return {
      nodes,
      edges,
      metadata
    };
  }

  /**
   * Group charts by their source file
   */
  private static groupChartsByFile(charts: SavedFlowChart[], workspaceRoot: string): Map<string, SavedFlowChart[]> {
    const groups = new Map<string, SavedFlowChart[]>();

    for (const chart of charts) {
      // Normalize file path relative to workspace
      let filePath = chart.sourceFile;
      if (filePath.startsWith(workspaceRoot)) {
        filePath = filePath.substring(workspaceRoot.length);
        if (filePath.startsWith('/')) {
          filePath = filePath.substring(1);
        }
      }

      if (!groups.has(filePath)) {
        groups.set(filePath, []);
      }
      groups.get(filePath)!.push(chart);
    }

    return groups;
  }

  /**
   * Extract function name from chart name
   * Format: "FileName_functionName_loop_timestamp"
   */
  private static extractFunctionName(chartName: string): string {
    const parts = chartName.split('_');
    if (parts.length >= 2) {
      // Remove file name (first part) and timestamp-like suffix
      const withoutFile = parts.slice(1);
      // Remove the last part if it looks like a timestamp or random ID
      if (withoutFile.length > 1 && /^[0-9a-z]{6,}$/.test(withoutFile[withoutFile.length - 1])) {
        withoutFile.pop();
      }
      return withoutFile.join('_') + '()';
    }
    return chartName;
  }

  /**
   * Create code flow nodes with proper namespacing and parent relationship
   */
  private static createCodeNodes(
    flowChart: FlowChartData,
    functionId: string,
    offset: { x: number; y: number }
  ): FlowNode[] {
    return flowChart.nodes.map(node => ({
      ...node,
      id: `${functionId}:${node.id}`,
      position: {
        x: offset.x,
        y: offset.y + (node.position?.y || 0) * 0.3 // Scale down for nested view
      },
      data: {
        ...node.data,
        nodeType: node.type // Store original type for rendering
      },
      type: 'code', // Use hierarchical node type
      parentId: functionId,
      extent: 'parent',
      hidden: true // Initially hidden (collapsed)
    }));
  }

  /**
   * Create code flow edges with proper namespacing
   */
  private static createCodeEdges(
    flowChart: FlowChartData,
    functionId: string
  ): FlowEdge[] {
    return flowChart.edges.map(edge => ({
      ...edge,
      id: `${functionId}:${edge.id}`,
      source: `${functionId}:${edge.source}`,
      target: `${functionId}:${edge.target}`,
      hidden: true // Initially hidden (collapsed)
    }));
  }

  /**
   * Detect cross-function and cross-file calls
   * This is a simplified version - can be enhanced with actual code analysis
   */
  private static detectCrossCalls(charts: SavedFlowChart[], workspaceRoot: string): FlowEdge[] {
    const edges: FlowEdge[] = [];
    const fileGroups = this.groupChartsByFile(charts, workspaceRoot);

    // Simple heuristic: Look for 'call' type nodes and match them to function names
    for (const [filePath, fileCharts] of fileGroups) {
      const fileId = `file:${filePath}`;

      for (const chart of fileCharts) {
        const functionName = this.extractFunctionName(chart.name);
        const functionId = `${fileId}:${functionName}`;

        // Look for call nodes
        const callNodes = chart.flowChart.nodes.filter(n => n.type === 'call');

        for (const callNode of callNodes) {
          const callLabel = callNode.data?.label || '';

          // Try to find a matching function in any file
          for (const [targetFilePath, targetCharts] of fileGroups) {
            for (const targetChart of targetCharts) {
              const targetFunctionName = this.extractFunctionName(targetChart.name);

              // Simple matching: if call label contains function name
              if (callLabel.toLowerCase().includes(targetFunctionName.toLowerCase().replace('()', ''))) {
                const targetFileId = `file:${targetFilePath}`;
                const targetFunctionId = `${targetFileId}:${targetFunctionName}`;

                // Don't create self-referencing edges
                if (functionId !== targetFunctionId) {
                  edges.push({
                    id: `cross:${functionId}->${targetFunctionId}`,
                    source: functionId,
                    target: targetFunctionId,
                    type: 'default',
                    label: 'calls',
                    animated: true,
                    data: {
                      isCrossCall: true
                    }
                  });
                }
              }
            }
          }
        }
      }
    }

    return edges;
  }

  /**
   * Toggle expand/collapse state for a node
   */
  static toggleNodeCollapse(
    flowChart: FlowChartData & { metadata: HierarchyMetadata },
    nodeId: string
  ): FlowChartData & { metadata: HierarchyMetadata } {
    const node = flowChart.nodes.find(n => n.id === nodeId);
    if (!node) {
      return flowChart;
    }

    const isCollapsed = node.data.collapsed;
    const newNodes = flowChart.nodes.map(n => {
      // Toggle the clicked node
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

    const newEdges = flowChart.edges.map(e => {
      // Show/hide edges connected to children
      const sourceNode = newNodes.find(n => n.id === e.source);
      const targetNode = newNodes.find(n => n.id === e.target);

      // Hide edge if either endpoint is hidden
      if (sourceNode?.hidden || targetNode?.hidden) {
        return { ...e, hidden: true };
      }

      // Show edge if both endpoints are visible and at least one is a child of the toggled node
      if (sourceNode?.parentId === nodeId || targetNode?.parentId === nodeId) {
        return { ...e, hidden: isCollapsed };
      }

      return e;
    });

    return {
      nodes: newNodes,
      edges: newEdges,
      metadata: flowChart.metadata
    };
  }
}
