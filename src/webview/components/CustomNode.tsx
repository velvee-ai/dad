import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

const CustomNode: React.FC<NodeProps> = ({ data, isConnectable }) => {
  const getNodeStyle = () => {
    const baseStyle = {
      padding: '10px 15px',
      borderRadius: '5px',
      border: '2px solid',
      fontSize: '14px',
      fontFamily: 'var(--vscode-font-family)',
      minWidth: '150px',
      textAlign: 'center' as const,
      position: 'relative' as const
    };

    switch (data.type) {
      case 'start':
        return {
          ...baseStyle,
          backgroundColor: '#4caf50',
          borderColor: '#388e3c',
          color: 'white',
          borderRadius: '20px'
        };
      case 'end':
        return {
          ...baseStyle,
          backgroundColor: '#f44336',
          borderColor: '#c62828',
          color: 'white',
          borderRadius: '20px'
        };
      case 'decision':
        return {
          ...baseStyle,
          backgroundColor: '#ff9800',
          borderColor: '#ef6c00',
          color: 'white',
          transform: 'rotate(45deg)',
          borderRadius: '5px'
        };
      case 'loop':
        return {
          ...baseStyle,
          backgroundColor: '#2196f3',
          borderColor: '#1565c0',
          color: 'white',
          borderRadius: '10px'
        };
      case 'call':
        return {
          ...baseStyle,
          backgroundColor: '#9c27b0',
          borderColor: '#6a1b9a',
          color: 'white',
          borderStyle: 'dashed'
        };
      case 'return':
        return {
          ...baseStyle,
          backgroundColor: '#e91e63',
          borderColor: '#c2185b',
          color: 'white'
        };
      default: // process
        return {
          ...baseStyle,
          backgroundColor: 'var(--vscode-editor-background)',
          borderColor: 'var(--vscode-panel-border)',
          color: 'var(--vscode-foreground)'
        };
    }
  };

  const labelStyle = data.type === 'decision' ? {
    transform: 'rotate(-45deg)',
    display: 'inline-block'
  } : {};

  return (
    <div style={getNodeStyle()}>
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        style={{ background: '#555' }}
      />
      <div style={labelStyle}>
        <div style={{ fontWeight: 'bold' }}>{data.label}</div>
        {data.description && (
          <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.8 }}>
            {data.description}
          </div>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        style={{ background: '#555' }}
      />
      {data.type === 'decision' && (
        <>
          <Handle
            type="source"
            position={Position.Left}
            id="false"
            isConnectable={isConnectable}
            style={{ background: '#f44336' }}
          />
          <Handle
            type="source"
            position={Position.Right}
            id="true"
            isConnectable={isConnectable}
            style={{ background: '#4caf50' }}
          />
        </>
      )}
    </div>
  );
};

export default memo(CustomNode);