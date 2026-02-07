import React, { memo, useState } from 'react';

export interface NodeDetail {
  id: string;
  name: string;
  c4Level: string;
  c4Type: string;
  technology?: string;
  designSpec: string;
  documentation: string;
  sourceFilePath?: string;
}

interface NodeDetailPanelProps {
  detail: NodeDetail | null;
  onClose: () => void;
  onOpenSource?: (filePath: string) => void;
}

type Tab = 'docs' | 'design' | 'source';

const NodeDetailPanel: React.FC<NodeDetailPanelProps> = ({ detail, onClose, onOpenSource }) => {
  const [activeTab, setActiveTab] = useState<Tab>('docs');

  if (!detail) return null;

  const tabStyle = (tab: Tab): React.CSSProperties => ({
    padding: '6px 12px',
    background: activeTab === tab
      ? 'var(--vscode-tab-activeBackground, #1e1e1e)'
      : 'var(--vscode-tab-inactiveBackground, #2d2d2d)',
    border: 'none',
    borderBottom: activeTab === tab ? '2px solid var(--vscode-focusBorder, #007acc)' : '2px solid transparent',
    color: activeTab === tab
      ? 'var(--vscode-tab-activeForeground, #fff)'
      : 'var(--vscode-tab-inactiveForeground, #888)',
    cursor: 'pointer',
    fontSize: '11px',
    fontFamily: 'var(--vscode-font-family)',
  });

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      right: 0,
      width: '320px',
      height: '100%',
      background: 'var(--vscode-sideBar-background, #252526)',
      borderLeft: '1px solid var(--vscode-panel-border, #444)',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'var(--vscode-font-family)',
      color: 'var(--vscode-foreground, #cccccc)',
      zIndex: 10,
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 12px',
        borderBottom: '1px solid var(--vscode-panel-border, #444)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{detail.name}</div>
          <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '2px' }}>
            {detail.c4Type} &middot; {detail.c4Level}
            {detail.technology && ` \u00B7 ${detail.technology}`}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--vscode-foreground, #cccccc)',
            cursor: 'pointer',
            fontSize: '16px',
          }}
        >
          {'\u2715'}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--vscode-panel-border, #444)' }}>
        <button style={tabStyle('docs')} onClick={() => setActiveTab('docs')}>Docs</button>
        <button style={tabStyle('design')} onClick={() => setActiveTab('design')}>Design</button>
        {detail.sourceFilePath && (
          <button style={tabStyle('source')} onClick={() => setActiveTab('source')}>Source</button>
        )}
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '12px',
        fontSize: '12px',
        lineHeight: '1.5',
      }}>
        {activeTab === 'docs' && (
          <div style={{ whiteSpace: 'pre-wrap' }}>
            {detail.documentation || 'No documentation available.'}
          </div>
        )}

        {activeTab === 'design' && (
          <pre style={{
            whiteSpace: 'pre-wrap',
            fontFamily: 'var(--vscode-editor-font-family, monospace)',
            fontSize: '11px',
            background: 'var(--vscode-editor-background, #1e1e1e)',
            padding: '10px',
            borderRadius: '4px',
            border: '1px solid var(--vscode-panel-border, #333)',
          }}>
            {detail.designSpec || 'No design spec available.'}
          </pre>
        )}

        {activeTab === 'source' && detail.sourceFilePath && (
          <div>
            <div style={{ marginBottom: '8px', opacity: 0.7 }}>Source file:</div>
            <button
              onClick={() => onOpenSource?.(detail.sourceFilePath!)}
              style={{
                background: 'var(--vscode-button-background, #0e639c)',
                color: 'var(--vscode-button-foreground, #fff)',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px',
                fontFamily: 'var(--vscode-font-family)',
              }}
            >
              Open {detail.sourceFilePath}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(NodeDetailPanel);
