import React, { memo } from 'react';
import { Handle, Position, NodeProps, useStore } from 'reactflow';

export interface HierarchicalNodeData {
  label: string;
  type: 'file' | 'function' | 'code';
  collapsed?: boolean;
  childCount?: number;
  onToggleCollapse?: () => void;
  // For code nodes, keep existing type
  nodeType?: 'start' | 'process' | 'decision' | 'loop' | 'call' | 'return' | 'end';
}

const HierarchicalNode: React.FC<NodeProps<HierarchicalNodeData>> = ({ data, id }) => {
  const zoom = useStore((state) => state.transform[2]);

  // Determine visibility based on zoom and node type
  const getDisplayStyle = () => {
    if (data.type === 'file') {
      // File nodes always visible
      return {};
    } else if (data.type === 'function') {
      // Function nodes visible at medium+ zoom
      if (zoom < 0.5) {
        return { opacity: 0, pointerEvents: 'none' as const };
      }
    } else if (data.type === 'code') {
      // Code nodes only visible at high zoom
      if (zoom < 1.5) {
        return { opacity: 0, pointerEvents: 'none' as const };
      }
    }
    return {};
  };

  // File Node Rendering
  if (data.type === 'file') {
    return (
      <div
        style={{
          padding: '20px',
          background: 'var(--vscode-editor-background, #1e1e1e)',
          border: '2px solid var(--vscode-panel-border, #007acc)',
          borderRadius: '8px',
          minWidth: data.collapsed ? '150px' : '300px',
          minHeight: data.collapsed ? '60px' : '200px',
          cursor: 'pointer',
          ...getDisplayStyle()
        }}
        onDoubleClick={() => data.onToggleCollapse?.()}
      >
        <Handle type="target" position={Position.Top} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{
            fontSize: '14px',
            fontWeight: 'bold',
            color: 'var(--vscode-foreground, #cccccc)',
            fontFamily: 'var(--vscode-font-family)'
          }}>
            📁 {data.label}
          </div>
          <button
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--vscode-foreground, #cccccc)',
              cursor: 'pointer',
              fontSize: '16px'
            }}
            onClick={(e) => {
              e.stopPropagation();
              data.onToggleCollapse?.();
            }}
          >
            {data.collapsed ? '▶' : '▼'}
          </button>
        </div>

        {data.childCount !== undefined && (
          <div style={{
            fontSize: '11px',
            marginTop: '8px',
            color: 'var(--vscode-descriptionForeground, #888888)'
          }}>
            {data.childCount} {data.childCount === 1 ? 'function' : 'functions'}
          </div>
        )}

        <Handle type="source" position={Position.Bottom} />
      </div>
    );
  }

  // Function Node Rendering
  if (data.type === 'function') {
    return (
      <div
        style={{
          padding: '12px',
          background: 'var(--vscode-editor-background, #252526)',
          border: '2px solid var(--vscode-button-background, #0e639c)',
          borderRadius: '6px',
          minWidth: data.collapsed ? '120px' : '200px',
          minHeight: data.collapsed ? '40px' : '100px',
          cursor: 'pointer',
          ...getDisplayStyle()
        }}
        onDoubleClick={() => data.onToggleCollapse?.()}
      >
        <Handle type="target" position={Position.Top} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{
            fontSize: '12px',
            fontWeight: '600',
            color: 'var(--vscode-foreground, #cccccc)',
            fontFamily: 'var(--vscode-font-family)'
          }}>
            ⚙️ {data.label}
          </div>
          {data.childCount !== undefined && data.childCount > 0 && (
            <button
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--vscode-foreground, #cccccc)',
                cursor: 'pointer',
                fontSize: '14px'
              }}
              onClick={(e) => {
                e.stopPropagation();
                data.onToggleCollapse?.();
              }}
            >
              {data.collapsed ? '▶' : '▼'}
            </button>
          )}
        </div>

        {data.childCount !== undefined && (
          <div style={{
            fontSize: '10px',
            marginTop: '6px',
            color: 'var(--vscode-descriptionForeground, #888888)'
          }}>
            {data.childCount} {data.childCount === 1 ? 'step' : 'steps'}
          </div>
        )}

        <Handle type="source" position={Position.Bottom} />
      </div>
    );
  }

  // Code Node Rendering (existing node types)
  const getNodeStyle = (nodeType?: string) => {
    const baseStyle = {
      padding: '8px 12px',
      borderRadius: '4px',
      minWidth: '100px',
      textAlign: 'center' as const,
      fontSize: '11px',
      fontFamily: 'var(--vscode-font-family)',
      color: 'var(--vscode-foreground, #cccccc)',
      border: '1px solid',
    };

    switch (nodeType) {
      case 'start':
        return {
          ...baseStyle,
          background: '#4caf50',
          borderColor: '#2e7d32',
          borderRadius: '20px'
        };
      case 'end':
        return {
          ...baseStyle,
          background: '#f44336',
          borderColor: '#c62828',
          borderRadius: '20px'
        };
      case 'decision':
        return {
          ...baseStyle,
          background: '#ff9800',
          borderColor: '#e65100',
          transform: 'rotate(45deg)',
          minWidth: '80px',
          minHeight: '80px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        };
      case 'loop':
        return {
          ...baseStyle,
          background: '#2196f3',
          borderColor: '#0d47a1',
          borderRadius: '8px'
        };
      case 'call':
        return {
          ...baseStyle,
          background: '#9c27b0',
          borderColor: '#6a1b9a',
          borderRadius: '4px',
          borderLeft: '4px solid #6a1b9a'
        };
      case 'return':
        return {
          ...baseStyle,
          background: '#607d8b',
          borderColor: '#37474f',
          borderRadius: '4px'
        };
      case 'process':
      default:
        return {
          ...baseStyle,
          background: '#3f51b5',
          borderColor: '#1a237e',
          borderRadius: '4px'
        };
    }
  };

  const nodeStyle = getNodeStyle(data.nodeType);

  return (
    <div style={{ ...nodeStyle, ...getDisplayStyle() }}>
      <Handle type="target" position={Position.Top} />

      {data.nodeType === 'decision' ? (
        <div style={{ transform: 'rotate(-45deg)' }}>
          {data.label}
        </div>
      ) : (
        data.label
      )}

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
};

export default memo(HierarchicalNode);
