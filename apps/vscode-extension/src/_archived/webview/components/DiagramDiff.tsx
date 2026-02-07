import React, { useMemo } from 'react';
import { FlowChartData } from '@dad/shared-types';

export type ExportFormat = 'd2' | 'mermaid' | 'json';

interface DiagramDiffProps {
  baseDiagram: FlowChartData;
  currentDiagram: FlowChartData;
  format: ExportFormat;
}

interface DiffStats {
  nodesAdded: number;
  nodesRemoved: number;
  nodesModified: number;
  edgesAdded: number;
  edgesRemoved: number;
  edgesModified: number;
}

interface NodeChange {
  id: string;
  type: 'added' | 'removed' | 'modified';
  label: string;
  oldLabel?: string;
}

interface EdgeChange {
  id: string;
  type: 'added' | 'removed' | 'modified';
  source: string;
  target: string;
  label?: string;
  oldLabel?: string;
}

const DiagramDiff: React.FC<DiagramDiffProps> = ({ baseDiagram, currentDiagram, format }) => {
  const { stats, nodeChanges, edgeChanges } = useMemo(() => {
    return computeDiff(baseDiagram, currentDiagram);
  }, [baseDiagram, currentDiagram]);

  const baseContent = useMemo(() => {
    return formatDiagram(baseDiagram, format);
  }, [baseDiagram, format]);

  const currentContent = useMemo(() => {
    return formatDiagram(currentDiagram, format);
  }, [currentDiagram, format]);

  const hasChanges = stats.nodesAdded > 0 || stats.nodesRemoved > 0 || stats.nodesModified > 0 ||
                     stats.edgesAdded > 0 || stats.edgesRemoved > 0 || stats.edgesModified > 0;

  return (
    <div style={styles.container}>
      {/* Stats Header */}
      <div style={styles.statsHeader}>
        <div style={styles.statsTitle}>Changes Summary</div>
        {hasChanges ? (
          <div style={styles.statsGrid}>
            {stats.nodesAdded > 0 && (
              <div style={styles.statItem}>
                <span style={styles.statIcon('added')}>➕</span>
                <span>{stats.nodesAdded} node{stats.nodesAdded !== 1 ? 's' : ''} added</span>
              </div>
            )}
            {stats.nodesRemoved > 0 && (
              <div style={styles.statItem}>
                <span style={styles.statIcon('removed')}>➖</span>
                <span>{stats.nodesRemoved} node{stats.nodesRemoved !== 1 ? 's' : ''} removed</span>
              </div>
            )}
            {stats.nodesModified > 0 && (
              <div style={styles.statItem}>
                <span style={styles.statIcon('modified')}>✏️</span>
                <span>{stats.nodesModified} node{stats.nodesModified !== 1 ? 's' : ''} modified</span>
              </div>
            )}
            {stats.edgesAdded > 0 && (
              <div style={styles.statItem}>
                <span style={styles.statIcon('added')}>➕</span>
                <span>{stats.edgesAdded} edge{stats.edgesAdded !== 1 ? 's' : ''} added</span>
              </div>
            )}
            {stats.edgesRemoved > 0 && (
              <div style={styles.statItem}>
                <span style={styles.statIcon('removed')}>➖</span>
                <span>{stats.edgesRemoved} edge{stats.edgesRemoved !== 1 ? 's' : ''} removed</span>
              </div>
            )}
            {stats.edgesModified > 0 && (
              <div style={styles.statItem}>
                <span style={styles.statIcon('modified')}>✏️</span>
                <span>{stats.edgesModified} edge{stats.edgesModified !== 1 ? 's' : ''} modified</span>
              </div>
            )}
          </div>
        ) : (
          <div style={styles.noChanges}>No changes detected</div>
        )}
      </div>

      {/* Detailed Changes */}
      {hasChanges && (
        <div style={styles.changesSection}>
          {/* Node Changes */}
          {nodeChanges.length > 0 && (
            <div style={styles.changeGroup}>
              <div style={styles.changeGroupTitle}>Node Changes</div>
              <div style={styles.changeList}>
                {nodeChanges.map((change, index) => (
                  <div key={index} style={styles.changeItem}>
                    <span style={styles.changeIcon(change.type)}>
                      {getChangeIcon(change.type)}
                    </span>
                    <div style={styles.changeDetails}>
                      <span style={styles.changeLabel}>{change.label}</span>
                      {change.type === 'modified' && change.oldLabel && (
                        <span style={styles.changeOldValue}>
                          (was: {change.oldLabel})
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Edge Changes */}
          {edgeChanges.length > 0 && (
            <div style={styles.changeGroup}>
              <div style={styles.changeGroupTitle}>Edge Changes</div>
              <div style={styles.changeList}>
                {edgeChanges.map((change, index) => (
                  <div key={index} style={styles.changeItem}>
                    <span style={styles.changeIcon(change.type)}>
                      {getChangeIcon(change.type)}
                    </span>
                    <div style={styles.changeDetails}>
                      <span style={styles.changeLabel}>
                        {change.source} → {change.target}
                        {change.label && ` (${change.label})`}
                      </span>
                      {change.type === 'modified' && change.oldLabel && (
                        <span style={styles.changeOldValue}>
                          (was: {change.oldLabel})
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Side-by-side comparison */}
      <div style={styles.comparisonContainer}>
        <div style={styles.comparisonColumn}>
          <div style={styles.comparisonHeader}>
            <span style={styles.comparisonTitle}>Base (Before)</span>
            <span style={styles.comparisonSubtitle}>
              {baseDiagram.nodes.length} nodes, {baseDiagram.edges.length} edges
            </span>
          </div>
          <pre style={styles.codeBlock}>{baseContent}</pre>
        </div>

        <div style={styles.divider} />

        <div style={styles.comparisonColumn}>
          <div style={styles.comparisonHeader}>
            <span style={styles.comparisonTitle}>Current (After)</span>
            <span style={styles.comparisonSubtitle}>
              {currentDiagram.nodes.length} nodes, {currentDiagram.edges.length} edges
            </span>
          </div>
          <pre style={styles.codeBlock}>{currentContent}</pre>
        </div>
      </div>
    </div>
  );
};

// Helper Functions

function computeDiff(baseDiagram: FlowChartData, currentDiagram: FlowChartData): {
  stats: DiffStats;
  nodeChanges: NodeChange[];
  edgeChanges: EdgeChange[];
} {
  const baseNodeMap = new Map(baseDiagram.nodes.map(n => [n.id, n]));
  const currentNodeMap = new Map(currentDiagram.nodes.map(n => [n.id, n]));

  const baseEdgeMap = new Map(baseDiagram.edges.map(e => [e.id, e]));
  const currentEdgeMap = new Map(currentDiagram.edges.map(e => [e.id, e]));

  const nodeChanges: NodeChange[] = [];
  const edgeChanges: EdgeChange[] = [];
  const stats: DiffStats = {
    nodesAdded: 0,
    nodesRemoved: 0,
    nodesModified: 0,
    edgesAdded: 0,
    edgesRemoved: 0,
    edgesModified: 0,
  };

  // Check for added and modified nodes
  currentDiagram.nodes.forEach(node => {
    const baseNode = baseNodeMap.get(node.id);
    if (!baseNode) {
      stats.nodesAdded++;
      nodeChanges.push({
        id: node.id,
        type: 'added',
        label: node.data.label,
      });
    } else if (baseNode.data.label !== node.data.label || baseNode.type !== node.type) {
      stats.nodesModified++;
      nodeChanges.push({
        id: node.id,
        type: 'modified',
        label: node.data.label,
        oldLabel: baseNode.data.label,
      });
    }
  });

  // Check for removed nodes
  baseDiagram.nodes.forEach(node => {
    if (!currentNodeMap.has(node.id)) {
      stats.nodesRemoved++;
      nodeChanges.push({
        id: node.id,
        type: 'removed',
        label: node.data.label,
      });
    }
  });

  // Check for added and modified edges
  currentDiagram.edges.forEach(edge => {
    const baseEdge = baseEdgeMap.get(edge.id);
    const edgeKey = `${edge.source}-${edge.target}`;

    if (!baseEdge) {
      // Also check by source-target combination
      const existingEdge = baseDiagram.edges.find(
        e => e.source === edge.source && e.target === edge.target
      );

      if (!existingEdge) {
        stats.edgesAdded++;
        edgeChanges.push({
          id: edge.id,
          type: 'added',
          source: edge.source,
          target: edge.target,
          label: edge.label,
        });
      } else if (existingEdge.label !== edge.label) {
        stats.edgesModified++;
        edgeChanges.push({
          id: edge.id,
          type: 'modified',
          source: edge.source,
          target: edge.target,
          label: edge.label,
          oldLabel: existingEdge.label,
        });
      }
    } else if (baseEdge.label !== edge.label) {
      stats.edgesModified++;
      edgeChanges.push({
        id: edge.id,
        type: 'modified',
        source: edge.source,
        target: edge.target,
        label: edge.label,
        oldLabel: baseEdge.label,
      });
    }
  });

  // Check for removed edges
  baseDiagram.edges.forEach(edge => {
    const currentEdge = currentEdgeMap.get(edge.id);
    if (!currentEdge) {
      // Also check by source-target combination
      const existingEdge = currentDiagram.edges.find(
        e => e.source === edge.source && e.target === edge.target
      );

      if (!existingEdge) {
        stats.edgesRemoved++;
        edgeChanges.push({
          id: edge.id,
          type: 'removed',
          source: edge.source,
          target: edge.target,
          label: edge.label,
        });
      }
    }
  });

  return { stats, nodeChanges, edgeChanges };
}

function formatDiagram(diagram: FlowChartData, format: ExportFormat): string {
  switch (format) {
    case 'json':
      return JSON.stringify(diagram, null, 2);
    case 'd2':
      return convertToD2(diagram);
    case 'mermaid':
      return convertToMermaid(diagram);
    default:
      return JSON.stringify(diagram, null, 2);
  }
}

function convertToD2(diagram: FlowChartData): string {
  let d2 = '# D2 Diagram\n\n';

  diagram.nodes.forEach((node) => {
    const label = node.data.label || node.id;
    const shape = getD2Shape(node.type);
    d2 += `${node.id}: ${label}${shape ? ` {shape: ${shape}}` : ''}\n`;
  });

  d2 += '\n';

  diagram.edges.forEach((edge) => {
    const label = edge.label ? `: ${edge.label}` : '';
    d2 += `${edge.source} -> ${edge.target}${label}\n`;
  });

  return d2;
}

function getD2Shape(nodeType: string): string | null {
  const shapeMap: Record<string, string> = {
    start: 'circle',
    end: 'circle',
    decision: 'diamond',
    process: 'rectangle',
    loop: 'hexagon',
    call: 'oval',
    return: 'oval',
  };
  return shapeMap[nodeType] || null;
}

function convertToMermaid(diagram: FlowChartData): string {
  let mermaid = 'flowchart TD\n';

  diagram.nodes.forEach((node) => {
    const label = node.data.label || node.id;
    const brackets = getMermaidBrackets(node.type);
    mermaid += `    ${node.id}${brackets[0]}${label}${brackets[1]}\n`;
  });

  mermaid += '\n';

  diagram.edges.forEach((edge) => {
    const arrow = edge.type === 'conditional' ? '-->' : '--->';
    const label = edge.label ? `|${edge.label}|` : '';
    mermaid += `    ${edge.source} ${arrow}${label} ${edge.target}\n`;
  });

  return mermaid;
}

function getMermaidBrackets(nodeType: string): [string, string] {
  const bracketMap: Record<string, [string, string]> = {
    start: ['([', '])'],
    end: ['([', '])'],
    decision: ['{', '}'],
    process: ['[', ']'],
    loop: ['[[', ']]'],
    call: ['(', ')'],
    return: ['(', ')'],
  };
  return bracketMap[nodeType] || ['[', ']'];
}

function getChangeIcon(type: 'added' | 'removed' | 'modified'): string {
  switch (type) {
    case 'added':
      return '➕';
    case 'removed':
      return '➖';
    case 'modified':
      return '✏️';
  }
}

// Styles

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
    height: '100%',
  },
  statsHeader: {
    padding: '12px 16px',
    backgroundColor: 'var(--vscode-sideBarSectionHeader-background)',
    borderRadius: '4px',
    border: '1px solid var(--vscode-panel-border)',
  },
  statsTitle: {
    fontSize: '13px',
    fontWeight: 600,
    marginBottom: '10px',
    opacity: 0.9,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '8px',
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
  },
  statIcon: (type: string) => ({
    fontSize: '14px',
    opacity: 0.8,
  }),
  noChanges: {
    fontSize: '12px',
    opacity: 0.7,
    fontStyle: 'italic' as const,
  },
  changesSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  changeGroup: {
    padding: '12px 16px',
    backgroundColor: 'var(--vscode-sideBarSectionHeader-background)',
    borderRadius: '4px',
    border: '1px solid var(--vscode-panel-border)',
  },
  changeGroupTitle: {
    fontSize: '12px',
    fontWeight: 600,
    marginBottom: '8px',
    textTransform: 'uppercase' as const,
    opacity: 0.7,
  },
  changeList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  changeItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    fontSize: '12px',
    padding: '4px',
  },
  changeIcon: (type: string) => ({
    fontSize: '14px',
    marginTop: '1px',
  }),
  changeDetails: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  },
  changeLabel: {
    fontFamily: 'var(--vscode-editor-font-family)',
  },
  changeOldValue: {
    fontSize: '11px',
    opacity: 0.6,
    fontStyle: 'italic' as const,
  },
  comparisonContainer: {
    display: 'flex',
    gap: '1px',
    flex: 1,
    overflow: 'hidden',
    border: '1px solid var(--vscode-panel-border)',
    borderRadius: '4px',
  },
  comparisonColumn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
    backgroundColor: 'var(--vscode-editor-background)',
  },
  comparisonHeader: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
    padding: '10px 12px',
    backgroundColor: 'var(--vscode-sideBarSectionHeader-background)',
    borderBottom: '1px solid var(--vscode-panel-border)',
  },
  comparisonTitle: {
    fontSize: '12px',
    fontWeight: 600,
  },
  comparisonSubtitle: {
    fontSize: '11px',
    opacity: 0.7,
  },
  divider: {
    width: '1px',
    backgroundColor: 'var(--vscode-panel-border)',
  },
  codeBlock: {
    margin: 0,
    padding: '12px',
    flex: 1,
    overflow: 'auto',
    fontFamily: 'var(--vscode-editor-font-family)',
    fontSize: '11px',
    lineHeight: '1.6',
    backgroundColor: 'var(--vscode-textCodeBlock-background)',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-all' as const,
  },
};

export default DiagramDiff;
