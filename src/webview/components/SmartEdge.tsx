import React from 'react';
import { EdgeProps, EdgeLabelRenderer } from 'reactflow';
import { getSmartEdge } from '@integratorivan/react-flow-smart-edge';

const SmartEdge: React.FC<EdgeProps> = (props) => {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    label,
    style = {},
    markerEnd,
    data
  } = props;

  const getSmartEdgeResponse = getSmartEdge({
    sourcePosition,
    targetPosition,
    sourceX,
    sourceY,
    targetX,
    targetY,
    nodes: (data as any)?.nodes || [],
  });

  // If no path could be found, fall back to a simple straight line
  if (!getSmartEdgeResponse) {
    const fallbackPath = `M ${sourceX},${sourceY} L ${targetX},${targetY}`;
    return (
      <>
        <path
          id={id}
          className="react-flow__edge-path"
          d={fallbackPath}
          markerEnd={markerEnd}
          style={style}
        />
        {label && (
          <EdgeLabelRenderer>
            <div
              style={{
                position: 'absolute',
                transform: `translate(-50%, -50%) translate(${(sourceX + targetX) / 2}px,${(sourceY + targetY) / 2}px)`,
                fontSize: 12,
                pointerEvents: 'all',
                fontFamily: 'var(--vscode-font-family)',
                backgroundColor: 'var(--vscode-editor-background)',
                padding: '2px 4px',
                borderRadius: '3px',
                border: '1px solid var(--vscode-panel-border)'
              }}
              className="nodrag nopan"
            >
              {label}
            </div>
          </EdgeLabelRenderer>
        )}
      </>
    );
  }

  const { svgPathString, edgeCenterX, edgeCenterY } = getSmartEdgeResponse;

  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path"
        d={svgPathString}
        markerEnd={markerEnd}
        style={style}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${edgeCenterX}px,${edgeCenterY}px)`,
              fontSize: 12,
              pointerEvents: 'all',
              fontFamily: 'var(--vscode-font-family)',
              backgroundColor: 'var(--vscode-editor-background)',
              padding: '2px 4px',
              borderRadius: '3px',
              border: '1px solid var(--vscode-panel-border)'
            }}
            className="nodrag nopan"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default SmartEdge;
