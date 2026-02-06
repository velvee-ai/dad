/**
 * C4 Architecture Edge — Technology-aware styling
 *
 * Sync (REST/gRPC): Solid grey line
 * Async (Kafka/events): Dashed orange line
 * Data (PostgreSQL/Redis): Solid blue line
 * External: Dashed grey line
 */
import React, { memo, useState } from 'react';
import {
  EdgeProps,
  getBezierPath,
  EdgeLabelRenderer,
} from 'reactflow';
import { getEdgeStyle, C4_ANIMATIONS } from '../designTokens';

const C4Edge: React.FC<EdgeProps> = ({
  id,
  sourceX, sourceY,
  targetX, targetY,
  sourcePosition,
  targetPosition,
  data,
  label,
  markerEnd,
}) => {
  const [hovered, setHovered] = useState(false);

  const style = getEdgeStyle(data?.technology, data?.tags);
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY,
    targetX, targetY,
    sourcePosition,
    targetPosition,
  });

  const displayLabel = label || data?.label || '';
  const techLabel = data?.technology ? ` [${data.technology}]` : '';

  return (
    <>
      {/* Invisible wider path for easier hover detection */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />

      {/* Visible edge path */}
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={hovered ? style.color : style.color}
        strokeWidth={hovered ? style.strokeWidth + 1 : style.strokeWidth}
        strokeDasharray={style.strokeDasharray === 'none' ? undefined : style.strokeDasharray}
        strokeOpacity={hovered ? 1 : 0.7}
        markerEnd={markerEnd}
        style={{
          transition: `all ${C4_ANIMATIONS.nodeHover.duration}ms`,
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />

      {/* Edge label */}
      {displayLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              fontSize: hovered ? '11px' : '10px',
              fontFamily: 'var(--vscode-font-family, sans-serif)',
              background: 'var(--vscode-editor-background, #1e1e1e)',
              color: 'var(--vscode-foreground, #cccccc)',
              padding: '2px 8px',
              borderRadius: '8px',
              border: `1px solid ${style.color}44`,
              whiteSpace: 'nowrap',
              opacity: hovered ? 1 : 0.75,
              maxWidth: hovered ? '300px' : '180px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              transition: `all ${C4_ANIMATIONS.nodeHover.duration}ms`,
              boxShadow: hovered ? `0 2px 8px ${style.color}33` : 'none',
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            {displayLabel}
            {hovered && techLabel && (
              <span style={{ opacity: 0.6, fontSize: '9px' }}>{techLabel}</span>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default memo(C4Edge);
