import React, { useState, useEffect, useCallback } from 'react';
import { FlowChartData } from '@dad/shared-types';
import DiagramDiff from './DiagramDiff';

export type ExportFormat = 'd2' | 'mermaid' | 'json';

export interface ChangedFile {
  path: string;
  status: 'added' | 'modified' | 'deleted';
  diagram: FlowChartData;
  baseDiagram?: FlowChartData;
}

export interface PreviewSession {
  id: string;
  url: string;
  expiresAt: number;
  changedFiles: ChangedFile[];
  baseBranch: string;
  createdAt: number;
}

interface PreviewPanelProps {
  session?: PreviewSession;
  onRefresh?: () => void;
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({ session, onRefresh }) => {
  const [selectedFile, setSelectedFile] = useState<ChangedFile | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('json');
  const [showDiff, setShowDiff] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState(false);

  // Update time remaining countdown
  useEffect(() => {
    if (!session) return;

    const updateTimeRemaining = () => {
      const now = Date.now();
      const remaining = session.expiresAt - now;

      if (remaining <= 0) {
        setTimeRemaining('Expired');
        return;
      }

      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

      setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [session]);

  // Auto-select first file when session loads
  useEffect(() => {
    if (session && session.changedFiles.length > 0 && !selectedFile) {
      setSelectedFile(session.changedFiles[0]);
    }
  }, [session, selectedFile]);

  const handleCopyUrl = useCallback(async () => {
    if (!session) return;

    try {
      await navigator.clipboard.writeText(session.url);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  }, [session]);

  const getFormatContent = useCallback((file: ChangedFile, format: ExportFormat): string => {
    switch (format) {
      case 'json':
        return JSON.stringify(file.diagram, null, 2);
      case 'd2':
        return convertToD2(file.diagram);
      case 'mermaid':
        return convertToMermaid(file.diagram);
      default:
        return JSON.stringify(file.diagram, null, 2);
    }
  }, []);

  if (!session) {
    return (
      <div style={styles.emptyState}>
        <div style={styles.emptyIcon}>📊</div>
        <div style={styles.emptyTitle}>No Preview Session</div>
        <div style={styles.emptyDescription}>
          Create a preview session to see diagrams from your uncommitted changes
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTitle}>
          <span style={styles.icon}>👁️</span>
          <span>Preview Session</span>
        </div>
        <div style={styles.headerActions}>
          <button
            style={styles.refreshButton}
            onClick={onRefresh}
            title="Refresh preview"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Session Info Bar */}
      <div style={styles.sessionInfo}>
        <div style={styles.sessionInfoItem}>
          <span style={styles.label}>Base:</span>
          <span style={styles.value}>{session.baseBranch}</span>
        </div>
        <div style={styles.sessionInfoItem}>
          <span style={styles.label}>Files:</span>
          <span style={styles.value}>{session.changedFiles.length}</span>
        </div>
        <div style={styles.sessionInfoItem}>
          <span style={styles.label}>Expires:</span>
          <span style={{
            ...styles.value,
            color: timeRemaining === 'Expired' ? 'var(--vscode-errorForeground)' : undefined
          }}>
            {timeRemaining}
          </span>
        </div>
      </div>

      {/* Share Preview Section */}
      <div style={styles.shareSection}>
        <input
          type="text"
          value={session.url}
          readOnly
          style={styles.urlInput}
        />
        <button
          style={styles.copyButton}
          onClick={handleCopyUrl}
        >
          {copySuccess ? '✓ Copied' : '📋 Copy URL'}
        </button>
      </div>

      {/* Main Content */}
      <div style={styles.mainContent}>
        {/* File List Sidebar */}
        <div style={styles.sidebar}>
          <div style={styles.sidebarHeader}>Changed Files</div>
          <div style={styles.fileList}>
            {session.changedFiles.map((file, index) => (
              <div
                key={index}
                style={{
                  ...styles.fileItem,
                  ...(selectedFile === file ? styles.fileItemActive : {})
                }}
                onClick={() => {
                  setSelectedFile(file);
                  setShowDiff(false);
                }}
              >
                <span style={styles.fileStatus(file.status)}>
                  {getStatusIcon(file.status)}
                </span>
                <span style={styles.fileName}>{file.path}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div style={styles.contentArea}>
          {selectedFile ? (
            <>
              {/* Toolbar */}
              <div style={styles.toolbar}>
                <div style={styles.toolbarGroup}>
                  <span style={styles.toolbarLabel}>Format:</span>
                  <select
                    value={selectedFormat}
                    onChange={(e) => setSelectedFormat(e.target.value as ExportFormat)}
                    style={styles.formatSelect}
                  >
                    <option value="json">JSON</option>
                    <option value="d2">D2</option>
                    <option value="mermaid">Mermaid</option>
                  </select>
                </div>
                {selectedFile.baseDiagram && (
                  <div style={styles.toolbarGroup}>
                    <button
                      style={{
                        ...styles.toolbarButton,
                        ...(showDiff ? styles.toolbarButtonActive : {})
                      }}
                      onClick={() => setShowDiff(!showDiff)}
                    >
                      {showDiff ? '📊 Current' : '🔍 Compare'}
                    </button>
                  </div>
                )}
              </div>

              {/* Content Display */}
              <div style={styles.contentDisplay}>
                {showDiff && selectedFile.baseDiagram ? (
                  <DiagramDiff
                    baseDiagram={selectedFile.baseDiagram}
                    currentDiagram={selectedFile.diagram}
                    format={selectedFormat}
                  />
                ) : (
                  <pre style={styles.codeBlock}>
                    {getFormatContent(selectedFile, selectedFormat)}
                  </pre>
                )}
              </div>
            </>
          ) : (
            <div style={styles.noSelection}>
              Select a file to view its diagram
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper Functions

function getStatusIcon(status: ChangedFile['status']): string {
  switch (status) {
    case 'added':
      return '➕';
    case 'modified':
      return '📝';
    case 'deleted':
      return '🗑️';
    default:
      return '📄';
  }
}

function convertToD2(diagram: FlowChartData): string {
  let d2 = '# D2 Diagram\n\n';

  // Add nodes
  diagram.nodes.forEach((node) => {
    const label = node.data.label || node.id;
    const shape = getD2Shape(node.type);
    d2 += `${node.id}: ${label}${shape ? ` {shape: ${shape}}` : ''}\n`;
  });

  d2 += '\n';

  // Add edges
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

  // Add nodes
  diagram.nodes.forEach((node) => {
    const label = node.data.label || node.id;
    const brackets = getMermaidBrackets(node.type);
    mermaid += `    ${node.id}${brackets[0]}${label}${brackets[1]}\n`;
  });

  mermaid += '\n';

  // Add edges
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

// Styles

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
    backgroundColor: 'var(--vscode-editor-background)',
    color: 'var(--vscode-editor-foreground)',
    fontFamily: 'var(--vscode-font-family)',
    fontSize: '13px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid var(--vscode-panel-border)',
    backgroundColor: 'var(--vscode-sideBar-background)',
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontWeight: 600,
    fontSize: '14px',
  },
  icon: {
    fontSize: '16px',
  },
  headerActions: {
    display: 'flex',
    gap: '8px',
  },
  refreshButton: {
    padding: '4px 8px',
    border: '1px solid var(--vscode-button-border)',
    backgroundColor: 'var(--vscode-button-background)',
    color: 'var(--vscode-button-foreground)',
    cursor: 'pointer',
    borderRadius: '3px',
    fontSize: '14px',
  },
  sessionInfo: {
    display: 'flex',
    gap: '24px',
    padding: '10px 16px',
    backgroundColor: 'var(--vscode-sideBarSectionHeader-background)',
    borderBottom: '1px solid var(--vscode-panel-border)',
    fontSize: '12px',
  },
  sessionInfoItem: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
  },
  label: {
    opacity: 0.7,
  },
  value: {
    fontWeight: 600,
  },
  shareSection: {
    display: 'flex',
    gap: '8px',
    padding: '12px 16px',
    borderBottom: '1px solid var(--vscode-panel-border)',
    backgroundColor: 'var(--vscode-editor-background)',
  },
  urlInput: {
    flex: 1,
    padding: '6px 10px',
    border: '1px solid var(--vscode-input-border)',
    backgroundColor: 'var(--vscode-input-background)',
    color: 'var(--vscode-input-foreground)',
    borderRadius: '3px',
    fontFamily: 'var(--vscode-editor-font-family)',
    fontSize: '12px',
  },
  copyButton: {
    padding: '6px 12px',
    border: '1px solid var(--vscode-button-border)',
    backgroundColor: 'var(--vscode-button-background)',
    color: 'var(--vscode-button-foreground)',
    cursor: 'pointer',
    borderRadius: '3px',
    fontSize: '12px',
    whiteSpace: 'nowrap' as const,
  },
  mainContent: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  sidebar: {
    width: '280px',
    borderRight: '1px solid var(--vscode-panel-border)',
    backgroundColor: 'var(--vscode-sideBar-background)',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  sidebarHeader: {
    padding: '10px 16px',
    fontWeight: 600,
    fontSize: '12px',
    textTransform: 'uppercase' as const,
    opacity: 0.7,
    borderBottom: '1px solid var(--vscode-panel-border)',
  },
  fileList: {
    flex: 1,
    overflow: 'auto',
  },
  fileItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    cursor: 'pointer',
    borderBottom: '1px solid var(--vscode-panel-border)',
    transition: 'background-color 0.15s',
  },
  fileItemActive: {
    backgroundColor: 'var(--vscode-list-activeSelectionBackground)',
    color: 'var(--vscode-list-activeSelectionForeground)',
  },
  fileStatus: (status: string) => ({
    fontSize: '14px',
    opacity: 0.8,
  }),
  fileName: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    fontSize: '12px',
  },
  contentArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 16px',
    borderBottom: '1px solid var(--vscode-panel-border)',
    backgroundColor: 'var(--vscode-sideBarSectionHeader-background)',
  },
  toolbarGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  toolbarLabel: {
    fontSize: '12px',
    opacity: 0.8,
  },
  formatSelect: {
    padding: '4px 8px',
    border: '1px solid var(--vscode-dropdown-border)',
    backgroundColor: 'var(--vscode-dropdown-background)',
    color: 'var(--vscode-dropdown-foreground)',
    borderRadius: '3px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  toolbarButton: {
    padding: '4px 10px',
    border: '1px solid var(--vscode-button-border)',
    backgroundColor: 'var(--vscode-button-secondaryBackground)',
    color: 'var(--vscode-button-secondaryForeground)',
    cursor: 'pointer',
    borderRadius: '3px',
    fontSize: '12px',
  },
  toolbarButtonActive: {
    backgroundColor: 'var(--vscode-button-background)',
    color: 'var(--vscode-button-foreground)',
  },
  contentDisplay: {
    flex: 1,
    overflow: 'auto',
    padding: '16px',
  },
  codeBlock: {
    margin: 0,
    padding: '16px',
    backgroundColor: 'var(--vscode-textCodeBlock-background)',
    border: '1px solid var(--vscode-panel-border)',
    borderRadius: '4px',
    overflow: 'auto',
    fontFamily: 'var(--vscode-editor-font-family)',
    fontSize: '12px',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-all' as const,
  },
  noSelection: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    opacity: 0.6,
    fontSize: '14px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    textAlign: 'center' as const,
    padding: '40px',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '8px',
  },
  emptyDescription: {
    fontSize: '13px',
    opacity: 0.7,
    maxWidth: '400px',
  },
};

export default PreviewPanel;
